package com.xingyu.autism.model;

/**
 * 医院/机构实体
 */
public class Hospital {
    private Long id;
    private String name;
    private String grade;               // A/B/C/D
    private Double lat;
    private Double lng;
    private Double specialtyScore;      // 静态专长分（兜底值）
    private String ageRangeExpertise;   // 擅长月龄段："0-2岁"/"3-5岁"/"全年龄段"
    private String riskLevelExpertise;  // 擅长风险等级："low"/"medium"/"high"/"all"
    private Integer waitTime;           // 等待天数
    private Double rating;              // 等级/名誉分 1-5
    private Double userScore;           // 用户评分 1-5
    private String city;
    private String address;
    private String phone;

    public Hospital() {}

    public Hospital(Long id, String name, String grade, Double lat, Double lng,
                    Double specialtyScore, String ageRangeExpertise, String riskLevelExpertise,
                    Integer waitTime, Double rating, Double userScore,
                    String city, String address, String phone) {
        this.id = id;
        this.name = name;
        this.grade = grade;
        this.lat = lat;
        this.lng = lng;
        this.specialtyScore = specialtyScore;
        this.ageRangeExpertise = ageRangeExpertise;
        this.riskLevelExpertise = riskLevelExpertise;
        this.waitTime = waitTime;
        this.rating = rating;
        this.userScore = userScore;
        this.city = city;
        this.address = address;
        this.phone = phone;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public Double getSpecialtyScore() { return specialtyScore; }
    public void setSpecialtyScore(Double specialtyScore) { this.specialtyScore = specialtyScore; }
    public String getAgeRangeExpertise() { return ageRangeExpertise; }
    public void setAgeRangeExpertise(String ageRangeExpertise) { this.ageRangeExpertise = ageRangeExpertise; }
    public String getRiskLevelExpertise() { return riskLevelExpertise; }
    public void setRiskLevelExpertise(String riskLevelExpertise) { this.riskLevelExpertise = riskLevelExpertise; }
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
}
