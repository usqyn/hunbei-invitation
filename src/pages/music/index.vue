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

    <view class="music-tabs">
      <view
        v-for="tab in tabList"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        <text class="tab-text">{{ tab.name }}</text>
        <view v-if="currentTab === tab.key" class="tab-underline"></view>
      </view>
    </view>

    <scroll-view class="music-list" scroll-y>
      <view
        v-for="(song, idx) in filteredMusicList"
        :key="idx"
        class="music-item"
        :class="{ 'is-using': currentSongIndex === idx }"
        @click="handleSelectSong(idx)"
      >
        <view class="music-icon">
          <text class="icon-text">🎵</text>
        </view>
        <view class="music-info">
          <text class="music-name">{{ song.name }}</text>
          <text v-if="song.isHot" class="music-hot">HOT</text>
        </view>
        <view v-if="currentSongIndex === idx" class="music-using">
          <text class="using-text">使用中</text>
        </view>
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
import { ref, computed, onUnmounted } from 'vue'
import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()

const currentTab = ref('all')
const currentSongIndex = ref<number | null>(null)
const isPlaying = ref(false)
const progressPercent = ref(0)
const currentTimeText = ref('00:00')
const durationText = ref('00:00')

let audio: UniApp.InnerAudioContext | null = null

const tabList = ref([
  { key: 'all', name: '全部' },
  { key: 'happy', name: '欢快' },
  { key: 'quiet', name: '安静' },
  { key: 'douyin', name: '抖音' },
])

const musicList = ref([
  { id: 1, name: '告白气球', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=426342151.mp3' },
  { id: 2, name: '我们结婚啦', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 3, name: '执子之手', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=1940188978.mp3' },
  { id: 4, name: "It's You", isHot: true, category: 'quiet', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 5, name: '我是如此相信', isHot: true, category: 'quiet', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 6, name: '就是爱你', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 7, name: '因你而在', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 8, name: 'Lucky Me', isHot: true, category: 'douyin', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 9, name: '繁花', isHot: true, category: 'quiet', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
  { id: 10, name: '爱你', isHot: true, category: 'happy', src: 'https://music.163.com/song/media/outer/url?id=483671299.mp3' },
])

const filteredMusicList = computed(() => {
  if (currentTab.value === 'all') return musicList.value
  return musicList.value.filter(s => s.category === currentTab.value)
})

const currentSong = computed(() => {
  if (currentSongIndex.value !== null && currentSongIndex.value < filteredMusicList.value.length) {
    return filteredMusicList.value[currentSongIndex.value]
  }
  return null
})

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
  uni.navigateBack()
}

const handleUpload = () => {
  uni.chooseMedia({
    count: 1,
    mediaType: ['audio'],
    success: (res) => {
      const file = res.tempFiles[0]
      musicList.value.push({ id: Date.now(), name: file.name || '本地音乐', isHot: false, category: 'all', src: file.tempFilePath })
      uni.showToast({ title: '上传成功', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '暂未选择文件', icon: 'none' })
    }
  })
}

const handleSelectSong = (idx: number) => {
  stopAudio()
  const song = filteredMusicList.value[idx]
  if (!song) return
  currentSongIndex.value = idx
  templateStore.setSelectedMusic(song.id)
  if (!song.src) {
    uni.showToast({ title: '该歌曲暂无音频源', icon: 'none' })
    return
  }
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

const seekProgress = (e: any) => {
  if (!audio) return
  const rect = e.target.getBoundingClientRect?.() || { left: 0, width: 300 }
  const x = e.detail?.x || e.changedTouches?.[0]?.clientX || 0
  const pct = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100))
  progressPercent.value = pct
  if (audio.duration && isFinite(audio.duration)) {
    audio.seek((pct / 100) * audio.duration)
  }
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

.music-tabs {
  display: flex;
  background: #fff;
  padding: 0 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  position: relative;

  &.active {
    .tab-text {
      color: #e84a6e;
      font-weight: 600;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: #666;
}

.tab-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #e84a6e;
  border-radius: 2rpx;
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

    .music-name {
      color: #e84a6e;
    }
  }

  &:active {
    background: #fafafa;
  }
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

.icon-text {
  font-size: 32rpx;
}

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

.vinyl-emoji {
  font-size: 24rpx;
}

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
  cursor: pointer;
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
