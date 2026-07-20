import { describe, expect, it } from "vitest";
import { processChatIntake } from "./chatIntakeProcessor";
import type { ChichiState } from "./types";

function baseState(): ChichiState {
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
        sourceChecklist: [
          { key: "plate-original", status: "pending" },
          { key: "plate-beauty", status: "pending" },
          { key: "3d", status: "pending" },
          { key: "fx", status: "pending" },
          { key: "roto", status: "pending" }
        ]
      }
    ],
    sources: [],
    feedback: [],
    tasks: [],
    finance: []
  };
}

describe("chat commands that update sheets directly", () => {
  it("updates shot assignee from a natural outsourcing command", async () => {
    const result = await processChatIntake(baseState(), "BND_BBB C0014는 김철수 외주로 보내줘", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.shots[0].assignedTo).toBe("김철수");
    expect(result.state.feedback).toHaveLength(0);
  });

  it("updates shot assignee to self", async () => {
    const result = await processChatIntake(baseState(), "BND_BBB C0014는 내가 할게", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.shots[0].assignedTo).toBe("나");
    expect(result.state.feedback).toHaveLength(0);
  });

  it("confirms source checklist items from natural source check text", async () => {
    const result = await processChatIntake(baseState(), "BND_BBB C0014 뷰티 최종본 확인했고 FX 최신 버전도 확인 완료", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    const checklist = result.state.shots[0].sourceChecklist;
    expect(checklist.find((item) => item.key === "plate-beauty")?.status).toBe("confirmed");
    expect(checklist.find((item) => item.key === "fx")?.status).toBe("confirmed");
    expect(result.state.feedback).toHaveLength(0);
  });

  it("adds finance entries from natural Korean money commands", async () => {
    const result = await processChatIntake(baseState(), "BND_BBB 계약금 300만원 받았어", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.finance[0]).toMatchObject({
      projectId: "project-bnd",
      label: "계약금",
      kind: "income",
      amount: 3000000,
      date: "2026-07-20"
    });
    expect(result.state.feedback).toHaveLength(0);
  });

  it("updates project status from natural project lifecycle commands", async () => {
    const result = await processChatIntake(baseState(), "BND_BBB 작업 종료됐어요", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.projects[0].status).toBe("done");
    expect(result.state.feedback).toHaveLength(0);
  });
});
