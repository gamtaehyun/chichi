import type { ChichiState } from "./types";

function countNewItems<T extends { id: string }>(previousItems: T[], nextItems: T[]): number {
  const previousIds = new Set(previousItems.map((item) => item.id));
  return nextItems.filter((item) => !previousIds.has(item.id)).length;
}

function appendCount(summary: string[], count: number, label: string) {
  if (count > 0) summary.push(`${label} ${count}개 추가`);
}

export function summarizeChatChange(previousState: ChichiState, nextState: ChichiState): string[] {
  const summary: string[] = [];

  appendCount(summary, countNewItems(previousState.projects, nextState.projects), "프로젝트");
  appendCount(summary, countNewItems(previousState.shots, nextState.shots), "샷");
  appendCount(summary, countNewItems(previousState.sources, nextState.sources), "소스");
  appendCount(summary, countNewItems(previousState.feedback, nextState.feedback), "피드백");
  appendCount(summary, countNewItems(previousState.tasks, nextState.tasks), "작업");
  appendCount(summary, countNewItems(previousState.finance, nextState.finance), "정산");

  return summary.length > 0 ? summary : ["새로 추가된 항목 없음"];
}
