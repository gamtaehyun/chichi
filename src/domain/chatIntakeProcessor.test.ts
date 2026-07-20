import { describe, expect, it } from "vitest";
import { processChatIntake } from "./chatIntakeProcessor";
import type { ChichiState } from "./types";

const baseState: ChichiState = {
  projects: [
    {
      id: "project-ad-b",
      name: "AD_B",
      client: "Client B",
      status: "in-progress",
      startDate: "2026-07-02",
      deliveryDate: "2026-07-05",
      deliveryMilestones: [{ id: "ad-b-final", label: "최종 납품일", date: "2026-07-05", kind: "final" }],
      driveFolders: [],
      dropboxFolders: [],
      feedbackLinks: ["sheets://AD_B_shotlist"],
      kakaoFeedbackNotes: ""
    }
  ],
  shots: [],
  sources: [],
  feedback: [],
  tasks: [],
  finance: []
};

const sheetMessage = `이건 새로운 프로젝트 BND_BBB이라는 프로젝트예요.
[https://docs.google.com/spreadsheets/d/1hknu2TWYAbcLjngNQ0IJ5jjDZbKPokchseHgYeDbMH4/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1hknu2TWYAbcLjngNQ0IJ5jjDZbKPokchseHgYeDbMH4/edit?usp=sharing)
샷 리스트 드립니다. 내용 정리해주세요.`;

describe("chatIntakeProcessor", () => {
  it("creates a new project from a new-project sheet message instead of attaching it to an existing project", async () => {
    const result = await processChatIntake(baseState, sheetMessage, {
      now: new Date("2026-07-19T00:00:00.000Z"),
      readCsv: async () => undefined
    });
    const createdProject = result.state.projects.find((project) => project.name === "BND_BBB");
    const existingProject = baseState.projects.find((project) => project.name === "AD_B");

    expect(createdProject).toBeDefined();
    expect(createdProject?.feedbackLinks).toEqual(["https://docs.google.com/spreadsheets/d/1hknu2TWYAbcLjngNQ0IJ5jjDZbKPokchseHgYeDbMH4/edit?usp=sharing"]);
    expect(result.message).toContain("BND_BBB");
    expect(result.message).toContain("새 프로젝트 1개");
    expect(result.message).toContain("샷 0개");
    expect(result.message).toContain("시트에서 샷을 읽지 못했어요");
    expect(result.state.projects.find((project) => project.id === existingProject?.id)?.feedbackLinks).toEqual(existingProject?.feedbackLinks);
  });

  it("creates shots and shot work tasks for the new project when the sheet CSV can be read", async () => {
    const result = await processChatIntake(baseState, sheetMessage, {
      now: new Date("2026-07-19T00:00:00.000Z"),
      readCsv: async () => `Scene,Shot No.,PREVIEW,CUT NAME (SRC NAME),,WORK
,,,
,1,,C0014,,"stair extension, sky comp, paper CG"
,2,,C0015,,"blue eye CG, sky comp"`
    });
    const createdProject = result.state.projects.find((project) => project.name === "BND_BBB");
    const createdShots = result.state.shots.filter((shot) => shot.projectId === createdProject?.id);
    const createdTasks = result.state.tasks.filter((task) => task.projectId === createdProject?.id);

    expect(createdShots.map((shot) => shot.code)).toEqual(["C0014", "C0015"]);
    expect(createdTasks.map((task) => task.title)).toEqual(["stair extension, sky comp, paper CG", "blue eye CG, sky comp"]);
    expect(result.message).toContain("샷 2개");
    expect(result.message).toContain("컷별 작업 2개");
    expect(result.message).not.toContain("시트에서 샷을 읽지 못했어요");
  });

  it("does not fall back to an existing project when the user says it is a new project but omits the code", async () => {
    const result = await processChatIntake(baseState, "이건 새로운 프로젝트예요. 샷 리스트 드립니다.", {
      now: new Date("2026-07-19T00:00:00.000Z")
    });

    expect(result.state).toBe(baseState);
    expect(result.message).toContain("새 프로젝트 이름을 찾지 못했어요");
  });

  it("creates shots and tasks from Google Slides text where TC codes are shot names", async () => {
    const result = await processChatIntake(
      baseState,
      `이건 새로운 프로젝트 LSF_VCR 프로젝트예요.
https://docs.google.com/presentation/d/1slideABC/edit
슬라이드 내용 정리해주세요.`,
      {
        now: new Date("2026-07-20T00:00:00.000Z"),
        readPresentationText: async () => `LSF-VCR 1,2,3
공중에 뜬 채원과 장기
공중에 뜬 채원과 장기말들
초록 박스 친 간판 텍스트 지워주세요
01:11
태현
김태현
0630_LSF2_TC010915`
      }
    );
    const createdProject = result.state.projects.find((project) => project.name === "LSF_VCR");
    const createdShots = result.state.shots.filter((shot) => shot.projectId === createdProject?.id);
    const createdTasks = result.state.tasks.filter((task) => task.projectId === createdProject?.id);

    expect(createdShots.map((shot) => shot.code)).toEqual(["0630_LSF2_TC010915"]);
    expect(createdTasks.map((task) => task.title)).toEqual(["공중에 뜬 채원과 장기 / 공중에 뜬 채원과 장기말들 초록 박스 친 간판 텍스트 지워주세요"]);
    expect(result.message).toContain("샷 1개");
    expect(result.message).toContain("슬라이드 읽기 1개");
  });

  it("updates an existing shot due date from natural Korean chat text", async () => {
    const stateWithShot: ChichiState = {
      ...baseState,
      projects: [
        {
          id: "project-bnd",
          name: "BND_BBB",
          client: "",
          status: "in-progress",
          startDate: "2026-07-19",
          deliveryDate: "2026-07-30",
          deliveryMilestones: [{ id: "final", label: "최종 납품일", date: "2026-07-30", kind: "final" }],
          driveFolders: [],
          dropboxFolders: [],
          feedbackLinks: [],
          kakaoFeedbackNotes: ""
        }
      ],
      shots: [
        {
          id: "shot-c0014",
          projectId: "project-bnd",
          code: "C0014",
          status: "not-started",
          priority: 3,
          dueDate: "2026-07-19",
          deliveryDate: "2026-07-19",
          sourceChecklist: []
        }
      ]
    };

    const result = await processChatIntake(stateWithShot, "C0014번 마감일 7월 25일이에요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.shots[0].dueDate).toBe("2026-07-25");
    expect(result.state.shots[0].deliveryDate).toBe("2026-07-25");
    expect(result.message).toContain("마감 변경 1개");
  });
});
