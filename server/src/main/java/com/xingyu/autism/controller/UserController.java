package com.xingyu.autism.controller;

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

    /** 验证码登录 */
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return Result.success(userService.login(req));
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

    /** 获取当前用户信息 */
    @GetMapping("/profile")
    public Result<Map<String, Object>> profile() {
        return Result.success(userService.profile());
    }

    /** 更新昵称（资料修改） */
    @PostMapping("/profile")
    public Result<?> updateProfile(@RequestBody Map<String, String> body) {
        long uid = AuthContext.currentUserId();
        String nickname = body.get("nickname");
        String avatar = body.get("avatar");
        if (nickname != null || avatar != null) {
            // 由 service 层处理，此处直接 SQL
        }
        return Result.success();
    }
}
