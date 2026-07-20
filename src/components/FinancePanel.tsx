import { useState } from "react";
import { calculateProjectProfit } from "../domain/finance";
import { addFinanceEntry, removeFinanceEntry, updateFinanceEntry } from "../domain/stateActions";
import type { ChichiState, FinanceEntry } from "../domain/types";

interface Props {
  state: ChichiState;
  onStateChange: (state: ChichiState) => void;
}

const financeKindLabel: Record<FinanceEntry["kind"], string> = {
  income: "총액",
  unpaid: "미수금",
  "freelancer-cost": "외주비",
  "contractor-cost": "사업자 비용",
  "ai-cost": "AI 비용",
  "source-purchase": "소스 구매",
  "other-cost": "기타 비용"
};

const financeKinds = Object.entries(financeKindLabel) as Array<[FinanceEntry["kind"], string]>;
const quickFinanceKinds = financeKinds.filter(([value]) => value !== "contractor-cost");

type FinanceDraft = {
  label: string;
  kind: FinanceEntry["kind"];
  amount: string;
};

const defaultDraft: FinanceDraft = {
  label: "",
  kind: "income",
  amount: ""
};

function today(): string {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function formatWon(value: number): string {
  return `${value.toLocaleString()}원`;
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function FinancePanel({ state, onStateChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, FinanceDraft>>({});

  const projectSummaries = state.projects.map((project) => ({
    project,
    profit: calculateProjectProfit(state.finance, project.id),
    entries: state.finance.filter((entry) => entry.projectId === project.id)
  }));
  const total = projectSummaries.reduce(
    (sum, item) => ({
      contracted: sum.contracted + item.profit.contracted,
      received: sum.received + item.profit.received,
      unpaid: sum.unpaid + item.profit.unpaid,
      costs: sum.costs + item.profit.costs,
      expectedProfit: sum.expectedProfit + item.profit.expectedProfit
    }),
    { contracted: 0, received: 0, unpaid: 0, costs: 0, expectedProfit: 0 }
  );

  function getDraft(projectId: string) {
    return drafts[projectId] ?? defaultDraft;
  }

  function updateDraft(projectId: string, patch: Partial<FinanceDraft>) {
    setDrafts((current) => ({
      ...current,
      [projectId]: {
        ...defaultDraft,
        ...current[projectId],
        ...patch
      }
    }));
  }

  function handleAddEntry(projectId: string) {
    const draft = getDraft(projectId);
    const amount = parseAmount(draft.amount);
    if (amount <= 0) return;

    onStateChange(
      addFinanceEntry(state, {
        projectId,
        label: draft.label.trim() || financeKindLabel[draft.kind],
        kind: draft.kind,
        amount,
        date: today()
      })
    );
    setDrafts((current) => ({
      ...current,
      [projectId]: { ...defaultDraft, kind: draft.kind }
    }));
  }

  return (
    <section className="financePage">
      <div className="financeOverview">
        <div>
          <span>총 계약</span>
          <strong>{formatWon(total.contracted)}</strong>
        </div>
        <div>
          <span>총액</span>
          <strong>{formatWon(total.received)}</strong>
        </div>
        <div>
          <span>미수금</span>
          <strong>{formatWon(total.unpaid)}</strong>
        </div>
        <div>
          <span>총 비용</span>
          <strong>{formatWon(total.costs)}</strong>
        </div>
        <div>
          <span>예상 수익</span>
          <strong>{formatWon(total.expectedProfit)}</strong>
        </div>
      </div>

      <section className="financeGrid">
        {projectSummaries.map(({ project, profit, entries }) => {
          const draft = getDraft(project.id);

          return (
            <article className="panel financeProjectCard" key={project.id}>
              <div className="sectionHeader">
                <h2>{project.name}</h2>
                <span>수익률 {Math.round(profit.profitRate * 100)}%</span>
              </div>

              <dl className="financeStats financeStatsCompact">
                <div>
                  <dt>총액</dt>
                  <dd>{formatWon(profit.received)}</dd>
                </div>
                <div>
                  <dt>미수금</dt>
                  <dd>{formatWon(profit.unpaid)}</dd>
                </div>
                <div>
                  <dt>외부 비용</dt>
                  <dd>{formatWon(profit.costs)}</dd>
                </div>
                <div>
                  <dt>예상 수익</dt>
                  <dd>{formatWon(profit.expectedProfit)}</dd>
                </div>
              </dl>

              <div className="financeBreakdown">
                <span>외주 {formatWon(profit.freelancerCosts)}</span>
                <span>AI {formatWon(profit.aiCosts)}</span>
                <span>소스 {formatWon(profit.sourcePurchaseCosts)}</span>
                <span>기타 {formatWon(profit.otherCosts)}</span>
              </div>

              <div className="financeQuickInput">
                <div className="financeQuickKinds" aria-label={`${project.name} 정산 종류`}>
                  {quickFinanceKinds.map(([value, label]) => (
                    <button
                      className={`financeKindButton ${draft.kind === value ? "active" : ""}`}
                      key={value}
                      onClick={() => updateDraft(project.id, { kind: value })}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="financeEntryAddRow financeEntryQuickRow">
                  <input
                    aria-label={`${project.name} 정산 금액`}
                    inputMode="numeric"
                    placeholder="금액"
                    value={draft.amount}
                    onChange={(event) => updateDraft(project.id, { amount: event.target.value })}
                  />
                  <input
                    aria-label={`${project.name} 정산 메모`}
                    placeholder="메모 선택"
                    value={draft.label}
                    onChange={(event) => updateDraft(project.id, { label: event.target.value })}
                  />
                  <button onClick={() => handleAddEntry(project.id)} type="button">
                    추가
                  </button>
                </div>
              </div>

              <details className="financeEntryListPanel">
                <summary>입력 내역 {entries.length}개</summary>
                <div className="financeEntryList">
                  {entries.map((entry) => (
                    <div className="financeEntryRow" key={entry.id}>
                      <input aria-label={`${entry.label} 항목명`} value={entry.label} onChange={(event) => onStateChange(updateFinanceEntry(state, entry.id, { label: event.target.value }))} />
                      <select value={entry.kind} onChange={(event) => onStateChange(updateFinanceEntry(state, entry.id, { kind: event.target.value as FinanceEntry["kind"] }))}>
                        {financeKinds.map(([value, name]) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input aria-label={`${entry.label} 금액`} type="number" value={entry.amount} onChange={(event) => onStateChange(updateFinanceEntry(state, entry.id, { amount: Number(event.target.value) }))} />
                      <input aria-label={`${entry.label} 날짜`} type="date" value={entry.date} onChange={(event) => onStateChange(updateFinanceEntry(state, entry.id, { date: event.target.value }))} />
                      <button className="financeDeleteButton" onClick={() => onStateChange(removeFinanceEntry(state, entry.id))} type="button">
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          );
        })}
      </section>
    </section>
  );
}
