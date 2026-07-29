/**
 * 儿童月龄计算工具 — 与后端 com.xingyu.autism.util.ChildAgeUtils 保持算法一致。
 *
 * 实际月龄严格对齐"当月日期 >= 出生日期"边界校验，完美解决跨月/跨年问题。
 * 早产矫正使用 Math.round(prematureWeeks / 4) 精确四舍五入，满24月龄不再矫正。
 */

const FULL_TERM_WEEKS = 40;
const NO_ADJUSTMENT_THRESHOLD = 24;

/**
 * 计算截至今天的实际月龄。
 * @param {string} birthDateStr - 出生日期字符串（如 "2025-01-31"）
 * @returns {number} 整数月龄
 */
function getActualAgeMonths(birthDateStr) {
  if (!birthDateStr) throw new Error('出生日期不能为空');
  const birth = new Date(birthDateStr);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  // 关键边界校验：当月日期 < 出生日期 → 未满月，减1
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  return months;
}

/**
 * 计算截至指定参考日期的实际月龄（用于历史筛查记录导出等场景）。
 * @param {string} birthDateStr - 出生日期字符串
 * @param {string} referenceDateStr - 参考日期字符串
 * @returns {number} 整数月龄
 */
function getActualAgeMonthsAt(birthDateStr, referenceDateStr) {
  if (!birthDateStr) throw new Error('出生日期不能为空');
  if (!referenceDateStr) throw new Error('参考日期不能为空');
  const birth = new Date(birthDateStr);
  const ref = new Date(referenceDateStr);
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + ref.getMonth() - birth.getMonth();
  if (ref.getDate() < birth.getDate()) {
    months--;
  }
  return months;
}

/**
 * 计算矫正月龄（与后端 ChildAgeUtils#getAdjustedAgeMonths 算法一致）。
 *
 * @param {number} actualAgeMonths - 实际月龄
 * @param {number} birthGestationalWeeks - 出生孕周（如 37 表示孕37周出生；40 或 0 视为足月）
 * @returns {number} 矫正后的月龄
 *
 * @example
 * getAdjustedAgeMonths(5, 37)  // 早产 3 周，扣减 3/4≈0.75→1，返回 4
 * getAdjustedAgeMonths(5, 36)  // 早产 4 周，扣减 4/4=1，返回 4
 * getAdjustedAgeMonths(5, 35)  // 早产 5 周，扣减 5/4=1.25→1，返回 4
 * getAdjustedAgeMonths(30, 32) // 满 24 月龄，不矫正，返回 30
 * getAdjustedAgeMonths(1, 28)  // 早产 12 周，扣减 12/4=3，max(0,1-3)=0
 */
function getAdjustedAgeMonths(actualAgeMonths, birthGestationalWeeks) {
  if (birthGestationalWeeks >= FULL_TERM_WEEKS || birthGestationalWeeks <= 0) {
    return actualAgeMonths;
  }
  if (actualAgeMonths >= NO_ADJUSTMENT_THRESHOLD) {
    return actualAgeMonths;
  }
  const prematureWeeks = FULL_TERM_WEEKS - birthGestationalWeeks;
  if (prematureWeeks <= 0) {
    return actualAgeMonths;
  }
  const subtractMonths = Math.round(prematureWeeks / 4);
  return Math.max(0, actualAgeMonths - subtractMonths);
}

/**
 * 将整数月龄转为中文展示文本。
 * @param {number} m - 月龄
 * @returns {string} 如 "5个月"、"1岁3个月"、"3岁"
 */
function monthsToAgeText(m) {
  if (m < 12) return m + '个月';
  const y = Math.floor(m / 12);
  const rm = m % 12;
  return rm > 0 ? y + '岁' + rm + '个月' : y + '岁';
}

module.exports = {
  getActualAgeMonths,
  getActualAgeMonthsAt,
  getAdjustedAgeMonths,
  monthsToAgeText
};
