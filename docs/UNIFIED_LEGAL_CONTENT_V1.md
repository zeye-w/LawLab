# LawLab 统一法律内容与案例数据体系（V1 基础架构）

## 范围与边界

当前 PR 仅交付**内容契约、原演示数据的规范化映射、来源审查门槛与校验测试**。不自动认定法条效力、不新增任何真实裁判案例、不调用 AI 生成法律依据、不迁移用户本地存储、不改动合同解析/庭审/论文 API。数据仍是浏览器打包的静态演示内容。

**重要：** P1 已加入 6 个待人工核验的官方文本条文定位（详见 [LEGAL_AUTHORITIES_P1.md](LEGAL_AUTHORITIES_P1.md)）， 所有从旧页面迁移的概念仍标为 `editorial.status=pending`，来源统一为 `validity=unknown`。候选来源不代表法律效力或观点已获人工复核。案例明确标为 `nature=fictional`，证据与待证事实的连线是候选关联，绝不是事实已获证明。

## 结构

| 文件 | 用途 |
| --- | --- |
| `src/content/schema.ts` | v1 TypeScript 类型：法域、法律来源、概念、案例、争点、待证事实、证据、关系、事件 |
| `src/content/registry.ts` | 当前 9 个概念与 1 个虚构买卖合同案例的可追溯演示迁移；兼容现有 legacy ID |
| `src/content/validate.ts` | 发现 ID 冲突、悬空引用、日期异常、核验凭据缺失、未校验的法律效力标记 |
| `tests/contentRegistry.test.ts` | 正常种子及失效、碰撞、虚假已核验数据的失败测试 |

### ID 规则

- 概念：`concept:cn:claims`（原 `claims` 保存在 `legacyId`）。
- 演示案例：`case:cn:equipment-sale-demo-001`。
- 待证事实：`case:cn:equipment-sale-demo-001:fact:payment`。
- 证据：`case:cn:equipment-sale-demo-001:evidence:transfer`。
- 事件：`case:cn:equipment-sale-demo-001:event:f2`。
- 条文/裁判/论文等来源：之后由编辑分配独立、稳定的来源 ID；**不得用正文标题、自动推断的条款编号或法条名称作为身份标识**。

P1 已将法律概念的原始数组移入 `content/seedConcepts.ts`，原 `data/study.ts` 的 `KNOWLEDGE_NODES` 改为 Registry 兼容读视图；2D/3D 均复用同一份概念数据。记忆卡片仍由 `study.ts` 独立管理，案例模块将于后续分批迁移。

### 来源与法律效力

一个 `LegalSource` 至少要有人可核查的标题、法域、发布主体、HTTPS 原始页面、来源类型、规范条次/判决段落或论文页码（核验后必需），以及人工核验信息。

- `pending`：没有核实来源，不可显示为“有效法规”或“事实已核验”。
- `verified`：必须填写 `checkedBy`、`checkedAt`；若对应概念标为已核验，还必须连接同法域、同样已核验的来源。
- `validity`：`unknown`、`in-force`、`expired`。后两种只有在来源经过人工审核时才允许入库。核验日期不是法律失效/生效日期，须分别记录 `effectiveFrom`/`effectiveTo`。
- 来源网页/裁判文本必须人工阅读；**当前的自动校验仅验证数据自洽和元数据格式，不会联网判断真伪、及时性或法律效力**。
- 新增外国法律与司法辖区时使用显式法域，不把中国法结论无提示地套用其他司法辖区。

### 案例和证据

案例保持 `fictional` 标记，争点引用概念与待证事实，候选证据通过 `EvidenceFactLink` 指向相应待证事实。关系只表达可能的支持、质疑或背景联系，不构成证据采信或胜诉概率。每份证据的真实来源、真实性、关联性、完整性需独立核验。

旧时间线的 `evidence` 仅有文字说明，尚无可靠 ID，迁移时保存在 `legacyEvidenceDescription`，**不会猜测它属于哪个证据对象**。后续证据包到位后再人工建立引用。

### 扩展与迁移顺序

1. **P0（本 PR）**：内容模型、稳定 ID、演示数据适配、校验与维护边界。
2. **P1**：以此契约建设经过编辑核查的概念+规范来源目录（法域、版本、效力、引用定位）；通过独立 PR 渐次把 2D/3D 视图切换到 Registry。
3. **P2**：完善统一虚构案例数据包（原文、时间线、争点、矛盾证据、反方陈述），再复用到证据链、法律推理、模拟法庭和闯关。
4. **P3**：在不降低证据可追溯性的前提下扩展二级知识图谱、领域筛选与案例联动。

## CI

`npm test` 包含 v1 数据完整性与恶意数据负例。新内容进入 Registry 前执行 `assertValidContent()`，不可将验证失败的数据静默写入页面。Schema 版本升级须提供迁移计划和兼容测试，不能复用旧 ID 代表不同法律命题。

当前 PR 与 3D 图谱 PR #17 独立：**如果 #17 仍是 Draft，应先验收合并 #17，再逐步将 2D/3D 的读取路径从旧数据迁移到 Registry**。不要用覆盖图谱文件的方式强行合并。
