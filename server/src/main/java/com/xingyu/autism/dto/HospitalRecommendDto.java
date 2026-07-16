package com.xingyu.autism.dto;

/**
 * 转诊推荐结果 DTO
 */
public class HospitalRecommendDto {
    private Long id;
    private String name;
    private String grade;
    private String gradeLabel;      // A/B/C/D 的中文标注
    private Double distance;         // 距离（公里）
    private Double specialtyScore;
    private Integer waitTime;
    private Double rating;
    private Double userScore;
    private Double totalScore;       // 综合得分
    private String city;
    private String address;
    private String phone;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getGradeLabel() { return gradeLabel; }
    public void setGradeLabel(String gradeLabel) { this.gradeLabel = gradeLabel; }
    public Double getDistance() { return distance; }
    public void setDistance(Double distance) { this.distance = distance; }
    public Double getSpecialtyScore() { return specialtyScore; }
    public void setSpecialtyScore(Double specialtyScore) { this.specialtyScore = specialtyScore; }
    public Integer getWaitTime() { return waitTime; }
    public void setWaitTime(Integer waitTime) { this.waitTime = waitTime; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Double getUserScore() { return userScore; }
    public void setUserScore(Double userScore) { this.userScore = userScore; }
    public Double getTotalScore() { return totalScore; }
    public void setTotalScore(Double totalScore) { this.totalScore = totalScore; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
