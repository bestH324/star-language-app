package com.xingyu.autism.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingyu.autism.common.BizException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

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
        Map<String, Object> q = jdbc.queryForMap("SELECT * FROM questionnaires WHERE id=?", qid);
        List<Map<String, Object>> questions = jdbc.queryForList(
                "SELECT id, qid, video_url, content, options, sort FROM questions WHERE qid=? ORDER BY sort", qid);
        // 解析 options 字段为 JSON 对象
        for (Map<String, Object> row : questions) {
            row.put("options", parseOptions((String) row.get("options")));
        }
        Map<String, Object> result = new HashMap<>(q);
        result.put("questions", questions);
        return result;
    }

    /** 默认问卷（供前端直接拉取） */
    public Map<String, Object> defaultQuestionnaire() {
        return detail(1L);
    }

    private List<Map<String, Object>> parseOptions(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BizException("题目选项解析失败: " + e.getMessage());
        }
    }
}
