import type { Transaction } from "./auth";

export type TransactionCategory =
  | "tax"
  | "transfer"
  | "cosmetic"
  | "key"
  | "gift"
  | "group";

export type TransactionMeta = {
  label: string;
  isIncome: boolean;
  category: TransactionCategory;
  color: string;
  showCounterparty?: boolean;
};

export const TRANSACTION_META: Record<string, TransactionMeta> = {
  tax: {
    label: "Daily Credits",
    isIncome: true,
    category: "tax",
    color: "#a78bfa",
  },
  in: {
    label: "Transfer Received",
    isIncome: true,
    category: "transfer",
    color: "#4ade80",
    showCounterparty: true,
  },
  out: {
    label: "Transfer Sent",
    isIncome: false,
    category: "transfer",
    color: "#f87171",
    showCounterparty: true,
  },
  cosmetic_platform: {
    label: "Cosmetic Platform Cut",
    isIncome: true,
    category: "cosmetic",
    color: "#f472b6",
  },
  cosmetic_sale: {
    label: "Cosmetic Sale",
    isIncome: true,
    category: "cosmetic",
    color: "#fb923c",
    showCounterparty: true,
  },
  cosmetic_purchase: {
    label: "Cosmetic Purchase",
    isIncome: false,
    category: "cosmetic",
    color: "#fb923c",
  },
  key_sale: {
    label: "Key Sale",
    isIncome: true,
    category: "key",
    color: "#38bdf8",
    showCounterparty: true,
  },
  key_buy: {
    label: "Key Purchase",
    isIncome: false,
    category: "key",
    color: "#38bdf8",
  },
  gift_create: {
    label: "Gift Created",
    isIncome: false,
    category: "gift",
    color: "#facc15",
  },
  gift_claim: {
    label: "Gift Claimed",
    isIncome: true,
    category: "gift",
    color: "#facc15",
  },
  gift_claimed: {
    label: "Gift Claimed",
    isIncome: true,
    category: "gift",
    color: "#facc15",
    showCounterparty: true,
  },
  gift_refund: {
    label: "Gift Refunded",
    isIncome: true,
    category: "gift",
    color: "#facc15",
  },
  escrow_in: {
    label: "Escrow Received",
    isIncome: true,
    category: "transfer",
    color: "#4ade80",
    showCounterparty: true,
  },
  escrow_out: {
    label: "Escrow Sent",
    isIncome: false,
    category: "transfer",
    color: "#f87171",
    showCounterparty: true,
  },
  group_create: {
    label: "Group Created",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_entry_fee: {
    label: "Group Entry Fee",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_tip: {
    label: "Group Tip",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_tip_withdrawal: {
    label: "Group Tip Withdrawal",
    isIncome: true,
    category: "group",
    color: "#57cdac",
  },
  group_role_purchase: {
    label: "Group Role Purchase",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_role_subscription: {
    label: "Group Role Subscription",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
};

export function getTransactionMeta(
  txOrType: Transaction | string,
): TransactionMeta {
  const type = typeof txOrType === "string" ? txOrType : txOrType.type;
  return (
    TRANSACTION_META[type] || {
      label: type,
      isIncome:
        typeof txOrType === "string"
          ? false
          : (txOrType.new_total ?? 0) >= 0 && txOrType.amount > 0,
      category: "transfer",
      color: "#94a3b8",
    }
  );
}

export function isTransactionIncome(tx: Transaction): boolean {
  return getTransactionMeta(tx).isIncome;
}

export function transactionCounterparty(tx: Transaction): string {
  const meta = getTransactionMeta(tx);
  const user = String(tx.user || "").trim();
  if (
    !meta.showCounterparty ||
    !user ||
    user === "Bilup"
  ) {
    return "";
  }
  return user;
}

export function describeTransaction(tx: Transaction): string {
  if (tx.note) return tx.note;
  return getTransactionMeta(tx).label;
}

export function computeTransactionStats(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((tx) => {
    const amt = Math.abs(tx.amount);
    if (isTransactionIncome(tx)) totalIncome += amt;
    else totalExpense += amt;
  });
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}
