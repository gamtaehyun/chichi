import type { TaskItem } from "./types";

function scoreTask(task: TaskItem, today: string): number {
  const dueDelta = Math.ceil((new Date(task.dueDate).getTime() - new Date(today).getTime()) / 86400000);
  const dueScore = dueDelta <= 0 ? 100 : Math.max(0, 40 - dueDelta * 10);
  const blockerScore = task.status === "blocked" ? 25 : 0;
  return dueScore + blockerScore + task.priority * 10;
}

export function prioritizeToday(tasks: TaskItem[], today: string): TaskItem[] {
  return [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => scoreTask(b, today) - scoreTask(a, today));
}
