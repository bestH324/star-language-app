package com.xingyu.autism.dto;

/**
 * 登录响应
 */
public class LoginResponse {
    private String token;
    private long userId;
    private String phone;
    private String nickname;
    private String avatar;

    public LoginResponse(String token, long userId, String phone, String nickname, String avatar) {
        this.token = token;
        this.userId = userId;
        this.phone = phone;
        this.nickname = nickname;
        this.avatar = avatar;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public long getUserId() { return userId; }
    public void setUserId(long userId) { this.userId = userId; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
}
