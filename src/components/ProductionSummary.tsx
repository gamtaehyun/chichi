import type { ChichiState } from "../domain/types";

interface Props {
  state: ChichiState;
}

export function ProductionSummary({ state }: Props) {
  const activeShots = state.shots.filter((shot) => shot.status !== "done").length;
  const blockedShots = state.shots.filter((shot) => shot.status === "blocked").length;
  const changedSources = state.sources.filter((source) => source.changeStatus !== "unchanged").length;
  const needsConfirmation = state.sources.filter((source) => source.latestStatus === "needs-confirmation").length;

  return (
    <section className="summaryStrip" aria-label="작업 요약">
      <div>
        <span>진행 샷</span>
        <strong>{activeShots}</strong>
      </div>
      <div>
        <span>위험 샷</span>
        <strong>{blockedShots}</strong>
      </div>
      <div>
        <span>소스 변경</span>
        <strong>{changedSources}</strong>
      </div>
      <div>
        <span>확인 필요</span>
        <strong>{needsConfirmation}</strong>
      </div>
    </section>
  );
}
