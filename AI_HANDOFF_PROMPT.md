# AI Handoff Prompt

Use this prompt to hand the frontend project to another AI assistant or engineer.

```text
You are taking over the customer portal frontend project. Read this context first and do not start from scratch.

Project path:
E:\CHINT\2026-project\演示代码\portal_handoff_2026-04-13\portal_handoff_package\apps\customer-portal-frontend

Backend runtime:
Odoo 18 is running locally from:
E:\CHINT\odoo18_ztdq

Backend custom module:
E:\CHINT\odoo18_ztdq\custom\b2b_customer_portal

Odoo log:
E:\CHINT\odoo18_ztdq\log\odoo.log

Tech stack:
- uni-app
- Vue 3
- TypeScript
- Pinia
- WeChat mini program target: mp-weixin

Important frontend commands:
cd /d "E:\CHINT\2026-project\演示代码\portal_handoff_2026-04-13\portal_handoff_package\apps\customer-portal-frontend"
cmd /c corepack pnpm build:mp-weixin
cmd /c corepack pnpm type-check

WeChat DevTools import directory:
E:\CHINT\2026-project\演示代码\portal_handoff_2026-04-13\portal_handoff_package\apps\customer-portal-frontend\dist\build\mp-weixin

Do not import the source project root into WeChat DevTools for runtime testing. Build first, then import dist\build\mp-weixin.

Current mini program AppID:
wxacb04371b0480c59

Relevant AppID files:
- src\manifest.json
- project.config.json

Local API environment:
.env.local is intentionally ignored by Git.

For WeChat DevTools simulator, this can be used:
VITE_API_BASE_URL=http://127.0.0.1:8069
VITE_DOCUMENT_BASE_URL=http://127.0.0.1:8069

For real-device LAN debugging on the tested machine, this was used:
VITE_API_BASE_URL=http://192.168.2.40:8069
VITE_DOCUMENT_BASE_URL=http://192.168.2.40:8069

After changing .env.local, always rebuild:
cmd /c corepack pnpm build:mp-weixin

WeChat login status:
All tests have passed.
- WeChat simulator one-click login works.
- Real-device debugging works.
- Backend AppID/AppSecret are configured in Odoo.
- Portal account binding and login flow are working.

Key login API flow:
1. Frontend calls wx.login().
2. Frontend posts code to:
   POST /api/v1/auth/wechat/mini/login
3. If the WeChat identity is not bound, frontend uses getPhoneNumber code and posts:
   POST /api/v1/auth/wechat/mini/bind-phone
4. After success, frontend fetches:
   GET /api/v1/me
   GET /api/v1/dashboard
   GET /api/v1/cart

Important frontend files:
- src\api\http.ts
- src\api\auth.ts
- src\stores\auth.ts
- src\features\auth\useLoginPage.ts
- src\manifest.json
- project.config.json
- scripts\patch-mp-weixin-wxss.mjs

Backend references only, do not modify unless requested:
- E:\CHINT\odoo18_ztdq\custom\b2b_customer_portal\controllers\api.py
- E:\CHINT\odoo18_ztdq\custom\b2b_customer_portal\models\wechat_service.py
- E:\CHINT\odoo18_ztdq\custom\b2b_customer_portal\models\portal_user_access.py
- E:\CHINT\odoo18_ztdq\custom\b2b_customer_portal\models\sale_order.py

Known successful test account:
login: adminss
password: admin

This account must be:
- an Odoo Portal user
- included in the customer portal authorization list
- bound through WeChat phone binding if using one-click login

If login fails, check in this order:
1. Confirm .env.local points to the backend reachable by the current test environment.
2. Rebuild mp-weixin output.
3. Confirm dist\build\mp-weixin\utils\platform.js contains the expected API base URL.
4. Check WeChat DevTools local setting:
   "Do not verify legal domain name, web-view, TLS version and HTTPS certificate"
5. Check Odoo log for:
   POST /api/v1/auth/wechat/mini/login
   POST /api/v1/auth/wechat/mini/bind-phone
6. If Odoo has no request, debug WeChat request/network side.
7. If Odoo returns 400, inspect response message. Historical AppSecret failure was:
   微信接口调用失败：invalid appsecret

Git notes:
- node_modules, dist, logs, and .env.local are ignored.
- Build output is not committed.
- Keep local machine IP in .env.local only.

Current handoff status:
Frontend source is ready for Git handoff.
WeChat mini program login, real-device debugging, and normal API flows have been tested successfully.
```
