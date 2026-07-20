import { describe, expect, it } from "vitest";
import { createChatHistoryEntry, restoreChatHistoryEntry } from "./chatHistory";
import type { ChichiState } from "./types";

function stateWithProjectName(name: string): ChichiState {
  return {
    projects: [
      {
        id: "project-1",
        name,
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
}

describe("chatHistory", () => {
  it("keeps the previous state so a chat intake can be undone", () => {
    const previousState = stateWithProjectName("BND_OLD");
    const nextState = stateWithProjectName("BND_NEW");
    const entry = createChatHistoryEntry({
      message: "BND_NEW 정리 완료",
      previousState,
      nextState
    });

    expect(entry.canUndo).toBe(true);
    expect(restoreChatHistoryEntry(entry)).toEqual(previousState);
  });
});
