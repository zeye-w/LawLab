export type Severity = 'high' | 'medium';
export type ContractFinding = {
  id: string;
  title: string;
  severity: Severity;
  quote: string | null;
  /** Exact UTF-16 half-open source text offsets for quoted findings. Never guessed from UI. */
  start?: number;
  end?: number;
  reason: string;
  suggestion: string;
};

/** Rule-based educational screening, NOT an LLM or legal opinion. */
const RULES: Array<Omit<ContractFinding, 'quote'> & { pattern: RegExp }> = [
  {
    id: 'termination', title: '单方任意解除权', severity: 'high',
    pattern: /(?:甲方|乙方|一方).{0,12}(?:可随时|有权随时|无需理由|无条件).{0,12}解除(?:本)?合同|(?:可|有权)无条件解除(?:本)?合同/,
    reason: '解除条件和双方权利可能明显不对称，是否有效及后果需结合具体交易与适用法律判断。',
    suggestion: '明确解除事由、通知方式、合理补救期限及解除后的结算与责任。'
  },
  {
    id: 'unilateral', title: '单方变更条款', severity: 'high',
    pattern: /(?:甲方|乙方|一方).{0,8}(?:有权|可以|可).{0,8}(?:单方|自行).{0,12}(?:调整|变更|修改)|(?:单方|自行).{0,8}(?:修改|调整|变更)(?:合同|价格|条款)/,
    reason: '一方有权自行改变主要履约内容，存在履行可预期性与公平性问题。',
    suggestion: '限定可调整事项、触发条件、提前通知期限，并规定对方异议和退出机制。'
  },
  {
    id: 'payment', title: '付款期限不明确', severity: 'medium',
    pattern: /付款(?:期限|时间|日期).{0,6}(?:另行(?:协商|商定|确定|约定))|根据实际情况付款|视(?:甲方|乙方)资金情况付款/,
    reason: '付款时间不确定，可能使违约认定、现金流安排和催告举证变得困难。',
    suggestion: '约定付款触发条件、明确日期或相对期限、开票与验收关系及逾期责任。'
  },
  {
    id: 'liability', title: '过宽的免责表述', severity: 'high',
    pattern: /(?:概不负责|不承担任何责任|无需承担任何责任|免除全部责任)/,
    reason: '笼统免责可能与强制性规则冲突，且难以覆盖故意、重大过失等不同情形。',
    suggestion: '明确免责范围、例外事项、赔偿上限及责任分配，并核对强制性规定。'
  },
  {
    id: 'acceptance', title: '验收标准不明确', severity: 'medium',
    pattern: /验收标准.{0,6}另行(?:约定|协商|确定)|验收标准.{0,6}(?:单方|自行)(?:决定|确定)/,
    reason: '验收标准不清晰，易引发交付完成与付款条件的争议。',
    suggestion: '在附件中列出客观验收指标、验收期限、异议流程及默认验收规则。'
  }
];

export function reviewContract(input: string): ContractFinding[] {
  const text = input.trim();
  const leadingWhitespace = input.length-input.trimStart().length;
  if (!text) return [];
  const findings: ContractFinding[] = [];
  for (const { pattern, ...rule } of RULES) {
    const match = pattern.exec(text);
    if (match) findings.push({ ...rule, quote: match[0],
      start: leadingWhitespace+match.index, end: leadingWhitespace+match.index+match[0].length });
  }
  if (text.length >= 60 && !/(?:争议|纠纷).{0,24}(?:法院|仲裁|协商|管辖)|(?:法院|仲裁委员会|诉讼管辖)/.test(text)) {
    findings.push({
      id: 'disputes', title: '未检出争议解决约定', severity: 'medium', quote: null,
      reason: '在当前文本中未发现明显的争议解决安排；如果只是合同片段，原合同中可能另有规定。',
      suggestion: '核对合同全文，明确协商、仲裁或诉讼机制，并审查机构/管辖约定是否合法明确。'
    });
  }
  return findings;
}

export const SAMPLE_CONTRACT = `服务合作协议（虚构教学案例）\n\n甲方：清河科技有限公司\n乙方：知行设计工作室\n\n第一条 服务内容：乙方提供品牌视觉设计及相关交付文件，具体验收标准另行约定。\n第二条 付款安排：合同总价人民币 30,000 元，付款时间另行协商。\n第三条 合同变更：甲方有权单方面修改合同条款及交付要求。\n第四条 合同解除：甲方可随时无理由解除本合同。\n第五条 违约责任：甲方因项目调整导致的损失概不负责。\n第六条 其他：双方应诚实信用履行本合同。`;