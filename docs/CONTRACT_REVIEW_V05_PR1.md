# LawLab V0.5 · PR1 核心数据与来源完整性

## 设计边界
本 PR 实施规划中第一个功能 PR：合同来源版本、解析完整性和页面组件拆分。**不新增审查规则、不引入云端合同分析、不修改 Worker API、不合并 main。**

## 代码清单
- src/components/contracts/ContractWorkspace.tsx：从 App 拆出合同审查界面，保留导入、编辑、示例、六项原规则及选择风险详情。
- src/lib/contracts/workspace.ts：纯函数状态变更，每次文件导入、手工编辑或重置产生 revisionId，清空此前审查结果；展示 findings 必须匹配来源 revisionId。
- src/lib/contractImport.ts：在现有导入返回值上扩充 integrity 和 PDF pageSpans。pageSpans 绑定当前标准化正文的半开字符区间及真实物理页编号；不能确认区间时失效映射，不猜页码。
- tests/contractCore.test.ts：原规则回归、来源版本隔离、页码区间、部分解析风险提示。

## 状态语义
- complete：没有检测到提取缺口，并不宣称合同已通过法律审查，也不证明图像、附件和所有版式均被处理。
- needs-review：可见文本可运行教学用规则，但可能遗漏原始内容。老式 DOC、DOCX、部分 PDF 空白页及编辑后的文本采用该状态。
- blocked：预留给未来明确禁用审查的来源。当前导入器遇到加密、损坏和超限直接抛错，不把部分正文写入编辑器。

PDF 物理页码不是图形高亮坐标。空白页保留原始页码的间隔，来源区间只针对文本；二次规范化如破坏区间一致性，整组区间作废并提示人工核对。DOC/DOCX 不生成推测的物理页码。

## 用户可见变化
1. 导入后展示文件名、字符数、PDF 总页数和完整性状态；
2. 需核对的内容明确显示风险范围限制；
3. PDF 提供可追溯的页文本范围数；
4. 用户编辑任意字符后，旧风险、旧 PDF 页码定位与旧文档元数据立即失效；
5. 原六项风险检查继续保持。

## 自动化与浏览器验收
执行 npm ci、npm test、npm run build、wrangler deploy --dry-run。
在 Preview 的 /#contracts 导入 TXT / DOC / DOCX / 文字型 PDF，核对原规则命中、空白页完整性警示、修改文本后风险结果立即清除、重新运行六项规则准确、合同内容没有自动上传请求。

## 回滚
独立 PR 未合并不会影响 Production。合并后可撤销 squash merge，无合同数据库迁移或 Secret 改动。
