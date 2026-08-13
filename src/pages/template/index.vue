<template>
  <view class="page">
    <!-- 顶部标题栏（融合搜索入口） -->
    <view class="header">
      <view class="back-btn" @click="onBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">{{ pageConfig.headerTitle }}</view>
      <view class="header-right">
        <view class="header-icon-btn" @click="openSearch">
          <text class="header-icon-text">🔍</text>
        </view>
      </view>
    </view>

    <!-- 分类栏 + 排序/筛选操作（合并单行） -->
    <view class="filter-row">
      <scroll-view class="category-scroll" scroll-x enable-flex>
        <view class="category-list">
          <view
            v-for="cat in categoryList"
            :key="cat.id"
            class="category-item"
            :class="{ active: activeCategory === cat.id }"
            @click="onSelectCategory(cat.id)"
          >
            <image class="category-icon-image" :src="cat.icon" mode="aspectFit" />
            <text class="category-name">{{ cat.name }}</text>
            <text v-if="cat.count" class="category-count">{{ cat.count }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="filter-actions">
        <view class="action-btn" @click="showSortSheet = true">
          <text class="action-text">{{ getSortLabel(activeSort) }}</text>
          <text class="action-arrow">▾</text>
        </view>
        <view class="action-btn" :class="{ 'action-btn--active': activeFilter !== 'all' }" @click="showFilterSheet = true">
          <text class="action-text">筛选</text>
          <text v-if="activeFilter !== 'all'" class="action-dot">·</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ pageConfig.loadingText }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="loadError && filteredTemplates.length === 0" class="error-state" @click="retryLoad">
      <image class="error-icon-image" :src="pageConfig.errorIcon" mode="aspectFit" />
      <text class="error-text">{{ pageConfig.errorText }}</text>
    </view>

    <!-- 模板列表网格 -->
    <scroll-view v-else class="template-scroll" scroll-y>
      <view v-if="filteredTemplates.length === 0" class="empty-state">
        <image class="empty-icon-image" :src="pageConfig.emptyIcon" mode="aspectFit" />
        <text class="empty-text">{{ pageConfig.emptyText }}</text>
        <view class="empty-btn" @click="resetToAll">
          <text class="empty-btn-text">查看全部模板</text>
        </view>
      </view>

      <view class="template-grid">
        <view
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-card"
          @click="onSelectTemplate(template)"
        >
          <!-- 模板封面图（按真实比例显示） -->
          <view class="cover-wrap" :style="getCoverStyle(template)">
            <CloudImage
              class="template-cover"
              :src="getImageUrl(template)"
              mode="aspectFill"
              :lazy-load="true"
              @error="onImageError($event, template)"
            />
            <!-- 渐变遮罩 - 底部 -->
            <view class="cover-gradient"></view>
            <!-- 右上角价格/VIP标签 -->
            <view class="price-badge">
              <view v-if="template.is_paid && template.is_premium" class="vip-badge">
                <text class="vip-badge-text">VIP</text>
              </view>
              <view v-else-if="template.is_paid" class="price-tag">
                <text class="price-tag-text">¥{{ template.price }}</text>
              </view>
              <view v-else class="free-tag">
                <text class="free-tag-text">免费</text>
              </view>
            </view>
            <!-- 底部信息浮层 -->
            <view class="cover-info">
              <text class="cover-title">{{ template.name }}</text>
              <text v-if="template.subtitle" class="cover-subtitle">{{ template.subtitle }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="page-bottom">
        <text class="bottom-hint">{{ pageConfig.bottomHint }}</text>
      </view>
    </scroll-view>

    <!-- 搜索浮层 -->
    <view v-if="showSearchPanel" class="search-panel" @click.self="closeSearch">
      <view class="search-panel-content">
        <view class="search-panel-header">
          <view class="search-input-wrap search-input-wrap--focused">
            <text class="search-icon">🔍</text>
            <input
              class="search-input"
              type="text"
              v-model="searchKeyword"
              placeholder="搜索模板名称、分类或标签"
              placeholder-style="color:#bbbbbb"
              confirm-type="search"
              :focus="showSearchPanel"
              @confirm="closeSearch"
            />
            <view v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">
              <text class="clear-icon">×</text>
            </view>
          </view>
          <view class="search-cancel" @click="closeSearch">
            <text class="cancel-text">取消</text>
          </view>
        </view>
        <view v-if="!searchKeyword" class="search-suggest">
          <view class="suggest-section">
            <text class="suggest-title">热门搜索</text>
            <view class="suggest-tags">
              <view class="suggest-tag" @click="searchKeyword = '婚礼'">
                <text class="suggest-tag-text">婚礼</text>
              </view>
              <view class="suggest-tag" @click="searchKeyword = '满月'">
                <text class="suggest-tag-text">满月</text>
              </view>
              <view class="suggest-tag" @click="searchKeyword = '升学'">
                <text class="suggest-tag-text">升学</text>
              </view>
              <view class="suggest-tag" @click="searchKeyword = '中式'">
                <text class="suggest-tag-text">中式</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 排序底部 Sheet -->
    <view v-if="showSortSheet" class="sheet-mask" @click.self="showSortSheet = false">
      <view class="sheet">
        <view class="sheet-header">
          <text class="sheet-title">排序方式</text>
          <view class="sheet-close" @click="showSortSheet = false">
            <text class="sheet-close-icon">×</text>
          </view>
        </view>
        <view class="sheet-list">
          <view
            v-for="sort in sortOptions"
            :key="sort.value"
            class="sheet-item"
            :class="{ active: activeSort === sort.value }"
            @click="activeSort = sort.value; showSortSheet = false"
          >
            <text class="sheet-item-text">{{ sort.label }}</text>
            <text v-if="activeSort === sort.value" class="sheet-item-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 筛选底部 Sheet -->
    <view v-if="showFilterSheet" class="sheet-mask" @click.self="showFilterSheet = false">
      <view class="sheet">
        <view class="sheet-header">
          <text class="sheet-title">筛选</text>
          <view class="sheet-close" @click="showFilterSheet = false">
            <text class="sheet-close-icon">×</text>
          </view>
        </view>
        <view class="sheet-list">
          <view
            v-for="filter in filters"
            :key="filter.value"
            class="sheet-item"
            :class="{ active: activeFilter === filter.value }"
            @click="activeFilter = filter.value"
          >
            <text class="sheet-item-text">{{ filter.label }}</text>
            <text v-if="activeFilter === filter.value" class="sheet-item-check">✓</text>
          </view>
        </view>
        <view class="sheet-footer">
          <view class="sheet-btn sheet-btn--reset" @click="activeFilter = 'all'; showFilterSheet = false">
            <text class="sheet-btn-text">重置</text>
          </view>
          <view class="sheet-btn sheet-btn--confirm" @click="showFilterSheet = false">
            <text class="sheet-btn-text">完成</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import type { TemplateItem, TemplateCategory } from '@/types'
import { HOME_CATEGORIES } from '@/constants/categories'
import { TEMPLATE_PAGE_CONFIG } from '@/config'
import { request } from '@/utils/request'
import { resolveUrl, isCloudUrl } from '@/utils/url'
import { useUserStore } from '@/stores/user'
import { useFeedback } from '@/composables/useFeedback'
import CloudImage from '@/components/CloudImage.vue'

const pageConfig = TEMPLATE_PAGE_CONFIG
const { haptic } = useFeedback()

// ============ 安全初始化：iOS 上任何一步崩溃都会导致页面白屏 ============
let userStore: ReturnType<typeof useUserStore>
try {
  userStore = useUserStore()
  console.log('[template] init: userStore OK')
} catch (e: any) {
  console.error('[template] init FAIL: useUserStore', e?.message || e)
  // 提供安全降级，避免后续引用崩溃
  userStore = {
    isVip: () => false,
    requireLogin: () => true,
  } as any
}

const isPurchased = computed(() => {
  try {
    return userStore.isVip()
  } catch { return false }
})

// 分类列表（静态配置，与 HOME_CATEGORIES 的 categoryId 保持一致）
// id 与数据库模板的 category 字段一致：割礼=festival、耳环礼=business、
// 升学宴=graduation、商量茶=consultation-tea（曾用 birthday/poster/study/creative）
const STATIC_CATEGORIES = [
  { id: 'wedding', name: '婚礼请柬', icon: '/static/images/categories/wedding.jpg' },
  { id: 'engagement', name: '求婚', icon: '/static/images/categories/proposal.jpg' },
  { id: 'consultation-tea', name: '商量茶', icon: '/static/images/categories/consultation-tea.jpg' },
  { id: 'festival', name: '割礼', icon: '/static/images/categories/ceremony.jpg' },
  { id: 'business', name: '耳环礼', icon: '/static/images/categories/earring.jpg' },
  { id: 'baby', name: '周岁宴', icon: '/static/images/categories/baby.jpg' },
  { id: 'graduation', name: '升学宴', icon: '/static/images/categories/graduation.jpg' },
  { id: 'festival-invitation', name: '节日请柬', icon: '/static/images/categories/festival-invitation.jpg' },
  { id: 'house', name: '乔迁', icon: '/static/images/categories/housewarming.jpg' },
]

// ============ 状态 ============
const categoryList = ref<TemplateCategory[]>([])
const allTemplates = ref<TemplateItem[]>([])
const activeCategory = ref<string>('wedding')
const searchKeyword = ref<string>('')
const loading = ref(false)
const loadError = ref(false)

// 封面图加载失败的模板 ID → 本地兜底图（reactive 触发模板重渲染）
const imageOverrides = reactive<Record<string, string>>({})
// iOS 云存储 URL 全部不可用时（如"请先登录"），跳过云 URL 避免逐个重试
let cloudUrlBroken = false

const filters = [
  { label: '全部', value: 'all' },
  { label: '免费', value: 'free' },
  { label: '付费', value: 'paid' },
  { label: 'VIP免费', value: 'vip' },
]
const activeFilter = ref<string>('all')

const sortOptions = [
  { label: '热门', value: 'likes' },
  { label: '最新', value: 'date' },
]
const activeSort = ref<string>('likes')
const navigating = ref(false)

// 弹层显隐
const showSearchPanel = ref(false)
const showSortSheet = ref(false)
const showFilterSheet = ref(false)

// ============ 计算属性 ============
const filteredTemplates = computed<TemplateItem[]>(() => {
  try {
    let list = allTemplates.value

    // 按分类筛选
    if (activeCategory.value && activeCategory.value !== 'all') {
      list = list.filter(t => t.category === activeCategory.value)
    }

    // 按付费状态筛选：统一使用 Boolean() 判断，兼容 is_paid 为数字或布尔值的情况
    if (activeFilter.value === 'free') {
      list = list.filter(t => !Boolean(t.is_paid))
    } else if (activeFilter.value === 'paid') {
      list = list.filter(t => Boolean(t.is_paid))
    } else if (activeFilter.value === 'vip') {
      list = list.filter((t: any) => Boolean(t.is_paid) && t.vip_free === true)
    }

    // 按关键词搜索（名称/副标题/分类名称/标签/元素内容）
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      list = list.filter(t => {
        if (t.name && t.name.toLowerCase().includes(kw)) return true
        if (t.subtitle && t.subtitle.toLowerCase().includes(kw)) return true
        const cat = HOME_CATEGORIES.find(c => c.categoryId === t.category)
        if (cat && cat.name.toLowerCase().includes(kw)) return true
        if (t.tags && t.tags.some(tag => tag.toLowerCase().includes(kw))) return true
        return false
      })
    }

    // 排序
    const sorted = [...list]
    if (activeSort.value === 'likes') {
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    } else if (activeSort.value === 'date') {
      sorted.sort((a, b) => {
        const ta = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime()
        const tb = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime()
        return tb - ta
      })
    }

    return sorted
  } catch (e: any) {
    console.error('[template] filteredTemplates computed crashed:', e?.message || e)
    return []
  }
})

// ============ 监控：记录平台与网络信息 ============
function getPurePlatform(): string {
  try {
    // @ts-ignore
    return uni.getSystemInfoSync().platform || ''
  } catch { return '' }
}

function getPlatformInfo(): string {
  try {
    // @ts-ignore
    const sys = uni.getSystemInfoSync()
    return `${sys.platform}|${sys.system}|${sys.brand||''}|${sys.model||''}`
  } catch { return 'unknown' }
}

let _networkType = 'unknown'
function monitorNetwork() {
  // @ts-ignore
  wx?.getNetworkType?.({
    success: (res: any) => { _networkType = res.networkType || 'unknown' },
  })
}

// ============ 本地兜底模板列表 ============
// 云函数在 iOS 上偶发超时/挂起/返回空，此时回退到本地静态模板，
// 保证页面不为空白（点击本地模板会提示稍后重试）
const LOCAL_TEMPLATE_LIST: TemplateItem[] = [
  { id: 'local-1', name: '好久不见', subtitle: 'Our Wedding', category: 'wedding', cover: '/static/images/templates/wedding-1.png', likes: 9999, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 10, createdAt: '', updatedAt: '' },
  { id: 'local-2', name: '适我愿兮', subtitle: 'Love Forever', category: 'wedding', cover: '/static/images/templates/wedding-2.png', likes: 8866, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 12, createdAt: '', updatedAt: '' },
  { id: 'local-3', name: '佳偶天成', subtitle: 'A Perfect Match', category: 'wedding', cover: '/static/images/templates/wedding-3.png', likes: 7680, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 10, createdAt: '', updatedAt: '' },
  { id: 'local-4', name: '最美的遇见', subtitle: 'Proposal', category: 'engagement', cover: '/static/images/templates/template-1.png', likes: 5321, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-5', name: '节日快乐', subtitle: 'Happy Holiday', category: 'festival-invitation', cover: '/static/images/templates/invitation-1.png', likes: 4210, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-6', name: '甜蜜派对', subtitle: 'Sweet Party', category: 'festival-invitation', cover: '/static/images/templates/invitation-2.png', likes: 3980, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-7', name: '百日宴', subtitle: 'Baby Party', category: 'baby', cover: '/static/images/templates/template-5.png', likes: 2870, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-8', name: '乔迁之喜', subtitle: 'Housewarming', category: 'house', cover: '/static/images/templates/template-3.png', likes: 2150, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  // 以下 4 个补充分类，确保 iOS 云函数不可用走本地兜底时，从首页任意分类入口进入都不空白
  { id: 'local-9', name: '商量茶', subtitle: 'Tea Ceremony', category: 'consultation-tea', cover: '/static/images/templates/template-1.png', likes: 1980, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-10', name: '割礼', subtitle: 'Ceremony', category: 'festival', cover: '/static/images/templates/template-3.png', likes: 1860, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-11', name: '耳环礼', subtitle: 'Earring Gift', category: 'business', cover: '/static/images/templates/invitation-2.png', likes: 1720, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
  { id: 'local-12', name: '升学宴', subtitle: 'Graduation', category: 'graduation', cover: '/static/images/templates/template-5.png', likes: 1650, price: 0, is_paid: 0, is_premium: 0, vip_free: 0, templateType: 'canvas', orientation: 'portrait', pageCount: 8, createdAt: '', updatedAt: '' },
]

// ============ 安全读取 storage（iOS 上 getStorageSync 可能抛异常） ============
function safeGetStorage(key: string): string {
  try {
    // @ts-ignore
    const v = uni.getStorageSync(key)
    return v != null ? String(v) : ''
  } catch {
    return ''
  }
}

// ============ 生命周期 ============
onMounted(async () => {
  let _costStart = Date.now()
  // 辅助：打印醒目的汇总日志（避免被控制台缓冲区冲掉后丢失关键信息）
  const logSummary = (tag: string) => {
    const covers = allTemplates.value.map(t => ({ id: t.id, cover: t.cover?.substring(0, 30) })).slice(0, 5)
    console.log(`\n[template] ██████████████████████████████████████████████████████████████████████████\n[template] █  PAGE READY (v2) █  tag=${tag}  loading=${loading.value}  allTemplates=${allTemplates.value.length}  filtered=${filteredTemplates.value.length}  cloudBroken=${cloudUrlBroken}  overrides=${Object.keys(imageOverrides).length}  cost=${Date.now()-_costStart}ms  platform=${platform}\n[template] █  coversSample=${JSON.stringify(covers)}\n[template] ██████████████████████████████████████████████████████████████████████████\n`)
  }
  const platform = getPlatformInfo()
  try {
  // iOS 诊断：记录页面入口
  try {
    console.log(`[template] onMounted START, platform=${getPlatformInfo()}`)
  } catch {}

  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.category) {
    // 校验分类参数有效性：无效值（旧分享链接/历史入口）时回退默认分类，避免过滤后模板列表空白
    const catValid = STATIC_CATEGORIES.some(c => c.id === options.category)
    activeCategory.value = catValid ? options.category : 'wedding'
    if (!catValid) console.warn(`[template] 无效分类参数: ${options.category}, 回退 wedding`)
  }
  if (options.search) {
    searchKeyword.value = decodeURIComponent(options.search)
  }
  if (options.filter) {
    activeFilter.value = options.filter
  }

  monitorNetwork()

  loading.value = true
  const t0 = Date.now()
  // 提取纯平台标识用于超时分支判断（如 'ios' / 'android' / 'devtools'）
  const isIOS = /^ios/i.test(getPurePlatform())

  // 检查云开发是否可用（App.onLaunch 已做 init + 健康检查）
  const cloudInitOk = safeGetStorage('cloud_init_ok') !== '0'
  const cloudAvailable = cloudInitOk && safeGetStorage('cloud_available') !== '0'

  // 提取到闭包内复用，避免重复构造兜底数据
  const makeFallbackCategories = () => STATIC_CATEGORIES.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon, count: 0, templates: [] as TemplateItem[] }))
  const makeFallbackTemplates = () => LOCAL_TEMPLATE_LIST.map(t => ({ ...t }))

  if (!cloudInitOk) {
    // 云开发 init 失败（极少见），直接走本地兜底
    console.log(`[template] cloud init failed, using local data, platform=${platform}`)
    safeBuildState(makeFallbackCategories(), makeFallbackTemplates())
    loading.value = false
    logSummary('cloud_init_fail')
    enableShareMenu()
    return
  }

  // 健康检查明确返回失败 → 跳过云调用，秒出本地数据
  if (!cloudAvailable && safeGetStorage('cloud_checked_at')) {
    console.log(`[template] cloud health check failed, using local data, platform=${platform}`)
    safeBuildState(makeFallbackCategories(), makeFallbackTemplates())
    loading.value = false
    logSummary('cloud_unavailable')
    enableShareMenu()
    return
  }

  // iOS 已知问题：云函数回调可能不触发，用 8s 竞速超时避免无限等待
  // 安卓/开发者工具超时给 15s（云服务冷启动约 3-5s）
  const LOAD_TIMEOUT = isIOS ? 8000 : 15000
  let summaryTag = 'cloud_ok'

  try {
    console.log(`[template] step1: fetching data, timeout=${LOAD_TIMEOUT}ms`)
    if (isIOS) {
      // iOS 单云函数串行：分类直接用静态配置（分类仅补充数量，非关键路径），
      // 只发起一次模板云函数调用，避免 2 个并发云函数在 iOS 上互相拖慢导致超时
      console.log('[template] iOS mode: categories=static, fetch templates only')
      const templates = await Promise.race([
        fetchTemplates(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('load_timeout')), LOAD_TIMEOUT)
        ),
      ]) as TemplateItem[]
      const t2 = Date.now()
      console.log(`[template] data loaded [v2-ios]: ${t2 - t0}ms, platform=${platform}, network=${_networkType}, count=${templates.length}`)
      safeBuildState(makeFallbackCategories(), templates)
    } else {
      // 安卓/开发者工具：并行请求分类和模板
      const result = await Promise.race([
        Promise.all([fetchCategories(), fetchTemplates()]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('load_timeout')), LOAD_TIMEOUT)
        ),
      ]) as [CategoryItem[], TemplateItem[]]

      console.log(`[template] step2: data fetched, building state`)
      const [categories, templates] = result
      const t2 = Date.now()
      console.log(`[template] data loaded [v2]: ${t2 - t0}ms, platform=${platform}, network=${_networkType}, count=${templates.length}`)
      safeBuildState(categories, templates)
    }
    console.log(`[template] step3: buildState done, cats=${categoryList.value.length}, temps=${allTemplates.value.length}`)
  } catch (e) {
    const tErr = Date.now()
    const isTimeout = e instanceof Error && e.message === 'load_timeout'
    console.error(`[template] load failed(${tErr - t0}ms, ${isTimeout ? 'timeout' : 'error'}):`, e, `platform=${platform}`)
    summaryTag = isTimeout ? 'timeout' : 'cloud_error'
    // 快速降级到本地静态数据，保证页面不白屏
    safeBuildState(makeFallbackCategories(), makeFallbackTemplates())
  } finally {
    loading.value = false
    logSummary(summaryTag)
    enableShareMenu()
  }
  } catch (fatalErr: any) {
    // 最终防线：onMounted 中任何未预见的异常都确保页面降级而非白屏
    console.error('[template] FATAL onMounted:', fatalErr?.message || fatalErr)
    try {
      safeBuildState(
        STATIC_CATEGORIES.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon, count: 0, templates: [] as TemplateItem[] })),
        LOCAL_TEMPLATE_LIST.map(t => ({ ...t }))
      )
    } catch {}
    loading.value = false
    logSummary('fatal_catch')
    enableShareMenu()
  }
})

onLoad(() => {
  enableShareMenu()
})

function enableShareMenu() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    success: () => console.log('share menu enabled'),
    fail: (err: any) => console.warn('share menu fail:', err?.errMsg || err),
  })
}

// 用户从编辑器返回时重置导航锁，避免点击无响应
onShow(() => {
  navigating.value = false
})

onShareAppMessage(() => {
  const category = activeCategory.value || 'wedding'
  return {
    title: `模板广场 - 发现精美${getCategoryName(category)}模板`,
    path: `/pages/template/index?category=${category}`,
  }
})

onShareTimeline(() => {
  const category = activeCategory.value || 'wedding'
  return {
    title: `模板广场 - 发现精美${getCategoryName(category)}模板`,
    query: `category=${category}`,
  }
})

// 获取分类数据（纯数据，不写 reactive state）— 失败自动重试 1 次
async function fetchCategories() {
  const MAX_ATTEMPTS = 2
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await request<{ id: string; name: string; icon: string; count: number }[]>({
        url: '/api/categories?noCounts=1', hideLoading: true,
      })
      if (data && Array.isArray(data)) {
        return data.map((cat: any, index: number) => {
          // 云数据库分类记录可能没有 id 字段（只有 _id，id 为 undefined）
          // 若直接用 undefined，分类选中判断 activeCategory === cat.id 会全部为 true（点击后全选）
          // 修复：优先 id 匹配，其次 name 匹配静态分类，保证 id 稳定唯一
          const staticCat = STATIC_CATEGORIES.find(s => s.id === cat.id)
            || STATIC_CATEGORIES.find(s => s.name === cat.name)
          const id = staticCat ? staticCat.id : (cat.id || `cat-${index}`)
          return {
            id,
            name: staticCat?.name || cat.name,
            icon: staticCat?.icon || '/static/images/icons/document.svg',
            count: cat.count ?? 0,
            templates: [] as TemplateItem[],
          }
        })
      }
    } catch (e) {
      console.warn(`[template] 加载分类失败(attempt=${attempt}):`, e)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 500))
        continue
      }
    }
  }
  // 兜底：静态分类
  return STATIC_CATEGORIES.map(cat => ({
    id: cat.id, name: cat.name, icon: cat.icon, count: 0, templates: [] as TemplateItem[],
  }))
}

// 获取模板数据（纯数据，不写 reactive state）— 失败自动重试1次，仍失败回退本地静态模板
async function fetchTemplates(): Promise<TemplateItem[]> {
  loadError.value = false
  const MAX_ATTEMPTS = 2
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const t0 = Date.now()
      const data = await request<TemplateItem[]>({ url: '/api/templates?page=1&limit=100', hideLoading: true })
      const elapsed = Date.now() - t0
      if (data && Array.isArray(data) && data.length > 0) {
        if (attempt > 1) console.log(`[template] 第${attempt}次重试成功, 耗时${elapsed}ms, 数量=${data.length}`)
        return data.map(pickCardFields)
      }
      // data 为空数组或非数组：可能云函数返回了不完整响应
      console.warn(`[template] 模板数据异常: attempt=${attempt}, data=`, data, `elapsed=${elapsed}ms`)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 800))
        continue
      }
    } catch (e) {
      console.error(`[template] 加载模板列表失败(attempt=${attempt}):`, e)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 800))
        continue
      }
    }
  }
  // 云函数彻底失败：回退本地静态模板，保证 iOS 上页面不为空白
  console.warn(`[template] 云函数加载模板失败，回退本地静态模板(${LOCAL_TEMPLATE_LIST.length}个), network=${_networkType}`)
  return LOCAL_TEMPLATE_LIST.map(t => ({ ...t }))
}

// 将分类与模板交叉关联，写入 reactive state
function buildState(categories: any[], templates: TemplateItem[]) {
  // 计算每个分类下的模板数（客户端聚合，免去云函数 aggregate 开销）
  const countMap: Record<string, number> = {}
  templates.forEach(t => {
    if (t.category) countMap[t.category] = (countMap[t.category] || 0) + 1
  })

  allTemplates.value = templates

  categoryList.value = categories.map(cat => ({
    ...cat,
    count: countMap[cat.id] || cat.count || 0,
    templates: templates.filter(t => t.category === cat.id),
  }))
}

// iOS 安全版本：任何异常都不会导致白屏
function safeBuildState(categories: any[], templates: TemplateItem[]) {
  try {
    // 本地兜底模板全部为免费：若当前是付费/VIP 筛选，必然过滤为空列表，
    // 自动重置为「全部」，避免 iOS 兜底场景下模板区域空白
    const isFallbackData = templates.length > 0 && templates.every(t => typeof t.id === 'string' && (t.id as string).startsWith('local-'))
    if (isFallbackData && (activeFilter.value === 'paid' || activeFilter.value === 'vip')) {
      console.log('[template] 本地兜底数据下重置付费筛选 -> all')
      activeFilter.value = 'all'
    }
    buildState(categories, templates)
  } catch (e: any) {
    console.error('[template] buildState crashed:', e?.message || e)
    // 最终兜底：用硬编码的最小模板集
    try {
      allTemplates.value = LOCAL_TEMPLATE_LIST.map(t => ({ ...t }))
      categoryList.value = STATIC_CATEGORIES.map(cat => ({
        id: cat.id, name: cat.name, icon: cat.icon, count: 0, templates: [] as TemplateItem[],
      }))
    } catch {}
  }
}

// 模板列表卡片展示所需字段（避免把 elements/sections/pages/renderedImage 等大字段塞进 setData）
function pickCardFields(t: TemplateItem): TemplateItem {
  return {
    id: t.id,
    name: t.name,
    subtitle: t.subtitle,
    category: t.category,
    cover: t.cover,
    image: t.image,
    primaryColor: t.primaryColor,
    likes: t.likes,
    pageCount: t.pageCount,
    is_paid: t.is_paid,
    is_premium: t.is_premium,
    price: t.price,
    vip_free: t.vip_free,
    orientation: t.orientation,
    canvasSize: t.canvasSize,
    tags: t.tags,
    templateType: t.templateType,
    updatedAt: t.updatedAt,
    createdAt: t.createdAt,
  } as TemplateItem
}

// 重试加载
async function retryLoad() {
  loading.value = true
  loadError.value = false
  const t0 = Date.now()
  try {
    const categories = await fetchCategories()
    const templates = await fetchTemplates()
    console.log(`[template] 重试加载完成: ${Date.now() - t0}ms, count=${templates.length}, network=${_networkType}`)
    buildState(categories, templates)
  } catch (e) {
    console.error(`[template] 重试加载失败(${Date.now() - t0}ms):`, e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ============ 方法 ============
function onSelectCategory(catId: string) {
  activeCategory.value = catId
}

// 空状态兜底：一键重置所有筛选，展示全部模板（兼容 activeCategory='all' 不过滤分类）
function resetToAll() {
  activeCategory.value = 'all'
  activeFilter.value = 'all'
  searchKeyword.value = ''
}

function getCategoryName(categoryId: string): string {
  const cat = STATIC_CATEGORIES.find(c => c.id === categoryId)
  return cat?.name || categoryId
}

function formatLikes(num: number): string {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function getSortLabel(value: string): string {
  const s = sortOptions.find(o => o.value === value)
  return s ? s.label : '排序'
}

function onSelectTemplate(template: TemplateItem) {
  if (navigating.value) return
  // 本地兜底模板没有真实数据，点击提示稍后重试
  if (typeof template.id === 'string' && template.id.startsWith('local-')) {
    uni.showToast({ title: '模板数据加载失败，请稍后重试', icon: 'none' })
    return
  }
  // 登录拦截：未登录时跳转登录页
  if (!userStore.requireLogin()) return

  if (Boolean(template.is_paid)) {
    const isVip = userStore.isVip()
    if (!isVip && !isPurchased.value) {
      haptic('light')
      const price = template.price || 0
      uni.showActionSheet({
        itemList: [`单买 ${price}元`, '开通VIP免费使用'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 单买流程：跳转支付页
            uni.navigateTo({
              url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}`,
            })
          } else if (res.tapIndex === 1) {
            // 开通VIP
            uni.navigateTo({
              url: '/pages/vip/index',
            })
          }
        },
      })
      return
    }
  }
  haptic('light')
  navigating.value = true
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${template.id}`,
    fail: () => { navigating.value = false },
  })
}

function getImageUrl(template: TemplateItem): string {
  // 封面图曾经加载失败 → 直接用本地兜底图
  if (imageOverrides[template.id]) {
    return imageOverrides[template.id]
  }
  // 云存储全部不可用（iOS "请先登录"）→ cloud URL 直接换本地兜底
  if (cloudUrlBroken && template.cover && isCloudUrl(template.cover)) {
    return '/static/images/templates/wedding-1.png'
  }
  if (template.cover) return resolveUrl(template.cover)
  if (template.image) return resolveUrl(template.image)
  return '/static/images/templates/wedding-1.png'
}

// 根据模板真实比例计算卡片高度
// 竖版（375x667）→ 比例 0.562 → 卡片宽 339rpx * 1.778 = 603rpx 高
// 横版（750x375）→ 比例 2.0 → 卡片宽 339rpx * 0.5 = 170rpx 高（过矮，使用 min-height）
function getCoverStyle(template: TemplateItem): Record<string, string> {
  const cs = template.canvasSize
  // 没有尺寸信息时用默认竖版比例
  if (!cs || !cs.width || !cs.height) {
    return { paddingTop: '177.87%' }  // 667/375 * 100% = 177.87%
  }
  // 用 paddingTop 百分比代替 aspect-ratio（小程序兼容性更好）
  const ratio = (cs.height / cs.width * 100).toFixed(2)
  return { paddingTop: ratio + '%' }
}

function onImageError(e: any, template: TemplateItem) {
  const src = getImageUrl(template)
  console.warn(`[template] 封面图加载失败: id=${template.id}, src=${src}, errMsg=${e?.detail?.errMsg || e?.errMsg || 'unknown'}`)
  // reactive 写入触发模板重渲染 → getImageUrl 返回本地兜底图
  imageOverrides[template.id] = '/static/images/templates/wedding-1.png'
  // 首个 cloud:// URL 失败 → 标记全部云存储 URL 不可用，后续卡片秒切本地图
  if (!cloudUrlBroken && template.cover && isCloudUrl(template.cover)) {
    cloudUrlBroken = true
    console.log('[template] 检测到云存储 URL 不可用，全局降级到本地封面图')
  }
}

function openSearch() {
  showSearchPanel.value = true
}

function closeSearch() {
  showSearchPanel.value = false
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  /* iOS WKWebView 100vh 缺陷：改用 stretch 作为后备 */
  min-height: -webkit-fill-available;
  background: #f2f2f7;
  display: flex;
  flex-direction: column;
}

/* ===== 顶部标题栏 ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 10;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.25s ease, transform 0.25s ease;

  &:active {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(0.9);
  }
}

.back-icon {
  font-size: 60rpx;
  color: #1a1a2e;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a2e;
  flex: 1;
  text-align: center;
  letter-spacing: 1rpx;
}

.header-right {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease, transform 0.2s ease;

  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.92);
  }
}

.header-icon-text {
  font-size: 32rpx;
  line-height: 1;
}

/* ===== 分类栏 + 排序/筛选操作（合并单行） ===== */
.filter-row {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.03);
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.category-scroll {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  gap: 14rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50rpx;
  flex-shrink: 0;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.95);
  }

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.32);

    .category-name,
    .category-count {
      color: #ffffff;
    }

    .category-icon-image {
      transform: scale(1.08);
    }
  }
}

.category-icon-image {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  transition: transform 0.35s ease;
}

.category-name {
  font-size: 26rpx;
  color: #1a1a2e;
  font-weight: 500;
  transition: color 0.3s ease;
}

.category-count {
  font-size: 22rpx;
  color: #6e6e80;
  background: rgba(0, 0, 0, 0.06);
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  transition: all 0.3s ease;
}

.category-item.active .category-count {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

/* 右侧排序/筛选按钮 */
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 18rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 30rpx;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.94);
    background: rgba(0, 0, 0, 0.08);
  }

  &.action-btn--active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.25);

    .action-text,
    .action-dot {
      color: #ffffff;
    }
  }
}

.action-text {
  font-size: 24rpx;
  color: #4a4a5a;
  font-weight: 500;
}

.action-arrow {
  font-size: 20rpx;
  color: #9a9aa8;
  line-height: 1;
}

.action-dot {
  font-size: 32rpx;
  color: #e84a6e;
  line-height: 0.5;
  margin-left: 2rpx;
  font-weight: 700;
}

/* ===== 状态视图 ===== */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

/* 加载状态 - 骨架屏 */
.loading-state {
  justify-content: flex-start;
  padding: 30rpx;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 30rpx;
    width: calc(50% - 45rpx);
    height: 460rpx;
    border-radius: 20rpx;
    background: linear-gradient(90deg, #e6e6ec 25%, #f4f4f8 37%, #e6e6ec 63%);
    background-size: 400% 100%;
    animation: template-skeleton-shimmer 1.4s ease infinite;
  }

  &::before { left: 30rpx; }
  &::after { right: 30rpx; }
}

.loading-text {
  margin-top: 500rpx;
  font-size: 26rpx;
  color: #6e6e80;
  letter-spacing: 2rpx;
}

/* 错误状态 */
.error-state {
  gap: 24rpx;
  padding: 60rpx 30rpx;

  .error-icon-image {
    width: 120rpx;
    height: 120rpx;
    padding: 28rpx;
    box-sizing: border-box;
    background: rgba(232, 74, 110, 0.08);
    border-radius: 50%;
  }

  .error-text {
    font-size: 28rpx;
    color: #6e6e80;
    padding: 16rpx 40rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 100rpx;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.06);
  }
}

/* ===== 模板网格 ===== */
.template-scroll {
  flex: 1;
  height: 0;
}

/* iOS WKWebView 对 CSS Grid 支持不完整（gap/repeat 渲染失效导致空白），改用 flex 双列 */
.template-grid {
  padding: 24rpx 24rpx 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.template-card {
  /* 两列布局：每列宽 = (100% - 24rpx间距) / 2，底部留 24rpx 间距 */
  width: calc(50% - 12rpx);
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(20, 20, 40, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;

  &:active {
    transform: translateY(-6rpx) scale(0.98);
    box-shadow: 0 16rpx 40rpx rgba(232, 74, 110, 0.18);
  }
}

/* 封面容器：按真实比例显示 */
.cover-wrap {
  position: relative;
  width: 100%;
  height: 0;  /* padding-top 撑高方案：height:0 + paddingTop% */
  background: linear-gradient(135deg, #f0f0f5 0%, #e8e8f0 100%);
  overflow: hidden;
}

/* 封面图
   注意：父容器 .cover-wrap 用 height:0 + padding-top 撑高（content-box 高度为 0），
   height:100% 会按规范解析为 0（iOS WKWebView 严格遵循，导致封面错位/右移）。
   改用 top/bottom 拉伸：absolute 的 top/bottom 参照 padding-box（即撑高后的真实高度），跨端可靠。 */
.template-cover {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* 渐变遮罩 - 仅底部信息区（同根因：height:50% 解析为 0，改用 top:50% + bottom:0 定位） */
.cover-gradient {
  position: absolute;
  top: 50%;
  bottom: 0;
  left: 0;
  right: 0;
  height: auto;
  background: linear-gradient(to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.45) 70%,
    rgba(0, 0, 0, 0.75) 100%);
  pointer-events: none;
  z-index: 1;
}

/* 右上角价格/VIP标签 */
.price-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  z-index: 2;
}

.price-tag {
  background: linear-gradient(135deg, #ff7a5c 0%, #e84a6e 55%, #c93660 100%);
  padding: 6rpx 16rpx;
  border-radius: 100rpx;
  box-shadow: 0 4rpx 14rpx rgba(192, 54, 96, 0.4);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
}

.price-tag-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.vip-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff9f00 100%);
  padding: 6rpx 16rpx;
  border-radius: 100rpx;
  box-shadow: 0 4rpx 14rpx rgba(255, 183, 0, 0.4);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.vip-badge-text {
  font-size: 18rpx;
  color: #5a3500;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.free-tag {
  background: rgba(76, 175, 80, 0.92);
  padding: 6rpx 14rpx;
  border-radius: 100rpx;
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.3);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.free-tag-text {
  font-size: 18rpx;
  color: #ffffff;
  font-weight: 600;
}

/* 底部信息浮层 */
.cover-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 20rpx 20rpx;
  z-index: 2;
}

.cover-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  display: block;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-subtitle {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.4;
  margin-top: 4rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
}

.empty-icon-image {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 20rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 28rpx;
  color: #6e6e80;
}

.empty-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #e84a6e, #ff6b6b);
  border-radius: 44rpx;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.25);
}

.empty-btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

/* 底部 */
.page-bottom { padding: 60rpx 0 40rpx; text-align: center; }
.bottom-hint { font-size: 24rpx; color: #a8a8b4; }

/* ===== 搜索浮层 ===== */
.search-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.search-panel-content {
  background: #ffffff;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  padding: calc(env(safe-area-inset-top) + 20rpx) 24rpx 24rpx;
  animation: slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.search-panel-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.search-input-wrap--focused {
    background: #ffffff;
    border-color: rgba(232, 74, 110, 0.35);
    box-shadow: 0 6rpx 20rpx rgba(232, 74, 110, 0.14);

    .search-icon {
      opacity: 0.9;
    }
  }
}

.search-icon {
  font-size: 28rpx;
  margin-right: 14rpx;
  opacity: 0.55;
  transition: opacity 0.3s ease;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a2e;
  height: 44rpx;
  line-height: 44rpx;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  border-radius: 50%;
  transition: background 0.2s ease, transform 0.2s ease;

  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.9);
  }
}

.clear-icon {
  font-size: 36rpx;
  color: #9a9aa8;
  line-height: 1;
}

.search-cancel {
  padding: 8rpx 12rpx;
}

.cancel-text {
  font-size: 28rpx;
  color: #e84a6e;
  font-weight: 500;
}

/* 搜索建议 */
.search-suggest {
  padding: 32rpx 8rpx 8rpx;
}

.suggest-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.suggest-title {
  font-size: 24rpx;
  color: #9a9aa8;
  font-weight: 500;
}

.suggest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.suggest-tag {
  padding: 12rpx 28rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 30rpx;
  transition: all 0.25s ease;

  &:active {
    background: rgba(232, 74, 110, 0.08);
    transform: scale(0.95);
  }
}

.suggest-tag-text {
  font-size: 26rpx;
  color: #4a4a5a;
}

/* ===== 底部 Sheet ===== */
.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

.sheet {
  width: 100%;
  background: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  padding-bottom: env(safe-area-inset-bottom);
  animation: slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a2e;
}

.sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;

  &:active {
    background: rgba(0, 0, 0, 0.06);
  }
}

.sheet-close-icon {
  font-size: 40rpx;
  color: #9a9aa8;
  line-height: 1;
}

.sheet-list {
  padding: 16rpx 32rpx;
}

.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);

  &:last-child {
    border-bottom: none;
  }

  &.active {
    .sheet-item-text {
      color: #e84a6e;
      font-weight: 600;
    }

    .sheet-item-check {
      opacity: 1;
    }
  }
}

.sheet-item-text {
  font-size: 30rpx;
  color: #2c2c2c;
}

.sheet-item-check {
  font-size: 32rpx;
  color: #e84a6e;
  opacity: 0;
  transition: opacity 0.2s ease;
  font-weight: 700;
}

.sheet-footer {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
}

.sheet-btn {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 44rpx;
  text-align: center;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.sheet-btn--reset {
  background: rgba(0, 0, 0, 0.05);
}

.sheet-btn--confirm {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  box-shadow: 0 8rpx 22rpx rgba(232, 74, 110, 0.32);
}

.sheet-btn-text {
  font-size: 28rpx;
  font-weight: 600;
}

.sheet-btn--reset .sheet-btn-text {
  color: #4a4a5a;
}

.sheet-btn--confirm .sheet-btn-text {
  color: #ffffff;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes template-skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
