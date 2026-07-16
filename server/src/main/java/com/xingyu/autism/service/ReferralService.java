package com.xingyu.autism.service;

import com.xingyu.autism.dto.HospitalDetailDto;
import com.xingyu.autism.dto.HospitalRecommendDto;
import com.xingyu.autism.model.Hospital;
import com.xingyu.autism.util.GeoUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReferralService {

    @Autowired
    private MockHospitalDataService mockHospitalDataService;

    @Autowired
    private JdbcTemplate jdbc;

    private static final Map<String, String> GRADE_LABELS = Map.of(
            "A", "三甲医院 · 主任医师",
            "B", "二甲医院 · 副主任医师",
            "C", "社区医院 · 主治医师",
            "D", "康复机构 · 持证治疗师"
    );

    // ==================== 智能推荐 ====================

    public List<HospitalRecommendDto> recommend(double userLat, double userLng, Long childId, String gradeFilter) {
        String childAgeRange = resolveAgeRange(childId);
        String riskLevel = resolveRiskLevel(childId);

        List<Hospital> hospitals = mockHospitalDataService.getAllHospitals();
        if (hospitals.isEmpty()) return Collections.emptyList();

        // gradeFilter 过滤，支持逗号分隔的多选：A,B,C
        if (gradeFilter != null && !gradeFilter.isBlank()) {
            Set<String> grades = Set.of(gradeFilter.trim().toUpperCase().split(","));
            hospitals = hospitals.stream().filter(h -> grades.contains(h.getGrade())).collect(Collectors.toList());
        }
        if (hospitals.isEmpty()) return Collections.emptyList();

        double[] distances = new double[hospitals.size()];
        for (int i = 0; i < hospitals.size(); i++) {
            distances[i] = GeoUtils.distance(userLat, userLng, hospitals.get(i).getLat(), hospitals.get(i).getLng());
        }

        double maxDist = Arrays.stream(distances).max().orElse(1.0);
        double minDist = Arrays.stream(distances).min().orElse(0.0);
        int maxWait = hospitals.stream().mapToInt(Hospital::getWaitTime).max().orElse(1);

        List<ScoreEntry> entries = new ArrayList<>();
        for (int i = 0; i < hospitals.size(); i++) {
            Hospital h = hospitals.get(i);
            double dist = distances[i];
            double dynamicSpec = calcDynamicSpecialtyScore(childAgeRange, riskLevel, h);

            double distScore   = (maxDist - dist) / (maxDist - minDist + 0.001) * 30;
            double specScore   = (dynamicSpec / 10.0) * 25;
            double waitScore   = (1.0 - (double) h.getWaitTime() / (maxWait + 0.001)) * 20;
            double ratingScore = (h.getRating() / 5.0) * 15;
            double userScoreV  = (h.getUserScore() / 5.0) * 10;

            double total = distScore + specScore + waitScore + ratingScore + userScoreV;
            entries.add(new ScoreEntry(h, dist, dynamicSpec, total));
        }

        entries.sort((a, b) -> Double.compare(b.totalScore, a.totalScore));

        return entries.stream().map(e -> {
            Hospital h = e.hospital;
            HospitalRecommendDto dto = new HospitalRecommendDto();
            dto.setId(h.getId());
            dto.setName(h.getName());
            dto.setGrade(h.getGrade());
            dto.setGradeLabel(GRADE_LABELS.getOrDefault(h.getGrade(), h.getGrade()));
            dto.setDistance(Math.round(e.distance * 10.0) / 10.0);
            dto.setSpecialtyScore(Math.round(e.dynamicSpec * 10.0) / 10.0);
            dto.setWaitTime(h.getWaitTime());
            dto.setRating(h.getRating());
            dto.setUserScore(h.getUserScore());
            dto.setTotalScore(Math.round(e.totalScore * 10.0) / 10.0);
            dto.setCity(h.getCity());
            dto.setAddress(h.getAddress());
            dto.setPhone(h.getPhone());
            return dto;
        }).collect(Collectors.toList());
    }

    // ==================== 机构详情 ====================

    public HospitalDetailDto getHospitalDetail(Long id) {
        Hospital h = mockHospitalDataService.getAllHospitals().stream()
                .filter(x -> x.getId().equals(id)).findFirst().orElse(null);
        if (h == null) return null;

        HospitalDetailDto dto = new HospitalDetailDto();
        dto.setId(h.getId());
        dto.setName(h.getName());
        dto.setGrade(h.getGrade());
        dto.setGradeLabel(GRADE_LABELS.getOrDefault(h.getGrade(), h.getGrade()));
        dto.setLat(h.getLat());
        dto.setLng(h.getLng());
        dto.setAgeRangeExpertise(h.getAgeRangeExpertise());
        dto.setRiskLevelExpertise(h.getRiskLevelExpertise());
        dto.setSpecialtyScore(h.getSpecialtyScore());
        dto.setWaitTime(h.getWaitTime());
        dto.setRating(h.getRating());
        dto.setUserScore(h.getUserScore());
        dto.setCity(h.getCity());
        dto.setAddress(h.getAddress());
        dto.setPhone(h.getPhone());
        dto.setDescription("本院是孤独症谱系障碍（ASD）诊疗领域的专业机构，拥有经验丰富的多学科团队，"
                + "致力于为儿童提供早期筛查、精准诊断、个性化干预及家庭指导等一站式服务。");
        dto.setDoctors(List.of(
                Map.of("name", "张主任", "title", "儿童精神科 · 主任医师", "avatar", ""),
                Map.of("name", "李医生", "title", "发育行为儿科 · 副主任医师", "avatar", ""),
                Map.of("name", "王治疗师", "title", "康复治疗 · 持证治疗师", "avatar", "")
        ));
        return dto;
    }

    // ==================== 预约 ====================

    public Map<String, Object> createAppointment(Long userId, Long childId, Long hospitalId,
                                                  String hospitalName, String type, String appointmentTime) {
        jdbc.update("INSERT INTO appointments (user_id, child_id, hospital_id, hospital_name, type, appointment_time) VALUES (?,?,?,?,?,?)",
                userId, childId, hospitalId, hospitalName, type, appointmentTime);
        return Map.of("success", true);
    }

    public List<Map<String, Object>> getAppointments(Long userId) {
        return jdbc.queryForList(
                "SELECT a.*, c.name AS child_name FROM appointments a LEFT JOIN children c ON a.child_id = c.id WHERE a.user_id = ? ORDER BY a.create_time DESC",
                userId);
    }

    // ==================== 模拟支付 ====================

    public Map<String, Object> createPayment(Long userId) {
        return Map.of("success", true, "orderNo", "PAY" + System.currentTimeMillis(), "amount", 299);
    }

    // ==================== 动态专长匹配矩阵 ====================

    double calcDynamicSpecialtyScore(String childAgeRange, String childRisk, Hospital hospital) {
        String hospAge  = hospital.getAgeRangeExpertise();
        String hospRisk = hospital.getRiskLevelExpertise();

        boolean ageExact  = childAgeRange.equals(hospAge);
        boolean riskExact = childRisk.equals(hospRisk);
        boolean ageCover  = ageExact || "全年龄段".equals(hospAge);
        boolean riskCover = riskExact || "all".equals(hospRisk);

        if (ageExact && riskExact) return 10.0;
        if ((ageExact && "all".equals(hospRisk)) || (riskExact && "全年龄段".equals(hospAge))) return 9.0;
        if ("全年龄段".equals(hospAge) && "all".equals(hospRisk)) return 8.0;
        if (ageCover || riskCover) return 6.0;
        return 4.0;
    }

    // ==================== 儿童数据查询 ====================

    private String resolveAgeRange(Long childId) {
        if (childId == null) return "全年龄段";
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT birth_date FROM children WHERE id = ?", childId);
            if (rows.isEmpty()) return "全年龄段";
            Object raw = rows.get(0).get("birth_date");
            if (raw == null) return "全年龄段";
            LocalDate birth = LocalDate.parse(raw.toString(), DateTimeFormatter.ISO_LOCAL_DATE);
            int months = Period.between(birth, LocalDate.now()).getYears() * 12
                       + Period.between(birth, LocalDate.now()).getMonths();
            if (months <= 35) return "0-2岁";
            if (months <= 71) return "3-5岁";
            return "3-5岁";
        } catch (Exception e) {
            return "全年龄段";
        }
    }

    private String resolveRiskLevel(Long childId) {
        if (childId == null) return "medium";
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT risk_level FROM answers WHERE child_id = ? ORDER BY create_time DESC LIMIT 1", childId);
            if (rows.isEmpty()) return "medium";
            Object raw = rows.get(0).get("risk_level");
            if (raw == null) return "medium";
            String level = raw.toString().toLowerCase();
            if ("low".equals(level) || "medium".equals(level) || "high".equals(level)) return level;
            return "medium";
        } catch (Exception e) {
            return "medium";
        }
    }

    private static class ScoreEntry {
        final Hospital hospital;
        final double distance;
        final double dynamicSpec;
        final double totalScore;
        ScoreEntry(Hospital h, double d, double s, double t) { hospital = h; distance = d; dynamicSpec = s; totalScore = t; }
    }
}
