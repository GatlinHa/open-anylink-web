# 使用 Node.js 22 轻量级镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制项目
COPY . .

# 安装项目依赖
RUN pnpm install

# 暴露端口（根据项目实际情况修改）
EXPOSE 5173

# 启动项目
CMD ["pnpm", "dev", "--host", "0.0.0.0"]