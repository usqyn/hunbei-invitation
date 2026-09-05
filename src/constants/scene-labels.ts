/**
 * 编辑表单场景化标签。
 *
 * 模板的 dataKey 是中性语义（inviter/date/location 等），但表单标签需要按
 * 请柬场景显示：婚礼模板显示"新郎姓名/婚礼时间"，升学宴等其他场景显示
 * "邀请人/宴会时间"，避免升学宴里出现"新郎姓名"这类违和文案。
 *
 * 分类来自模板 categoryId（editorStore.currentTemplateCategory），
 * 未收录的分类回退到中性文案 NEUTRAL。
 */
export interface SceneLabels {
  /** 新人/邀请信息 section 标题 */
  basicSection: string
  /** inviter 字段标签（婚礼=新郎姓名，其他=邀请人） */
  inviter: string
  /** invitee 字段标签（婚礼=新娘姓名，其他=受邀人） */
  invitee: string
  inviterPlaceholder: string
  inviteePlaceholder: string
  /** 婚礼/宴会信息 section 标题 */
  infoSection: string
  /** date 字段标签 */
  date: string
  /** location 字段标签 */
  location: string
  /** share 页主宾称呼兜底（inviter/invitee 为空时） */
  groomTitle: string
  brideTitle: string
  /** share 页邀请标题后缀（如"的婚礼邀请"） */
  inviteSuffix: string
}

/** 中性文案：未收录分类的兜底 */
export const NEUTRAL_LABELS: SceneLabels = {
  basicSection: '邀请信息',
  inviter: '邀请人',
  invitee: '受邀人',
  inviterPlaceholder: '请输入邀请人姓名',
  inviteePlaceholder: '请输入受邀人姓名',
  infoSection: '宴会信息',
  date: '宴会时间',
  location: '宴会地点',
  groomTitle: '邀请人',
  brideTitle: '受邀人',
  inviteSuffix: '的邀请',
}

const WEDDING: SceneLabels = {
  basicSection: '新人信息',
  inviter: '新郎姓名',
  invitee: '新娘姓名',
  inviterPlaceholder: '请输入新郎真实姓名',
  inviteePlaceholder: '请输入新娘真实姓名',
  infoSection: '婚礼信息',
  date: '婚礼时间',
  location: '婚礼地点',
  groomTitle: '新郎',
  brideTitle: '新娘',
  inviteSuffix: '的婚礼邀请',
}

export const SCENE_LABELS: Record<string, SceneLabels> = {
  wedding: WEDDING,
  engagement: { ...NEUTRAL_LABELS, date: '仪式时间', location: '仪式地点', infoSection: '仪式信息' },
  /** 商量茶 */
  'consultation-tea': NEUTRAL_LABELS,
  /** 割礼 */
  festival: { ...NEUTRAL_LABELS, date: '仪式时间', location: '仪式地点', infoSection: '仪式信息' },
  /** 耳环礼 */
  business: { ...NEUTRAL_LABELS, date: '典礼时间', location: '典礼地点', infoSection: '典礼信息' },
  baby: { ...NEUTRAL_LABELS, date: '宝宝宴时间' },
  /** 升学宴 */
  graduation: { ...NEUTRAL_LABELS, date: '升学宴时间' },
  'festival-invitation': { ...NEUTRAL_LABELS, date: '活动时间', location: '活动地点', infoSection: '活动信息' },
  /** 乔迁宴 */
  house: NEUTRAL_LABELS,
}

export function getSceneLabels(category?: string | null): SceneLabels {
  if (!category) return NEUTRAL_LABELS
  return SCENE_LABELS[category] ?? NEUTRAL_LABELS
}
