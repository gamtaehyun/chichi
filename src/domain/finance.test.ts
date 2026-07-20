import { describe, expect, it } from "vitest";
import type { FinanceEntry } from "./types";
import { calculateProjectProfit } from "./finance";

describe("calculateProjectProfit", () => {
  it("calculates received, unpaid, costs, and profit", () => {
    const entries: FinanceEntry[] = [
      { id: "income", projectId: "p1", label: "계약금", kind: "income", amount: 3000000, date: "2026-07-01" },
      { id: "unpaid", projectId: "p1", label: "잔금", kind: "unpaid", amount: 1000000, date: "2026-07-31" },
      { id: "freelancer", projectId: "p1", label: "로토 외주", kind: "freelancer-cost", amount: 500000, date: "2026-07-02" },
      { id: "contractor", projectId: "p1", label: "사업자 외주", kind: "contractor-cost", amount: 700000, date: "2026-07-02" },
      { id: "ai", projectId: "p1", label: "AI 도구", kind: "ai-cost", amount: 30000, date: "2026-07-02" },
      { id: "source", projectId: "p1", label: "소스 구매", kind: "source-purchase", amount: 200000, date: "2026-07-02" }
    ];

    expect(calculateProjectProfit(entries, "p1")).toEqual({
      contracted: 4000000,
      received: 3000000,
      unpaid: 1000000,
      costs: 1430000,
      freelancerCosts: 500000,
      contractorCosts: 700000,
      aiCosts: 30000,
      sourcePurchaseCosts: 200000,
      otherCosts: 0,
      actualProfit: 1570000,
      expectedProfit: 2570000,
      profitRate: 0.6425
    });
  });
});
