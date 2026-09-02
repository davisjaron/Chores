import type { CashTransaction, Claim, LedgerEntry, Redemption } from "@prisma/client";

export type ChildBalances = {
  earnedPoints: number;
  earnedCash: number;
  spentPoints: number;
  cashedOutPts: number;
  txCash: number;
  paidCash: number;
  pointsBalance: number;
  cashBalance: number;
  accountBalance: number;
};

export function calculateBalances(
  claims: Claim[],
  redemptions: Redemption[],
  cashTransactions: CashTransaction[],
  ledgerEntries: LedgerEntry[] = []
): ChildBalances {
  const earnedPoints = claims
    .filter((c) => c.status === "approved" || c.status === "complete")
    .reduce((sum, c) => sum + (c.points || 0), 0);

  const earnedCash = claims
    .filter((c) => c.status === "approved" || c.status === "complete")
    .reduce((sum, c) => sum + (c.cashAwarded || 0), 0);

  const spentPoints = redemptions.reduce((sum, r) => sum + r.pointsSpent, 0);

  const cashedOutPts = cashTransactions
    .filter((t) => t.kind === "cashout")
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const adjustmentPts = cashTransactions
    .filter((t) => t.kind === "adjustment")
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const txCash = cashTransactions.reduce((sum, t) => sum + t.amount, 0);

  const paidCash = cashTransactions
    .filter((t) => t.kind === "payment")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const accountBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

  return {
    earnedPoints,
    earnedCash,
    spentPoints,
    cashedOutPts,
    txCash,
    paidCash,
    pointsBalance: earnedPoints - spentPoints - cashedOutPts + adjustmentPts,
    cashBalance: earnedCash + txCash,
    accountBalance,
  };
}
