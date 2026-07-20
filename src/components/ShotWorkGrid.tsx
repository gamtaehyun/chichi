import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { defaultSourceChecklist, updateShot, updateShotSourceCheck } from "../domain/stateActions";
import type { ChichiState, Feedback, Project, Shot, SourceCheckItem, SourceCheckKey, SourceCheckStatus, SourceFile, TaskItem, WorkStatus } from "../domain/types";
import { FeedbackDetailPanel } from "./FeedbackDetailPanel";

interface Props {
  state: ChichiState;
  projects: Project[];
  shots: Shot[];
  sources: SourceFile[];
  feedback: Feedback[];
  tasks: TaskItem[];
  onStateChange: (state: ChichiState) => void;
}

const SELF_ASSIGNEE = "나";

const statusLabel: Record<WorkStatus, string> = {
  "not-started": "대기",
  "in-progress": "진행",
  review: "리뷰",
  delivered: "납품",
  blocked: "막힘",
  done: "완료"
};

const statusClass: Record<WorkStatus, string> = {
  "not-started": "statusIdle",
  "in-progress": "statusProgress",
  review: "statusReview",
  delivered: "statusDone",
  blocked: "statusBlocked",
  done: "statusDone"
};

const editableShotStatuses: WorkStatus[] = ["not-started", "in-progress", "review", "done"];

const sourceCheckLabels: Record<SourceCheckKey, string> = {
  "plate-original": "원본",
  "plate-beauty": "뷰티",
  "3d": "3D",
  fx: "FX",
  roto: "로토"
};

const sourceCheckStatusLabels: Record<SourceCheckStatus, string> = {
  pending: "대기",
  confirmed: "확인",
  issue: "문제",
  "not-needed": "없음"
};

const sourceCheckStatusClass: Record<SourceCheckStatus, string> = {
  pending: "sourcePending",
  confirmed: "sourceConfirmed",
  issue: "sourceIssue",
  "not-needed": "sourceMuted"
};

const sourceCheckDisplayLabels: Record<SourceCheckStatus, string> = {
  pending: "미전달",
  confirmed: "확인",
  issue: "문제",
  "not-needed": "없음"
};

const editableSourceCheckStatuses: SourceCheckStatus[] = ["pending", "confirmed", "issue"];

function getChecklist(shot: Shot): SourceCheckItem[] {
  const existingItems = shot.sourceChecklist ?? [];
  const existingKeys = new Set(existingItems.map((item) => item.key));

  return [...existingItems, ...defaultSourceChecklist.filter((item) => !existingKeys.has(item.key))];
}

function normalizeAssignee(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "내 작업") return SELF_ASSIGNEE;
  return trimmed;
}

function buildAssigneeOptions(shots: Shot[], extraAssignees: string[]): string[] {
  const names = new Set<string>([SELF_ASSIGNEE]);

  for (const shot of shots) {
    names.add(normalizeAssignee(shot.assignedTo));
  }

  for (const name of extraAssignees) {
    names.add(normalizeAssignee(name));
  }

  return [...names].filter(Boolean);
}

export function ShotWorkGrid({ state, projects, shots, sources, feedback, tasks, onStateChange }: Props) {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [extraAssignees, setExtraAssignees] = useState<string[]>([]);
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const assigneeOptions = useMemo(() => buildAssigneeOptions(state.shots, extraAssignees), [state.shots, extraAssignees]);
  const selectedFeedback = feedback.find((item) => item.id === selectedFeedbackId) ?? null;
  const relatedFeedback = selectedFeedback ? feedback.filter((item) => item.shotId === selectedFeedback.shotId || item.id === selectedFeedback.id) : [];

  function handleAddAssignee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeAssignee(newAssigneeName);
    if (!name) return;
    setExtraAssignees((current) => (current.includes(name) ? current : [...current, name]));
    setNewAssigneeName("");
  }

  return (
    <section className="panel shotGridPanel">
      <div className="sectionHeader shotGridHeader">
        <div>
          <h2>샷 작업판</h2>
          <span>상태, 마감, 소스, 피드백을 샷 단위로 확인합니다.</span>
        </div>
        <form className="assigneeAddForm" onSubmit={handleAddAssignee}>
          <input
            aria-label="새 담당 이름"
            value={newAssigneeName}
            onChange={(event) => setNewAssigneeName(event.target.value)}
            placeholder="외주 작업자 이름"
          />
          <button type="submit">담당 추가</button>
        </form>
      </div>
      <div className="shotTableWrap">
        <table className="shotTable">
          <thead>
            <tr>
              <th>샷</th>
              <th>프로젝트</th>
              <th>담당</th>
              <th>상태</th>
              <th>마감</th>
              <th>소스</th>
              <th>피드백</th>
              <th>다음 액션</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((shot) => {
              const project = projects.find((item) => item.id === shot.projectId);
              const shotSources = sources.filter((source) => source.shotId === shot.id);
              const checklist = getChecklist(shot);
              const pendingFeedback = feedback.filter((item) => item.shotId === shot.id && item.status !== "done");
              const firstFeedback = pendingFeedback[0];
              const attachmentCount = pendingFeedback.reduce((count, item) => count + (item.attachments?.length ?? 0), 0);
              const nextTask = tasks.find((task) => task.shotId === shot.id && task.status !== "done");
              const needsConfirm = shotSources.some((source) => source.latestStatus === "needs-confirmation");
              const assignee = normalizeAssignee(shot.assignedTo);

              return (
                <tr key={shot.id}>
                  <td>
                    <strong>{shot.code}</strong>
                    <small>{shot.currentDeliveryVersion ?? "납품 전"}</small>
                  </td>
                  <td>{project?.name ?? "-"}</td>
                  <td>
                    <select
                      aria-label={`${shot.code} 담당`}
                      className={`inlineSelect assigneeSelect ${assignee === SELF_ASSIGNEE ? "assigneeSelf" : "assigneeExternal"}`}
                      value={assignee}
                      onChange={(event) => onStateChange(updateShot(state, shot.id, { assignedTo: event.target.value }))}
                    >
                      {assigneeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`${shot.code} 상태`}
                      className={`inlineSelect ${statusClass[shot.status]}`}
                      value={shot.status}
                      onChange={(event) => onStateChange(updateShot(state, shot.id, { status: event.target.value as WorkStatus }))}
                    >
                      {editableShotStatuses.map((value) => (
                        <option key={value} value={value}>
                          {statusLabel[value]}
                        </option>
                      ))}
                      {!editableShotStatuses.includes(shot.status) ? (
                        <option value={shot.status}>
                          {statusLabel[shot.status]}
                        </option>
                      ) : null}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={`${shot.code} 마감`}
                      className={`inlineDate ${shot.dueDate === "2026-07-04" ? "dueTodayControl" : ""}`}
                      type="date"
                      value={shot.dueDate}
                      onChange={(event) => onStateChange(updateShot(state, shot.id, { dueDate: event.target.value }))}
                    />
                  </td>
                  <td>
                    <div className="sourceChecklistCell">
                      <span className={needsConfirm ? "needsCheck" : ""}>
                        {shotSources.length}개{needsConfirm ? " / 확인" : ""}
                      </span>
                      <div className="sourceCheckGrid">
                        {checklist.map((item) => (
                          <label className="sourceCheckItem" key={item.key}>
                            <span>{sourceCheckLabels[item.key]}</span>
                            <select
                              aria-label={`${shot.code} ${sourceCheckLabels[item.key]} 체크`}
                              className={sourceCheckStatusClass[item.status]}
                              title={item.note ?? `${sourceCheckLabels[item.key]} 확인 상태`}
                              value={item.status}
                              onChange={(event) => onStateChange(updateShotSourceCheck(state, shot.id, item.key, { status: event.target.value as SourceCheckStatus }))}
                            >
                              {editableSourceCheckStatuses.map((value) => (
                                <option key={value} value={value}>
                                  {sourceCheckDisplayLabels[value]}
                                </option>
                              ))}
                              {!editableSourceCheckStatuses.includes(item.status) ? (
                                <option value={item.status}>{sourceCheckDisplayLabels[item.status]}</option>
                              ) : null}
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    {firstFeedback ? (
                      <button className="feedbackCell feedbackCellButton" onClick={() => setSelectedFeedbackId(firstFeedback.id)}>
                        <span>{firstFeedback.instruction}</span>
                        {pendingFeedback.length > 1 || attachmentCount > 0 ? (
                          <small>
                            {pendingFeedback.length > 1 ? `외 ${pendingFeedback.length - 1}개` : ""}
                            {pendingFeedback.length > 1 && attachmentCount > 0 ? " · " : ""}
                            {attachmentCount > 0 ? `이미지 ${attachmentCount}개` : ""}
                          </small>
                        ) : null}
                      </button>
                    ) : (
                      <span className="mutedText">0개</span>
                    )}
                  </td>
                  <td>
                    {nextTask ? (
                      <span>{nextTask.title}</span>
                    ) : (
                      <span className="mutedText">대기 중인 작업 없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedFeedback ? (
        <FeedbackDetailPanel
          state={state}
          feedback={selectedFeedback}
          relatedFeedback={relatedFeedback}
          projects={projects}
          shots={state.shots}
          onSelectFeedback={setSelectedFeedbackId}
          onStateChange={onStateChange}
          onClose={() => setSelectedFeedbackId(null)}
        />
      ) : null}
    </section>
  );
}
