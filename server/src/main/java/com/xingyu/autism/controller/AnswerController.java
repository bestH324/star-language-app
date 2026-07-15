package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.dto.AnswerSubmitRequest;
import com.xingyu.autism.service.AnswerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 答卷与报告接口（含历史记录）
 */
@RestController
@RequestMapping("/api/answer")
public class AnswerController {

    @Autowired
    private AnswerService answerService;

    /** 提交答卷，生成报告 */
    @PostMapping("/submit")
    public Result<Map<String, Object>> submit(@Valid @RequestBody AnswerSubmitRequest req) {
        return Result.success(answerService.submit(req));
    }

    /** 报告详情 */
    @GetMapping("/report/{id}")
    public Result<Map<String, Object>> report(@PathVariable long id) {
        return Result.success(answerService.historyDetail(id));
    }

    /** 我的历史记录列表 */
    @GetMapping("/history")
    public Result<List<Map<String, Object>>> history() {
        return Result.success(answerService.myHistory());
    }

    /** 历史详情 */
    @GetMapping("/history/{id}")
    public Result<Map<String, Object>> historyDetail(@PathVariable long id) {
        return Result.success(answerService.historyDetail(id));
    }
}
