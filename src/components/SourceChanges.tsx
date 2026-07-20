import type { SourceFile } from "../domain/types";

interface Props {
  sources: SourceFile[];
}

const statusLabel: Record<SourceFile["latestStatus"], string> = {
  "confirmed-latest": "최신 확정",
  "likely-latest": "최신 추정",
  superseded: "이전 버전",
  "needs-confirmation": "확인 필요"
};

const sourceTypeLabel: Record<SourceFile["sourceType"], string> = {
  plate: "플레이트",
  "3d": "3D",
  fx: "FX",
  roto: "로토",
  reference: "레퍼런스",
  "feedback-media": "피드백",
  delivery: "납품본",
  other: "기타"
};

export function SourceChanges({ sources }: Props) {
  return (
    <section className="panel">
      <h2>새 소스 / 변경 소스</h2>
      <div className="list">
        {sources
          .filter((source) => source.changeStatus !== "unchanged")
          .map((source) => (
            <article className="row" key={source.id}>
              <strong>{source.fileName}</strong>
              <span>
                {sourceTypeLabel[source.sourceType]} / {source.provider}
              </span>
              <em>{statusLabel[source.latestStatus]}</em>
            </article>
          ))}
      </div>
    </section>
  );
}
