import { describe, expect, it } from "vitest";
import { processChatIntake } from "./chatIntakeProcessor";
import type { ChichiState } from "./types";

function stateWithProjectAndShot(): ChichiState {
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

describe("natural chat commands", () => {
  it("links casual feedback to the mentioned non-SH shot code", async () => {
    const result = await processChatIntake(stateWithProjectAndShot(), "C0014 밝은 부분 조금 눌러주세요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    expect(result.state.feedback).toHaveLength(1);
    expect(result.state.feedback[0]).toMatchObject({
      projectId: "project-bnd",
      shotId: "shot-c0014",
      instruction: "밝은 부분 조금 눌러주세요"
    });
  });

  it("updates different source checklist states from one casual sentence", async () => {
    const result = await processChatIntake(stateWithProjectAndShot(), "C0014 원본 플레이트 확인했고 FX는 문제 있어요. 로토는 미전달이에요", {
      now: new Date("2026-07-20T00:00:00.000Z"),
      contextProjectId: "project-bnd"
    });

    const shot = result.state.shots[0];
    expect(shot.sourceChecklist.find((item) => item.key === "plate-original")).toMatchObject({ status: "confirmed" });
    expect(shot.sourceChecklist.find((item) => item.key === "fx")).toMatchObject({ status: "issue" });
    expect(shot.sourceChecklist.find((item) => item.key === "roto")).toMatchObject({ status: "pending" });
    expect(result.state.feedback).toHaveLength(0);
  });

  it("records received project total from a short finance command", async () => {
    const result = await processChatIntake(stateWithProjectAndShot(), "BND_BBB 총액 300만원 받았어요", {
      now: new Date("2026-07-20T00:00:00.000Z")
    });

    expect(result.state.finance).toHaveLength(1);
    expect(result.state.finance[0]).toMatchObject({
      projectId: "project-bnd",
      label: "총액",
      kind: "income",
      amount: 3000000
    });
  });

  it("applies mixed schedule, checklist, feedback, and finance instructions from one message", async () => {
    const result = await processChatIntake(
      stateWithProjectAndShot(),
      "BND_BBB C0014 마감일 7월 25일이고 FX는 문제 있어요. 밝은 부분 조금 눌러주세요. 총액 300만원 받았어요",
      {
        now: new Date("2026-07-20T00:00:00.000Z")
      }
    );

    const shot = result.state.shots[0];
    expect(shot.dueDate).toBe("2026-07-25");
    expect(shot.sourceChecklist.find((item) => item.key === "fx")).toMatchObject({ status: "issue" });
    expect(result.state.sources).toHaveLength(0);
    expect(result.state.feedback).toHaveLength(1);
    expect(result.state.feedback[0]).toMatchObject({
      shotId: "shot-c0014",
      instruction: "밝은 부분 조금 눌러주세요"
    });
    expect(result.state.finance[0]).toMatchObject({ label: "총액", amount: 3000000 });
  });

  it("returns a readable Korean summary with the changed shot and finance details", async () => {
    const result = await processChatIntake(
      stateWithProjectAndShot(),
      "BND_BBB C0014 마감일 7월 25일이고 FX는 문제 있어요. 밝은 부분 조금 눌러주세요. 총액 300만원 받았어요",
      {
        now: new Date("2026-07-20T00:00:00.000Z")
      }
    );

    expect(result.message).toContain("BND_BBB 정리 완료");
    expect(result.message).toContain("C0014 마감 2026-07-25");
    expect(result.message).toContain("C0014 FX 문제");
    expect(result.message).toContain("C0014 피드백 1개");
    expect(result.message).toContain("총액 3,000,000원");
    expect(result.message).not.toMatch(/[�]/);
  });
});
