import type { ChichiState, Feedback, Project, Shot, SourceCheckItem, SourceCheckKey, SourceFile, TaskItem } from "./types";

export type ReviewQueueSeverity = "high" | "medium" | "low";
export type ReviewQueueKind = "source" | "checklist" | "feedback" | "task";

export interface ReviewQueueItem {
  id: string;
  kind: ReviewQueueKind;
  severity: ReviewQueueSeverity;
  title: string;
  detail: string;
  projectId?: string;
  shotId?: string;
  sourceId?: string;
  feedbackId?: string;
  taskId?: string;
  checkKey?: SourceCheckKey;
}

const sourceCheckLabel: Record<SourceCheckItem["key"], string> = {
  "plate-original": "원본 플레이트",
  "plate-beauty": "뷰티 플레이트",
  "3d": "3D",
  fx: "FX",
  roto: "로토"
};

function projectName(projects: Project[], projectId?: string): string {
  return projects.find((project) => project.id === projectId)?.name ?? "프로젝트 미정";
}

function shotCode(shots: Shot[], shotId?: string): string {
  return shots.find((shot) => shot.id === shotId)?.code ?? "샷 미연결";
}

function sourceItems(state: ChichiState): ReviewQueueItem[] {
  return state.sources
    .filter((source) => source.latestStatus === "needs-confirmation" || (source.latestStatus === "superseded" && source.changeStatus !== "unchanged") || source.plateStatus === "uncertain")
    .map((source: SourceFile) => ({
      id: `source-${source.id}`,
      kind: "source",
      severity: source.latestStatus === "superseded" ? "medium" : "high",
      title: `${shotCode(state.shots, source.shotId)} 소스 확인`,
      detail:
        source.latestStatus === "superseded"
          ? `${source.fileName} 이전 버전 가능성이 있어요.`
          : `${source.fileName} 최신본 또는 플레이트 종류 확인이 필요해요.`,
      projectId: source.projectId,
      shotId: source.shotId,
      sourceId: source.id
    }));
}

function checklistItems(state: ChichiState): ReviewQueueItem[] {
  return state.shots.flatMap((shot) =>
    (shot.sourceChecklist ?? [])
      .filter((item) => item.status === "issue")
      .map((item) => ({
        id: `checklist-${shot.id}-${item.key}`,
        kind: "checklist" as const,
        severity: "high" as const,
        title: `${shot.code} ${sourceCheckLabel[item.key]} 확인`,
        detail: item.note ?? `${sourceCheckLabel[item.key]} 상태 확인이 필요해요.`,
        projectId: shot.projectId,
        shotId: shot.id,
        checkKey: item.key
      }))
  );
}

function feedbackItems(state: ChichiState): ReviewQueueItem[] {
  return state.feedback
    .filter((feedback: Feedback) => feedback.status !== "done" && (!feedback.shotId || feedback.confidence < 0.7))
    .map((feedback) => ({
      id: `feedback-${feedback.id}`,
      kind: "feedback",
      severity: feedback.shotId ? "medium" : "high",
      title: feedback.shotId ? `${shotCode(state.shots, feedback.shotId)} 피드백 확인` : "샷 미연결 피드백",
      detail: feedback.instruction,
      projectId: feedback.projectId,
      shotId: feedback.shotId,
      feedbackId: feedback.id
    }));
}

function taskItems(state: ChichiState): ReviewQueueItem[] {
  return state.tasks
    .filter((task: TaskItem) => task.status === "blocked")
    .map((task) => ({
      id: `task-${task.id}`,
      kind: "task",
      severity: "high",
      title: task.shotId ? `${shotCode(state.shots, task.shotId)} 막힌 작업` : `${projectName(state.projects, task.projectId)} 막힌 작업`,
      detail: task.blockerReason ?? task.title,
      projectId: task.projectId,
      shotId: task.shotId,
      taskId: task.id
    }));
}

const severityRank: Record<ReviewQueueSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2
};

export function buildReviewQueue(state: ChichiState): ReviewQueueItem[] {
  return [...taskItems(state), ...checklistItems(state), ...sourceItems(state), ...feedbackItems(state)].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
