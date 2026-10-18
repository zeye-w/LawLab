import { getTeachingCase } from '../content/registry.ts';
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

/** Existing localStorage entries keep their event IDs and are not overwritten.
 * New browser sessions use canonical case events; linked evidence is illustrative. */
export const INITIAL_EVENTS: TimelineEvent[] = getTeachingCase().events.map(e=>({
  id:e.legacyId ?? e.id,
  date:e.date,title:e.title,
  type:e.kind==='fact'?'事实' as const:'程序' as const,
  detail:e.description,
  evidence:e.legacyEvidenceDescription??''
}));

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
