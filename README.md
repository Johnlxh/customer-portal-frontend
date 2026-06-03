# Customer Portal Frontend

`uni-app + Vue3 + TypeScript + Pinia`

当前目标：

- 先跑通 `H5`
- 复用同一套主代码到 `微信小程序`
- 后端对接本地 Odoo `/api/v1`

## 本地运行

```bash
pnpm install
pnpm dev:h5
```

本地 H5 地址：

- `http://localhost:5173`

## 微信小程序

构建命令：

```bash
pnpm build:mp-weixin
```

构建产物目录：

- `dist/build/mp-weixin`

导入微信开发者工具前，需要在 [manifest.json](/Users/jack/working/portal/apps/customer-portal-frontend/src/manifest.json) 里填入真实小程序 `appid`。

## 当前实现范围

- 登录
- 首页工作台
- 库存查询
- 销售单列表/详情
- 报价单列表/详情
- 退单列表/详情
- 出库单详情
- 我的

## 环境说明

- H5 开发模式默认通过 Vite 代理转发 `/api`、`/my`、`/web` 到 `http://localhost:1269`
- 打开 PDF 等文档时默认直连 `http://localhost:1269`，如需切到其他后端域名，可配置 `VITE_DOCUMENT_BASE_URL`
- 如果切到独立环境，复制 `.env.example` 为 `.env.local` 并调整 `VITE_API_BASE_URL` / `VITE_DOCUMENT_BASE_URL`
- 正式部署建议走同域名反向代理，不建议直接跨域调用 Odoo

## 已验证

- Portal 账号可登录
- 首页工作台能加载摘要
- 库存查询能命中现有本地数据
- 销售单可进入出库单详情
- 报价单与退单详情可打开
