package com.xingyu.autism.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

/**
 * 儿童月龄计算工具。
 *
 * <p>实际月龄基于 {@link Period#between} 严格对齐"当月日期 &ge; 出生日期"的满月逻辑，
 * 完美解决跨月/跨年边界问题（如 1月31日出生，2月1日月龄为 0）。</p>
 *
 * <p>早产儿矫正月龄 = 实际月龄 &minus; (40 &minus; 出生孕周) / 4.0，
 * 使用 {@link BigDecimal} + {@link RoundingMode#HALF_UP} 精确四舍五入，严禁整数截断。
 * 满 24 个实际月龄后不再矫正。</p>
 */
public final class ChildAgeUtils {

    /** 标准足月孕周 */
    private static final int FULL_TERM_WEEKS = 40;

    /** 满此月龄不再进行早产矫正 */
    private static final int NO_ADJUSTMENT_THRESHOLD = 24;

    private ChildAgeUtils() {}

    // ==================== 实际月龄 ====================

    /**
     * 计算截止到今天的实际月龄。
     *
     * @param birthDate 出生日期（不能为 null）
     * @return 整数月龄
     * @throws IllegalArgumentException 如果 birthDate 为 null
     */
    public static int getActualAgeMonths(LocalDate birthDate) {
        return getActualAgeMonths(birthDate, LocalDate.now());
    }

    /**
     * 计算截止到指定参考日期的实际月龄。
     *
     * <p>如新生儿 1 月 31 日出生，2 月 1 日时 Period 为 0 个完整月 —— 未满月，正确。</p>
     *
     * @param birthDate    出生日期（不能为 null）
     * @param referenceDate 参考日期（不能为 null，可以是筛查时间等）
     * @return 整数月龄
     * @throws IllegalArgumentException 如果任一日期为 null
     */
    public static int getActualAgeMonths(LocalDate birthDate, LocalDate referenceDate) {
        if (birthDate == null) {
            throw new IllegalArgumentException("出生日期不能为空");
        }
        if (referenceDate == null) {
            throw new IllegalArgumentException("参考日期不能为空");
        }
        return (int) Period.between(birthDate, referenceDate).toTotalMonths();
    }

    // ==================== 矫正月龄 ====================

    /**
     * 计算矫正月龄（用于早产儿量表匹配、复测提醒等场景）。
     *
     * <h3>矫正逻辑</h3>
     * <ol>
     *   <li>出生孕周 &ge; 40 或无有效孕周 → 返回实际月龄（非早产）。</li>
     *   <li>实际月龄 &ge; 24 → 不再矫正，直接返回实际月龄。</li>
     *   <li>早产周数 = 40 &minus; 出生孕周，扣减月数 = 早产周数 / 4.0。</li>
     *   <li>使用 {@link BigDecimal} + {@link RoundingMode#HALF_UP} 精确四舍五入。</li>
     *   <li>{@code Math.max(0, result)} 防止负月龄。</li>
     * </ol>
     *
     * @param actualAgeMonths       实际月龄（通过 {@link #getActualAgeMonths(LocalDate)} 获取）
     * @param birthGestationalWeeks 出生孕周（如 37 表示孕 37 周出生；40 或 0 视为足月）
     * @return 矫正后的月龄
     */
    public static int getAdjustedAgeMonths(int actualAgeMonths, int birthGestationalWeeks) {
        // 足月或无效孕周 → 不矫正
        if (birthGestationalWeeks >= FULL_TERM_WEEKS || birthGestationalWeeks <= 0) {
            return actualAgeMonths;
        }
        // 满 24 月龄 → 不再矫正
        if (actualAgeMonths >= NO_ADJUSTMENT_THRESHOLD) {
            return actualAgeMonths;
        }
        int prematureWeeks = FULL_TERM_WEEKS - birthGestationalWeeks;
        if (prematureWeeks <= 0) {
            return actualAgeMonths;
        }
        // BigDecimal 精确四舍五入：prematureWeeks / 4.0 → 整数
        int subtractMonths = BigDecimal.valueOf(prematureWeeks)
                .divide(BigDecimal.valueOf(4), 0, RoundingMode.HALF_UP)
                .intValue();
        return Math.max(0, actualAgeMonths - subtractMonths);
    }

    // ==================== 自测 ====================

    public static void main(String[] args) {
        // ---- getAdjustedAgeMonths 自测 ----
        System.out.println("=== 早产矫正月龄自测 ===");

        // 早产 3 周 (孕37周)：3/4 = 0.75 → 四舍五入扣 1 个月
        int r3 = getAdjustedAgeMonths(5, 37);
        System.out.printf("孕37周(早产3周) 实际5月 → 矫正%d月 (预期4)%n", r3);

        // 早产 4 周 (孕36周)：4/4 = 1.0 → 扣 1 个月
        int r4 = getAdjustedAgeMonths(5, 36);
        System.out.printf("孕36周(早产4周) 实际5月 → 矫正%d月 (预期4)%n", r4);

        // 早产 5 周 (孕35周)：5/4 = 1.25 → 四舍五入扣 1 个月
        int r5 = getAdjustedAgeMonths(5, 35);
        System.out.printf("孕35周(早产5周) 实际5月 → 矫正%d月 (预期4)%n", r5);

        // 早产 2 周 (孕38周)：2/4 = 0.5 → 四舍五入扣 1 个月
        int r2 = getAdjustedAgeMonths(5, 38);
        System.out.printf("孕38周(早产2周) 实际5月 → 矫正%d月 (预期4)%n", r2);

        // 早产 1 周 (孕39周)：1/4 = 0.25 → 四舍五入扣 0
        int r1 = getAdjustedAgeMonths(5, 39);
        System.out.printf("孕39周(早产1周) 实际5月 → 矫正%d月 (预期5)%n", r1);

        // 满 24 月龄不矫正
        int r24 = getAdjustedAgeMonths(30, 32);
        System.out.printf("孕32周(早产8周) 实际30月 → 矫正%d月 (预期30, 满24月不再矫正)%n", r24);

        // 防止负月龄
        int rNeg = getAdjustedAgeMonths(1, 28);
        System.out.printf("孕28周(早产12周) 实际1月 → 矫正%d月 (预期0, 防止负月龄)%n", rNeg);

        // 足月不矫正
        int rFull = getAdjustedAgeMonths(5, 40);
        System.out.printf("孕40周(足月) 实际5月 → 矫正%d月 (预期5)%n", rFull);

        // ---- getActualAgeMonths 边界自测 ----
        System.out.println("\n=== 实际月龄边界自测 ===");
        // 1月31出生 → 2月1日是0月（未满月）
        int boundary1 = getActualAgeMonths(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 2, 1));
        System.out.printf("1.31出生→2.1: %d月 (预期0, 未满月)%n", boundary1);

        // 1月15出生 → 2月15日是1月（满月）
        int boundary2 = getActualAgeMonths(LocalDate.of(2026, 1, 15), LocalDate.of(2026, 2, 15));
        System.out.printf("1.15出生→2.15: %d月 (预期1, 满月)%n", boundary2);

        // 1月31出生 → 3月1日应该是1月（2月只有28天，3月1日才算满1月）
        int boundary3 = getActualAgeMonths(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 3, 1));
        System.out.printf("1.31出生→3.1: %d月 (预期1)%n", boundary3);
    }
}
