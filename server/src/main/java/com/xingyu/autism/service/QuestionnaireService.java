package com.xingyu.autism.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingyu.autism.common.BizException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 问卷与题目服务
 */
@Service
public class QuestionnaireService {

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper mapper = new ObjectMapper();

    /** 问卷列表 */
    public List<Map<String, Object>> list() {
        return jdbc.queryForList("SELECT * FROM questionnaires ORDER BY id");
    }

    /** 问卷详情 + 题目列表（含选项解析后的 JSON） */
    public Map<String, Object> detail(long qid) {
        List<Map<String, Object>> qRows = jdbc.queryForList("SELECT * FROM questionnaires WHERE id=?", qid);
        if (qRows.isEmpty()) throw new BizException("问卷不存在");
        Map<String, Object> q = qRows.get(0);
        List<Map<String, Object>> questions = jdbc.queryForList(
                "SELECT id, qid, video_url, content, options, sort, is_key, is_reverse FROM questions WHERE qid=? ORDER BY sort", qid);
        // 解析 options 字段为 JSON 对象，is_key/is_reverse 安全转 int
        for (Map<String, Object> row : questions) {
            row.put("options", parseOptions((String) row.get("options")));
            row.put("is_key", toInt(row.get("is_key")));
            row.put("is_reverse", toInt(row.get("is_reverse")));
        }
        Map<String, Object> result = new HashMap<>(q);
        // 统一字段名为驼峰，方便前端使用
        renameKey(result, "min_age_months", "minAgeMonths");
        renameKey(result, "max_age_months", "maxAgeMonths");
        renameKey(result, "total_questions", "totalQuestions");
        result.put("questions", questions);
        return result;
    }

    /** 默认问卷（供前端直接拉取） */
    public Map<String, Object> defaultQuestionnaire() {
        return detail(1L);
    }

    /** 根据儿童月龄匹配问卷版本（早产儿 < 24 月龄时使用矫正月龄） */
    public Map<String, Object> matchByChildId(long childId) {
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT birth_date, is_premature, premature_weeks FROM children WHERE id=?", childId);
        if (childRows.isEmpty()) throw new BizException("儿童档案不存在");
        Map<String, Object> child = childRows.get(0);

        Object bd = child.get("birth_date");
        if (bd == null) throw new BizException("出生日期不存在");
        String birthDate;
        if (bd instanceof java.sql.Date d) { birthDate = d.toString(); }
        else { birthDate = bd.toString(); }

        LocalDate birth = LocalDate.parse(birthDate);
        long actualMonths = Period.between(birth, LocalDate.now()).toTotalMonths();

        boolean isPremature = toInt(child.get("is_premature")) == 1;
        int prematureWeeks = toInt(child.get("premature_weeks"));

        // 早产儿且实际月龄 < 24 个月时，使用矫正月龄
        long matchMonths = actualMonths;
        if (isPremature && actualMonths < 24) {
            matchMonths = Math.max(0, actualMonths - prematureWeeks / 4);
        }

        // 匹配年龄范围适合的问卷
        List<Map<String, Object>> matched = jdbc.queryForList(
                "SELECT id FROM questionnaires WHERE min_age_months <= ? AND max_age_months >= ? ORDER BY id LIMIT 1",
                matchMonths, matchMonths);
        if (matched.isEmpty()) {
            // 无精确匹配时返回默认问卷
            return detail(1L);
        }
        long qid = ((Number) matched.get(0).get("id")).longValue();
        Map<String, Object> result = detail(qid);
        result.put("matchMonths", matchMonths);
        result.put("actualMonths", actualMonths);
        result.put("isCorrected", isPremature && actualMonths < 24);
        return result;
    }

    private List<Map<String, Object>> parseOptions(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BizException("题目选项解析失败: " + e.getMessage());
        }
    }

    private void renameKey(Map<String, Object> map, String oldKey, String newKey) {
        if (map.containsKey(oldKey)) {
            map.put(newKey, map.remove(oldKey));
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
