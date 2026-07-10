FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# 确保上传目录存在并由 node 用户拥有
RUN mkdir -p /app/uploads && chown -R node:node /app

# 声明数据卷以持久化数据库与上传文件
VOLUME ["/app/data.db", "/app/poster.db", "/app/uploads"]

# 切换非 root 用户运行
USER node

EXPOSE 3001

CMD ["node", "index.js"]
