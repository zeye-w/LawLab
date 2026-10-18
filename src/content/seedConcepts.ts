/** Legacy node seed curated once, then normalized into the canonical Registry. */
export type KnowledgeNode = { id: string; title: string; category: StudyTopic | '总览'; summary: string; question: string; related: string[] };
export const SEED_KNOWLEDGE_NODES: KnowledgeNode[] = [
  { id:'relationship', title:'法律关系', category:'总览', summary:'从主体、客体与权利义务出发，识别案件的规范分析起点。', question:'当事人之间究竟是什么法律关系？', related:['claims','contract','facts','rules'] },
  { id:'claims', title:'请求权基础', category:'民法', summary:'依据请求的法律效果寻找规范，逐项审查构成要件及抗辩。', question:'哪项规范可能支持该请求？', related:['relationship','rules','defences','facts','contract','outcome'] },
  { id:'contract', title:'合同义务', category:'民法', summary:'围绕成立、生效、履行及违约后果识别具体义务。', question:'合同要求谁在何时履行何种义务？', related:['relationship','claims','facts'] },
  { id:'facts', title:'待证事实', category:'证据法', summary:'提取每个法律要件相关的具体事实，区分主张与已查明事实。', question:'哪些关键事实仍有争议？', related:['evidence','claims','contract','relationship','burden','outcome'] },
  { id:'evidence', title:'证据评价', category:'证据法', summary:'审查来源、真实性、合法性、关联性以及可能的反证。', question:'现有证据能支持哪些事实？', related:['facts','burden','defences'] },
  { id:'burden', title:'证明责任', category:'证据法', summary:'分析应由谁证明什么，以及事实真伪不明时的风险分配。', question:'该事实由谁承担证明责任？', related:['evidence','facts'] },
  { id:'rules', title:'规范解释', category:'法律方法', summary:'确定适用规范，理解文义、体系、目的和适用条件。', question:'规范的构成要件如何解释？', related:['relationship','claims','defences','outcome'] },
  { id:'defences', title:'抗辩与反证', category:'法律方法', summary:'把反方主张、事实依据和可能限制请求的规范分别列清。', question:'是否存在有效抗辩或足以动摇主张的反证？', related:['claims','rules','evidence'] },
  { id:'outcome', title:'审慎结论', category:'法律方法', summary:'区分可确认事实、存在争议的判断及需进一步核实的事项。', question:'结论成立依赖哪些尚未验证的前提？', related:['claims','facts','rules'] }
];
