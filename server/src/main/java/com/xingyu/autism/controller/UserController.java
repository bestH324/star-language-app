package com.xingyu.autism.controller;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.common.Result;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.dto.LoginRequest;
import com.xingyu.autism.dto.LoginResponse;
import com.xingyu.autism.dto.RegisterRequest;
import com.xingyu.autism.dto.SendCodeRequest;
import com.xingyu.autism.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户接口
 */
@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    /** 发送验证码 */
    @PostMapping("/send-code")
    public Result<Map<String, Object>> sendCode(@Valid @RequestBody SendCodeRequest req) {
        userService.sendCode(req);
        return Result.success(Map.of("sent", true, "demoCode", "123456", "tip", "演示模式验证码：123456"));
    }

    /** 注册 */
    @PostMapping("/register")
    public Result<LoginResponse> register(@Valid @RequestBody RegisterRequest req) {
        return Result.success(userService.register(req));
    }

    /** 登录（支持验证码 / 密码两种方式） */
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        String password = req.getPassword();
        String code = req.getCode();
        if (password != null && !password.isBlank()) {
            return Result.success(userService.loginWithPassword(req.getPhone(), password));
        } else if (code != null && !code.isBlank()) {
            return Result.success(userService.login(req));
        } else {
            throw new BizException("验证码或密码不能为空");
        }
    }

    /** 微信小程序登录 */
    @PostMapping("/wx-login")
    public Result<LoginResponse> wxLogin(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        return Result.success(userService.wxLogin(code));
    }

    /** 退出登录 */
    @PostMapping("/logout")
    public Result<?> logout(HttpServletRequest req) {
        String token = req.getHeader("X-Token");
        if (token == null) token = req.getParameter("token");
        userService.logout(token);
        return Result.success();
    }

    /** 保存知情同意状态 */
    @PostMapping("/agree-privacy")
    public Result<Map<String, Object>> agreePrivacy(@RequestBody Map<String, Object> body) {
        long uid = AuthContext.currentUserId();
        Boolean agreedResearch = (Boolean) body.getOrDefault("agreedResearch", false);
        userService.agreePrivacy(uid, agreedResearch);
        return Result.success(userService.profile(uid));
    }

    /** 获取当前用户信息 */
    @GetMapping("/profile")
    public Result<Map<String, Object>> profile() {
        return Result.success(userService.profile());
    }

    /** 更新个人资料 */
    @PostMapping("/profile")
    public Result<Map<String, Object>> updateProfile(@RequestBody Map<String, String> body) {
        long uid = AuthContext.currentUserId();
        String nickname = body.get("nickname");
        String avatar = body.get("avatar");
        userService.updateProfile(uid, nickname, avatar);
        return Result.success(userService.profile(uid));
    }

    /** 注销账号：永久删除用户及其关联的全部数据 */
    @DeleteMapping("/account")
    public Result<Map<String, Object>> deleteAccount() {
        long uid = AuthContext.currentUserId();
        userService.deleteAccount(uid);
        return Result.success(Map.of("deleted", true, "message", "账号已注销，全部数据已清除"));
    }

    /** 获取当前用户的提醒消息列表 */
    @GetMapping("/reminders")
    public Result<List<Map<String, Object>>> reminders() {
        long uid = AuthContext.currentUserId();
        return Result.success(userService.getReminders(uid));
    }
}
