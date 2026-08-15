import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
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
  Wallet,
  CalendarCheck,
} from "lucide-preact";
import {
  AccountPage,
  AccountSection,
  AuthRequired,
  EmptyState,
} from "../../components/AccountPage";
import { UserAvatar } from "../../components/UserAvatar";
import {
  useAuth,
  useBenefits,
  type Transaction,
  captureTokenFromUrl,
} from "../../lib/auth";
import { useI18n } from "../../i18n/i18n";
import {
  TRANSACTION_META,
  describeTransaction,
  isTransactionIncome,
  transactionCounterparty,
  transactionLabelKey,
} from "../../lib/transactions";
import s from "./Transactions.module.css";

const API = "https://api.accounts.bilup.org";

type DailyRewardBreakdown = {
  base: number;
  special_solar: number;
  special_lunar: number;
  special_week: number;
  qingming: number;
  total: number;
  special_reason?: string;
};

type DailyClaimStatus = {
  can_claim: boolean;
  wait_time: number;
  reward?: DailyRewardBreakdown;
  error?: string;
  wait_hours?: string;
};

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
  all: "transactions.allTime",
};

const RANGE_MS: Record<RangeKey, number | null> = {
  "7d": 7 * 86400000,
  "30d": 30 * 86400000,
  "90d": 90 * 86400000,
  "1y": 365 * 86400000,
  all: null,
};

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "transactions.allTypes" },
  { key: "income", label: "transactions.filterIncome" },
  { key: "expense", label: "transactions.filterExpense" },
  { key: "tax", label: "transactions.filterDaily" },
  { key: "transfer", label: "transactions.filterTransfers" },
  { key: "cosmetic", label: "transactions.filterCosmetics" },
  { key: "key", label: "transactions.filterKeys" },
  { key: "gift", label: "transactions.filterGifts" },
  { key: "group", label: "transactions.filterGroups" },
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

// ---- Monthly check-in calendar helpers --------------------------------

const WEEKDAY_KEYS = [
  "transactions.weekdayMon",
  "transactions.weekdayTue",
  "transactions.weekdayWed",
  "transactions.weekdayThu",
  "transactions.weekdayFri",
  "transactions.weekdaySat",
  "transactions.weekdaySun",
];

type MonthCell = {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  checked: boolean;
  points: number;
  /** Points this day grants — actual amount when checked, otherwise the daily baseline. */
  expected: number;
};

/**
 * Build the grid of cells for the current month (Monday-first layout),
 * aggregating daily check-in points from `tax` transactions.
 *
 * The backend's `claim_time.reward.total` is the base reward (weekday base +
 * special-date bonuses) BEFORE the subscription multiplier. The actual payout
 * is `reward.total × Daily_Credit_Multipler` (Free=1, Plus=2, Pro=3, Max=4).
 * We apply the multiplier ourselves so un-checked days always show the real
 * amount the user would receive.
 *
 * @param transactions All transactions for the user.
 * @param dailyReward `claim_time.reward.total` (pre-multiplier) when known,
 *   otherwise 0.
 * @param multiplier Subscription daily-credit multiplier (Free=1, Plus=2,
 *   Pro=3, Max=4), from `me/benefits`.
 */
function buildMonthCalendar(
  transactions: Transaction[],
  dailyReward: number,
  multiplier: number,
): {
  cells: MonthCell[];
  monthLabel: string;
  checkedCount: number;
  monthTotal: number;
  /** Effective points a daily check-in grants (multiplier applied if needed). */
  dailyExpected: number;
  /** True when the displayed daily amount includes a subscription bonus. */
  hasBonus: boolean;
  bonusPerDay: number;
  /** Subscription daily-credit multiplier (>1 when the user has a bonus). */
  multiplier: number;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  // Sum check-in (tax) points per day-of-month for the current month.
  const pointsByDay = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.type !== "tax") continue;
    const d = new Date(tx.time);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    pointsByDay.set(day, (pointsByDay.get(day) ?? 0) + Math.abs(tx.amount));
  }

  // Fallback "points per day": if claim_time hasn't resolved yet, use the most
  // recent check-in payout (which already includes the multiplier).
  let lastPayout = 0;
  for (let i = transactions.length - 1; i >= 0; i--) {
    const tx = transactions[i];
    if (tx.type === "tax") {
      lastPayout = Math.abs(tx.amount);
      break;
    }
  }

  const hasBonus = multiplier > 1;
  // When the backend reward is known, apply the multiplier (it is the base
  // before the tier multiplier). Otherwise fall back to the last real payout,
  // which already includes the bonus.
  const dailyExpected =
    dailyReward > 0 ? dailyReward * multiplier : lastPayout;
  const bonusPerDay = hasBonus && dailyReward > 0 ? dailyExpected - dailyReward : 0;

  const emptyCell: MonthCell = {
    day: 0,
    inMonth: false,
    isToday: false,
    checked: false,
    points: 0,
    expected: 0,
  };

  // Monday-first offset: JS getDay() is 0=Sunday..6=Saturday.
  const lead = (firstOfMonth.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ ...emptyCell });
  for (let day = 1; day <= daysInMonth; day++) {
    const points = pointsByDay.get(day) ?? 0;
    cells.push({
      day,
      inMonth: true,
      isToday: day === today,
      checked: points > 0,
      points,
      expected: points > 0 ? points : dailyExpected,
    });
  }
  // Pad the last row to full weeks for a clean grid.
  while (cells.length % 7 !== 0) cells.push({ ...emptyCell });

  let checkedCount = 0;
  let monthTotal = 0;
  for (const c of cells) {
    if (c.inMonth && c.checked) checkedCount++;
    monthTotal += c.points;
  }

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return {
    cells,
    monthLabel,
    checkedCount,
    monthTotal,
    dailyExpected,
    hasBonus,
    bonusPerDay,
    multiplier: hasBonus ? multiplier : 1,
  };
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
  const { t } = useI18n();
  const { benefits } = useBenefits();
  const [range, setRange] = useState<RangeKey>("30d");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [dailyClaim, setDailyClaim] = useState<DailyClaimStatus | null>(null);
  const [dailyClaimBusy, setDailyClaimBusy] = useState(false);
  const [dailyClaimError, setDailyClaimError] = useState<string | null>(null);
  const [dailyClaimFlash, setDailyClaimFlash] = useState<number | null>(null);

  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  useEffect(() => {
    if (!user && token) reload();
  }, [user, token, reload]);

  const refreshDailyClaim = useCallback(async () => {
    if (!token) {
      setDailyClaim(null);
      return;
    }
    try {
      const res = await fetch(
        `${API}/claim_time?auth=${encodeURIComponent(token)}`,
      );
      const data = (await res.json().catch(() => ({}))) as DailyClaimStatus;
      if (res.ok) {
        setDailyClaim(data);
      }
    } catch {
      /* ignore - leave previous state intact */
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshDailyClaim();
  }, [token, refreshDailyClaim]);

  const claimDailyPoints = useCallback(async () => {
    if (!token || dailyClaimBusy) return;
    setDailyClaimBusy(true);
    setDailyClaimError(null);
    try {
      const res = await fetch(
        `${API}/claim_daily?auth=${encodeURIComponent(token)}`,
        { method: "GET" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const waitHours =
          data?.wait_hours ?? (data?.wait_time ? Math.ceil(data.wait_time / 3600) : undefined);
        setDailyClaimError(data?.error || t("transactions.claimDailyFailed"));
        if (typeof data?.wait_time === "number") {
          setDailyClaim({
            can_claim: false,
            wait_time: data.wait_time,
            wait_hours: waitHours !== undefined ? String(waitHours) : undefined,
          });
        }
        return;
      }
      const claimed = typeof data?.amount === "number" ? data.amount : data?.reward?.total ?? 0;
      setDailyClaimFlash(claimed);
      await reload();
      await refreshDailyClaim();
      window.setTimeout(() => setDailyClaimFlash(null), 3500);
    } catch {
      setDailyClaimError(t("transactions.claimDailyFailed"));
    } finally {
      setDailyClaimBusy(false);
    }
  }, [token, dailyClaimBusy, reload, refreshDailyClaim, t]);

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
          t(transactionLabelKey(tx.type)),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, range, typeFilter, query, t]);

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
  const dailyReward = dailyClaim?.reward?.total ?? 0;
  const multiplier = Math.max(
    1,
    benefits?.benefits?.daily_credit_multiplier ?? 1,
  );
  const calendar = useMemo(
    () => buildMonthCalendar(transactions, dailyReward, multiplier),
    [transactions, dailyReward, multiplier],
  );

  if (!user) {
    return (
      <AuthRequired
        icon={<Receipt size={28} />}
        title={t("transactions.signInTitle")}
        text={t("transactions.signInText")}
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/me/transactions")}`}
      />
    );
  }

  return (
    <AccountPage layoutClassName={s.wideLayout}>
      <a href="/me" class={s.backLink}>
        <ArrowLeft size={14} /> {t("transactions.backToAccount")}
      </a>

      <WalletCard
        balance={balance}
        status={dailyClaim}
        busy={dailyClaimBusy}
        flash={dailyClaimFlash}
        error={dailyClaimError}
        calendar={calendar}
        onClaim={claimDailyPoints}
        onDismissError={() => setDailyClaimError(null)}
      />

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
                  {t(RANGE_LABELS[r])}
                </button>
              ))}
            </div>
          ) : (
            <span class={s.rangeEmpty}>{t("transactions.rangeEmpty")}</span>
          )}
          <div class={s.searchWrap}>
            <Search size={14} class={s.searchIcon} />
            <input
              class={s.searchInput}
              placeholder={t("transactions.searchPlaceholder")}
              aria-label={t("transactions.searchAria")}
              value={query}
              onInput={(e: any) => setQuery(e.target.value)}
            />
            {query && (
              <button
                class={s.searchClear}
                onClick={() => setQuery("")}
                aria-label={t("transactions.clearAria")}
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
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      <div class={s.summaryGrid}>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("transactions.balanceLabel")}</div>
          <div class={s.summaryValue}>
            {balance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("transactions.incomeLabel")}</div>
          <div class={`${s.summaryValue} ${s.income}`}>
            +
            {stats.totalIncome.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("transactions.spentLabel")}</div>
          <div class={`${s.summaryValue} ${s.expense}`}>
            -
            {stats.totalExpense.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("transactions.netLabel")}</div>
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
        title={t("transactions.creditFlowTitle")}
        subtitle={t("transactions.creditFlowSub", { label: stats.chartLabel })}
        actions={
          <div class={s.chartLegend}>
            <span class={s.chartLegendItem}>
              <span class={`${s.chartLegendDot} ${s.income}`} />{" "}
              {t("transactions.incomeLegend")}
            </span>
            <span class={s.chartLegendItem}>
              <span class={`${s.chartLegendDot} ${s.expense}`} />{" "}
              {t("transactions.expenseLegend")}
            </span>
          </div>
        }
      >
        {stats.daily.length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title={t("transactions.chartNoData")}
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
          title={t("transactions.byTypeTitle")}
          subtitle={t("transactions.byTypeSub")}
        >
          {typeBreakdown.length === 0 ? (
            <EmptyState icon={<Tag size={24} />} title={t("transactions.noActivity")} />
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
                        {t(transactionLabelKey(b.type))}
                      </div>
                      <div class={s.breakdownMeta}>
                        {t("transactions.txCount", { count: b.count })}
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
          title={t("transactions.topCounterpartiesTitle")}
          subtitle={t("transactions.topCounterpartiesSub")}
        >
          {topUsers.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title={t("transactions.noCounterparties")} />
          ) : (
            <div class={s.userList}>
              {topUsers.map((u) => (
                <a key={u.name} href={`/profile/${u.name}`} class={s.userItem}>
                  <UserAvatar username={u.name} className={s.userAvatar} />
                  <div class={s.userInfo}>
                    <div class={s.userName}>@{u.name}</div>
                    <div class={s.userMeta}>
                      {t("transactions.txCount", { count: u.count })}
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
        title={t("transactions.allTransactionsTitle")}
        actions={
          totalPages > 1 && (
            <div class={s.pager}>
              <button
                class={s.pagerBtn}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label={t("transactions.previousPageAria")}
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
                aria-label={t("transactions.nextPageAria")}
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
            title={t("transactions.noMatching")}
            text={t("transactions.noMatchingText")}
          />
        ) : (
          <div class={s.txList}>
            {pageItems.map((row, i) => {
              const tx = row.txs[0];
              const isIncome = isTransactionIncome(tx);
              const Icon = TYPE_ICONS[tx.type]?.icon || Receipt;
              const counterparty = transactionCounterparty(tx);
              const grouped = row.txs.length > 1;
              const totalAmount = row.txs.reduce((sum, t) => sum + t.amount, 0);
              const oldest = row.txs[row.txs.length - 1];
              const sameDay = startOfDay(tx.time) === startOfDay(oldest.time);
              const isOpen = expanded.has(tx.time);
              const title = grouped
                ? t("transactions.dailyCreditsGroup", { n: row.txs.length })
                : describeTransaction(tx, t);
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
                    tabIndex={grouped ? 0 : undefined}
                    onKeyDown={
                      grouped
                        ? (e: KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggle();
                            }
                          }
                        : undefined
                    }
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
                        {t(transactionLabelKey(tx.type))}
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
                                  {describeTransaction(sub, t)}
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
                                    <span>{t("transactions.system")}</span>
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

interface WalletCardProps {
  balance: number;
  status: DailyClaimStatus | null;
  busy: boolean;
  flash: number | null;
  error: string | null;
  calendar: {
    cells: MonthCell[];
    monthLabel: string;
    checkedCount: number;
    monthTotal: number;
    dailyExpected: number;
    hasBonus: boolean;
    bonusPerDay: number;
    multiplier: number;
  };
  onClaim: () => void;
  onDismissError: () => void;
}

function WalletCard({
  balance,
  status,
  busy,
  flash,
  error,
  calendar,
  onClaim,
  onDismissError,
}: WalletCardProps) {
  const { t } = useI18n();
  const reward = status?.reward;

  // Wait time formatting: prefer hours when > 60 minutes.
  const waitSeconds = status && !status.can_claim ? status.wait_time : 0;
  const totalMinutes = Math.max(0, Math.ceil(waitSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const waitText =
    waitSeconds > 0
      ? hours > 0
        ? t("transactions.claimDailyWaitHours", { hours, minutes })
        : t("transactions.claimDailyWaitMinutes", { minutes })
      : "";

  const claimable =
    status != null && status.can_claim === true && reward != null;

  return (
    <AccountSection
      icon={<Wallet size={18} />}
      title={t("transactions.walletTitle")}
      subtitle={
        reward
          ? reward.special_reason || undefined
          : undefined
      }
    >
      <div class={s.walletCard}>
        <div class={s.walletCardLeft}>
          <div class={s.walletIcon}>
            <Wallet size={20} />
          </div>
          <div class={s.walletMeta}>
            <div class={s.walletLabel}>{t("transactions.yourBalance")}</div>
            <div class={s.walletValue}>
              {balance.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              <span class={s.walletUnit}>{t("transactions.pointsUnit")}</span>
            </div>
          </div>
        </div>
        <div class={s.walletAction}>
          {flash != null && flash > 0 ? (
            <div class={s.walletFlash} role="status">
              {t("transactions.claimDailySuccess", { amount: flash })}
            </div>
          ) : null}
          {reward && (
            <div class={s.walletRewardBreakdown}>
              <span class={s.walletBreakdownChip}>
                {t("transactions.rewardBase")} +{reward.base}
              </span>
              {(reward.special_solar > 0 ||
                reward.special_lunar > 0 ||
                reward.special_week > 0 ||
                reward.qingming > 0) && (
                <span class={s.walletBreakdownChipAccent}>
                  {t("transactions.rewardSpecial")} +
                  {reward.special_solar +
                    reward.special_lunar +
                    reward.special_week +
                    reward.qingming}
                </span>
              )}
              <span class={s.walletBreakdownTotal}>
                {t("transactions.rewardTotal")} +{reward.total}
              </span>
            </div>
          )}
          <button
            class={s.walletClaimBtn}
            disabled={!claimable || busy}
            onClick={onClaim}
          >
            <CalendarCheck size={14} />
            <span>
              {busy
                ? t("transactions.claimDailyClaiming")
                : waitSeconds > 0
                  ? t("transactions.claimDailyAlreadyDone")
                  : t("transactions.claimDailyBtn")}
            </span>
          </button>
          {waitSeconds > 0 && (
            <div class={s.walletWait}>{waitText}</div>
          )}
        </div>
      </div>
      {error && (
        <div class={s.walletError} role="alert">
          <span>{error}</span>
          <button
            class={s.walletErrorClose}
            onClick={onDismissError}
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div class={s.checkinCalendar}>
        <div class={s.checkinCalendarHeader}>
          <span class={s.checkinCalendarTitle}>{calendar.monthLabel}</span>
          <span class={s.checkinCalendarSummary}>
            {calendar.hasBonus
              ? t("transactions.checkinSummaryBonus", {
                  count: calendar.checkedCount,
                  points: calendar.monthTotal,
                  bonus: calendar.bonusPerDay,
                  expected: calendar.dailyExpected,
                })
              : t("transactions.checkinSummary", {
                  count: calendar.checkedCount,
                  points: calendar.monthTotal,
                })}
          </span>
        </div>
        <div class={s.checkinWeekRow}>
          {WEEKDAY_KEYS.map((k) => (
            <span key={k} class={s.checkinWeekday}>
              {t(k)}
            </span>
          ))}
        </div>
        <div class={s.checkinGrid}>
          {calendar.cells.map((cell, i) => (
            <div
              key={i}
              class={[
                s.checkinCell,
                !cell.inMonth ? s.checkinCellEmpty : "",
                cell.isToday ? s.checkinCellToday : "",
                cell.checked ? s.checkinCellChecked : "",
              ].join(" ")}
            >
              {cell.inMonth ? (
                <>
                  <span class={s.checkinDay}>{cell.day}</span>
                  {cell.expected > 0 && (
                    <span
                      class={
                        cell.checked
                          ? s.checkinPoints
                          : calendar.hasBonus
                            ? s.checkinExpectedBonus
                            : s.checkinExpected
                      }
                    >
                      +{cell.expected}
                    </span>
                  )}
                  {!cell.checked && calendar.hasBonus && (
                    <span class={s.checkinMultiplierBadge}>
                      {t("transactions.rewardMultiplier", {
                        n: calendar.multiplier,
                      })}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AccountSection>
  );
}
