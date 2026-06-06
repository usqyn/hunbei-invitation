<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">音乐库</view>
      <view class="header-right">
        <view class="search-btn" @click="showSearch = !showSearch">
          <text class="btn-icon">🔍</text>
        </view>
      </view>
    </view>

    <view v-if="showSearch" class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          placeholder="搜索歌曲" 
          v-model="searchText"
          @input="onSearch"
        />
        <text v-if="searchText" class="clear-icon" @click="clearSearch">✕</text>
      </view>
    </view>

    <view class="tabs">
      <view 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <text class="tab-text">{{ tab.name }}</text>
      </view>
    </view>

    <view class="filter-tags">
      <scroll-view scroll-x class="tags-scroll">
        <view class="tags-list">
          <view 
            v-for="tag in tags" 
            :key="tag"
            class="tag-item"
            :class="{ active: activeTag === tag }"
            @click="activeTag = tag"
          >
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view class="music-list" scroll-y>
      <view v-if="currentMusic" class="current-music">
        <view class="playing-icon">🎵</view>
        <text class="music-name">{{ currentMusic.name }}</text>
        <view class="music-badge">使用中</view>
        <view class="check-icon">✓</view>
      </view>

      <view v-if="filteredMusicList.length === 0" class="empty-state">
        <text class="empty-text">暂无音乐</text>
      </view>

      <view 
        v-for="music in filteredMusicList" 
        :key="music.id"
        class="music-item"
        @click="selectMusic(music)"
      >
        <view class="music-info">
          <text class="music-name">{{ music.name }}</text>
        </view>
        <view v-if="music.hot" class="hot-badge">HOT</view>
        <view class="select-icon" :class="{ selected: selectedMusic === music.id }">
          <text v-if="selectedMusic === music.id">✓</text>
        </view>
      </view>
    </scroll-view>

    <view class="player-bar">
      <view class="vinyl" :class="{ spinning: isPlaying }">
        <view class="vinyl-inner">
          <text class="player-btn" @click="togglePlay">{{ isPlaying ? '❚❚' : '▶' }}</text>
        </view>
      </view>
      <view class="player-info">
        <text class="player-name">{{ currentMusic?.name || '未选择音乐' }}</text>
        <view class="progress-bar" @click="seekTo">
          <view class="progress-fill" :style="{ width: progress + '%' }"></view>
          <view class="progress-thumb" :style="{ left: progress + '%' }"></view>
        </view>
        <view class="time-info">
          <text class="current-time">{{ formatTime(currentTime) }}</text>
          <text class="total-time">{{ formatTime(totalTime) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('music')
const activeTag = ref('全部')
const selectedMusic = ref(1)
const isPlaying = ref(true)
const progress = ref(5)
const currentTime = ref(2)
const totalTime = ref(169)
const showSearch = ref(false)
const searchText = ref('')

const tabs = [
  { key: 'music', name: '音乐库' },
  { key: 'local', name: '本地上传' }
]

const tags = ['全部', '欢快', '安静', '抖音', '纯音乐']

const currentMusic = ref({
  id: 1,
  name: 'Lucky Me-Jake Miller'
})

const musicList = ref([
  { id: 2, name: '告白气球', hot: true, tag: '欢快' },
  { id: 3, name: '我们结婚啦（恶作剧之吻原声）', hot: true, tag: '欢快' },
  { id: 4, name: '执子之手-宝石Gem、一哩哩一', hot: true, tag: '欢快' },
  { id: 5, name: "It's You-HENRY刘宪华", hot: true, tag: '安静' },
  { id: 6, name: '我是如此相信', hot: true, tag: '安静' },
  { id: 7, name: '就是爱你', hot: false, tag: '安静' },
  { id: 8, name: '因你而在-林俊杰', hot: false, tag: '抖音' },
  { id: 9, name: 'Lucky Me-Jake Miller', hot: false, tag: '纯音乐' },
  { id: 10, name: '繁花（剪辑版）', hot: false, tag: '纯音乐' },
  { id: 11, name: '爱你', hot: true, tag: '抖音' },
  { id: 12, name: '往后余生', hot: false, tag: '安静' },
  { id: 13, name: '小幸运', hot: true, tag: '欢快' },
  { id: 14, name: '最美的期待', hot: false, tag: '抖音' },
  { id: 15, name: '刚好遇见你', hot: false, tag: '欢快' }
])

const filteredMusicList = computed(() => {
  let result = musicList.value
  
  if (activeTag.value !== '全部') {
    result = result.filter(m => m.tag === activeTag.value)
  }
  
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(m => m.name.toLowerCase().includes(keyword))
  }
  
  return result
})

const goBack = () => {
  uni.navigateBack()
}

const selectMusic = (music: any) => {
  selectedMusic.value = music.id
  currentMusic.value = music
  totalTime.value = Math.floor(Math.random() * 180) + 120
  currentTime.value = 0
  progress.value = 0
  isPlaying.value = true
  uni.showToast({ title: '已选择: ' + music.name, icon: 'none' })
}

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const onSearch = () => {}

const clearSearch = () => {
  searchText.value = ''
}

const seekTo = (e: any) => {
  const touchX = e.touches ? e.touches[0].clientX : e.clientX
  const containerWidth = e.currentTarget.offsetWidth
  const percent = (touchX / containerWidth) * 100
  progress.value = Math.min(100, Math.max(0, percent))
  currentTime.value = Math.floor((progress.value / 100) * totalTime.value)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #ffffff;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 60rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  gap: 20rpx;
}

.search-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 40rpx;
}

.search-bar {
  background: #ffffff;
  padding: 15rpx 30rpx;
  border-bottom: 1px solid #eee;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 15rpx 25rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 15rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
}

.clear-icon {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx;
}

.tabs {
  display: flex;
  background: #ffffff;
  padding: 0 30rpx;
  gap: 60rpx;
  border-bottom: 1px solid #eee;
}

.tab-item {
  padding: 25rpx 0;
  position: relative;

  &.active {
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6rpx;
      background: #e84a6e;
      border-radius: 3rpx;
    }
  }
}

.tab-text {
  font-size: 34rpx;
  font-weight: 500;

  .active & {
    color: #e84a6e;
  }
}

.filter-tags {
  background: #ffffff;
  padding: 20rpx 0;
}

.tags-scroll {
  white-space: nowrap;
}

.tags-list {
  display: inline-flex;
  gap: 20rpx;
  padding: 0 30rpx;
}

.tag-item {
  padding: 15rpx 30rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  border: 2rpx solid transparent;

  &.active {
    background: #ffe4e8;
    border-color: #e84a6e;
  }
}

.tag-text {
  font-size: 28rpx;
  color: #666;

  .active & {
    color: #e84a6e;
    font-weight: 500;
  }
}

.music-list {
  flex: 1;
  height: 0;
  padding: 20rpx;
  padding-bottom: 180rpx;
}

.current-music {
  display: flex;
  align-items: center;
  padding: 25rpx;
  background: #fff0f3;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.playing-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.music-name {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.music-badge {
  background: #e84a6e;
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  margin-right: 20rpx;
}

.check-icon {
  color: #e84a6e;
  font-size: 32rpx;
  font-weight: bold;
}

.empty-state {
  padding: 100rpx;
  text-align: center;
}

.empty-text {
  font-size: 30rpx;
  color: #999;
}

.music-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 15rpx;
}

.music-info {
  flex: 1;
}

.hot-badge {
  background: #ff6b8a;
  color: #fff;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  margin-right: 20rpx;
}

.select-icon {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;

  &.selected {
    background: #e84a6e;
    border-color: #e84a6e;
    color: #fff;
    font-size: 24rpx;
  }
}

.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 20rpx;
  border-top: 1px solid #eee;
}

.vinyl {
  width: 100rpx;
  height: 100rpx;
  background: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 10rpx;
    border: 3rpx solid rgba(255,255,255,0.1);
    border-radius: 50%;
  }

  &.spinning {
    animation: spin 3s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-inner {
  width: 60rpx;
  height: 60rpx;
  background: #e84a6e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-btn {
  font-size: 24rpx;
  color: #fff;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.player-name {
  font-size: 28rpx;
  color: #333;
}

.progress-bar {
  height: 8rpx;
  background: #eee;
  border-radius: 4rpx;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e84a6e, #ff6b8a);
  border-radius: 4rpx;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20rpx;
  height: 20rpx;
  background: #e84a6e;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2);
}

.time-info {
  display: flex;
  justify-content: space-between;
}

.current-time, .total-time {
  font-size: 22rpx;
  color: #999;
}
</style>