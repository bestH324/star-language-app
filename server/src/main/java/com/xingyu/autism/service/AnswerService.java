package com.xingyu.autism.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.dto.AnswerSubmitRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 答卷与报告服务：提交、评分、风险判定、报告查询、历史记录
 */
@Service
public class AnswerService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ReminderService reminderService;

    private final ObjectMapper mapper = new ObjectMapper();

    /** 提交答卷（服务端按题库重新计分，防止篡改） */
    @Transactional
    public Map<String, Object> submit(AnswerSubmitRequest req) {
        long uid = AuthContext.currentUserId();

        // 校验儿童归属
        List<Map<String, Object>> ownerRows = jdbc.queryForList(
                "SELECT user_id FROM children WHERE id=?", req.getChildId());
        if (ownerRows.isEmpty()) throw new BizException("儿童档案不存在");
        int owner = ((Number) ownerRows.get(0).get("user_id")).intValue();
        if (owner != uid) throw new BizException(403, "无权为他人儿童提交筛查");

        // 拉取该问卷所有题目（含反选标记）
        List<Map<String, Object>> questions = jdbc.queryForList(
                "SELECT id, options, is_key, is_reverse FROM questions WHERE qid=? ORDER BY sort", req.getQid());
        if (questions.isEmpty()) throw new BizException("问卷题目不存在");
        Map<Long, List<Map<String, Object>>> optionMap = new HashMap<>();
        Set<Long> questionIds = new HashSet<>();
        for (Map<String, Object> q : questions) {
            Long qid = ((Number) q.get("id")).longValue();
            questionIds.add(qid);
            optionMap.put(qid, parseOptions((String) q.get("options")));
        }

        // 校验是否全部作答
        Map<Long, Integer> answerValueMap = new HashMap<>();
        for (AnswerSubmitRequest.AnswerItem a : req.getAnswers()) {
            if (a.getQuestionId() == null || a.getValue() == null) throw new BizException("答案数据不完整");
            answerValueMap.put(a.getQuestionId(), a.getValue());
        }
        if (answerValueMap.size() != questionIds.size() || !answerValueMap.keySet().containsAll(questionIds)) {
            throw new BizException("请回答所有题目后再提交");
        }

        // 服务端计算得分
        List<Map<String, Object>> answerDetail = new ArrayList<>();
        int totalScore = 0;
        for (Map<String, Object> q : questions) {
            Long qid = ((Number) q.get("id")).longValue();
            int selectedValue = answerValueMap.get(qid);
            boolean isReverse = toInt(q.get("is_reverse")) == 1;
            List<Map<String, Object>> opts = optionMap.get(qid);
            String label = "";
            for (Map<String, Object> o : opts) {
                int v = ((Number) o.get("value")).intValue();
                if (v == selectedValue) {
                    label = (String) o.get("label");
                    break;
                }
            }
            int score = isReverse ? (selectedValue == 1 ? 0 : 1) : selectedValue;
            totalScore += score;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("questionId", qid);
            item.put("value", selectedValue);
            item.put("label", label);
            item.put("score", score);
            item.put("isKey", toInt(q.get("is_key")));
            item.put("isReverse", isReverse);
            answerDetail.add(item);
        }

        // 统计关键/辅助条目非典型数量
        int keyMissCount = 0;
        int assistantMissCount = 0;
        for (Map<String, Object> item : answerDetail) {
            int s = ((Number) item.get("score")).intValue();
            if (s == 0) {
                if (toInt(item.get("isKey")) == 1) keyMissCount++;
                else assistantMissCount++;
            }
        }

        // 风险判定（PDF 规范：关键项目≥3个非典型→高风险，1-2个→临界观察，0个但辅助≥3→临界观察）
        String riskLevel;
        String riskText;
        if (keyMissCount >= 3) { riskLevel = "high"; riskText = "高风险"; }
        else if (keyMissCount >= 1) { riskLevel = "medium"; riskText = "临界观察"; }
        else if (assistantMissCount >= 3) { riskLevel = "medium"; riskText = "临界观察"; }
        else { riskLevel = "low"; riskText = "低风险"; }

        // 序列化答案 JSON
        String answerJson;
        try {
            answerJson = mapper.writeValueAsString(answerDetail);
        } catch (Exception e) {
            throw new BizException("答案序列化失败");
        }

        jdbc.update("INSERT INTO answers(child_id, qid, answer_json, total_score, risk_level) VALUES(?,?,?,?,?)",
                req.getChildId(), req.getQid(), answerJson, totalScore, riskLevel);
        long answerId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        // 创建筛查提醒
        if ("high".equals(riskLevel)) {
            reminderService.createHighRiskReminders(uid, req.getChildId());
        }
        reminderService.createRetestReminder(uid, req.getChildId(), req.getQid());

        return report(answerId);
    }

    /** 报告详情 */
    public Map<String, Object> report(long answerId) {
        List<Map<String, Object>> ansRows = jdbc.queryForList("SELECT * FROM answers WHERE id=?", answerId);
        if (ansRows.isEmpty()) throw new BizException("筛查记录不存在");
        Map<String, Object> ans = ansRows.get(0);
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT id, name, gender, birth_date, avatar FROM children WHERE id=?", ans.get("child_id"));
        if (childRows.isEmpty()) throw new BizException("儿童档案不存在");
        Map<String, Object> child = childRows.get(0);

        int totalScore = ((Number) ans.get("total_score")).intValue();
        String riskLevel = (String) ans.get("risk_level");
        String riskText;
        if ("low".equals(riskLevel)) riskText = "低风险";
        else if ("medium".equals(riskLevel)) riskText = "临界观察";
        else riskText = "高风险";

        List<Map<String, Object>> answers = parseOptions((String) ans.get("answer_json"));
        int[] missCounts = computeMissCounts(answers);

        // 根据问卷获取满分
        List<Map<String, Object>> qRows = jdbc.queryForList(
                "SELECT total_questions FROM questionnaires WHERE id=?", ans.get("qid"));
        int maxScore = qRows.isEmpty() ? answers.size() : ((Number) qRows.get(0).get("total_questions")).intValue();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", ans.get("id"));
        result.put("child", child);
        result.put("totalScore", totalScore);
        result.put("maxScore", maxScore);
        result.put("riskLevel", riskLevel);
        result.put("riskText", riskText);
        result.put("riskMessage", getRiskMessage(riskLevel));
        result.put("keyMissCount", missCounts[0]);
        result.put("assistantMissCount", missCounts[1]);
        result.put("createTime", ans.get("create_time"));
        result.put("answers", answers);
        result.put("recommendations", getRecommendations(riskLevel));
        return result;
    }

    /** 当前用户的历史记录列表 */
    public List<Map<String, Object>> myHistory() {
        long uid = AuthContext.currentUserId();
        return jdbc.queryForList(
                "SELECT a.id, a.child_id, a.total_score, a.risk_level, a.create_time, " +
                        " c.name AS child_name, c.avatar AS child_avatar " +
                        " FROM answers a JOIN children c ON a.child_id=c.id " +
                        " WHERE c.user_id=? ORDER BY a.create_time DESC", uid);
    }

    /** 历史详情（校验归属） */
    public Map<String, Object> historyDetail(long answerId) {
        long uid = AuthContext.currentUserId();
        List<Map<String, Object>> ownerRows = jdbc.queryForList(
                "SELECT c.user_id FROM answers a JOIN children c ON a.child_id=c.id WHERE a.id=?", answerId);
        if (ownerRows.isEmpty()) throw new BizException("记录不存在");
        int owner = ((Number) ownerRows.get(0).get("user_id")).intValue();
        if (owner != uid) throw new BizException(403, "无权查看他人记录");
        return report(answerId);
    }

    /** 专业建议 */
    private List<String> getRecommendations(String riskLevel) {
        return switch (riskLevel) {
            case "low" -> List.of(
                    "孩子目前各项指标表现良好，请继续保持关注。",
                    "建议每3-6个月进行一次发育监测。",
                    "多与孩子互动交流，创造丰富的语言和社交环境。",
                    "如有任何担忧，随时可以进行再次筛查。");
            case "medium" -> List.of(
                    "部分指标需要引起关注，建议进一步观察。",
                    "推荐在1-2个月内前往专业机构进行发育评估。",
                    "增加亲子互动时间，特别关注社交沟通方面的引导。",
                    "记录孩子日常行为表现，便于医生评估时参考。",
                    "如有条件，可于1个月后再次进行筛查对比。");
            default -> List.of(
                    "筛查结果提示需要高度重视，建议尽快进行专业评估。",
                    "请携带本筛查报告，前往儿童发育行为专科就诊。",
                    "不要过度焦虑，早期发现意味着早期干预的机会。",
                    "等待就诊期间，增加与孩子的互动和交流。",
                    "建议同时向当地残联或妇幼保健机构咨询相关政策支持。");
        };
    }

    /** 风险等级对应的提示文案 */
    private String getRiskMessage(String riskLevel) {
        return switch (riskLevel) {
            case "high" -> "⚠️ 本结果为筛查风险预警，不代表确诊孤独症。建议您尽快带孩子前往正规医院发育行为科进行专业评估，早期干预，早筛查、早干预、早支持。";
            case "medium" -> "建议重点关注孩子社交沟通发育情况，6个月后可再次复测，必要时前往儿童保健科进行综合发育评估。";
            default -> "本次筛查低风险仅代表当前无明显孤独症预警行为，不排除未来发育变化，建议按照常规儿童保健体检持续监测。";
        };
    }

    /** 统计关键条目和辅助条目的非典型数量（score==0 即为非典型） */
    private int[] computeMissCounts(List<Map<String, Object>> answers) {
        int keyMiss = 0;
        int assistantMiss = 0;
        for (Map<String, Object> item : answers) {
            int score = ((Number) item.get("score")).intValue();
            if (score == 0) {
                if (toInt(item.get("isKey")) == 1) keyMiss++;
                else assistantMiss++;
            }
        }
        return new int[]{keyMiss, assistantMiss};
    }

    private List<Map<String, Object>> parseOptions(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BizException("JSON 解析失败: " + e.getMessage());
        }
    }

    /** 安全转换 MySQL TINYINT(1) → int（Boolean 或 Number 均可） */
    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Boolean b) return b ? 1 : 0;
        if (val instanceof Number n) return n.intValue();
        return 0;
    }
}
