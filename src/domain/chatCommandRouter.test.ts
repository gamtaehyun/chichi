import { describe, expect, it } from "vitest";
import { processChatIntake } from "./chatIntakeProcessor";
import type { ChichiState } from "./types";

function stateWithShot(): ChichiState {
  return {
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
    ],
    sources: [],
    feedback: [],
    tasks: [],
    finance: []
  };
}

describe("chat command routing", () => {
  it("updates due date without creating generic feedback", async () => {
    const result = await processChatIntake(stateWithShot(), "C0014번 마감일 7월 25일이에요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.shots[0].dueDate).toBe("2026-07-25");
    expect(result.state.shots[0].deliveryDate).toBe("2026-07-25");
    expect(result.state.feedback).toHaveLength(0);
  });

  it("updates priority for teaser or urgent shot commands", async () => {
    const result = await processChatIntake(stateWithShot(), "C0014 티저컷이라 우선순위 높여줘", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.shots[0].priority).toBe(5);
    expect(result.state.feedback).toHaveLength(0);
  });

  it("updates shot status for natural status commands", async () => {
    const result = await processChatIntake(stateWithShot(), "C0014 작업중이에요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.shots[0].status).toBe("in-progress");
    expect(result.state.feedback).toHaveLength(0);
  });

  it("routes source intake to the mentioned shot", async () => {
    const result = await processChatIntake(stateWithShot(), "C0014 FX v003 소스 들어왔어요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.sources[0]).toMatchObject({
      projectId: "project-bnd",
      shotId: "shot-c0014",
      sourceType: "fx",
      version: 3
    });
    expect(result.state.feedback).toHaveLength(0);
  });
});
