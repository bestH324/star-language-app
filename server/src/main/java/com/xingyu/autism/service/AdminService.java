package com.xingyu.autism.service;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.TokenService;
import com.xingyu.autism.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;

/**
 * 管理员服务：登录、统计、列表、CSV 导出
 */
@Service
public class AdminService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    /** 管理员登录 */
    public LoginResponse login(String username, String password) {
        List<Map<String, Object>> list = jdbc.queryForList("SELECT * FROM admins WHERE username=?", username);
        if (list.isEmpty()) throw new BizException("账号或密码错误");
        Map<String, Object> admin = list.get(0);
        if (!passwordEncoder.matches(password, (String) admin.get("password"))) {
            throw new BizException("账号或密码错误");
        }
        long id = ((Number) admin.get("id")).longValue();
        String token = tokenService.create(id, TokenService.ROLE_ADMIN);
        return new LoginResponse(token, id, username, "管理员", null);
    }

    /** 数据总览 + 风险分布 */
    public Map<String, Object> stats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", count("users"));
        stats.put("totalChildren", count("children"));
        stats.put("totalScreenings", count("answers"));

        Map<String, Object> risk = new LinkedHashMap<>();
        risk.put("high", countWhere("answers", "risk_level='high'"));
        risk.put("medium", countWhere("answers", "risk_level='medium'"));
        risk.put("low", countWhere("answers", "risk_level='low'"));
        stats.put("riskDistribution", risk);

        // 年龄段分布
        stats.put("ageDistribution", ageDistribution());
        // 答题完成率（已完成筛查 / 儿童数）
        long screened = countWhere("children", "id IN (SELECT DISTINCT child_id FROM answers)");
        long totalChildren = count("children");
        double completion = totalChildren == 0 ? 0 : (screened * 100.0 / totalChildren);
        stats.put("completionRate", Math.round(completion * 100) / 100.0);
        return stats;
    }

    /** 用户列表 */
    public List<Map<String, Object>> userList() {
        return jdbc.queryForList(
                "SELECT u.id, u.phone, u.nickname, u.create_time, " +
                        " (SELECT COUNT(*) FROM children c WHERE c.user_id=u.id) AS child_count, " +
                        " (SELECT COUNT(*) FROM answers a JOIN children c2 ON a.child_id=c2.id WHERE c2.user_id=u.id) AS screening_count " +
                        " FROM users u ORDER BY u.create_time DESC");
    }

    /** 儿童列表 */
    public List<Map<String, Object>> childrenList() {
        return jdbc.queryForList(
                "SELECT c.id, c.name, c.gender, c.birth_date, c.avatar, c.create_time, u.phone AS user_phone, " +
                        " (SELECT COUNT(*) FROM answers a WHERE a.child_id=c.id) AS screening_count " +
                        " FROM children c JOIN users u ON c.user_id=u.id ORDER BY c.create_time DESC");
    }

    /** 筛查记录列表 */
    public List<Map<String, Object>> recordsList() {
        return jdbc.queryForList(
                "SELECT a.id, a.child_id, a.total_score, a.risk_level, a.create_time, " +
                        " c.name AS child_name, c.avatar AS child_avatar, u.phone AS user_phone " +
                        " FROM answers a JOIN children c ON a.child_id=c.id JOIN users u ON c.user_id=u.id " +
                        " ORDER BY a.create_time DESC");
    }

    /** 记录详情（管理员） */
    public Map<String, Object> recordDetail(long answerId) {
        List<Map<String, Object>> ansRows = jdbc.queryForList("SELECT * FROM answers WHERE id=?", answerId);
        if (ansRows.isEmpty()) throw new BizException("筛查记录不存在");
        Map<String, Object> ans = ansRows.get(0);
        List<Map<String, Object>> childRows = jdbc.queryForList(
                "SELECT c.*, u.phone AS user_phone FROM children c JOIN users u ON c.user_id=u.id WHERE c.id=?", ans.get("child_id"));
        if (childRows.isEmpty()) throw new BizException("儿童档案不存在");
        Map<String, Object> child = childRows.get(0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", ans.get("id"));
        result.put("child", child);
        result.put("totalScore", ans.get("total_score"));
        result.put("riskLevel", ans.get("risk_level"));
        result.put("createTime", ans.get("create_time"));
        result.put("answerJson", ans.get("answer_json"));
        return result;
    }

    /** CSV 导出 */
    public String exportCsv(String type) {
        StringBuilder sb = new StringBuilder("\uFEFF"); // BOM 中文兼容
        switch (type) {
            case "users" -> {
                sb.append("ID,手机号,昵称,注册时间,儿童数,筛查数\n");
                for (Map<String, Object> u : userList()) {
                    sb.append(csv(u.get("id"))).append(',')
                            .append(csv(u.get("phone"))).append(',')
                            .append(csv(u.get("nickname"))).append(',')
                            .append(csv(u.get("create_time"))).append(',')
                            .append(csv(u.get("child_count"))).append(',')
                            .append(csv(u.get("screening_count"))).append('\n');
                }
                break;
            }
            case "children" -> {
                sb.append("ID,昵称,性别,出生日期,所属用户手机,筛查次数\n");
                for (Map<String, Object> c : childrenList()) {
                    sb.append(csv(c.get("id"))).append(',')
                            .append(csv(c.get("name"))).append(',')
                            .append("male".equals(c.get("gender")) ? "男," : "女,")
                            .append(csv(c.get("birth_date"))).append(',')
                            .append(csv(c.get("user_phone"))).append(',')
                            .append(csv(c.get("screening_count"))).append('\n');
                }
                break;
            }
            case "records" -> {
                sb.append("筛查儿童姓名,性别,出生年月日,评估时间,所用筛查量表,评估风险等级," +
                        "家长/照护者姓名,性别,年龄,照顾者关系,是否单亲,教育程度,家庭收入,量表条目及选项\n");
                for (Map<String, Object> r : fetchRecordsForExport()) {
                    sb.append(csv(r.get("child_name"))).append(',')
                            .append(genderLabel(r.get("child_gender"))).append(',')
                            .append(csv(r.get("child_birth_date"))).append(',')
                            .append(csv(r.get("create_time"))).append(',')
                            .append(csv(r.get("questionnaire_title"))).append(',')
                            .append(riskLabel(r.get("risk_level"))).append(',')
                            .append(csv(r.get("cg_name"))).append(',')
                            .append(genderLabel(r.get("cg_gender"))).append(',')
                            .append(csv(r.get("cg_age"))).append(',')
                            .append(csv(r.get("relationship"))).append(',')
                            .append(csv(r.get("is_single_parent"))).append(',')
                            .append(csv(r.get("education"))).append(',')
                            .append(csv(r.get("income"))).append(',')
                            .append(csv(formatAnswerDetail((String) r.get("answer_json")))).append('\n');
                }
                break;
            }
            default -> {
                sb.append("错误信息\n");
                sb.append("不支持的导出类型: ").append(csv(type)).append('\n');
            }
        }
        return sb.toString();
    }

    // ============ 内部工具 ============

    private static final Set<String> ALLOWED_TABLES = Set.of(
            "users", "children", "answers", "admins", "questionnaires", "questions",
            "articles", "institutions", "resources", "appointments");

    private long count(String table) {
        if (!ALLOWED_TABLES.contains(table)) {
            throw new BizException("非法表名: " + table);
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT COUNT(*) AS cnt FROM " + table);
        return ((Number) rows.get(0).get("cnt")).longValue();
    }

    private long countWhere(String table, String where) {
        if (!ALLOWED_TABLES.contains(table)) {
            throw new BizException("非法表名: " + table);
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT COUNT(*) AS cnt FROM " + table + " WHERE " + where);
        return ((Number) rows.get(0).get("cnt")).longValue();
    }

    private List<Map<String, Object>> ageDistribution() {
        List<Map<String, Object>> children = jdbc.queryForList("SELECT birth_date FROM children");
        Map<String, Integer> buckets = new LinkedHashMap<>();
        buckets.put("1-2岁", 0);
        buckets.put("2-3岁", 0);
        buckets.put("3-4岁", 0);
        buckets.put("4-5岁", 0);
        for (Map<String, Object> c : children) {
            try {
                long months = Period.between(LocalDate.parse((String) c.get("birth_date")), LocalDate.now()).toTotalMonths();
                if (months < 12) continue;
                int years = (int) (months / 12);
                String key = switch (years) {
                    case 1 -> "1-2岁";
                    case 2 -> "2-3岁";
                    case 3 -> "3-4岁";
                    default -> "4-5岁";
                };
                buckets.put(key, buckets.get(key) + 1);
            } catch (Exception ignored) {}
        }
        List<Map<String, Object>> result = new ArrayList<>();
        buckets.forEach((k, v) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", k);
            m.put("count", v);
            result.add(m);
        });
        return result;
    }

    private String csv(Object v) {
        return v == null ? "" : v.toString().replace(",", " ");
    }

    // ============ 导出辅助方法 ============

    private final ObjectMapper mapper = new ObjectMapper();

    /** 筛查记录导出专用查询：JOIN children + caregivers，含照护者人口学信息 */
    private List<Map<String, Object>> fetchRecordsForExport() {
        // 完整查询（含 caregivers 人口学字段）
        try {
            return jdbc.queryForList(
                    "SELECT a.id, a.total_score, a.risk_level, a.create_time, a.answer_json, " +
                            " c.name AS child_name, c.gender AS child_gender, c.birth_date AS child_birth_date, " +
                            " q.title AS questionnaire_title, " +
                            " cg.name AS cg_name, cg.gender AS cg_gender, cg.age AS cg_age, " +
                            " cg.relationship, cg.is_single_parent, cg.education, cg.income " +
                            " FROM answers a " +
                            " JOIN children c ON a.child_id = c.id " +
                            " LEFT JOIN questionnaires q ON a.qid = q.id " +
                            " LEFT JOIN caregivers cg ON c.id = cg.child_id " +
                            " ORDER BY a.create_time DESC");
        } catch (Exception e) {
            // 降级：caregivers 表缺失时使用简化查询（不含人口学字段）
            return jdbc.queryForList(
                    "SELECT a.id, a.total_score, a.risk_level, a.create_time, a.answer_json, " +
                            " c.name AS child_name, c.gender AS child_gender, c.birth_date AS child_birth_date, " +
                            " q.title AS questionnaire_title " +
                            " FROM answers a " +
                            " JOIN children c ON a.child_id = c.id " +
                            " LEFT JOIN questionnaires q ON a.qid = q.id " +
                            " ORDER BY a.create_time DESC");
        }
    }

    /** 家长姓名：昵称优先，无昵称显示脱敏手机号 */
    /** 风险等级中文 */
    private String riskLabel(Object level) {
        if (level == null) return "";
        return switch ((String) level) {
            case "low" -> "低风险";
            case "medium" -> "中风险";
            case "high" -> "高风险";
            default -> (String) level;
        };
    }

    /** 性别中文 */
    private String genderLabel(Object g) {
        if (g == null) return "";
        return "male".equals(g) ? "男" : "女";
    }

    /** 解析 answer_json 为 "Q1:经常会, Q2:有时, ..." 格式 */
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
