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
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth, type Transaction, captureTokenFromUrl } from "../../lib/auth";
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
  | "gift";

const TYPE_META: Record<
  string,
  {
    label: string;
    isIncome: boolean;
    category: "tax" | "transfer" | "cosmetic" | "key" | "gift";
    icon: any;
    color: string;
  }
> = {
  tax: {
    label: "Daily Credits",
    isIncome: true,
    category: "tax",
    icon: Calendar,
    color: "#a78bfa",
  },
  in: {
    label: "Transfer Received",
    isIncome: true,
    category: "transfer",
    icon: ArrowDownLeft,
    color: "#4ade80",
  },
  out: {
    label: "Transfer Sent",
    isIncome: false,
    category: "transfer",
    icon: ArrowUpRight,
    color: "#f87171",
  },
  cosmetic_platform: {
    label: "Cosmetic Platform Cut",
    isIncome: true,
    category: "cosmetic",
    icon: Sparkles,
    color: "#f472b6",
  },
  cosmetic_sale: {
    label: "Cosmetic Sale",
    isIncome: true,
    category: "cosmetic",
    icon: ShoppingBag,
    color: "#fb923c",
  },
  cosmetic_purchase: {
    label: "Cosmetic Purchase",
    isIncome: false,
    category: "cosmetic",
    icon: ShoppingBag,
    color: "#fb923c",
  },
  key_sale: {
    label: "Key Sale",
    isIncome: true,
    category: "key",
    icon: Key,
    color: "#38bdf8",
  },
  key_buy: {
    label: "Key Purchase",
    isIncome: false,
    category: "key",
    icon: Key,
    color: "#38bdf8",
  },
  gift_create: {
    label: "Gift Created",
    isIncome: false,
    category: "gift",
    icon: Gift,
    color: "#facc15",
  },
  gift_claimed: {
    label: "Gift Claimed",
    isIncome: true,
    category: "gift",
    icon: Gift,
    color: "#facc15",
  },
  escrow_in: {
    label: "Escrow Received",
    isIncome: true,
    category: "transfer",
    icon: ArrowDownLeft,
    color: "#4ade80",
  },
  escrow_out: {
    label: "Escrow Sent",
    isIncome: false,
    category: "transfer",
    icon: ArrowUpRight,
    color: "#f87171",
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

function describeTx(tx: Transaction): string {
  if (tx.note) return tx.note;
  const meta = TYPE_META[tx.type];
  if (meta) return meta.label;
  return tx.type;
}

function userFilterMatches(typeFilter: TypeFilter, txType: string): boolean {
  if (typeFilter === "all") return true;
  const meta = TYPE_META[txType];
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
        const hay = [tx.user, tx.note, tx.type, TYPE_META[tx.type]?.label || ""]
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
      const meta = TYPE_META[tx.type];
      const isIncome = meta ? meta.isIncome : tx.amount > 0;
      const amt = Math.abs(tx.amount);
      if (isIncome) totalIncome += tx.amount;
      else totalExpense += amt;

      const t = (byType[tx.type] ||= { count: 0, income: 0, expense: 0 });
      t.count += 1;
      if (isIncome) t.income += tx.amount;
      else t.expense += amt;

      if (tx.user && tx.user !== "rotur" && tx.user !== "roturBOT") {
        const u = (byUser[tx.user] ||= { count: 0, income: 0, expense: 0 });
        u.count += 1;
        if (isIncome) u.income += tx.amount;
        else u.expense += amt;
      }
    });

    const dayMap = new Map<number, { income: number; expense: number }>();
    sorted.forEach((tx) => {
      const d = startOfDay(tx.time);
      const slot = dayMap.get(d) || { income: 0, expense: 0 };
      const meta = TYPE_META[tx.type];
      const isIncome = meta ? meta.isIncome : tx.amount > 0;
      if (isIncome) slot.income += tx.amount;
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
        meta: TYPE_META[type],
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
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.authRequired}>
              <div class={s.authRequiredIcon}>
                <Receipt size={28} />
              </div>
              <div class={s.authRequiredTitle}>
                Sign in to view transactions
              </div>
              <p class={s.authRequiredText}>
                Sign in to see your full transaction history and analytics.
              </p>
              <a
                href={`/auth?return_to=${encodeURIComponent("/me/transactions")}`}
                class={s.btnPrimary}
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
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

          <div class={s.section}>
            <div class={s.sectionHeader}>
              <div class={s.sectionTitleGroup}>
                <div class={s.sectionIcon}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div class={s.sectionTitle}>Credit Flow</div>
                  <div class={s.sectionSubtitle}>
                    Income vs expense ({stats.chartLabel})
                  </div>
                </div>
              </div>
              <div class={s.chartLegend}>
                <span class={s.chartLegendItem}>
                  <span class={`${s.chartLegendDot} ${s.income}`} /> Income
                </span>
                <span class={s.chartLegendItem}>
                  <span class={`${s.chartLegendDot} ${s.expense}`} /> Expense
                </span>
              </div>
            </div>
            <div class={s.sectionBody}>
              {stats.daily.length === 0 ? (
                <div class={s.empty}>
                  <div class={s.emptyIcon}>
                    <Receipt size={24} />
                  </div>
                  <div class={s.emptyTitle}>No data for this range</div>
                </div>
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
            </div>
          </div>

          <div class={s.twoCol}>
            <div class={s.section}>
              <div class={s.sectionHeader}>
                <div class={s.sectionTitleGroup}>
                  <div class={s.sectionIcon}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <div class={s.sectionTitle}>By Type</div>
                    <div class={s.sectionSubtitle}>Activity breakdown</div>
                  </div>
                </div>
              </div>
              <div class={s.sectionBody}>
                {typeBreakdown.length === 0 ? (
                  <div class={s.empty}>
                    <div class={s.emptyIcon}>
                      <Tag size={24} />
                    </div>
                    <div class={s.emptyTitle}>No activity</div>
                  </div>
                ) : (
                  <div class={s.breakdownList}>
                    {typeBreakdown.map((b) => {
                      const Icon = b.meta?.icon || Receipt;
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
              </div>
            </div>

            <div class={s.section}>
              <div class={s.sectionHeader}>
                <div class={s.sectionTitleGroup}>
                  <div class={s.sectionIcon}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div class={s.sectionTitle}>Top Counterparties</div>
                    <div class={s.sectionSubtitle}>Most active users</div>
                  </div>
                </div>
              </div>
              <div class={s.sectionBody}>
                {topUsers.length === 0 ? (
                  <div class={s.empty}>
                    <div class={s.emptyIcon}>
                      <Users size={24} />
                    </div>
                    <div class={s.emptyTitle}>No counterparties</div>
                  </div>
                ) : (
                  <div class={s.userList}>
                    {topUsers.map((u) => (
                      <a
                        key={u.name}
                        href={`/profile/${u.name}`}
                        class={s.userItem}
                      >
                        <UserAvatar
                          username={u.name}
                          className={s.userAvatar}
                        />
                        <div class={s.userInfo}>
                          <div class={s.userName}>@{u.name}</div>
                          <div class={s.userMeta}>
                            {u.count}{" "}
                            {u.count === 1 ? "transaction" : "transactions"}
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
              </div>
            </div>
          </div>

          <div class={s.section}>
            <div class={s.sectionHeader}>
              <div class={s.sectionTitleGroup}>
                <div class={s.sectionIcon}>
                  <Receipt size={18} />
                </div>
                <div>
                  <div class={s.sectionTitle}>All Transactions</div>
                </div>
              </div>
              {totalPages > 1 && (
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
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={safePage >= totalPages - 1}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div class={s.sectionBody}>
              {sortedRows.length === 0 ? (
                <div class={s.empty}>
                  <div class={s.emptyIcon}>
                    <Receipt size={24} />
                  </div>
                  <div class={s.emptyTitle}>No matching transactions</div>
                  <div class={s.emptyText}>
                    Try adjusting the time range, type filter, or search query.
                  </div>
                </div>
              ) : (
                <div class={s.txList}>
                  {pageItems.map((row, i) => {
                    const tx = row.txs[0];
                    const meta = TYPE_META[tx.type];
                    const isIncome = meta ? meta.isIncome : tx.amount > 0;
                    const Icon = meta?.icon || Receipt;
                    const grouped = row.txs.length > 1;
                    const totalAmount = row.txs.reduce(
                      (sum, t) => sum + t.amount,
                      0,
                    );
                    const oldest = row.txs[row.txs.length - 1];
                    const sameDay =
                      startOfDay(tx.time) === startOfDay(oldest.time);
                    const isOpen = expanded.has(tx.time);
                    const title = grouped
                      ? `${row.txs.length} daily credits`
                      : describeTx(tx);
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
                              {tx.user &&
                                tx.user !== "rotur" &&
                                tx.user !== "roturBOT" && (
                                  <>
                                    {" · "}
                                    <a
                                      href={`/profile/${tx.user}`}
                                      class={s.txUser}
                                      onClick={(e: MouseEvent) =>
                                        e.stopPropagation()
                                      }
                                    >
                                      @{tx.user}
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
                                const subMeta = TYPE_META[sub.type];
                                const subIsIncome = subMeta
                                  ? subMeta.isIncome
                                  : sub.amount > 0;
                                const showUser =
                                  sub.user &&
                                  sub.user !== "rotur" &&
                                  sub.user !== "roturBOT";
                                return (
                                  <div
                                    key={`${sub.time}-${j}`}
                                    class={s.txSubItem}
                                  >
                                    <div class={s.txSubDot} />
                                    <div class={s.txSubInfo}>
                                      <div class={s.txSubTitle}>
                                        {sub.note || subMeta?.label || sub.type}
                                      </div>
                                      <div class={s.txSubMeta}>
                                        {showUser ? (
                                          <a
                                            href={`/profile/${sub.user}`}
                                            class={s.txUser}
                                          >
                                            @{sub.user}
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
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
