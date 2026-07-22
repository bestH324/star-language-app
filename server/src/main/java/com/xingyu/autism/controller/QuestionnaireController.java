package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.service.QuestionnaireService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 问卷与题目接口
 */
@RestController
@RequestMapping("/api/questionnaire")
public class QuestionnaireController {

    @Autowired
    private QuestionnaireService questionnaireService;

    /** 问卷列表 */
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> list() {
        return Result.success(questionnaireService.list());
    }

    /** 根据儿童月龄匹配问卷（精确路径，必须在 /{qid} 之前） */
    @GetMapping("/match")
    public Result<Map<String, Object>> match(@RequestParam long childId) {
        return Result.success(questionnaireService.matchByChildId(childId));
    }

    /** 默认问卷（精确路径，必须在 /{qid} 之前） */
    @GetMapping("/default")
    public Result<Map<String, Object>> defaultQuestionnaire() {
        return Result.success(questionnaireService.defaultQuestionnaire());
    }

    /** 问卷详情（含题目与选项） */
    @GetMapping("/{qid}")
    public Result<Map<String, Object>> detail(@PathVariable long qid) {
        return Result.success(questionnaireService.detail(qid));
    }
}
