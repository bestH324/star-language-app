package com.xingyu.autism.util;

/**
 * 儿童月龄计算工具
 * <p>
 * 早产儿矫正月龄公式：矫正月龄 = 实际月龄 - 早产周数 / 4
 * 满 24 个实际月龄后不再矫正。
 * </p>
 */
public final class ChildAgeUtils {

    private ChildAgeUtils() {}

    /**
     * 计算矫正月龄（用于量表匹配、复测提醒等场景）
     *
     * @param actualMonths   实际月龄（Period.between(出生, 今天).toTotalMonths()）
     * @param prematureWeeks 早产周数，0 表示非早产
     * @return 矫正后的月龄；非早产或满 24 月龄则返回实际月龄
     */
    public static long getCorrectedMonths(long actualMonths, int prematureWeeks) {
        // 非早产或满 24 月龄 → 不再矫正
        if (prematureWeeks <= 0 || actualMonths >= 24) {
            return actualMonths;
        }
        // 精确浮点除法：避免 prematureWeeks/4 整数截断（如 3/4=0 导致完全未矫正）
        long corrected = Math.round(actualMonths - prematureWeeks / 4.0);
        return Math.max(0, corrected);
    }
}
