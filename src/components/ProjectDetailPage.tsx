import { useMemo, useState } from "react";
import type { ChichiState, Project, Shot } from "../domain/types";
import { ChatPanel } from "./ChatPanel";
import { ProductionSummary } from "./ProductionSummary";
import { ProjectShotManager } from "./ProjectShotManager";
import { ReviewQueue } from "./ReviewQueue";
import { ShotWorkGrid } from "./ShotWorkGrid";
import { SourceChanges } from "./SourceChanges";

interface Props {
  state: ChichiState;
  projectId: string;
  onBack: () => void;
  onStateChange: (state: ChichiState) => void;
}

function getScopedState(state: ChichiState, project: Project): ChichiState {
  const shots = state.shots.filter((shot) => shot.projectId === project.id);
  const shotIds = new Set(shots.map((shot) => shot.id));

  return {
    projects: [project],
    shots,
    sources: state.sources.filter((source) => source.projectId === project.id || (source.shotId ? shotIds.has(source.shotId) : false)),
    feedback: state.feedback.filter((item) => item.projectId === project.id || (item.shotId ? shotIds.has(item.shotId) : false)),
    tasks: state.tasks.filter((task) => task.projectId === project.id || (task.shotId ? shotIds.has(task.shotId) : false)),
    finance: state.finance.filter((entry) => entry.projectId === project.id)
  };
}

function isExternalShot(shot: Shot): boolean {
  const assignee = shot.assignedTo?.trim().toLowerCase();
  if (!assignee) return false;
  return !["나", "내 작업", "me", "my"].includes(assignee);
}

function completedShotCount(shots: Shot[]): number {
  return shots.filter((shot) => shot.status === "done" || shot.status === "delivered").length;
}

export function ProjectDetailPage({ state, projectId, onBack, onStateChange }: Props) {
  const project = state.projects.find((item) => item.id === projectId);
  const scopedState = useMemo(() => (project ? getScopedState(state, project) : state), [project, state]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  if (!project) {
    return (
      <section className="panel">
        <h2>프로젝트를 찾을 수 없어요.</h2>
        <button onClick={onBack}>돌아가기</button>
      </section>
    );
  }

  const externalShots = scopedState.shots.filter(isExternalShot);
  const myShots = scopedState.shots.filter((shot) => !isExternalShot(shot));
  const pendingSourceCount = scopedState.sources.filter((source) => source.changeStatus !== "unchanged").length;
  const pendingFeedbackCount = scopedState.feedback.filter((item) => item.status !== "done").length;

  return (
    <div className="projectDetailPage">
      <div className="projectDetailHeader">
        <button onClick={onBack}>전체 보기</button>
        <div>
          <h2>{project.name}</h2>
          <p>{project.client}</p>
        </div>
        <span>최종 납품일 {project.deliveryDate}</span>
      </div>

      <div className="projectDetailWorkspace">
        <div className="projectDetailMain">
          <ProductionSummary state={scopedState} />

          <section className="panel assignmentPanel">
            <div className="sectionHeader">
              <h2>담당 / 진행 현황</h2>
              <span>샷 담당은 아래 샷 작업판에서 바로 수정할 수 있습니다.</span>
            </div>
            <div className="assignmentGrid">
              <article>
                <span>내 작업</span>
                <strong>
                  {completedShotCount(myShots)} / {myShots.length}
                </strong>
                <p>완료 또는 납품 기준</p>
              </article>
              <article>
                <span>외주 작업</span>
                <strong>
                  {completedShotCount(externalShots)} / {externalShots.length}
                </strong>
                <p>담당명이 입력된 외부 컷 기준</p>
              </article>
              <article>
                <span>피드백</span>
                <strong>{pendingFeedbackCount}</strong>
                <p>아직 완료되지 않은 피드백</p>
              </article>
              <article>
                <span>소스 변경</span>
                <strong>{pendingSourceCount}</strong>
                <p>새 소스 또는 변경 소스</p>
              </article>
            </div>
          </section>

          <ShotWorkGrid
            state={state}
            projects={scopedState.projects}
            shots={scopedState.shots}
            sources={scopedState.sources}
            feedback={scopedState.feedback}
            tasks={scopedState.tasks}
            onStateChange={onStateChange}
          />

          <ReviewQueue state={state} queueState={scopedState} onStateChange={onStateChange} />
        </div>

        <aside className="projectDetailRail">
          <div className="projectDetailChat">
            <ChatPanel state={state} contextProjectId={project.id} onStateChange={onStateChange} />
          </div>
          <SourceChanges sources={scopedState.sources} />
        </aside>
      </div>

      <section className="panel collapsedManager">
        <button className="collapsedManagerHeader" aria-expanded={isManagerOpen} onClick={() => setIsManagerOpen((current) => !current)}>
          <span>
            <strong>프로젝트 / 샷 관리</strong>
            <small>잘못 정리된 정보나 추가 수정이 필요할 때만 열어 사용합니다.</small>
          </span>
          <span>{isManagerOpen ? "닫기" : "열기"}</span>
        </button>
        {isManagerOpen ? <ProjectShotManager state={state} selectedProjectId={project.id} onStateChange={onStateChange} /> : null}
      </section>
    </div>
  );
}
