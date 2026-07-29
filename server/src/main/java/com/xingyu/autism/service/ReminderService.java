package com.xingyu.autism.service;

import com.xingyu.autism.util.ChildAgeUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * 筛查提醒服务：未筛查提醒、高风险就医提醒、月龄复测提醒
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    @Autowired
    private JdbcTemplate jdbc;

    /** 注册后未筛查 — 第 7/30/60 天各一条 */
    public void createFirstScreeningReminders(long userId, long childId) {
        cancelExisting(userId, childId, "first_screening");
        int[] days = {7, 30, 60};
        for (int d : days) {
            jdbc.update("INSERT INTO reminders(user_id, child_id, reminder_type, scheduled_days, trigger_reason) VALUES(?,?,?,?,?)",
                    userId, childId, "first_screening", d, "注册后第" + formatDays(d) + "未筛查");
        }
        log.info("已创建未筛查提醒 userId={} childId={}", userId, childId);
    }

    /** 高风险就医提醒 — 第 7/30/60 天各一条 */
    public void createHighRiskReminders(long userId, long childId) {
        cancelExisting(userId, childId, "high_risk_followup");
        int[] days = {7, 30, 60};
        for (int d : days) {
            jdbc.update("INSERT INTO reminders(user_id, child_id, reminder_type, scheduled_days, trigger_reason) VALUES(?,?,?,?,?)",
                    userId, childId, "high_risk_followup", d, "高风险筛查后第" + formatDays(d) + "就医提醒");
        }
        log.info("已创建高风险就医提醒 userId={} childId={}", userId, childId);
    }

    /** 月龄复测提醒 — 计算达到下一问卷月龄的天数 */
    public void createRetestReminder(long userId, long childId, long currentQid) {
        cancelExisting(userId, childId, "retest");
        // 查询下一份问卷
        List<Map<String, Object>> nextQ = jdbc.queryForList(
                "SELECT id, min_age_months FROM questionnaires WHERE min_age_months > " +
                "(SELECT max_age_months FROM questionnaires WHERE id=?) ORDER BY min_age_months LIMIT 1",
                currentQid);
        if (nextQ.isEmpty()) {
            log.info("无下一版本问卷 childId={}", childId);
            return;
        }
        int nextMinMonths = ((Number) nextQ.get(0).get("min_age_months")).intValue();
        long nextQid = ((Number) nextQ.get(0).get("id")).longValue();

        // 查询儿童当前月龄（含早产矫正）
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT birth_date, is_premature, premature_weeks FROM children WHERE id=?", childId);
        if (childRows.isEmpty()) return;
        Map<String, Object> child = childRows.get(0);
        Object bd = child.get("birth_date");
        if (bd == null) return;
        String birthDate = bd instanceof java.sql.Date d ? d.toString() : bd.toString();
        LocalDate birth = LocalDate.parse(birthDate);
        int actualMonths = ChildAgeUtils.getActualAgeMonths(birth);
        boolean isPremature = toInt(child.get("is_premature")) == 1;
        int prematureWeeks = toInt(child.get("premature_weeks"));
        int birthGestationalWeeks = isPremature ? (40 - prematureWeeks) : 40;
        int currentMonths = ChildAgeUtils.getAdjustedAgeMonths(actualMonths, birthGestationalWeeks);

        // 计算距下一问卷月龄的天数
        long monthsUntil = nextMinMonths - currentMonths;
        if (monthsUntil <= 0) return;
        int daysUntil = (int) (monthsUntil * 30);

        jdbc.update("INSERT INTO reminders(user_id, child_id, reminder_type, scheduled_days, trigger_reason) VALUES(?,?,?,?,?)",
                userId, childId, "retest", daysUntil,
                "月龄达到" + nextMinMonths + "个月，匹配问卷" + nextQid + "复测");
        log.info("已创建月龄复测提醒 userId={} childId={} daysUntil={}", userId, childId, daysUntil);
    }

    /** 跳过问卷提醒 — 检测当前提交和上一次筛查之间是否跳过了某个中间问卷 */
    public void createMissedQuestionnaireCheck(long userId, long childId, long currentQid) {
        // 查上一次筛查的问卷
        List<Map<String, Object>> prevAnswers = jdbc.queryForList(
                "SELECT a.qid FROM answers a WHERE a.child_id=? AND a.qid < ? ORDER BY a.qid DESC LIMIT 1",
                childId, currentQid);
        if (prevAnswers.isEmpty()) return; // 首次筛查，无前一问卷

        int prevQid = ((Number) prevAnswers.get(0).get("qid")).intValue();

        // 查中间所有问卷（prevQid < qid < currentQid）
        List<Map<String, Object>> skipped = jdbc.queryForList(
                "SELECT id, title, min_age_months, max_age_months FROM questionnaires WHERE id > ? AND id < ? ORDER BY id",
                prevQid, currentQid);
        if (skipped.isEmpty()) return;

        // 计算儿童当前矫正月龄
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT birth_date, is_premature, premature_weeks FROM children WHERE id=?", childId);
        if (childRows.isEmpty()) return;
        Map<String, Object> child = childRows.get(0);
        Object bd = child.get("birth_date");
        if (bd == null) return;
        String birthDate = bd instanceof java.sql.Date d ? d.toString() : bd.toString();
        LocalDate birth = LocalDate.parse(birthDate);
        int actualMonths = ChildAgeUtils.getActualAgeMonths(birth);
        boolean isPremature = toInt(child.get("is_premature")) == 1;
        int prematureWeeks = toInt(child.get("premature_weeks"));
        int birthGestationalWeeks = isPremature ? (40 - prematureWeeks) : 40;
        int correctedMonths = ChildAgeUtils.getAdjustedAgeMonths(actualMonths, birthGestationalWeeks);

        // 筛选：当前矫正月龄已超过该问卷的 max_age_months → 确定跳过
        for (Map<String, Object> q : skipped) {
            int maxAge = ((Number) q.get("max_age_months")).intValue();
            if (correctedMonths > maxAge) {
                String title = (String) q.get("title");
                String reason = "您跳过了「" + title + "」（适用于 "
                        + q.get("min_age_months") + "-" + maxAge + " 个月），建议关注对应月龄发育指标";
                cancelExisting(userId, childId, "missed_questionnaire_" + q.get("id"));
                jdbc.update("INSERT INTO reminders(user_id, child_id, reminder_type, scheduled_days, trigger_reason) VALUES(?,?,?,?,?)",
                        userId, childId, "missed_questionnaire", 0, reason);
                log.info("已创建跳过问卷提醒 userId={} childId={} skippedQid={} reason={}", userId, childId, q.get("id"), reason);
            }
        }
    }

    /** 每日定时扫描待发送提醒 */
    @Scheduled(cron = "0 0 9 * * *")
    public void processDailyReminders() {
        // 查询所有到达触发时间的 pending 提醒
        List<Map<String, Object>> reminders = jdbc.queryForList(
                "SELECT r.*, u.phone FROM reminders r JOIN users u ON r.user_id=u.id " +
                "WHERE r.status='pending' AND DATEDIFF(NOW(), r.create_time) >= r.scheduled_days");
        for (Map<String, Object> r : reminders) {
            long id = ((Number) r.get("id")).longValue();
            long userId = ((Number) r.get("user_id")).longValue();
            String type = (String) r.get("reminder_type");
            try {
                sendReminder(userId, type, (String) r.get("trigger_reason"));
                jdbc.update("UPDATE reminders SET status='sent', sent_at=NOW() WHERE id=?", id);
                log.info("提醒已发送 id={} type={}", id, type);
            } catch (Exception e) {
                log.warn("提醒发送失败 id={}: {}", id, e.getMessage());
            }
        }
    }

    private void sendReminder(long userId, String type, String reason) {
        // TODO 接入微信订阅消息推送（需在微信公众平台申请模板后接入）
        // 消息格式参考（微信订阅消息模板字段）：
        //   - firstScreening:     thing1=筛查提醒  thing2=宝宝姓名  thing3=已注册X天未筛查
        //   - highRiskFollowup:  thing1=就诊提醒  thing2=宝宝姓名  thing3=高风险，建议就医
        //   - retest:            thing1=复测提醒  thing2=宝宝姓名  thing3=月龄达标可复测

        String title;
        String content;
        switch (type) {
            case "first_screening":
                title = "🔔 筛查提醒";
                content = "您的宝宝尚未完成首次筛查，建议尽早完成评估。原因：" + reason;
                break;
            case "high_risk_followup":
                title = "⚠️ 就医提醒";
                content = "您的宝宝此前筛查结果为高风险，建议尽快前往正规医院发育行为科进行专业评估。原因：" + reason;
                break;
            case "retest":
                title = "📋 复测提醒";
                content = "您的宝宝月龄已达到下一阶段量表适用范围，建议进行再次筛查。原因：" + reason;
                break;
            case "missed_questionnaire":
                title = "⚠️ 跳过阶段提醒";
                content = reason;
                break;
            default:
                title = "星语提醒";
                content = reason;
        }

        // 当前为演示版本，仅记录日志。接入微信订阅消息后替换此处实现。
        log.info("[提醒推送] userId={} type={} title={} content={}", userId, type, title, content);
    }

    private void cancelExisting(long userId, long childId, String type) {
        jdbc.update("UPDATE reminders SET status='cancelled', cancelled_at=NOW() WHERE user_id=? AND child_id=? AND reminder_type=? AND status='pending'",
                userId, childId, type);
    }

    private String formatDays(int d) {
        return d < 30 ? d + "天" : (d / 30) + "个月";
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Boolean b) return b ? 1 : 0;
        if (val instanceof Number n) return n.intValue();
        return 0;
    }
}
