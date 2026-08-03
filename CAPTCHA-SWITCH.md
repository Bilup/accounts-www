# 人机验证切换说明：hCaptcha → Cloudflare Turnstile

> 目的：将注册流程的人机验证从 hCaptcha 切换为 Cloudflare Turnstile。
> 原因：hCaptcha 在国内网络环境下访问不稳定，Turnstile 无需 VPN 即可直接访问。

---

## 一、改动清单（已完成）

### 1. 前端 `accounts-www`

| 文件 | 改动 |
| --- | --- |
| `index.html` | 验证脚本由 `https://hcaptcha.com/1/api.js` 替换为 `https://challenges.cloudflare.com/turnstile/v0/api.js` |
| `src/pages/auth/Auth.tsx` | `declare const hcaptcha` → `declare const turnstile`；新增常量 `CAPTCHA_SITE_KEY`（当前为测试密钥）；渲染 `hcaptcha.render` → `turnstile.render`；取 token `hcaptcha.getResponse()` → `turnstile.getResponse(widgetId)`；重置/移除统一改用 `turnstile.reset/remove` |

- 请求后端字段仍为 `captcha`，接口保持不变。

### 2. 后端 `accounts-api`

| 文件 | 改动 |
| --- | --- |
| `internal/captcha/captcha.go` | 函数 `VerifyHCaptcha` → `VerifyTurnstile`；siteverify 地址改为 `https://challenges.cloudflare.com/turnstile/v0/siteverify`；环境变量由 `HCAPTCHA_SECRET` 改为 `TURNSTILE_SECRET` |
| `handlers_users.go` | `registerUser` 中调用改为 `captcha.VerifyTurnstile(req.Captcha)`；错误消息改为 `"CAPTCHA verification failed"` |

---

## 二、待确认事项

### 1. 编译验证

- 本机（Windows）未安装 Go，无法本地编译验证后端。
- 请在部署机/CI 上执行 `go build ./...` 确认编译通过后再部署。

### 2. 环境变量配置

- 后端部署环境（`api.accounts.bilup.org`）需要设置新的环境变量：
  ```
  TURNSTILE_SECRET=<你的 Turnstile Secret Key>
  ```
- 注意：原 `HCAPTCHA_SECRET` 已不再使用，可清理。

### 3. 密钥配套（前后端必须来自同一个 Turnstile 站点）

- 测试阶段（无需注册即可跑通流程）：
  - 前端 Site Key：`1x00000000000000000000AA`（官方测试密钥，恒通过）
  - 后端 Secret：`1x0000000000000000000000000000000AA`
  - ⚠️ 测试密钥仅用于联调，**禁止用于生产**。
- 上线前：
  1. 前往 [Cloudflare 控制台](https://dash.cloudflare.com) → Turnstile 创建站点；
  2. 将前端 `src/pages/auth/Auth.tsx` 中的 `CAPTCHA_SITE_KEY` 替换为真实 Site Key；
  3. 将后端环境变量 `TURNSTILE_SECRET` 替换为对应真实 Secret Key。

### 4. 部署顺序

1. 先部署后端（`accounts-api`），确认 `TURNSTILE_SECRET` 已配置；
2. 再部署前端（`accounts-www`），确认 `CAPTCHA_SITE_KEY` 已替换；
3. 用注册流程回归测试：打开注册页 → 完成 Turnstile 验证 → 提交 → 创建成功。

### 5. 功能回归

- 验证注册页 Turnstile 组件正常渲染；
- 未完成验证时点击提交应提示错误（`auth.completeCaptcha`），不会请求后端；
- 验证失败/超时时，组件可重新验证（`turnstile.reset` 已接入）；
- 已通过的 TypeScript 类型检查（`npm run typecheck`）。

---

## 三、回滚方案（如需恢复 hCaptcha）

1. 前端：
   - `index.html` 脚本还原为 `https://hcaptcha.com/1/api.js`；
   - `Auth.tsx` 中恢复 `declare const hcaptcha`、`CAPTCHA_SITE_KEY` 改回原 hCaptcha sitekey `6532c9dc-2f18-4352-8a6a-6c08b6c2a6c4`，并还原 `hcaptcha.*` 调用。
2. 后端：
   - `internal/captcha/captcha.go` 恢复 `VerifyHCaptcha`（siteverify 地址 `https://hcaptcha.com/siteverify`，环境变量 `HCAPTCHA_SECRET`）；
   - `handlers_users.go` 恢复 `captcha.VerifyHCaptcha(req.Captcha)`。
3. 恢复后端环境变量 `HCAPTCHA_SECRET`。
