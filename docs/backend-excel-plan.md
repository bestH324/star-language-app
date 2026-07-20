# 后端 Excel 导出改造方案

> 根据模板表格 `CSV导出信息参考-初稿.xlsx`，改造后端为小程序提供 Excel 格式的文件下载。

---

## 一、模板表格结构（14 列）

### 绿色区域（现有数据可填充）— 列 1-6
| 列 | 字段名 | 数据来源 |
|---|--------|---------|
| 1 | 筛查儿童姓名 | `children.name` |
| 2 | 性别 | `children.gender`（male→男, female→女） |
| 3 | 出生年月日 | `children.birth_date` |
| 4 | 评估时间 | `answers.create_time` |
| 5 | 所用筛查量表 | `questionnaires.title` |
| 6 | 评估风险等级 | `answers.risk_level`（low→低风险, medium→中风险, high→高风险） |

### 黄色区域（需新建表）— 列 7-13
| 列 | 字段名 | 说明 |
|---|--------|------|
| 7 | 家长/照护者姓名 | 需新增字段 |
| 8 | 性别 | 男/女 |
| 9 | 年龄 | 数字 |
| 10 | 照顾者关系 | 母亲/父亲/其他 |
| 11 | 是否单亲 | 是/否 |
| 12 | 教育程度 | 初中及以下/高中或中专/大专/本科/研究生及以上 |
| 13 | 家庭收入 | ＜5000元/5000–9999元/10000–19999元/20000–29999元/≥30000元 |

### 红色区域（现有数据可填充）— 列 14
| 列 | 字段名 | 数据来源 |
|---|--------|---------|
| 14 | 量表条目及选项 | `answers.answer_json` 解析后拼接题目和用户选项 |

---

## 二、需要新增的数据库表

### 2.1 照护者信息表 `caregivers`

```sql
CREATE TABLE IF NOT EXISTS caregivers (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    child_id        INT NOT NULL UNIQUE,           -- 关联儿童，一对一
    name            VARCHAR(50),                    -- 家长/照护者姓名
    gender          VARCHAR(10),                    -- male / female
    age             INT,                            -- 年龄
    relationship    VARCHAR(20),                    -- 母亲 / 父亲 / 其他
    is_single_parent VARCHAR(4),                   -- 是 / 否
    education       VARCHAR(30),                    -- 教育程度
    income          VARCHAR(30),                    -- 家庭收入
    create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **注意**：如果照护者信息不需要单独建表，也可以直接在 `children` 表上加列。但考虑到这是一个独立的领域实体（一个儿童对应一位照护者），独立建表更清晰。

### 2.2 配套的接口建议
- `POST /api/caregiver/{childId}` — 创建/更新照护者信息
- `GET /api/caregiver/{childId}` — 查询照护者信息

> 这些可以在微信小程序的儿童管理页面中增加一个"家庭信息"填写入口。

---

## 三、需要新增的 API 端点

### 3.1 导出 Excel

```
GET /api/admin/export-excel?type=records
```

**Query 参数**：
- `type`：`users` / `children` / `records`，默认 `records`

**响应**：返回 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` 的 Excel 文件流。

**Type 说明**：
| type | 行为 |
|------|------|
| `records` | 按模板格式导出所有筛查记录（14列），一行一条记录 |
| `children` | 导出儿童列表 |
| `users` | 导出用户列表 |

---

## 四、Java 实现方案

### 4.1 在 `pom.xml` 添加 Apache POI 依赖

```xml
<!-- Apache POI — Excel 生成 -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>
```

### 4.2 新建 `ExcelExportService.java`

核心逻辑：

```java
@Service
public class ExcelExportService {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 生成筛查记录 Excel（按模板14列格式）
     */
    public byte[] exportRecordsExcel() {
        String sql = """
            SELECT
                c.name          AS child_name,
                c.gender        AS child_gender,
                c.birth_date    AS child_birth,
                a.create_time   AS survey_time,
                q.title         AS questionnaire_title,
                a.risk_level    AS risk_level,
                a.total_score   AS total_score,
                a.answer_json   AS answer_json,
                cg.name         AS caregiver_name,
                cg.gender       AS caregiver_gender,
                cg.age          AS caregiver_age,
                cg.relationship AS caregiver_relation,
                cg.is_single_parent AS is_single,
                cg.education    AS education,
                cg.income       AS income
            FROM answers a
            JOIN children c    ON a.child_id = c.id
            JOIN questionnaires q ON a.qid = q.id
            LEFT JOIN caregivers cg ON c.id = cg.child_id
            ORDER BY a.create_time DESC
            """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql);

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("筛查记录导出");
            createHeaderRow(wb, sheet);
            fillDataRows(wb, sheet, rows);
            setColumnWidths(sheet);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        } catch (IOException e) {
            throw new BizException("Excel生成失败: " + e.getMessage());
        }
    }

    private void createHeaderRow(Workbook wb, Sheet sheet) {
        Row header = sheet.createRow(0);
        String[] headers = {
            "筛查儿童姓名", "性别", "出生年月日", "评估时间",
            "所用筛查量表", "评估风险等级",
            "家长/照护者姓名", "性别", "年龄", "照顾者关系",
            "是否单亲", "教育程度", "家庭收入", "量表条目及选项"
        };

        // 颜色分区
        CellStyle greenStyle  = createColorStyle(wb, new byte[]{(byte)0x92, (byte)0xD0, 0x50});
        CellStyle yellowStyle = createColorStyle(wb, new byte[]{(byte)0xFF, (byte)0xFF, 0x00});
        CellStyle redStyle    = createColorStyle(wb, new byte[]{(byte)0xFF, 0x00, 0x00});

        for (int i = 0; i < headers.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers[i]);
            if (i <= 5)       cell.setCellStyle(greenStyle);
            else if (i <= 12) cell.setCellStyle(yellowStyle);
            else              cell.setCellStyle(redStyle);
        }
    }

    private void fillDataRows(Workbook wb, Sheet sheet, List<Map<String, Object>> rows) {
        CellStyle wrapStyle = wb.createCellStyle();
        wrapStyle.setWrapText(true);

        for (int i = 0; i < rows.size(); i++) {
            Row row = sheet.createRow(i + 1);
            Map<String, Object> r = rows.get(i);

            row.createCell(0).setCellValue(str(r.get("child_name")));
            row.createCell(1).setCellValue("male".equals(r.get("child_gender")) ? "男" : "女");
            row.createCell(2).setCellValue(str(r.get("child_birth")));
            row.createCell(3).setCellValue(str(r.get("survey_time")));
            row.createCell(4).setCellValue(str(r.get("questionnaire_title")));

            String riskText = switch (str(r.get("risk_level"))) {
                case "low" -> "低风险";
                case "medium" -> "中风险";
                default -> "高风险";
            };
            row.createCell(5).setCellValue(riskText);

            row.createCell(6).setCellValue(str(r.get("caregiver_name")));
            row.createCell(7).setCellValue("male".equals(r.get("caregiver_gender")) ? "男" : "女");
            row.createCell(8).setCellValue(r.get("caregiver_age") != null
                    ? ((Number) r.get("caregiver_age")).intValue() : 0);
            row.createCell(9).setCellValue(str(r.get("caregiver_relation")));
            row.createCell(10).setCellValue(str(r.get("is_single")));
            row.createCell(11).setCellValue(str(r.get("education")));
            row.createCell(12).setCellValue(str(r.get("income")));

            // 列14: 量表条目及选项
            String answerText = parseAnswerJson((String) r.get("answer_json"));
            Cell cell14 = row.createCell(13);
            cell14.setCellValue(answerText);
            cell14.setCellStyle(wrapStyle);
        }
    }

    private String parseAnswerJson(String json) {
        if (json == null || json.isEmpty()) return "";
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> answers = mapper.readValue(json,
                    new TypeReference<List<Map<String, Object>>>() {});
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < answers.size(); i++) {
                Map<String, Object> a = answers.get(i);
                sb.append("Q").append(i + 1).append(": ")
                  .append(a.getOrDefault("label", "未知"));
                if (i < answers.size() - 1) sb.append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return json;
        }
    }

    private CellStyle createColorStyle(Workbook wb, byte[] rgb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private String str(Object v) {
        return v == null ? "" : v.toString();
    }
}
```

### 4.3 在 `AdminController.java` 中添加端点

```java
@Autowired
private ExcelExportService excelExportService;

/** Excel 导出 */
@GetMapping("/export-excel")
public ResponseEntity<byte[]> exportExcel(@RequestParam(defaultValue = "records") String type) {
    byte[] content = excelExportService.exportRecordsExcel();
    String filename = "星语数据导出_" + LocalDate.now() + ".xlsx";
    String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(
        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    );
    headers.set(HttpHeaders.CONTENT_DISPOSITION,
        "attachment; filename*=UTF-8''" + encoded);
    return new ResponseEntity<>(content, headers, HttpStatus.OK);
}
```

---

## 五、落地步骤建议

| 顺序 | 步骤 | 说明 |
|------|------|------|
| 1 | 新建 `caregivers` 表 | 执行上面的 DDL |
| 2 | 添加 `ExcelExportService` | 核心 Excel 生成逻辑 |
| 3 | `AdminController` 加 `/export-excel` | 暴露 API |
| 4 | 添加照护者信息填写接口 | 前端才能收集列7-13的数据 |
| 5 | `pom.xml` 添加 POI 依赖 | Maven 刷新 |

---

## 六、前端调用说明

小程序端已改造完毕，调用路径如下：

```
GET /api/admin/export-excel?type=records
```

Header 携带 `X-Token` 鉴权，返回 xlsx 文件流。小程序通过 `wx.downloadFile` + `wx.openDocument` 下载并预览。
