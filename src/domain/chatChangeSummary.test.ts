import { describe, expect, it } from "vitest";
import { summarizeChatChange } from "./chatChangeSummary";
import type { ChichiState } from "./types";

const emptyState: ChichiState = {
  projects: [
    {
      id: "project-1",
      name: "BND_BBB",
      client: "",
      status: "in-progress",
      startDate: "2026-07-20",
      deliveryDate: "2026-07-30",
      deliveryMilestones: [{ id: "final", label: "최종 납품일", date: "2026-07-30", kind: "final" }],
      driveFolders: [],
      dropboxFolders: [],
      feedbackLinks: [],
      kakaoFeedbackNotes: ""
    }
  ],
  shots: [],
  sources: [],
  feedback: [],
  tasks: [],
  finance: []
};

describe("summarizeChatChange", () => {
  it("summarizes newly added shot, feedback, and finance entries", () => {
    const nextState: ChichiState = {
      ...emptyState,
      shots: [
        {
          id: "shot-1",
          projectId: "project-1",
          code: "C0014",
          status: "not-started",
          priority: 3,
          dueDate: "2026-07-25",
          deliveryDate: "2026-07-25",
          sourceChecklist: []
        }
      ],
      feedback: [
        {
          id: "feedback-1",
          projectId: "project-1",
          shotId: "shot-1",
          originalSource: "chat",
          originalText: "밝은 부분 조금 눌러주세요.",
          instruction: "밝은 부분 조금 눌러주세요.",
          confidence: 0.8,
          status: "new",
          relation: "new-request"
        }
      ],
      finance: [
        {
          id: "finance-1",
          projectId: "project-1",
          label: "총액",
          kind: "income",
          amount: 3000000,
          date: "2026-07-20"
        }
      ]
    };

    expect(summarizeChatChange(emptyState, nextState)).toEqual(["샷 1개 추가", "피드백 1개 추가", "정산 1개 추가"]);
  });
});
