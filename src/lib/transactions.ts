import type { Transaction } from "./auth";

export type TransactionCategory =
  | "tax"
  | "transfer"
  | "cosmetic"
  | "key"
  | "gift"
  | "group";

export type TransactionMeta = {
  /** i18n key (namespace "transactions.type.*") of the type label. */
  label: string;
  isIncome: boolean;
  category: TransactionCategory;
  color: string;
  showCounterparty?: boolean;
};

export const TRANSACTION_META: Record<string, TransactionMeta> = {
  tax: {
    label: "transactions.type.tax",
    isIncome: true,
    category: "tax",
    color: "#a78bfa",
  },
  in: {
    label: "transactions.type.in",
    isIncome: true,
    category: "transfer",
    color: "#4ade80",
    showCounterparty: true,
  },
  out: {
    label: "transactions.type.out",
    isIncome: false,
    category: "transfer",
    color: "#f87171",
    showCounterparty: true,
  },
  cosmetic_platform: {
    label: "transactions.type.cosmetic_platform",
    isIncome: true,
    category: "cosmetic",
    color: "#f472b6",
  },
  cosmetic_sale: {
    label: "transactions.type.cosmetic_sale",
    isIncome: true,
    category: "cosmetic",
    color: "#fb923c",
    showCounterparty: true,
  },
  cosmetic_purchase: {
    label: "transactions.type.cosmetic_purchase",
    isIncome: false,
    category: "cosmetic",
    color: "#fb923c",
  },
  key_sale: {
    label: "transactions.type.key_sale",
    isIncome: true,
    category: "key",
    color: "#38bdf8",
    showCounterparty: true,
  },
  key_buy: {
    label: "transactions.type.key_buy",
    isIncome: false,
    category: "key",
    color: "#38bdf8",
  },
  gift_create: {
    label: "transactions.type.gift_create",
    isIncome: false,
    category: "gift",
    color: "#facc15",
  },
  gift_claim: {
    label: "transactions.type.gift_claim",
    isIncome: true,
    category: "gift",
    color: "#facc15",
  },
  gift_claimed: {
    label: "transactions.type.gift_claimed",
    isIncome: true,
    category: "gift",
    color: "#facc15",
    showCounterparty: true,
  },
  gift_refund: {
    label: "transactions.type.gift_refund",
    isIncome: true,
    category: "gift",
    color: "#facc15",
  },
  escrow_in: {
    label: "transactions.type.escrow_in",
    isIncome: true,
    category: "transfer",
    color: "#4ade80",
    showCounterparty: true,
  },
  escrow_out: {
    label: "transactions.type.escrow_out",
    isIncome: false,
    category: "transfer",
    color: "#f87171",
    showCounterparty: true,
  },
  group_create: {
    label: "transactions.type.group_create",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_entry_fee: {
    label: "transactions.type.group_entry_fee",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_tip: {
    label: "transactions.type.group_tip",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_tip_withdrawal: {
    label: "transactions.type.group_tip_withdrawal",
    isIncome: true,
    category: "group",
    color: "#57cdac",
  },
  group_role_purchase: {
    label: "transactions.type.group_role_purchase",
    isIncome: false,
    category: "group",
    color: "#57cdac",
  },
  group_role_subscription: {
    label: "transactions.type.group_role_subscription",
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

/**
 * i18n key for a transaction type's label.
 * Unknown types fall back to the raw type string itself.
 */
export function transactionLabelKey(type: string): string {
  return TRANSACTION_META[type]?.label || type;
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

/**
 * Human-readable description of a transaction.
 * Pass the i18n `t` function to translate the type label; without it the
 * raw label (which may be an i18n key) is returned.
 */
export function describeTransaction(
  tx: Transaction,
  translate?: (key: string) => string,
): string {
  if (tx.note) return tx.note;
  const label = transactionLabelKey(tx.type);
  return translate ? translate(label) : label;
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
