package com.xingyu.autism.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * 儿童档案请求
 */
public class ChildRequest {
    @NotBlank(message = "宝宝昵称不能为空")
    private String name;

    @NotBlank(message = "请选择性别")
    @Pattern(regexp = "male|female", message = "性别参数错误")
    private String gender;

    @NotBlank(message = "请选择出生日期")
    private String birthDate;

    private String avatar;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
}
