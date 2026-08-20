import { defineLocale } from './index'

defineLocale('zh-CN', {
  // 九宫格分类副标题（对齐真实分类 id）
  'cat.wedding': '婚礼邀请',
  'cat.engagement': '求婚',
  'cat.consultation-tea': '商量茶',
  'cat.festival': '割礼',
  'cat.business': '耳环礼',
  'cat.baby': '周岁宴',
  'cat.graduation': '升学宴',
  'cat.festival-invitation': '节日请柬',
  'cat.house': '乔迁新居',

  // 首页双栏入口
  'home.mall_title': '婚礼商城',
  'home.mall_desc': '精选好物',
  'home.vip_title': '开通VIP',
  'home.vip_desc': '全站免费',

  // 首页通用按钮
  'home.cta_make': '立即制作',
  'home.more': '查看更多',
  'home.view_all': '查看全部',

  // 首页 section 标题
  'home.section_featured': '精选模板',
  'home.section_paid': '热门付费模板',
  'home.section_poster': '海报模板',
  'home.section_all': '全部分类',

  // 首页搜索
  'home.search_placeholder': '搜索模板名称/分类',

  // 首页分类模板数后缀
  'home.count_suffix': '个模板',

  // 首页 VIP 弹窗
  'home.vip_modal_confirm': '去开通VIP',
  'home.vip_modal_cancel': '关闭',

  // 首页 tabs
  'tab.hot': '网红爆款',
  'tab.new_wedding': '新婚',
  'tab.festival': '节日邀请',
  'tab.free': '限时免费',

  // 首页特色卡片
  'feature.electronic_invite_badge': '电子请帖',
  'feature.wedding_invite_title': '婚礼请柬 免费制作',
  'feature.wedding_invite_desc': '精美模板一键生成',
  'feature.festival_invite_badge': '节日邀请',
  'feature.festival_invite_title': '节日请柬制作',
  'feature.festival_invite_desc': '分享美好时光',

  // 日期
  'date.week_sun': '周日',
  'date.week_mon': '周一',
  'date.week_tue': '周二',
  'date.week_wed': '周三',
  'date.week_thu': '周四',
  'date.week_fri': '周五',
  'date.week_sat': '周六',
  'date.month_suffix': '月',
  'date.day_suffix': '日',

  // 模板页通用
  'tpl.header_title': '模板广场',
  'tpl.loading': '加载中...',
  'tpl.error': '加载失败，点击重试',
  'tpl.empty': '该分类暂无模板',
  'tpl.select_btn': '立即制作',
  'tpl.bottom_hint': '— 更多模板持续更新中 —',

  // 作品页
  'works.not_logged_in_text': '登录后才可以看到作品记录哦',
  'works.login_btn': '立即登录',
  'works.empty_all': '暂无作品',
  'works.make_btn': '去制作',
  'works.empty_draft': '暂无草稿',
  'works.empty_favorite': '暂无收藏',

  // VIP 会员页
  'vip.title': 'VIP 会员',
  'vip.benefit_all_templates': '全模板解锁',
  'vip.benefit_all_templates_desc': '500+ 精美模板免费',
  'vip.benefit_hd': '高清无水印',
  'vip.benefit_hd_desc': '1440px 高清导出',
  'vip.benefit_music': '专属音乐库',
  'vip.benefit_music_desc': '全部音乐免费使用',
  'vip.benefit_mall': '商城9折',
  'vip.benefit_mall_desc': '婚礼用品全场折扣',
  'vip.benefit_service': '专属客服',
  'vip.benefit_service_desc': '优先响应快速解决',
  'vip.benefit_ad_free': '去广告',
  'vip.benefit_ad_free_desc': '纯净使用体验',
  'vip.plan_monthly': '月卡',
  'vip.plan_quarterly': '季卡',
  'vip.plan_yearly': '年卡',
  'vip.plan_yearly_best': '最划算',
  'vip.compare_title': '权益对比',
  'vip.compare_templates': '模板数量',
  'vip.compare_export_quality': '导出质量',
  'vip.compare_export_format': '导出格式',
  'vip.compare_free': '免费版',
  'vip.compare_vip': 'VIP 版',
  'vip.btn_pay': '立即支付',
  'vip.btn_paying': '支付中...',
  'vip.already_vip': '您已是VIP会员',
  'vip.pay_success': '开通成功',
  'vip.agreement_title': 'VIP服务协议',
  'vip.modal_confirm_pay': '确认支付',
  'vip.modal_pay_amount': '确认支付 ¥{amount}？',

  // 支付相关
  'pay.creating_order': '创建订单中...',
  'pay.processing': '支付处理中...',
  'pay.verifying': '验证中...',
  'pay.success': '支付成功',
  'pay.cancelled': '支付已取消',
  'pay.failed': '支付失败，请稍后重试',
  'pay.order_create_failed': '创建订单失败',
  'pay.service_unavailable': '支付服务暂不可用',
  'pay.test_mode_hint': '当前为测试环境，无真实微信支付',

  // 协议页
  'agreement.title': '用户协议',
  'agreement.tab_user': '用户协议',
  'agreement.tab_privacy': '隐私协议',
  'agreement.entity_title': '运营主体信息',
  'agreement.entity_company': '运营公司：',
  'agreement.entity_code': '统一社会信用代码：',
  'agreement.entity_icp': 'ICP 备案号：',
  'agreement.entity_phone': '客服电话：',
  'agreement.entity_email': '联系邮箱：',
  'agreement.entity_address': '办公地址：',
  'agreement.effective_date': '生效日期：',

  // 设置页
  'settings.title': '设置',
  'settings.about': '关于我们',
  'settings.agreement': '用户协议',
  'settings.privacy': '隐私协议',
  'settings.clear_cache': '清除缓存',
  'settings.logout': '退出登录',
  'settings.cache_cleared': '缓存已清除',
  'settings.logout_confirm': '确定要退出登录吗？',
  'settings.version': '版本',

  // 客服与反馈
  'cs.title': '联系客服',
  'cs.phone_label': '客服电话：',
  'cs.working_hours': '工作时间：周一至周五 9:00-18:00',
  'cs.go_feedback': '去反馈',
  'feedback.title': '意见反馈',
  'feedback.placeholder': '请输入您的意见和建议...',
  'feedback.contact_placeholder': '手机号或邮箱（选填）',
  'feedback.submit': '提交',
  'feedback.submitting': '提交中...',
  'feedback.success': '提交成功',

  // 订单页
  'order.title': '我的订单',
  'order.tab_all': '全部',
  'order.tab_pending': '待付款',
  'order.tab_paid': '已付款',
  'order.tab_shipped': '已发货',
  'order.tab_completed': '已完成',
  'order.empty': '暂无订单',
  'order.btn_pay': '支付',
  'order.btn_detail': '查看详情',
  'order.amount': '金额',
  'order.status_pending': '待付款',
  'order.status_paid': '已付款',
  'order.status_shipped': '已发货',
  'order.status_completed': '已完成',
  'order.status_cancelled': '已取消',

  // 商城
  'mall.title': '婚礼商城',
  'mall.cart_empty': '购物车是空的',
  'mall.go_shopping': '去逛逛',
  'mall.add_cart': '加入购物车',
  'mall.buy_now': '立即购买',
  'mall.total': '总计',
  'mall.checkout': '结算',
  'mall.confirm_order': '确认订单',
  'mall.contact_name': '收货人',
  'mall.contact_phone': '手机号',
  'mall.address': '收货地址',
  'mall.note': '备注',
  'mall.submit_order': '提交订单',
  'mall.order_success': '下单成功',

  // 分享说明页（限免版第2次使用：分享朋友圈得免费次数）
  'shareGuide.title': '分享到朋友圈',
  'shareGuide.desc': '这是您第 2 次使用本模板，分享到朋友圈即可免费获得 1 次制作机会！',
  'shareGuide.step1': '① 点击下方「分享到朋友圈」，将请柬分享到您的朋友圈',
  'shareGuide.step2': '② 分享完成后，点击「我已分享，继续制作」',
  'shareGuide.btn_share': '分享到朋友圈',
  'shareGuide.btn_done': '我已分享，继续制作',
  'shareGuide.btn_pay': '直接付费制作 ¥6.6',
  'shareGuide.btn_vip': '开通VIP免费制作',
  'shareGuide.sharing': '分享中...',
  'shareGuide.reward_ok': '分享成功，已获得 1 次免费制作机会',
  'shareGuide.reward_fail': '今日已分享过，请直接付费或开通VIP',
  'shareGuide.need_moments': '请先分享到朋友圈，再点击「我已分享」',
})
