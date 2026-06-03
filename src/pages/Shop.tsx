import { useEffect, useState, useMemo, useCallback } from "preact/hooks";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth, getToken } from "../lib/auth";
import s from "./Shop.module.css";
import {
  ShoppingBag,
  Search,
  X,
  Star,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  Users,
  Calendar,
  User as UserIcon,
  Coins,
} from "lucide-preact";

type Tab = "shop" | "owned";

type Cosmetic = {
  id: string;
  cosmetic_type: string;
  name: string;
  description: string;
  image_url: string;
  pricing_type: "free" | "paid";
  price: number;
  creator: string;
  creator_pct: number;
  featured: boolean;
  purchases: number;
  created_at: number;
};

interface ShopResponse {
  items: Cosmetic[];
  total: number;
  offset: number;
  limit: number;
}

interface MyCosmetics {
  active_cosmetics: Record<string, Cosmetic>;
  owned_cosmetics: (Cosmetic | string)[];
}

const COSMETICS_API_BASE = "https://api.rotur.dev";

const COSMETIC_TYPES = [
  { value: "", label: "All Items" },
  { value: "overlay", label: "Overlays" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

const AUTH_REDIRECT_BASE = "/auth?return_to=";

type Toast = { id: number; message: string; tone: "info" | "error" };

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div class={s.toastStack}>
      {toasts.map((t) => (
        <div
          key={t.id}
          class={`${s.toast} ${t.tone === "error" ? s.toastError : s.toastInfo}`}
          onClick={() => onDismiss(t.id)}
        >
          {t.tone === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: "info" | "error", autoDismissMs = 3000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (autoDismissMs > 0) {
        setTimeout(() => dismiss(id), autoDismissMs);
      }
    },
    [dismiss],
  );

  return {
    toasts,
    dismiss,
    showInfo: (m: string, opts?: { autoDismissMs?: number }) =>
      push(m, "info", opts?.autoDismissMs),
    showError: (m: string) => push(m, "error"),
  };
}

function ItemSkeleton() {
  return (
    <div class={s.skeletonCard}>
      <div class={s.skeletonImage} />
      <div class={s.skeletonContent}>
        <div class={s.skeletonType} />
        <div class={s.skeletonTitle} />
        <div class={s.skeletonPrice} />
      </div>
    </div>
  );
}

function ActionButton({
  variant = "primary",
  fullWidth,
  loading,
  disabled,
  onClick,
  children,
  title,
}: {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: any;
  title?: string;
}) {
  return (
    <button
      type="button"
      class={`${s.actionButton} ${s[`action_${variant}`]} ${fullWidth ? s.actionFull : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
    >
      {loading && <span class={s.actionSpinner} />}
      {children}
    </button>
  );
}

export function Shop() {
  const { user, reload: reloadUser } = useAuth();
  const { toasts, showInfo, showError, dismiss } = useToasts();

  const [allItems, setAllItems] = useState<Cosmetic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFeatured, setShowFeatured] = useState(false);

  const [tab, setTab] = useState<Tab>("shop");
  const [selectedItem, setSelectedItem] = useState<Cosmetic | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [equipping, setEquipping] = useState(false);
  const [ownedCosmetics, setOwnedCosmetics] = useState<Set<string>>(new Set());
  const [myCosmetics, setMyCosmetics] = useState<MyCosmetics | null>(null);
  const [myLoading, setMyLoading] = useState(false);

  const fetchCosmetics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      const response = await fetch(
        `${COSMETICS_API_BASE}/cosmetics/shop?${params.toString()}`,
      );
      if (!response.ok)
        throw new Error(`Failed to fetch cosmetics: ${response.status}`);
      const data: ShopResponse = await response.json();
      setAllItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cosmetics");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCosmetics = useCallback(async () => {
    if (!user) {
      setOwnedCosmetics(new Set());
      setMyCosmetics(null);
      return;
    }
    setMyLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${COSMETICS_API_BASE}/cosmetics/mine?auth=${encodeURIComponent(token || "")}`,
      );
      if (!res.ok) return;
      const data: MyCosmetics = await res.json();
      setMyCosmetics(data);
      const ownedIds = (data.owned_cosmetics || []).map((item) =>
        typeof item === "string" ? item : item.id,
      );
      setOwnedCosmetics(new Set(ownedIds));
    } catch {
      // ignore
    } finally {
      setMyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCosmetics();
  }, []);

  useEffect(() => {
    fetchMyCosmetics();
  }, [fetchMyCosmetics]);

  const filteredItems = useMemo(() => {
    let items = [...allItems];
    if (typeFilter)
      items = items.filter((item) => item.cosmetic_type === typeFilter);
    if (showFeatured) items = items.filter((item) => item.featured);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.creator.toLowerCase().includes(query),
      );
    }
    switch (sortBy) {
      case "popular":
        items.sort((a, b) => b.purchases - a.purchases);
        break;
      case "price_low":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        items.sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        items.sort((a, b) => b.created_at - a.created_at);
    }
    return items;
  }, [allItems, typeFilter, searchQuery, sortBy, showFeatured]);

  const featuredItems = useMemo(
    () => filteredItems.filter((item) => item.featured).slice(0, 4),
    [filteredItems],
  );
  const regularItems = useMemo(
    () => filteredItems.filter((item) => !item.featured),
    [filteredItems],
  );

  const activeByType = myCosmetics?.active_cosmetics || {};

  const ownedItems = useMemo<Cosmetic[]>(() => {
    const list = myCosmetics?.owned_cosmetics || [];
    const resolved: Cosmetic[] = [];
    for (const entry of list) {
      if (typeof entry === "string") {
        const found = allItems.find((c) => c.id === entry);
        if (found) resolved.push(found);
      } else {
        resolved.push(entry);
      }
    }
    return resolved;
  }, [myCosmetics, allItems]);

  const activeItems = useMemo(
    () => Object.values(activeByType),
    [activeByType],
  );

  function isEquipped(item: Cosmetic): boolean {
    return activeByType[item.cosmetic_type]?.id === item.id;
  }

  const handlePurchase = async (item: Cosmetic) => {
    if (!user) {
      window.location.href = `${AUTH_REDIRECT_BASE}${encodeURIComponent(
        window.location.origin + window.location.pathname + window.location.search,
      )}`;
      return;
    }
    if (ownedCosmetics.has(item.id)) {
      showInfo(`You already own ${item.name}!`, { autoDismissMs: 3000 });
      return;
    }
    setPurchasing(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${COSMETICS_API_BASE}/cosmetics/purchase/${encodeURIComponent(
          item.id,
        )}?auth=${encodeURIComponent(token || "")}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setOwnedCosmetics((prev) => new Set(prev).add(item.id));
        await Promise.all([fetchMyCosmetics(), reloadUser()]);
        showInfo(`Successfully obtained ${item.name}!`, {
          autoDismissMs: 3000,
        });
        setSelectedItem(null);
      } else {
        showError(data.error || "Failed to purchase cosmetic");
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to purchase cosmetic",
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleEquip = async (item: Cosmetic) => {
    if (!user) return;
    setEquipping(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${COSMETICS_API_BASE}/cosmetics/equip/${encodeURIComponent(
          item.id,
        )}?auth=${encodeURIComponent(token || "")}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        await Promise.all([fetchMyCosmetics(), reloadUser()]);
        showInfo(`Equipped ${item.name}!`, { autoDismissMs: 2500 });
      } else {
        showError(data.error || "Failed to equip cosmetic");
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to equip cosmetic",
      );
    } finally {
      setEquipping(false);
    }
  };

  const handleUnequip = async (item: Cosmetic) => {
    if (!user) return;
    setEquipping(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${COSMETICS_API_BASE}/cosmetics/unequip?type=${encodeURIComponent(
          item.cosmetic_type,
        )}&auth=${encodeURIComponent(token || "")}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        await Promise.all([fetchMyCosmetics(), reloadUser()]);
        showInfo(`Unequipped ${item.name}`, { autoDismissMs: 2500 });
      } else {
        showError(data.error || "Failed to unequip cosmetic");
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to unequip cosmetic",
      );
    } finally {
      setEquipping(false);
    }
  };

  const handleItemClick = (item: Cosmetic) => setSelectedItem(item);
  const closeModal = () => setSelectedItem(null);
  const isOwned = (itemId: string) => ownedCosmetics.has(itemId);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && selectedItem) closeModal();
  };
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

  const hasActiveFilters = !!typeFilter || !!searchQuery || showFeatured;

  return (
    <div class={s.page}>
      <Header />
      <div class={s.shopContainer}>
        <div class={s.shopHeader}>
          <div class={s.shopTitleRow}>
            <div class={s.shopIcon}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <h2 class={s.shopTitle}>Cosmetics Shop</h2>
              <p class={s.shopSubtitle}>
                {total > 0
                  ? `${total} cosmetics available`
                  : "Browse and collect cosmetics for your profile"}
              </p>
            </div>
          </div>
          {user && (
            <div class={s.balance}>
              <Coins size={16} />
              <span>{user["sys.currency"].toLocaleString()} credits</span>
            </div>
          )}
        </div>

        <div class={s.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "shop"}
            class={`${s.tab} ${tab === "shop" ? s.tabActive : ""}`}
            onClick={() => setTab("shop")}
          >
            <ShoppingBag size={14} /> Browse Shop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "owned"}
            class={`${s.tab} ${tab === "owned" ? s.tabActive : ""}`}
            onClick={() => setTab("owned")}
          >
            <UserIcon size={14} /> My Cosmetics
            {ownedItems.length > 0 && (
              <span class={s.tabBadge}>{ownedItems.length}</span>
            )}
          </button>
        </div>

        {tab === "shop" ? (
          <ShopTab
            allItems={allItems}
            filteredItems={filteredItems}
            featuredItems={featuredItems}
            regularItems={regularItems}
            loading={loading}
            error={error}
            total={total}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
            sortBy={sortBy}
            showFeatured={showFeatured}
            hasActiveFilters={hasActiveFilters}
            user={user}
            isOwned={isOwned}
            onItemClick={handleItemClick}
            onTypeFilterChange={setTypeFilter}
            onSearchQueryChange={setSearchQuery}
            onSortByChange={setSortBy}
            onShowFeaturedToggle={() => setShowFeatured((v) => !v)}
            onClearFilters={() => {
              setTypeFilter("");
              setSearchQuery("");
              setShowFeatured(false);
            }}
            onRetry={fetchCosmetics}
          />
        ) : (
          <OwnedTab
            user={user}
            loading={myLoading}
            ownedItems={ownedItems}
            activeItems={activeItems}
            isEquipped={isEquipped}
            equipping={equipping}
            username={user?.username ?? "none"}
            onItemClick={handleItemClick}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        )}

        {selectedItem && (
          <ItemModal
            item={selectedItem}
            user={user}
            owned={isOwned(selectedItem.id)}
            equipped={isEquipped(selectedItem)}
            purchasing={purchasing}
            equipping={equipping}
            onClose={closeModal}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
        )}
      </div>
      <Footer />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

// ── Shop tab ──

function ShopTab({
  allItems: _allItems,
  filteredItems,
  featuredItems,
  regularItems,
  loading,
  error,
  total: _total,
  typeFilter,
  searchQuery,
  sortBy,
  showFeatured,
  hasActiveFilters,
  user,
  isOwned,
  onItemClick,
  onTypeFilterChange,
  onSearchQueryChange,
  onSortByChange,
  onShowFeaturedToggle,
  onClearFilters,
  onRetry,
}: {
  allItems: Cosmetic[];
  filteredItems: Cosmetic[];
  featuredItems: Cosmetic[];
  regularItems: Cosmetic[];
  loading: boolean;
  error: string | null;
  total: number;
  typeFilter: string;
  searchQuery: string;
  sortBy: string;
  showFeatured: boolean;
  hasActiveFilters: boolean;
  user: { username: string } | null;
  isOwned: (id: string) => boolean;
  onItemClick: (item: Cosmetic) => void;
  onTypeFilterChange: (v: string) => void;
  onSearchQueryChange: (v: string) => void;
  onSortByChange: (v: string) => void;
  onShowFeaturedToggle: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      <div class={s.controlsRow}>
        <div class={s.searchBox}>
          <Search size={16} class={s.searchIcon} />
          <input
            type="text"
            class={s.searchInput}
            placeholder="Search by name, description, or creator..."
            value={searchQuery}
            onInput={(e) =>
              onSearchQueryChange((e.target as HTMLInputElement).value)
            }
          />
          {searchQuery && (
            <button
              class={s.clearSearch}
              onClick={() => onSearchQueryChange("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div class={s.filters}>
          <select
            class={s.filterSelect}
            value={typeFilter}
            onChange={(e) =>
              onTypeFilterChange((e.target as HTMLSelectElement).value)
            }
          >
            {COSMETIC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            class={s.filterSelect}
            value={sortBy}
            onChange={(e) =>
              onSortByChange((e.target as HTMLSelectElement).value)
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            class={`${s.featuredBtn} ${showFeatured ? s.active : ""}`}
            onClick={onShowFeaturedToggle}
          >
            <Star size={14} /> Featured
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div class={s.activeFilters}>
          <span class={s.filterLabel}>Filtering by:</span>
          {typeFilter && (
            <span class={s.filterTag}>
              Type: {COSMETIC_TYPES.find((t) => t.value === typeFilter)?.label}
              <button onClick={() => onTypeFilterChange("")}>
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery && (
            <span class={s.filterTag}>
              Search: "{searchQuery}"
              <button onClick={() => onSearchQueryChange("")}>
                <X size={12} />
              </button>
            </span>
          )}
          {showFeatured && (
            <span class={s.filterTag}>
              Featured only
              <button onClick={onShowFeaturedToggle}>
                <X size={12} />
              </button>
            </span>
          )}
          <button class={s.clearAll} onClick={onClearFilters}>
            Clear all
          </button>
        </div>
      )}

      {loading && (
        <div class={s.loadingContainer}>
          <div class={s.itemsGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ItemSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
      {error && (
        <div class={s.errorContainer}>
          <div class={s.errorIcon}>
            <AlertCircle size={40} />
          </div>
          <h3>Unable to load cosmetics</h3>
          <p>{error}</p>
          <ActionButton variant="primary" onClick={onRetry}>
            <RefreshCw size={16} /> Try Again
          </ActionButton>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredItems.length === 0 ? (
            <div class={s.emptyContainer}>
              <div class={s.emptyIcon}>
                <Search size={48} />
              </div>
              <h3>No cosmetics found</h3>
              <p>Try adjusting your search or filters.</p>
              <ActionButton variant="secondary" onClick={onClearFilters}>
                Clear Filters
              </ActionButton>
            </div>
          ) : (
            <>
              {!hasActiveFilters && featuredItems.length > 0 && (
                <div class={s.section}>
                  <div class={s.sectionHeader}>
                    <Star size={18} class={s.sectionIcon} />
                    <h3>Featured</h3>
                    <span class={s.sectionCount}>
                      {featuredItems.length} items
                    </span>
                  </div>
                  <div class={s.featuredGrid}>
                    {featuredItems.map((item) => (
                      <div
                        key={item.id}
                        class={`${s.itemCard} ${s.featured} ${isOwned(item.id) ? s.owned : ""}`}
                        onClick={() => onItemClick(item)}
                      >
                        <ItemCardImage
                          item={item}
                          username={user?.username ?? "none"}
                          size={160}
                          showOwnedBadge={isOwned(item.id)}
                        />
                        <ItemCardBody item={item} isOwned={isOwned(item.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <h3>
                    {hasActiveFilters
                      ? `Results (${filteredItems.length})`
                      : "All Cosmetics"}
                  </h3>
                </div>
                <div class={s.itemsGrid}>
                  {(hasActiveFilters ? filteredItems : regularItems).map(
                    (item) => (
                      <div
                        key={item.id}
                        class={`${s.itemCard} ${isOwned(item.id) ? s.owned : ""}`}
                        onClick={() => onItemClick(item)}
                      >
                        <ItemCardImage
                          item={item}
                          username={user?.username ?? "none"}
                          size={140}
                          showFeatured={item.featured && !hasActiveFilters}
                          showOwnedBadge={isOwned(item.id)}
                        />
                        <ItemCardBody
                          item={item}
                          isOwned={isOwned(item.id)}
                          showCreator={false}
                          showStats
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function ItemCardImage({
  item,
  username,
  size,
  showFeatured = false,
  showOwnedBadge = false,
  ownedLabel = "Owned",
}: {
  item: Cosmetic;
  username: string;
  size: number;
  showFeatured?: boolean;
  showOwnedBadge?: boolean;
  ownedLabel?: string;
}) {
  return (
    <div class={s.itemImageContainer}>
      <div class={s.hoverPreview}>
        <UserAvatar
          username={username}
          overlayUrl={item.image_url}
          size={size}
        />
      </div>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} class={s.itemImage} />
      ) : (
        <div class={s.itemImagePlaceholder}>
          <Sparkles size={size > 150 ? 28 : 24} />
        </div>
      )}
      {showFeatured && (
        <div class={s.featuredBadge}>
          <Star size={10} /> Featured
        </div>
      )}
      {showOwnedBadge && (
        <div class={s.ownedBadge}>
          <Check size={12} /> {ownedLabel}
        </div>
      )}
    </div>
  );
}

function ItemCardBody({
  item,
  isOwned: owned,
  showCreator = true,
  showStats = false,
}: {
  item: Cosmetic;
  isOwned: boolean;
  showCreator?: boolean;
  showStats?: boolean;
}) {
  const formatPrice = (price: number, pricingType: string) => {
    if (pricingType === "free" || price === 0) return "Free";
    return `${price} rotur credits`;
  };
  return (
    <div class={s.itemContent}>
      <div class={s.itemType}>{item.cosmetic_type}</div>
      <h4 class={s.itemName}>{item.name}</h4>
      <div class={s.itemMeta}>
        <span class={s.itemPrice}>
          {owned ? "Owned" : formatPrice(item.price, item.pricing_type)}
        </span>
        {showCreator && <span class={s.itemCreator}>by {item.creator}</span>}
        {showStats && (
          <span class={s.itemStats}>
            <Users size={10} /> {item.purchases}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Owned cosmetics tab ──

function OwnedTab({
  user,
  loading,
  ownedItems,
  activeItems,
  isEquipped,
  equipping,
  username,
  onItemClick,
  onEquip,
  onUnequip,
}: {
  user: { username: string } | null;
  loading: boolean;
  ownedItems: Cosmetic[];
  activeItems: Cosmetic[];
  isEquipped: (item: Cosmetic) => boolean;
  equipping: boolean;
  username: string;
  onItemClick: (item: Cosmetic) => void;
  onEquip: (item: Cosmetic) => void;
  onUnequip: (item: Cosmetic) => void;
}) {
  if (!user) {
    return (
      <div class={s.emptyContainer}>
        <div class={s.emptyIcon}>
          <UserIcon size={48} />
        </div>
        <h3>Sign in to view your cosmetics</h3>
        <p>Track and equip everything you've collected.</p>
        <ActionButton
          variant="primary"
          onClick={() => {
            window.location.href = `/auth?return_to=${encodeURIComponent(
              window.location.origin + window.location.pathname + window.location.search,
            )}`;
          }}
        >
          Sign in
        </ActionButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div class={s.loadingContainer}>
        <div class={s.itemsGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (ownedItems.length === 0) {
    return (
      <div class={s.emptyContainer}>
        <div class={s.emptyIcon}>
          <Sparkles size={48} />
        </div>
        <h3>No cosmetics yet</h3>
        <p>Visit the Browse Shop tab to grab your first cosmetic.</p>
      </div>
    );
  }

  const equipped = activeItems;
  const unequipped = ownedItems.filter((i) => !isEquipped(i));

  return (
    <>
      {equipped.length > 0 && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <Check
              size={18}
              class={`${s.sectionIcon} ${s.sectionIconEquipped}`}
            />
            <h3>Equipped</h3>
            <span class={s.sectionCount}>{equipped.length} active</span>
          </div>
          <div class={s.itemsGrid}>
            {equipped.map((item) => (
              <OwnedCard
                key={item.id}
                item={item}
                equipped
                equipping={equipping}
                username={username}
                onItemClick={onItemClick}
                onEquip={onEquip}
                onUnequip={onUnequip}
              />
            ))}
          </div>
        </div>
      )}
      <div class={s.section}>
        <div class={s.sectionHeader}>
          <UserIcon size={18} class={s.sectionIcon} />
          <h3>Owned</h3>
          <span class={s.sectionCount}>{ownedItems.length} items</span>
        </div>
        {unequipped.length === 0 ? (
          <div class={s.emptyContainer}>
            <p>Everything you own is currently equipped.</p>
          </div>
        ) : (
          <div class={s.itemsGrid}>
            {unequipped.map((item) => (
              <OwnedCard
                key={item.id}
                item={item}
                equipped={false}
                equipping={equipping}
                username={username}
                onItemClick={onItemClick}
                onEquip={onEquip}
                onUnequip={onUnequip}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function OwnedCard({
  item,
  equipped,
  equipping,
  username,
  onItemClick,
  onEquip,
  onUnequip,
}: {
  item: Cosmetic;
  equipped: boolean;
  equipping: boolean;
  username: string;
  onItemClick: (item: Cosmetic) => void;
  onEquip: (item: Cosmetic) => void;
  onUnequip: (item: Cosmetic) => void;
}) {
  return (
    <div class={`${s.itemCard} ${s.owned} ${equipped ? s.equipped : ""}`}>
      <div class={s.itemImageContainer} onClick={() => onItemClick(item)}>
        <div class={s.hoverPreview}>
          <UserAvatar
            username={username}
            overlayUrl={item.image_url}
            size={140}
          />
        </div>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} class={s.itemImage} />
        ) : (
          <div class={s.itemImagePlaceholder}>
            <Sparkles size={24} />
          </div>
        )}
        <div class={s.ownedBadge}>
          <Check size={12} /> {equipped ? "Equipped" : "Owned"}
        </div>
      </div>
      <div class={s.itemContent}>
        <div class={s.itemType}>{item.cosmetic_type}</div>
        <h4 class={s.itemName}>{item.name}</h4>
        <div class={s.itemMeta}>
          <span class={s.itemCreator}>by {item.creator}</span>
          <span class={s.itemStats}>
            <Users size={10} /> {item.purchases}
          </span>
        </div>
        <div class={s.ownedActions}>
          {equipped ? (
            <button
              type="button"
              class={`${s.actionButton} ${s.action_secondary}`}
              onClick={() => onUnequip(item)}
              disabled={equipping}
            >
              <X size={14} /> Unequip
            </button>
          ) : (
            <button
              type="button"
              class={`${s.actionButton} ${s.action_primary}`}
              onClick={() => onEquip(item)}
              disabled={equipping}
            >
              <Check size={14} /> Equip
            </button>
          )}
          <button
            type="button"
            class={`${s.actionButton} ${s.action_details} ${s.actionCompact}`}
            onClick={() => onItemClick(item)}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Item modal ──

function ItemModal({
  item,
  user,
  owned,
  equipped,
  purchasing,
  equipping,
  onClose,
  onPurchase,
  onEquip,
  onUnequip,
}: {
  item: Cosmetic;
  user: { username: string } | null;
  owned: boolean;
  equipped: boolean;
  purchasing: boolean;
  equipping: boolean;
  onClose: () => void;
  onPurchase: (item: Cosmetic) => void;
  onEquip: (item: Cosmetic) => void;
  onUnequip: (item: Cosmetic) => void;
}) {
  const formatPrice = (price: number, pricingType: string) => {
    if (pricingType === "free" || price === 0) return "Free";
    return `${price} rotur credits`;
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div class={s.modal} onClick={onClose}>
      <div class={s.modalOverlay} />
      <div class={s.modalContainer} onClick={(e) => e.stopPropagation()}>
        <button class={s.modalClose} onClick={onClose}>
          <X size={20} />
        </button>
        <div class={s.modalContent}>
          <div class={s.modalImageSection}>
            <div class={s.previewContainer}>
              <UserAvatar
                username={user?.username ?? "none"}
                overlayUrl={item.image_url}
                size={250}
              />
            </div>
            {item.featured && (
              <div class={s.modalFeaturedBadge}>
                <Star size={14} /> Featured
              </div>
            )}
          </div>
          <div class={s.modalDetails}>
            <div class={s.modalHeader}>
              <span class={s.modalType}>{item.cosmetic_type}</span>
              <h2 class={s.modalName}>{item.name}</h2>
            </div>
            <p class={s.modalDescription}>{item.description}</p>
            <div class={s.modalStats}>
              <div class={s.modalStatItem}>
                <Users size={16} />
                <span>{item.purchases.toLocaleString()} purchases</span>
              </div>
              <div class={s.modalStatItem}>
                <Calendar size={16} />
                <span>Added {formatDate(item.created_at)}</span>
              </div>
              <div class={s.modalStatItem}>
                <UserIcon size={16} />
                <span>Created by {item.creator}</span>
              </div>
            </div>
            <div class={s.modalFooter}>
              {!owned && (
                <div class={s.modalPrice}>
                  <span class={s.priceLabel}>Price</span>
                  <span class={s.priceValue}>
                    {formatPrice(item.price, item.pricing_type)}
                  </span>
                </div>
              )}
              {owned ? (
                equipped ? (
                  <ActionButton
                    variant="secondary"
                    fullWidth
                    onClick={() => onUnequip(item)}
                    loading={equipping}
                  >
                    <X size={18} /> Unequip
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="primary"
                    fullWidth
                    onClick={() => onEquip(item)}
                    loading={equipping}
                  >
                    <Check size={18} /> Equip
                  </ActionButton>
                )
              ) : (
                <ActionButton
                  variant="primary"
                  fullWidth
                  onClick={() => onPurchase(item)}
                  loading={purchasing}
                >
                  {purchasing
                    ? "Obtaining..."
                    : item.pricing_type === "free" || item.price === 0
                      ? "Obtain for Free"
                      : `Obtain for ${item.price} Rotur Credits`}
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
