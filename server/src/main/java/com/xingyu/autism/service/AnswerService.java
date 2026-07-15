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

    private final ObjectMapper mapper = new ObjectMapper();

    /** 提交答卷（服务端按题库重新计分，防止篡改） */
    @Transactional
    public Map<String, Object> submit(AnswerSubmitRequest req) {
        long uid = AuthContext.currentUserId();

        // 校验儿童归属
        Integer owner = jdbc.queryForObject("SELECT user_id FROM children WHERE id=?", Integer.class, req.getChildId());
        if (owner == null) throw new BizException("儿童档案不存在");
        if (owner != uid) throw new BizException(403, "无权为他人儿童提交筛查");

        // 拉取该问卷所有题目
        List<Map<String, Object>> questions = jdbc.queryForList(
                "SELECT id, options FROM questions WHERE qid=? ORDER BY sort", req.getQid());
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
            List<Map<String, Object>> opts = optionMap.get(qid);
            int score = 0;
            String label = "";
            for (Map<String, Object> o : opts) {
                int v = ((Number) o.get("value")).intValue();
                if (v == selectedValue) {
                    score = ((Number) o.get("score")).intValue();
                    label = (String) o.get("label");
                    break;
                }
            }
            totalScore += score;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("questionId", qid);
            item.put("value", selectedValue);
            item.put("label", label);
            item.put("score", score);
            answerDetail.add(item);
        }

        // 风险判定 0-60：低≤15 中16-35 高≥36
        String riskLevel;
        String riskText;
        if (totalScore <= 15) { riskLevel = "low"; riskText = "低风险"; }
        else if (totalScore <= 35) { riskLevel = "medium"; riskText = "中风险"; }
        else { riskLevel = "high"; riskText = "高风险"; }

        // 序列化答案 JSON
        String answerJson;
        try {
            answerJson = mapper.writeValueAsString(answerDetail);
        } catch (Exception e) {
            throw new BizException("答案序列化失败");
        }

        jdbc.update("INSERT INTO answers(child_id, qid, answer_json, total_score, risk_level) VALUES(?,?,?,?,?)",
                req.getChildId(), req.getQid(), answerJson, totalScore, riskLevel);
        long answerId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);

        return report(answerId);
    }

    /** 报告详情 */
    public Map<String, Object> report(long answerId) {
        Map<String, Object> ans = jdbc.queryForMap("SELECT * FROM answers WHERE id=?", answerId);
        Map<String, Object> child = jdbc.queryForMap(
                "SELECT id, name, gender, birth_date, avatar FROM children WHERE id=?", ans.get("child_id"));

        int totalScore = ((Number) ans.get("total_score")).intValue();
        String riskLevel = (String) ans.get("risk_level");
        String riskText;
        if ("low".equals(riskLevel)) riskText = "低风险";
        else if ("medium".equals(riskLevel)) riskText = "中风险";
        else riskText = "高风险";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", ans.get("id"));
        result.put("child", child);
        result.put("totalScore", totalScore);
        result.put("maxScore", 60);
        result.put("riskLevel", riskLevel);
        result.put("riskText", riskText);
        result.put("createTime", ans.get("create_time"));
        result.put("answers", parseOptions((String) ans.get("answer_json")));
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
        Integer owner = jdbc.queryForObject(
                "SELECT c.user_id FROM answers a JOIN children c ON a.child_id=c.id WHERE a.id=?", Integer.class, answerId);
        if (owner == null) throw new BizException("记录不存在");
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
                    "记录孩子日常行为表现，便于医生评估时参考。");
            default -> List.of(
                    "筛查结果提示需要高度重视，建议尽快进行专业评估。",
                    "请携带本筛查报告，前往儿童发育行为专科就诊。",
                    "不要过度焦虑，早期发现意味着早期干预的机会。",
                    "等待就诊期间，增加与孩子的互动和交流。",
                    "建议同时向当地残联或妇幼保健机构咨询相关政策支持。");
        };
    }

    private List<Map<String, Object>> parseOptions(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BizException("JSON 解析失败: " + e.getMessage());
        }
    }
}
