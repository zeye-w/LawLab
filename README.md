# LawLab — 交互式法律学习实验室

> LawLab is a frontend-only educational prototype for students of Chinese law. It does not give professional legal advice.

一个浅色、低饱和、可在手机和桌面浏览器使用的六模块互动法律学习平台。**V0.1 完全本地运行，不调用模型 API，也无需后端或数据库。**

## 六个模块

| 模块 | V0.1 已实现 | 边界 |
| --- | --- | --- |
| 01 模拟法庭 | 原告/被告角色切换、四阶段互动、逐题反馈 | 使用预设情境，不是实时 AI 法官 |
| 02 法律推理 | 四阶段判断流程、分支暂停、路径回看 | 示意性请求权审查树，不自动形成法律结论 |
| 03 证据链实验室 | 选择证据、分析证明目的和真实性疑点 | 不计算胜诉概率或证据强度分数 |
| 04 法学闯关 | 5 道原创案例题、即时解析、分数与本地进度 | 非官方法考题库 |
| 05 案件时间线 | 添加与删除自定义事件、事实/程序过滤、详情、CSV 导出 | 本地浏览器保存；不解析原始案卷 |
| 06 合同审查 | 可编辑文本、TXT 导入、示例合同、规则匹配、修改方向 | **非 AI**、不支持 PDF/DOCX、规则有限 |

所有内容均为**虚构教学案例**。法律争议的真实结论依赖适用法、事实、证据和程序，不能仅靠本产品认定。

## 本地开发

要求 Node.js 22 或更新版本及 npm。

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的本地网址（通常为 `http://localhost:5173`）。

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

注意：`npm test` 使用 Node.js 22+ 的 TypeScript 类型擦除能力。

## 免费部署：Cloudflare Pages

建议将功能分支合并到 `main` 之后再部署；首次操作请勿直接部署未经审查的分支。

1. 登录 Cloudflare，进入 Workers & Pages → Create → Pages → Connect to Git。
2. 连接 GitHub 的 `LawLab` 仓库，并选择要发布的分支。
3. Framework preset 选 Vite，Build command 填 `npm run build`，Output directory 填 `dist`。
4. 部署后得到一个 `*.pages.dev` 的公开 HTTPS 地址。以后提交更新可自动触发部署。

**部署为公开网站之前**请审核文案和法律内容，移除任何真实客户信息。静态部署不需要密钥；若后续引入 AI，不可将密钥写入 `VITE_*` 或前端源码，应使用有鉴权和限流的服务端代理。

## 项目结构

```text
src/
  App.tsx                 # 六模块状态和 UI
  styles.css              # 浅色响应式设计
  data/cases.ts           # 虚构案例、庭审脚本、练习题与证据
  lib/contractRules.ts    # 本地透明规则筛查
  lib/timeline.ts         # 时间线结构、排序与 CSV 导出
tests/                    # 无依赖 Node 测试
docs/ROADMAP.md           # 产品路线与合规约束
```

## 数据与隐私

- 合同文本：仅运行时内存处理；不持久化、不上传。
- 时间线和答题记录：浏览器 `localStorage` 保存；同一设备的其他使用者可能访问。请勿输入真实敏感案件数据。
- 目前无用户系统、云端数据同步、账户隔离、日志上报或 AI API 请求。
- 因文本筛查采用正则规则，漏报和误报均可能发生；**未命中规则不代表合同安全**。

## 许可

当前代码供项目所有者开发和演示；尚未选择开源许可证。仓库公开不自动代表可自由复制或再许可。