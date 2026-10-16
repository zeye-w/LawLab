# LawLab V0.5：结构化合同审查工作台实施方案

> 状态：设计草案 / 仅规划，不包含功能实现；基线为 2026-10-16 的 main（V0.4.1，PR #6 已合并）。
> 目标入口：LawLab Practice → 非诉业务 → 合同审查（/#contracts）。
> 产品定位：教学与脱敏样例的合同条款筛查工具，输出**待人工复核的风险提示**，不生成确定性的法律结论。
> 约束：默认全过程仅浏览器本地处理。V0.5 不将合同文本传送至 Cloudflare Workers AI 或其他外部服务。

## 一、现状审计（以当前 main 源码为准）

- src/App.tsx 中的 ContractReview() 直接管理文本、导入、结果与界面，体积大、耦合高；需要拆出独立模块。
- src/lib/contractImport.ts 已支持 .txt、Word 97–2003 .doc、.docx 和文字型 PDF；大小上限 8 MB、提取正文上限 120,000 字符、PDF 上限 80 页。返回 name / format / text / warnings / pages，但不保留精确原文坐标或条款到页码的映射。
- src/lib/contractRules.ts 只有五项显式正则风险（解除、单方变更、付款期限、免责、验收）和一项争议解决条款缺失提示；每项风险通常只用 pattern.exec(text) 匹配一次。无合同类型、条款编号、匹配位置、排除条件、复核状态、模板化审查报告。
- 当前 PDF 若部分页面无正文可提示警告，但仍可继续审查其余页面；部分文本不宜作为「全文通过审查」。
- 页面没有持久客户项目或身份体系；保留该限制，V0.5 不导入真实未授权客户合同。
- worker/index.ts 的云端 AI 接口仅针对论文分析；V0.5 不调用或修改此接口。

## 二、V0.5 成功定义与范围

### V0.5 必须交付（Must）
1. 保留四格式导入、手动粘贴与示例合同；增加全文提取状态（complete / needs-review / blocked）、来源文档信息、缺页/扫描警告。若来源不完整且未获人工确认，阻止生成「已审完整合同」的报告结论。
2. 基于正文的稳定条款分割：识别「第一条」「第1条」「1.」「1.1」「（一）」等常见标题，维护层级/偏移/原文；无法分割时显式进入按段落人工修订模式，不得编造编号。
3. 条款分类：付款与结算、交付与验收、违约责任、合同解除、变更、争议解决、保密、知识产权、期限及其他。分类为规则辅助和可手工改正，不等于法律判断。
4. 审查清单：规则命中/未检出/无法判断分离；针对服务及货物买卖的通用条款默认清单；不能对片段或缺页合同生成确定性缺失结论。
5. 证据定位：每条 finding 绑定至少一条来源定位（contract revision + clauseId + start/end + quote），原文能从同一版完整文本按偏移精确恢复；导入 PDF 时尽可能同时保留物理页码。
6. 多次命中、去重、例外排除及最小上下文；单条规则可以返回多条风险，但需上限和合并策略。严格区分「高关注/需关注」与是否违规、无效。
7. 人工复核：待复核 / 已确认 / 误报 / 待补资料；审查意见与修改建议可编辑；审查处理不覆盖原合同正文。
8. 本地导出：先导出版本化 JSON 审查结构，再基于同一模型生成可编辑 DOCX 报告，包含来源摘要、审查范围、全部待核查项目、对应条款、引文、风险分析、修改方向、复核状态、免责声明。
9. 编辑原文后，所有旧 findings 必须失效并重新运行审查；导出前进行 revision 对齐与来源检查。
10. 全面测试与 Cloudflare Preview 验收，用户确认后才合并到 main。

### 暂不包含（Won't）
- 合同自动改写后覆盖原 Word 文档、修订模式/红线对比、Word 格式回填。
- 对扫描合同进行 OCR、自动识别印章签名、表格图片法律分析。
- 客户账户、多人协作、案件持久云存储、正式合同审计和权限。
- 调用 Cloudflare Qwen 对合同进行自动法律分析；要做需另立隐私/授权/认证/成本专题。
- 根据法律名称编造具体法条或断言条款合法/无效。
- 多合同批量审查及第三方付费法规/司法案例数据库对接。

## 三、用户流程

1. 在 /#contracts 导入合同或粘贴脱敏正文。
2. 展示来源信息、字符数、页数、解析完整性，以及需人工核实的页码/附录缺失提示。
3. 展示可编辑「条款目录 + 合同文本」，允许人工合并/拆分条款与修正类别（不得悄悄改变原文）。
4. 选择合同类型（通用服务合同、货物买卖合同、其他）以及审查立场（中立；其他立场作为后续扩展）。
5. 点击「执行规则筛查」；显示总清单以及与条款绑定的逐项风险。
6. 点击风险可定位到合同内具体引文与条款；对于 PDF 只承诺定位提取文本的物理页码，**不承诺在原 PDF 文件中图形高亮**（V0.6 候选）。
7. 标记复核状态、修改建议和备注；标记需要另行人工判断的事项。
8. 选择导出 JSON 或 DOCX 审查报告。报告只声称「已对当前提取文本执行规则筛查」，明确列出未覆盖项目；若存在部分未解析页面，必须突出“分析范围不完整”。
9. 重新导入或编辑文本时清除或标记为过期的旧结果，防止把旧证据误用于新版本。

## 四、建议架构

保持 React + TypeScript + Vite + Cloudflare Static Assets，合同审查逻辑全在前端；规则纯函数化。UI 由独立组件承载，避免继续扩张 App.tsx。

建议目录：
- src/components/contracts/ContractWorkspace.tsx：页面容器与状态机。
- src/components/contracts/ContractSourcePanel.tsx：合同原文与条款目录。
- src/components/contracts/ContractReviewPanel.tsx：风险清单、过滤和审查详情。
- src/components/contracts/ContractReportPanel.tsx：审查摘要与导出。
- src/components/contracts/contracts.css：页面与移动端样式。
- src/lib/contracts/types.ts：合同、条款、定位、风险、审查记录、报告领域类型。
- src/lib/contracts/segment.ts：层级条款分割；支持可核验的字符范围。
- src/lib/contracts/classify.ts：可解释类别词典 + 手工分类覆盖。
- src/lib/contracts/ruleRegistry.ts：独立规则与作用范围、排除条件、风险标签。
- src/lib/contracts/reviewEngine.ts：范围感知、命中证据、重复检测、排序。
- src/lib/contracts/report.ts：审查结果稳定快照和审查范围说明。
- src/lib/contracts/exportJson.ts、exportDocx.ts：先实现结构化数据，再懒加载 DOCX 导出依赖。
- src/lib/contractImport.ts：扩展返回的文本来源映射与缺失状态，不移除原有 API。
- src/lib/contractRules.ts：保留 reviewContract(text) 旧入口包装新规则引擎，保证 V0.4.1 行为回归；后续如调整需显式版本化。

数据流：

  TXT/DOC/DOCX/PDF/粘贴
      → 本地解析 + 格式边界验证
      → ContractSource{revision,text,sourceMap,integrity}
      → segmentContract() → ContractClause[]
      → classifyClauses()
      → runRuleRegistry() → ContractFindingV2[]
      → 人工复核 ReviewDecision[]
      → ReportSnapshot（只读校验）
      → JSON / DOCX（本地生成）
  
不应直接将旧版 ContractFinding 的 quote/regex 结果作为完整业务证据。

### 推荐 TypeScript 领域模型（示意，实施时单独评审）

    type Integrity = 'complete' | 'needs-review' | 'blocked';
    type ReviewStatus = 'pending' | 'confirmed' | 'false-positive' | 'needs-info';
    type Category =
      'payment' | 'delivery' | 'acceptance' | 'liability' | 'termination' |
      'amendment' | 'dispute' | 'confidentiality' | 'ip' | 'term' | 'other';

    interface ContractSource {
      revisionId: string; // 每次导入/手动编辑后的文本版本 ID
      filename?: string;
      format?: 'txt' | 'doc' | 'docx' | 'pdf' | 'pasted';
      text: string; // 经过一次且仅一次标准化的审查文本
      integrity: Integrity;
      warnings: string[];
      pageSpans?: Array<{page: number; start: number; end: number}>;
    }
    interface ContractClause {
      id: string; revisionId: string;
      label: string | null; level: number;
      title?: string; category: Category;
      start: number; end: number; // 原文半开区间 [start,end)
      parentId?: string; classificationSource: 'rule' | 'manual';
    }
    interface FindingEvidence {
      revisionId: string; clauseId: string;
      start: number; end: number; quote: string;
      page?: number; // PDF 物理页，仅在证据区间可确定时填写
    }
    interface ContractFindingV2 {
      id: string; ruleId: string; severity: 'high'|'medium'|'info';
      status: 'flagged'|'missing-suspected'|'needs-review';
      title: string; reason: string; suggestion: string;
      evidence?: FindingEvidence; exclusions?: string[];
    }
    interface ReviewDecision {
      findingId: string; status: ReviewStatus;
      comment: string; revisedSuggestion?: string;
    }

不变量：对所有带证据的 findings，必须有 source.revisionId === evidence.revisionId 且
source.text.slice(evidence.start,evidence.end) === evidence.quote；
证据偏移必须落在对应 clause 的 [start,end) 内；编辑后重新构建 segments 和 findings。
同一规则不同命中应能定位到不同位置；缺失条款检查不能伪造 evidence。

PDF 物理页码由原始提取阶段的「按页文本 + 展平偏移」确定；如果用户编辑了展平文本，页码映射需作废，不能沿用旧位置。DOC/DOCX 提取后的页码通常无法稳定提供，只显示条款与文字区间。

## 五、规则设计与风险边界

### 初期默认规则组（围绕当前六项扩充）
- 履约：交付时间、对象、质量、验收标准、付款条件、逾期履行。
- 权利义务：单方变更、任意解除、提前通知、免责限制。
- 争议：约定不明、争议解决渠道，不能依据片段推断整份合同缺失。
- 商业辅助：保密、知识产权归属、合同期限、通知方式。
- 对不支持的合同类型，只运行通用规则并明确范围，用户应人工审查。

每条 RuleDefinition 必须至少含：ruleId、version、applicableCategories、applicableContractTypes、severity、predicate/evidenceMatcher、exclusion tests、reasonTemplate、suggestionTemplate。对法域或法条不明确的规则，不展示虚构法律引用。

建议规则引擎输出三种不同统计：命中风险、清单未发现相关条款（仅完整来源允许）、无法判断/未覆盖。不显示「审查通过」或「无风险」徽章。每条 regex 多次匹配时设置结果上限并避免空匹配死循环；对否定、双重否定、例外条款和跨条引用设计 false-positive 测试。

## 六、前端信息架构

桌面端：左侧合同条款目录与原文；右侧风险清单、证据和复核详情；顶部为导入完整性、合同类型、执行审查、报告导出。
移动端：来源 / 风险 / 报告三个切换视图；所有按钮键盘可访问。
风险卡显示：类别、关注程度、规则来源、条款编号、简短原文、待人工复核状态。点击可跳转并高亮**提取文本**，非 PDF 图形坐标高亮。
报告中包含：「审查范围」「机器规则筛查结果」「未覆盖/无法判断」「人工确认意见」「限制与免责声明」。不输出“合法/无效”等最终断言。

## 七、数据安全、合规与错误处理

- 默认不向服务端、Crossref、Workers AI 传输合同内容；不要复用论文 AI 接口。
- 默认内存持有原合同及结果，不自动写入 localStorage、Analytics、错误日志或 URL 查询参数。
- 用户主动下载 JSON/DOCX；文件名安全处理，不写入敏感元数据；禁止 remote images、外链抓取和 HTML 注入。
- DOCX 只用本地构造文本、段落、表格；不生成外部模板请求；导出依赖使用动态 import。
- 如果原 PDF 某页无正文、存在扫描附录或导入阶段发出不完整警告，应在界面和报告同步标注；没有证据证明完整时禁止输出确定性「未发现缺失条款」。
- 条款分割失败、未知类别、文件超限与失效证据全部以用户可理解的错误/警告显示，不自动跳过后继续宣称正常。
- 内存和渲染限制：继续遵守 8 MB、120,000 字符、80 页 PDF 的既有上限；增加条款数量/风险卡上限及 UI 性能测量。
- 完整性校验和手工复核属于本地演示能力，不构成律师签署的正式意见。处理真实客户数据前需另建访问控制/合规专题。

## 八、测试计划和验收门槛

### 单元/性质测试
1. 分割规则：第一条、第1条、1.1、（一）、段落、引用中的编号、重复编号、空行、标题缺失；每个 clause 的原文偏移合法且无越界。
2. 来源映射：TXT/DOC/DOCX/PDF、中文空白归一、PDF 物理页；提取文本/页码一致，修改后旧 offset 不可再导出。
3. 风险规则：原有六条回归、各类新增规则的正反例；同一规则多次命中；嵌套否定、例外、不适用合同类型；误报状态人工校正。
4. 证据不变量：所有机器 finding 中的 quote 必须出现在对应版本和 clause，且起止偏移精确还原；引文/页码不明的条目只能以缺失/待核查形式表示。
5. 缺失条款：complete 才允许「疑似缺失」；needs-review/blocked 仅给出「未完成评估」。
6. 编辑状态：改动文本后 findings/review decisions 失效；重新运行后生成新 revision，绝不复用过期证据。
7. JSON：schemaVersion、输入长度上限、危险键、畸形数据；不从不可信 JSON 执行任何代码。
8. DOCX：生成后解包验证存在 document.xml、核心中文栏目/条款/免责声明、危险字符串转义、没有外部关系与网络请求。

### 浏览器集成与端到端测试
- 使用完全虚构/脱敏固定样本：至少服务合同、买卖合同、无编号合同、格式复杂合同、缺页/扫描 PDF、旧式 DOC、DOCX 表格、异常/加密文件。
- 上传 → 原文 → 分割 → 风险 → 点击证据 → 人工标注 → JSON / DOCX 下载全链路；下载后 Word/WPS/LibreOffice 打开中文不乱码。
- 关键路径在窄屏/桌面、键盘导航、网络离线环境下验收。
- 上传未授权真实合同为排除项；测试数据需不含客户秘密。
- 现有论文、模拟法庭、时间线、首页及 deep link 不能回归。

### CI 与验收
每个功能 PR 均运行 npm ci、npm test、npm run typecheck、npm run build、npx wrangler deploy --dry-run；独立 Cloudflare Preview 构建成功，审查源码变更、隐私边界、bundle 大小、DOCX 生成和无副作用导入后，再请用户浏览器验收。仅在用户明确批准后合并 main。

最低可验证验收指标（针对固定标注测试集，而非宣称普适法学准确率）：
- 所有确认输出的证据字符串匹配率 100%，无跨版本证据。
- 四种格式至少各一个真实解析路径的浏览器验收样本。
- 老版六项合同提示规则的样例回归 100%。
- 非完整文档的缺失类判断一律降级为待核查。
- 不发生自动上传合同内容；无自动网络 AI 调用。
- DOCX 可打开、包含全部选定 findings、来源/未覆盖说明、人工复核记录。
- 所有 CI 构建/测试通过；主分支在正式合并前不受影响。

## 九、拆分为五个独立开发 PR

所有开发 PR 从最新 main 建立自己的 feat 分支；前置 PR 合并后，下一个分支 rebase/从更新的 main 派生，避免并行覆盖同一领域模型。草案 PR 保持 Draft，用户验收后再合并。

| 顺序 | 建议分支 | 范围 | Done 条件 |
| --- | --- | --- | --- |
| 1 | feat/v05-contract-core | 领域类型、组件拆分、合同 revision/完整性/sourceMap、原入口兼容 | 四格式回归，编辑失效测试，页面不回归；不修改规则效果 |
| 2 | feat/v05-contract-clauses | 条款分割/层级/分类、可人工修正目录 | 固定样本偏移可恢复，分类可改正，未识别分割明确提示 |
| 3 | feat/v05-contract-rules | 版本化规则注册表、多次命中、排除规则、缺失类安全门槛、证据范围 | 六条旧规则回归、多命中/否定案例、100% 证据不变量 |
| 4 | feat/v05-contract-workflow | 左右联动风险 UI、复核状态、过滤与摘要；手机布局 | 浏览器完整复核流程与编辑后结果失效 |
| 5 | feat/v05-contract-report | schemaVersion JSON 与客户端 DOCX 报告、脱敏提示、端到端验收 | Word/WPS 打开、内容覆盖、无合同上云、用户最终验收 |

建议改动保持小且独立，每个 PR 描述必须附对照截图、测试结果、数据隐私影响与回滚方案。若文档导入质量比预期差，先修复来源保真度，不提前进入大规模规则扩充。

## 十、风险分级与依赖

P0：
- 缺页/扫描/表格漏提却显示风险清单无问题；
- 文本编辑后引文坐标错位；
- 一个正则首次命中导致其他条款风险被漏掉；
- 规则匹配命中无法证明司法上的条款效力；
- 生产环境意外向已有 AI API 发送合同正文。

P1：
- 条款编号歧义、跨条引用；
- DOC/DOCX 无可靠分页；
- Word 导出中文字体/排版兼容及文件大小；
- 长合同重排、UI 卡顿和 ZIP 解析性能。

依赖原则：优先使用已有 PDF.js、Mammoth、vendored DOC 读取器；DOCX 报告生成优先选可以在浏览器构造 OOXML、并可按需加载的库，版本/许可证/构建体积在 PR5 中审计后锁定。避免单个 PR 引入大型云端 AI 依赖。

## 十一、开发启动与验收顺序

1. 先评审并冻结本规划的数据结构、隐私边界和验收矩阵；
2. 执行 PR1（核心领域模型 + 拆组件 + 来源完整性）；
3. PR1 通过自动化 + Cloudflare Preview + 用户验收并合并后，依次执行 PR2 至 PR5；
4. V0.5 最终将完整导出报告流程用虚构样本手工验收；
5. 仅在最终验收后更新版本、README 与正式部署。

**当前规划 PR 只包含本 Markdown 文档，不应被视作任何功能已完成。**
