<template>
  <view class="page-editor">
    <!-- 顶部导航 -->
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑请柬</text>
      <view class="header-actions">
        <text class="header-action" @click="handleUndo">↩</text>
        <text class="header-action" @click="handleRedo">↪</text>
      </view>
    </view>

    <!-- 主预览区：全屏滚动 -->
    <scroll-view class="preview-scroll" scroll-y>
      <view class="preview-card" :style="canvasBackgroundStyle">
        <view
          v-for="(sec, idx) in editorStore.pageSections"
          :key="sec.id"
          class="page-section"
          :class="[
            `page-section--${sec.type}`,
            { 'page-section--active': editorStore.activeSectionId === sec.id },
            { 'page-section--non-editable': sec.editable === false }
          ]"
          @click="onSectionClick(sec)"
          @longpress="onSectionLongPress(sec)"
        >
          <template v-if="sec.type === 'title'">
            <text class="section-title" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入标题' }}</text>
          </template>
          <template v-else-if="sec.type === 'date'">
            <text class="section-date" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || 'YYYY/MM/DD' }}</text>
          </template>
          <template v-else-if="sec.type === 'image'">
            <image
              class="section-image"
              :src="sec.image || '/static/images/icons/img-placeholder.svg'"
              mode="aspectFit"
              :style="getImageSectionStyle(sec)"
              @error="onImageError"
            />
            <view v-if="!sec.image" class="image-placeholder">
              <text class="placeholder-icon">📷</text>
              <text class="placeholder-text">{{ sec.placeholder || '点击上传照片' }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'text'">
            <text class="section-text" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入正文内容' }}</text>
          </template>
          <template v-else-if="sec.type === 'location'">
            <view class="location-row">
              <text class="location-icon">📍</text>
              <text class="location-text" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入地址' }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'rsvp'">
            <!-- RSVP 表单为演示展示，实际提交功能在预览页生效 -->
            <view class="rsvp-section rsvp-section--preview">
              <view class="rsvp-demo-badge">演示</view>
              <text class="rsvp-title">RSVP</text>
              <view class="rsvp-form">
                <view class="form-item">
                  <text class="form-label">姓名</text>
                  <input class="form-input" placeholder="请输入姓名" disabled />
                </view>
                <view class="form-item">
                  <text class="form-label">出席人数</text>
                  <input class="form-input" type="number" placeholder="请输入人数" disabled />
                </view>
                <view class="rsvp-submit">提交</view>
              </view>
            </view>
          </template>
          <template v-else-if="sec.type === 'map'">
            <view class="map-section">
              <image
                class="map-image"
                src="/static/images/icons/map-placeholder.svg"
                mode="aspectFit"
              />
              <text class="map-address">{{ sec.text || '请输入地址' }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'divider'">
            <view class="divider-line">
              <text class="divider-text">{{ sec.text }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'countdown'">
            <view class="countdown-section">
              <text class="countdown-label">距婚礼还有</text>
              <view class="countdown-days">{{ countdownDays }}</view>
              <text class="countdown-unit">天</text>
            </view>
          </template>
        </view>
      </view>
    </scroll-view>

    <!-- 底部工具栏 -->
    <view class="editor-footer">
      <!-- 选中元素时的上下文工具栏 -->
      <view v-if="editorStore.activeSectionId !== null" class="context-toolbar">
        <view class="ctx-btn" @click="handleEditSection">
          <text class="ctx-icon">✏️</text>
          <text class="ctx-label">编辑</text>
        </view>
        <view v-if="activeSection?.type === 'image'" class="ctx-btn" @click="handleReplaceImage">
          <text class="ctx-icon">🖼️</text>
          <text class="ctx-label">换图</text>
        </view>
        <view v-if="activeSection?.type === 'image'" class="ctx-btn" @click="showImagePanel = true">
          <text class="ctx-icon">⚙️</text>
          <text class="ctx-label">调整</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canUndo }" @click="handleUndo">
          <text class="ctx-icon">↩</text>
          <text class="ctx-label">撤销</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canRedo }" @click="handleRedo">
          <text class="ctx-icon">↪</text>
          <text class="ctx-label">重做</text>
        </view>
        <view class="ctx-btn ctx-btn--danger" @click="deselectSection">
          <text class="ctx-icon">✕</text>
          <text class="ctx-label">取消</text>
        </view>
      </view>
      <!-- 底部主操作区 -->
      <view class="footer-main">
        <view class="footer-tabs">
          <view class="footer-tab" @click="openUnifiedEdit">
            <text class="tab-icon">📋</text>
            <text class="tab-label">信息</text>
          </view>
          <view class="footer-tab" @click="handleEditSection">
            <text class="tab-icon">✏️</text>
            <text class="tab-label">文字</text>
          </view>
          <view class="footer-tab" @click="handleReplaceImage">
            <text class="tab-icon">🖼️</text>
            <text class="tab-label">图片</text>
          </view>
          <view class="footer-tab" @click="handleMusic">
            <text class="tab-icon">🎵</text>
            <text class="tab-label">音乐</text>
          </view>
          <view class="footer-tab" @click="handleMore">
            <text class="tab-icon">⋯</text>
            <text class="tab-label">更多</text>
          </view>
        </view>
        <view class="footer-actions">
          <view
            class="footer-action-btn footer-save-btn"
            :class="{ 'btn--disabled': savingLoading }"
            @click="handleSave"
          >
            <text class="action-btn-text">{{ savingLoading ? '保存中' : '保存' }}</text>
          </view>
          <view class="footer-action-btn footer-share-btn" @click="handleShare">
            <text class="action-btn-text">预览分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文本编辑弹窗 -->
    <TextEditorPopup
      v-if="editorStore.showSectionTextEditor"
      :visible="editorStore.showSectionTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeSectionTextEditor"
      @confirm="onTextEditorConfirm"
    />

    <!-- 统一编辑表单 -->
    <UnifiedEditForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="templateStore.basicInfo"
      :elements="editorStore.pageSections as any"
      :template-data="templateStore.templateData"
      :template-data-keys="allTemplateDataKeys"
      @close="onUnifiedEditCancel"
      @confirm="onUnifiedEditConfirm"
      @update="onSmartFieldUpdate"
      @location="handleLocation"
    />

    <!-- 图片属性调整面板 -->
    <ImagePropertyPanel
      :visible="showImagePanel"
      :element="activeSection as any"
      @close="showImagePanel = false"
      @update="onImagePropUpdate"
      @preview="onImagePropPreview"
      @reset="onImagePropReset"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTemplateStore } from '@/stores/template'
import { useWorksStore } from '@/stores/works'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { useFeedback } from '@/composables/useFeedback'
import { uploadImage } from '@/api'
import TextEditorPopup from './TextEditorPopup.vue'
import UnifiedEditForm from './UnifiedEditForm.vue'
import ImagePropertyPanel from './ImagePropertyPanel.vue'
import type { PageSection, Work } from '@/types'

const editorStore = useEditorStore()
const templateStore = useTemplateStore()
const worksStore = useWorksStore()
const { goBack, isDirty } = useGoBack()
const { haptic } = useFeedback()

// 图片属性面板显示控制
const showImagePanel = ref(false)
const savingLoading = ref(false)
const hasUnsavedChanges = ref(false)

// 收集模板中所有元素的 dataKey（跨 canvas/page/flip 三种模式），用于 UnifiedEditForm 按需显示字段
const allTemplateDataKeys = computed(() => {
  const keys = new Set<string>()
  editorStore.editableElements.forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  editorStore.pageSections.forEach(sec => { if (sec.dataKey) keys.add(sec.dataKey) })
  editorStore.flipPages.forEach(page => {
    (page.elements || []).forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  })
  return Array.from(keys)
})

// 同步 hasUnsavedChanges 到 isDirty，用于返回前确认
watch(hasUnsavedChanges, (val) => {
  isDirty.value = val
})

// 组件挂载状态标记，用于异步操作中判断组件是否已卸载
let _isMounted = true
onUnmounted(() => {
  _isMounted = false
  _snapshotBeforeEdit = null
  if (pagePropTimer) clearTimeout(pagePropTimer)
  if (pageSmartEditTimer) clearTimeout(pageSmartEditTimer)
})

// 统一编辑前的快照，取消编辑时回滚
let _snapshotBeforeEdit: {
  pageSections: PageSection[]
  elements: any[]
  flipPages: any[]
  basicInfo: any
  templateData: any
} | null = null

const { canvasBackgroundStyle, getTextStyle } = useCanvasRender({
  getElements: () => [],
  getCanvasSize: () => editorStore.canvasSize,
  getBackground: () => editorStore.background as any,
})

const activeSection = computed(() => {
  return editorStore.pageSections.find(s => s.id === editorStore.activeSectionId)
})

// 计算距婚礼日期的天数
const countdownDays = computed(() => {
  const weddingDate = templateStore.basicInfo.weddingDate
  if (!weddingDate) return 0
  const target = new Date(weddingDate).getTime()
  if (isNaN(target)) return 0
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000))
})

// 双击检测
let lastSectionTapId: string | null = null
let lastSectionTapTime = 0
const SECTION_DOUBLE_TAP_INTERVAL = 350

function onSectionClick(sec: PageSection) {
  if (sec.editable === false) return
  const now = Date.now()
  // 双击检测：已选中且在间隔内再次点击则触发编辑
  if (editorStore.activeSectionId === sec.id && lastSectionTapId === sec.id && (now - lastSectionTapTime) < SECTION_DOUBLE_TAP_INTERVAL) {
    lastSectionTapId = null
    lastSectionTapTime = 0
    openSectionEditor(sec)
    return
  }
  // 第一次点击：仅选中
  editorStore.activeSectionId = sec.id
  haptic('light')
  lastSectionTapId = sec.id
  lastSectionTapTime = now
}

// 打开 section 编辑器（双击或上下文菜单触发）
function openSectionEditor(sec: PageSection) {
  if (sec.editable === false) return
  if (sec.type === 'image') {
    chooseImage(sec.id)
  } else if (sec.type === 'title' || sec.type === 'text' || sec.type === 'date' || sec.type === 'location') {
    editorStore.openSectionTextEditor(sec.id)
  }
}

function onSectionLongPress(sec: PageSection) {
  if (sec.editable === false) return
  editorStore.activeSectionId = sec.id
  haptic('medium')
  const items: string[] = ['编辑']
  if (sec.type === 'image') {
    items.push('换图')
    items.push('调整')
  }
  items.push('删除')
  uni.showActionSheet({
    itemList: items,
    success: (res: any) => {
      let offset = 0
      if (items[offset] === '编辑') {
        if (res.tapIndex === offset) {
          openSectionEditor(sec)
          return
        }
        offset++
      }
      if (sec.type === 'image' && items[offset] === '换图') {
        if (res.tapIndex === offset) {
          handleReplaceImage()
          return
        }
        offset++
      }
      if (sec.type === 'image' && items[offset] === '调整') {
        if (res.tapIndex === offset) {
          showImagePanel.value = true
          return
        }
        offset++
      }
      if (items[offset] === '删除') {
        if (res.tapIndex === offset) {
          const idx = editorStore.pageSections.findIndex(s => s.id === sec.id)
          if (idx >= 0) {
            editorStore.pageSections.splice(idx, 1)
            editorStore.activeSectionId = null
            editorStore.pushHistory()
            hasUnsavedChanges.value = true
          }
        }
      }
    },
  })
}

function deselectSection() {
  editorStore.activeSectionId = null
}

// 图片 section 的变换样式
function getImageSectionStyle(sec: PageSection): Record<string, string> {
  const style: Record<string, string> = {}
  // 透明度
  if (sec.opacity != null) style.opacity = String(sec.opacity)
  // 构建复合 transform：旋转 + 缩放
  const transforms: string[] = []
  if (sec.rotation) transforms.push(`rotate(${sec.rotation}deg)`)
  if (sec.imageScale && sec.imageScale !== 1) transforms.push(`scale(${sec.imageScale})`)
  if (transforms.length > 0) style.transform = transforms.join(' ')
  // 圆角
  if (sec.borderRadius) {
    style.borderRadius = `${sec.borderRadius}rpx`
  }
  return style
}

// 图片属性面板更新回调（防抖记录历史）
let pagePropTimer: ReturnType<typeof setTimeout> | null = null
function onImagePropUpdate(field: string, value: number) {
  if (!activeSection.value) return
  ;(activeSection.value as any)[field] = value
  hasUnsavedChanges.value = true
  if (pagePropTimer) clearTimeout(pagePropTimer)
  pagePropTimer = setTimeout(() => {
    editorStore.pushHistory()
    pagePropTimer = null
  }, 500)
}

// 图片属性面板预览回调（@changing 事件，实时更新但不记录历史）
function onImagePropPreview(field: string, value: number) {
  if (!activeSection.value) return
  ;(activeSection.value as any)[field] = value
}

// 图片属性面板重置回调
function onImagePropReset() {
  if (!activeSection.value) return
  activeSection.value.imageScale = 1
  activeSection.value.rotation = 0
  activeSection.value.opacity = 1
  activeSection.value.borderRadius = 0
  editorStore.pushHistory()
  hasUnsavedChanges.value = true
}

function handleEditSection() {
  if (!activeSection.value) {
    uni.showToast({ title: '请先点击选择要编辑的内容', icon: 'none' })
    return
  }
  openSectionEditor(activeSection.value)
}

function handleReplaceImage() {
  if (!activeSection.value || activeSection.value.type !== 'image') {
    uni.showToast({ title: '请先选择图片区域', icon: 'none' })
    return
  }
  chooseImage(activeSection.value.id)
}

function chooseImage(sectionId: string) {
  editorStore.activeSectionId = sectionId

  const applyImage = async (tempPath: string) => {
    uni.showLoading({ title: '上传中 0%' })
    try {
      const permanentUrl = await uploadImage(tempPath, (progress: number) => {
        uni.showLoading({ title: `上传中 ${progress}%` })
      })
      editorStore.updatePageSectionImage(sectionId, permanentUrl)
      editorStore.pushHistory()
      hasUnsavedChanges.value = true
    } catch (e) {
      console.warn('图片上传失败:', e)
      editorStore.updatePageSectionImage(sectionId, tempPath)
      if (_isMounted) uni.showToast({ title: '图片上传失败，本地图片重启后可能丢失，请稍后重试', icon: 'none' })
    } finally {
      if (_isMounted) uni.hideLoading()
    }
  }

  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        applyImage(res.tempFiles[0].tempFilePath)
      }
    },
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        applyImage(res.tempFilePaths[0])
      }
    },
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif
}

function onTextEditorConfirm() {
  // confirmTextEdit 内部已调用 pushHistory，无需重复
  editorStore.confirmTextEdit()
  hasUnsavedChanges.value = true
}

function openUnifiedEdit() {
  // 创建快照用于取消时回滚（与主编辑器保持一致）
  _snapshotBeforeEdit = JSON.parse(JSON.stringify({
    pageSections: editorStore.pageSections,
    elements: editorStore.editableElements,
    flipPages: editorStore.flipPages,
    basicInfo: templateStore.basicInfo,
    templateData: templateStore.templateData,
  }))
  editorStore.showBasicInfoEditor = true
}

function onUnifiedEditConfirm() {
  editorStore.syncBasicInfoToElements()
  editorStore.closeBasicInfoEditor()
  hasUnsavedChanges.value = true
}

function onUnifiedEditCancel() {
  editorStore.closeBasicInfoEditor()
  // 取消时回滚到编辑前的快照（使用 splice 保持响应式）
  if (_snapshotBeforeEdit) {
    Object.assign(templateStore.basicInfo, _snapshotBeforeEdit.basicInfo)
    Object.assign(templateStore.templateData, _snapshotBeforeEdit.templateData)
    editorStore.pageSections.splice(0, editorStore.pageSections.length, ...JSON.parse(JSON.stringify(_snapshotBeforeEdit.pageSections)))
    editorStore.editableElements.splice(0, editorStore.editableElements.length, ...JSON.parse(JSON.stringify(_snapshotBeforeEdit.elements)))
    editorStore.flipPages.splice(0, editorStore.flipPages.length, ...JSON.parse(JSON.stringify(_snapshotBeforeEdit.flipPages)))
    _snapshotBeforeEdit = null
  }
}

let pageSmartEditTimer: ReturnType<typeof setTimeout> | null = null
function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
  hasUnsavedChanges.value = true
  if (pageSmartEditTimer) clearTimeout(pageSmartEditTimer)
  pageSmartEditTimer = setTimeout(() => {
    editorStore.pushHistory()
    pageSmartEditTimer = null
  }, 800)
}

function handleUndo() {
  if (!editorStore.canUndo) return
  editorStore.undo()
}

function handleRedo() {
  if (!editorStore.canRedo) return
  editorStore.redo()
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleMore() {
  uni.showActionSheet({
    itemList: ['撤销', '重做', '设置', '更换模板', '导出'],
    success: (res: any) => {
      switch (res.tapIndex) {
        case 0: handleUndo(); break
        case 1: handleRedo(); break
        case 2: handleSettings(); break
        case 3: handleChangeTemplate(); break
        case 4: handleExport(); break
      }
    },
  })
}

function handleSettings() {
  const settingItems = [
    { name: '礼物相册', key: 'giftAlbum' },
    { name: '礼物购买', key: 'giftBuy' },
    { name: '礼金功能', key: 'moneyGift' },
    { name: '点赞功能', key: 'like' },
    { name: '弹幕功能', key: 'danmaku' },
    { name: '相册功能', key: 'album' },
  ]
  uni.showActionSheet({
    itemList: settingItems.map(s => {
      const enabled = (templateStore.settings as any)[s.key]
      return `${s.name}${enabled ? ' ✓' : ''}`
    }),
    success: (res: any) => {
      const item = settingItems[res.tapIndex]
      if (item) {
        templateStore.toggleSetting(item.key)
        const enabled = (templateStore.settings as any)[item.key]
        uni.showToast({ title: `${item.name}已${enabled ? '开启' : '关闭'}`, icon: 'none' })
      }
    },
  })
}

function handleChangeTemplate() {
  uni.showModal({
    title: '更换模板',
    content: '切换模板可能会丢失当前编辑内容，确定要继续吗？',
    confirmText: '继续',
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/template/index?from=editor' })
      }
    },
  })
}

async function handleExport() {
  // 与主编辑器一致：导出前确保作品已保存，再跳转预览页进行导出
  if (!editorStore.currentWorkId) {
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '提示',
        content: '请先保存作品再导出',
        confirmText: '去保存',
        success: (res) => resolve(res.confirm || false),
      })
    })
    if (!confirmed) return
    await handleSave()
  }
  if (editorStore.currentWorkId) {
    uni.navigateTo({ url: '/pages/preview/index?workId=' + editorStore.currentWorkId })
  } else {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

function handleLocation() {
  uni.showToast({ title: '该功能仅支持单页模式', icon: 'none' })
}

async function handleSave() {
  if (savingLoading.value) return
  savingLoading.value = true
  try {
    const editorData = editorStore.buildEditorData()
    const musicId = templateStore.selectedMusicId
    if (editorStore.currentWorkId) {
      const existing = worksStore.works.find(w => w.id === editorStore.currentWorkId)
      if (existing) {
        existing.title = templateStore.templateData.coverTitle || '未命名作品'
        existing.date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
        existing.image = templateStore.templateData.coverImage
        existing.cover = templateStore.templateData.coverImage
        existing.templateId = editorStore.currentTemplateId
        existing.templateType = editorStore.templateType
        existing.musicId = musicId
        existing.data = editorData
        existing.updatedAt = new Date().toISOString()
        worksStore.saveAsWork(existing)
        hasUnsavedChanges.value = false
        uni.showToast({ title: '已保存', icon: 'success' })
        return
      }
    }
    const id = editorStore.currentWorkId || String(Date.now())
    if (!editorStore.currentWorkId) {
      editorStore.setCurrentWorkId(id)
    }
    const work: Work = {
      id,
      title: templateStore.templateData.coverTitle || '未命名作品',
      date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      image: templateStore.templateData.coverImage,
      cover: templateStore.templateData.coverImage,
      templateId: editorStore.currentTemplateId,
      templateType: editorStore.templateType,
      musicId,
      status: 'draft',
      data: editorData,
      updatedAt: new Date().toISOString(),
    }
    worksStore.saveAsWork(work)
    hasUnsavedChanges.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } finally {
    savingLoading.value = false
  }
}

async function handleShare() {
  await handleSave()
  if (!editorStore.currentWorkId) {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/preview/index?workId=' + editorStore.currentWorkId })
}

function onImageError() {
  console.warn('PageEditor image load failed')
}
</script>

<style lang="scss" scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 30rpx 20rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: none;
  flex-shrink: 0;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}

.header-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.header-back:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.92);
}

.back-icon {
  font-size: 44rpx;
  color: #2c2c2c;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  letter-spacing: 1rpx;
}

.header-actions {
  display: flex;
  gap: 12rpx;
}

.header-action {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #555;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.header-action:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.92);
}

.preview-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.preview-card {
  padding: 20rpx;
}

.page-section {
  position: relative;
  margin-bottom: 30rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  transition: all 0.2s;

  &--active {
    background: rgba(232, 74, 110, 0.05);
    outline: 4rpx solid #e84a6e;
    outline-offset: -4rpx;
  }

  &--non-editable {
    pointer-events: none;
    opacity: 0.8;
  }
}

.section-title {
  font-size: 40rpx;
  font-weight: 700;
  text-align: center;
  color: #333;
  line-height: 1.5;
}

.section-date {
  font-size: 28rpx;
  text-align: center;
  color: #999;
  margin-top: 10rpx;
}

.section-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.image-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.placeholder-icon {
  font-size: 60rpx;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999;
}

.section-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.location-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 28rpx;
  color: #666;
}

.rsvp-section {
  background: #fdf6f8;
  border-radius: 12rpx;
  padding: 24rpx;
}

.rsvp-section--preview {
  opacity: 0.6;
  position: relative;
}

.rsvp-demo-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: rgba(232, 74, 110, 0.15);
  color: #e84a6e;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.rsvp-title {
  font-size: 32rpx;
  font-weight: 700;
  text-align: center;
  color: #e84a6e;
  margin-bottom: 20rpx;
}

.rsvp-form {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-label {
  font-size: 24rpx;
  color: #999;
}

.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #e0d0d5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.rsvp-submit {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  margin-top: 10rpx;
}

.map-section {
  border-radius: 12rpx;
  overflow: hidden;
}

.map-image {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.map-address {
  display: block;
  padding: 16rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
}

.divider-line {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.divider-line::before,
.divider-line::after {
  content: '';
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #e0d0d5, transparent);
}

.divider-text {
  font-size: 24rpx;
  color: #999;
  letter-spacing: 4rpx;
}

.countdown-section {
  text-align: center;
  padding: 30rpx;
}

.countdown-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.countdown-days {
  font-size: 80rpx;
  font-weight: 700;
  color: #e84a6e;
}

.countdown-unit {
  font-size: 28rpx;
  color: #999;
  margin-left: 8rpx;
}

.editor-footer {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: none;
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.08);
}

.context-toolbar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #fff5f7 0%, #fef0f3 100%);
  border-bottom: 1rpx solid rgba(232, 74, 110, 0.1);
  animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ctx-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 8rpx;
  border-radius: 16rpx;
  background: #fff;
  gap: 6rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.ctx-btn:active {
  transform: scale(0.94);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.06);
}

.ctx-btn--disabled {
  opacity: 0.35;
  pointer-events: none;
}

.ctx-btn--danger {
  background: #fff0f0;
}

.ctx-icon {
  font-size: 32rpx;
}

.ctx-label {
  font-size: 22rpx;
  color: #555;
  font-weight: 500;
}

.ctx-btn--danger .ctx-label {
  color: #e84a6e;
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.footer-main {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 20rpx;
}

.footer-tabs {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.footer-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc((100% - 32rpx) / 5);
  height: 88rpx;
  padding: 8rpx 4rpx;
  gap: 6rpx;
  border-radius: 16rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.footer-tab:active {
  transform: scale(0.92);
  background: rgba(232, 74, 110, 0.06);
}

.tab-icon {
  font-size: 38rpx;
  line-height: 1;
}

.tab-label {
  font-size: 22rpx;
  color: #666;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.footer-action-btn {
  padding: 18rpx 36rpx;
  border-radius: 44rpx;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.footer-action-btn:active {
  transform: scale(0.96);
}

.footer-save-btn {
  background: #f5f5f7;
  border: 1rpx solid #e8e8ec;
}

.footer-save-btn:active {
  background: #eef0f4;
}

.btn--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.footer-share-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  box-shadow: 0 6rpx 20rpx rgba(232, 74, 110, 0.35);
}

.footer-share-btn:active {
  box-shadow: 0 3rpx 10rpx rgba(232, 74, 110, 0.4);
}

.action-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5rpx;
}

.footer-save-btn .action-btn-text {
  color: #4a4a4a;
}
</style>
