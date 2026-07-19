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
 * 问卷与题目服务（支持按月龄自动匹配多版本问卷）
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

    /** 问卷详情 + 题目列表（含选项解析后的 JSON、关键项目标记） */
    public Map<String, Object> detail(long qid) {
        List<Map<String, Object>> qRows = jdbc.queryForList("SELECT * FROM questionnaires WHERE id=?", qid);
        if (qRows.isEmpty()) throw new BizException("问卷不存在");
        Map<String, Object> q = qRows.get(0);
        List<Map<String, Object>> questions = jdbc.queryForList(
                "SELECT id, qid, video_url, content, options, sort, is_key FROM questions WHERE qid=? ORDER BY sort", qid);
        for (Map<String, Object> row : questions) {
            row.put("options", parseOptions((String) row.get("options")));
        }
        Map<String, Object> result = new HashMap<>(q);
        result.put("questions", questions);
        return result;
    }

    /** 默认问卷（供前端快速获取） */
    public Map<String, Object> defaultQuestionnaire() {
        return detail(1L);
    }

    /** 根据儿童月龄匹配对应的问卷版本 */
    public Map<String, Object> matchByChildId(long childId) {
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT birth_date FROM children WHERE id=?", childId);
        if (childRows.isEmpty()) throw new BizException("儿童档案不存在");

        Object birthDateObj = childRows.get(0).get("birth_date");
        if (birthDateObj == null) throw new BizException("儿童出生日期缺失");
        String birthDate = birthDateObj.toString();
        long ageMonths = calculateAgeMonths(birthDate);

        if (ageMonths < 11) throw new BizException("儿童月龄不足11个月，暂不适用本筛查工具");
        if (ageMonths > 60) throw new BizException("儿童月龄超过60个月，暂不适用本筛查工具");

        List<Map<String, Object>> qRows = jdbc.queryForList(
                "SELECT id FROM questionnaires WHERE min_age_months <= ? AND max_age_months >= ? ORDER BY id LIMIT 1",
                ageMonths, ageMonths);
        if (qRows.isEmpty()) throw new BizException("未找到适用于" + ageMonths + "个月的问卷版本");

        long qid = ((Number) qRows.get(0).get("id")).longValue();
        Map<String, Object> result = detail(qid);
        result.put("matchedAgeMonths", ageMonths);
        return result;
    }

    /** 计算儿童当前月龄 */
    public long calculateAgeMonths(String birthDate) {
        try {
            LocalDate birth = LocalDate.parse(birthDate);
            return Period.between(birth, LocalDate.now()).toTotalMonths();
        } catch (Exception e) {
            throw new BizException("出生日期格式错误");
        }
    }

    private List<Map<String, Object>> parseOptions(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BizException("题目选项解析失败: " + e.getMessage());
        }
    }
}
