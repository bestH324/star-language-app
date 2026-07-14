package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.dto.ChildRequest;
import com.xingyu.autism.service.ChildService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 儿童档案接口
 */
@RestController
@RequestMapping("/api/child")
public class ChildController {

    @Autowired
    private ChildService childService;

    @GetMapping("/list")
    public Result<List<Map<String, Object>>> list() {
        return Result.success(childService.list());
    }

    @PostMapping("/add")
    public Result<Map<String, Object>> add(@Valid @RequestBody ChildRequest req) {
        return Result.success(childService.add(req));
    }

    @PutMapping("/update/{id}")
    public Result<Map<String, Object>> update(@PathVariable long id, @Valid @RequestBody ChildRequest req) {
        return Result.success(childService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable long id) {
        childService.delete(id);
        return Result.success();
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable long id) {
        return Result.success(childService.detail(id));
    }
}
