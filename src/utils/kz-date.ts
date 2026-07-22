/**
 * 哈萨克语（阿拉伯文字母）日期转换工具
 *
 * 哈萨克语用阿拉伯字母书写（RTL），数字用西方数字但置于 RTL 文本中。
 * 月份和星期用哈萨克语单词表达。
 */

// 哈萨克语月份名（阿拉伯字母）
const KZ_MONTHS = [
  'قىڭعىراي',     // 1月
  'ااقپان',       // 2月
  'ناۋرىز',       // 3月
  'ساۋىر',        // 4月
  'مامىر',        // 5月
  'ماءسىم',       // 6月
  'شىلدە',        // 7月
  'تامىز',        // 8月
  'قىر كۇەك',     // 9月
  'قىازان',       // 10月
  'قىاراشا',      // 11月
  'جەلتوقسان',    // 12月
]

// 哈萨克语星期（阿拉伯字母）— 0=周日
const KZ_WEEKDAYS = [
  'جەكسەنبى',     // 周日
  'دۇيسەنبى',     // 周一
  'سەيسەنبى',     // 周二
  'سارسەنبى',     // 周三
  'بەيسەنبى',     // 周四
  'جۇما',         // 周五
  'سەنبى',        // 周六
]

// 哈萨克语时间段
const KZ_TIME_PERIODS: Record<string, string> = {
  morning: 'تاڭە',       // 上午
  noon: 'تۇستە',         // 中午
  afternoon: 'تۇستەن كەيىن', // 下午
  evening: 'كەشتە',      // 傍晚
  night: 'تۇندە',        // 晚上
}

export interface KzDateParts {
  year: string    // 如 "٢٠٢٥" 或 "2025"
  month: string   // 哈萨克语月名
  day: string     // 如 "١٥" 或 "15"
  weekday: string // 哈萨克语星期
  fullDate: string // 组合后的完整哈语日期
  time?: string   // 时间段
}

/**
 * 将日期字符串/Date对象转为哈萨克语阿拉伯文日期各部分
 */
export function toKazakhDate(date: string | Date): KzDateParts {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    return { year: '', month: '', day: '', weekday: '', fullDate: '' }
  }

  const year = String(d.getFullYear())
  const monthIdx = d.getMonth()
  const day = String(d.getDate())
  const weekdayIdx = d.getDay()

  const kzMonth = KZ_MONTHS[monthIdx] || ''
  const kzWeekday = KZ_WEEKDAYS[weekdayIdx] || ''

  // 完整日期格式：توي كۇنى: 15 مامىر 2025 جىل / جەكسەنبى
  const fullDate = `توي كۇنى: ${day} ${kzMonth} ${year} جىل / ${kzWeekday}`

  return {
    year,
    month: kzMonth,
    day,
    weekday: kzWeekday,
    fullDate,
  }
}

/**
 * 根据日期 + 时间段生成完整哈萨克语日期时间
 */
export function toKazakhDateTime(date: string | Date, timePeriod?: string): KzDateParts & { fullDateTime: string } {
  const parts = toKazakhDate(date)
  const kzTime = timePeriod ? (KZ_TIME_PERIODS[timePeriod] || '') : ''
  const fullDateTime = kzTime
    ? `${parts.fullDate} — ${kzTime}`
    : parts.fullDate

  return { ...parts, fullDateTime }
}

/**
 * 获取时间段选项列表（供 UI 选择器使用）
 */
export function getTimePeriodOptions() {
  return [
    { value: 'morning', label: '上午', kzLabel: KZ_TIME_PERIODS.morning },
    { value: 'noon', label: '中午', kzLabel: KZ_TIME_PERIODS.noon },
    { value: 'afternoon', label: '下午', kzLabel: KZ_TIME_PERIODS.afternoon },
    { value: 'evening', label: '傍晚', kzLabel: KZ_TIME_PERIODS.evening },
    { value: 'night', label: '晚上', kzLabel: KZ_TIME_PERIODS.night },
  ]
}
