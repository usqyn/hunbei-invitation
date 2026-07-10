<template>
  <view class="music-page">
    <view class="music-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">音乐库</text>
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

    <scroll-view class="music-list" scroll-y @scrolltolower="loadMore">
      <view
        v-for="(song, idx) in filteredMusicList"
        :key="song.id"
        class="music-item"
        :class="{ 'is-using': selectedMusicId === song.id }"
        @click="handleSelectSong(song, idx)"
      >
        <view class="music-icon">
          <text class="icon-text">🎵</text>
        </view>
        <view class="music-info">
          <text class="music-name">{{ song.name }}</text>
          <text v-if="song.hot" class="music-hot">HOT</text>
        </view>
        <view v-if="selectedMusicId === song.id" class="music-using">
          <text class="using-text">使用中</text>
        </view>
      </view>
      <view v-if="loading" class="loading-text">加载中...</view>
      <view v-else-if="loadingMore" class="loading-text">加载中...</view>
      <view v-else-if="!hasMore && musicList.length > 0" class="loading-text">没有更多了</view>
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
import { MUSIC_TAGS, fetchMusicFromApi } from '@/constants/music'
import { useGoBack } from '@/composables/useGoBack'
import type { Music } from '@/types'

const templateStore = useTemplateStore()

const PAGE_SIZE = 20
const currentTag = ref('全部')
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

let audio: UniApp.InnerAudioContext | null = null

const filteredMusicList = computed(() => {
  if (currentTag.value === '全部') return musicList.value
  return musicList.value.filter(s => s.tag === currentTag.value)
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
  const result = await fetchMusicFromApi(undefined, 1, PAGE_SIZE)
  musicList.value = result.list
  hasMore.value = result.hasMore
  loading.value = false
}

async function switchTag(tag: string) {
  currentTag.value = tag
  loading.value = true
  currentPage.value = 1
  hasMore.value = true
  const result = await fetchMusicFromApi(tag, 1, PAGE_SIZE)
  musicList.value = result.list
  hasMore.value = result.hasMore
  loading.value = false
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const nextPage = currentPage.value + 1
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
  loadingMore.value = false
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
      musicList.value.push({
        id: Date.now(),
        name: file.name || '本地音乐',
        hot: false,
        tag: '本地上传',
        src: file.tempFilePath,
      })
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
        musicList.value.push({
          id: Date.now(),
          name: '本地音乐',
          hot: false,
          tag: '本地上传',
          src: tempPath,
        })
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
  stopAudio()
  if (!song.src) {
    uni.showToast({ title: '该歌曲暂无音频源', icon: 'none' })
    return
  }
  currentSongIndex.value = idx
  templateStore.setSelectedMusic(song.id)

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

.loading-text {
  text-align: center;
  padding: 32rpx;
  color: #999;
  font-size: 26rpx;
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
