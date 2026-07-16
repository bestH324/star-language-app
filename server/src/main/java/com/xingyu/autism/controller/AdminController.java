package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.dto.LoginResponse;
import com.xingyu.autism.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 管理员后台接口
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    /** 管理员登录 */
    @PostMapping("/login")
    public Result<LoginResponse> login(@RequestBody Map<String, String> body) {
        return Result.success(adminService.login(body.get("username"), body.get("password")));
    }

    /** 数据总览 */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(adminService.stats());
    }

    /** 用户列表 */
    @GetMapping("/users")
    public Result<List<Map<String, Object>>> users() {
        return Result.success(adminService.userList());
    }

    /** 儿童列表 */
    @GetMapping("/children")
    public Result<List<Map<String, Object>>> children() {
        return Result.success(adminService.childrenList());
    }

    /** 筛查记录列表 */
    @GetMapping("/records")
    public Result<List<Map<String, Object>>> records() {
        return Result.success(adminService.recordsList());
    }

    /** 记录详情 */
    @GetMapping("/records/{id}")
    public Result<Map<String, Object>> recordDetail(@PathVariable long id) {
        return Result.success(adminService.recordDetail(id));
    }

    /** CSV 导出 type: users / children / records */
    @GetMapping("/export/{type}")
    public ResponseEntity<byte[]> export(@PathVariable String type) {
        String csv = adminService.exportCsv(type);
        String filename = "星语数据导出_" + type + "_" + LocalDate.now() + ".csv";
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
        return new ResponseEntity<>(csv.getBytes(StandardCharsets.UTF_8), headers, org.springframework.http.HttpStatus.OK);
    }
}
