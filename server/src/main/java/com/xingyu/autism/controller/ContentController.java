package com.xingyu.autism.controller;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 内容接口：科普文章 / 转诊机构 / 赋能资源（公开）
 */
@RestController
@RequestMapping("/api")
public class ContentController {

    @Autowired
    private JdbcTemplate jdbc;

    // ============ 科普文章 ============
    @GetMapping("/article/list")
    public Result<List<Map<String, Object>>> articles(@RequestParam(required = false) String category) {
        if (category == null || category.isBlank() || "all".equals(category)) {
            return Result.success(jdbc.queryForList("SELECT id, category, title, summary, author, date FROM articles ORDER BY date DESC"));
        }
        return Result.success(jdbc.queryForList("SELECT id, category, title, summary, author, date FROM articles WHERE category=? ORDER BY date DESC", category));
    }

    @GetMapping("/article/{id}")
    public Result<Map<String, Object>> article(@PathVariable long id) {
        List<Map<String, Object>> list = jdbc.queryForList("SELECT * FROM articles WHERE id=?", id);
        if (list.isEmpty()) throw new BizException("文章不存在");
        return Result.success(list.get(0));
    }

    // ============ 转诊机构 ============
    @GetMapping("/institution/list")
    public Result<List<Map<String, Object>>> institutions(@RequestParam(required = false) String region) {
        if (region == null || region.isBlank()) {
            return Result.success(jdbc.queryForList("SELECT * FROM institutions ORDER BY id"));
        }
        return Result.success(jdbc.queryForList("SELECT * FROM institutions WHERE region=? ORDER BY id", region));
    }

    @GetMapping("/institution/{id}")
    public Result<Map<String, Object>> institution(@PathVariable long id) {
        List<Map<String, Object>> list = jdbc.queryForList("SELECT * FROM institutions WHERE id=?", id);
        if (list.isEmpty()) throw new BizException("机构不存在");
        return Result.success(list.get(0));
    }

    // ============ 赋能资源 ============
    @GetMapping("/resource/list")
    public Result<List<Map<String, Object>>> resources() {
        return Result.success(jdbc.queryForList("SELECT * FROM resources ORDER BY id"));
    }
}
