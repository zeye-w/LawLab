# LawLab — 交互式法律学习与实务实验室

> LawLab V0.4.1 is an educational and workflow prototype with optional cloud AI in the paper module, **not a legal advice system**. All example cases are fictional.

LawLab 采用双入口：

- **学生版 · LawLab Learn**：法律记忆卡片、法律知识图谱、论文写作、文献研究与云端 AI 分析工作台、法学闯关、法律推理训练、模拟法庭；
- **专业版 · LawLab Practice**：分为**诉讼业务**（证据链、案件时间线、法律推理与庭审训练）和**非诉业务**（本地合同规则审查）。

专业版目前仅提供**教学与工作流示例**，不具备客户权限管理或专业级法律 AI 能力，也不适合处理真实客户的敏感资料。

## 功能和入口

| 入口 | 功能 | 当前实现 |
| --- | --- | --- |
| `#home` | 双版本首页 | 学生版、专业版入口 |
| `#learn` | 学生学习空间 | 模块导航及现有五项学习工具 |
| `#flashcards` | 主动回忆卡 | 12 张原创卡；按学科/状态筛选，翻面、掌握/待复习标记及浏览器本地记录 |
| `#knowledge` | 互动知识图谱 | 9 个法律概念节点；选中节点高亮相关概念、阅读解释并沿关联跳转 |
| `#paper` | 法学论文写作 | 研究设计、Crossref DOI 检索、浏览器 PDF 解析、可选 Workers AI Qwen 观点提取、原文引证比对、观点与逻辑、Markdown/JSON 导出 |
| `#quiz` | 法学闯关 | 5 道原创情境选择题、即时解析及进度 |
| `#reasoning` | 法律推理 | 4 步模拟请求权审查；学生版与诉讼版共享 |
| `#court` | 模拟法庭 | 原被告角色切换、四阶段预设庭审练习 |
| `#practice` | 专业版 | 诉讼与非诉两个子工作台 |
| `#litigation` | 诉讼工作台 | 证据链、案件时间线、法律推理和模拟法庭 |
| `#evidence` | 证据链 | 证据筛选、证明目的和局限性分析，不计算胜诉概率 |
| `#timeline` | 案件时间线 | 增删自定义节点、事实/程序筛选、CSV 导出 |
| `#nonlit` | 非诉工作台 | 当前提供合同审查入口；尽调和合规仅为后续规划 |
| `#contracts` | 合同审查 | 浏览器内直接导入 TXT、Word 97–2003 `.doc`、`.docx` 与文字型 PDF，提取全文交由本地规则引擎筛查；不上传原始合同 |

旧版 `#court`、`#timeline` 等深链接仍可使用。学生版与专业版**复用**相同的推理、演练和数据处理组件。

## 本地运行及验收

需要 Node.js 22+ 和 npm：

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

`npm test` 包含原有合同/时间线、知识卡/图谱、论文写作及新增研究工作流的自动化测试。建议在桌面与手机宽度下检查双入口、原有深链接、卡片翻面和状态筛选、知识图谱关联、诉讼/非诉功能入口及本地存储行为。

## 部署与版本安全

Cloudflare Workers 上现有的线上网站由其绑定的 Git 分支构建。论文模块在独立开发分支中审查，**未经验收不合并到 `main`**；在审核功能、测试和构建前，不要将新分支设置为生产发布分支。静态前端产物为 `dist`，构建命令为 `npm run build`。


## 论文研究工作流（V0.3）

1. **研究设计**：明确论文题目、研究问题及拟论证观点。
2. **文献检索**：向 `https://api.crossref.org/works` 发送用户输入的关键词，读取最多 12 条真实 DOI 题录；支持打开 DOI 原文入口，将题录以**待核验**状态加入资料库。无检索结果或浏览器网络/CORS 限制时，可跳转外部 Crossref 搜索；中文法学文献可手动输入。
3. **观点与逻辑**：使用者阅读原文后，记录观点、依据页码、反对意见/局限，并手动选择「支持 / 不同意见 / 背景 / 未分类」；平台按标注生成观点矩阵，指出缺失的论证要素。**不是自动摘要或 AI 判定学术共识**。
4. **写作引导**：按研究问题、论点及笔记生成可追溯到已登记来源的章节分析指引。用户选择章节后附加到该章节独立的「写作笔记」区域，不计入正文字数和完成度，也不随 Markdown 导出；正文需自行成文、核实引注。
5. **导出与恢复**：保存到本机浏览器，Markdown 和 JSON 导出；新研究字段随 JSON 一并保存。不要在共享电脑使用真实客户或敏感资料。

**隐私提示：**检索词会发送到 Crossref。论文正文、文献整理笔记不发送到 Crossref 或 LawLab 服务器。此版本没有自动全文获取、中文法律数据库授权接口或付费大模型能力。

## 合同审查文件导入（V0.4.1）

非诉业务中的 `#contracts` 现在可导入 `.txt`、Word 97–2003 二进制 `.doc`、现代 `.docx` 和**带可选择文字层的 PDF**。解析发生在浏览器，**不会向 Cloudflare、LawLab 服务端或 Qwen 提交合同内容**，与论文模块的可选云端 AI 独立。导入成功后，文本进入原有 `reviewContract` 规则引擎，用户可先检查和修改文本，然后主动点击「开始审查」。

- 支持最大 **8 MB** 的文件、提取正文最大 **120,000 字符**、PDF 最多 **80 页**。超出时明确报错，不自动截断后误提示合同安全。
- PDF 利用现有 PDF.js；DOCX 使用按需加载的 [Mammoth](https://github.com/mwilliamson/mammoth.js) 只提取正文纯文本；Word 97–2003 DOC 使用按需加载的 [JSDoc](https://github.com/Alpaq92/JSDoc) 0BSD 解析器（原始代码与许可参见 `src/lib/vendor`）。这些解析器不做图文排版保真，也不执行文件宏。
- 扫描 PDF 需要先 OCR；密码保护、损坏、早期不兼容 DOC 和含大量图片/批注/修订的合同可能无法完整提取。**合同中的表格、扫描附录、脚注、签章与修订记录需人工核对原件**。
- 上传失败时保留原编辑文本并显示错误，不会运行部分解析文本的合同审查。导入后会提示来源文件和文字长度；原始合同文件不持久存储，不提供 AI 自动法律审查。

## V0.4 Cloudflare AI 的配置

新增的 `wrangler.jsonc` 包含 `AI` Binding、`worker/index.ts` 服务端和 `dist` 静态资源映射。**只有静态文件构建不会启用 AI API。** 需要管理员设置至少 24 字符的 `LAWLAB_AI_ACCESS_TOKEN` Secret，并部署完整 Worker（含两个限流 Binding：每 IP 每分钟 4 次、全站每分钟 20 次）；用户在 `#paper` →「AI 文献分析」中输入访问码。完整步骤、安全限制及 CI 验收见 [docs/CLOUDFLARE_AI_V04.md](docs/CLOUDFLARE_AI_V04.md)。此模块只处理前 12 页、合计不超过 16,000 字符，不声称完成整篇论文的全文分析；AI 观点卡须人工复核。

## 数据与合规

- V0.4 增加**可选 Cloudflare Workers AI 模型推理**（使用访问码，依赖 AI Binding 和站点管理员 Secret），只在用户主动点击 AI 分析时，将 PDF 在浏览器提取的有限页文字发送到 Cloudflare 模型服务。PDF 文件本身不上传；未启用 AI 的站点仍保留纯本地编辑器和 Crossref 检索。不能获取付费论文全文、自动核实法律效力或保证模型观点正确。
- 记忆卡片标记（`lawlab:v02:flashcard-progress`）、论文项目（`lawlab:student-paper:v1`）、原有答题进度和自定义时间线写入本机浏览器存储；共享设备可能看到这些数据。论文内容及手动整理的来源观点随项目保存，须定期导出 JSON 备份；旧版 JSON 备份兼容。
- 合同文本仅在当前页面的运行时内存中分析，无后台上传；支持 TXT / DOC / DOCX / PDF 的浏览器解析，含 8 MB 文件大小、12 万字符及 80 页 PDF 的完整性限制；仅支持本地规则提示，不能证明合同安全。
- 所有案例、学习材料和概念图为演示，法律规则与个案结论应核对适用地区及现行法律。Crossref DOI 题录只是元数据，用户必须自行核查原文、适用法域及引文；观点分类、对照、缺口提示与写作提纲都基于使用者手动填写的研究笔记，不是 AI 读取全文后的学术结论。
- 请勿使用真实客户文件、隐私或商业机密测试；专业版上线处理真实材料之前，需完善授权、访问控制、加密、日志审计、数据删除、律师复核等机制。
- 浏览器存储的学习和案件资料不会自动迁移到其他设备。

## 主要文件

```text
src/
  App.tsx                  双入口、三个子工作台、现有功能
  components/StudyTools.tsx 记忆卡片与可选知识图谱
  components/PaperWorkspace.tsx 论文写作界面
  components/ResearchWorkbench.tsx DOI 检索、观点对照、写作引导
  components/AIAnalysis.tsx  云端 AI 辅助文献观点提取
  lib/pdfExtract.ts        浏览器端 PDF 分页解析
  worker/index.ts          Workers AI 认证与推理 API
  worker/grounding.ts      文本限额和原文引证校验
  components/research.css      研究工作流响应式样式
  components/paper.css       论文写作响应式样式
  data/study.ts             原创卡片与概念节点
  data/cases.ts             虚构案例数据
  lib/timeline.ts           事件排序、CSV 导出
  lib/contractRules.ts      本地规则引擎
  lib/contractImport.ts     TXT、DOC、DOCX、PDF 本地正文解析
  lib/vendor/docToText.js  0BSD 许可的 Word 97–2003 解析器（按需加载）
  lib/paper.ts              论文结构、导出与备份验证
  lib/research.ts           Crossref 元数据规范化及论证指引逻辑
  styles.css                响应式视觉样式
tests/
  contractRules.test.ts     现有合同与时间线测试
  contractImport.test.ts    合同格式校验、中文文本、旧式 DOC 与 DOCX 安全检查
  study.test.ts             学习内容与图谱完整性测试
  paper.test.ts             论文工作台的结构与导出测试
  research.test.ts          文献元数据、观点对照及兼容性测试
  ai-analysis.test.ts       原文证据核查与安全输入约束
```

## 许可证

当前未选择开源许可证。公开仓库不自动授予他人再许可或商业使用权。
