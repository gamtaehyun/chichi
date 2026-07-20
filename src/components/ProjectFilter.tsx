import type { Project } from "../domain/types";

interface Props {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}

export function ProjectFilter({ projects, selectedProjectId, onSelectProject }: Props) {
  return (
    <section className="filterBar" aria-label="프로젝트 필터">
      <div>
        <strong>보기 범위</strong>
        <span>샷 작업판과 소스 목록에 같이 적용됩니다.</span>
      </div>
      <div className="segmentedControl" role="group" aria-label="프로젝트 선택">
        <button className={selectedProjectId === "all" ? "active" : ""} onClick={() => onSelectProject("all")}>
          전체
        </button>
        {projects.map((project) => (
          <button className={selectedProjectId === project.id ? "active" : ""} key={project.id} onClick={() => onSelectProject(project.id)}>
            {project.name}
          </button>
        ))}
      </div>
    </section>
  );
}
