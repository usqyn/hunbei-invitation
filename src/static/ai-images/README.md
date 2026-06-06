# AI 图片素材说明

## 说明

项目中使用 `trae-api-cn.mchost.guru/api/ide/v1/text_to_image` 接口动态生成图片。

### 下载问题

该接口需要认证才能使用，因此无法直接下载图片到本地。若需要本地图片，请：

1. 手动访问每个URL获取图片
2. 或联系API提供商获取认证密钥

## 项目中使用的AI图片列表

### 首页模板卡片 (4张)
1. `virtual%20human%20wedding%20couple%20romantic%20red%20theme%20chinese%20wedding%20invitation` (portrait_4_3)
2. `virtual%20human%20wedding%20couple%20white%20dress%20elegant%20invitation` (portrait_4_3)
3. `virtual%20human%20wedding%20couple%20traditional%20chinese%20red%20wedding` (portrait_4_3)
4. `virtual%20human%20wedding%20couple%20double%20happiness%20chinese%20style` (portrait_4_3)

### 高清MV页面 (9张)
**MV封面 (5张):**
1. `funny%20wedding%20video%20cover%20cartoon%20style%20red%20background` (landscape_4_3)
2. `chinese%20wedding%20couple%20cartoon%20illustration%20red%20theme` (landscape_4_3)
3. `funny%20wedding%20animation%20colorful%20playful` (landscape_4_3)
4. `romantic%20wedding%20scene%20sunset%20couple%20silhouette` (landscape_16_9)
5. `romantic%20wedding%20love%20scene%20elegant%20minimal` (landscape_16_9)

**相册封面 (4张):**
6. `wedding%20photo%20album%20cover%20elegant%20romantic` (portrait_4_3)
7. `wedding%20couple%20album%20cover%20beautiful` (portrait_4_3)
8. `elegant%20wedding%20photo%20book%20cover` (portrait_4_3)
9. `romantic%20wedding%20album%20red%20gold` (portrait_4_3)

### 作品管理页面 (3张)
1. `elegant%20wedding%20invitation%20card%20design` (portrait_4_3)
2. `romantic%20wedding%20card%20red%20gold` (portrait_4_3)
3. `wedding%20invitation%20draft%20minimal` (portrait_4_3)

### 模板预览页面 (1张)
1. `virtual%20human%20wedding%20couple%20romantic%20red%20theme%20chinese%20wedding%20invitation` (portrait_4_3)

### 编辑器页面 (18张)

**封面和照片 (9张):**
1. `virtual%20human%20wedding%20couple%20romantic%20red%20theme%20chinese%20wedding%20invitation` (portrait_4_3) - 封面
2. `virtual%20human%20wedding%20couple%20photo%20main%20red%20theme` (portrait_4_3) - 照片1
3. `virtual%20human%20wedding%20couple%20photo%20second` (portrait_4_3) - 照片2
4. `virtual%20human%20wedding%20couple%20romantic%20white%20dress` (portrait_4_3) - 照片3
5. `virtual%20human%20wedding%20couple%20outdoor%20garden` (portrait_4_3) - 照片4
6. `virtual%20human%20wedding%20couple%20happy%20moment` (portrait_4_3) - 照片5
7. `virtual%20human%20wedding%20couple%20ceremony` (portrait_4_3) - 照片6
8. `virtual%20human%20wedding%20couple%20kiss` (portrait_4_3) - 照片7
9. `virtual%20human%20wedding%20couple%20final%20portrait` (portrait_4_3) - 照片8

**素材库 (8张):**
10. `virtual%20human%20wedding%20couple%20photo%20photo%201` (square) - 新人合影1
11. `virtual%20human%20wedding%20couple%20photo%20photo%202` (square) - 新人合影2
12. `chinese%20wedding%20double%20happiness%20decoration%20red` (square) - 囍字装饰
13. `romantic%20wedding%20heart%20decoration%20flower%20hearts%20red` (square) - 爱心装饰
14. `wedding%20ring%20gold%20ring%20couple` (square) - 戒指
15. `beautiful%20wedding%20flowers%20bouquet%20red%20roses` (square) - 玫瑰花束
16. `wedding%20%20fireworks%20celebration` (square) - 烟花装饰
17. `wedding%20lace%20elegant%20decoration` (square) - 蕾丝装饰

## 建议

如果需要将图片保存到本地，建议：

1. 手动访问 `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt={prompt}&image_size={size}` 获取图片
2. 保存到 `src/static/ai-images/` 目录
3. 然后将代码中的URL替换为本地路径

## 临时解决方案

在开发测试阶段，可以继续使用API动态生成图片。
正式上线时建议：
- 预先下载所需图片
- 存储在自己的服务器或CDN上
- 使用本地图片路径替代API调用
