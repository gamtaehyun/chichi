import { describe, expect, it } from "vitest";
import { buildReviewQueue } from "./reviewQueue";
import { resolveReviewQueueItem } from "./stateActions";
import type { ChichiState } from "./types";

const state: ChichiState = {
  projects: [
    {
      id: "p1",
      name: "FILM_A",
      client: "Client A",
      status: "in-progress",
      startDate: "2026-07-01",
      deliveryDate: "2026-07-08",
      deliveryMilestones: [{ id: "final", label: "최종 납품일", date: "2026-07-08", kind: "final" }],
      driveFolders: [],
      dropboxFolders: [],
      feedbackLinks: [],
      kakaoFeedbackNotes: ""
    }
  ],
  shots: [
    {
      id: "s1",
      projectId: "p1",
      code: "SH010",
      status: "in-progress",
      priority: 3,
      dueDate: "2026-07-04",
      deliveryDate: "2026-07-05",
      sourceChecklist: [
        { key: "plate-original", status: "confirmed" },
        { key: "plate-beauty", status: "issue", note: "뷰티 final 여부 확인 필요" },
        { key: "3d", status: "pending" },
        { key: "fx", status: "pending" },
        { key: "roto", status: "pending" }
      ]
    }
  ],
  sources: [
    {
      id: "src1",
      projectId: "p1",
      shotId: "s1",
      fileName: "SH010_plate_beauty_final.exr",
      pathOrUrl: "drive://FILM_A/SH010/plate/SH010_plate_beauty_final.exr",
      provider: "google-drive",
      sourceType: "plate",
      modifiedAt: "2026-07-04T09:00:00+09:00",
      firstSeenAt: "2026-07-04T09:00:00+09:00",
      latestStatus: "needs-confirmation",
      plateStatus: "final",
      changeStatus: "new"
    }
  ],
  feedback: [
    {
      id: "fb1",
      projectId: "p1",
      originalSource: "chichi-chat",
      originalText: "전체적으로 밝게",
      instruction: "전체적으로 밝게",
      confidence: 0.55,
      status: "new",
      relation: "new-request"
    }
  ],
  tasks: [
    {
      id: "t1",
      projectId: "p1",
      shotId: "s1",
      title: "로토 확인",
      type: "source-check",
      dueDate: "2026-07-04",
      priority: 5,
      status: "blocked",
      blockerReason: "로토 추가 전달 여부 확인 필요"
    }
  ],
  finance: []
};

describe("buildReviewQueue", () => {
  it("collects sources, checklist issues, feedback, and blocked tasks", () => {
    const result = buildReviewQueue(state);

    expect(result.map((item) => item.kind)).toEqual(["task", "checklist", "source", "feedback"]);
    expect(result[0]).toMatchObject({ severity: "high", title: "SH010 막힌 작업" });
    expect(result.some((item) => item.title === "샷 미연결 피드백")).toBe(true);
  });

  it("removes resolved checklist and feedback items from the queue", () => {
    const withoutChecklistIssue = resolveReviewQueueItem(state, "checklist-s1-plate-beauty", "confirm");
    const withoutFeedback = resolveReviewQueueItem(withoutChecklistIssue, "feedback-fb1", "done");
    const result = buildReviewQueue(withoutFeedback);

    expect(result.some((item) => item.id === "checklist-s1-plate-beauty")).toBe(false);
    expect(result.some((item) => item.id === "feedback-fb1")).toBe(false);
  });

  it("resolves source and blocked task queue items", () => {
    const withoutSourceIssue = resolveReviewQueueItem(state, "source-src1", "confirm");
    const withoutTask = resolveReviewQueueItem(withoutSourceIssue, "task-t1", "in-progress");
    const result = buildReviewQueue(withoutTask);

    expect(result.some((item) => item.id === "source-src1")).toBe(false);
    expect(result.some((item) => item.id === "task-t1")).toBe(false);
  });
});
