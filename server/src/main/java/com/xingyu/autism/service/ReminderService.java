package com.xingyu.autism.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
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
        long actualMonths = Period.between(birth, LocalDate.now()).toTotalMonths();
        boolean isPremature = toInt(child.get("is_premature")) == 1;
        int prematureWeeks = toInt(child.get("premature_weeks"));
        long currentMonths = actualMonths;
        if (isPremature && actualMonths < 24) {
            currentMonths = Math.max(0, actualMonths - prematureWeeks / 4);
        }

        // 计算距下一问卷月龄的天数
        long monthsUntil = nextMinMonths - currentMonths;
        if (monthsUntil <= 0) return;
        int daysUntil = (int) (monthsUntil * 30);

        jdbc.update("INSERT INTO reminders(user_id, child_id, reminder_type, scheduled_days, trigger_reason) VALUES(?,?,?,?,?)",
                userId, childId, "retest", daysUntil,
                "月龄达到" + nextMinMonths + "个月，匹配问卷" + nextQid + "复测");
        log.info("已创建月龄复测提醒 userId={} childId={} daysUntil={}", userId, childId, daysUntil);
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
        // TODO 接入微信订阅消息推送
        // 当前为演示版本，仅记录日志
        log.info("[提醒推送] userId={} type={} reason={}", userId, type, reason);
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
