package com.xingyu.autism.controller;

import com.xingyu.autism.common.Result;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.dto.HospitalDetailDto;
import com.xingyu.autism.dto.HospitalRecommendDto;
import com.xingyu.autism.service.ReferralService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referral")
public class ReferralController {

    @Autowired
    private ReferralService referralService;

    /** 智能转诊推荐（主路由） */
    @GetMapping({"/recommend", "/match"})
    public Result<List<HospitalRecommendDto>> recommend(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false) Long childId,
            @RequestParam(required = false) String gradeFilter) {
        return Result.success(referralService.recommend(latitude, longitude, childId, gradeFilter));
    }

    /** 别名路由：/api/recommend/match */
    @GetMapping("/api/recommend/match")
    public Result<List<HospitalRecommendDto>> recommendMatch(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false) Long childId,
            @RequestParam(required = false) String gradeFilter) {
        return Result.success(referralService.recommend(latitude, longitude, childId, gradeFilter));
    }

    /** 机构详情 */
    @GetMapping("/hospital/{id}")
    public Result<HospitalDetailDto> hospitalDetail(@PathVariable Long id) {
        HospitalDetailDto dto = referralService.getHospitalDetail(id);
        if (dto == null) return Result.error(404, "机构不存在");
        return Result.success(dto);
    }

    /** 提交预约 */
    @PostMapping("/appointment")
    public Result<Map<String, Object>> appointment(@RequestBody Map<String, Object> body) {
        Long userId = AuthContext.currentUserId();
        Long childId = Long.valueOf(body.get("childId").toString());
        Long hospitalId = Long.valueOf(body.get("hospitalId").toString());
        String hospitalName = (String) body.getOrDefault("hospitalName", "");
        String type = (String) body.get("type");
        String appointmentTime = (String) body.get("appointmentTime");
        Map<String, Object> result = referralService.createAppointment(userId, childId, hospitalId, hospitalName, type, appointmentTime);
        return Result.success(result);
    }

    /** 我的预约记录 */
    @GetMapping("/appointments")
    public Result<List<Map<String, Object>>> appointments() {
        Long userId = AuthContext.currentUserId();
        return Result.success(referralService.getAppointments(userId));
    }

    /** 模拟支付 */
    @PostMapping("/payment/create")
    public Result<Map<String, Object>> paymentCreate() {
        Long userId = AuthContext.currentUserId();
        return Result.success(referralService.createPayment(userId));
    }
}
