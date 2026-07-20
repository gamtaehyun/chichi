import { buildReviewQueue, type ReviewQueueItem } from "../domain/reviewQueue";
import { resolveReviewQueueItem, type ReviewQueueAction } from "../domain/stateActions";
import type { ChichiState } from "../domain/types";

interface Props {
  state: ChichiState;
  queueState?: ChichiState;
  onStateChange: (state: ChichiState) => void;
}

const kindLabel: Record<ReviewQueueItem["kind"], string> = {
  source: "소스",
  checklist: "체크",
  feedback: "피드백",
  task: "작업"
};

const severityLabel: Record<ReviewQueueItem["severity"], string> = {
  high: "높음",
  medium: "중간",
  low: "낮음"
};

function actionsForItem(item: ReviewQueueItem): Array<{ label: string; action: ReviewQueueAction }> {
  if (item.kind === "checklist") {
    return [
      { label: "확인 완료", action: "confirm" },
      { label: "해당 없음", action: "not-needed" }
    ];
  }

  if (item.kind === "source") {
    return [
      { label: "최신 확정", action: "confirm" },
      { label: "이전 버전", action: "superseded" }
    ];
  }

  if (item.kind === "feedback") {
    return [
      { label: "완료", action: "done" },
      { label: "계속 확인", action: "keep-issue" }
    ];
  }

  return [
    { label: "진행", action: "in-progress" },
    { label: "완료", action: "done" }
  ];
}

export function ReviewQueue({ state, queueState = state, onStateChange }: Props) {
  const queue = buildReviewQueue(queueState);

  return (
    <section className="panel reviewQueuePanel">
      <div className="sectionHeader compactHeader">
        <h2>확인 필요 큐</h2>
        <span>{queue.length}개</span>
      </div>
      {queue.length > 0 ? (
        <div className="reviewQueueList">
          {queue.slice(0, 8).map((item) => (
            <article className={`reviewQueueItem severity-${item.severity}`} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span>
                {kindLabel[item.kind]} · {severityLabel[item.severity]}
              </span>
              <div className="reviewQueueActions">
                {actionsForItem(item).map((action) => (
                  <button key={action.action} onClick={() => onStateChange(resolveReviewQueueItem(state, item.id, action.action))}>
                    {action.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="emptyState">지금 바로 확인해야 할 항목은 없어요.</p>
      )}
    </section>
  );
}
