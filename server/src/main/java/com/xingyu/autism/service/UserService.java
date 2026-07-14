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

    @Value("${autism.demo-code:123456}")
    private String demoCode;

    /** 发送验证码（演示模式：固定 123456，写入 users.code） */
    public String sendCode(SendCodeRequest req) {
        String phone = req.getPhone();
        // 实际项目此处应调用短信网关；演示模式统一使用 demoCode
        String code = demoCode;
        // 若用户不存在，先建立占位记录便于保存 code
        Integer cnt = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE phone=?", Integer.class, phone);
        if (cnt != null && cnt == 0) {
            jdbc.update("INSERT INTO users(phone, code) VALUES(?,?)", phone, code);
        } else {
            jdbc.update("UPDATE users SET code=?, update_time=datetime('now','localtime') WHERE phone=?", code, phone);
        }
        return code;
    }

    /** 注册 */
    public LoginResponse register(RegisterRequest req) {
        if (req.getPasswordConfirm() != null && !req.getPassword().equals(req.getPasswordConfirm())) {
            throw new BizException("两次密码不一致");
        }
        // 校验验证码
        verifyCode(req.getPhone(), req.getCode());
        // 是否已注册
        Integer cnt = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE phone=? AND password IS NOT NULL", Integer.class, req.getPhone());
        if (cnt != null && cnt > 0) {
            throw new BizException("该手机号已注册，请直接登录");
        }
        String hashed = passwordEncoder.encode(req.getPassword());
        Integer existing = jdbc.queryForObject("SELECT id FROM users WHERE phone=?", Integer.class, req.getPhone());
        long userId;
        if (existing != null) {
            jdbc.update("UPDATE users SET password=?, code=NULL, update_time=datetime('now','localtime') WHERE phone=?", hashed, req.getPhone());
            userId = existing;
        } else {
            jdbc.update("INSERT INTO users(phone, password) VALUES(?,?)", req.getPhone(), hashed);
            userId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        }
        String token = tokenService.create(userId, TokenService.ROLE_USER);
        return new LoginResponse(token, userId, req.getPhone(), null, null);
    }

    /** 验证码登录 */
    public LoginResponse login(LoginRequest req) {
        verifyCode(req.getPhone(), req.getCode());
        Map<String, Object> user = jdbc.queryForMap("SELECT id, phone, nickname, avatar FROM users WHERE phone=?", req.getPhone());
        // 清除验证码
        jdbc.update("UPDATE users SET code=NULL WHERE phone=?", req.getPhone());
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
        Map<String, Object> user;
        Integer cnt = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE openid=?", Integer.class, openid);
        if (cnt != null && cnt == 0) {
            jdbc.update("INSERT INTO users(phone, nickname, openid) VALUES(?,?,?)",
                    "wx_" + openid.substring(0, Math.min(11, openid.length())), "微信用户", openid);
            user = jdbc.queryForMap("SELECT id, phone, nickname, avatar FROM users WHERE openid=?", openid);
        } else {
            user = jdbc.queryForMap("SELECT id, phone, nickname, avatar FROM users WHERE openid=?", openid);
        }
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
        return jdbc.queryForMap("SELECT id, phone, nickname, avatar, create_time FROM users WHERE id=?", uid);
    }

    /** 校验验证码 */
    private void verifyCode(String phone, String code) {
        if (demoCode.equals(code)) {
            // 演示模式放行
            return;
        }
        String saved = jdbc.queryForObject("SELECT code FROM users WHERE phone=?", String.class, phone);
        if (saved == null || !saved.equals(code)) {
            throw new BizException("验证码错误");
        }
    }
}
