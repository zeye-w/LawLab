import { legacyConceptView } from '../content/registry.ts';
export type StudyTopic = '民法' | '证据法' | '法律方法';
export type StudyCard = { id: string; topic: StudyTopic; front: string; back: string; context: string };
export const STUDY_CARDS: StudyCard[] = [
  { id:'m01', topic:'民法', front:'什么是请求权基础？', back:'能够支持一方请求另一方为或不为一定行为的规范依据。', context:'先明确当事人请求的法律效果，再寻找可能的规范。' },
  { id:'m02', topic:'民法', front:'合同成立与合同生效有什么区别？', back:'成立关注合意等成立条件；生效关注已经成立的合同能否发生法律效力。', context:'分析时应分别检查，不能仅凭签字直接得出所有结论。' },
  { id:'m03', topic:'民法', front:'违约责任审查通常从哪里开始？', back:'先确定合同义务和履行情况，再分析违约事实、责任方式及抗辩。', context:'联系具体条款、履约记录和证据，而不是直接预测胜诉。' },
  { id:'m04', topic:'民法', front:'什么是抗辩事由？', back:'对方提出的、可能阻却或暂时限制请求实现的事实与规范理由。', context:'抗辩成立与否需逐一核实构成要件及相应事实。' },
  { id:'e01', topic:'证据法', front:'证据“三性”通常指什么？', back:'真实性、合法性和关联性；具体评价还要结合适用程序规则。', context:'不能仅凭证据数量认定证明力。' },
  { id:'e02', topic:'证据法', front:'举证责任和证明标准有何区别？', back:'前者涉及由谁承担事实真伪不明的不利后果；后者涉及证明应达到的程度。', context:'不同争议及程序可能适用不同规则。' },
  { id:'e03', topic:'证据法', front:'聊天截图可以直接当作完整事实吗？', back:'不能直接等同。应核验来源、原始载体、上下文及与待证事实的联系。', context:'既不能一概排除，也不能未经核验就认定属实。' },
  { id:'e04', topic:'证据法', front:'什么是待证事实？', back:'与案件争点及法律构成要件有关、需要通过证据证明的具体事实。', context:'先列待证事实，再将证据逐项关联到证明目的。' },
  { id:'r01', topic:'法律方法', front:'法律三段论包括哪三个部分？', back:'大前提（法律规范）、小前提（案件事实）和结论（法律效果）。', context:'现实法律推理仍需解释规范、核实事实并回应反方论证。' },
  { id:'r02', topic:'法律方法', front:'为什么要区分事实问题与法律问题？', back:'事实问题关注发生了什么；法律问题关注如何解释、选择并适用规范。', context:'区分两者有助于识别应补充的证据或法律研究。' },
  { id:'r03', topic:'法律方法', front:'如何组织一个案例分析答案？', back:'明确争点，寻找依据，逐项涵摄要件，分析抗辩，给出有条件的结论。', context:'可按 IRAC 思路整理，但不必机械套用。' },
  { id:'r04', topic:'法律方法', front:'为何不能只引用法条不分析事实？', back:'法律适用需要将已查明事实与具体规范构成要件相对应。', context:'对不确定事实和争议解释应说明限定条件。' }
];

/** Backwards-compatible read view. Registry is the single authored concept source. */
export type KnowledgeNode = { id: string; title: string; category: StudyTopic | '总览'; summary: string; question: string; related: string[] };
export const KNOWLEDGE_NODES: KnowledgeNode[] = legacyConceptView().map(node=>({
  ...node,category:node.category as KnowledgeNode['category']
}));
