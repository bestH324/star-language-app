package com.xingyu.autism.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;

/**
 * Excel 导出服务：生成带颜色格式的 .xlsx 文件
 */
@Service
public class ExcelExportService {

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper mapper = new ObjectMapper();

    /** 生成筛查记录 Excel 文件字节数组 */
    public byte[] exportRecords() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.total_score, a.risk_level, a.create_time, a.answer_json, " +
                        " c.name AS child_name, c.gender AS child_gender, c.birth_date AS child_birth_date, " +
                        " q.title AS questionnaire_title, " +
                        " cg.name AS cg_name, cg.gender AS cg_gender, cg.age AS cg_age, " +
                        " cg.relationship, cg.is_single_parent, cg.education, cg.income " +
                        " FROM answers a " +
                        " JOIN children c ON a.child_id = c.id " +
                        " LEFT JOIN questionnaires q ON a.qid = q.id " +
                        " LEFT JOIN caregivers cg ON c.id = cg.child_id " +
                        " ORDER BY a.create_time DESC");

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("筛查记录");

            // 样式
            CellStyle headerGreen = headerStyle(wb, IndexedColors.GREEN.getIndex());
            CellStyle headerYellow = headerStyle(wb, IndexedColors.GOLD.getIndex());
            CellStyle headerRed = headerStyle(wb, IndexedColors.RED.getIndex());
            CellStyle dataStyle = dataStyle(wb);

            // 表头
            Row header = sheet.createRow(0);
            String[] headers = {
                    "筛查儿童姓名", "性别", "出生年月日", "评估时间", "所用筛查量表", "评估风险等级",
                    "照护者姓名", "性别", "年龄", "照护关系", "是否单亲", "教育程度", "家庭收入",
                    "量表条目详情"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                if (i < 6) cell.setCellStyle(headerGreen);
                else if (i < 13) cell.setCellStyle(headerYellow);
                else cell.setCellStyle(headerRed);
            }

            // 数据行
            int rowIdx = 1;
            for (Map<String, Object> r : rows) {
                Row row = sheet.createRow(rowIdx++);
                int col = 0;

                setCell(row, col++, r.get("child_name"), dataStyle);
                setCell(row, col++, genderLabel(r.get("child_gender")), dataStyle);
                setCell(row, col++, r.get("child_birth_date"), dataStyle);
                setCell(row, col++, r.get("create_time"), dataStyle);
                setCell(row, col++, r.get("questionnaire_title"), dataStyle);
                setCell(row, col++, riskLabel(r.get("risk_level")), dataStyle);

                setCell(row, col++, r.get("cg_name"), dataStyle);
                setCell(row, col++, genderLabel(r.get("cg_gender")), dataStyle);
                setCell(row, col++, r.get("cg_age"), dataStyle);
                setCell(row, col++, r.get("relationship"), dataStyle);
                setCell(row, col++, r.get("is_single_parent"), dataStyle);
                setCell(row, col++, r.get("education"), dataStyle);
                setCell(row, col++, r.get("income"), dataStyle);

                setCell(row, col, formatAnswerDetail((String) r.get("answer_json")), dataStyle);
            }

            // 自动列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i, true);
                int width = Math.min(sheet.getColumnWidth(i) + 1024, 20 * 256);
                sheet.setColumnWidth(i, width);
            }

            // 冻结首行
            sheet.createFreezePane(0, 1);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Excel 生成失败: " + e.getMessage(), e);
        }
    }

    /** 生成用户列表 Excel */
    public byte[] exportUsers() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT u.id, u.phone, u.nickname, u.create_time, " +
                        " (SELECT COUNT(*) FROM children c WHERE c.user_id=u.id) AS child_count, " +
                        " (SELECT COUNT(*) FROM answers a JOIN children c2 ON a.child_id=c2.id WHERE c2.user_id=u.id) AS screening_count " +
                        " FROM users u ORDER BY u.create_time DESC");

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("用户列表");
            CellStyle headerStyle = headerStyle(wb, IndexedColors.BLUE.getIndex());
            CellStyle dataStyle = dataStyle(wb);

            Row header = sheet.createRow(0);
            String[] headers = {"ID", "手机号", "昵称", "注册时间", "儿童数", "筛查数"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Map<String, Object> r : rows) {
                Row row = sheet.createRow(rowIdx++);
                setCell(row, 0, r.get("id"), dataStyle);
                setCell(row, 1, r.get("phone"), dataStyle);
                setCell(row, 2, r.get("nickname"), dataStyle);
                setCell(row, 3, r.get("create_time"), dataStyle);
                setCell(row, 4, r.get("child_count"), dataStyle);
                setCell(row, 5, r.get("screening_count"), dataStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i, true);
            }
            sheet.createFreezePane(0, 1);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Excel 生成失败: " + e.getMessage(), e);
        }
    }

    /** 生成儿童列表 Excel */
    public byte[] exportChildren() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT c.id, c.name, c.gender, c.birth_date, c.create_time, u.phone AS user_phone, " +
                        " (SELECT COUNT(*) FROM answers a WHERE a.child_id=c.id) AS screening_count " +
                        " FROM children c JOIN users u ON c.user_id=u.id ORDER BY c.create_time DESC");

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("儿童列表");
            CellStyle headerStyle = headerStyle(wb, IndexedColors.LIGHT_BLUE.getIndex());
            CellStyle dataStyle = dataStyle(wb);

            Row header = sheet.createRow(0);
            String[] headers = {"ID", "昵称", "性别", "出生日期", "所属用户手机", "筛查次数"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Map<String, Object> r : rows) {
                Row row = sheet.createRow(rowIdx++);
                setCell(row, 0, r.get("id"), dataStyle);
                setCell(row, 1, r.get("name"), dataStyle);
                setCell(row, 2, genderLabel(r.get("gender")), dataStyle);
                setCell(row, 3, r.get("birth_date"), dataStyle);
                setCell(row, 4, r.get("user_phone"), dataStyle);
                setCell(row, 5, r.get("screening_count"), dataStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i, true);
            }
            sheet.createFreezePane(0, 1);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Excel 生成失败: " + e.getMessage(), e);
        }
    }

    // ========== 样式工具 ==========

    private CellStyle headerStyle(Workbook wb, short colorIndex) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(colorIndex);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle dataStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setWrapText(true);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private void setCell(Row row, int col, Object val, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellStyle(style);
        if (val == null) { cell.setCellValue(""); return; }
        if (val instanceof Number n) { cell.setCellValue(n.doubleValue()); }
        else { cell.setCellValue(val.toString()); }
    }

    // ========== 值转换 ==========

    private String genderLabel(Object g) {
        if (g == null) return "";
        return "male".equals(g) ? "男" : "女";
    }

    private String riskLabel(Object level) {
        if (level == null) return "";
        return switch ((String) level) {
            case "low" -> "低风险";
            case "medium" -> "中风险";
            case "high" -> "高风险";
            default -> (String) level;
        };
    }

    /** 解析 answer_json → "Q1:经常会; Q2:有时; ..." */
    private String formatAnswerDetail(String answerJson) {
        if (answerJson == null || answerJson.isBlank()) return "";
        try {
            List<Map<String, Object>> items = mapper.readValue(answerJson, new TypeReference<>() {});
            StringBuilder sb = new StringBuilder();
            int idx = 1;
            for (Map<String, Object> item : items) {
                if (idx > 1) sb.append("; ");
                String label = (String) item.get("label");
                sb.append("Q").append(idx).append(":").append(label != null ? label : "-");
                idx++;
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
