# _shared 公共代码源

本目录是云函数公共代码源，**不会部署**，仅供 `build.js` 脚本复制到各云函数目录。

## 文件说明

- `index.js`：所有公共工具，包括：
  - 数据库访问（`db` / `_` / `collection`）
  - JWT 鉴权（`signToken` / `verifyToken` / `getUser` / `requireAuth` / `requireAdmin` / `isAdmin`）
  - 统一响应（`ok` / `okMsg` / `fail` / `httpOK` / `httpFail` / `httpOptions`）
  - 分页（`parsePagination` / `paginateResponse`）
  - 云存储上传（`uploadToCloud` / `getCloudUrl` / `getCloudUrls` / `deleteCloudFile`）
  - 短信验证码（`setSmsCode` / `getSmsCode` / `clearExpiredSmsCodes`）
  - 版本号（`getVersion` / `bumpVersion`）
  - VIP 状态（`refreshVipStatus` / `isUserVip`）
  - 路由工具（`parseBody` / `matchRoute` / `extractPathParams`）

## 使用方式

各云函数通过 `require('./_shared')` 引用：

```js
const {
  db, collection, _, now, uuid,
  requireAuth, requireAdmin, isRequestFromAdmin, isAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse,
  parseBody, matchRoute,
} = require('./_shared')
```

部署前运行 `node build.js` 会把本目录的 `index.js` 复制为各函数目录下的 `_shared.js`，各函数改用 `require('./_shared.js')`。

## 与原 Express 实现的差异

1. 数据库从 sql.js (SQLite) 改为云数据库 NoSQL
2. 文件存储从本地磁盘改为云存储
3. 短信验证码从内存对象改为云数据库 sms_codes 集合
4. 版本号从 settings 表改为 settings 集合
5. 限流由云函数并发限制 + 网关层负责，本模块不再实现 IP 限流
