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

    /** 列表 */
    public List<Map<String, Object>> list() {
        long uid = AuthContext.currentUserId();
        return jdbc.queryForList(
                "SELECT id, user_id, name, gender, birth_date, avatar, create_time FROM children WHERE user_id=? ORDER BY create_time DESC",
                uid);
    }

    /** 新增（年龄限制 1-5 岁） */
    public Map<String, Object> add(ChildRequest req) {
        validateAge(req.getBirthDate());
        long uid = AuthContext.currentUserId();
        jdbc.update("INSERT INTO children(user_id, name, gender, birth_date, avatar) VALUES(?,?,?,?,?)",
                uid, req.getName(), req.getGender(), req.getBirthDate(),
                req.getAvatar() == null ? "👶" : req.getAvatar());
        long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        return jdbc.queryForMap("SELECT * FROM children WHERE id=?", id);
    }

    /** 修改 */
    public Map<String, Object> update(long id, ChildRequest req) {
        validateAge(req.getBirthDate());
        long uid = AuthContext.currentUserId();
        checkOwnership(id, uid);
        jdbc.update("UPDATE children SET name=?, gender=?, birth_date=?, avatar=? WHERE id=?",
                req.getName(), req.getGender(), req.getBirthDate(),
                req.getAvatar() == null ? "👶" : req.getAvatar(), id);
        return jdbc.queryForMap("SELECT * FROM children WHERE id=?", id);
    }

    /** 删除（连带删除筛查记录，由外键 ON DELETE CASCADE 处理） */
    public void delete(long id) {
        long uid = AuthContext.currentUserId();
        checkOwnership(id, uid);
        jdbc.update("DELETE FROM children WHERE id=?", id);
    }

    /** 详情 */
    public Map<String, Object> detail(long id) {
        return jdbc.queryForMap("SELECT * FROM children WHERE id=?", id);
    }

    /** 校验年龄 1-5 岁（12-60 个月） */
    private void validateAge(String birthDate) {
        try {
            LocalDate birth = LocalDate.parse(birthDate);
            long months = Period.between(birth, LocalDate.now()).toTotalMonths();
            if (months < 12 || months > 60) {
                throw new BizException("本筛查适用于1-5岁（12-60个月）的儿童");
            }
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException("出生日期格式错误");
        }
    }

    /** 校验归属权 */
    private void checkOwnership(long childId, long uid) {
        Integer owner = jdbc.queryForObject("SELECT user_id FROM children WHERE id=?", Integer.class, childId);
        if (owner == null) throw new BizException("儿童档案不存在");
        if (owner != uid) throw new BizException(403, "无权操作他人儿童档案");
    }
}
