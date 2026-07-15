package com.xingyu.autism.service;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.TokenService;
import com.xingyu.autism.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        Map<String, Object> ans = jdbc.queryForMap("SELECT * FROM answers WHERE id=?", answerId);
        Map<String, Object> child = jdbc.queryForMap(
                "SELECT c.*, u.phone AS user_phone FROM children c JOIN users u ON c.user_id=u.id WHERE c.id=?", ans.get("child_id"));
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
            }
            case "records" -> {
                sb.append("ID,儿童,所属用户手机,风险等级,得分,筛查时间\n");
                for (Map<String, Object> r : recordsList()) {
                    String risk = switch ((String) r.get("risk_level")) {
                        case "low" -> "低风险";
                        case "medium" -> "中风险";
                        default -> "高风险";
                    };
                    sb.append(csv(r.get("id"))).append(',')
                            .append(csv(r.get("child_name"))).append(',')
                            .append(csv(r.get("user_phone"))).append(',')
                            .append(risk).append(',')
                            .append(csv(r.get("total_score"))).append(',')
                            .append(csv(r.get("create_time"))).append('\n');
                }
            }
            default -> throw new BizException("不支持的导出类型: " + type);
        }
        return sb.toString();
    }

    // ============ 内部工具 ============
    private long count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
    }

    private long countWhere(String table, String where) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + where, Long.class);
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
}
