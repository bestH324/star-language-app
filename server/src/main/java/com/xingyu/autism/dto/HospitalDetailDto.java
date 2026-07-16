package com.xingyu.autism.dto;

import java.util.List;
import java.util.Map;

/**
 * 机构详情 DTO
 */
public class HospitalDetailDto {
    private Long id;
    private String name;
    private String grade;
    private String gradeLabel;
    private Double lat;
    private Double lng;
    private String ageRangeExpertise;
    private String riskLevelExpertise;
    private Double specialtyScore;
    private Integer waitTime;
    private Double rating;
    private Double userScore;
    private String city;
    private String address;
    private String phone;
    private String description;
    private List<Map<String, String>> doctors;  // [{name, title, avatar}]

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getGradeLabel() { return gradeLabel; }
    public void setGradeLabel(String gradeLabel) { this.gradeLabel = gradeLabel; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getAgeRangeExpertise() { return ageRangeExpertise; }
    public void setAgeRangeExpertise(String ageRangeExpertise) { this.ageRangeExpertise = ageRangeExpertise; }
    public String getRiskLevelExpertise() { return riskLevelExpertise; }
    public void setRiskLevelExpertise(String riskLevelExpertise) { this.riskLevelExpertise = riskLevelExpertise; }
    public Double getSpecialtyScore() { return specialtyScore; }
    public void setSpecialtyScore(Double specialtyScore) { this.specialtyScore = specialtyScore; }
    public Integer getWaitTime() { return waitTime; }
    public void setWaitTime(Integer waitTime) { this.waitTime = waitTime; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Double getUserScore() { return userScore; }
    public void setUserScore(Double userScore) { this.userScore = userScore; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<Map<String, String>> getDoctors() { return doctors; }
    public void setDoctors(List<Map<String, String>> doctors) { this.doctors = doctors; }
}
