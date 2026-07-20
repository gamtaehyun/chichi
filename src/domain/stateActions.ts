import type { ChichiState, DeliveryMilestone, Feedback, FinanceEntry, Project, Shot, SourceCheckItem, SourceCheckKey, SourceFile, TaskItem } from "./types";

export type ReviewQueueAction = "confirm" | "not-needed" | "keep-issue" | "in-progress" | "done" | "superseded";

type NewProjectInput = Pick<Project, "name" | "client" | "startDate" | "deliveryDate">;
type NewShotInput = Pick<Shot, "projectId" | "code" | "dueDate" | "deliveryDate" | "priority">;
type NewFinanceEntryInput = Pick<FinanceEntry, "projectId" | "label" | "kind" | "amount" | "date">;
type NewTaskInput = Pick<TaskItem, "projectId" | "title" | "type" | "dueDate" | "priority"> & Partial<Pick<TaskItem, "shotId" | "status" | "blockerReason">>;

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "");
}

function uniqueId(prefix: string, seed: string, existingIds: Set<string>): string {
  const base = `${prefix}-${slugify(seed) || "item"}`;
  let candidate = base;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function withDefaultMilestones(project: Project): Project {
  const projectWithDefaults = {
    ...project,
    driveFolders: project.driveFolders ?? [],
    dropboxFolders: project.dropboxFolders ?? [],
    feedbackLinks: project.feedbackLinks ?? [],
    kakaoFeedbackNotes: project.kakaoFeedbackNotes ?? ""
  };

  if (projectWithDefaults.deliveryMilestones?.length) return projectWithDefaults;

  return {
    ...projectWithDefaults,
    deliveryMilestones: [{ id: "final", label: "최종 납품일", date: project.deliveryDate, kind: "final" }]
  };
}

export const defaultSourceChecklist: SourceCheckItem[] = [
  { key: "plate-original", status: "pending" },
  { key: "plate-beauty", status: "pending" },
  { key: "3d", status: "pending" },
  { key: "fx", status: "pending" },
  { key: "roto", status: "pending" }
];

function createDefaultSourceChecklist(): SourceCheckItem[] {
  return defaultSourceChecklist.map((item) => ({ ...item }));
}

function withDefaultShotChecklist(shot: Shot): Shot {
  const existingItems = shot.sourceChecklist ?? [];
  const existingKeys = new Set(existingItems.map((item) => item.key));

  return {
    ...shot,
    sourceChecklist: [...existingItems, ...createDefaultSourceChecklist().filter((item) => !existingKeys.has(item.key))]
  };
}

export function addProject(state: ChichiState, input: NewProjectInput): ChichiState {
  const id = uniqueId("project", input.name, new Set(state.projects.map((project) => project.id)));
  const project: Project = {
    id,
    name: input.name.trim(),
    client: input.client.trim(),
    status: "in-progress",
    startDate: input.startDate,
    deliveryDate: input.deliveryDate,
    deliveryMilestones: [{ id: "final", label: "최종 납품일", date: input.deliveryDate, kind: "final" }],
    driveFolders: [],
    dropboxFolders: [],
    feedbackLinks: [],
    kakaoFeedbackNotes: ""
  };

  return {
    ...state,
    projects: [...state.projects, project]
  };
}

export function updateProject(state: ChichiState, projectId: string, patch: Partial<Project>): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const nextProject = withDefaultMilestones({ ...project, ...patch });

      if (patch.deliveryDate) {
        return {
          ...nextProject,
          deliveryMilestones: nextProject.deliveryMilestones.map((milestone) =>
            milestone.kind === "final" ? { ...milestone, date: patch.deliveryDate ?? milestone.date } : milestone
          )
        };
      }

      return nextProject;
    })
  };
}

export function removeProject(state: ChichiState, projectId: string): ChichiState {
  const shotIds = new Set(state.shots.filter((shot) => shot.projectId === projectId).map((shot) => shot.id));

  return {
    ...state,
    projects: state.projects.filter((project) => project.id !== projectId),
    shots: state.shots.filter((shot) => shot.projectId !== projectId),
    sources: state.sources.filter((source) => source.projectId !== projectId && (!source.shotId || !shotIds.has(source.shotId))),
    feedback: state.feedback.filter((item) => item.projectId !== projectId && (!item.shotId || !shotIds.has(item.shotId))),
    tasks: state.tasks.filter((task) => task.projectId !== projectId && (!task.shotId || !shotIds.has(task.shotId))),
    finance: state.finance.filter((entry) => entry.projectId !== projectId)
  };
}

export function removeShot(state: ChichiState, shotId: string): ChichiState {
  return {
    ...state,
    shots: state.shots.filter((shot) => shot.id !== shotId),
    sources: state.sources.filter((source) => source.shotId !== shotId),
    feedback: state.feedback.filter((item) => item.shotId !== shotId),
    tasks: state.tasks.filter((task) => task.shotId !== shotId)
  };
}

export function addDeliveryMilestone(state: ChichiState, projectId: string, input: Pick<DeliveryMilestone, "label" | "date">): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithMilestones = withDefaultMilestones(project);
      const interimCount = projectWithMilestones.deliveryMilestones.filter((milestone) => milestone.kind === "interim").length;
      const id = uniqueId("delivery", `${project.id}-${interimCount + 1}`, new Set(projectWithMilestones.deliveryMilestones.map((milestone) => milestone.id)));

      return {
        ...projectWithMilestones,
        deliveryMilestones: [
          ...projectWithMilestones.deliveryMilestones.filter((milestone) => milestone.kind !== "final"),
          { id, label: input.label, date: input.date, kind: "interim" },
          ...projectWithMilestones.deliveryMilestones.filter((milestone) => milestone.kind === "final")
        ]
      };
    })
  };
}

export function updateDeliveryMilestone(state: ChichiState, projectId: string, milestoneId: string, patch: Partial<DeliveryMilestone>): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithMilestones = withDefaultMilestones(project);
      const deliveryMilestones = projectWithMilestones.deliveryMilestones.map((milestone) => (milestone.id === milestoneId ? { ...milestone, ...patch } : milestone));
      const finalMilestone = deliveryMilestones.find((milestone) => milestone.kind === "final");

      return {
        ...projectWithMilestones,
        deliveryDate: finalMilestone?.date ?? projectWithMilestones.deliveryDate,
        deliveryMilestones
      };
    })
  };
}

export function removeDeliveryMilestone(state: ChichiState, projectId: string, milestoneId: string): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithMilestones = withDefaultMilestones(project);

      return {
        ...projectWithMilestones,
        deliveryMilestones: projectWithMilestones.deliveryMilestones.filter((milestone) => milestone.id !== milestoneId || milestone.kind === "final")
      };
    })
  };
}

type ProjectLinkListKey = "driveFolders" | "dropboxFolders" | "feedbackLinks";

export function addProjectLink(state: ChichiState, projectId: string, key: ProjectLinkListKey, value: string): ChichiState {
  const trimmedValue = value.trim();
  if (!trimmedValue) return state;

  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithDefaults = withDefaultMilestones(project);

      return {
        ...projectWithDefaults,
        [key]: [...projectWithDefaults[key], trimmedValue]
      };
    })
  };
}

export function updateProjectLink(state: ChichiState, projectId: string, key: ProjectLinkListKey, index: number, value: string): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithDefaults = withDefaultMilestones(project);

      return {
        ...projectWithDefaults,
        [key]: projectWithDefaults[key].map((item, itemIndex) => (itemIndex === index ? value : item))
      };
    })
  };
}

export function removeProjectLink(state: ChichiState, projectId: string, key: ProjectLinkListKey, index: number): ChichiState {
  return {
    ...state,
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project;
      const projectWithDefaults = withDefaultMilestones(project);

      return {
        ...projectWithDefaults,
        [key]: projectWithDefaults[key].filter((_, itemIndex) => itemIndex !== index)
      };
    })
  };
}

export function addShot(state: ChichiState, input: NewShotInput): ChichiState {
  const id = uniqueId("shot", `${input.projectId}-${input.code}`, new Set(state.shots.map((shot) => shot.id)));
  const shot: Shot = {
    id,
    projectId: input.projectId,
    code: input.code.trim().toUpperCase(),
    status: "not-started",
    priority: input.priority,
    dueDate: input.dueDate,
    deliveryDate: input.deliveryDate,
    sourceChecklist: createDefaultSourceChecklist()
  };

  return {
    ...state,
    shots: [...state.shots, shot]
  };
}

export function updateShot(state: ChichiState, shotId: string, patch: Partial<Shot>): ChichiState {
  return {
    ...state,
    shots: state.shots.map((shot) => (shot.id === shotId ? withDefaultShotChecklist({ ...shot, ...patch }) : shot))
  };
}

export function updateShotSourceCheck(state: ChichiState, shotId: string, key: SourceCheckKey, patch: Partial<Pick<SourceCheckItem, "status" | "note">>): ChichiState {
  return {
    ...state,
    shots: state.shots.map((shot) => {
      if (shot.id !== shotId) return shot;
      const shotWithChecklist = withDefaultShotChecklist(shot);

      return {
        ...shotWithChecklist,
        sourceChecklist: shotWithChecklist.sourceChecklist.map((item) => (item.key === key ? { ...item, ...patch } : item))
      };
    })
  };
}

function sourceCheckKeyForSource(source: SourceFile): SourceCheckKey | undefined {
  if (source.sourceType === "3d") return "3d";
  if (source.sourceType === "fx") return "fx";
  if (source.sourceType === "roto") return "roto";
  if (source.sourceType !== "plate") return undefined;

  if (source.plateStatus === "original") return "plate-original";
  if (source.plateStatus === "beauty-corrected" || source.plateStatus === "final") return "plate-beauty";
  return "plate-original";
}

function sourceFingerprint(source: SourceFile): string {
  return `${source.id}:${source.modifiedAt}:${source.version ?? "no-version"}:${source.latestStatus}:${source.changeStatus}`;
}

function checklistPatchForSource(source: SourceFile): Partial<Pick<SourceCheckItem, "status" | "note" | "sourceFingerprint">> | undefined {
  if (source.changeStatus === "unchanged") return undefined;
  const fingerprint = sourceFingerprint(source);

  if (source.latestStatus === "needs-confirmation" || source.latestStatus === "superseded") {
    return { status: "issue", note: `${source.fileName} 최신 여부 확인 필요`, sourceFingerprint: fingerprint };
  }

  if (source.sourceType === "plate" && source.plateStatus === "uncertain") {
    return { status: "issue", note: `${source.fileName} 플레이트 종류 확인 필요`, sourceFingerprint: fingerprint };
  }

  return { status: "pending", note: `${source.fileName} 새 소스 확인 필요`, sourceFingerprint: fingerprint };
}

export function applySourceChecklistRules(state: ChichiState): ChichiState {
  const changedSources = state.sources.filter((source) => source.shotId && source.changeStatus !== "unchanged");
  if (changedSources.length === 0) return state;

  return {
    ...state,
    shots: state.shots.map((shot) => {
      const shotSources = changedSources.filter((source) => source.shotId === shot.id);
      if (shotSources.length === 0) return shot;

      const shotWithChecklist = withDefaultShotChecklist(shot);
      const patchByKey = new Map<SourceCheckKey, Partial<Pick<SourceCheckItem, "status" | "note" | "sourceFingerprint">>>();

      shotSources.forEach((source) => {
        const key = sourceCheckKeyForSource(source);
        const patch = checklistPatchForSource(source);
        if (!key || !patch) return;
        const currentItem = shotWithChecklist.sourceChecklist.find((item) => item.key === key);
        if (currentItem?.sourceFingerprint === patch.sourceFingerprint) return;
        const previous = patchByKey.get(key);

        if (!previous || patch.status === "issue") {
          patchByKey.set(key, patch);
        }
      });

      if (patchByKey.size === 0) return shotWithChecklist;

      return {
        ...shotWithChecklist,
        sourceChecklist: shotWithChecklist.sourceChecklist.map((item) => {
          const patch = patchByKey.get(item.key);
          return patch ? { ...item, ...patch } : item;
        })
      };
    })
  };
}

export function addSourceFiles(state: ChichiState, sources: SourceFile[]): ChichiState {
  if (sources.length === 0) return state;

  const incomingByPath = new Map(sources.map((source) => [source.pathOrUrl, source]));
  const updatedSources = state.sources.map((source) => {
    const incoming = incomingByPath.get(source.pathOrUrl);
    if (!incoming) return source;
    incomingByPath.delete(source.pathOrUrl);

    return {
      ...source,
      ...incoming,
      id: source.id,
      firstSeenAt: source.firstSeenAt,
      changeStatus: source.modifiedAt === incoming.modifiedAt ? "unchanged" : "modified"
    } satisfies SourceFile;
  });

  return applySourceChecklistRules({
    ...state,
    sources: [...updatedSources, ...incomingByPath.values()]
  });
}

export function updateSource(state: ChichiState, sourceId: string, patch: Partial<SourceFile>): ChichiState {
  return applySourceChecklistRules({
    ...state,
    sources: state.sources.map((source) => (source.id === sourceId ? { ...source, ...patch } : source))
  });
}

function parseChecklistItemId(itemId: string): { shotId: string; checkKey: SourceCheckKey } | undefined {
  const match = itemId.match(/^checklist-(.+)-(plate-original|plate-beauty|3d|fx|roto)$/);
  if (!match) return undefined;
  return { shotId: match[1], checkKey: match[2] as SourceCheckKey };
}

export function resolveReviewQueueItem(state: ChichiState, itemId: string, action: ReviewQueueAction): ChichiState {
  if (itemId.startsWith("checklist-")) {
    const target = parseChecklistItemId(itemId);
    if (!target) return state;

    if (action === "confirm") return updateShotSourceCheck(state, target.shotId, target.checkKey, { status: "confirmed", note: undefined });
    if (action === "not-needed") return updateShotSourceCheck(state, target.shotId, target.checkKey, { status: "not-needed", note: undefined });
    return updateShotSourceCheck(state, target.shotId, target.checkKey, { status: "issue" });
  }

  if (itemId.startsWith("feedback-")) {
    const feedbackId = itemId.replace(/^feedback-/, "");
    return updateFeedback(state, feedbackId, { status: action === "done" || action === "confirm" ? "done" : "needs-clarification" });
  }

  if (itemId.startsWith("task-")) {
    const taskId = itemId.replace(/^task-/, "");
    if (action === "done" || action === "confirm") return updateTask(state, taskId, { status: "done" });
    if (action === "in-progress") return updateTask(state, taskId, { status: "in-progress" });
    return state;
  }

  if (itemId.startsWith("source-")) {
    const sourceId = itemId.replace(/^source-/, "");
    if (action === "confirm") return updateSource(state, sourceId, { latestStatus: "confirmed-latest" });
    if (action === "superseded") return updateSource(state, sourceId, { latestStatus: "superseded", changeStatus: "unchanged" });
  }

  return state;
}

export function updateTask(state: ChichiState, taskId: string, patch: Partial<TaskItem>): ChichiState {
  return {
    ...state,
    tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
  };
}

export function addTask(state: ChichiState, input: NewTaskInput): ChichiState {
  const id = uniqueId("task", `${input.projectId}-${input.title}`, new Set(state.tasks.map((task) => task.id)));

  return {
    ...state,
    tasks: [
      ...state.tasks,
      {
        id,
        projectId: input.projectId,
        shotId: input.shotId,
        title: input.title.trim(),
        type: input.type,
        dueDate: input.dueDate,
        priority: input.priority,
        status: input.status ?? "not-started",
        blockerReason: input.blockerReason
      }
    ]
  };
}

export function updateFeedback(state: ChichiState, feedbackId: string, patch: Partial<Feedback>): ChichiState {
  return {
    ...state,
    feedback: state.feedback.map((item) => (item.id === feedbackId ? { ...item, ...patch } : item))
  };
}

export function addFeedback(
  state: ChichiState,
  input: Pick<Feedback, "projectId" | "originalSource" | "originalText" | "instruction"> &
    Partial<Pick<Feedback, "shotId" | "attachments" | "confidence" | "status" | "relation">>
): ChichiState {
  const id = uniqueId("feedback", `${input.projectId}-${input.instruction}`, new Set(state.feedback.map((item) => item.id)));

  return {
    ...state,
    feedback: [
      ...state.feedback,
      {
        id,
        projectId: input.projectId,
        shotId: input.shotId,
        originalSource: input.originalSource,
        originalText: input.originalText,
        instruction: input.instruction,
        attachments: input.attachments ?? [],
        confidence: input.confidence ?? 0.75,
        status: input.status ?? "new",
        relation: input.relation ?? "new-request"
      }
    ]
  };
}

export function addFinanceEntry(state: ChichiState, input: NewFinanceEntryInput): ChichiState {
  const id = uniqueId("finance", `${input.projectId}-${input.label}`, new Set(state.finance.map((entry) => entry.id)));

  return {
    ...state,
    finance: [
      ...state.finance,
      {
        id,
        projectId: input.projectId,
        label: input.label.trim() || "정산 항목",
        kind: input.kind,
        amount: input.amount,
        date: input.date
      }
    ]
  };
}

export function updateFinanceEntry(state: ChichiState, entryId: string, patch: Partial<FinanceEntry>): ChichiState {
  return {
    ...state,
    finance: state.finance.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))
  };
}

export function removeFinanceEntry(state: ChichiState, entryId: string): ChichiState {
  return {
    ...state,
    finance: state.finance.filter((entry) => entry.id !== entryId)
  };
}
