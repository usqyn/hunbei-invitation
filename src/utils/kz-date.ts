/**
 * 哈萨克语（阿拉伯字母）日期转换工具
 *
 * 哈萨克语用阿拉伯字母书写（RTL），但数字沿用西方数字（0-9），不用阿拉伯-印度数字。
 * 日期表达式（从属格形式）：
 *   中文「2026年 1月 22日」→ 哈萨克语「2026 جىلعى 1 ايدىڭ 22 كۇنى」
 *   жылы(年的...时)→جىلعى  айдың(月的)→ايدىڭ  күні(日)→كۇنى
 */

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
  morning: 'تاڭە',            // 上午
  noon: 'تۇستە',              // 中午
  afternoon: 'تۇستەن كەيىن',  // 下午
  evening: 'كەشتە',           // 傍晚
  night: 'تۇندە',             // 晚上
}

export interface KzDateParts {
  /** 哈语日期表达式，如 "2026 جىل 1 اي 22 كۇن" */
  fullDate: string
  /** 哈语星期名 */
  weekday: string
}

/**
 * 将日期转为哈萨克语日期表达式
 * 中文「2026年 1月 22日」→ 哈萨克语「2026 جىلعى 1 ايدىڭ 22 كۇنى」
 * 数字保留西方数字，仅翻译年/月/日单位（从属格形式）
 */
export function toKazakhDate(date: string | Date): KzDateParts {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    return { fullDate: '', weekday: '' }
  }

  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = KZ_WEEKDAYS[d.getDay()] || ''

  // 2026 جىلعى 1 ايدىڭ 22 كۇنى
  const fullDate = `${year} جىلعى ${month} ايدىڭ ${day} كۇنى`

  return { fullDate, weekday }
}

/**
 * 获取星期选项列表（中文标签供用户滚动选择，选中后取 kz 值写入占位符）
 */
export function getKzWeekdayOptions() {
  return [
    { label: '周一', kz: KZ_WEEKDAYS[1] },
    { label: '周二', kz: KZ_WEEKDAYS[2] },
    { label: '周三', kz: KZ_WEEKDAYS[3] },
    { label: '周四', kz: KZ_WEEKDAYS[4] },
    { label: '周五', kz: KZ_WEEKDAYS[5] },
    { label: '周六', kz: KZ_WEEKDAYS[6] },
    { label: '周日', kz: KZ_WEEKDAYS[0] },
  ]
}

/**
 * 获取时间段选项列表（供 UI 选择器使用）
 */
export function getTimePeriodOptions() {
  return [
    { label: '上午', kz: KZ_TIME_PERIODS.morning },
    { label: '中午', kz: KZ_TIME_PERIODS.noon },
    { label: '下午', kz: KZ_TIME_PERIODS.afternoon },
    { label: '傍晚', kz: KZ_TIME_PERIODS.evening },
    { label: '晚上', kz: KZ_TIME_PERIODS.night },
  ]
}
