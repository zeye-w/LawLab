# LawLab V0.4 · Cloudflare Workers AI 部署与验收

本版本在现有 `https://lawlab.edwardlab.workers.dev/` Worker 上增加 **AI 文献分析 API**，不需要本地 Ollama 或云 GPU 主机，也无需在前端暴露模型密钥。与 V0.3 相比，新版本可解析本地 PDF 的文字、调用 Cloudflare 托管的 Qwen，并验证模型返回的引文确实存在于发送的对应页文本。

> **重要：仅合并代码或执行纯静态 `npm run build` 还不能启用 AI。** 当前部署方式必须同时发布 Worker 脚本与 `dist` 静态资源，并配置 AI Binding 与访问码。合并前先使用独立分支验收，不要在未完成配置时切换生产发布。

## 1. 工作流程和数据边界

- 浏览器用 `pdfjs-dist` 从选择的 PDF 提取**前 12 页、最多约 16,000 字符**；单页上限 2,200 字符。8 MB 以上 PDF 被拒绝，扫描版无 OCR。
- 原始 PDF **不上传**；点击「开始 AI 提取」后，浏览器向同源 `POST /api/ai/analyze` 发送选中的页文本和研究问题。选中的文本将由 Cloudflare Workers AI 处理，而不是一直留在本地。
- Cloudflare 模型固定为 `@cf/qwen/qwen3-30b-a3b-fp8`；返回最多 5 条候选观点。服务端核对其 `quote` 字符串是否出现在对应原始 `page` 的输入文本中。**仅核查字面匹配，不等于证明观点概括正确。**
- 浏览器只有明确点击「加入参考资料与观点矩阵」后才把观点保存到现有论文项目的 localStorage，默认 `verified=false`。文献书目信息和法律结论仍须用户自己核验。
- 浏览器中的 AI 访问码仅保存在组件内存，刷新后消失；不要使用公共设备或共享访问码。论文笔记默认仍在 localStorage，不跨设备同步。

## 2. Cloudflare 账号配置

该项目现有 `wrangler.jsonc` 定义：

```json
{
  "name": "lawlab",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-10-16",
  "ai": { "binding": "AI" },
  "ratelimits": [
    { "name": "AI_IP_LIMITER", "namespace_id": "41001", "simple": { "limit": 4, "period": 60 } },
    { "name": "AI_GLOBAL_LIMITER", "namespace_id": "41002", "simple": { "limit": 20, "period": 60 } }
  ],
  "previews": {
    "ai": { "binding": "AI" },
    "ratelimits": [
      { "name": "AI_IP_LIMITER", "namespace_id": "51001", "simple": { "limit": 4, "period": 60 } },
      { "name": "AI_GLOBAL_LIMITER", "namespace_id": "51002", "simple": { "limit": 20, "period": 60 } }
    ]
  },
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"],
    "not_found_handling": "single-page-application"
  }
}
```

### Cloudflare Worker Previews（PR 预览环境）

当 Cloudflare 的 Git 连接执行 `npx wrangler preview` 时，必须在 `wrangler.jsonc` 内定义独立的 `previews` 块；**Preview 不继承顶层生产绑定**。本仓库已配置：

```json
"previews": {
  "ai": { "binding": "AI" },
  "ratelimits": [
    { "name": "AI_IP_LIMITER", "namespace_id": "51001", "simple": { "limit": 4, "period": 60 } },
    { "name": "AI_GLOBAL_LIMITER", "namespace_id": "51002", "simple": { "limit": 20, "period": 60 } }
  ]
}
```

正式生产限流 namespace ID 为 `41001`、`41002`，预览环境使用 `51001`、`51002`，**不与生产共享限流计数器**。请先确认预览 namespace ID 没被当前 Cloudflare 账号的其他 Worker 使用；使用同一 `namespace_id` 的不同 Preview 也会共享同一计数器，若需每个 Preview 相互隔离，应为它们分配不同 ID。

Cloudflare 预览站点通常是公开链接。**不要把生产访问码放进 Preview**，也不要将 `LAWLAB_AI_ACCESS_TOKEN` 写入仓库或前端。只有管理员明确为 Preview 配置独立的 Secret 后，`/api/ai/status` 才应返回 `configured:true`。不配置时站点的论文编辑与 PDF 本地解析仍可测试，但云端 AI 接口应保持关闭（503）。

预览环境若启用 AI，推理仍会消耗当前 Cloudflare 账号的 Neurons 免费额度或产生相应费用。建议仅对可信测试人员开放，并用独立的预览访问码测试。

可从 Cloudflare 控制台的 Preview 配置中设置独立 Secret，或按官方文档使用 Preview 命令行管理。预览部署仍然执行 `npx wrangler preview`，**不要改成 `npx wrangler deploy` 来绕过错误**，否则会有意外部署到生产的风险。

参考文档：https://developers.cloudflare.com/workers/previews/configuration/ 及 https://developers.cloudflare.com/workers/previews/resources/

Worker 名称必须与你已有 Cloudflare Worker 保持一致。Cloudflare Workers AI 依赖 `env.AI`，Wrangler 会根据配置创建 AI Binding 和两个限流 Binding（Workers Rate Limiting）。缺少任一限流 Binding 时 AI 接口保持关闭（503），避免在没有频率限制的情况下消耗额度。

**访问控制必需**：为 Worker 设置名为 `LAWLAB_AI_ACCESS_TOKEN` 的 **Secret**，长度至少 24 字符。可以在 Cloudflare dashboard 的 Workers & Pages → `lawlab` → Settings → Variables and Secrets 中新增（类型选 Secret），或登录 Wrangler 后使用：

```bash
npx wrangler login
npx wrangler secret put LAWLAB_AI_ACCESS_TOKEN
```

切勿把访问码放入仓库、前端 `VITE_*` 变量、Cloudflare 明文变量或项目文档。本 API 的推理入口无访问码会返回 401；缺少绑定/Secret 会返回 503。API 同源调用，不允许跨域访问。

### 构建与发布

本地或可信 CI：

```bash
npm ci
npm test
npm run build
npx wrangler deploy --dry-run
npm run deploy:worker
```

**Git 自动部署注意**：若 Cloudflare 的 Git 项目当前只设置 `npm run build` 作为静态产物构建，必须修改其最终 **Deploy command** 为 `npx wrangler deploy`（并确保它在 `npm run build` 之后执行），或者在经过授权的 CI/CLI 中运行 `npm run deploy:worker`。否则服务器不会加载 `worker/index.ts`，AI 接口会报错或返回 HTML。不要将 `npx wrangler deploy` 加在没有 Cloudflare 身份授权的 GitHub 测试作业中。

## 3. 免费额度与滥用防护

Cloudflare Workers AI 的免费额度为 **每天 10,000 Neurons**（每日 00:00 UTC 重置），不是不限量。免费计划超出额度后请求失败；若将来升级付费方案，会产生超额计费。Workers AI 本地开发的真实推理也会消耗额度。

- 服务端只接受 `POST /api/ai/analyze`，要求 Bearer 访问码、同源 Origin、JSON、最多 12 页、16,000 字符；请求体上限按 UTF-8 字节计算（约 57 KB），足以容纳 16,000 个汉字。
- 每次调用模型前做两级限流：同一 IP 每分钟 4 次、全站每分钟 20 次，超出返回 429。Cloudflare 的限流按数据中心近似计数，不是精确的全局配额；它限制的是突发调用，不能代替每日预算。
- 模型输出无法解析时返回 502「无法解析」，与「没有通过引文检查的观点」（200、空列表）区分；上游错误只返回通用提示，不把内部错误信息转给浏览器。
- 公开给多个学生前，仍应改用独立用户登录、用户级次数限制和费用预算；内置限流只能减缓共享访问码泄露后的消耗。单个共享访问码只适合作为本人测试原型，不是多租户认证系统。
- Worker 不主动保存 PDF、用户论文或生成的全文，也不记录原始请求；仍需遵循 Cloudflare AI 数据处理条款及你对上传者的隐私告知。

## 4. 手工验收清单

1. 在 `/#paper` 中选择「AI 文献分析」；没有绑定时应显示未配置提示，不能消耗 AI 额度。
2. 使用**经授权**的文字型 PDF（小于 8 MB），上传后显示文件名、总页数与已解析页面数。扫描版应清楚提示 OCR 限制。
3. 研究设计中填写研究问题，输入管理员设置的访问码，执行分析；检查 API 的 `claims` 带页码与原文证据，找不到精确引文时不会显示为已核验观点。
4. 点击「加入参考资料与观点矩阵」；查看该观点在「观点与逻辑」及「参考资料」中存在，且始终标记「待核验」。
5. 导出 JSON 并刷新页面，再恢复备份，核对观点仍在；手机端检查按钮、卡片显示和 PDF 表单。
6. 测试错误情况：访问码错误（401）、未配置（503）、无法提取文本、PDF 超大小、频繁请求（429）、模型输出无法解析（502），错误信息不能泄露 Secret。
7. **首次启用时用真实模型确认输出格式**：用一份中文文字型 PDF 跑一次分析，确认能返回观点卡。若始终提示「无法解析」，请记录 Cloudflare 日志中的错误类型并检查该模型当前的输出结构。
8. 确认 `/#court`、`/#contracts` 和旧版文献检索功能仍正常运行。

## 5. 中文 PDF 的原文证据校验与 0 条观点诊断

若 PDF 成功解析、模型返回 HTTP 200，但界面出现「0 条观点」，先查看新增的**聚合统计**：`candidates` 为模型产生的候选条数，`accepted` 为证据检查通过条数，`quoteNotFound` 为没有在指定 PDF 页找到引用的条数，`pageMissing` 为页码不匹配，`malformed` 为字段不合法，`layoutNormalized` 为去除 PDF 排版空白后找到同页连续字符的条数。不会记录或向诊断接口返回原始 AI 输出。

因为中文 PDF.js 提取经常在汉字之间产生版式空白，验证规则增加**同页字符连续匹配**：首先使用严格字符串匹配；失败时仅忽略文字中的空白字符再次匹配（不修改文字、标点或页码），并从用户上传页文本中恢复引文作为证据。界面区分「原文逐字匹配」与「排版空白归一匹配」。该机制**仍不等于对 AI 观点的事实验证**，必须由作者核查原始 PDF。

- `candidates=0`：模型没有给出可解析的候选，建议缩小研究问题、调整模型参数或文献选页。
- `candidates>0`、`quoteNotFound>0`：引文与相应页文字不一致，保持拒绝，不得自动接受无来源观点。
- 不能为了解决「0 条」而关闭引文校验或把凭空产生的引文标记为已核验。
- 该诊断统计只在用户主动执行 AI 分析时随响应返回，不输出文献全文、访问码或原始模型回复。

## 6. 现有功能与下一版范围

V0.4 的**云端 AI**聚焦于单篇 PDF 的有限页面内容及逐字引文校验，并非整篇文献的可靠全文分析。V0.5 才考虑多 PDF 解析、按章节选页、多文献自动论点归并、用户级配额与开放获取来源的合规全文抓取。不要宣称“已阅读全部论文”“完全防止幻觉”或“法律观点自动核实”。

参考：
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
