export type QuizQuestion = { id: string; topic: string; stem: string; options: string[]; answer: number; explanation: string };
export const QUIZ: QuizQuestion[] = [
  { id: 'q1', topic: '证据分析', stem: '在买卖合同纠纷中，证明买方已经付款，哪份材料通常最直接相关？', options: ['买方营业执照', '与该笔交易对应的银行转账记录', '卖方公司的宣传海报', '双方办公地点照片'], answer: 1, explanation: '银行转账记录通常直接指向付款事实，但仍需核对收款方、金额、时间和交易关联。' },
  { id: 'q2', topic: '法律推理', stem: '请求权基础分析时，最适合作为起点的是哪一步？', options: ['直接预测胜诉概率', '先确定请求与可能的规范依据', '只看当事人的情绪', '忽略合同条款'], answer: 1, explanation: '应先明确请求权指向的法律效果与可能依据，再逐项检查构成要件、抗辩和证据。' },
  { id: 'q3', topic: '合同审查', stem: '合同写着“付款时间双方另行商定”。审核时优先关注什么？', options: ['字体是否整齐', '付款义务履行时间的不确定性', '公司简称是否好听', '签约地点的天气'], answer: 1, explanation: '付款期限模糊会影响履约安排与争议处理，应明确期限、触发条件和逾期责任。' },
  { id: 'q4', topic: '程序与事实', stem: '制作案件时间线时，将“双方签约”与“法院立案”分别标成事实节点和程序节点，主要好处是什么？', options: ['证明所有陈述真实', '区分实体事件与诉讼进程', '自动得出裁判结果', '让时间线颜色更丰富'], answer: 1, explanation: '事实时间线与程序时间线作用不同，分层展示有助于识别事实争点及程序节点。' },
  { id: 'q5', topic: '证据评价', stem: '一张缺少原始记录、来源不清的聊天截图，最恰当的处理方式是什么？', options: ['直接认定绝对真实', '一概排除且不再核查', '核验来源、完整性及与案件事实的关联', '仅凭截图数量判断胜负'], answer: 2, explanation: '证据评价不能只看形式和数量，还应核对来源、真实性、完整性、关联性及可能的反证。' }
];

export type CourtChoice = { label: string; feedback: string; emphasis: 'good' | 'consider' };
export type CourtPhase = { title: string; prompt: string; choices: CourtChoice[] };
export const COURT_PHASES: CourtPhase[] = [
  { title: '开庭陈述', prompt: '原告主张已经付款，但卖方未按约交付设备。你会怎样组织第一次陈述？', choices: [
    { label: '先讲请求，再按签约、付款、交付顺序陈述待证事实', feedback: '结构清晰。正式庭审还应连接请求权依据、证据和各构成要件。', emphasis: 'good' },
    { label: '先评价对方动机，不介绍关键事实', feedback: '这种论述对待证事实帮助有限。建议回到请求、法律依据和证据。', emphasis: 'consider' }
  ] },
  { title: '举证阶段', prompt: '对方否认收到预付款。哪一种举证策略更严谨？', choices: [
    { label: '提交转账记录，并核对收款账户与合同主体', feedback: '能够把付款事实与交易主体关联起来，还应关注反向证据。', emphasis: 'good' },
    { label: '只陈述“大家都知道我付了”', feedback: '单纯断言不能替代可核验的证据。', emphasis: 'consider' }
  ] },
  { title: '质证阶段', prompt: '对方出示一张没有完整聊天上下文的截图，声称双方同意延期。你如何质证？', choices: [
    { label: '请求核验原始记录、上下文和发送者身份', feedback: '重点触及真实性、完整性与关联性；仍不能预先断定该证据无效。', emphasis: 'good' },
    { label: '立即断言所有电子截图都没有证据能力', feedback: '过于绝对。电子材料应按具体规则和证据情况综合审查。', emphasis: 'consider' }
  ] },
  { title: '总结陈词', prompt: '到了最后陈述，你会如何处理仍有争议的交付事实？', choices: [
    { label: '分别概括已证明、存疑与有反证的事实', feedback: '体现论证边界。事实认定最终仍应依法由审理机关完成。', emphasis: 'good' },
    { label: '把尚无证据的细节也说成确定事实', feedback: '法律实务中需要清楚区分主张、证据与事实认定。', emphasis: 'consider' }
  ] }
];
export type Evidence = { id: string; title: string; type: string; purpose: string; caveat: string };
export const EVIDENCE: Evidence[] = [
  { id: 'contract', title: '双方签署的合同', type: '书证', purpose: '支持交易关系、付款与交付约定', caveat: '需确认签章、版本、条款及是否后续变更。' },
  { id: 'transfer', title: '银行转账记录', type: '电子数据 / 书面记录', purpose: '支持买方曾付款的主张', caveat: '需核对收款账户及转账与本次交易的对应关系。' },
  { id: 'messages', title: '聊天截图', type: '电子数据', purpose: '可能说明双方对交付期限的协商', caveat: '来源、完整上下文与双方身份有待核实。' },
  { id: 'delivery', title: '物流签收单', type: '书证 / 电子数据', purpose: '可能支持卖方曾安排或完成交付', caveat: '签收主体、货物对应关系与实际交付内容需要核查。' }
];
export const DEFENDANT_PHASES: CourtPhase[] = [
  { title: '开庭陈述', prompt: '你是被告代理人。原告称付款后未收到设备，被告认为双方后来同意延期。开庭时如何回应？', choices: [
    { label: '明确争议焦点，并区分已承认与尚有争议的事实', feedback: '避免笼统否认，围绕具体争点组织事实和证据更可检验。', emphasis: 'good' },
    { label: '完全不回应原告的付款和交付主张', feedback: '遗漏争议核心可能削弱陈述的针对性。', emphasis: 'consider' }
  ] },
  { title: '举证阶段', prompt: '被告主张双方曾同意延期交付。你应该优先补充什么？', choices: [
    { label: '完整协商记录、时间信息及参与人身份线索', feedback: '可以帮助核对是否形成合意，以及具体延期范围。', emphasis: 'good' },
    { label: '仅提交剪裁后的单句截图', feedback: '缺乏上下文容易产生解释争议，需要核验完整性。', emphasis: 'consider' }
  ] },
  { title: '质证阶段', prompt: '原告提交转账凭证，主张全部价款已经支付。你会如何质证？', choices: [
    { label: '核对金额、账户、时间与合同约定的支付节点', feedback: '关注证据与本案付款义务的具体关联，不能无依据否认。', emphasis: 'good' },
    { label: '只因凭证对己方不利就说其一定伪造', feedback: '证据异议应有具体依据和核验请求。', emphasis: 'consider' }
  ] },
  { title: '总结陈词', prompt: '如何总结被告关于延期交付的抗辩？', choices: [
    { label: '说明抗辩事实、支撑证据、争议边界与仍需核实之处', feedback: '把事实主张、证据支持和法律后果分开，能提高论证质量。', emphasis: 'good' },
    { label: '宣布只要提出抗辩就必然免责', feedback: '抗辩是否成立及其后果仍取决于事实、证据和适用法律。', emphasis: 'consider' }
  ] }
];
