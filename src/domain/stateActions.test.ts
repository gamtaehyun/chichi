import { describe, expect, it } from "vitest";
import {
  addDeliveryMilestone,
  addFeedback,
  addFinanceEntry,
  addProject,
  addProjectLink,
  addShot,
  addSourceFiles,
  applySourceChecklistRules,
  removeDeliveryMilestone,
  removeFinanceEntry,
  removeProject,
  removeProjectLink,
  removeShot,
  updateDeliveryMilestone,
  updateFeedback,
  updateFinanceEntry,
  updateProject,
  updateProjectLink,
  updateShot,
  updateShotSourceCheck,
  updateTask
} from "./stateActions";
import type { ChichiState } from "./types";

const baseState: ChichiState = {
  projects: [],
  shots: [],
  sources: [],
  feedback: [],
  tasks: [],
  finance: []
};

describe("stateActions", () => {
  it("adds a project with default production fields", () => {
    const next = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });

    expect(next.projects).toHaveLength(1);
    expect(next.projects[0]).toMatchObject({
      name: "SHOW_A",
      client: "Client X",
      status: "in-progress",
      deliveryMilestones: [{ id: "final", label: "최종 납품일", date: "2026-07-10", kind: "final" }],
      driveFolders: [],
      dropboxFolders: [],
      feedbackLinks: [],
      kakaoFeedbackNotes: ""
    });
    expect(next).not.toBe(baseState);
  });

  it("updates an existing project", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const id = state.projects[0].id;
    const next = updateProject(state, id, { client: "Client Y", deliveryDate: "2026-07-12" });

    expect(next.projects[0].client).toBe("Client Y");
    expect(next.projects[0].deliveryDate).toBe("2026-07-12");
  });

  it("removes a project with linked production records", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = stateWithProject.projects[0].id;
    const stateWithShot = addShot(stateWithProject, {
      projectId,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const populatedState: ChichiState = {
      ...stateWithShot,
      sources: [
        {
          id: "source-1",
          projectId,
          shotId,
          fileName: "SH100_FX_v001.exr",
          pathOrUrl: "drive://SHOW_A/SH100/SH100_FX_v001.exr",
          provider: "google-drive",
          sourceType: "fx",
          modifiedAt: "2026-07-04T09:00:00+09:00",
          firstSeenAt: "2026-07-04T09:00:00+09:00",
          latestStatus: "likely-latest",
          changeStatus: "new"
        }
      ],
      feedback: [
        {
          id: "feedback-1",
          projectId,
          shotId,
          originalSource: "kakao",
          originalText: "SH100 밝게",
          instruction: "밝게",
          confidence: 0.9,
          status: "new",
          relation: "new-request"
        }
      ],
      tasks: [{ id: "task-1", projectId, shotId, title: "SH100 밝게", type: "comp-work", dueDate: "2026-07-05", priority: 3, status: "in-progress" }],
      finance: [{ id: "finance-1", projectId, label: "계약금", kind: "income", amount: 1000000, date: "2026-07-04" }]
    };

    const next = removeProject(populatedState, projectId);

    expect(next.projects).toHaveLength(0);
    expect(next.shots).toHaveLength(0);
    expect(next.sources).toHaveLength(0);
    expect(next.feedback).toHaveLength(0);
    expect(next.tasks).toHaveLength(0);
    expect(next.finance).toHaveLength(0);
  });

  it("removes shot and all dependent shot records", () => {
    const projectId = "project-1";
    const shotId = "shot-1";
    const next = removeShot(
      {
        projects: [{ id: projectId, name: "SHOW_A", client: "Client", status: "in-progress", startDate: "2026-07-01", deliveryDate: "2026-07-10", deliveryMilestones: [], driveFolders: [], dropboxFolders: [], feedbackLinks: [], kakaoFeedbackNotes: "" }],
        shots: [{ id: shotId, projectId, code: "SH010", status: "in-progress", priority: 3, dueDate: "2026-07-05", deliveryDate: "2026-07-05", sourceChecklist: [] }],
        sources: [{ id: "source-1", projectId, shotId, fileName: "SH010_fx_v001.exr", pathOrUrl: "SH010_fx_v001.exr", provider: "manual", sourceType: "fx", modifiedAt: "2026-07-04", firstSeenAt: "2026-07-04", latestStatus: "needs-confirmation", changeStatus: "new" }],
        feedback: [{ id: "feedback-1", projectId, shotId, originalSource: "chat", originalText: "fix", instruction: "fix", confidence: 0.8, status: "new", relation: "new-request" }],
        tasks: [{ id: "task-1", projectId, shotId, title: "fix", type: "comp-work", dueDate: "2026-07-05", priority: 3, status: "in-progress" }],
        finance: []
      },
      shotId
    );

    expect(next.shots).toHaveLength(0);
    expect(next.sources).toHaveLength(0);
    expect(next.feedback).toHaveLength(0);
    expect(next.tasks).toHaveLength(0);
  });

  it("adds, updates, and removes delivery milestones", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const withFirst = addDeliveryMilestone(state, projectId, { label: "1차 납품일", date: "2026-07-06" });
    const added = withFirst.projects[0].deliveryMilestones.find((item) => item.kind === "interim");

    expect(added).toMatchObject({ label: "1차 납품일", date: "2026-07-06", kind: "interim" });

    const updated = updateDeliveryMilestone(withFirst, projectId, added!.id, { label: "1차 리뷰 납품", date: "2026-07-07" });

    expect(updated.projects[0].deliveryMilestones.find((item) => item.id === added!.id)).toMatchObject({
      label: "1차 리뷰 납품",
      date: "2026-07-07"
    });

    const removed = removeDeliveryMilestone(updated, projectId, added!.id);

    expect(removed.projects[0].deliveryMilestones).toHaveLength(1);
    expect(removed.projects[0].deliveryMilestones[0].kind).toBe("final");
  });

  it("adds, updates, and removes project source links", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const withLink = addProjectLink(state, projectId, "driveFolders", "https://drive.google.com/folders/source");

    expect(withLink.projects[0].driveFolders).toEqual(["https://drive.google.com/folders/source"]);

    const updated = updateProjectLink(withLink, projectId, "driveFolders", 0, "https://drive.google.com/folders/plate");

    expect(updated.projects[0].driveFolders[0]).toBe("https://drive.google.com/folders/plate");

    const removed = removeProjectLink(updated, projectId, "driveFolders", 0);

    expect(removed.projects[0].driveFolders).toEqual([]);
  });

  it("adds a shot to a project", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const next = addShot(state, {
      projectId,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });

    expect(next.shots).toHaveLength(1);
    expect(next.shots[0]).toMatchObject({
      projectId,
      code: "SH100",
      status: "not-started",
      priority: 4,
      sourceChecklist: [
        { key: "plate-original", status: "pending" },
        { key: "plate-beauty", status: "pending" },
        { key: "3d", status: "pending" },
        { key: "fx", status: "pending" },
        { key: "roto", status: "pending" }
      ]
    });
  });

  it("updates a shot source checklist item", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const stateWithShot = addShot(stateWithProject, {
      projectId: stateWithProject.projects[0].id,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const next = updateShotSourceCheck(stateWithShot, shotId, "3d", { status: "confirmed", note: "v003 확인" });
    const item = next.shots[0].sourceChecklist.find((check) => check.key === "3d");

    expect(item).toMatchObject({ key: "3d", status: "confirmed", note: "v003 확인" });
  });

  it("applies changed source files to the shot source checklist", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const stateWithShot = addShot(stateWithProject, {
      projectId: stateWithProject.projects[0].id,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const stateWithConfirmedFx = updateShotSourceCheck(stateWithShot, shotId, "fx", { status: "confirmed", note: "v003 확인 완료" });
    const next = applySourceChecklistRules({
      ...stateWithConfirmedFx,
      sources: [
        {
          id: "src-fx",
          projectId: stateWithProject.projects[0].id,
          shotId,
          fileName: "SH100_FX_smoke_v004.exr",
          pathOrUrl: "drive://SHOW_A/SH100/FX/SH100_FX_smoke_v004.exr",
          provider: "google-drive",
          sourceType: "fx",
          version: 4,
          modifiedAt: "2026-07-04T09:00:00+09:00",
          firstSeenAt: "2026-07-04T09:00:00+09:00",
          latestStatus: "likely-latest",
          changeStatus: "new"
        }
      ]
    });
    const item = next.shots[0].sourceChecklist.find((check) => check.key === "fx");

    expect(item).toMatchObject({ key: "fx", status: "pending", note: "SH100_FX_smoke_v004.exr 새 소스 확인 필요" });
  });

  it("marks uncertain source files as checklist issues", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const stateWithShot = addShot(stateWithProject, {
      projectId: stateWithProject.projects[0].id,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const next = applySourceChecklistRules({
      ...stateWithShot,
      sources: [
        {
          id: "src-plate",
          projectId: stateWithProject.projects[0].id,
          shotId,
          fileName: "SH100_plate_beauty_final.exr",
          pathOrUrl: "drive://SHOW_A/SH100/plate/SH100_plate_beauty_final.exr",
          provider: "google-drive",
          sourceType: "plate",
          modifiedAt: "2026-07-04T09:00:00+09:00",
          firstSeenAt: "2026-07-04T09:00:00+09:00",
          latestStatus: "needs-confirmation",
          plateStatus: "final",
          changeStatus: "new"
        }
      ]
    });
    const item = next.shots[0].sourceChecklist.find((check) => check.key === "plate-beauty");

    expect(item).toMatchObject({ key: "plate-beauty", status: "issue", note: "SH100_plate_beauty_final.exr 최신 여부 확인 필요" });
  });

  it("adds source files and applies checklist rules", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const stateWithShot = addShot(stateWithProject, {
      projectId: stateWithProject.projects[0].id,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const next = addSourceFiles(stateWithShot, [
      {
        id: "src-chat-fx",
        projectId: stateWithProject.projects[0].id,
        shotId,
        fileName: "SH100_FX_v004.exr",
        pathOrUrl: "chat://SHOW_A/SH100/SH100_FX_v004.exr",
        provider: "manual",
        sourceType: "fx",
        version: 4,
        modifiedAt: "2026-07-04T09:00:00+09:00",
        firstSeenAt: "2026-07-04T09:00:00+09:00",
        latestStatus: "likely-latest",
        changeStatus: "new"
      }
    ]);

    expect(next.sources).toHaveLength(1);
    expect(next.shots[0].sourceChecklist.find((check) => check.key === "fx")).toMatchObject({
      status: "pending",
      note: "SH100_FX_v004.exr 새 소스 확인 필요"
    });
  });

  it("updates an existing shot", () => {
    const stateWithProject = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const stateWithShot = addShot(stateWithProject, {
      projectId: stateWithProject.projects[0].id,
      code: "SH100",
      dueDate: "2026-07-05",
      deliveryDate: "2026-07-06",
      priority: 4
    });
    const shotId = stateWithShot.shots[0].id;
    const next = updateShot(stateWithShot, shotId, { status: "in-progress", currentDeliveryVersion: "v001" });

    expect(next.shots[0].status).toBe("in-progress");
    expect(next.shots[0].currentDeliveryVersion).toBe("v001");
  });

  it("updates an existing task", () => {
    const state: ChichiState = {
      ...baseState,
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          shotId: "shot-1",
          title: "기존 액션",
          type: "comp-work",
          dueDate: "2026-07-05",
          priority: 3,
          status: "in-progress"
        }
      ]
    };

    const next = updateTask(state, "task-1", { title: "수정된 액션", status: "review" });

    expect(next.tasks[0].title).toBe("수정된 액션");
    expect(next.tasks[0].status).toBe("review");
  });

  it("updates existing feedback", () => {
    const state: ChichiState = {
      ...baseState,
      feedback: [
        {
          id: "feedback-1",
          projectId: "project-1",
          shotId: "shot-1",
          originalSource: "kakaotalk-paste",
          originalText: "SH010 밝게",
          instruction: "밝게",
          confidence: 0.9,
          status: "new",
          relation: "new-request"
        }
      ]
    };

    const next = updateFeedback(state, "feedback-1", { instruction: "밝기 낮추기", status: "in-progress" });

    expect(next.feedback[0].instruction).toBe("밝기 낮추기");
    expect(next.feedback[0].status).toBe("in-progress");
  });

  it("adds feedback from chat intake", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const next = addFeedback(state, {
      projectId,
      originalSource: "chichi-chat",
      originalText: "SHOW_A SH010 밝기 낮추기",
      instruction: "SH010 밝기 낮추기"
    });

    expect(next.feedback[0]).toMatchObject({
      projectId,
      originalSource: "chichi-chat",
      instruction: "SH010 밝기 낮추기",
      attachments: [],
      status: "new",
      relation: "new-request"
    });
  });

  it("stores feedback image attachments", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const next = addFeedback(state, {
      projectId,
      originalSource: "chichi-chat",
      originalText: "이미지 첨부 피드백",
      instruction: "이미지 첨부 피드백",
      attachments: [{ id: "attachment-1", fileName: "SHOW_A_SH010.png", mimeType: "image/png", dataUrl: "data:image/png;base64,test" }]
    });

    expect(next.feedback[0].attachments).toHaveLength(1);
    expect(next.feedback[0].attachments?.[0].fileName).toBe("SHOW_A_SH010.png");
  });

  it("adds and updates finance entries", () => {
    const state = addProject(baseState, {
      name: "SHOW_A",
      client: "Client X",
      startDate: "2026-07-04",
      deliveryDate: "2026-07-10"
    });
    const projectId = state.projects[0].id;
    const withEntry = addFinanceEntry(state, {
      projectId,
      label: "AI 비용",
      kind: "ai-cost",
      amount: 30000,
      date: "2026-07-04"
    });
    const entryId = withEntry.finance[0].id;
    const updated = updateFinanceEntry(withEntry, entryId, { amount: 50000 });
    const removed = removeFinanceEntry(updated, entryId);

    expect(withEntry.finance[0]).toMatchObject({ projectId, label: "AI 비용", kind: "ai-cost", amount: 30000 });
    expect(updated.finance[0].amount).toBe(50000);
    expect(removed.finance).toHaveLength(0);
  });
});
