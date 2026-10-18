/** Shared initial case fixture; legal claims and proof associations stay provisional. */
export const PROOF_FACTS=[
  {id:'agreement',title:'合同关系',question:'合同是否成立，约定了什么？'},
  {id:'payment',title:'付款事实',question:'是否付款，金额和收款人是谁？'},
  {id:'delivery',title:'交付事实',question:'货物是否按约交付？'},
  {id:'extension',title:'延期合意',question:'双方是否同意变更交付期限？'}
] as const;

export const EVIDENCE_FACT_LINKS:Readonly<Record<string,readonly string[]>>={
  // A contract proves what was agreed, not that payment or delivery actually happened.
  contract:['agreement'],
  transfer:['payment'],
  delivery:['delivery'],
  messages:['extension','delivery']
};
