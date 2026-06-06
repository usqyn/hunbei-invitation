<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">编辑器</view>
      <view class="header-right">
        <view class="header-btn" @click="handleShare">
          <text class="btn-icon">🔗</text>
        </view>
        <view class="header-btn" @click="handleMore">
          <text class="btn-icon">⋯</text>
        </view>
      </view>
    </view>

    <view class="editor-main">
      <scroll-view class="canvas-scroll" scroll-y>
        <view class="canvas-container">
          <view class="canvas-preview">
            <view class="page-content">
              <!-- 封面板块 -->
              <view class="section cover-section">
                <image class="cover-image" :src="templateData.coverImage" mode="aspectFill"></image>
                <view class="cover-overlay">
                  <text class="shuangxi-decor">囍</text>
                  <text class="cover-title">我们结婚啦</text>
                  <text class="cover-subtitle">Welcome to our wedding</text>
                </view>
              </view>

              <!-- 新人信息板块 -->
              <view class="section couple-info-section">
                <view class="couple-info-content">
                  <view class="person-info">
                    <text class="person-name">{{ basicInfo.groomName || '满小满' }}</text>
                    <text class="person-role">新郎</text>
                  </view>
                  <text class="heart-divider">♥</text>
                  <view class="person-info">
                    <text class="person-name">{{ basicInfo.brideName || '美小美' }}</text>
                    <text class="person-role">新娘</text>
                  </view>
                </view>
                <text class="wedding-date">{{ basicInfo.weddingDate || '2050/05/20' }}</text>
              </view>

              <!-- 爱情故事板块 -->
              <view class="section story-section">
                <text class="story-text">我们始终相信</text>
                <text class="story-text">最好的爱情一定是双向奔赴</text>
                <text class="story-text">在纯净通透的光彩中相遇</text>
                <text class="story-text">拾起每一秒爱的记忆</text>
                <text class="story-text">我们决定携手共赴爱之旅</text>
                <text class="story-text">诚挚邀请最挚爱的亲友</text>
                <text class="story-text">来一场关于爱的旅行</text>
                <text class="story-text">见证我们爱的启程</text>
              </view>

              <!-- 照片板块1 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo1" mode="aspectFill"></image>
                <view class="photo-text-overlay">
                  <text class="photo-title">不早不晚</text>
                  <text class="photo-subtitle">刚好是你</text>
                </view>
              </view>

              <!-- 装饰分割线 -->
              <view class="section decor-section">
                <text class="decor-text">—— M & M ——</text>
              </view>

              <!-- 照片板块2 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo2" mode="aspectFill"></image>
              </view>

              <!-- 爱情语录板块 -->
              <view class="section quote-section">
                <text class="quote-text">爱，让我和你，变成了我们</text>
                <text class="quote-text">让所有的「今天」，变成了「最好的一天」</text>
              </view>

              <!-- 红色装饰标题 -->
              <view class="section red-title-section">
                <text class="red-title">我们有的是以后</text>
                <text class="red-title-small">以后都是我们</text>
              </view>

              <!-- 照片板块3 -->
              <view class="section photo-section photo-with-decor">
                <image class="photo-image" :src="templateData.photo3" mode="aspectFill"></image>
                <view class="decor-element flower-decor">💐</view>
                <view class="decor-element love-decor">LOVE</view>
              </view>

              <!-- 浪漫语录板块 -->
              <view class="section romantic-quote-section">
                <text class="romantic-text">你不是爱情的终点，只是爱情的原动力</text>
                <text class="romantic-text">我将这爱情献给路旁的花朵</text>
                <text class="romantic-text">献给玻璃酒杯里摇晃着的晶亮阳光</text>
                <text class="romantic-text">献给教堂的红色圆顶</text>
                <text class="romantic-text">因为你，我爱上了这个世界</text>
              </view>

              <!-- 照片板块4 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo4" mode="aspectFill"></image>
              </view>

              <!-- 甜蜜语录板块 -->
              <view class="section sweet-quote-section">
                <text class="sweet-text">🍬 你说最好的人会到身边</text>
                <text class="sweet-text">此刻我也这样想</text>
                <text class="sweet-text">幸福放慢倍数，这一帧只属于我们 🍬</text>
                <text class="sweet-text">🍬 是我文案里的主角，是我故事里的人</text>
              </view>

              <!-- 倒计时板块 -->
              <view class="section countdown-section">
                <view class="countdown-box">
                  <text class="countdown-num">{{ countdown.days }}</text>
                  <text class="countdown-label">天</text>
                </view>
                <view class="countdown-box">
                  <text class="countdown-num">{{ countdown.hours }}</text>
                  <text class="countdown-label">时</text>
                </view>
                <view class="countdown-box">
                  <text class="countdown-num">{{ countdown.minutes }}</text>
                  <text class="countdown-label">分</text>
                </view>
                <view class="countdown-box">
                  <text class="countdown-num">{{ countdown.seconds }}</text>
                  <text class="countdown-label">秒</text>
                </view>
              </view>

              <!-- 照片板块5 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo5" mode="aspectFill"></image>
                <view class="photo-text-overlay">
                  <text class="photo-title">欢迎参加</text>
                  <text class="photo-subtitle">我们的婚礼</text>
                </view>
              </view>

              <!-- 邀请语录板块 -->
              <view class="section invitation-quote-section">
                <text class="invitation-text">本着结婚对于我们来说是开心和重要的事儿</text>
                <text class="invitation-text">希望各位朋友能够一起见证</text>
                <text class="invitation-text">所以想把这份开心分享给各位朋友</text>
              </view>

              <!-- 囍字装饰板块 -->
              <view class="section shuangxi-decor-section">
                <text class="big-shuangxi">囍</text>
                <text class="welcome-text">WELCOME TO</text>
                <text class="welcome-text">OUR WEDDING</text>
              </view>

              <!-- 照片板块6 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo6" mode="aspectFill"></image>
              </view>

              <!-- 日历板块 -->
              <view class="section calendar-section">
                <view class="calendar-header">
                  <text class="calendar-month">09/14</text>
                  <text class="calendar-year">2027</text>
                </view>
                <view class="calendar-weekdays">
                  <text class="weekday">一</text>
                  <text class="weekday">二</text>
                  <text class="weekday">三</text>
                  <text class="weekday">四</text>
                  <text class="weekday">五</text>
                  <text class="weekday">六</text>
                  <text class="weekday">日</text>
                </view>
                <view class="calendar-days">
                  <text class="calendar-day">1</text>
                  <text class="calendar-day">2</text>
                  <text class="calendar-day">3</text>
                  <text class="calendar-day">4</text>
                  <text class="calendar-day">5</text>
                  <text class="calendar-day">6</text>
                  <text class="calendar-day">7</text>
                  <text class="calendar-day">8</text>
                  <text class="calendar-day">9</text>
                  <text class="calendar-day">10</text>
                  <text class="calendar-day">11</text>
                  <text class="calendar-day">12</text>
                  <text class="calendar-day highlight-day">13</text>
                  <text class="calendar-day">14</text>
                  <text class="calendar-day">15</text>
                  <text class="calendar-day">16</text>
                  <text class="calendar-day">17</text>
                  <text class="calendar-day">18</text>
                  <text class="calendar-day">19</text>
                  <text class="calendar-day">20</text>
                </view>
              </view>

              <!-- 照片板块7 -->
              <view class="section photo-section">
                <image class="photo-image" :src="templateData.photo7" mode="aspectFill"></image>
              </view>

              <!-- 地址信息板块 -->
              <view class="section address-section">
                <text class="address-label">📍 ADDRESS</text>
                <text class="address-detail">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
              </view>

              <!-- 地图板块 -->
              <view class="section map-section" @click="handleLocation">
                <view class="map-placeholder">
                  <text class="map-text">{{ basicInfo.location || '点击选择位置' }}</text>
                  <view class="map-marker">📍</view>
                </view>
              </view>

              <!-- 婚礼信息板块 -->
              <view class="section wedding-info-section">
                <view class="info-item">
                  <text class="info-icon">🔴</text>
                  <view class="info-content">
                    <text class="info-label">婚礼时间</text>
                    <text class="info-value">{{ basicInfo.weddingDate || '2050年5月20日 星期六' }}</text>
                    <text class="info-value">农历四月廿三 12:00PM</text>
                  </view>
                </view>
                <view class="info-item">
                  <text class="info-icon">🔴</text>
                  <view class="info-content">
                    <text class="info-label">婚礼地点</text>
                    <text class="info-value">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
                  </view>
                </view>
              </view>

              <!-- 浪漫语录板块 -->
              <view class="section final-romantic-section">
                <text class="final-romantic-text">漫长人生零零碎碎的普通又温暖</text>
                <text class="final-romantic-text">在爱情中，我用最浪漫的方式登场</text>
                <text class="final-romantic-text">💐 最惊艳的样子亮相 💐</text>
                <text class="final-romantic-text">成为往后你人生中的</text>
                <text class="final-romantic-text">细水长流 携手同行的那个人</text>
              </view>

              <!-- 照片板块8 -->
              <view class="section photo-section final-photo-section">
                <image class="photo-image" :src="templateData.photo8" mode="aspectFill"></image>
              </view>

              <!-- 签到板块 -->
              <view class="section signin-section">
                <text class="signin-title">好久不见</text>
                <text class="signin-subtitle">婚礼见~</text>
                <view class="signin-form">
                  <input class="signin-input" placeholder="姓名" v-model="signinForm.name" />
                  <input class="signin-input" placeholder="出席人数" v-model="signinForm.count" />
                  <button class="signin-btn" @click="handleSignin">提交</button>
                </view>
              </view>

              <!-- 底部囍字板块 -->
              <view class="section bottom-shuangxi-section">
                <text class="bottom-shuangxi">囍</text>
                <text class="bottom-couple">{{ basicInfo.groomName || '满' }} & {{ basicInfo.brideName || '美' }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="right-panel">
        <scroll-view class="panel-scroll" scroll-y>
          <view class="panel-tabs">
            <view 
              v-for="tab in panelTabs" 
              :key="tab.key"
              class="panel-tab-item"
              :class="{ active: activePanelTab === tab.key }"
              @click="activePanelTab = tab.key"
            >
              <text class="tab-icon">{{ tab.icon }}</text>
              <text class="tab-text">{{ tab.name }}</text>
            </view>
          </view>

          <view v-if="activePanelTab === 'edit'" class="edit-panel">
            <view class="panel-section">
              <view class="section-header">
                <text class="section-title">修改对应内容</text>
              </view>

              <view class="element-list">
                <view 
                  v-for="(element, idx) in editableElements" 
                  :key="idx"
                  class="element-item"
                  :class="{ selected: selectedElement === idx }"
                  @click="openEditor(idx)"
                >
                  <view v-if="element.type === 'image'" class="element-preview">
                    <image class="preview-img" :src="element.text" mode="aspectFill"></image>
                    <view class="replace-icon">🔄</view>
                  </view>
                  <view v-else-if="element.type === 'basic'" class="element-text-preview">
                    <text class="preview-text">{{ element.text }}</text>
                    <text class="element-tag">基本信息</text>
                  </view>
                  <view v-else class="element-text-preview">
                    <text class="preview-text">{{ element.text }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-if="activePanelTab === 'material'" class="material-panel">
            <view class="panel-section">
              <view class="section-header">
                <text class="section-title">素材库</text>
              </view>
              <view class="material-grid">
                <view 
                  v-for="(material, idx) in materialList" 
                  :key="idx"
                  class="material-item"
                  @click="selectMaterial(material)"
                >
                  <image class="material-img" :src="material.url" mode="aspectFill"></image>
                  <text class="material-name">{{ material.name }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="activePanelTab === 'text'" class="text-panel">
            <view class="panel-section">
              <view class="section-header">
                <text class="section-title">文字样式</text>
              </view>
              <view class="style-options">
                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">𝔗</text>
                    <text class="label-text">字体</text>
                  </view>
                  <view class="style-value" @click="showFontPicker">
                    <text class="value-text">{{ currentFont }}</text>
                    <text class="arrow">›</text>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">🖊</text>
                    <text class="label-text">字体颜色</text>
                  </view>
                  <view class="style-value" @click="showColorPicker">
                    <view class="color-preview" :style="{ background: currentColor }"></view>
                    <text class="arrow">›</text>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">Aa</text>
                    <text class="label-text">字体大小</text>
                  </view>
                  <view class="font-size-controls">
                    <view class="size-btn" @click="decreaseSize">—</view>
                    <text class="size-value">{{ currentFontSize }}</text>
                    <view class="size-btn" @click="increaseSize">+</view>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">⫿</text>
                    <text class="label-text">字符间距</text>
                  </view>
                  <view class="font-size-controls">
                    <view class="size-btn" @click="decreaseSpacing">—</view>
                    <text class="size-value">{{ currentSpacing }}</text>
                    <view class="size-btn" @click="increaseSpacing">+</view>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">Ā</text>
                    <text class="label-text">行间距</text>
                  </view>
                  <view class="font-size-controls">
                    <view class="size-btn" @click="decreaseLineHeight">—</view>
                    <text class="size-value">{{ currentLineHeight }}</text>
                    <view class="size-btn" @click="increaseLineHeight">+</view>
                  </view>
                </view>

                <view class="reset-btn" @click="resetStyle">
                  <text class="reset-text">还原</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="activePanelTab === 'settings'" class="settings-panel">
            <view class="panel-section">
              <view class="section-header">
                <text class="section-title">作品设置</text>
              </view>
              <view class="settings-list">
                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">开启弹幕工具栏</text>
                    <text class="setting-desc">关闭后，天鹅婚礼工具栏、祝福互动功能将关闭相关功能</text>
                  </view>
                  <switch :checked="settings.danmaku" @change="toggleSetting('danmaku')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼物相册</text>
                  </view>
                  <switch :checked="settings.giftAlbum" @change="toggleSetting('giftAlbum')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼物购买</text>
                  </view>
                  <switch :checked="settings.giftBuy" @change="toggleSetting('giftBuy')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼金功能</text>
                  </view>
                  <switch :checked="settings.moneyGift" @change="toggleSetting('moneyGift')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">点赞功能</text>
                  </view>
                  <switch :checked="settings.like" @change="toggleSetting('like')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">相册功能</text>
                    <text class="setting-desc">打开后可查看宾客在邀请函中使用的相册</text>
                  </view>
                  <switch :checked="settings.album" @change="toggleSetting('album')" color="#e84a6e" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bottom-btn" @click="handleMusic">
        <text class="btn-icon">🎵</text>
        <text class="btn-text">音乐</text>
      </view>
      <view class="bottom-btn" @click="handleSettings">
        <text class="btn-icon">⚙️</text>
        <text class="btn-text">设置</text>
      </view>
      <view class="bottom-btn" @click="handleSave">
        <view class="save-icon-wrapper">
          <text class="btn-icon">💾</text>
          <text class="save-check">✓</text>
        </view>
        <text class="btn-text">保存</text>
      </view>
      <button class="preview-btn" @click="handlePreviewShare">预览分享</button>
    </view>

    <view v-if="showBasicInfoEditor" class="basic-info-popup" @click="closeBasicInfoEditor">
      <view class="basic-info-content" @click.stop>
        <view class="basic-info-header">
          <view class="back-btn-small" @click="closeBasicInfoEditor">
            <text class="back-icon-small">‹</text>
          </view>
          <text class="basic-info-title">完善基本信息</text>
          <view class="confirm-btn-small" @click="confirmBasicInfo">
            <text class="confirm-icon">✓</text>
          </view>
        </view>

        <scroll-view class="basic-info-scroll" scroll-y>
          <view class="form-list">
            <view class="form-item">
              <view class="form-label">
                <text class="required-mark">*</text>
                <text class="label-text">新郎姓名</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="请输入新郎真实姓名" 
                  v-model="basicInfo.groomName"
                  maxlength="30"
                />
                <text class="char-count">{{ basicInfo.groomName?.length || 0 }}/30</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="required-mark">*</text>
                <text class="label-text">新娘姓名</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="请输入新娘真实姓名" 
                  v-model="basicInfo.brideName"
                  maxlength="30"
                />
                <text class="char-count">{{ basicInfo.brideName?.length || 0 }}/30</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">婚礼时间</text>
              </view>
              <view class="form-input-wrapper" @click="showDatePicker = true">
                <input 
                  class="form-input" 
                  placeholder="选择婚礼时间" 
                  :value="basicInfo.weddingDate"
                  disabled
                />
                <text class="arrow-right">›</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">位置导航</text>
              </view>
              <view class="form-input-wrapper" @click="handleLocation">
                <input 
                  class="form-input" 
                  placeholder="搜索定位导航位置" 
                  :value="basicInfo.location"
                  disabled
                />
                <view class="location-btn">
                  <text class="location-icon">📍</text>
                  <text class="location-text">定位</text>
                </view>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">详细地址</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="例：婚贝大酒店9F幸福宴会厅" 
                  v-model="basicInfo.detailAddress"
                  maxlength="100"
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="showTextEditor" class="text-editor-popup" @click="closeTextEditor">
      <view class="editor-content" @click.stop>
        <view class="editor-header">
          <text class="close-btn" @click="closeTextEditor">✕</text>
          <text class="editor-title">修改文字</text>
          <text class="confirm-btn" @click="confirmTextEdit">✓</text>
        </view>

        <view class="text-area">
          <textarea 
            class="text-input" 
            :value="editingText"
            @input="onTextInput"
            :maxlength="500"
          ></textarea>
        </view>

        <view class="style-options">
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">𝔗</text>
              <text class="label-text">字体</text>
            </view>
            <view class="style-value" @click="showFontPicker">
              <text class="value-text">{{ currentFont }}</text>
              <text class="arrow">›</text>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">🖊</text>
              <text class="label-text">字体颜色</text>
            </view>
            <view class="style-value" @click="showColorPicker">
              <view class="color-preview" :style="{ background: currentColor }"></view>
              <text class="arrow">›</text>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">Aa</text>
              <text class="label-text">字体大小</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="decreaseSize">—</view>
              <text class="size-value">{{ currentFontSize }}</text>
              <view class="size-btn" @click="increaseSize">+</view>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">⫿</text>
              <text class="label-text">字符间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="decreaseSpacing">—</view>
              <text class="size-value">{{ currentSpacing }}</text>
              <view class="size-btn" @click="increaseSpacing">+</view>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">Ā</text>
              <text class="label-text">行间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="decreaseLineHeight">—</view>
              <text class="size-value">{{ currentLineHeight }}</text>
              <view class="size-btn" @click="increaseLineHeight">+</view>
            </view>
          </view>

          <view class="reset-btn" @click="resetStyle">
            <text class="reset-text">还原</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const templateData = reactive({
  coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20romantic%20red%20theme%20chinese%20wedding%20invitation&image_size=portrait_4_3',
  photo1: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20main%20red%20theme&image_size=portrait_4_3',
  photo2: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20second&image_size=portrait_4_3',
  photo3: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20romantic%20white%20dress&image_size=portrait_4_3',
  photo4: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20outdoor%20garden&image_size=portrait_4_3',
  photo5: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20happy%20moment&image_size=portrait_4_3',
  photo6: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20ceremony&image_size=portrait_4_3',
  photo7: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20kiss&image_size=portrait_4_3',
  photo8: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20final%20portrait&image_size=portrait_4_3'
})

const showTextEditor = ref(false)
const showBasicInfoEditor = ref(false)
const showDatePicker = ref(false)
const selectedElement = ref<number | null>(null)
const editingText = ref('')
const currentFont = ref('思源宋体极细')
const currentColor = ref('#666666')
const currentFontSize = ref(12)
const currentSpacing = ref(2)
const currentLineHeight = ref(2)
const activePanelTab = ref('edit')

const basicInfo = reactive({
  groomName: '',
  brideName: '',
  weddingDate: '',
  location: '',
  detailAddress: ''
})

const signinForm = reactive({
  name: '',
  count: ''
})

const countdown = reactive({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
})

let timer: number | null = null

const panelTabs = [
  { key: 'edit', name: '自由编辑', icon: '🧩' },
  { key: 'material', name: '素材库', icon: '🖼' },
  { key: 'text', name: '文字', icon: '📝' },
  { key: 'settings', name: '设置', icon: '⚙️' }
]

const editableElements = reactive([
  { type: 'image', text: templateData.coverImage },
  { type: 'image', text: templateData.photo1 },
  { type: 'image', text: templateData.photo2 },
  { type: 'image', text: templateData.photo3 },
  { type: 'image', text: templateData.photo4 },
  { type: 'image', text: templateData.photo5 },
  { type: 'image', text: templateData.photo6 },
  { type: 'image', text: templateData.photo7 },
  { type: 'image', text: templateData.photo8 },
  { type: 'basic', text: '完善基本信息' },
  { type: 'text', text: '我们结婚啦' },
  { type: 'text', text: 'Welcome to our wedding' },
  { type: 'text', text: '不早不晚 刚好是你' }
])

const materialList = [
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20photo%201&image_size=square', name: '新人合影1' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20photo%202&image_size=square', name: '新人合影2' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20wedding%20double%20happiness%20decoration%20red&image_size=square', name: '囍字装饰' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20heart%20decoration%20flower%20hearts%20red&image_size=square', name: '爱心装饰' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20ring%20gold%20ring%20couple&image_size=square', name: '戒指' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20wedding%20flowers%20bouquet%20red%20roses&image_size=square', name: '玫瑰花束' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20fireworks%20celebration&image_size=square', name: '烟花装饰' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20lace%20elegant%20decoration&image_size=square', name: '蕾丝装饰' }
]

const settings = reactive({
  danmaku: true,
  giftAlbum: true,
  giftBuy: true,
  moneyGift: true,
  like: true,
  album: true
})

const goBack = () => {
  uni.navigateBack()
}

const handleShare = () => {
  uni.showToast({ title: '分享', icon: 'none' })
}

const handleMore = () => {
  uni.showToast({ title: '更多选项', icon: 'none' })
}

const openEditor = (idx: number) => {
  if (editableElements[idx].type === 'basic') {
    showBasicInfoEditor.value = true
  } else if (editableElements[idx].type === 'text') {
    selectedElement.value = idx
    editingText.value = editableElements[idx].text
    showTextEditor.value = true
  } else {
    uni.showToast({ title: '图片编辑', icon: 'none' })
  }
}

const closeBasicInfoEditor = () => {
  showBasicInfoEditor.value = false
}

const confirmBasicInfo = () => {
  showBasicInfoEditor.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

const closeTextEditor = () => {
  showTextEditor.value = false
}

const confirmTextEdit = () => {
  if (selectedElement.value !== null) {
    editableElements[selectedElement.value].text = editingText.value
  }
  showTextEditor.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

const onTextInput = (e: any) => {
  editingText.value = e.detail.value
}

const decreaseSize = () => {
  if (currentFontSize.value > 8) {
    currentFontSize.value--
  }
}

const increaseSize = () => {
  if (currentFontSize.value < 100) {
    currentFontSize.value++
  }
}

const decreaseSpacing = () => {
  if (currentSpacing.value > 0) {
    currentSpacing.value--
  }
}

const increaseSpacing = () => {
  currentSpacing.value++
}

const decreaseLineHeight = () => {
  if (currentLineHeight.value > 1) {
    currentLineHeight.value--
  }
}

const increaseLineHeight = () => {
  currentLineHeight.value++
}

const showFontPicker = () => {
  uni.showToast({ title: '字体选择', icon: 'none' })
}

const showColorPicker = () => {
  uni.showToast({ title: '颜色选择', icon: 'none' })
}

const resetStyle = () => {
  currentFont.value = '思源宋体极细'
  currentColor.value = '#666666'
  currentFontSize.value = 12
  currentSpacing.value = 2
  currentLineHeight.value = 2
  uni.showToast({ title: '已还原', icon: 'success' })
}

const selectMaterial = (material: any) => {
  uni.showToast({ title: '已添加素材', icon: 'success' })
}

const toggleSetting = (key: string) => {
  settings[key] = !settings[key]
}

const handleMusic = () => {
  uni.navigateTo({ url: '/pages/music/index' })
}

const handleSettings = () => {
  activePanelTab.value = 'settings'
}

const handleSave = () => {
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handlePreviewShare = () => {
  uni.showToast({ title: '生成预览', icon: 'none' })
}

const handleLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      basicInfo.location = res.name || res.address
    }
  })
}

const handleSignin = () => {
  if (!signinForm.name) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  uni.showToast({ title: '签到成功', icon: 'success' })
  signinForm.name = ''
  signinForm.count = ''
}

const updateCountdown = () => {
  const targetDate = new Date('2027-09-14T12:00:00').getTime()
  const now = new Date().getTime()
  const diff = targetDate - now

  if (diff > 0) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    countdown.days = String(days).padStart(2, '0')
    countdown.hours = String(hours).padStart(2, '0')
    countdown.minutes = String(minutes).padStart(2, '0')
    countdown.seconds = String(seconds).padStart(2, '0')
  } else {
    countdown.days = '00'
    countdown.hours = '00'
    countdown.minutes = '00'
    countdown.seconds = '00'
  }
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000) as unknown as number
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
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

.header-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 40rpx;
}

.editor-main {
  flex: 1;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  height: 0;
}

.canvas-scroll {
  flex: 0 0 460rpx;
  height: 100%;
  background: #f0f0f0;
  border-radius: 16rpx;
  overflow: hidden;
}

.canvas-container {
  padding: 20rpx;
}

.canvas-preview {
  width: 100%;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  background: #fff;
}

.page-content {
  width: 100%;
  position: relative;
}

.section {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cover-section {
  height: 1000rpx;
}

.cover-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
}

.shuangxi-decor {
  font-size: 120rpx;
  color: #e84a6e;
  font-weight: bold;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.3);
}

.cover-title {
  font-size: 60rpx;
  color: #fff;
  font-weight: bold;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 40rpx;
}

.cover-subtitle {
  font-size: 32rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 20rpx;
  letter-spacing: 8rpx;
}

.couple-info-section {
  padding: 80rpx 40rpx;
  background: #fff;
}

.couple-info-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
}

.person-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.person-name {
  font-size: 44rpx;
  color: #333;
  font-weight: 600;
}

.person-role {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.heart-divider {
  font-size: 40rpx;
  color: #e84a6e;
}

.wedding-date {
  display: block;
  text-align: center;
  font-size: 36rpx;
  color: #e84a6e;
  margin-top: 40rpx;
  font-weight: 600;
}

.story-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.story-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.photo-section {
  width: 100%;
  height: 900rpx;
  position: relative;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-text-overlay {
  position: absolute;
  bottom: 80rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.photo-title {
  font-size: 56rpx;
  color: #e84a6e;
  font-weight: bold;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.3);
}

.photo-subtitle {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
  margin-top: 10rpx;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.3);
}

.decor-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.decor-text {
  font-size: 24rpx;
  color: #e84a6e;
  font-weight: 600;
  letter-spacing: 8rpx;
}

.quote-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.quote-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
  text-align: center;
}

.red-title-section {
  padding: 60rpx 40rpx;
  background: #e84a6e;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.red-title {
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
}

.red-title-small {
  font-size: 28rpx;
  color: #fff;
  margin-top: 10rpx;
}

.photo-with-decor {
  position: relative;
}

.flower-decor {
  position: absolute;
  bottom: 100rpx;
  right: 40rpx;
  font-size: 80rpx;
}

.love-decor {
  position: absolute;
  top: 150rpx;
  right: 40rpx;
  font-size: 40rpx;
  color: #e84a6e;
  font-weight: bold;
  letter-spacing: 10rpx;
  writing-mode: vertical-rl;
}

.romantic-quote-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.romantic-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.sweet-quote-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}

.sweet-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
  text-align: center;
}

.countdown-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  justify-content: center;
  gap: 30rpx;
}

.countdown-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 4rpx solid #e84a6e;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  min-width: 100rpx;
}

.countdown-num {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
}

.countdown-label {
  font-size: 24rpx;
  color: #e84a6e;
  margin-top: 10rpx;
}

.invitation-quote-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.invitation-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.shuangxi-decor-section {
  padding: 80rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.big-shuangxi {
  font-size: 160rpx;
  color: #e84a6e;
  font-weight: bold;
}

.welcome-text {
  font-size: 28rpx;
  color: #e84a6e;
  letter-spacing: 12rpx;
}

.calendar-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.calendar-header {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.calendar-month {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
}

.calendar-year {
  font-size: 32rpx;
  color: #999;
}

.calendar-weekdays {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.weekday {
  width: 60rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}

.calendar-days {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  width: 560rpx;
}

.calendar-day {
  width: 60rpx;
  height: 60rpx;
  text-align: center;
  line-height: 60rpx;
  font-size: 24rpx;
  color: #666;
}

.highlight-day {
  background: #e84a6e;
  color: #fff;
  border-radius: 50%;
}

.address-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.address-label {
  font-size: 24rpx;
  color: #e84a6e;
  letter-spacing: 8rpx;
}

.address-detail {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.map-section {
  height: 400rpx;
  background: #e8f4ff;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.map-text {
  font-size: 28rpx;
  color: #333;
  text-align: center;
  padding: 0 40rpx;
}

.map-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48rpx;
}

.wedding-info-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.info-item {
  display: flex;
  gap: 20rpx;
}

.info-icon {
  font-size: 32rpx;
  margin-top: 5rpx;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.info-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.info-value {
  font-size: 26rpx;
  color: #666;
}

.final-romantic-section {
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.final-romantic-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.final-photo-section {
  height: 900rpx;
}

.signin-section {
  padding: 80rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.signin-title {
  font-size: 60rpx;
  color: #e84a6e;
  font-weight: bold;
}

.signin-subtitle {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
  margin-top: 10rpx;
}

.signin-form {
  margin-top: 60rpx;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  width: 100%;
}

.signin-input {
  width: 100%;
  height: 90rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}

.signin-btn {
  width: 100%;
  height: 90rpx;
  background: #e84a6e;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 600;

  &::after {
    border: none;
  }
}

.bottom-shuangxi-section {
  padding: 80rpx 40rpx 120rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bottom-shuangxi {
  font-size: 160rpx;
  color: #e84a6e;
  font-weight: bold;
}

.bottom-couple {
  font-size: 32rpx;
  color: #e84a6e;
  margin-top: 20rpx;
  font-weight: 600;
  letter-spacing: 8rpx;
}

.right-panel {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.panel-scroll {
  height: 100%;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.panel-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  gap: 8rpx;
  border-bottom: 4rpx solid transparent;

  &.active {
    border-bottom-color: #e84a6e;

    .tab-text {
      color: #e84a6e;
      font-weight: 600;
    }
  }
}

.tab-icon {
  font-size: 36rpx;
}

.tab-text {
  font-size: 24rpx;
  color: #666;
}

.panel-section {
  padding: 20rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.element-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.element-item {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  border: 3rpx solid transparent;
  position: relative;

  &.selected {
    border-color: #e84a6e;
    background: #fff0f3;
  }
}

.element-preview {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  background: #eee;
}

.preview-img {
  width: 100%;
  height: 100%;
}

.replace-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.9);
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.element-text-preview {
  min-height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.element-tag {
  font-size: 22rpx;
  color: #e84a6e;
  background: #ffe4e8;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.material-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.material-item {
  width: calc(50% - 8rpx);
  border-radius: 12rpx;
  overflow: hidden;
  background: #f9f9f9;
}

.material-img {
  width: 100%;
  height: 180rpx;
}

.material-name {
  display: block;
  padding: 15rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
}

.style-options {
  padding: 0;
}

.style-row {
  display: flex;
  align-items: center;
  padding: 25rpx 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.style-label {
  display: flex;
  align-items: center;
  gap: 15rpx;
  flex: 1;
}

.label-icon {
  font-size: 36rpx;
  opacity: 0.7;
}

.label-text {
  font-size: 30rpx;
  color: #333;
}

.style-value {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.value-text {
  font-size: 28rpx;
  color: #333;
}

.color-preview {
  width: 50rpx;
  height: 50rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ddd;
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
}

.font-size-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #f5f5f5;
  padding: 5rpx 15rpx;
  border-radius: 12rpx;
}

.size-btn {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
}

.size-value {
  font-size: 30rpx;
  color: #333;
  min-width: 60rpx;
  text-align: center;
}

.reset-btn {
  margin-top: 20rpx;
  padding: 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  text-align: center;
}

.reset-text {
  font-size: 28rpx;
  color: #666;
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25rpx 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
}

.setting-name {
  display: block;
  font-size: 30rpx;
  color: #333;
}

.setting-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.bottom-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid #eee;
  gap: 20rpx;
}

.bottom-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5rpx;
  padding: 10rpx 20rpx;
}

.save-icon-wrapper {
  position: relative;
}

.save-check {
  position: absolute;
  bottom: -5rpx;
  right: -5rpx;
  width: 30rpx;
  height: 30rpx;
  background: #4cd964;
  color: #fff;
  border-radius: 50%;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  font-size: 24rpx;
  color: #666;
}

.preview-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 24rpx 60rpx;
  font-size: 32rpx;
  font-weight: 600;

  &::after {
    border: none;
  }
}

.basic-info-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.basic-info-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.basic-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.back-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon-small {
  font-size: 48rpx;
  color: #333;
  font-weight: 300;
}

.basic-info-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.confirm-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
}

.basic-info-scroll {
  flex: 1;
  height: 0;
}

.form-list {
  padding: 20rpx 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
}

.required-mark {
  color: #e84a6e;
  font-size: 32rpx;
  margin-right: 8rpx;
}

.label-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.form-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  position: relative;
}

.form-input {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}

.char-count {
  font-size: 28rpx;
  color: #999;
}

.arrow-right {
  font-size: 32rpx;
  color: #ccc;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 28rpx;
  color: #e84a6e;
}

.text-editor-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.editor-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 80vh;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
}

.close-btn, .confirm-btn {
  font-size: 48rpx;
  color: #666;
  width: 80rpx;
  text-align: center;
}

.confirm-btn {
  color: #e84a6e;
  font-weight: bold;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.text-area {
  padding: 30rpx;
}

.text-input {
  width: 100%;
  min-height: 300rpx;
  border: 2rpx solid #ddd;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.8;
  box-sizing: border-box;
}
</style>
