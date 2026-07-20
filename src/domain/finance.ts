import type { FinanceEntry } from "./types";

export interface ProjectProfit {
  contracted: number;
  received: number;
  unpaid: number;
  costs: number;
  freelancerCosts: number;
  contractorCosts: number;
  aiCosts: number;
  sourcePurchaseCosts: number;
  otherCosts: number;
  actualProfit: number;
  expectedProfit: number;
  profitRate: number;
}

const costKinds = new Set<FinanceEntry["kind"]>([
  "freelancer-cost",
  "contractor-cost",
  "ai-cost",
  "source-purchase",
  "other-cost"
]);

export function calculateProjectProfit(entries: FinanceEntry[], projectId: string): ProjectProfit {
  const projectEntries = entries.filter((entry) => entry.projectId === projectId);
  const received = projectEntries.filter((entry) => entry.kind === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const unpaid = projectEntries.filter((entry) => entry.kind === "unpaid").reduce((sum, entry) => sum + entry.amount, 0);
  const freelancerCosts = projectEntries.filter((entry) => entry.kind === "freelancer-cost").reduce((sum, entry) => sum + entry.amount, 0);
  const contractorCosts = projectEntries.filter((entry) => entry.kind === "contractor-cost").reduce((sum, entry) => sum + entry.amount, 0);
  const aiCosts = projectEntries.filter((entry) => entry.kind === "ai-cost").reduce((sum, entry) => sum + entry.amount, 0);
  const sourcePurchaseCosts = projectEntries.filter((entry) => entry.kind === "source-purchase").reduce((sum, entry) => sum + entry.amount, 0);
  const otherCosts = projectEntries.filter((entry) => entry.kind === "other-cost").reduce((sum, entry) => sum + entry.amount, 0);
  const costs = projectEntries.filter((entry) => costKinds.has(entry.kind)).reduce((sum, entry) => sum + entry.amount, 0);
  const contracted = received + unpaid;
  const expectedProfit = contracted - costs;

  return {
    contracted,
    received,
    unpaid,
    costs,
    freelancerCosts,
    contractorCosts,
    aiCosts,
    sourcePurchaseCosts,
    otherCosts,
    actualProfit: received - costs,
    expectedProfit,
    profitRate: contracted > 0 ? expectedProfit / contracted : 0
  };
}
