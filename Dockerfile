# AI 游戏工坊生产镜像:工作台(4312)+ 游戏交付源(4313)双端口
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# 构建验收需要真实浏览器(browser-quality 走 playwright-core + 系统 Chromium)
RUN apk add --no-cache chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist-web ./dist-web
COPY assets ./assets
COPY fixtures ./fixtures
COPY third_party ./third_party
EXPOSE 4312 4313
CMD ["node", "dist-server/server/index.js"]
