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
import com.xingyu.autism.util.ChildAgeUtils;
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
                        " c.is_premature, c.premature_weeks, " +
                        " q.title AS questionnaire_title, " +
                        " cg.name AS cg_name, cg.gender AS cg_gender, cg.age AS cg_age, " +
                        " cg.relationship, cg.is_single_parent, cg.education, cg.income " +
                        " FROM answers a " +
                        " JOIN children c ON a.child_id = c.id " +
                        " JOIN users u ON c.user_id = u.id " +
                        " LEFT JOIN questionnaires q ON a.qid = q.id " +
                        " LEFT JOIN caregivers cg ON c.id = cg.child_id " +
                        " WHERE a.is_deleted=0 AND c.is_deleted=0 AND u.deleted_at IS NULL " +
                        " ORDER BY a.create_time DESC");

        // 解析所有答案，找到最大题目数
        int maxQuestions = 0;
        List<List<Map<String, Object>>> allAnswerDetails = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            List<Map<String, Object>> items = parseAnswerItems((String) r.get("answer_json"));
            allAnswerDetails.add(items);
            if (items.size() > maxQuestions) maxQuestions = items.size();
        }

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("筛查记录");

            // 样式
            CellStyle headerGreen = headerStyle(wb, IndexedColors.GREEN.getIndex());
            CellStyle headerYellow = headerStyle(wb, IndexedColors.GOLD.getIndex());
            CellStyle headerRed = headerStyle(wb, IndexedColors.RED.getIndex());
            CellStyle dataStyle = dataStyle(wb);

            // 构建表头（基础列 + 逐题列）
            Row header = sheet.createRow(0);
            int col = 0;

            // 基础信息列（绿色）
            String[] baseHeaders = {"筛查儿童姓名", "性别", "出生年月日", "筛查时月龄", "是否早产", "早产周数", "矫正月龄",
                    "评估时间", "所用筛查量表", "评估风险等级", "总分"};
            for (String h : baseHeaders) {
                Cell cell = header.createCell(col++);
                cell.setCellValue(h);
                cell.setCellStyle(headerGreen);
            }

            // 照护者信息列（黄色）
            String[] caregiverHeaders = {"家长/照护者姓名", "性别", "年龄", "照顾者关系", "是否单亲", "教育程度", "家庭收入"};
            for (String h : caregiverHeaders) {
                Cell cell = header.createCell(col++);
                cell.setCellValue(h);
                cell.setCellStyle(headerYellow);
            }

            // 逐题列（红色）：Q1选项, Q1得分, Q2选项, Q2得分, ...
            for (int q = 1; q <= maxQuestions; q++) {
                Cell cell1 = header.createCell(col++);
                cell1.setCellValue("Q" + q + "选项");
                cell1.setCellStyle(headerRed);
                Cell cell2 = header.createCell(col++);
                cell2.setCellValue("Q" + q + "得分");
                cell2.setCellStyle(headerRed);
            }

            // 数据行
            int rowIdx = 1;
            for (int i = 0; i < rows.size(); i++) {
                Map<String, Object> r = rows.get(i);
                List<Map<String, Object>> answerItems = allAnswerDetails.get(i);

                Row row = sheet.createRow(rowIdx++);
                int c = 0;

                String birth = str(r.get("child_birth_date"));
                String screeningTime = str(r.get("create_time"));
                boolean isPremature = toBool(r.get("is_premature"));
                int premWeeks = toInt(r.get("premature_weeks"));

                setCell(row, c++, r.get("child_name"), dataStyle);
                setCell(row, c++, genderLabel(r.get("child_gender")), dataStyle);
                setCell(row, c++, birth, dataStyle);
                setCell(row, c++, calcAgeMonths(birth, screeningTime), dataStyle);
                setCell(row, c++, isPremature ? "是" : "否", dataStyle);
                setCell(row, c++, isPremature ? String.valueOf(premWeeks) : "", dataStyle);
                setCell(row, c++, calcCorrectedAge(birth, screeningTime, isPremature, premWeeks), dataStyle);
                setCell(row, c++, screeningTime, dataStyle);
                setCell(row, c++, r.get("questionnaire_title"), dataStyle);
                setCell(row, c++, riskLabel(r.get("risk_level")), dataStyle);
                setCell(row, c++, r.get("total_score"), dataStyle);

                setCell(row, c++, r.get("cg_name"), dataStyle);
                setCell(row, c++, genderLabel(r.get("cg_gender")), dataStyle);
                setCell(row, c++, r.get("cg_age"), dataStyle);
                setCell(row, c++, r.get("relationship"), dataStyle);
                setCell(row, c++, r.get("is_single_parent"), dataStyle);
                setCell(row, c++, r.get("education"), dataStyle);
                setCell(row, c++, r.get("income"), dataStyle);

                // 逐题数据
                for (Map<String, Object> item : answerItems) {
                    String label = (String) item.getOrDefault("label", "");
                    int score = ((Number) item.getOrDefault("score", 0)).intValue();
                    setCell(row, c++, label, dataStyle);
                    setCell(row, c++, String.valueOf(score), dataStyle);
                }
                // 补齐空白列
                for (int q = answerItems.size(); q < maxQuestions; q++) {
                    setCell(row, c++, "", dataStyle);
                    setCell(row, c++, "", dataStyle);
                }
            }

            // 自动列宽
            for (int i = 0; i < col; i++) {
                sheet.autoSizeColumn(i, true);
                int width = Math.min(sheet.getColumnWidth(i) + 1024, 18 * 256);
                sheet.setColumnWidth(i, width);
            }

            // 冻结首行首列
            sheet.createFreezePane(1, 1);

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
                        " (SELECT COUNT(*) FROM children c WHERE c.user_id=u.id AND c.is_deleted=0) AS child_count, " +
                        " (SELECT COUNT(*) FROM answers a JOIN children c2 ON a.child_id=c2.id WHERE c2.user_id=u.id AND a.is_deleted=0) AS screening_count " +
                        " FROM users u WHERE u.deleted_at IS NULL ORDER BY u.create_time DESC");

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

    /** 生成儿童列表 Excel（排除已软删除） */
    public byte[] exportChildren() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT c.id, c.name, c.gender, c.birth_date, c.create_time, u.phone AS user_phone, " +
                        " (SELECT COUNT(*) FROM answers a WHERE a.child_id=c.id AND a.is_deleted=0) AS screening_count " +
                        " FROM children c JOIN users u ON c.user_id=u.id " +
                        " WHERE c.is_deleted=0 AND u.deleted_at IS NULL ORDER BY c.create_time DESC");

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

    private String str(Object v) { return v == null ? "" : v.toString(); }

    private boolean toBool(Object val) {
        if (val == null) return false;
        if (val instanceof Boolean b) return b;
        if (val instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Boolean b) return b ? 1 : 0;
        if (val instanceof Number n) return n.intValue();
        try { return Integer.parseInt(val.toString()); }
        catch (NumberFormatException e) { return 0; }
    }

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

    /** 计算筛查时月龄 */
    private String calcAgeMonths(String birth, String screeningTime) {
        if (birth == null || birth.isBlank() || screeningTime == null || screeningTime.isBlank()) return "";
        try {
            String bd = birth.length() >= 10 ? birth.substring(0, 10) : birth;
            String st = screeningTime.length() >= 10 ? screeningTime.substring(0, 10) : screeningTime;
            int months = ChildAgeUtils.getActualAgeMonths(LocalDate.parse(bd), LocalDate.parse(st));
            if (months < 12) return months + "个月";
            int years = months / 12;
            int rm = months % 12;
            return rm > 0 ? years + "岁" + rm + "个月" : years + "岁";
        } catch (Exception e) { return ""; }
    }

    /** 计算矫正月龄：使用 ChildAgeUtils 统一算法（含满24月不再矫正、防负月龄） */
    private String calcCorrectedAge(String birth, String screeningTime, boolean isPremature, int premWeeks) {
        if (!isPremature || premWeeks <= 0 || birth == null || screeningTime == null) return "";
        try {
            String bd = birth.length() >= 10 ? birth.substring(0, 10) : birth;
            String st = screeningTime.length() >= 10 ? screeningTime.substring(0, 10) : screeningTime;
            int actualMonths = ChildAgeUtils.getActualAgeMonths(LocalDate.parse(bd), LocalDate.parse(st));
            int birthGestationalWeeks = 40 - premWeeks;
            int correctedMonths = ChildAgeUtils.getAdjustedAgeMonths(actualMonths, birthGestationalWeeks);
            if (correctedMonths < 12) return correctedMonths + "个月(矫正)";
            int years = correctedMonths / 12;
            int rm = correctedMonths % 12;
            return rm > 0 ? years + "岁" + rm + "个月(矫正)" : years + "岁(矫正)";
        } catch (Exception e) { return ""; }
    }

    /** 解析 answer_json 为 List */
    private List<Map<String, Object>> parseAnswerItems(String answerJson) {
        if (answerJson == null || answerJson.isBlank()) return List.of();
        try {
            return mapper.readValue(answerJson, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
