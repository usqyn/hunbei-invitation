# 婚贝请柬部署指南

本文档介绍如何将婚贝请柬项目部署到生产环境。项目由三部分组成：

- **Express 服务端**（`/server`）：基于 Node.js + Express + sql.js 的 API 服务
- **管理后台**（`/admin`）：基于 Vue 3 + Vite 的后台管理面板
- **小程序**（`/src`）：基于 UniApp 的微信小程序前端

---

## 1. 环境准备

部署前请确保服务器已安装以下软件：

| 软件 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | v2.0+ | 容器编排（使用 `docker compose` 命令） |
| Node.js | 18+ | 仅用于本地构建管理后台和小程序 |
| 域名 | - | 已备案并解析到服务器 IP |
| SSL 证书 | - | 用于 HTTPS（可用 Let's Encrypt 免费申请） |

> 提示：如果服务器未安装 Docker，可参考官方文档：
> - Docker: https://docs.docker.com/engine/install/
> - Docker Compose: https://docs.docker.com/compose/install/

---

## 2. 快速开始

### 2.1 克隆代码

```bash
git clone <your-repo-url> hunbei
cd hunbei
```

### 2.2 配置环境变量

```bash
cp .env.docker.example .env.docker
```

编辑 `.env.docker` 文件，填入实际配置：

```bash
# 必填：JWT 密钥（请使用强随机字符串，可用 openssl rand -hex 32 生成）
JWT_SECRET=your-strong-random-secret-here

# 可选：管理员手机号
ADMIN_PHONE=13800138000

# 可选：CORS 允许的来源（逗号分隔）
CORS_ORIGINS=https://your-domain.com

# 可选：微信小程序 AppID
WECHAT_APPID=your-wechat-appid
```

> **重要**：`JWT_SECRET` 必须设置为强随机字符串，切勿使用默认值。否则任何人都可以伪造管理员令牌。

### 2.3 构建管理后台

```bash
cd admin
npm ci
npm run build
cd ..
```

构建完成后，静态文件会输出到 `admin/dist/` 目录，由 Nginx 直接提供服务。

### 2.4 一键部署

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

部署脚本会自动完成以下操作：
1. 构建管理后台（`admin/dist/`）
2. 构建并启动 Docker 容器（server + nginx）
3. 等待服务端健康检查通过
4. 输出容器状态

### 2.5 手动部署（不使用脚本）

```bash
# 构建管理后台
cd admin && npm ci && npm run build && cd ..

# 构建并启动容器
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f server
```

---

## 3. 小程序部署

小程序需要使用微信开发者工具上传发布。

### 3.1 配置小程序环境变量

编辑 `.env.production.mp-weixin`，设置生产环境的 API 地址：

```
VITE_API_BASE_URL=https://your-domain.com/api
```

### 3.2 构建小程序

```bash
# 安装依赖
npm ci

# 构建微信小程序
npm run build:mp-weixin
```

构建产物输出到 `dist/build/mp-weixin/` 目录。

### 3.3 上传发布

1. 打开**微信开发者工具**
2. 导入项目，目录选择 `dist/build/mp-weixin/`
3. 填入小程序的 AppID
4. 在开发者工具中点击「上传」，填写版本号和备注
5. 登录微信公众平台，在「版本管理」中提交审核
6. 审核通过后发布上线

> 提示：发布前请确保 `manifest.json` 中的 `appid` 和 `request` 合法域名已正确配置。

---

## 4. SSL / HTTPS 配置

### 4.1 使用 Let's Encrypt 申请免费证书

```bash
# 安装 certbot
sudo apt install certbot

# 先停掉占用 80 端口的服务
docker compose down

# 申请证书（standalone 模式）
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 证书会生成在：
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 4.2 配置 Nginx SSL

创建 SSL 证书目录并复制证书：

```bash
mkdir -p nginx/ssl

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

编辑 `nginx/conf.d/default.conf`，取消 SSL 证书路径的注释：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;  # 替换为你的域名

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ...
}
```

重启 Nginx 容器：

```bash
docker compose restart nginx
```

### 4.3 设置证书自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# 添加定时任务（每天检查，每 60 天续期一次）
echo "0 3 * * * certbot renew --quiet && docker compose -f /path/to/hunbei/docker-compose.yml restart nginx" | sudo tee /etc/cron.d/certbot-renew
```

---

## 5. 数据备份

### 5.1 需要备份的数据

| 数据 | 位置 | 说明 |
|------|------|------|
| 主数据库 | `data.db` | 用户、模板、订单等核心数据 |
| 海报数据库 | `poster.db` | 用户海报作品数据 |
| 上传文件 | `uploads/` | 用户上传的图片、字体等 |

### 5.2 备份脚本示例

```bash
#!/bin/bash
# backup.sh - 数据备份脚本
BACKUP_DIR="/backup/hunbei/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份数据库（从 Docker 卷复制）
docker cp hunbei-server:/app/data.db "$BACKUP_DIR/data.db"
docker cp hunbei-server:/app/poster.db "$BACKUP_DIR/poster.db"

# 备份上传文件
docker cp hunbei-server:/app/uploads "$BACKUP_DIR/uploads"

# 压缩
tar -czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"

# 清理 7 天前的备份
find /backup/hunbei -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR.tar.gz"
```

### 5.3 设置定时备份

```bash
# 每天凌晨 2 点自动备份
echo "0 2 * * * /path/to/backup.sh >> /var/log/hunbei-backup.log 2>&1" | sudo tee /etc/cron.d/hunbei-backup
```

### 5.4 数据恢复

```bash
# 停止服务
docker compose down

# 恢复数据库
docker compose up -d server
docker cp /backup/data.db hunbei-server:/app/data.db
docker cp /backup/poster.db hunbei-server:/app/poster.db

# 恢复上传文件
docker cp /backup/uploads/. hunbei-server:/app/uploads/

# 重启服务
docker compose restart server
```

---

## 6. 监控与运维

### 6.1 查看服务状态

```bash
# 查看容器运行状态
docker compose ps

# 查看服务端日志（实时）
docker compose logs -f server

# 查看 Nginx 日志
docker compose logs -f nginx

# 查看最近 100 行日志
docker compose logs --tail=100 server
```

### 6.2 健康检查

```bash
# 手动检查服务端健康状态
curl http://localhost:3001/api/health

# 通过 Nginx 检查
curl https://your-domain.com/health
```

预期返回：

```json
{
  "success": true,
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

### 6.3 资源使用监控

```bash
# 查看容器资源使用
docker stats hunbei-server hunbei-nginx

# 查看磁盘空间
df -h

# 查看磁盘占用较大的目录
du -sh /var/lib/docker/volumes/*
```

### 6.4 进入容器调试

```bash
# 进入服务端容器
docker exec -it hunbei-server sh

# 进入 Nginx 容器
docker exec -it hunbei-nginx sh
```

---

## 7. 更新部署

当有新版本需要更新时：

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建管理后台（如果前端有更新）
cd admin && npm ci && npm run build && cd ..

# 3. 重新构建并重启容器
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d

# 4. 验证服务
curl http://localhost:3001/api/health
```

也可以直接运行部署脚本：

```bash
./scripts/deploy.sh
```

> 提示：更新后建议检查日志确认无报错：`docker compose logs --tail=50 server`

---

## 8. 常见问题排查

### 8.1 服务启动失败

**现象**：容器启动后立即退出

**排查**：
```bash
# 查看退出日志
docker compose logs server

# 常见原因：
# 1. JWT_SECRET 未设置 → 检查 .env.docker 文件
# 2. 端口被占用 → 检查 3001 端口是否被其他进程占用
# 3. 数据库文件权限问题 → 检查 data.db 的文件权限
```

### 8.2 CORS 跨域错误

**现象**：前端请求报 CORS 错误

**排查**：
```bash
# 检查 .env.docker 中的 CORS_ORIGINS 配置
# 确保包含前端的完整域名（含协议和端口）
# 例如：CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

> 注意：生产环境（`NODE_ENV=production`）下 CORS 是严格限制的，必须正确配置 `CORS_ORIGINS`。

### 8.3 上传文件失败

**现象**：上传图片/字体返回 413 或超时

**排查**：
```bash
# 检查 Nginx 的 client_max_body_size 配置（默认 20m）
# 如果文件更大，修改 nginx/conf.d/default.conf 中的：
#   client_max_body_size 50m;

# 检查服务端的上传限制（默认 10MB 图片 / 15MB base64）
# 修改 server/index.js 中 multer 的 limits.fileSize

# 修改后重启：
docker compose restart nginx server
```

### 8.4 数据库被锁

**现象**：API 返回 500 错误，日志中出现 "database is locked"

**排查**：
```bash
# 重启服务端容器释放锁
docker compose restart server

# 如果频繁出现，检查是否有多个实例同时写入
# sql.js 是单进程内存数据库，不支持多实例并发写入
```

### 8.5 Nginx 502 Bad Gateway

**现象**：访问 API 返回 502

**排查**：
```bash
# 检查服务端是否正常运行
docker compose ps
docker compose logs --tail=50 server

# 检查服务端健康状态
docker exec hunbei-server wget -qO- http://localhost:3001/api/health

# 如果服务端未启动，重新启动
docker compose up -d server
```

### 8.6 SSL 证书过期

**现象**：浏览器提示证书不安全

**排查**：
```bash
# 检查证书有效期
openssl x509 -enddate -noout -in nginx/ssl/fullchain.pem

# 手动续期
sudo certbot renew
docker compose restart nginx
```

### 8.7 磁盘空间不足

**现象**：上传文件失败，日志报 No space left on device

**排查**：
```bash
# 查看磁盘使用
df -h

# 查看 Docker 占用空间
docker system df

# 清理无用镜像和容器
docker system prune -a

# 清理旧日志
docker compose logs --tail=0 -f &  # 确认无问题后
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## 9. 目录结构说明

```
hunbei/
├── server/                 # Express 服务端
│   ├── Dockerfile          # 服务端容器构建文件
│   ├── .dockerignore       # Docker 构建忽略列表
│   ├── index.js            # 服务端入口文件
│   ├── package.json        # 服务端依赖
│   ├── middleware/         # 中间件（鉴权、数据库）
│   ├── routes/             # 路由模块（poster 等）
│   ├── uploads/            # 上传文件目录
│   └── data/               # 种子数据
├── admin/                  # Vue 3 管理后台
│   ├── src/                # 源代码
│   ├── dist/               # 构建产物（Nginx 提供服务）
│   └── package.json
├── src/                    # UniApp 小程序源码
├── nginx/
│   ├── conf.d/
│   │   └── default.conf    # Nginx 配置文件
│   └── ssl/                # SSL 证书目录
├── scripts/
│   └── deploy.sh           # 部署脚本
├── docs/
│   └── deployment.md       # 本部署文档
├── docker-compose.yml      # Docker Compose 编排文件
├── .env.docker.example     # 环境变量模板
└── .env.docker             # 环境变量（需自行创建，不入版本库）
```

---

如有其他问题，请查看服务端日志或联系开发团队。
