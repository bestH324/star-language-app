package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 照护者信息管理
 */
@RestController
@RequestMapping("/api/caregiver")
public class CaregiverController {

    @Autowired
    private JdbcTemplate jdbc;

    /** 查询照护者信息 */
    @GetMapping("/{childId}")
    public Result<Map<String, Object>> get(@PathVariable long childId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM caregivers WHERE child_id=?", childId);
        return Result.success(rows.isEmpty() ? null : rows.get(0));
    }

    /** 创建/更新照护者信息 */
    @PostMapping("/{childId}")
    public Result<Map<String, Object>> save(@PathVariable long childId, @RequestBody Map<String, Object> body) {
        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT id FROM caregivers WHERE child_id=?", childId);

        if (existing.isEmpty()) {
            jdbc.update(
                    "INSERT INTO caregivers(child_id, name, gender, age, relationship, is_single_parent, education, income) " +
                            " VALUES(?,?,?,?,?,?,?,?)",
                    childId,
                    body.get("name"),
                    body.get("gender"),
                    toInt(body.get("age")),
                    body.get("relationship"),
                    body.get("is_single_parent"),
                    body.get("education"),
                    body.get("income"));
        } else {
            jdbc.update(
                    "UPDATE caregivers SET name=?, gender=?, age=?, relationship=?, is_single_parent=?, education=?, income=? " +
                            " WHERE child_id=?",
                    body.get("name"),
                    body.get("gender"),
                    toInt(body.get("age")),
                    body.get("relationship"),
                    body.get("is_single_parent"),
                    body.get("education"),
                    body.get("income"),
                    childId);
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM caregivers WHERE child_id=?", childId);
        return Result.success(rows.isEmpty() ? null : rows.get(0));
    }

    private Integer toInt(Object v) {
        if (v == null) return null;
        if (v instanceof Boolean b) return b ? 1 : 0;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); }
        catch (NumberFormatException e) { return null; }
    }
}
