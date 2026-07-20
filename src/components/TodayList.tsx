import type { Project, Shot, TaskItem } from "../domain/types";
import { prioritizeToday } from "../domain/taskPrioritizer";

interface Props {
  tasks: TaskItem[];
  projects: Project[];
  shots: Shot[];
}

export function TodayList({ tasks, projects, shots }: Props) {
  const today = "2026-07-03";
  const prioritized = prioritizeToday(tasks, today).slice(0, 6);

  return (
    <section className="panel">
      <h2>오늘 할 일</h2>
      <div className="list">
        {prioritized.map((task) => {
          const project = projects.find((item) => item.id === task.projectId);
          const shot = shots.find((item) => item.id === task.shotId);

          return (
            <article className="row" key={task.id}>
              <strong>{task.title}</strong>
              <span>
                {project?.name} {shot ? `/ ${shot.code}` : ""}
              </span>
              {task.blockerReason ? <em>{task.blockerReason}</em> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
