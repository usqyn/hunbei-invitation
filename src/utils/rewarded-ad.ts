// 激励视频广告封装（微信小程序）
// 免费版用户在导出下载前观看激励视频；无广告位配置/加载失败时静默放行，不阻塞下载流程。
let rewardedAd: any = null
let _initFailed = false

// 广告位 ID：在 mp-weixin 后台新建「激励视频」广告后填入；留空则跳过广告
const REWARDED_AD_UNIT_ID = ''

function getRewardedAd(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!REWARDED_AD_UNIT_ID) {
      _initFailed = true
      reject(new Error('ad unit not configured'))
      return
    }
    if (rewardedAd) {
      resolve(rewardedAd)
      return
    }
    try {
      // @ts-ignore
      const ad = wx.createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID })
      ad.onError((err: any) => {
        console.warn('[ad] rewarded video error:', err?.errMsg || err)
        _initFailed = true
      })
      ad.onClose(() => { /* close 事件由 Promise 内部处理 */ })
      rewardedAd = ad
      resolve(ad)
    } catch (e) {
      _initFailed = true
      reject(e)
    }
  })
}

// 播放激励视频：resolve(true) = 用户看完（已获得奖励资格），resolve(false) = 未看完/广告不可用
// 无论结果如何都放行下载（广告是引导收益，不强制阻断用户体验）
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (_initFailed) {
      resolve(false)
      return
    }
    getRewardedAd()
      .then((ad: any) => {
        const onClose = (res: any) => {
          ad.offClose(onClose)
          resolve(!!(res && res.isEnded))
        }
        ad.onClose(onClose)
        ad.show().catch(() => {
          // 广告展示失败（如频率限制）：直接放行
          ad.offClose(onClose)
          resolve(false)
        })
      })
      .catch(() => resolve(false))
  })
}