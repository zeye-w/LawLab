# LawLab P1 · Registry 驱动的知识图谱和候选法律依据

## 交付边界

本 PR 首次让 **2D 与 3D 知识图谱、节点详情和关系图从同一 Registry 读取概念数据**。通过稳定的兼容视图仍对外提供原来的 `relationship`、`claims` 等 ID，保证力导向布局、空间布局、卡片与原回归测试行为不变。没有新增二级概念，没有改动用户浏览器存储。

首批候选法律出处来自官方发布网站，收录 2 个官方文本的 6 个**条文级**定位。这里的“来源”指可供查阅的正文页面及条次：**并未完成法律研究人员针对现行效力、修订、适用法域、时间和具体命题的独立复核**，所以来源的 `validity=unknown`、`editorial.status=pending`，知识概念也继续标为 `pending`。界面统一展示“待人工核验”，不得把候选来源当作已确认的规范结论。

## 新数据路径

```text
src/content/seedConcepts.ts
    └── src/content/registry.ts (+ sourceCandidates.ts + seedCaseFacts.ts)
           ├── src/data/study.ts -> KNOWLEDGE_NODES (legacy view)
           │      ├── relationshipMaps.ts -> edges / layout
           │      ├── KnowledgeNetwork.tsx (2D)
           │      └── KnowledgeNetwork3D.tsx (3D)
           └── getConceptSources(id) -> StudyTools.tsx sources panel

src/content/seedCaseFacts.ts
    ├── content/registry.ts (case migration fixture)
    └── lib/relationshipMaps.ts (existing evidence graph)
```

`src/data/study.ts` 中仍保留独立学习卡片 `STUDY_CARDS`，但**不再独立维护另一份法律概念数组**。注册表不依赖 `study.ts` 或 `relationshipMaps.ts`，避免运行时循环引用。概念 ID 已从 `id` 显式映射为 `concept:cn:<id>`，绘图继续使用原 `legacyId`，以后可分别迁移。

## 候选条文目录

| 稳定 source ID | 文本 | 定位 | 关联概念 |
| --- | --- | --- | --- |
| `source:cn:civil-code:464` | 中华人民共和国民法典 | 第464条 | 法律关系 |
| `source:cn:civil-code:465` | 中华人民共和国民法典 | 第465条 | 合同义务、规范解释 |
| `source:cn:civil-code:577` | 中华人民共和国民法典 | 第577条 | 请求权基础、合同义务 |
| `source:cn:evidence-rules:87` | 最高人民法院关于民事诉讼证据的若干规定（2019年修正文本） | 第87条 | 待证事实、证据评价 |
| `source:cn:evidence-rules:90` | 同上 | 第90条 | 证据评价、审慎结论 |
| `source:cn:evidence-rules:93` | 同上 | 第93条 | 证据评价 |

发布网址和元数据位于 `src/content/sourceCandidates.ts`。上述概念映射只是“**可能有关联，建议审查**”，**不等于条文直接定义该概念**。尤其是“请求权基础”“规范解释”等教学性解释的完整学说，需要未来补充专业文献及人工复核后再标为 verified。

官方发布页面：
- [最高人民法院网站：中华人民共和国民法典](https://www.court.gov.cn/zixun/xiangqing/233181.html)
- [最高人民法院网站：关于民事诉讼证据的若干规定](https://www.court.gov.cn/zixun/xiangqing/212721.html)

## 编辑与核验

将来源从 pending 改为 verified 前，编辑应当在当地可访问的官方渠道确认：文本发布者、正文与条次、修订记录、有效时间、章节定位、法律适用地域，以及它是否真正支持当前概念下展示的论述。记录 `checkedAt`、`checkedBy` 以及适用时间；经过核实才能更新 `validity`，并对具体概念逐一关联已核验来源。

代码中的数据完整性测试**只验证结构自洽**，不能代替法律效力和观点的人工复核。网页不会自动连接第三方法规库，也不会自动声称“现行有效”。

## 下一阶段

1. 法律编辑复核以上候选条文并增补直接支持概念的法律规范与专业文献；未验证前保持 pending。
2. 在稳定 ID 不变的前提下扩充二级法律概念、按法域和主题筛选；确保 2D/3D 高密度节点仍可读。
3. 完善统一案例材料数据包后，再切换证据链、庭审、推理及测验模块的读取接口。
4. 大规模新增规范前建立版本迁移、来源撤销机制和按时效重新核验的流程。

## 代码验收

`npm test` 包含 P0 的 `contentRegistry.test.ts` 和新 `knowledgeAuthorities.test.ts`。新增来源需要有 HTTPS 发布页面、定位信息、合法 ID、通过校验的 ReviewStatus，且不可引用不存在的来源。需要另外进行移动端 2D/3D 切换、键盘 Tab 操作和链接可访问性人工验收。
