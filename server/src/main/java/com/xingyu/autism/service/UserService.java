package com.xingyu.autism.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.config.TokenService;
import com.xingyu.autism.dto.LoginRequest;
import com.xingyu.autism.dto.LoginResponse;
import com.xingyu.autism.dto.RegisterRequest;
import com.xingyu.autism.dto.SendCodeRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户服务：验证码、注册、登录、微信登录、个人信息
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${autism.demo-code:123456}")
    private String demoCode;

    @Value("${wechat.miniapp.appid}")
    private String wechatAppid;

    @Value("${wechat.miniapp.secret:}")
    private String wechatSecret;

    /** 发送验证码。已删除用户重新注册时，复用原记录避免 UNIQUE 冲突。 */
    public String sendCode(SendCodeRequest req) {
        String phone = req.getPhone();
        String code = demoCode;
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id, deleted_at FROM users WHERE phone=?", phone);
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO users(phone, code) VALUES(?,?)", phone, code);
        } else {
            jdbc.update("UPDATE users SET code=?, update_time=NOW() WHERE phone=?", code, phone);
        }
        return code;
    }

    /** 注册（支持软删除用户用原手机号重新注册） */
    public LoginResponse register(RegisterRequest req) {
        if (req.getPasswordConfirm() != null && !req.getPassword().equals(req.getPasswordConfirm())) {
            throw new BizException("两次密码不一致");
        }
        verifyCode(req.getPhone(), req.getCode());
        // 是否已注册（排除已删除用户）
        List<Map<String, Object>> registeredRows = jdbc.queryForList(
                "SELECT id FROM users WHERE phone=? AND password IS NOT NULL AND deleted_at IS NULL", req.getPhone());
        if (!registeredRows.isEmpty()) {
            throw new BizException("该手机号已注册，请直接登录");
        }
        String hashed = passwordEncoder.encode(req.getPassword());
        // 查询该手机号所有记录（含软删除），以便复用已删除用户的 ID
        List<Map<String, Object>> existingRows = jdbc.queryForList(
                "SELECT id, deleted_at FROM users WHERE phone=?", req.getPhone());
        long userId;
        if (!existingRows.isEmpty()) {
            Map<String, Object> row = existingRows.get(0);
            userId = ((Number) row.get("id")).longValue();
            if (row.get("deleted_at") != null) {
                // 软删除用户重新注册：恢复账号并更新密码，同时恢复关联数据
                jdbc.update("UPDATE users SET password=?, code=NULL, is_deleted=0, deleted_at=NULL, update_time=NOW() WHERE id=?",
                        hashed, userId);
                jdbc.update("UPDATE children SET is_deleted=0, deleted_at=NULL WHERE user_id=?", userId);
                jdbc.update("UPDATE answers SET is_deleted=0, deleted_at=NULL WHERE child_id IN (SELECT id FROM children WHERE user_id=?)", userId);
                jdbc.update("UPDATE reminders SET is_deleted=0, deleted_at=NULL WHERE user_id=?", userId);
            } else {
                jdbc.update("UPDATE users SET password=?, code=NULL, update_time=NOW() WHERE phone=?", hashed, req.getPhone());
            }
        } else {
            jdbc.update("INSERT INTO users(phone, password) VALUES(?,?)", req.getPhone(), hashed);
            List<Map<String, Object>> idRows = jdbc.queryForList("SELECT LAST_INSERT_ID() AS id");
            userId = ((Number) idRows.get(0).get("id")).longValue();
        }
        String token = tokenService.create(userId, TokenService.ROLE_USER);
        // 为新注册用户的所有儿童创建未筛查提醒
        List<Map<String, Object>> children = jdbc.queryForList(
                "SELECT id FROM children WHERE user_id=?", userId);
        for (Map<String, Object> c : children) {
            long childId = ((Number) c.get("id")).longValue();
            reminderService.createFirstScreeningReminders(userId, childId);
        }
        return new LoginResponse(token, userId, req.getPhone(), null, null);
    }

    /** 验证码登录 */
    public LoginResponse login(LoginRequest req) {
        verifyCode(req.getPhone(), req.getCode());
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone, nickname, avatar FROM users WHERE phone=? AND deleted_at IS NULL", req.getPhone());
        if (rows.isEmpty()) {
            throw new BizException("该手机号未注册");
        }
        Map<String, Object> user = rows.get(0);
        jdbc.update("UPDATE users SET code=NULL WHERE phone=?", req.getPhone());
        long userId = ((Number) user.get("id")).longValue();
        String token = tokenService.create(userId, TokenService.ROLE_USER);
        return new LoginResponse(token, userId, (String) user.get("phone"),
                (String) user.get("nickname"), (String) user.get("avatar"));
    }

    /** 密码登录 */
    public LoginResponse loginWithPassword(String phone, String password) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone, nickname, avatar, password FROM users WHERE phone=? AND deleted_at IS NULL", phone);
        if (rows.isEmpty()) {
            throw new BizException("该手机号未注册");
        }
        Map<String, Object> user = rows.get(0);
        String hashed = (String) user.get("password");
        if (hashed == null || !passwordEncoder.matches(password, hashed)) {
            throw new BizException("密码错误");
        }
        long userId = ((Number) user.get("id")).longValue();
        String token = tokenService.create(userId, TokenService.ROLE_USER);
        return new LoginResponse(token, userId, (String) user.get("phone"),
                (String) user.get("nickname"), (String) user.get("avatar"));
    }

    /**
     * 微信小程序登录
     * 调用微信 jscode2session 接口获取 openid，然后查找或创建用户。
     * 若未配置 wechat.miniapp.secret 则自动降级为演示模式。
     *
     * @param code 小程序 wx.login() 返回的临时 code
     */
    public LoginResponse wxLogin(String code) {
        if (code == null || code.isBlank()) {
            throw new BizException("登录凭证不能为空");
        }

        // 未配置 AppSecret → 演示模式
        if (wechatSecret == null || wechatSecret.isBlank()) {
            log.warn("未配置微信 AppSecret，使用演示模式登录");
            return wxLoginDemo(code);
        }

        // 调用微信 jscode2session
        String url = "https://api.weixin.qq.com/sns/jscode2session"
                + "?appid=" + wechatAppid
                + "&secret=" + wechatSecret
                + "&js_code=" + code
                + "&grant_type=authorization_code";

        String openid;
        try {
            String respJson = restTemplate.getForObject(url, String.class);
            log.debug("微信 jscode2session 响应: {}", respJson);

            @SuppressWarnings("unchecked")
            Map<String, Object> wxResp = new ObjectMapper().readValue(respJson, Map.class);

            // 检查微信返回的错误
            if (wxResp.containsKey("errcode")) {
                int errcode = ((Number) wxResp.get("errcode")).intValue();
                if (errcode != 0) {
                    String errmsg = (String) wxResp.getOrDefault("errmsg", "未知错误");
                    log.error("微信 jscode2session 返回错误: errcode={}, errmsg={}", errcode, errmsg);
                    throw new BizException("微信登录失败，请稍后重试");
                }
            }

            openid = (String) wxResp.get("openid");
            if (openid == null || openid.isBlank()) {
                log.error("微信 jscode2session 未返回 openid: {}", respJson);
                throw new BizException("获取微信身份失败，请稍后重试");
            }
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用微信 jscode2session 异常: {}", e.getMessage(), e);
            throw new BizException("微信登录服务异常，请稍后重试");
        }

        // 查找或创建用户
        return loginByOpenid(openid);
    }

    /** 演示模式：用 code 生成虚拟 openid */
    private LoginResponse wxLoginDemo(String code) {
        String openid = "demo_" + code.hashCode();
        return loginByOpenid(openid);
    }

    /** 根据 openid 查找或创建用户，生成 token 并返回 */
    private LoginResponse loginByOpenid(String openid) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone, nickname, avatar FROM users WHERE openid=? AND deleted_at IS NULL", openid);
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO users(phone, nickname, openid) VALUES(?,?,?)",
                    "wx_" + openid.substring(0, Math.min(11, openid.length())), "微信用户", openid);
            rows = jdbc.queryForList(
                    "SELECT id, phone, nickname, avatar FROM users WHERE openid=? AND deleted_at IS NULL", openid);
        }
        Map<String, Object> user = rows.get(0);
        long userId = ((Number) user.get("id")).longValue();
        String token = tokenService.create(userId, TokenService.ROLE_USER);
        return new LoginResponse(token, userId, (String) user.get("phone"),
                (String) user.get("nickname"), (String) user.get("avatar"));
    }

    /** 退出登录 */
    public void logout(String token) {
        tokenService.invalidate(token);
    }

    /** 获取当前用户信息 */
    public Map<String, Object> profile() {
        long uid = AuthContext.currentUserId();
        return profile(uid);
    }

    /** 获取指定用户信息 */
    public Map<String, Object> profile(long userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone, nickname, avatar, agreed_privacy, agreed_research, create_time FROM users WHERE id=? AND deleted_at IS NULL", userId);
        if (rows.isEmpty()) {
            throw new BizException("用户不存在");
        }
        return rows.get(0);
    }

    /** 保存知情同意状态 */
    public void agreePrivacy(long userId, boolean agreedResearch) {
        jdbc.update("UPDATE users SET agreed_privacy=1, agreed_research=?, privacy_agreed_at=NOW() WHERE id=?",
                agreedResearch ? 1 : 0, userId);
    }

    /** 更新用户个人资料 */
    public void updateProfile(long userId, String nickname, String avatar) {
        boolean hasNickname = nickname != null && !nickname.trim().isEmpty();
        boolean hasAvatar = avatar != null && !avatar.trim().isEmpty();

        if (!hasNickname && !hasAvatar) {
            return;
        }

        StringBuilder sql = new StringBuilder("UPDATE users SET ");
        List<Object> params = new ArrayList<>();

        if (hasNickname) {
            sql.append("nickname = ?, ");
            params.add(nickname.trim());
        }
        if (hasAvatar) {
            sql.append("avatar = ?, ");
            params.add(avatar.trim());
        }

        sql.append("update_time = NOW() WHERE id = ?");
        params.add(userId);

        jdbc.update(sql.toString(), params.toArray());
    }

    /** 注销账号：软删除用户及其关联数据（儿童、筛查记录、提醒）。token 立即失效。 */
    public void deleteAccount(long userId) {
        tokenService.invalidateAll(userId);
        int affected = jdbc.update("UPDATE users SET is_deleted=1, deleted_at=NOW() WHERE id=? AND deleted_at IS NULL", userId);
        if (affected == 0) {
            throw new BizException("用户不存在或已注销");
        }
        // 级联软删除关联数据
        jdbc.update("UPDATE children SET is_deleted=1, deleted_at=NOW() WHERE user_id=? AND is_deleted=0", userId);
        jdbc.update("UPDATE answers SET is_deleted=1, deleted_at=NOW() WHERE child_id IN (SELECT id FROM children WHERE user_id=?) AND is_deleted=0", userId);
        jdbc.update("UPDATE reminders SET is_deleted=1, deleted_at=NOW() WHERE user_id=? AND is_deleted=0", userId);
    }

    /**
     * 获取用户历程时间轴
     * 事件类型: register, first_screening, screening, referral, retest
     */
    public List<Map<String, Object>> getTimeline(long userId) {
        List<Map<String, Object>> events = new ArrayList<>();

        // 1. 注册事件
        List<Map<String, Object>> userRows = jdbc.queryForList(
                "SELECT create_time FROM users WHERE id=? AND deleted_at IS NULL", userId);
        if (!userRows.isEmpty()) {
            Map<String, Object> reg = new LinkedHashMap<>();
            reg.put("type", "register");
            reg.put("date", userRows.get(0).get("create_time"));
            reg.put("title", "注册加入星语");
            reg.put("description", "开始您的孤独症早期筛查之旅");
            reg.put("icon", "star");
            events.add(reg);
        }

        // 2. 筛查事件（首次筛查单独标记）
        List<Map<String, Object>> screeningRows = jdbc.queryForList(
                "SELECT a.id, a.create_time, a.total_score, a.risk_level, " +
                " c.name AS child_name, q.title AS questionnaire_title " +
                " FROM answers a " +
                " JOIN children c ON a.child_id = c.id " +
                " LEFT JOIN questionnaires q ON a.qid = q.id " +
                " WHERE c.user_id = ? " +
                " ORDER BY a.create_time ASC", userId);

        boolean firstDone = false;
        for (Map<String, Object> row : screeningRows) {
            Map<String, Object> evt = new LinkedHashMap<>();
            if (!firstDone) {
                evt.put("type", "first_screening");
                evt.put("title", "完成首次筛查");
                firstDone = true;
            } else {
                evt.put("type", "screening");
                evt.put("title", "完成筛查");
            }
            evt.put("icon", "check");
            evt.put("date", row.get("create_time"));
            evt.put("childName", row.get("child_name"));
            evt.put("questionnaireTitle", row.get("questionnaire_title"));
            evt.put("totalScore", row.get("total_score"));
            String risk = (String) row.get("risk_level");
            evt.put("riskLevel", risk);
            evt.put("riskText", risk == null ? "" :
                    ("high".equals(risk) ? "高风险" : "medium".equals(risk) ? "中风险" : "低风险"));
            evt.put("description",
                    (row.get("child_name") != null ? row.get("child_name") : "宝宝") +
                    " · " + (row.get("questionnaire_title") != null ? row.get("questionnaire_title") : "筛查") +
                    " · 得分" + row.get("total_score") +
                    " · " + evt.get("riskText"));
            events.add(evt);
        }

        // 3. 转诊预约事件
        List<Map<String, Object>> referralRows = jdbc.queryForList(
                "SELECT a.id, a.hospital_name, a.type AS appointment_type, " +
                " a.appointment_time, a.status, a.create_time, c.name AS child_name " +
                " FROM appointments a " +
                " JOIN children c ON a.child_id = c.id " +
                " WHERE c.user_id = ? " +
                " ORDER BY a.create_time ASC", userId);
        for (Map<String, Object> row : referralRows) {
            Map<String, Object> evt = new LinkedHashMap<>();
            evt.put("type", "referral");
            evt.put("date", row.get("create_time"));
            evt.put("title", "转诊预约");
            evt.put("icon", "hospital");
            evt.put("hospitalName", row.get("hospital_name"));
            evt.put("appointmentType", row.get("appointment_type"));
            evt.put("appointmentTime", row.get("appointment_time"));
            evt.put("status", row.get("status"));
            evt.put("childName", row.get("child_name"));
            evt.put("description", "预约" + row.get("hospital_name") + " · " +
                    (row.get("appointment_type") != null ? row.get("appointment_type") : "就诊") +
                    " · " + (row.get("status") != null ? row.get("status") : ""));
            events.add(evt);
        }

        // 4. 复测提醒事件（retest 类型且未取消）
        List<Map<String, Object>> retestRows = jdbc.queryForList(
                "SELECT r.id, r.scheduled_days, r.trigger_reason, r.status, r.create_time, c.name AS child_name " +
                " FROM reminders r " +
                " JOIN children c ON r.child_id = c.id " +
                " WHERE r.user_id = ? AND r.reminder_type = 'retest' AND r.status != 'cancelled' " +
                " ORDER BY r.create_time ASC", userId);
        for (Map<String, Object> row : retestRows) {
            Map<String, Object> evt = new LinkedHashMap<>();
            evt.put("type", "retest");
            evt.put("date", row.get("create_time"));
            evt.put("title", "复测提醒");
            evt.put("icon", "repeat");
            evt.put("scheduledDays", row.get("scheduled_days"));
            evt.put("triggerReason", row.get("trigger_reason"));
            evt.put("status", row.get("status"));
            evt.put("childName", row.get("child_name"));
            evt.put("description",
                    (row.get("child_name") != null ? row.get("child_name") : "宝宝") +
                    " · " + (row.get("trigger_reason") != null ? row.get("trigger_reason") : "建议复测") +
                    " · " + ("sent".equals(row.get("status")) ? "已提醒" : "待提醒"));
            events.add(evt);
        }

        // 5. 跳过问卷提醒事件（missed_questionnaire 类型）
        List<Map<String, Object>> missedRows = jdbc.queryForList(
                "SELECT r.id, r.trigger_reason, r.status, r.create_time, c.name AS child_name " +
                " FROM reminders r " +
                " JOIN children c ON r.child_id = c.id " +
                " WHERE r.user_id = ? AND r.reminder_type = 'missed_questionnaire' AND r.status != 'cancelled' " +
                " ORDER BY r.create_time ASC", userId);
        for (Map<String, Object> row : missedRows) {
            Map<String, Object> evt = new LinkedHashMap<>();
            evt.put("type", "missed_questionnaire");
            evt.put("date", String.valueOf(row.get("create_time")));
            evt.put("title", "跳过阶段");
            evt.put("icon", "warning");
            evt.put("status", row.get("status"));
            evt.put("childName", row.get("child_name"));
            evt.put("description", row.get("trigger_reason") != null ? row.get("trigger_reason") : "跳过了某个阶段的问卷");
            events.add(evt);
        }

        // 按时间升序排列（date 可能是 String 或 LocalDateTime，统一转为 String 比较）
        events.sort((a, b) -> {
            String da = String.valueOf(a.get("date"));
            String db = String.valueOf(b.get("date"));
            if (da == null || "null".equals(da)) {
                if (db == null || "null".equals(db)) return 0;
                return -1;
            }
            if (db == null || "null".equals(db)) return 1;
            return da.compareTo(db);
        });

        return events;
    }

    /** 获取用户的提醒消息列表 */
    public List<Map<String, Object>> getReminders(long userId) {
        return jdbc.queryForList(
                "SELECT r.id, r.reminder_type, r.trigger_reason, r.scheduled_days, r.status, r.sent_at, r.create_time, " +
                        " c.name AS child_name, c.avatar AS child_avatar " +
                        " FROM reminders r LEFT JOIN children c ON r.child_id = c.id " +
                        " WHERE r.user_id = ? AND r.status != 'cancelled' " +
                        " ORDER BY r.create_time DESC LIMIT 50", userId);
    }

    /** 校验验证码 */
    private void verifyCode(String phone, String code) {
        if (demoCode.equals(code)) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT code FROM users WHERE phone=? AND deleted_at IS NULL", phone);
        String saved = rows.isEmpty() ? null : (String) rows.get(0).get("code");
        if (saved == null || !saved.equals(code)) {
            throw new BizException("验证码错误");
        }
    }
}
