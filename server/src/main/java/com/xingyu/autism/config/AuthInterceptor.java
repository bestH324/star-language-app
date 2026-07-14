package com.xingyu.autism.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingyu.autism.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 权限拦截器：校验 token 与角色
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Autowired
    private TokenService tokenService;

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse resp, Object handler) throws Exception {
        String uri = req.getRequestURI();

        // 公开接口放行
        if (isPublic(uri)) {
            return true;
        }

        // 从 header 或 query 读取 token
        String token = req.getHeader("X-Token");
        if (token == null || token.isBlank()) token = req.getParameter("token");

        TokenService.TokenInfo info = tokenService.verify(token);
        if (info == null) {
            writeJson(resp, 401, Result.error(401, "未登录或登录已过期"));
            return false;
        }

        // 管理员接口校验角色
        if (uri.startsWith("/api/admin/") && !TokenService.ROLE_ADMIN.equals(info.role())) {
            writeJson(resp, 403, Result.error(403, "无管理员权限"));
            return false;
        }

        AuthContext.set(info);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse resp, Object handler, Exception ex) {
        AuthContext.clear();
    }

    private boolean isPublic(String uri) {
        if (uri.startsWith("/api/video/")) return true;
        if (uri.equals("/api/user/send-code") || uri.equals("/api/user/register")
                || uri.equals("/api/user/login") || uri.equals("/api/user/wx-login")
                || uri.equals("/api/admin/login")) return true;
        // 问卷、科普文章、转诊机构、赋能资源对游客开放
        if (uri.startsWith("/api/questionnaire/")) return true;
        if (uri.startsWith("/api/article/")) return true;
        if (uri.startsWith("/api/institution/")) return true;
        if (uri.equals("/api/resource/list")) return true;
        return false;
    }

    private void writeJson(HttpServletResponse resp, int status, Result<?> result) throws Exception {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write(mapper.writeValueAsString(result));
    }
}
