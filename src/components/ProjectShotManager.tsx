import { useMemo, useState } from "react";
import {
  addDeliveryMilestone,
  addProject,
  addProjectLink,
  addShot,
  removeDeliveryMilestone,
  removeProjectLink,
  removeShot,
  updateDeliveryMilestone,
  updateProject,
  updateProjectLink,
  updateShot
} from "../domain/stateActions";
import type { ChichiState, WorkStatus } from "../domain/types";

interface Props {
  state: ChichiState;
  selectedProjectId: string;
  onStateChange: (state: ChichiState) => void;
}

const statusOptions: Array<{ value: WorkStatus; label: string }> = [
  { value: "not-started", label: "대기" },
  { value: "in-progress", label: "진행" },
  { value: "review", label: "리뷰" },
  { value: "blocked", label: "막힘" },
  { value: "delivered", label: "납품" },
  { value: "done", label: "완료" }
];

type ProjectLinkListKey = "driveFolders" | "dropboxFolders" | "feedbackLinks";

const shotStatusOptions = statusOptions.filter((option) => option.value !== "blocked" && option.value !== "delivered");

const linkSections: Array<{ key: ProjectLinkListKey; label: string; placeholder: string }> = [
  { key: "driveFolders", label: "구글드라이브 폴더", placeholder: "https://drive.google.com/..." },
  { key: "dropboxFolders", label: "드롭박스 폴더", placeholder: "https://dropbox.com/..." },
  { key: "feedbackLinks", label: "피드백 시트 / 슬라이드", placeholder: "Google Sheets 또는 Slides 링크" }
];

export function ProjectShotManager({ state, selectedProjectId, onStateChange }: Props) {
  const defaultProjectId = selectedProjectId === "all" ? state.projects[0]?.id ?? "" : selectedProjectId;
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [projectDeliveryDate, setProjectDeliveryDate] = useState("2026-07-10");
  const [shotProjectId, setShotProjectId] = useState(defaultProjectId);
  const [shotCode, setShotCode] = useState("");
  const [shotDueDate, setShotDueDate] = useState("2026-07-04");
  const [shotDeliveryDate, setShotDeliveryDate] = useState("2026-07-05");
  const [shotPriority, setShotPriority] = useState(3);
  const [newMilestoneLabels, setNewMilestoneLabels] = useState<Record<string, string>>({});
  const [newMilestoneDates, setNewMilestoneDates] = useState<Record<string, string>>({});
  const [newProjectLinks, setNewProjectLinks] = useState<Record<string, Partial<Record<ProjectLinkListKey, string>>>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const visibleProjects = useMemo(() => {
    if (selectedProjectId === "all") return state.projects;
    return state.projects.filter((project) => project.id === selectedProjectId);
  }, [selectedProjectId, state.projects]);

  function handleAddProject() {
    if (!projectName.trim()) return;

    const nextState = addProject(state, {
      name: projectName,
      client: client || "클라이언트 미정",
      startDate: "2026-07-04",
      deliveryDate: projectDeliveryDate
    });

    onStateChange(nextState);
    setProjectName("");
    setClient("");
  }

  function handleAddShot() {
    const projectId = shotProjectId || defaultProjectId;
    if (!projectId || !shotCode.trim()) return;

    onStateChange(
      addShot(state, {
        projectId,
        code: shotCode,
        dueDate: shotDueDate,
        deliveryDate: shotDeliveryDate,
        priority: shotPriority
      })
    );
    setShotCode("");
  }

  function handleAddMilestone(projectId: string) {
    const project = state.projects.find((item) => item.id === projectId);
    const interimCount = project?.deliveryMilestones?.filter((milestone) => milestone.kind === "interim").length ?? 0;
    const label = newMilestoneLabels[projectId]?.trim() || `${interimCount + 1}차 납품일`;
    const date = newMilestoneDates[projectId] || project?.deliveryDate || "2026-07-10";

    onStateChange(addDeliveryMilestone(state, projectId, { label, date }));
    setNewMilestoneLabels((current) => ({ ...current, [projectId]: "" }));
    setNewMilestoneDates((current) => ({ ...current, [projectId]: "" }));
  }

  function handleAddProjectLink(projectId: string, key: ProjectLinkListKey) {
    const value = newProjectLinks[projectId]?.[key] ?? "";
    if (!value.trim()) return;

    onStateChange(addProjectLink(state, projectId, key, value));
    setNewProjectLinks((current) => ({
      ...current,
      [projectId]: { ...current[projectId], [key]: "" }
    }));
  }

  return (
    <section className="panel managePanel">
      <div className="sectionHeader">
        <h2>프로젝트 / 샷 관리</h2>
        <span>기본 정보는 여기서 빠르게 추가하고 수정합니다.</span>
      </div>

      <div className="manageGrid">
        <div className="manageBlock">
          <h3>프로젝트 추가</h3>
          <label>
            프로젝트명
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="예: SHOW_C" />
          </label>
          <label>
            클라이언트
            <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="예: Client C" />
          </label>
          <label>
            납품일
            <input type="date" value={projectDeliveryDate} onChange={(event) => setProjectDeliveryDate(event.target.value)} />
          </label>
          <button onClick={handleAddProject}>프로젝트 추가</button>
        </div>

        <div className="manageBlock">
          <h3>샷 추가</h3>
          <label>
            프로젝트
            <select value={shotProjectId || defaultProjectId} onChange={(event) => setShotProjectId(event.target.value)}>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            샷 코드
            <input value={shotCode} onChange={(event) => setShotCode(event.target.value)} placeholder="예: SH050" />
          </label>
          <div className="inlineFields">
            <label>
              작업 마감
              <input type="date" value={shotDueDate} onChange={(event) => setShotDueDate(event.target.value)} />
            </label>
            <label>
              납품일
              <input type="date" value={shotDeliveryDate} onChange={(event) => setShotDeliveryDate(event.target.value)} />
            </label>
          </div>
          <label>
            우선순위
            <input type="number" min="1" max="5" value={shotPriority} onChange={(event) => setShotPriority(Number(event.target.value))} />
          </label>
          <button onClick={handleAddShot}>샷 추가</button>
        </div>
      </div>

      <div className="quickEditList">
        {visibleProjects.map((project) => {
          const projectShots = state.shots.filter((shot) => shot.projectId === project.id);
          const isExpanded = expandedProjects[project.id] ?? false;

          return (
            <article className="quickEditProject" key={project.id}>
              <button
                className="projectAccordionHeader"
                aria-expanded={isExpanded}
                onClick={() => setExpandedProjects((current) => ({ ...current, [project.id]: !isExpanded }))}
              >
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.client}</small>
                </span>
                <span className="projectAccordionMeta">
                  샷 {projectShots.length}개 · 최종 {project.deliveryDate}
                </span>
                <span className="projectAccordionToggle">{isExpanded ? "닫기" : "열기"}</span>
              </button>

              {isExpanded ? (
                <div className="projectAccordionBody">
                  <div className="projectEditGrid">
                    <label>
                      프로젝트명
                      <input value={project.name} onChange={(event) => onStateChange(updateProject(state, project.id, { name: event.target.value }))} />
                    </label>
                    <label>
                      클라이언트
                      <input value={project.client} onChange={(event) => onStateChange(updateProject(state, project.id, { client: event.target.value }))} />
                    </label>
                    <label>
                      상태
                      <select value={project.status} onChange={(event) => onStateChange(updateProject(state, project.id, { status: event.target.value as WorkStatus }))}>
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      시작일
                      <input type="date" value={project.startDate} onChange={(event) => onStateChange(updateProject(state, project.id, { startDate: event.target.value }))} />
                    </label>
                    <label>
                      납품일
                      <input type="date" value={project.deliveryDate} onChange={(event) => onStateChange(updateProject(state, project.id, { deliveryDate: event.target.value }))} />
                    </label>
                  </div>
                  <div className="milestoneEditor">
                    <h4>납품일 관리</h4>
                    {(project.deliveryMilestones ?? [{ id: "final", label: "최종 납품일", date: project.deliveryDate, kind: "final" }]).map((milestone) => (
                      <div className="milestoneRow" key={milestone.id}>
                        <input
                          aria-label={`${project.name} ${milestone.label} 이름`}
                          value={milestone.label}
                          onChange={(event) => onStateChange(updateDeliveryMilestone(state, project.id, milestone.id, { label: event.target.value }))}
                        />
                        <input
                          aria-label={`${project.name} ${milestone.label} 날짜`}
                          type="date"
                          value={milestone.date}
                          onChange={(event) => onStateChange(updateDeliveryMilestone(state, project.id, milestone.id, { date: event.target.value }))}
                        />
                        <span>{milestone.kind === "final" ? "최종" : "중간"}</span>
                        <button disabled={milestone.kind === "final"} onClick={() => onStateChange(removeDeliveryMilestone(state, project.id, milestone.id))}>
                          삭제
                        </button>
                      </div>
                    ))}
                    <div className="milestoneRow addMilestoneRow">
                      <input
                        aria-label={`${project.name} 새 납품일 이름`}
                        placeholder="예: 2차 납품일"
                        value={newMilestoneLabels[project.id] ?? ""}
                        onChange={(event) => setNewMilestoneLabels((current) => ({ ...current, [project.id]: event.target.value }))}
                      />
                      <input
                        aria-label={`${project.name} 새 납품일 날짜`}
                        type="date"
                        value={newMilestoneDates[project.id] ?? ""}
                        onChange={(event) => setNewMilestoneDates((current) => ({ ...current, [project.id]: event.target.value }))}
                      />
                      <span>추가</span>
                      <button onClick={() => handleAddMilestone(project.id)}>추가</button>
                    </div>
                  </div>
                  <div className="sourceLocationEditor">
                    <h4>자료 위치 관리</h4>
                    {linkSections.map((section) => {
                      const links = project[section.key] ?? [];

                      return (
                        <div className="sourceLocationGroup" key={section.key}>
                          <span>{section.label}</span>
                          {links.map((link, index) => (
                            <div className="sourceLocationRow" key={`${section.key}-${index}`}>
                              <input
                                aria-label={`${project.name} ${section.label} ${index + 1}`}
                                value={link}
                                onChange={(event) => onStateChange(updateProjectLink(state, project.id, section.key, index, event.target.value))}
                              />
                              <button onClick={() => onStateChange(removeProjectLink(state, project.id, section.key, index))}>삭제</button>
                            </div>
                          ))}
                          <div className="sourceLocationRow addSourceLocationRow">
                            <input
                              aria-label={`${project.name} ${section.label} 추가`}
                              placeholder={section.placeholder}
                              value={newProjectLinks[project.id]?.[section.key] ?? ""}
                              onChange={(event) =>
                                setNewProjectLinks((current) => ({
                                  ...current,
                                  [project.id]: { ...current[project.id], [section.key]: event.target.value }
                                }))
                              }
                            />
                            <button onClick={() => handleAddProjectLink(project.id, section.key)}>추가</button>
                          </div>
                        </div>
                      );
                    })}
                    <label className="kakaoNotes">
                      카톡 피드백 메모
                      <textarea
                        value={project.kakaoFeedbackNotes ?? ""}
                        onChange={(event) => onStateChange(updateProject(state, project.id, { kakaoFeedbackNotes: event.target.value }))}
                        placeholder="예: 클라이언트 카톡방, 날짜, 확인해야 할 메시지 범위"
                      />
                    </label>
                  </div>
                  <div className="quickShotRows">
                    {projectShots.map((shot) => (
                      <div className="quickShotRow" key={shot.id}>
                        <input
                          aria-label={`${shot.code} 샷 코드`}
                          value={shot.code}
                          onChange={(event) => onStateChange(updateShot(state, shot.id, { code: event.target.value.toUpperCase() }))}
                        />
                        <input
                          aria-label={`${shot.code} 담당`}
                          value={shot.assignedTo ?? ""}
                          onChange={(event) => onStateChange(updateShot(state, shot.id, { assignedTo: event.target.value }))}
                          placeholder="내 작업 또는 외주명"
                        />
                        <select value={shot.status} onChange={(event) => onStateChange(updateShot(state, shot.id, { status: event.target.value as WorkStatus }))}>
                          {shotStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input type="date" value={shot.dueDate} onChange={(event) => onStateChange(updateShot(state, shot.id, { dueDate: event.target.value }))} />
                        <input
                          aria-label={`${shot.code} 우선순위`}
                          type="number"
                          min="1"
                          max="5"
                          value={shot.priority}
                          onChange={(event) => onStateChange(updateShot(state, shot.id, { priority: Number(event.target.value) }))}
                        />
                        <button
                          className="dangerButton"
                          onClick={() => {
                            if (window.confirm(`${shot.code} 샷을 삭제할까요? 연결된 소스, 피드백, 작업도 같이 정리됩니다.`)) {
                              onStateChange(removeShot(state, shot.id));
                            }
                          }}
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
