import { useState, useEffect, useMemo } from "preact/hooks";
import {
  Receipt,
  ArrowLeft,
  Search,
  TrendingUp,
  Calendar,
  Users,
  Tag,
  Key,
  Gift,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-preact";
import {
  AccountPage,
  AccountSection,
  AuthRequired,
  EmptyState,
} from "../../components/AccountPage";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth, type Transaction, captureTokenFromUrl } from "../../lib/auth";
import {
  TRANSACTION_META,
  describeTransaction,
  isTransactionIncome,
  transactionCounterparty,
} from "../../lib/transactions";
import s from "./Transactions.module.css";

type RangeKey = "7d" | "30d" | "90d" | "1y" | "all";
type TypeFilter =
  | "all"
  | "income"
  | "expense"
  | "tax"
  | "transfer"
  | "cosmetic"
  | "key"
  | "gift"
  | "group";

const TYPE_ICONS: Record<
  string,
  {
    icon: any;
  }
> = {
  tax: {
    icon: Calendar,
  },
  in: {
    icon: ArrowDownLeft,
  },
  out: {
    icon: ArrowUpRight,
  },
  cosmetic_platform: {
    icon: Sparkles,
  },
  cosmetic_sale: {
    icon: ShoppingBag,
  },
  cosmetic_purchase: {
    icon: ShoppingBag,
  },
  key_sale: {
    icon: Key,
  },
  key_buy: {
    icon: Key,
  },
  gift_create: {
    icon: Gift,
  },
  gift_claim: {
    icon: Gift,
  },
  gift_claimed: {
    icon: Gift,
  },
  gift_refund: {
    icon: Gift,
  },
  escrow_in: {
    icon: ArrowDownLeft,
  },
  escrow_out: {
    icon: ArrowUpRight,
  },
  group_entry_fee: {
    icon: ArrowUpRight,
  },
  group_create: {
    icon: Users,
  },
  group_tip: {
    icon: Gift,
  },
  group_tip_withdrawal: {
    icon: ArrowDownLeft,
  },
  group_role_purchase: {
    icon: Tag,
  },
  group_role_subscription: {
    icon: Tag,
  },
};

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "1y": "1y",
  all: "All",
};

const RANGE_MS: Record<RangeKey, number | null> = {
  "7d": 7 * 86400000,
  "30d": 30 * 86400000,
  "90d": 90 * 86400000,
  "1y": 365 * 86400000,
  all: null,
};

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "tax", label: "Daily" },
  { key: "transfer", label: "Transfers" },
  { key: "cosmetic", label: "Cosmetics" },
  { key: "key", label: "Keys" },
  { key: "gift", label: "Gifts" },
  { key: "group", label: "Groups" },
];

const PAGE_SIZE = 50;

type TxRow = { txs: Transaction[] };

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function userFilterMatches(typeFilter: TypeFilter, txType: string): boolean {
  if (typeFilter === "all") return true;
  const meta = TRANSACTION_META[txType];
  if (!meta) return false;
  if (typeFilter === "income") return meta.isIncome;
  if (typeFilter === "expense") return !meta.isIncome;
  return meta.category === typeFilter;
}

export function Transactions() {
  const { user, token, reload } = useAuth();
  const [range, setRange] = useState<RangeKey>("30d");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  useEffect(() => {
    if (!user && token) reload();
  }, [user, token, reload]);

  useEffect(() => {
    setPage(0);
    setExpanded(new Set());
  }, [range, typeFilter, query]);

  const transactions = useMemo(
    () => (user?.["sys.transactions"] ?? []) as Transaction[],
    [user],
  );

  const availableRanges = useMemo<RangeKey[]>(() => {
    if (transactions.length === 0) return [];
    const now = Date.now();
    const oldest = transactions.reduce(
      (min, t) => (t.time < min ? t.time : min),
      transactions[0].time,
    );
    const ageMs = now - oldest;
    const has = (r: RangeKey) =>
      RANGE_MS[r] === null || ageMs >= (RANGE_MS[r] as number);
    const order: RangeKey[] = ["7d", "30d", "90d", "1y", "all"];
    return order.filter(has);
  }, [transactions]);

  useEffect(() => {
    if (availableRanges.length === 0) return;
    if (!availableRanges.includes(range)) {
      setRange(availableRanges[availableRanges.length - 1]);
    }
  }, [availableRanges, range]);

  const filtered = useMemo(() => {
    const cutoff =
      RANGE_MS[range] === null
        ? null
        : Date.now() - (RANGE_MS[range] as number);
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (cutoff !== null && tx.time < cutoff) return false;
      if (!userFilterMatches(typeFilter, tx.type)) return false;
      if (q) {
        const hay = [
          transactionCounterparty(tx),
          tx.note,
          tx.type,
          TRANSACTION_META[tx.type]?.label || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, range, typeFilter, query]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.time - a.time),
    [filtered],
  );

  const sortedRows = useMemo<TxRow[]>(() => {
    const rows: TxRow[] = [];
    for (const tx of sorted) {
      const last = rows[rows.length - 1];
      if (tx.type === "tax" && last && last.txs[0].type === "tax") {
        last.txs.push(tx);
      } else {
        rows.push({ txs: [tx] });
      }
    }
    return rows;
  }, [sorted]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const byType: Record<
      string,
      { count: number; income: number; expense: number }
    > = {};
    const byUser: Record<
      string,
      { count: number; income: number; expense: number }
    > = {};

    sorted.forEach((tx) => {
      const isIncome = isTransactionIncome(tx);
      const amt = Math.abs(tx.amount);
      if (isIncome) totalIncome += amt;
      else totalExpense += amt;

      const t = (byType[tx.type] ||= { count: 0, income: 0, expense: 0 });
      t.count += 1;
      if (isIncome) t.income += amt;
      else t.expense += amt;

      const counterparty = transactionCounterparty(tx);
      if (counterparty) {
        const u = (byUser[counterparty] ||= {
          count: 0,
          income: 0,
          expense: 0,
        });
        u.count += 1;
        if (isIncome) u.income += amt;
        else u.expense += amt;
      }
    });

    const dayMap = new Map<number, { income: number; expense: number }>();
    sorted.forEach((tx) => {
      const d = startOfDay(tx.time);
      const slot = dayMap.get(d) || { income: 0, expense: 0 };
      const isIncome = isTransactionIncome(tx);
      if (isIncome) slot.income += Math.abs(tx.amount);
      else slot.expense += Math.abs(tx.amount);
      dayMap.set(d, slot);
    });

    let dayStart: number;
    let dayEnd: number;
    if (sorted.length > 0) {
      const minTime = sorted[sorted.length - 1].time;
      const maxTime = sorted[0].time;
      dayStart = startOfDay(minTime);
      dayEnd = startOfDay(maxTime);
    } else {
      const now = startOfDay(Date.now());
      dayStart = now;
      dayEnd = now;
    }

    const daily: {
      day: number;
      label: string;
      income: number;
      expense: number;
      net: number;
    }[] = [];
    for (let t = dayStart; t <= dayEnd; t += 86400000) {
      const slot = dayMap.get(t) || { income: 0, expense: 0 };
      const d = new Date(t);
      daily.push({
        day: t,
        label: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        income: slot.income,
        expense: slot.expense,
        net: slot.income - slot.expense,
      });
    }
    if (daily.length > 90) {
      const bucket = new Map<
        string,
        { income: number; expense: number; net: number; label: string }
      >();
      daily.forEach((d) => {
        const dt = new Date(d.day);
        const key = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, "0")}`;
        const cur = bucket.get(key) || {
          income: 0,
          expense: 0,
          net: 0,
          label: dt.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
        };
        cur.income += d.income;
        cur.expense += d.expense;
        cur.net += d.net;
        bucket.set(key, cur);
      });
      const monthly = Array.from(bucket.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([, v]) => ({
          day: 0,
          label: v.label,
          income: v.income,
          expense: v.expense,
          net: v.net,
        }));
      return {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        count: sorted.length,
        byType,
        byUser,
        daily: monthly,
        chartLabel: "monthly",
      };
    }
    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      count: sorted.length,
      byType,
      byUser,
      daily,
      chartLabel: "daily",
    };
  }, [sorted]);

  const chartMax = Math.max(
    1,
    ...stats.daily.flatMap((d) => [d.income, d.expense]),
  );

  const topUsers = useMemo(() => {
    return Object.entries(stats.byUser)
      .map(([name, v]) => ({ name, ...v, net: v.income - v.expense }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [stats.byUser]);

  const typeBreakdown = useMemo(() => {
    return Object.entries(stats.byType)
      .map(([type, v]) => ({
        type,
        meta: TRANSACTION_META[type],
        ...v,
        net: v.income - v.expense,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats.byType]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sortedRows.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const balance = user?.["sys.currency"] ?? 0;

  if (!user) {
    return (
      <AuthRequired
        icon={<Receipt size={28} />}
        title="Sign in to view transactions"
        text="Sign in to see your full transaction history and analytics."
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/me/transactions")}`}
      />
    );
  }

  return (
    <AccountPage layoutClassName={s.wideLayout}>
      <a href="/me" class={s.backLink}>
        <ArrowLeft size={14} /> Back to account
      </a>

      <div class={s.controls}>
        <div class={s.controlsRow}>
          {availableRanges.length > 0 ? (
            <div class={s.rangeGroup}>
              {availableRanges.map((r) => (
                <button
                  key={r}
                  class={`${s.rangeBtn} ${range === r ? s.active : ""}`}
                  onClick={() => setRange(r)}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          ) : (
            <span class={s.rangeEmpty}>No transactions yet</span>
          )}
          <div class={s.searchWrap}>
            <Search size={14} class={s.searchIcon} />
            <input
              class={s.searchInput}
              placeholder="Search transactions..."
              value={query}
              onInput={(e: any) => setQuery(e.target.value)}
            />
            {query && (
              <button
                class={s.searchClear}
                onClick={() => setQuery("")}
                aria-label="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <div class={s.typeGroup}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              class={`${s.typeBtn} ${typeFilter === f.key ? s.active : ""}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div class={s.summaryGrid}>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Balance</div>
          <div class={s.summaryValue}>
            {balance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Income</div>
          <div class={`${s.summaryValue} ${s.income}`}>
            +
            {stats.totalIncome.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Spent</div>
          <div class={`${s.summaryValue} ${s.expense}`}>
            -
            {stats.totalExpense.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Net</div>
          <div
            class={`${s.summaryValue} ${stats.net >= 0 ? s.income : s.expense}`}
          >
            {stats.net >= 0 ? "+" : ""}
            {stats.net.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <AccountSection
        icon={<TrendingUp size={18} />}
        title="Credit Flow"
        subtitle={`Income vs expense (${stats.chartLabel})`}
        actions={
          <div class={s.chartLegend}>
            <span class={s.chartLegendItem}>
              <span class={`${s.chartLegendDot} ${s.income}`} /> Income
            </span>
            <span class={s.chartLegendItem}>
              <span class={`${s.chartLegendDot} ${s.expense}`} /> Expense
            </span>
          </div>
        }
      >
        {stats.daily.length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title="No data for this range"
          />
        ) : (
          <div class={s.chartWrap}>
            <div class={s.chartArea}>
              {stats.daily.map((d, i) => {
                const incomeH = (d.income / chartMax) * 100;
                const expenseH = (d.expense / chartMax) * 100;
                return (
                  <div
                    key={i}
                    class={s.chartBar}
                    title={`${d.label}: +${d.income.toFixed(2)} / -${d.expense.toFixed(2)} (net ${d.net >= 0 ? "+" : ""}${d.net.toFixed(2)})`}
                  >
                    <div class={s.chartStack}>
                      {d.expense > 0 && (
                        <div
                          class={`${s.chartSegment} ${s.expense}`}
                          style={{ height: `${expenseH}%` }}
                        />
                      )}
                      {d.income > 0 && (
                        <div
                          class={`${s.chartSegment} ${s.income}`}
                          style={{ height: `${incomeH}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div class={s.chartLabels}>
              {stats.daily.map((d, i) => (
                <div key={i} class={s.chartLabel}>
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </AccountSection>

      <div class={s.twoCol}>
        <AccountSection
          icon={<Tag size={18} />}
          title="By Type"
          subtitle="Activity breakdown"
        >
          {typeBreakdown.length === 0 ? (
            <EmptyState icon={<Tag size={24} />} title="No activity" />
          ) : (
            <div class={s.breakdownList}>
              {typeBreakdown.map((b) => {
                const Icon = TYPE_ICONS[b.type]?.icon || Receipt;
                return (
                  <div key={b.type} class={s.breakdownItem}>
                    <div
                      class={s.breakdownIcon}
                      style={{ color: b.meta?.color || "var(--text)" }}
                    >
                      <Icon size={14} />
                    </div>
                    <div class={s.breakdownInfo}>
                      <div class={s.breakdownName}>
                        {b.meta?.label || b.type}
                      </div>
                      <div class={s.breakdownMeta}>
                        {b.count}{" "}
                        {b.count === 1 ? "transaction" : "transactions"}
                      </div>
                    </div>
                    <div class={s.breakdownValues}>
                      {b.income > 0 && (
                        <div class={`${s.breakdownValue} ${s.income}`}>
                          +
                          {b.income.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                      {b.expense > 0 && (
                        <div class={`${s.breakdownValue} ${s.expense}`}>
                          -
                          {b.expense.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AccountSection>

        <AccountSection
          icon={<Users size={18} />}
          title="Top Counterparties"
          subtitle="Most active users"
        >
          {topUsers.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No counterparties" />
          ) : (
            <div class={s.userList}>
              {topUsers.map((u) => (
                <a key={u.name} href={`/profile/${u.name}`} class={s.userItem}>
                  <UserAvatar username={u.name} className={s.userAvatar} />
                  <div class={s.userInfo}>
                    <div class={s.userName}>@{u.name}</div>
                    <div class={s.userMeta}>
                      {u.count} {u.count === 1 ? "transaction" : "transactions"}
                    </div>
                  </div>
                  <div class={s.userValues}>
                    {u.income > 0 && (
                      <div class={`${s.breakdownValue} ${s.income}`}>
                        +
                        {u.income.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                    {u.expense > 0 && (
                      <div class={`${s.breakdownValue} ${s.expense}`}>
                        -
                        {u.expense.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </AccountSection>
      </div>

      <AccountSection
        icon={<Receipt size={18} />}
        title="All Transactions"
        actions={
          totalPages > 1 && (
            <div class={s.pager}>
              <button
                class={s.pagerBtn}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span class={s.pagerInfo}>
                {safePage + 1} / {totalPages}
              </span>
              <button
                class={s.pagerBtn}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )
        }
      >
        {sortedRows.length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title="No matching transactions"
            text="Try adjusting the time range, type filter, or search query."
          />
        ) : (
          <div class={s.txList}>
            {pageItems.map((row, i) => {
              const tx = row.txs[0];
              const meta = TRANSACTION_META[tx.type];
              const isIncome = isTransactionIncome(tx);
              const Icon = TYPE_ICONS[tx.type]?.icon || Receipt;
              const counterparty = transactionCounterparty(tx);
              const grouped = row.txs.length > 1;
              const totalAmount = row.txs.reduce((sum, t) => sum + t.amount, 0);
              const oldest = row.txs[row.txs.length - 1];
              const sameDay = startOfDay(tx.time) === startOfDay(oldest.time);
              const isOpen = expanded.has(tx.time);
              const title = grouped
                ? `${row.txs.length} daily credits`
                : describeTransaction(tx);
              const dateLabel = grouped
                ? sameDay
                  ? formatDateTime(tx.time)
                  : `${formatDateShort(oldest.time)} – ${formatDateTime(tx.time)}`
                : formatDateTime(tx.time);
              const toggle = () => {
                if (!grouped) return;
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(tx.time)) next.delete(tx.time);
                  else next.add(tx.time);
                  return next;
                });
              };
              return (
                <div key={`${tx.time}-${i}`} class={s.txGroup}>
                  <div
                    class={`${s.txItem} ${grouped ? s.txItemGrouped : ""} ${isOpen ? s.txItemOpen : ""}`}
                    onClick={toggle}
                    role={grouped ? "button" : undefined}
                    aria-expanded={grouped ? isOpen : undefined}
                  >
                    <div
                      class={`${s.txIcon} ${isIncome ? s.income : s.expense}`}
                    >
                      <Icon size={14} />
                      {grouped && (
                        <span class={s.txCount}>×{row.txs.length}</span>
                      )}
                    </div>
                    <div class={s.txInfo}>
                      <div class={s.txTitle}>{title}</div>
                      <div class={s.txMeta}>
                        {meta?.label || tx.type}
                        {counterparty && (
                          <>
                            {" · "}
                            <a
                              href={`/profile/${counterparty}`}
                              class={s.txUser}
                              onClick={(e: MouseEvent) => e.stopPropagation()}
                            >
                              @{counterparty}
                            </a>
                          </>
                        )}
                        {" · "}
                        {dateLabel}
                      </div>
                    </div>
                    <div
                      class={`${s.txAmount} ${isIncome ? s.income : s.expense}`}
                    >
                      {isIncome ? "+" : "-"}
                      {Math.abs(totalAmount).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    {grouped && (
                      <span
                        class={`${s.txChevron} ${isOpen ? s.txChevronOpen : ""}`}
                        aria-hidden="true"
                      >
                        <ChevronDown size={14} />
                      </span>
                    )}
                  </div>
                  {grouped && isOpen && (
                    <div class={s.txSubList}>
                      {[...row.txs]
                        .sort((a, b) => b.time - a.time)
                        .map((sub, j) => {
                          const subIsIncome = isTransactionIncome(sub);
                          const counterparty = transactionCounterparty(sub);
                          return (
                            <div key={`${sub.time}-${j}`} class={s.txSubItem}>
                              <div class={s.txSubDot} />
                              <div class={s.txSubInfo}>
                                <div class={s.txSubTitle}>
                                  {describeTransaction(sub)}
                                </div>
                                <div class={s.txSubMeta}>
                                  {counterparty ? (
                                    <a
                                      href={`/profile/${counterparty}`}
                                      class={s.txUser}
                                    >
                                      @{counterparty}
                                    </a>
                                  ) : (
                                    <span>system</span>
                                  )}
                                  {" · "}
                                  {formatDateTime(sub.time)}
                                </div>
                              </div>
                              <div
                                class={`${s.txSubAmount} ${subIsIncome ? s.income : s.expense}`}
                              >
                                {subIsIncome ? "+" : "-"}
                                {Math.abs(sub.amount).toLocaleString(
                                  undefined,
                                  {
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AccountSection>
    </AccountPage>
  );
}
