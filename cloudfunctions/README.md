# 婚贝请柬 — 云开发（CloudBase）架构

将原 Express 后端（`server/index.js` + `server/routes/poster.js`）重写为微信云开发的云函数 + 云数据库 + 云存储架构。

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│  前端（H5 / 微信小程序）                                       │
│  src/config/index.ts: getRequestUrl(path) 按 path 前缀分发   │
│  src/utils/request.ts: 用 getRequestUrl 拼接请求 URL          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (HTTPS)
┌─────────────────────────────────────────────────────────────┐
│  云开发 HTTP 访问服务（同一 envId）                           │
│  https://{envId}.service.tcloudbase.com/{functionName}      │
└─────────────────────────────────────────────────────────────┘
                            │
   ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼          ▼          ▼
 common    user     template     work      order     upload     poster     export
 (11路由) (15路由)  (9路由)    (7路由)   (7路由)   (7路由)   (17路由)    (2路由)
   │          │          │          │          │          │          │          │
   └──────────┴──────────┴─────┬────┴──────────┴──────────┴──────────┘          │
                               ▼                                               ▼
                    ┌─────────────────────┐                       ┌─────────────────────┐
                    │   云数据库 (NoSQL)    │                       │     云存储           │
                    │  17 个 collection    │                       │  uploads/fonts/...  │
                    └─────────────────────┘                       └─────────────────────┘
```

## 目录结构

```
cloudfunctions/
├── _shared/                          # 公共代码源（不部署，仅供 build.js 复制）
│   ├── index.js                      # db/auth/response/utils/upload/sms/version
│   └── README.md
├── common/                           # 健康检查/版本/登录/短信/事件追踪/反馈 (11 路由)
│   ├── index.js
│   ├── package.json
│   └── config.json
├── user/                             # 用户信息/VIP/足迹/通知/收藏 (15 路由)
├── template/                         # 模板列表/详情/CRUD/相似/分类/商品 (9 路由)
├── work/                             # 作品 CRUD + 回收站 (7 路由)
├── order/                            # 订单 + VIP 购买 (7 路由)
├── upload/                           # 图片/字体/音乐上传 (7 路由)
├── poster/                           # 海报模板/作品/贴纸/统计 (17 路由)
├── export/                           # 请柬/海报导出 (2 路由)
├── build.js                          # 部署前同步 _shared 到各函数
├── migrate-data.js                   # SQL→NoSQL 数据迁移
├── migrate-assets.js                 # 静态资源→云存储迁移
└── README.md                         # 本文件
```

## 云函数与路由清单

共 8 个云函数，75 个路由（覆盖原 Express 全部 60+ 路径）：

| 函数 | 路由数 | 主要职责 |
|---|---|---|
| common | 11 | health/version/sms/login/track/feedback |
| user | 13 | user/info/profile/vip/status/favorites/footprints/notifications |
| template | 10 | categories/templates CRUD/similar/products |
| work | 7 | works CRUD/recycle/restore/两段式删除 |
| order | 6 | orders CRUD/pay/vip order |
| upload | 6 | upload/image/fonts/music |
| poster | 17 | poster templates/works/stickers/stats |
| export | 2 | invitation/poster export |

## 部署步骤

### 1. 前置准备

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录并选择环境
tcb login
tcb env list  # 确认环境 ID 为 cloud1-d1g9id3fjffcefe0d
```

### 2. 同步公共代码

```bash
cd cloudfunctions
node build.js
# 输出：8 个函数的 _shared.js 已同步
```

### 3. 安装各函数依赖

```bash
# 为每个云函数安装依赖（wx-server-sdk + jsonwebtoken + uuid）
for fn in common user template work order upload poster export; do
  cd $fn && npm install --production && cd ..
done
```

### 4. 配置环境变量

在云开发控制台 → 云函数 → 每个函数 → 配置 → 环境变量，添加：

| 变量名 | 值 | 说明 |
|---|---|---|
| `JWT_SECRET` | 你的密钥 | JWT 签名密钥（**必须与原服务一致**，否则旧 token 失效） |
| `ADMIN_PHONE` | `13800138000` | 管理员手机号 |
| `DEV_CODE` | `000000` | 开发环境万能验证码 |
| `NODE_ENV` | `production` | 生产环境标识（关闭万能验证码） |

> ⚠️ `JWT_SECRET` 必须与原 Express 服务的 `JWT_SECRET` 完全一致，否则现有用户 token 全部失效。

### 5. 部署云函数

```bash
# 部署单个函数
tcb fn deploy common
tcb fn deploy user
tcb fn deploy template
tcb fn deploy work
tcb fn deploy order
tcb fn deploy upload
tcb fn deploy poster
tcb fn deploy export

# 或一次性部署全部（需在 cloudfunctions/ 目录）
tcb fn deploy common user template work order upload poster export
```

### 6. 配置 HTTP 访问服务

在云开发控制台 → 云函数 → HTTP 访问服务：

1. 创建 HTTP 访问服务
2. 为每个云函数添加路径映射：
   - `/common` → common 函数
   - `/user` → user 函数
   - `/template` → template 函数
   - `/work` → work 函数
   - `/order` → order 函数
   - `/upload` → upload 函数
   - `/poster` → poster 函数
   - `/export` → export 函数

访问 URL 形如：`https://{envId}.service.tcloudbase.com/{functionName}`

### 7. 数据迁移

```bash
# 安装迁移脚本依赖
cd cloudfunctions
npm install sql.js wx-server-sdk

# 设置云环境 ID
export TCB_ENV_ID=cloud1-d1g9id3fjffcefe0d

# 执行数据迁移（SQL → NoSQL）
node migrate-data.js

# 执行静态资源迁移（本地文件 → 云存储）
node migrate-assets.js
```

### 8. 前端配置

前端环境变量已配置（`.env.production` / `.env.production.mp-weixin`）：

```bash
VITE_USE_CLOUD=1
VITE_CLOUD_ENV_ID=cloud1-d1g9id3fjffcefe0d
```

构建后即可使用云函数：

```bash
# H5 构建
npm run build:h5

# 小程序构建
npm run build:mp-weixin
```

## 环境变量配置

### 云函数环境变量（控制台配置）

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `JWT_SECRET` | ✅ | - | JWT 签名密钥 |
| `ADMIN_PHONE` | ❌ | `13800138000` | 管理员手机号 |
| `DEV_CODE` | ❌ | `000000` | 开发环境万能验证码 |
| `NODE_ENV` | ❌ | - | 设为 `production` 关闭万能验证码 |

### 前端环境变量

| 变量 | 说明 |
|---|---|
| `VITE_USE_CLOUD` | `1` 启用云函数模式，不设置则走旧 API_BASE |
| `VITE_CLOUD_ENV_ID` | 云开发环境 ID |
| `VITE_CLOUD_BASE` | 云函数 HTTP 访问基础 URL（默认 `https://{ENV_ID}.service.tcloudbase.com`） |
| `VITE_API_BASE` | 旧服务地址（dev 走 vite proxy 时为空） |

## 数据迁移步骤

### SQL → NoSQL 数据迁移（`migrate-data.js`）

读取 `server/data.db` 和 `server/poster.db`，转换后写入云数据库：

```bash
cd cloudfunctions
npm install sql.js wx-server-sdk
export TCB_ENV_ID=cloud1-d1g9id3fjffcefe0d
node migrate-data.js
```

迁移要点：
- 用 `initSqlJs` 加载 `.db` 文件
- 对每张表 `SELECT *` 全部数据
- JSON 字符串字段（`data`/`elements`/`tags`/`canvasSize`/`background`/`pages`/`config`/`content`/`work_data`）反序列化为对象存储
- 时间字段保持原样（字符串或毫秒数值）
- 每批 100 条批量插入
- 已存在记录用「先 delete by 主键，再 add」模式
- 输出每张表迁移统计

### SQL → NoSQL 集合映射

| SQL 表 | Collection 名 | 主键 | 索引建议 |
|---|---|---|---|
| templates | templates | id | category, status, is_paid, updatedAt |
| categories | categories | id | - |
| music | music | _id 自增 | hot, tag |
| users | users | id | phone (唯一) |
| works | works | id | phone, updated_at |
| orders | orders | id | phone, status, createdAt |
| favorites | favorites | _id 自增 | phone, (phone+work_id 唯一) |
| footprints | footprints | _id 自增 | phone, timestamp |
| notifications | notifications | _id 自增 | phone, createdAt, read |
| feedback | feedback | _id 自增 | phone, created_at, status |
| events | events | _id 自增 | user_id, timestamp |
| recycle_bin | recycle_bin | _id 自增 | phone, deletedAt |
| settings | settings | key | - |
| sms_codes | sms_codes | _id 自增 | phone, expireAt |
| poster_templates | poster_templates | id | category_id, is_active |
| poster_works | poster_works | id | user_id |
| recycle_bin_poster | recycle_bin_poster | _id 自增 | user_id, deleted_at |

## 静态资源迁移步骤

### 本地文件 → 云存储（`migrate-assets.js`）

把 `server/uploads/` 全部文件迁移到云存储：

```bash
cd cloudfunctions
npm install wx-server-sdk
export TCB_ENV_ID=cloud1-d1g9id3fjffcefe0d
node migrate-assets.js
```

迁移要点：
- 遍历 `server/uploads/fonts` / `server/uploads/music` / `server/uploads/poster/templates` / `server/uploads/poster/stickers` / `server/uploads/poster/works` 等
- 每个文件用 `cloud.uploadFile` 上传，cloudPath 保持相对路径（如 `uploads/fonts/xxx.otf`）
- 上传成功后用 `cloud.getTempFileURL` 获取 https URL
- 把 `font-map.json` 中的 url 替换为云存储 URL，写入云数据库 `settings.font_map`
- 把 `poster_templates` / `poster_works` 表中所有 url 字段更新为云存储 URL
- 生成 `manifest.json` 记录「原路径 → cloud://fileID → https URL」映射
- 贴纸列表写入 `settings.poster_stickers`

## 前端调整说明

### `src/config/index.ts`

新增云函数配置与路由分发：

- `CLOUD_BASE`：云函数 HTTP 访问基础 URL
- `USE_CLOUD_FUNCTIONS`：是否启用云函数模式（`VITE_USE_CLOUD=1` 时启用）
- `getFunctionName(path)`：根据 API path 返回对应的云函数名
- `getRequestUrl(path)`：根据 path 返回完整请求 URL
  - 云函数模式：`CLOUD_BASE + '/' + functionName + path`
  - 非云函数模式（dev）：`API_BASE + path`（走 vite proxy）

### `src/utils/request.ts`

`uni.request` 的 URL 改用 `getRequestUrl(options.url)`，自动按 path 前缀分发到对应云函数。

### `src/api/index.ts`

`uploadImage` 函数的 URL 也改用 `getRequestUrl('/api/upload/image')`。

### H5 dev 环境

不开启云函数模式（`VITE_USE_CLOUD` 不设置），继续走 vite proxy → 旧 Express 服务，开发体验不变。

## 响应格式

所有响应格式与原 Express 完全一致：

| 类型 | 格式 |
|---|---|
| 成功（数据） | `{ success: true, data: ... }` |
| 成功（分页） | `{ success: true, data, pagination: { page, limit, total, totalPages } }` |
| 失败 | `{ success: false, error }` |
| 成功（消息） | `{ success: true, message }` |
| 单图上传 | `{ success: true, url }` |
| 健康检查 | `{ success: true, status, uptime, timestamp }` |

云函数 HTTP 触发器返回值统一包装为：
```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  "body": "{\"success\":true,\"data\":...}"
}
```

OPTIONS 预检请求直接返回 200 + CORS 头。

## 注意事项

### 云函数限制

1. **执行超时**：单个云函数默认 3 秒，最长可调至 60 秒（控制台配置）。批量操作建议分页处理。
2. **包大小**：单个云函数代码包上限 50MB（含 node_modules）。
3. **并发限制**：免费版并发数有限，高并发场景需升级套餐。
4. **冷启动**：长时间未调用的云函数首次调用会有冷启动延迟（1-3 秒）。
5. **内存限制**：默认 256MB，最大 2048MB。

### 云数据库限制

1. **单集合文档数**：无硬性上限，但建议单集合不超过 100 万文档。
2. **查询限制**：单次查询最多返回 100 条（小程序端）/ 1000 条（云函数端）。
3. **写入限制**：单次批量写入上限 20 条；批量操作用循环 add。
4. **索引**：建议为高频查询字段创建索引（见上表）。

### 云存储限制

1. **文件大小**：单文件上限 10MB（普通上传）。
2. **临时 URL**：`getTempFileURL` 返回的 https URL 有效期约 2 小时，前端需及时使用或缓存 fileID。
3. **存储空间**：免费版 5GB，超出按量计费。

### 免费额度（2026 年参考）

| 资源 | 免费额度 |
|---|---|
| 云函数调用次数 | 4 万次/月 |
| 云函数运行内存 | 4 万 GB·s/月 |
| 云数据库读操作 | 5 万次/天 |
| 云数据库写操作 | 3 万次/天 |
| 云存储空间 | 5 GB |
| CDN 流量 | 5 GB/月 |

超出免费额度后按量计费，详见 [CloudBase 定价](https://cloud.tencent.com/document/product/876/18877)。

### 已知限制与后续优化

1. **上传接口**：云函数不支持 multipart/form-data，当前实现 base64 JSON 方式。
   前端 `src/api/index.ts` 的 `uploadImage` 仍用 `uni.uploadFile`（multipart），云函数模式下需改造为：
   - 方案 A：前端读取文件转 base64，用 `uni.request` POST JSON
   - 方案 B：小程序端用 `wx.cloud.uploadFile` 直传云存储，再调云函数更新数据库
   
2. **临时 URL 过期**：`getTempFileURL` 返回的 URL 约 2 小时过期。若前端长期缓存图片 URL，建议改为缓存 `cloud://` fileID，按需换取临时 URL。

3. **IP 限流**：原 Express 的 `rateLimit` 中间件未迁移到云函数。云函数并发限制 + 网关层（API 网关 / CDN WAF）可替代。

4. **事务**：云数据库 `db.runTransaction` 仅支持同一环境内多集合事务，不支持跨环境。`order` 和 `poster` 函数的复合操作已用事务保证原子性。

5. **数据库清理**：原 Express 的定时清理任务（清理 30 天前 events/footprints/recycle_bin）未迁移。建议创建一个定时触发器云函数执行清理。

## 与原 Express 实现的差异

| 维度 | 原 Express | 云开发 |
|---|---|---|
| 数据库 | sql.js (SQLite, 单文件) | 云数据库 NoSQL (17 个 collection) |
| 文件存储 | 本地磁盘 `server/uploads/` | 云存储 `cloud://` |
| 短信验证码 | 内存对象 `smsCodes` | 云数据库 `sms_codes` 集合 |
| 版本号 | settings 表 | settings 集合 |
| 限流 | IP 限流中间件 | 云函数并发限制 + 网关层 |
| 事务 | 手动 BEGIN/COMMIT | `db.runTransaction` 原生事务 |
| 路由 | Express 路由 | 自定义 `matchRoute` 路由匹配 |
| JWT | jsonwebtoken | jsonwebtoken（保持一致） |
| 部署 | Docker / Node 进程 | 云函数 + HTTP 触发器 |

## 验证清单

部署后按以下顺序验证：

- [ ] `GET /api/health` 返回 `{ success, status, uptime, timestamp }`
- [ ] `POST /api/sms/send` 发送验证码
- [ ] `POST /api/user/login` 手机号+验证码登录，返回 token
- [ ] `GET /api/user/info` 带 token 获取用户信息
- [ ] `GET /api/categories` 获取分类列表
- [ ] `GET /api/templates?page=1&limit=20` 分页获取模板
- [ ] `GET /api/templates/:id` 模板详情（自动记录足迹）
- [ ] `POST /api/works` 创建作品
- [ ] `GET /api/works` 获取作品列表
- [ ] `DELETE /api/works/:id` 软删除到回收站
- [ ] `GET /api/works/recycle` 查看回收站（合并主库 + poster 库）
- [ ] `POST /api/orders` 创建订单
- [ ] `POST /api/vip/order` VIP 购买（事务）
- [ ] `GET /api/poster/templates` 海报模板列表
- [ ] `POST /api/poster/works` 保存海报作品
- [ ] `POST /api/export` 请柬导出（VIP 校验）
