package com.xingyu.autism.service;

import com.xingyu.autism.model.Hospital;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 机构数据服务 —— DB 优先，内存兜底
 */
@Service
public class MockHospitalDataService {

    @Autowired
    private JdbcTemplate jdbc;

    public List<Hospital> getAllHospitals() {
        List<Hospital> fromDb = loadFromDb();
        if (!fromDb.isEmpty()) {
            return fromDb;
        }
        return fallbackMockData();
    }

    /**
     * 从 institutions 表读取，映射为 Hospital 模型。
     * 表中缺失的匹配字段（grade/lat/lng/specialtyScore 等）使用合理默认值。
     */
    private List<Hospital> loadFromDb() {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM institutions ORDER BY id");
            if (rows.isEmpty()) return List.of();

            List<Hospital> list = new ArrayList<>();
            for (Map<String, Object> row : rows) {
                Hospital h = new Hospital();
                h.setId(toLong(row.get("id")));
                h.setName(str(row.get("name")));
                h.setGrade("B");
                h.setLat(39.9042);
                h.setLng(116.4074);
                h.setSpecialtyScore(7.0);
                h.setAgeRangeExpertise("全年龄段");
                h.setRiskLevelExpertise("all");
                h.setWaitTime(7);
                h.setRating(4.0);
                h.setUserScore(4.0);
                h.setCity(str(row.get("region")));
                h.setAddress(str(row.get("address")));
                h.setPhone(str(row.get("phone")));
                list.add(h);
            }
            return list;
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * 硬编码 20 家全国机构（DB 无数据时兜底）
     */
    private List<Hospital> fallbackMockData() {
        List<Hospital> list = new ArrayList<>();

        // ====== 北京 (6家) ======
        list.add(new Hospital(1L,  "北京大学第六医院",                "A", 39.98, 116.35, 9.5, "全年龄段", "all",    7,  4.7, 4.6, "北京", "海淀区花园北路51号",           "010-62723860"));
        list.add(new Hospital(2L,  "首都医科大学附属北京安定医院",    "A", 39.95, 116.38, 9.2, "3-5岁",    "high",   10, 4.5, 4.4, "北京", "西城区德胜门外安康胡同5号",    "010-58303000"));
        list.add(new Hospital(3L,  "北京儿童医院",                    "A", 39.91, 116.35, 9.0, "0-2岁",    "all",    14, 4.6, 4.5, "北京", "西城区南礼士路56号",           "010-59616161"));
        list.add(new Hospital(4L,  "北京市海淀医院",                  "B", 39.97, 116.30, 6.5, "全年龄段", "medium", 5,  3.8, 4.0, "北京", "海淀区中关村大街29号",         "010-82619999"));
        list.add(new Hospital(5L,  "北京朝阳区妇幼保健院",            "C", 39.92, 116.46, 5.0, "0-2岁",    "low",    3,  3.5, 3.8, "北京", "朝阳区潘家园华威里25号",       "010-67719999"));
        list.add(new Hospital(6L,  "北京星星雨教育研究所",            "D", 39.88, 116.50, 8.0, "0-2岁",    "high",   1,  4.2, 4.3, "北京", "朝阳区双桥东路18号",           "010-85323011"));

        // ====== 上海 (4家) ======
        list.add(new Hospital(7L,  "上海市精神卫生中心",              "A", 31.21, 121.44, 9.3, "全年龄段", "all",    8,  4.6, 4.5, "上海", "徐汇区宛平南路600号",          "021-64387250"));
        list.add(new Hospital(8L,  "复旦大学附属儿科医院",            "A", 31.19, 121.45, 9.6, "3-5岁",    "all",    12, 4.8, 4.7, "上海", "闵行区万源路399号",            "021-64931923"));
        list.add(new Hospital(9L,  "上海交通大学医学院附属新华医院",  "B", 31.27, 121.52, 7.0, "全年龄段", "medium", 6,  4.0, 4.1, "上海", "杨浦区控江路1665号",           "021-25078999"));
        list.add(new Hospital(10L, "上海市残疾人康复中心",            "D", 31.23, 121.47, 7.5, "全年龄段", "high",   2,  4.0, 4.2, "上海", "浦东新区临沂北路265号",        "021-58733212"));

        // ====== 天津 (3家) ======
        list.add(new Hospital(11L, "天津市安定医院",                  "A", 39.10, 117.19, 8.8, "全年龄段", "all",    6,  4.5, 4.4, "天津", "河西区柳林路13号",             "022-88188888"));
        list.add(new Hospital(12L, "天津医科大学总医院",              "B", 39.11, 117.19, 7.2, "3-5岁",    "low",    9,  4.0, 4.0, "天津", "和平区鞍山道154号",            "022-60362222"));
        list.add(new Hospital(13L, "天津市儿童医院",                  "B", 39.13, 117.20, 6.8, "0-2岁",    "medium", 7,  3.9, 3.9, "天津", "河西区马场道225号",            "022-23519191"));

        // ====== 南京 (1家) ======
        list.add(new Hospital(14L, "南京脑科医院",                    "A", 32.05, 118.78, 9.0, "全年龄段", "high",   9,  4.5, 4.5, "南京", "鼓楼区广州路264号",            "025-82296000"));

        // ====== 杭州 (1家) ======
        list.add(new Hospital(15L, "浙江大学医学院附属儿童医院",      "A", 30.28, 120.16, 9.4, "0-2岁",    "high",   11, 4.7, 4.6, "杭州", "滨江区滨盛路3333号",           "0571-86670000"));

        // ====== 广州 (2家) ======
        list.add(new Hospital(16L, "广州市妇女儿童医疗中心",          "A", 23.12, 113.27, 9.1, "0-2岁",    "all",    10, 4.6, 4.5, "广州", "天河区金穗路9号",              "020-81886332"));
        list.add(new Hospital(17L, "广州市残疾人康复中心",            "D", 23.13, 113.26, 7.0, "3-5岁",    "high",   2,  3.8, 4.0, "广州", "天河区龙口西路375号",          "020-38492436"));

        // ====== 成都 (2家) ======
        list.add(new Hospital(18L, "四川大学华西医院",                "A", 30.64, 104.06, 9.7, "全年龄段", "all",    15, 4.8, 4.7, "成都", "武侯区国学巷37号",             "028-85422114"));
        list.add(new Hospital(19L, "成都市第四人民医院",              "B", 30.66, 104.04, 6.5, "3-5岁",    "medium", 4,  3.7, 3.8, "成都", "金牛区互利西一巷8号",          "028-87528604"));

        // ====== 武汉 (1家) ======
        list.add(new Hospital(20L, "武汉市精神卫生中心",              "B", 30.59, 114.31, 7.0, "全年龄段", "low",    5,  4.0, 4.0, "武汉", "江岸区工农兵路125号",          "027-85836666"));

        return list;
    }

    private String str(Object val) {
        return val == null ? "" : val.toString();
    }

    private Long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (NumberFormatException e) { return 0L; }
    }
}
