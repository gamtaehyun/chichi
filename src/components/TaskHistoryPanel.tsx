import { removeProject, updateProject } from "../domain/stateActions";
import type { ChichiState, WorkStatus } from "../domain/types";

interface Props {
  state: ChichiState;
  onStateChange: (state: ChichiState) => void;
}

const statusOptions: Array<{ value: WorkStatus; label: string }> = [
  { value: "not-started", label: "작업 예정" },
  { value: "in-progress", label: "작업중" },
  { value: "done", label: "작업 종료" }
];

export function TaskHistoryPanel({ state, onStateChange }: Props) {
  function handleRemoveProject(projectId: string, projectName: string) {
    const confirmed = window.confirm(`${projectName} 프로젝트를 삭제할까요? 샷, 소스, 피드백, 작업, 정산 기록도 함께 삭제됩니다.`);
    if (!confirmed) return;
    onStateChange(removeProject(state, projectId));
  }

  return (
    <section className="taskHistoryPage">
      <article className="panel taskCreatePanel">
        <div className="sectionHeader">
          <h2>프로젝트 진행 상태</h2>
          <span>작업 종료로 바꾸면 메인 프로젝트별 상태에서 숨겨집니다.</span>
        </div>
        <div className="projectHistoryList">
          {state.projects.map((project) => (
            <article className={project.status === "done" ? "projectHistoryItem taskDone" : "projectHistoryItem"} key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>
                  {project.client} · 최종 납품일 {project.deliveryDate}
                </span>
              </div>
              <select value={project.status} onChange={(event) => onStateChange(updateProject(state, project.id, { status: event.target.value as WorkStatus }))}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button className="dangerButton" onClick={() => handleRemoveProject(project.id, project.name)}>
                삭제
              </button>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
