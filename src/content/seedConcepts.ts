/** Legacy node seed curated once, then normalized into the canonical Registry. */
export type KnowledgeNode = { id: string; title: string; category: '民法' | '证据法' | '法律方法' | '总览'; parentId?: string; summary: string; question: string; related: string[] };
export const SEED_KNOWLEDGE_NODES: KnowledgeNode[] = [
  { id:'relationship', title:'法律关系', category:'总览', summary:'从主体、客体与权利义务出发，识别案件的规范分析起点。', question:'当事人之间究竟是什么法律关系？', related:['claims','contract','facts','rules'] },
  { id:'claims', title:'请求权基础', category:'民法', summary:'依据请求的法律效果寻找规范，逐项审查构成要件及抗辩。', question:'哪项规范可能支持该请求？', related:['relationship','rules','defences','facts','contract','outcome'] },
  { id:'contract', title:'合同义务', category:'民法', summary:'围绕成立、生效、履行及违约后果识别具体义务。', question:'合同要求谁在何时履行何种义务？', related:['relationship','claims','facts'] },
  { id:'facts', title:'待证事实', category:'证据法', summary:'提取每个法律要件相关的具体事实，区分主张与已查明事实。', question:'哪些关键事实仍有争议？', related:['evidence','claims','contract','relationship','burden','outcome'] },
  { id:'evidence', title:'证据评价', category:'证据法', summary:'审查来源、真实性、合法性、关联性以及可能的反证。', question:'现有证据能支持哪些事实？', related:['facts','burden','defences'] },
  { id:'burden', title:'证明责任', category:'证据法', summary:'分析应由谁证明什么，以及事实真伪不明时的风险分配。', question:'该事实由谁承担证明责任？', related:['evidence','facts'] },
  { id:'rules', title:'规范解释', category:'法律方法', summary:'确定适用规范，理解文义、体系、目的和适用条件。', question:'规范的构成要件如何解释？', related:['relationship','claims','defences','outcome'] },
  { id:'defences', title:'抗辩与反证', category:'法律方法', summary:'把反方主张、事实依据和可能限制请求的规范分别列清。', question:'是否存在有效抗辩或足以动摇主张的反证？', related:['claims','rules','evidence'] },
  { id:'outcome', title:'审慎结论', category:'法律方法', summary:'区分可确认事实、存在争议的判断及需进一步核实的事项。', question:'结论成立依赖哪些尚未验证的前提？', related:['claims','facts','rules'] },
  { id:'contract-formation', title:'合同成立', category:'民法', parentId:'contract', summary:'分析要约、承诺及其他成立方式，不把成立与生效混为一谈。', question:'双方是否形成有效的意思表示一致？', related:['contract'] },
  { id:'contract-effect', title:'合同效力', category:'民法', parentId:'contract', summary:'区分合同是否成立与成立后能否发生约束力，检查主体、意思表示及法定效力因素。', question:'有无影响合同效力的具体法律事由？', related:['contract'] },
  { id:'contract-performance', title:'合同履行', category:'民法', parentId:'contract', summary:'结合约定与履约记录，核对义务内容、期限、履行方式和是否存在变更。', question:'哪项合同义务已经履行，哪项尚待核实？', related:['contract'] },
  { id:'contract-breach', title:'违约责任', category:'民法', parentId:'contract', summary:'先明确义务与违反情形，再分析违约责任方式及可能的抗辩；不能跳过证据直接断言责任。', question:'哪项具体约定义务被违反，相关事实如何证明？', related:['contract'] },
  { id:'contract-termination', title:'合同解除', category:'民法', parentId:'contract', summary:'区分约定解除和法定解除，逐项核查条件、通知与法律后果。', question:'解除的条件、程序及效力时间是否有证据支持？', related:['contract'] },
  { id:'evidence-authenticity', title:'真实性审查', category:'证据法', parentId:'evidence', summary:'核验材料来源、原件与复制件、形成过程和完整性，不等同于已证明待证事实。', question:'材料如何形成，能否排除篡改或断章取义？', related:['evidence'] },
  { id:'evidence-lawfulness', title:'合法性审查', category:'证据法', parentId:'evidence', summary:'分析收集、取得和使用证据的方式是否符合适用程序与规则。', question:'取得方式及提交方式是否存在程序争议？', related:['evidence'] },
  { id:'evidence-relevance', title:'关联性审查', category:'证据法', parentId:'evidence', summary:'说明证据与哪一待证事实相关，以及它支持、反驳或仅提供背景的范围。', question:'该材料到底指向哪个待证事实？', related:['evidence'] },
  { id:'evidence-electronic', title:'电子数据核验', category:'证据法', parentId:'evidence', summary:'对聊天记录、邮件等电子数据核实原始载体、元数据、完整性和上下文。', question:'能否追溯原始数据与形成、传输、保存过程？', related:['evidence'] },
  { id:'claims-elements', title:'构成要件分析', category:'民法', parentId:'claims', summary:'按请求权可能适用的规范逐一列明要件，再对应事实、证据和争议事项。', question:'请求要成立，还需要满足哪些法定要件？', related:['claims'] },
  { id:'claims-defences', title:'请求与抗辩检验', category:'民法', parentId:'claims', summary:'把请求、事实基础和对方抗辩分开检验，避免把尚未证明的争点当成结论。', question:'对方的抗辩可能影响哪一个请求要件？', related:['claims'] }
];
