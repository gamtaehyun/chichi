import type { DeliveryMilestone, Feedback, Project, Shot, SourceFile } from "../domain/types";

interface Props {
  projects: Project[];
  shots: Shot[];
  feedback: Feedback[];
  sources: SourceFile[];
  onSelectProject?: (projectId: string) => void;
}

export function ProjectStatusCards({ projects, shots, feedback, sources, onSelectProject }: Props) {
  const getMilestones = (project: Project): DeliveryMilestone[] =>
    project.deliveryMilestones?.length
      ? project.deliveryMilestones
      : [{ id: "final", label: "최종 납품일", date: project.deliveryDate, kind: "final" }];
  const visibleProjects = projects.filter((project) => project.status !== "done");

  return (
    <section className="panel">
      <h2>프로젝트별 상태</h2>
      <div className="projectGrid">
        {visibleProjects.map((project) => {
          const projectShots = shots.filter((shot) => shot.projectId === project.id);
          const riskShots = projectShots.filter((shot) => shot.status === "blocked" || shot.priority >= 5);
          const pendingFeedback = feedback.filter((item) => item.projectId === project.id && item.status !== "done");
          const uncertainSources = sources.filter((source) => source.projectId === project.id && source.latestStatus === "needs-confirmation");
          const milestones = getMilestones(project);
          const interimMilestones = milestones.filter((milestone) => milestone.kind === "interim");
          const finalMilestone = milestones.find((milestone) => milestone.kind === "final") ?? milestones[milestones.length - 1];

          return (
            <article className={onSelectProject ? "projectCard projectCardClickable" : "projectCard"} key={project.id}>
              {onSelectProject ? <button className="projectCardHitArea" aria-label={`${project.name} 프로젝트 열기`} onClick={() => onSelectProject(project.id)} /> : null}
              <h3>{project.name}</h3>
              <p>{project.client}</p>
              <dl>
                <div>
                  <dt>진행 샷</dt>
                  <dd>{projectShots.length}</dd>
                </div>
                <div>
                  <dt>위험 샷</dt>
                  <dd>{riskShots.length}</dd>
                </div>
                <div>
                  <dt>피드백</dt>
                  <dd>{pendingFeedback.length}</dd>
                </div>
                <div>
                  <dt>소스 확인</dt>
                  <dd>{uncertainSources.length}</dd>
                </div>
              </dl>
              <div className="deliveryList" aria-label={`${project.name} 납품일`}>
                {interimMilestones.map((milestone) => (
                  <span className="deliveryChip" key={milestone.id}>
                    {milestone.label} {milestone.date}
                  </span>
                ))}
                {finalMilestone ? (
                  <span className="deliveryChip deliveryFinal">
                    {finalMilestone.label} {finalMilestone.date}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
        {visibleProjects.length === 0 ? <p className="emptyState">진행 중이거나 예정된 프로젝트가 없어요.</p> : null}
      </div>
    </section>
  );
}
