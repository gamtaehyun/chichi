import { describe, expect, it } from "vitest";
import { processChatIntake } from "./chatIntakeProcessor";
import type { ChichiState } from "./types";

function stateWithProject(): ChichiState {
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

describe("project delivery command routing", () => {
  it("updates the final project delivery date from a natural Korean command", async () => {
    const result = await processChatIntake(stateWithProject(), "BND_BBB 최종 납품일 8월 7일로 바꿔줘", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.projects[0].deliveryDate).toBe("2026-08-07");
    expect(result.state.projects[0].deliveryMilestones.find((item) => item.kind === "final")?.date).toBe("2026-08-07");
    expect(result.state.shots[0].dueDate).toBe("2026-07-19");
    expect(result.state.feedback).toHaveLength(0);
  });
});
