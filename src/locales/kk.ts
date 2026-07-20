import { defineLocale } from './index'

defineLocale('kk', {
  // ============ 九宫格分类副标题（已有，保留） ============
  'cat.wedding': 'توي تاماش',
  'cat.engagement': 'قۇدا تۇسۋ',
  'cat.creative': 'اقلداسۋ شايى',
  'cat.birthday': 'سۇننەت توي',
  'cat.poster': 'سرعا توي',
  'cat.baby': 'تۇساۋ كەسەر',
  'cat.study': 'وقۋ توي',
  'cat.festival-invitation': 'مەرەكەلىك شاقىرىۋ',
  'cat.house': 'قونىس اۋدارىۋ ',

  // ============ 首页双栏入口 ============
  'home.mall_title': 'توي دۇكەنى', // 婚礼商城
  'home.mall_desc': 'تاڭدامالى زاتتار', // 精选好物
  'home.vip_title': 'VIP مۇشەلىگى', // 开通VIP
  'home.vip_desc': 'بەكەر قولدانۋ', // 全站免费

  // ============ 首页通用按钮 ============
  'home.cta_make': 'دەرەۋ جاساۋ', // 立即制作
  'home.more': 'تولىراق كورۋ', // 查看更多
  'home.view_all': 'بارلىعىن كورۋ', // 查看全部

  // ============ 首页 section 标题 ============
  'home.section_featured': 'تاڭدامالى ۇلگىلەر', // 精选模板
  'home.section_paid': 'ٴجيى ساتىلاتىن اقىلى ۇلگىلەر', // 热门付费模板
  'home.section_poster': 'پلاكات ۇلگىلەرى', // 海报模板
  'home.section_all': 'بارلىق ساناتتار', // 全部分类

  // ============ 首页搜索 ============
  'home.search_placeholder': 'ۇلگى اتتەرىن/ساناتتارىن ىزدەۋ', // 搜索模板名称/分类

  // ============ 首页分类模板数后缀 ============
  'home.count_suffix': 'ۇلگى', // 个模板

  // ============ 首页 VIP 弹窗 ============
  'home.vip_modal_confirm': 'VIP اشۋعا بارۋ', // 去开通VIP
  'home.vip_modal_cancel': 'جابۋ', // 关闭

  // ============ 首页 tabs ============
  'tab.hot': 'ٴجيى قولدانىلعان', // 网红爆款
  'tab.new_wedding': 'جاڭا توي', // 新婚
  'tab.festival': 'مەرەكە شاقىرىۋ', // 节日邀请
  'tab.free': 'شەكسىز تەگىن', // 限时免费

  // ============ 首页特色卡片 ============
  'feature.electronic_invite_badge': 'ەلەكتروندى شاقىرىۋ', // 电子请帖
  'feature.wedding_invite_title': 'توي شاقىرىۋى، تەگىن جاساۋ', // 婚礼请柬 免费制作
  'feature.wedding_invite_desc': 'ٴبىر باسىپ جاساۋ', // 精美模板一键生成
  'feature.festival_invite_badge': 'مەرەكە شاقىرىۋ', // 节日邀请
  'feature.festival_invite_title': 'مەرەكە شاقىرىۋىن جاساۋ', // 节日请柬制作
  'feature.festival_invite_desc': 'كوركەم ساتتەردى ٴبولىسۋ', // 分享美好时光

  // ============ 日期 ============
  'date.week_sun': 'جەكسەنبى', // 周日
  'date.week_mon': 'دۇيسەنبى', // 周一
  'date.week_tue': 'سەيسەنبى', // 周二
  'date.week_wed': 'سارسەنبى', // 周三
  'date.week_thu': 'بەيسەنبى', // 周四
  'date.week_fri': 'جۇما', // 周五
  'date.week_sat': 'سەنبى', // 周六
  'date.month_suffix': 'اي', // 月
  'date.day_suffix': 'كۇن', // 日

  // ============ 模板页通用 ============
  'tpl.header_title': 'ۇلگى الاڭى', // 模板广场
  'tpl.loading': 'جۇكتەلۋدە...', // 加载中...
  'tpl.error': 'جۇكتەۋ ساتسىز، قايتالاڭىز', // 加载失败，点击重试
  'tpl.empty': 'بۇل ساناتتا ۇلگى جوق', // 该分类暂无模板
  'tpl.select_btn': 'دەرەۋ جاساۋ', // 立即制作
  'tpl.bottom_hint': '— كوبىرەك ۇلگىلەر جاڭارتىلۋدا —', // — 更多模板持续更新中 —

  // ============ 作品页 ============
  'works.not_logged_in_text': 'كىرگەننەن كەيىن عانا جۇمىستارىڭىزدى كورە الاسىز', // 登录后才可以看到作品记录哦
  'works.login_btn': 'دەرەۋ كىرۋ', // 立即登录
  'works.empty_all': 'جۇمىس جوق', // 暂无作品
  'works.make_btn': 'جاساۋعا بارۋ', // 去制作
  'works.empty_draft': 'قارنامالار جوق', // 暂无草稿
  'works.empty_favorite': 'جاقتاندار جوق', // 暂无收藏

  // ============ VIP 会员页 ============
  'vip.title': 'VIP مۇشەلىگى', // VIP 会员
  'vip.benefit_all_templates': 'بارلىق ۇلگىلەر اشىق', // 全模板解锁
  'vip.benefit_all_templates_desc': '500+ كوركەم ۇلگى تەگىن', // 500+ 精美模板免费
  'vip.benefit_hd': 'جوعارى انىقتىقتاعى سۋ بەلگىسىز', // 高清无水印
  'vip.benefit_hd_desc': '1440px انىقتىقتا ەكسپورت', // 1440px 高清导出
  'vip.benefit_music': 'ارنايى مۋزىكا قويماسى', // 专属音乐库
  'vip.benefit_music_desc': 'بارلىق مۋزىكا تەگىن قولدانۋ', // 全部音乐免费使用
  'vip.benefit_mall': 'دۇكەن 10% جەڭىلدىك', // 商城9折
  'vip.benefit_mall_desc': 'توي بۇيىمدارىنا جالپى جەڭىلدىك', // 婚礼用品全场折扣
  'vip.benefit_service': 'ارنايى قىزمەت', // 专属客服
  'vip.benefit_service_desc': 'الدين جاۋاپ بەرىپ تەز شەشۋ', // 优先响应快速解决
  'vip.benefit_ad_free': 'جارناما جوق', // 去广告
  'vip.benefit_ad_free_desc': 'تازا قولدانۋ ورتاسى', // 纯净使用体验
  'vip.plan_monthly': 'ايلىق كارتا', // 月卡
  'vip.plan_quarterly': 'توقساندىق كارتا', // 季卡
  'vip.plan_yearly': 'جىلدىق كارتا', // 年卡
  'vip.plan_yearly_best': 'ەڭ ٴتيىمدى', // 最划算
  'vip.compare_title': 'ەرەكشەلىك سالىستىرۋ', // 权益对比
  'vip.compare_templates': 'ۇلگى سانى', // 模板数量
  'vip.compare_export_quality': 'ەكسپورت ساپاسى', // 导出质量
  'vip.compare_export_format': 'ەكسپورت فورماتى', // 导出格式
  'vip.compare_free': 'تەگىن نۇسقا', // 免费版
  'vip.compare_vip': 'VIP نۇسقا', // VIP 版
  'vip.btn_pay': 'تولەۋ جاساۋ', // 立即支付
  'vip.btn_paying': 'ٴجىرىپ جاتىر...', // 支付中...
  'vip.already_vip': 'سىز VIP مۇشەسىسىز', // 您已是VIP会员
  'vip.pay_success': 'اشۋ ٴساتتى بولدى', // 开通成功
  'vip.agreement_title': 'VIP قىزمەت كەلىسىمى', // VIP服务协议
  'vip.modal_confirm_pay': 'تولەۋدى راستاڭىز', // 确认支付
  'vip.modal_pay_amount': '¥${amount} تولەۋدى راستاڭىز با؟', // 确认支付 ¥{amount}？

  // ============ 支付相关 ============
  'pay.creating_order': 'تاپسىرىس جاسالۋدا...', // 创建订单中...
  'pay.processing': 'تولەۋ ٴجىرىپ جاتىر...', // 支付处理中...
  'pay.verifying': 'تەكسەرىلۋدە...', // 验证中...
  'pay.success': 'تولەۋ ٴساتتى بولدى', // 支付成功
  'pay.cancelled': 'تولەۋ كۇشىنەن قالدىرىلدى', // 支付已取消
  'pay.failed': 'تولەۋ ساتسىز بولدى، قايتا سىناڭىز', // 支付失败，请稍后重试
  'pay.order_create_failed': 'تاپسىرىس جاسالۋى ساتسىز', // 创建订单失败
  'pay.service_unavailable': 'تولەۋ قىزمەتى ۋاقىتشا قولدانبايدى', // 支付服务暂不可用
  'pay.test_mode_hint': 'بۇل سىناۋ ورتاسى، شىن ۋىشات تولەۋ قولدانىلمايدى', // 当前为测试环境，无真实微信支付

  // ============ 协议页 ============
  'agreement.title': 'قاتىناسقۇشى كەلىسىمى', // 用户协议
  'agreement.tab_user': 'قاتىناسقۇشى كەلىسىمى', // 用户协议
  'agreement.tab_privacy': 'جاساندىلىق كەلىسىمى', // 隐私协议
  'agreement.entity_title': 'باسقارۋ نەگىزگى تۇلعاسى', // 运营主体信息
  'agreement.entity_company': 'باسقارۋ سەرىكتەستىگى:', // 运营公司
  'agreement.entity_code': 'ٴبىرتۇتاس قوعامدىق نانىم كودى:', // 统一社会信用代码
  'agreement.entity_icp': 'ICP تىزىمدەۋ ٴنومىرى:', // ICP 备案号
  'agreement.entity_phone': 'قىزمەت تەلەفونى:', // 客服电话
  'agreement.entity_email': 'بايلانىس پوشتاسى:', // 联系邮箱
  'agreement.entity_address': 'جۇمىس ورنى:', // 办公地址
  'agreement.effective_date': 'كۇشكە ەنگەن كۇنى:', // 生效日期

  // ============ 设置页 ============
  'settings.title': 'تەڭشەۋ', // 设置
  'settings.about': 'ٴبىز تۋرالى', // 关于我们
  'settings.agreement': 'قاتىناسقۇشى كەلىسىمى', // 用户协议
  'settings.privacy': 'جاساندىلىق كەلىسىمى', // 隐私协议
  'settings.clear_cache': 'جاڭعىرتۋ', // 清除缓存
  'settings.logout': 'شىعۋ', // 退出登录
  'settings.cache_cleared': 'جاڭعىرتىلدى', // 缓存已清除
  'settings.logout_confirm': 'شىعۋدى راستاڭىز با؟', // 确定要退出登录吗？
  'settings.version': 'نۇسقا', // 版本

  // ============ 客服与反馈 ============
  'cs.title': 'قىزمەتكە بايلانىس', // 联系客服
  'cs.phone_label': 'قىزمەت تەلەفونى:', // 客服电话
  'cs.working_hours': 'جۇمىس ۋاقىتى: دۇيسەنبى-بەيسەنبى 9:00-18:00', // 工作时间：周一至周五 9:00-18:00
  'cs.go_feedback': 'قايىرىم جىبەرۋگە بارۋ', // 去反馈
  'feedback.title': 'قايىرىم مالىمەت', // 意见反馈
  'feedback.placeholder': 'ٴسىزدىڭ پىكىرلەرىڭىز بەن ۇسىنىستارىڭىزدى جازىڭىز...', // 请输入您的意见和建议...
  'feedback.contact_placeholder': 'تەلەفون نەمەسە پوشتا (مىندەتتى ەمەس)', // 手机号或邮箱（选填）
  'feedback.submit': 'جىبەرۋ', // 提交
  'feedback.submitting': 'جىبەرىلۋدە...', // 提交中...
  'feedback.success': 'ٴساتتى جىبەرىلدى', // 提交成功

  // ============ 订单页 ============
  'order.title': 'تاپسىرىستارىم', // 我的订单
  'order.tab_all': 'بارلىعى', // 全部
  'order.tab_pending': 'تولەمى كۇتەر', // 待付款
  'order.tab_paid': 'تولەنگەن', // 已付款
  'order.tab_shipped': 'جىبەرىلگەن', // 已发货
  'order.tab_completed': 'اياقتالعان', // 已完成
  'order.empty': 'تاپسىرىس جوق', // 暂无订单
  'order.btn_pay': 'تولەۋ', // 支付
  'order.btn_detail': 'تەڭشەۋلەردى كورۋ', // 查看详情
  'order.amount': 'سوماسى:', // 金额
  'order.status_pending': 'تولەمى كۇتەر', // 待付款
  'order.status_paid': 'تولەنگەن', // 已付款
  'order.status_shipped': 'جىبەرىلگەن', // 已发货
  'order.status_completed': 'اياقتالعان', // 已完成
  'order.status_cancelled': 'كۇشىنەن قالدىرىلعان', // 已取消

  // ============ 商城 ============
  'mall.title': 'توي دۇكەنى', // 婚礼商城
  'mall.cart_empty': 'ساتىپ الۋ سەبەتى بوس', // 购物车是空的
  'mall.go_shopping': 'ساۋدا قىلۋعا بارۋ', // 去逛逛
  'mall.add_cart': 'سەبەتكە قوسۋ', // 加入购物车
  'mall.buy_now': 'دەرەۋ ساتىپ الۋ', // 立即购买
  'mall.total': 'جالپى سوماسى', // 总计
  'mall.checkout': 'ەسەپ جابۋ', // 结算
  'mall.confirm_order': 'تاپسىرىستى راستاڭىز', // 确认订单
  'mall.contact_name': 'الۋشى ات-تەگى', // 收货人
  'mall.contact_phone': 'تەلەفون', // 手机号
  'mall.address': 'جايدار', // 收货地址
  'mall.note': 'ەسكەرتۋ', // 备注
  'mall.submit_order': 'تاپسىرىس جاساۋ', // 提交订单
  'mall.order_success': 'تاپسىرىس جاسالدى', // 下单成功
})
