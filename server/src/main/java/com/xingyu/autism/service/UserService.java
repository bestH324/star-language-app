package com.xingyu.autism.service;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.config.TokenService;
import com.xingyu.autism.dto.LoginRequest;
import com.xingyu.autism.dto.LoginResponse;
import com.xingyu.autism.dto.RegisterRequest;
import com.xingyu.autism.dto.SendCodeRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 用户服务：验证码、注册、登录、微信登录、个人信息
 */
@Service
public class UserService {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private ReminderService reminderService;

    @Value("${autism.demo-code:123456}")
    private String demoCode;

    /** 发送验证码（演示模式：固定 123456，写入 users.code） */
    public String sendCode(SendCodeRequest req) {
        String phone = req.getPhone();
        String code = demoCode;
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id FROM users WHERE phone=?", phone);
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO users(phone, code) VALUES(?,?)", phone, code);
        } else {
            jdbc.update("UPDATE users SET code=?, update_time=NOW() WHERE phone=?", code, phone);
        }
        return code;
    }

    /** 注册 */
    public LoginResponse register(RegisterRequest req) {
        if (req.getPasswordConfirm() != null && !req.getPassword().equals(req.getPasswordConfirm())) {
            throw new BizException("两次密码不一致");
        }
        verifyCode(req.getPhone(), req.getCode());
        // 是否已注册
        List<Map<String, Object>> registeredRows = jdbc.queryForList(
                "SELECT id FROM users WHERE phone=? AND password IS NOT NULL", req.getPhone());
        if (!registeredRows.isEmpty()) {
            throw new BizException("该手机号已注册，请直接登录");
        }
        String hashed = passwordEncoder.encode(req.getPassword());
        List<Map<String, Object>> existingRows = jdbc.queryForList(
                "SELECT id FROM users WHERE phone=?", req.getPhone());
        long userId;
        if (!existingRows.isEmpty()) {
            userId = ((Number) existingRows.get(0).get("id")).longValue();
            jdbc.update("UPDATE users SET password=?, code=NULL, update_time=NOW() WHERE phone=?", hashed, req.getPhone());
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
                "SELECT id, phone, nickname, avatar FROM users WHERE phone=?", req.getPhone());
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
                "SELECT id, phone, nickname, avatar, password FROM users WHERE phone=?", phone);
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
     * @param code 小程序 wx.login() 返回的 code
     *             （演示模式：直接生成/查找 openid，未对接微信服务端接口）
     */
    public LoginResponse wxLogin(String code) {
        // TODO 生产环境替换为真实调用：https://api.weixin.qq.com/sns/jscode2session
        // 此处演示：用 code 作为虚拟 openid
        String openid = "demo_" + (code == null ? "guest" : code.hashCode());
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, phone, nickname, avatar FROM users WHERE openid=?", openid);
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO users(phone, nickname, openid) VALUES(?,?,?)",
                    "wx_" + openid.substring(0, Math.min(11, openid.length())), "微信用户", openid);
            rows = jdbc.queryForList(
                    "SELECT id, phone, nickname, avatar FROM users WHERE openid=?", openid);
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
                "SELECT id, phone, nickname, avatar, agreed_privacy, agreed_research, create_time FROM users WHERE id=?", userId);
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

    /** 校验验证码 */
    private void verifyCode(String phone, String code) {
        if (demoCode.equals(code)) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT code FROM users WHERE phone=?", phone);
        String saved = rows.isEmpty() ? null : (String) rows.get(0).get("code");
        if (saved == null || !saved.equals(code)) {
            throw new BizException("验证码错误");
        }
    }
}
