package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.dto.LoginResponse;
import com.xingyu.autism.service.AdminService;
import com.xingyu.autism.service.ExcelExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    @Autowired
    private ExcelExportService excelExportService;

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

    /** CSV 导出（浏览器直接下载）type: users / children / records */
    @GetMapping(value = "/export-csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> exportCsv(@RequestParam String type) {
        String csvData = adminService.exportCsv(type);

        String fileName = type + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".csv";
        String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv;charset=UTF-8"));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(fileName, StandardCharsets.UTF_8)
                .build());

        return new ResponseEntity<>(csvData.getBytes(StandardCharsets.UTF_8), headers, HttpStatus.OK);
    }

    /** Excel 导出（浏览器直接下载 .xlsx）type: users / children / records */
    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> exportExcel(@RequestParam(defaultValue = "records") String type) {
        byte[] data;
        switch (type) {
            case "users" -> data = excelExportService.exportUsers();
            case "children" -> data = excelExportService.exportChildren();
            case "records" -> data = excelExportService.exportRecords();
            default -> throw new RuntimeException("不支持的导出类型: " + type);
        }

        String filename = "星语数据导出_" + type + "_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build());

        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    /** CSV 导出 type: users / children / records（兼容旧接口） */
    @GetMapping("/export/{type}")
    public ResponseEntity<byte[]> export(@PathVariable String type) {
        String csv = adminService.exportCsv(type);
        String filename = "星语数据导出_" + type + "_" + LocalDate.now() + ".csv";
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
        return new ResponseEntity<>(csv.getBytes(StandardCharsets.UTF_8), headers, HttpStatus.OK);
    }
}
