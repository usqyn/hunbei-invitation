<template>
  <view class="music-page">
    <view class="music-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">{{ pageTitle }}</text>
      <view class="header-upload" @click="handleUpload">
        <text class="upload-text">本地上传</text>
      </view>
    </view>

    <view class="music-tags">
      <view
        v-for="tag in MUSIC_TAGS"
        :key="tag"
        class="tag-item"
        :class="{ active: currentTag === tag }"
        @click="switchTag(tag)"
      >
        <text class="tag-text">{{ tag }}</text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="music-search-bar">
      <view class="music-search-wrap">
        <text class="music-search-icon">🔍</text>
        <input
          class="music-search-input"
          type="text"
          v-model="searchKeyword"
          placeholder="搜索音乐名称"
          placeholder-style="color:#bbbbbb"
          confirm-type="search"
        />
        <view v-if="searchKeyword" class="music-search-clear" @click="searchKeyword = ''">
          <text class="music-clear-icon">×</text>
        </view>
      </view>
    </view>

    <scroll-view class="music-list" scroll-y @scrolltolower="loadMore">
      <view
        v-for="(song, idx) in filteredMusicList"
        :key="song.id"
        class="music-item"
        :class="{ 'is-using': selectedMusicId === song.id, 'is-playing': currentSongIndex === idx && isPlaying }"
        @click="handleSelectSong(song, idx)"
      >
        <view class="music-icon">
          <text class="icon-text">{{ currentSongIndex === idx && isPlaying ? '▶️' : '🎵' }}</text>
        </view>
        <view class="music-info">
          <text class="music-name">{{ song.name }}</text>
          <text v-if="song.hot" class="music-hot">HOT</text>
        </view>
        <view v-if="selectedMusicId === song.id" class="music-using">
          <text class="using-text">使用中</text>
        </view>
        <view v-else class="music-use-btn" @click.stop="handleUseSong(song)">
          <text class="use-btn-text">使用</text>
        </view>
      </view>
      <view v-if="loading" class="loading-text">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="loadingMore" class="loading-text">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && musicList.length > 0 && filteredMusicList.length > 0" class="loading-text">没有更多了</view>
      <view v-if="!loading && filteredMusicList.length === 0" class="search-empty">
        <text class="search-empty-icon">🔍</text>
        <text class="search-empty-text">未找到相关音乐</text>
      </view>
    </scroll-view>

    <view class="music-player">
      <view class="player-left">
        <view class="vinyl-icon" @click="togglePlay">
          <text class="vinyl-emoji">{{ isPlaying ? '⏸' : '▶️' }}</text>
        </view>
        <text class="player-name">{{ currentSong ? currentSong.name : '选择音乐' }}</text>
      </view>
      <view class="player-right">
        <view class="progress-bar" @click="seekProgress">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
          <view class="progress-dot" :style="{ left: progressPercent + '%' }"></view>
        </view>
        <text class="time-text">{{ currentTimeText }} / {{ durationText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useFeedback } from '@/composables/useFeedback'
import { MUSIC_TAGS, fetchMusicFromApi } from '@/constants/music'
import type { Music } from '@/types'

const templateStore = useTemplateStore()
const { haptic } = useFeedback()

const UPLOADED_MUSIC_STORAGE_KEY = 'hunbei_uploaded_music'

// 页面标题（支持从导航参数设置）
const pageTitle = ref('音乐库')

const PAGE_SIZE = 20
const currentTag = ref('全部')
const searchKeyword = ref('')
const musicList = ref<Music[]>([])
const loading = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)
const currentSongIndex = ref<number | null>(null)
const isPlaying = ref(false)
const progressPercent = ref(0)
const currentTimeText = ref('00:00')
const durationText = ref('00:00')

const selectedMusicId = computed(() => templateStore.selectedMusicId)

// 上传歌曲持久化
const uploadedSongs = ref<Music[]>([])

function saveUploadedSongs() {
  try {
    uni.setStorageSync(UPLOADED_MUSIC_STORAGE_KEY, JSON.stringify(uploadedSongs.value))
  } catch (e) {
    console.warn('保存上传歌曲失败:', e)
  }
}

function loadUploadedSongs() {
  try {
    const saved = uni.getStorageSync(UPLOADED_MUSIC_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        uploadedSongs.value = parsed
      }
    }
  } catch (e) {
    console.warn('恢复上传歌曲失败:', e)
  }
}

let audio: UniApp.InnerAudioContext | null = null

const filteredMusicList = computed(() => {
  // 合并上传歌曲与 API 歌曲
  let list = [...uploadedSongs.value, ...musicList.value]
  if (currentTag.value !== '全部') {
    list = list.filter(s => s.tag === currentTag.value || s.tag === '本地上传')
  }
  // 按关键词本地搜索过滤
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(s => s.name && s.name.toLowerCase().includes(kw))
  }
  return list
})

const currentSong = computed(() => {
  if (currentSongIndex.value !== null && currentSongIndex.value < filteredMusicList.value.length) {
    return filteredMusicList.value[currentSongIndex.value]
  }
  return null
})

async function loadMusic() {
  loading.value = true
  currentPage.value = 1
  hasMore.value = true
  try {
    const result = await fetchMusicFromApi(undefined, 1, PAGE_SIZE)
    musicList.value = result.list
    hasMore.value = result.hasMore
  } catch (e) {
    console.warn('loadMusic failed:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function switchTag(tag: string) {
  currentTag.value = tag
  loading.value = true
  currentPage.value = 1
  hasMore.value = true
  try {
    const result = await fetchMusicFromApi(tag, 1, PAGE_SIZE)
    musicList.value = result.list
    hasMore.value = result.hasMore
  } catch (e) {
    console.warn('switchTag failed:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const nextPage = currentPage.value + 1
  try {
    const result = await fetchMusicFromApi(currentTag.value === '全部' ? undefined : currentTag.value, nextPage, PAGE_SIZE)
    if (result.list.length > 0) {
      const existingIds = new Set(musicList.value.map(m => m.id))
      const newSongs = result.list.filter(m => !existingIds.has(m.id))
      musicList.value.push(...newSongs)
      currentPage.value = nextPage
      hasMore.value = result.hasMore
    } else {
      hasMore.value = false
    }
  } catch (e) {
    console.warn('loadMore failed:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function stopAudio() {
  if (audio) {
    audio.stop()
    audio.destroy()
    audio = null
  }
  isPlaying.value = false
  progressPercent.value = 0
  currentTimeText.value = '00:00'
  durationText.value = '00:00'
}

const goBack = () => {
  stopAudio()
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

const handleUpload = () => {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['audio'],
    success: (res: any) => {
      const file = res.tempFiles[0]
      const newSong: Music = {
        id: Date.now(),
        name: file.name || '本地音乐',
        hot: false,
        tag: '本地上传',
        src: file.tempFilePath,
      }
      uploadedSongs.value.push(newSong)
      saveUploadedSongs()
      uni.showToast({ title: '上传成功', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '暂未选择文件', icon: 'none' })
    },
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['.mp3', '.wav', '.m4a', '.aac', '.flac'],
    success: (res: any) => {
      const tempPath = res.tempFilePaths?.[0] || res.tempFiles?.[0]?.path
      if (tempPath) {
        const newSong: Music = {
          id: Date.now(),
          name: '本地音乐',
          hot: false,
          tag: '本地上传',
          src: tempPath,
        }
        uploadedSongs.value.push(newSong)
        saveUploadedSongs()
        uni.showToast({ title: '上传成功', icon: 'success' })
      }
    },
    fail: () => {
      uni.showToast({ title: '暂未选择文件', icon: 'none' })
    },
  })
  // #endif
}

const handleSelectSong = (song: Music, idx: number) => {
  haptic('light')
  stopAudio()
  if (!song.src) {
    uni.showToast({ title: '该歌曲暂无音频源', icon: 'none' })
    return
  }
  currentSongIndex.value = idx

  audio = uni.createInnerAudioContext()
  audio.src = song.src
  audio.autoplay = true
  isPlaying.value = true

  audio.onCanplay(() => {
    if (audio) {
      const dur = audio.duration
      if (dur && isFinite(dur)) {
        const min = String(Math.floor(dur / 60)).padStart(2, '0')
        const sec = String(Math.floor(dur % 60)).padStart(2, '0')
        durationText.value = `${min}:${sec}`
      }
    }
  })

  audio.onTimeUpdate(() => {
    if (audio) {
      const dur = audio.duration
      if (dur && isFinite(dur)) {
        const pct = (audio.currentTime / dur) * 100
        progressPercent.value = Math.min(pct, 100)
        const totalSec = Math.floor(audio.currentTime)
        const min = String(Math.floor(totalSec / 60)).padStart(2, '0')
        const sec = String(totalSec % 60).padStart(2, '0')
        currentTimeText.value = `${min}:${sec}`
      }
    }
  })

  audio.onError(() => {
    uni.showToast({ title: '播放失败', icon: 'none' })
    stopAudio()
  })

  audio.onEnded(() => {
    stopAudio()
  })
}

const handleUseSong = (song: Music) => {
  haptic('light')
  if (!song.src) {
    uni.showToast({ title: '该歌曲暂无音频源', icon: 'none' })
    return
  }
  templateStore.setSelectedMusic(song.id)
  uni.showToast({ title: '已选用该音乐', icon: 'success' })
}

const togglePlay = () => {
  if (!audio || currentSongIndex.value === null) return
  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    audio.play()
    isPlaying.value = true
  }
}

onMounted(() => {
  // 从页面参数读取标题
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  if (options.title) {
    pageTitle.value = decodeURIComponent(options.title)
  }
  loadUploadedSongs()
  loadMusic()
})

const seekProgress = (e: any) => {
  if (!audio) return
  uni.createSelectorQuery().select('.progress-bar').boundingClientRect((rect: any) => {
    if (!rect) return
    const x = e.detail?.x || e.changedTouches?.[0]?.clientX || 0
    const pct = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100))
    progressPercent.value = pct
    if (audio && audio.duration && isFinite(audio.duration)) {
      audio.seek((pct / 100) * audio.duration)
    }
  }).exec()
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style lang="scss" scoped>
.music-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.music-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: #fff;
  flex-shrink: 0;
}

.header-back {
  min-width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.header-upload {
  min-width: 120rpx;
  text-align: right;
}

.upload-text {
  font-size: 26rpx;
  color: #e84a6e;
  font-weight: 500;
}

.music-tags {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  padding: 0 32rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  background: #f5f5f5;

  &.active {
    background: #e84a6e;
    .tag-text { color: #fff; }
  }
}

.tag-text {
  font-size: 26rpx;
  color: #666;
}

/* 搜索框 */
.music-search-bar {
  padding: 16rpx 32rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.music-search-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 12rpx 24rpx;
}

.music-search-icon {
  font-size: 28rpx;
  color: #999;
  margin-right: 12rpx;
}

.music-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  height: 44rpx;
  line-height: 44rpx;
}

.music-search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
}

.music-clear-icon {
  font-size: 36rpx;
  color: #bbb;
  line-height: 1;
}

.music-list {
  flex: 1;
  padding: 16rpx 0;
  overflow-y: auto;
}

.music-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  margin-bottom: 12rpx;

  &.is-using {
    background: #fff5f5;
    .music-name { color: #e84a6e; }
  }

  &.is-playing {
    background: #fff8f0;
    .music-name { color: #e84a6e; }
  }

  &:active { background: #fafafa; }
}

.music-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff0f5;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.icon-text { font-size: 32rpx; }

.music-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.music-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.music-hot {
  font-size: 18rpx;
  color: #fff;
  background: #e84a6e;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.music-using {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  background: #ffe4e8;
  border-radius: 20rpx;
  border: 1rpx solid #ffc0cb;
}

.using-text {
  font-size: 22rpx;
  color: #e84a6e;
  font-weight: 500;
}

.music-use-btn {
  flex-shrink: 0;
  padding: 10rpx 28rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.25);
  transition: transform 0.2s ease;
}

.music-use-btn:active {
  transform: scale(0.92);
}

.use-btn-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  text-align: center;
  padding: 32rpx;
  color: #e84a6e;
  font-size: 26rpx;
}

.loading-spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid rgba(232, 74, 110, 0.2);
  border-top-color: #e84a6e;
  border-radius: 50%;
  animation: musicSpin 0.6s linear infinite;
}

@keyframes musicSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 32rpx;
  gap: 16rpx;
}

.search-empty-icon {
  font-size: 56rpx;
  opacity: 0.5;
}

.search-empty-text {
  font-size: 28rpx;
  color: #999999;
}

.music-player {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  gap: 16rpx;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.vinyl-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #222 0%, #444 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-emoji { font-size: 24rpx; }

.player-name {
  font-size: 26rpx;
  color: #333;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-dot {
  width: 16rpx;
  height: 16rpx;
  background: #fff;
  border-radius: 50%;
  border: 2rpx solid #e84a6e;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2rpx 4rpx rgba(232, 74, 110, 0.3);
  transition: left 0.3s ease;
}

.time-text {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
  min-width: 120rpx;
  text-align: right;
}
</style>
