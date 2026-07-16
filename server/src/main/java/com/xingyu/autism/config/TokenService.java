package com.xingyu.autism.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 轻量级 Token 服务（内存存储，适用于单实例部署）
 * <p>
 * 角色：user / admin
 * Token 格式：uuid（无状态随机串）
 */
@Component
public class TokenService {

    public static final String ROLE_USER = "user";
    public static final String ROLE_ADMIN = "admin";

    public record TokenInfo(long userId, String role, long expireAt) {}

    private final Map<String, TokenInfo> store = new ConcurrentHashMap<>();

    @Value("${autism.token-expire-hours:72}")
    private long expireHours;

    /** 生成 token */
    public String create(long userId, String role) {
        cleanup();
        String token = UUID.randomUUID().toString().replace("-", "");
        long expireAt = System.currentTimeMillis() + expireHours * 3600_000L;
        store.put(token, new TokenInfo(userId, role, expireAt));
        return token;
    }

    /** 校验 token，返回 TokenInfo，无效返回 null */
    public TokenInfo verify(String token) {
        if (token == null || token.isBlank()) return null;
        TokenInfo info = store.get(token);
        if (info == null) return null;
        if (System.currentTimeMillis() > info.expireAt()) {
            store.remove(token);
            return null;
        }
        return info;
    }

    /** 注销 */
    public void invalidate(String token) {
        if (token != null) store.remove(token);
    }

    /** 清理过期 token */
    private void cleanup() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue().expireAt() < now);
    }
}
