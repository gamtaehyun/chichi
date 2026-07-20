import { describe, expect, it } from "vitest";
import type { TaskItem } from "./types";
import { prioritizeToday } from "./taskPrioritizer";

describe("prioritizeToday", () => {
  it("sorts due-today blocked tasks before later low-risk tasks", () => {
    const tasks: TaskItem[] = [
      { id: "later", projectId: "p1", title: "내일 납품", type: "delivery", dueDate: "2026-07-04", priority: 2, status: "in-progress" },
      { id: "today", projectId: "p2", title: "SH030 소스 확인", type: "source-check", dueDate: "2026-07-03", priority: 4, status: "blocked", blockerReason: "FX 최신 여부 확인 필요" }
    ];

    expect(prioritizeToday(tasks, "2026-07-03")[0].id).toBe("today");
  });
});
