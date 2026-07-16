package com.xingyu.autism.config;

/**
 * 请求上下文：存放当前线程的认证信息
 */
public class AuthContext {

    private static final ThreadLocal<TokenService.TokenInfo> HOLDER = new ThreadLocal<>();

    public static void set(TokenService.TokenInfo info) {
        HOLDER.set(info);
    }

    public static TokenService.TokenInfo get() {
        return HOLDER.get();
    }

    public static long currentUserId() {
        TokenService.TokenInfo info = HOLDER.get();
        if (info == null) throw new IllegalStateException("未登录");
        return info.userId();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
