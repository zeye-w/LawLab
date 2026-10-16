export type EventType = '事实' | '程序';
export type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  type: EventType;
  detail: string;
  evidence: string;
  custom?: boolean;
};

export const INITIAL_EVENTS: TimelineEvent[] = [
  { id: 'f1', date: '2025-03-01', title: '双方签署买卖合同', type: '事实', detail: '甲方约定在 4 月 1 日前交付设备，乙方预付价款。', evidence: '买卖合同、双方签章页' },
  { id: 'f2', date: '2025-03-15', title: '买方支付预付款', type: '事实', detail: '乙方支付首期款 20,000 元，转账用途记载为设备预付款。', evidence: '银行转账回单、对账记录' },
  { id: 'f3', date: '2025-04-01', title: '约定交付日届满', type: '事实', detail: '乙方主张未收到设备，甲方称曾通知延迟交货。', evidence: '物流记录、双方通信记录' },
  { id: 'f4', date: '2025-04-08', title: '买方发送催告', type: '事实', detail: '乙方发送书面催告，要求履行交付义务。', evidence: '电子邮件、签收记录' },
  { id: 'p1', date: '2025-05-12', title: '原告提交起诉材料', type: '程序', detail: '此节点仅为虚构教学中的示例行为，不代表法院已经受理。', evidence: '起诉状、证据目录' },
  { id: 'p2', date: '2025-05-22', title: '法院通知立案', type: '程序', detail: '虚构程序节点。具体程序、期限及法律后果应以实际文书和适用法律为准。', evidence: '立案通知文书' }
];

function csvCell(value: string): string {
  // Prevent spreadsheet formula injection from user-provided free text.
  const safe = /^[\s]*[=+\-@]/.test(value) ? `\'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function timelineToCsv(events: TimelineEvent[]): string {
  const header = ['日期', '类型', '事件', '说明', '证据'];
  const rows = events.map(event => [event.date, event.type, event.title, event.detail, event.evidence]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
