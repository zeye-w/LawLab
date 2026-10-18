/** Single authored, strictly fictional case fixture for LawLab's cross-workspace P2 demo.
 * The documents are intentionally shortened teaching excerpts, not actual scans or evidence. */
export const EQUIPMENT_CASE_KEY = 'case:cn:equipment-sale-demo-001' as const;
export const CASE_SEED = {
  title:'设备采购合同履行争议（虚构教学案例）',
  synopsis:'甲公司（买方）与乙公司（卖方）围绕设备交付期限、20,000 元预付款以及聊天沟通中是否达成延期合意发生争议。双方说法均尚待证明；该资料包不代表真实案件或法院裁判。',
  parties:['甲公司（买方）','乙公司（卖方）'],
  evidence:[
    {id:'contract',title:'设备买卖合同（教学摘录）',type:'书证',purpose:'支持合同主体、价款及约定交付日的主张',caveat:'需核查原件、签章、完整条款及后续变更。'},
    {id:'transfer',title:'预付款转账回单（教学摘录）',type:'电子数据 / 书面记录',purpose:'可能支持买方向指定账户支付 20,000 元的主张',caveat:'需要银行原始凭证、收款账户身份及交易对应关系。'},
    {id:'messages',title:'延期协商聊天记录（节选）',type:'电子数据',purpose:'双方对“下周再说”是否构成明确延期合意存在分歧',caveat:'截图不完整；发送者、原始载体、上下文及时间戳均需核查。'},
    {id:'delivery',title:'仓储及物流交接单（教学摘录）',type:'书证 / 电子数据',purpose:'可能支持卖方曾安排发运，但不直接证明买方按约收货',caveat:'没有可核验的买方签收；要核对货物型号、数量和签收主体。'}
  ],
  events:[
    {id:'f1',date:'2025-03-01',title:'双方签署买卖合同',type:'事实',detail:'虚构合同约定在 4 月 1 日前交付设备，买方先付预付款。',evidence:'合同、签章页',evidenceLegacyIds:['contract']},
    {id:'f2',date:'2025-03-15',title:'买方主张支付预付款',type:'事实',detail:'买方提供记载 20,000 元设备预付款的转账摘录；实际到账及对应关系有待核验。',evidence:'转账回单、银行核对材料',evidenceLegacyIds:['transfer']},
    {id:'f3',date:'2025-04-01',title:'约定交付期限届满',type:'事实',detail:'买方称未收到约定设备，卖方称曾通知延期并安排发运。',evidence:'物流单、聊天记录',evidenceLegacyIds:['delivery','messages']},
    {id:'f4',date:'2025-04-08',title:'买方发出书面催告',type:'事实',detail:'买方主张已催告卖方交货；是否送达仍需核对邮件原始记录。',evidence:'催告邮件、送达回执（待核验）',evidenceLegacyIds:[]},
    {id:'p1',date:'2025-05-12',title:'原告提交起诉材料（虚构）',type:'程序',detail:'纯教学程序节点，不代表真实立案或审查程序。',evidence:'起诉状、证据目录（教学摘录）',evidenceLegacyIds:[]},
    {id:'p2',date:'2025-05-22',title:'收到立案通知（虚构）',type:'程序',detail:'虚构程序时间点；真实程序和效力须依据具体法律文书核查。',evidence:'立案通知（教学摘录）',evidenceLegacyIds:[]}
  ],
  positions:[
    {id:'buyer',party:'甲公司（买方）',stance:'主张预付款已付、约定期限届满仍未收到全部设备，请求进一步核实交付与救济条件。',disputedFactLegacyIds:['payment','delivery','extension']},
    {id:'seller',party:'乙公司（卖方）',stance:'主张双方曾协商延期且卖方已安排仓储发运，但是否构成合意及是否实际交付存在争议。',disputedFactLegacyIds:['delivery','extension']}
  ],
  documents:[
    {id:'contract-text',title:'设备买卖合同节选',kind:'contract',date:'2025-03-01',author:'双方（虚构）',
      excerpt:'买方甲公司向卖方乙公司采购设备，教学设定总价 60,000 元；买方预付 20,000 元，卖方应于 2025 年 4 月 1 日前交付约定设备。其他条款未在教学摘录中完整呈现。',
      context:'摘录不包含全部合同条款；签章和附件版本尚待核实。',evidenceLegacyIds:['contract'],eventLegacyIds:['f1']},
    {id:'payment-slip',title:'转账回单节选',kind:'financial',date:'2025-03-15',author:'甲公司提供（虚构）',
      excerpt:'金额：人民币 20,000 元。摘要：设备预付款。收款户名：乙公司（教学字段）。',
      context:'此为编辑的教学材料，非真实银行数据；需核验原始流水和资金到账信息。',evidenceLegacyIds:['transfer'],eventLegacyIds:['f2']},
    {id:'chat-excerpt',title:'延期协商截图节选',kind:'communication',date:'2025-03-28',author:'双方聊天摘录（虚构）',
      excerpt:'卖方：“交货可能晚几天。” 买方：“下周再说，先告知具体安排。” 卖方：“收到。”',
      context:'片段没有前后完整消息。买方否认明确同意延长交付期限，卖方认为双方已协商延期。',evidenceLegacyIds:['messages'],eventLegacyIds:['f3']},
    {id:'warehouse-note',title:'仓储发运记录节选',kind:'logistics',date:'2025-04-03',author:'乙公司提供（虚构）',
      excerpt:'库房登记：待发运设备 1 批。备注：等待物流接洽。未附经买方确认的收货签名。',
      context:'待发运登记与已经完成合同项下交付并不等同；需核实货物及运输流转。',evidenceLegacyIds:['delivery'],eventLegacyIds:['f3']},
    {id:'demand-email',title:'催告邮件节选',kind:'communication',date:'2025-04-08',author:'甲公司（虚构）',
      excerpt:'请确认约定设备的交付安排，并提供运单、收货证明与延期依据。',
      context:'本资料包没有独立的邮件服务器送达记录，不得据此认定已通知对方。',evidenceLegacyIds:[],eventLegacyIds:['f4']},
    {id:'claim-draft',title:'起诉材料要点（教学摘要）',kind:'pleading',date:'2025-05-12',author:'甲公司代理人（虚构）',
      excerpt:'争议要点：约定期限、付款、交付与延期合意。请求内容及请求权依据须另行按完整事实和法律规范确定。',
      context:'这不是正式起诉状，也不代表任何真实法院已受理。',evidenceLegacyIds:[],eventLegacyIds:['p1']},
    {id:'defence-draft',title:'卖方答辩材料要点（教学摘要）',kind:'pleading',date:'2025-05-18',author:'乙公司代理人（虚构）',
      excerpt:'卖方称双方有延期沟通，并主张已准备交运；请求核实完整聊天、物流签收及付款对应关系。',
      context:'反方陈述仍属主张，不等同于已经证明的事实。',evidenceLegacyIds:['messages','delivery'],eventLegacyIds:[]}
  ]
} as const;
