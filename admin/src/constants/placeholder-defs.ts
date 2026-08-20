/**
 * 占位符注册表（admin 端）：
 * 手动标记按钮组、内容感知识别、画布预览值均由此驱动。
 * 新增占位符 = 在此追加一行（key/label/icon/group/placeholder/preview/contentDetect），
 * 其余逻辑零改动。
 */

export interface PlaceholderDef {
  /** 字段 key，token 形如 {key} */
  key: string
  label: string
  icon: string
  group: 'cn' | 'kz'
  /** 表单输入提示 */
  placeholder: string
  /** admin 画布预览值（未回填时展示的示例） */
  preview: string
  /** 内容感知：选区文本命中正则时自动回填 defaults */
  contentDetect?: RegExp
}

export const PLACEHOLDER_DEFS: PlaceholderDef[] = [
  // ===== 中文 =====
  { key: 'inviter', label: '邀请者', icon: '👤', group: 'cn', placeholder: '请输入邀请者姓名', preview: '王大明' },
  { key: 'invitee', label: '受邀者', icon: '👥', group: 'cn', placeholder: '请输入受邀者姓名', preview: '李小红' },
  { key: 'date', label: '日期', icon: '📅', group: 'cn', placeholder: '2026年10月1日', preview: '2026年10月1日', contentDetect: /(\d{4})[年\-/.]([01]?\d)[月\-/.]([012]?\d|3[01])/ },
  { key: 'time', label: '时间', icon: '⏰', group: 'cn', placeholder: '18:00', preview: '18:00', contentDetect: /([01]?\d|2[0-3]):([0-5]\d)/ },
  { key: 'location', label: '地点', icon: '📍', group: 'cn', placeholder: '点击填写地点', preview: '如意大酒店' },
  { key: 'address', label: '详细地址', icon: '🏠', group: 'cn', placeholder: 'xx酒店xx厅', preview: '迎宾路88号三层' },
  { key: 'phone', label: '联系电话', icon: '📞', group: 'cn', placeholder: '138xxxxxxxx', preview: '13800000000', contentDetect: /1\d{10}/ },
  { key: 'year', label: '年份', icon: '📅', group: 'cn', placeholder: '2025', preview: '2026', contentDetect: /(?:19|20)\d{2}/ },
  { key: 'month', label: '月份', icon: '📅', group: 'cn', placeholder: '6', preview: '10', contentDetect: /^(0?[1-9]|1[0-2])$/ },
  { key: 'day', label: '日', icon: '📅', group: 'cn', placeholder: '15', preview: '1', contentDetect: /^(0?[1-9]|[12]\d|3[01])$/ },
  { key: 'personName', label: '人名', icon: '👤', group: 'cn', placeholder: '请输入人名', preview: '张伟' },
  // ===== 哈萨克语（阿拉伯文）=====
  // kzDate：选日期后自动填入哈语表达式，支持 "2026 جىلعى 1 ايدىڭ 22 كۇنى" 与 "2026-جىلى 10-ايدىڭ 01-كۇنى" 两种形态
  { key: 'kzDate', label: '哈语日期', icon: '📆', group: 'kz', placeholder: '2026 جىلعى 1 ايدىڭ 22 كۇنى', preview: '2026 جىلعى 1 ايدىڭ 22 كۇنى', contentDetect: /(\d{4})[- ](جىلعى|جىلى)[- ](\d{1,2})([- ]ايدىڭ[- ])(\d{1,2})([- ]كۇنى)/ },
  { key: 'kzWeekday', label: '哈语星期', icon: '📆', group: 'kz', placeholder: 'سەيسەنبى', preview: 'سەيسەنبى', contentDetect: /^(جەكسەنبى|دۇيسەنبى|سەيسەنبى|سارسەنبى|بەيسەنبى|جۇما|سەنبى)$/ },
  { key: 'kzWeekdayParen', label: '哈语星期(括号)', icon: '📆', group: 'kz', placeholder: '(سەيسەنبى)', preview: '(سەيسەنبى)', contentDetect: /^\(?(جەكسەنبى|دۇيسەنبى|سەيسەنبى|سارسەنبى|بەيسەنبى|جۇما|سەنبى)\)?$/ },
  { key: 'kzTime', label: '哈语时间段', icon: '⏰', group: 'kz', placeholder: 'تۇستەن كەيىن', preview: 'تۇستەن كەيىن', contentDetect: /^(تاڭە|تۇستە|تۇستەن كەيىن|كەشتە|تۇندە)$/ },
  { key: 'kzGroomName', label: '哈语新郎名', icon: '👨', group: 'kz', placeholder: 'نۇرلان', preview: 'نۇرلان' },
  { key: 'kzBrideName', label: '哈语新娘名', icon: '👩', group: 'kz', placeholder: 'اينۇر', preview: 'اينۇر' },
  { key: 'kzAddress', label: '哈语地址', icon: '🏠', group: 'kz', placeholder: 'قىزىلوردا قالاسى, توي سارايى', preview: 'قىزىلوردا قالاسى, توي سارايى' },
]
