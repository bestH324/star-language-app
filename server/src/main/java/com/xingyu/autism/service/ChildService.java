package com.xingyu.autism.service;

import com.xingyu.autism.common.BizException;
import com.xingyu.autism.config.AuthContext;
import com.xingyu.autism.dto.ChildRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;

/**
 * 儿童档案服务
 */
@Service
public class ChildService {

    @Autowired
    private JdbcTemplate jdbc;

    /** 列表（排除已软删除） */
    public List<Map<String, Object>> list() {
        long uid = AuthContext.currentUserId();
        return jdbc.queryForList(
                "SELECT id, user_id, name, gender, birth_date, avatar, is_premature, premature_weeks, city, create_time FROM children WHERE user_id=? AND is_deleted=0 ORDER BY create_time DESC",
                uid);
    }

    /** 新增（年龄限制 11-60 个月） */
    public Map<String, Object> add(ChildRequest req) {
        validateAge(req.getBirthDate());
        long uid = AuthContext.currentUserId();
        jdbc.update("INSERT INTO children(user_id, name, gender, birth_date, avatar, is_premature, premature_weeks, city) VALUES(?,?,?,?,?,?,?,?)",
                uid, req.getName(), req.getGender(), req.getBirthDate(),
                req.getAvatar() == null ? "👶" : req.getAvatar(),
                req.getIsPremature() != null && req.getIsPremature() ? 1 : 0,
                req.getPrematureWeeks() == null ? 0 : req.getPrematureWeeks(),
                req.getCity());
        long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM children WHERE id=?", id);
        if (rows.isEmpty()) throw new BizException("儿童档案创建失败");
        return rows.get(0);
    }

    /** 修改 */
    public Map<String, Object> update(long id, ChildRequest req) {
        validateAge(req.getBirthDate());
        long uid = AuthContext.currentUserId();
        checkOwnership(id, uid);
        jdbc.update("UPDATE children SET name=?, gender=?, birth_date=?, avatar=?, is_premature=?, premature_weeks=?, city=? WHERE id=?",
                req.getName(), req.getGender(), req.getBirthDate(),
                req.getAvatar() == null ? "👶" : req.getAvatar(),
                req.getIsPremature() != null && req.getIsPremature() ? 1 : 0,
                req.getPrematureWeeks() == null ? 0 : req.getPrematureWeeks(),
                req.getCity(), id);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM children WHERE id=?", id);
        if (rows.isEmpty()) throw new BizException("儿童档案不存在");
        return rows.get(0);
    }

    /** 软删除 */
    public void delete(long id) {
        long uid = AuthContext.currentUserId();
        checkOwnership(id, uid);
        jdbc.update("UPDATE children SET is_deleted=1, deleted_at=NOW() WHERE id=?", id);
    }

    /** 筛查时间轴：按时间升序返回该宝宝每次筛查记录 */
    public List<Map<String, Object>> timeline(long childId) {
        long uid = AuthContext.currentUserId();
        checkOwnership(childId, uid);
        return jdbc.queryForList(
                "SELECT a.id, a.total_score, a.risk_level, a.create_time, " +
                " q.title AS questionnaire_title " +
                " FROM answers a LEFT JOIN questionnaires q ON a.qid = q.id " +
                " WHERE a.child_id = ? AND a.is_deleted=0 ORDER BY a.create_time ASC", childId);
    }

    /** 详情 */
    public Map<String, Object> detail(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM children WHERE id=? AND is_deleted=0", id);
        if (rows.isEmpty()) throw new BizException("儿童档案不存在");
        return rows.get(0);
    }

    /** 校验年龄 11-60 个月 */
    private void validateAge(String birthDate) {
        try {
            LocalDate birth = LocalDate.parse(birthDate);
            long months = Period.between(birth, LocalDate.now()).toTotalMonths();
            if (months < 11 || months > 60) {
                throw new BizException("本筛查适用于11-60个月的儿童");
            }
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException("出生日期格式错误");
        }
    }

    /** 校验归属权 */
    private void checkOwnership(long childId, long uid) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT user_id FROM children WHERE id=? AND is_deleted=0", childId);
        if (rows.isEmpty()) throw new BizException("儿童档案不存在");
        int owner = ((Number) rows.get(0).get("user_id")).intValue();
        if (owner != uid) throw new BizException(403, "无权操作他人儿童档案");
    }
}
