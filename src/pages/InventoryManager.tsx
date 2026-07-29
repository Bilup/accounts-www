import { useState, useEffect, useRef } from "preact/hooks";
import {
  Package,
  ShoppingBag,
  PlusCircle,
  Coins,
  ArrowLeft,
  Search,
  Trash2,
  Tag,
  Send,
  Link2,
} from "lucide-preact";
import {
  AccountPage,
  AccountSection,
  AccountTabPanel,
  AccountTabs,
  AuthRequired,
  EmptyState,
} from "../components/AccountPage";
import { useAuth, getToken } from "../lib/auth";
import { useConfirm } from "../components/ConfirmDialog";
import { useI18n } from "../i18n/i18n";
import s from "./InventoryManager.module.css";

const API_BASE_URL = "https://api.accounts.bilup.org";

interface InventoryItem {
  name: string;
  description?: string;
  price: number | string;
  selling: boolean;
  owner?: string;
  author: string;
  created: number;
  total_income?: number | string;
  transfer_history?: TransferRecord[];
}

interface TransferRecord {
  type: string;
  from?: string;
  to?: string;
  price?: number | string;
  timestamp: number;
}

type TabName = "my-items" | "marketplace" | "create-item";

const TABS: { id: TabName; labelKey: string; icon: typeof Package }[] = [
  { id: "my-items", labelKey: "inventory.myItems", icon: Package },
  { id: "marketplace", labelKey: "inventory.marketplace", icon: ShoppingBag },
  { id: "create-item", labelKey: "inventory.createItem", icon: PlusCircle },
];

function createSafeId(name: string): string {
  return btoa(encodeURIComponent(name)).replace(/[^a-zA-Z0-9]/g, "");
}

function formatPrice(price: number | string | undefined): number {
  return parseInt(String(price ?? 0)) || 0;
}

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString();
}

export function InventoryManager() {
  const { user } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const currentUser = user?.username || "";
  const [userCurrency, setUserCurrency] = useState(0);
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabName>("my-items");
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [viewNotFound, setViewNotFound] = useState<string | null>(null);
  // Key of the money action currently in flight, so a second click can't double-charge.
  const [busy, setBusy] = useState<string | null>(null);

  const [myItems, setMyItems] = useState<InventoryItem[]>([]);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState<InventoryItem[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createSelling, setCreateSelling] = useState(false);
  const [createData, setCreateData] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageType, setCreateMessageType] = useState<
    "success" | "error"
  >("success");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [itemMessages, setItemMessages] = useState<
    Record<string, { text: string; type: "success" | "error" }>
  >({});

  const [expandedHistory, setExpandedHistory] = useState<
    Record<string, boolean>
  >({});

  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const transferInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [singleItemMsg, setSingleItemMsg] = useState("");
  const [singleItemErr, setSingleItemErr] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewItem = params.get("view");

    if (viewItem) {
      loadSingleItem(decodeURIComponent(viewItem));
      const url = new URL(location.href);
      url.searchParams.delete("view");
      history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (currentUser && !viewingItem) {
      loadMyItems();
      loadMarketplace();
      refreshUserCurrency();
    }
  }, [currentUser, viewingItem]);

  async function refreshUserCurrency() {
    const t = getToken();
    if (!t) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/get_user?auth=${encodeURIComponent(t)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setUserCurrency(data["sys.currency"] || 0);
      }
    } catch {
      /* ignore */
    }
  }

  async function loadMyItems() {
    if (!currentUser) return;
    setMyItemsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/list/${encodeURIComponent(currentUser)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMyItems(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
    setMyItemsLoading(false);
  }

  async function loadMarketplace() {
    setMarketplaceLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/selling`);
      const data = await res.json();
      if (res.ok) {
        setMarketplaceItems(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
    setMarketplaceLoading(false);
  }

  async function loadSingleItem(itemName: string) {
    try {
      let item: InventoryItem | null = null;

      const mpRes = await fetch(`${API_BASE_URL}/items/selling`);
      if (mpRes.ok) {
        const mpData: InventoryItem[] = await mpRes.json();
        item = mpData.find((i) => i.name === itemName) || null;
      }

      if (!item && currentUser) {
        const uRes = await fetch(
          `${API_BASE_URL}/items/list/${encodeURIComponent(currentUser)}?auth=${encodeURIComponent(getToken() || "")}`,
        );
        if (uRes.ok) {
          const uData: InventoryItem[] = await uRes.json();
          item = uData.find((i) => i.name === itemName) || null;
        }
      }

      if (!item) {
        const sRes = await fetch(
          `${API_BASE_URL}/items/search?name=${encodeURIComponent(itemName)}`,
        );
        if (sRes.ok) {
          const sData: InventoryItem[] = await sRes.json();
          if (sData.length > 0) item = sData[0];
        }
      }

      if (item) {
        setViewingItem(item);
      } else {
        setViewNotFound(itemName);
      }
    } catch {
      setViewNotFound(itemName);
    }
  }

  function setItemMessage(
    safeId: string,
    text: string,
    type: "success" | "error",
  ) {
    setItemMessages((prev) => ({ ...prev, [safeId]: { text, type } }));
    setTimeout(() => {
      setItemMessages((prev) => {
        const next = { ...prev };
        delete next[safeId];
        return next;
      });
    }, 5000);
  }

  async function putItemForSale(itemName: string) {
    const safeId = createSafeId(itemName);
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/sell/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const result = await res.json();
      if (res.ok) {
        setItemMessage(safeId, "Item put up for sale!", "success");
        loadMyItems();
        loadMarketplace();
        refreshUserCurrency();
      } else {
        setItemMessage(
          safeId,
          result.error || "Failed to put item for sale",
          "error",
        );
      }
    } catch {
      setItemMessage(safeId, "Network error occurred", "error");
    }
  }

  async function stopSelling(itemName: string) {
    const safeId = createSafeId(itemName);
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/stop_selling/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const result = await res.json();
      if (res.ok) {
        setItemMessage(safeId, "Item removed from sale!", "success");
        loadMyItems();
        loadMarketplace();
        refreshUserCurrency();
      } else {
        setItemMessage(
          safeId,
          result.error || "Failed to stop selling",
          "error",
        );
      }
    } catch {
      setItemMessage(safeId, "Network error occurred", "error");
    }
  }

  async function updatePrice(itemName: string, safeId: string) {
    const input = priceInputRefs.current[safeId];
    const newPrice = parseInt(input?.value || "0") || 0;
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/set_price/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}&price=${newPrice}`,
      );
      const result = await res.json();
      if (res.ok) {
        setItemMessage(
          safeId,
          `Price updated to ${newPrice} credits!`,
          "success",
        );
        loadMyItems();
        loadMarketplace();
      } else {
        setItemMessage(
          safeId,
          result.error || "Failed to update price",
          "error",
        );
      }
    } catch {
      setItemMessage(safeId, "Network error occurred", "error");
    }
  }

  async function transferItem(itemName: string, safeId: string) {
    const input = transferInputRefs.current[safeId];
    const targetUser = (input?.value || "").trim();
    if (!targetUser) {
      setItemMessage(safeId, "Target username is required", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/transfer/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}&username=${encodeURIComponent(targetUser)}`,
      );
      const result = await res.json();
      if (res.ok) {
        setItemMessage(safeId, `Transferred to ${targetUser}!`, "success");
        loadMyItems();
        if (input) input.value = "";
      } else {
        setItemMessage(
          safeId,
          result.error || "Failed to transfer item",
          "error",
        );
      }
    } catch {
      setItemMessage(safeId, "Network error occurred", "error");
    }
  }

  async function deleteItem(itemName: string) {
    const ok = await confirm({
      title: `Delete "${itemName}"?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete item",
      danger: true,
    });
    if (!ok) return;
    const safeId = createSafeId(itemName);
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/delete/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const result = await res.json();
      if (res.ok) {
        loadMyItems();
        loadMarketplace();
      } else {
        setItemMessage(
          safeId,
          result.error || "Failed to delete item",
          "error",
        );
      }
    } catch {
      setItemMessage(safeId, "Network error occurred", "error");
    }
  }

  async function buySingleItem() {
    if (!viewingItem || !currentUser || busy) return;
    const itemName = viewingItem.name;
    const ok = await confirm({
      title: `Buy "${itemName}"?`,
      message: `${formatPrice(viewingItem.price)} credits will be deducted from your balance.`,
      confirmLabel: "Buy item",
    });
    if (!ok) return;
    setBusy("single");
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/buy/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const result = await res.json();
      if (res.ok) {
        await refreshUserCurrency();
        loadSingleItem(itemName);
        setSingleItemMsg("Item purchased successfully!");
        setSingleItemErr("");
        setTimeout(() => setSingleItemMsg(""), 5000);
      } else {
        setSingleItemErr(result.error || "Failed to purchase item");
        setSingleItemMsg("");
      }
    } catch {
      setSingleItemErr("Network error occurred");
      setSingleItemMsg("");
    } finally {
      setBusy(null);
    }
  }

  async function createNewItem() {
    if (createSubmitting) return;
    if (!createName.trim()) {
      setCreateMessage("Item name is required");
      setCreateMessageType("error");
      return;
    }

    // Parse first: a network failure must not be reported as bad JSON.
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(createData.trim() || "{}");
    } catch {
      setCreateMessage("Item data is not valid JSON");
      setCreateMessageType("error");
      return;
    }

    setCreateSubmitting(true);
    try {
      const itemData = {
        name: createName.trim(),
        description: createDescription.trim(),
        price: parseInt(createPrice) || 0,
        selling: createSelling,
        data: parsedData,
      };
      const res = await fetch(
        `${API_BASE_URL}/items/create?auth=${encodeURIComponent(getToken() || "")}&item=${encodeURIComponent(JSON.stringify(itemData))}`,
      );
      const result = await res.json();
      if (res.ok) {
        setCreateMessage(`Item "${createName.trim()}" created successfully!`);
        setCreateMessageType("success");
        setCreateName("");
        setCreateDescription("");
        setCreatePrice("");
        setCreateSelling(false);
        setCreateData("");
        loadMyItems();
        loadMarketplace();
        refreshUserCurrency();
        setTimeout(() => setCreateMessage(""), 5000);
      } else {
        setCreateMessage(result.error || "Failed to create item");
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage("Network error — the item was not created");
      setCreateMessageType("error");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateDescription("");
    setCreatePrice("");
    setCreateSelling(false);
    setCreateData("");
    setCreateMessage("");
  }

  // msgKey must match the key the calling card reads its message from; the
  // single-item view has its own message slot instead.
  async function copyItemLink(itemName: string, msgKey?: string) {
    const url = `${location.origin}${location.pathname}?view=${encodeURIComponent(itemName)}`;

    const report = (text: string, type: "success" | "error") => {
      if (msgKey) setItemMessage(msgKey, text, type);
      else if (type === "success") {
        setSingleItemMsg(text);
        setSingleItemErr("");
        setTimeout(() => setSingleItemMsg(""), 5000);
      } else {
        setSingleItemErr(text);
        setSingleItemMsg("");
      }
    };

    try {
      await navigator.clipboard.writeText(url);
      report("Link copied!", "success");
    } catch {
      // clipboard API is unavailable outside secure contexts — fall back
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      report(
        ok ? "Link copied!" : "Couldn't copy link",
        ok ? "success" : "error",
      );
    }
  }

  const filteredMarketplaceItems = marketplaceItems.filter((item) => {
    if (!marketplaceSearch.trim()) return true;
    const q = marketplaceSearch.toLowerCase().trim();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.owner && item.owner.toLowerCase().includes(q)) ||
      (item.author && item.author.toLowerCase().includes(q))
    );
  });

  function handleTabChange(tab: TabName) {
    setActiveTab(tab);
    if (tab === "my-items" && currentUser) loadMyItems();
    if (tab === "marketplace") loadMarketplace();
  }

  async function buyItemMarketplace(itemName: string, safeId: string) {
    const key = `mp-${safeId}`;
    if (busy) return;
    const ok = await confirm({
      title: `Buy "${itemName}"?`,
      message: "The price will be deducted from your balance.",
      confirmLabel: "Buy item",
    });
    if (!ok) return;
    setBusy(key);
    try {
      const res = await fetch(
        `${API_BASE_URL}/items/buy/${encodeURIComponent(itemName)}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const result = await res.json();
      if (res.ok) {
        setItemMessage(key, "Item purchased successfully!", "success");
        loadMyItems();
        loadMarketplace();
        refreshUserCurrency();
      } else {
        setItemMessage(key, result.error || "Failed to purchase item", "error");
      }
    } catch {
      setItemMessage(key, "Network error occurred", "error");
    } finally {
      setBusy(null);
    }
  }

  if (viewingItem) {
    const item = viewingItem;
    const isOwnItem =
      item.owner &&
      currentUser &&
      item.owner.toLowerCase() === currentUser.toLowerCase();

    return (
      <AccountPage>
        {confirmDialog}
        <button
          class={s.backBtn}
          onClick={() => {
            setViewingItem(null);
            setSingleItemMsg("");
            setSingleItemErr("");
          }}
        >
          <ArrowLeft size={14} /> {t("inventory.backToInventory")}
        </button>

        <div class={s.singleItemCard}>
          <h2 class={s.singleItemName}>
            {item.name}
            <button
              class={s.copyBtn}
              onClick={() => copyItemLink(item.name)}
              title={t("inventory.copyLink")}
              aria-label={`${t("inventory.copyLink")}: ${item.name}`}
            >
              <Link2 size={14} />
            </button>
          </h2>
          <div class={s.singleItemDescription}>
            {item.description || t("inventory.noDescriptionAvailable")}
          </div>
          <div class={s.singleItemPrice}>{formatPrice(item.price)} {t("inventory.credits")}</div>
          <div
            class={`${s.saleStatus} ${item.selling ? s.forSale : s.notForSale}`}
          >
            {item.selling ? t("inventory.forSale") : t("inventory.notForSale")}
          </div>
          <div class={s.singleItemMeta}>
            <div>
              <strong>{t("inventory.owner")}</strong> {item.owner || item.author}
            </div>
            <div>
              <strong>{t("inventory.author")}</strong> {item.author}
            </div>
            <div>
              <strong>{t("inventory.created")}</strong> {formatDate(item.created)}
            </div>
            {item.total_income !== undefined && (
              <div>
                <strong>{t("inventory.totalIncome")}</strong> {formatPrice(item.total_income)}{" "}
                {t("inventory.credits")}
              </div>
            )}
          </div>
          <div class={s.singleItemActions}>
            {item.selling && user && !isOwnItem && (
              <button
                class={s.btnPrimary}
                onClick={buySingleItem}
                disabled={busy === "single"}
              >
                <Coins size={14} />{" "}
                {busy === "single"
                  ? t("inventory.purchasing")
                  : t("inventory.buyItem", { price: String(formatPrice(item.price)) })}
              </button>
            )}
            {isOwnItem && <div class={s.ownItemNotice}>{t("inventory.thisIsYourItem")}</div>}
            {!item.selling && !isOwnItem && (
              <div class={s.notForSaleNotice}>
                {t("inventory.notForSaleNotice")}
              </div>
            )}
          </div>
          {singleItemMsg && <div class={s.success}>{singleItemMsg}</div>}
          {singleItemErr && <div class={s.error}>{singleItemErr}</div>}
        </div>
      </AccountPage>
    );
  }

  // A shared ?view= link to a deleted/renamed item must say so, not silently
  // drop the visitor onto the normal inventory page.
  if (viewNotFound) {
    return (
      <AccountPage>
        <EmptyState
          icon={<Package size={24} />}
          title={t("inventory.itemNotFound")}
          text={t("inventory.itemNotFoundText", { name: viewNotFound })}
        >
          <button
            class={s.btnPrimary}
            onClick={() => setViewNotFound(null)}
            disabled={!currentUser}
          >
            <ArrowLeft size={14} /> {t("inventory.backToInventoryBtn")}
          </button>
        </EmptyState>
      </AccountPage>
    );
  }

  // The single-item `?view=` link stays public; only the manager itself needs auth.
  if (!currentUser) {
    return (
      <AuthRequired
        icon={<Package size={28} />}
        title={t("inventory.signInToManage")}
        text={t("inventory.signInText")}
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/inventory-manager")}`}
      />
    );
  }

  return (
    <AccountPage
      title={t("inventory.title")}
      subtitle={t("inventory.subtitle")}
    >
      {confirmDialog}
      <AccountTabs
        tabs={TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))}
        active={activeTab}
        onChange={handleTabChange}
        ariaLabel="Inventory sections"
      />

      <AccountTabPanel>
        {activeTab === "my-items" && (
          <AccountSection
            icon={<Package size={18} />}
            title={t("inventory.yourItems")}
            subtitle={
              <>
                {myItems.length} items &bull; {userCurrency} {t("inventory.credits")}
              </>
            }
          >
            {myItemsLoading && <div class={s.loading}>{t("inventory.loadingItems")}</div>}
            {!myItemsLoading && myItems.length === 0 && (
              <EmptyState
                icon={<Package size={24} />}
                title={t("inventory.noItems")}
                text={t("inventory.noItemsText")}
              />
            )}
            <div class={s.itemGrid}>
              {myItems.map((item) => {
                const safeId = createSafeId(item.name);
                const msg = itemMessages[safeId];
                return (
                  <div key={item.name} class={s.itemCard}>
                    <div class={s.itemHeader}>
                      <h3 class={s.itemName}>{item.name}</h3>
                      {item.selling ? (
                        <span class={`${s.itemTag} ${s.forSale}`}>
                          {t("inventory.forSale")}
                        </span>
                      ) : (
                        <span class={`${s.itemTag} ${s.notForSale}`}>
                          {t("inventory.private")}
                        </span>
                      )}
                    </div>
                    <div class={s.itemDescription}>
                      {item.description || t("inventory.noDescription")}
                    </div>
                    <div class={s.itemPrice}>
                      {formatPrice(item.price)} {t("inventory.credits")}
                    </div>
                    <div class={s.itemInfo}>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>{t("inventory.created")}</span>
                        <span class={s.itemInfoValue}>
                          {formatDate(item.created)}
                        </span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>{t("inventory.income")}</span>
                        <span class={s.itemInfoValue}>
                          {formatPrice(item.total_income)} {t("inventory.credits")}
                        </span>
                      </div>
                    </div>

                    {item.transfer_history &&
                      item.transfer_history.length > 0 && (
                        <div>
                          <button
                            class={s.transferHistoryToggle}
                            onClick={() =>
                              setExpandedHistory((prev) => ({
                                ...prev,
                                [safeId]: !prev[safeId],
                              }))
                            }
                          >
                            {expandedHistory[safeId]
                              ? t("inventory.hideHistory")
                              : t("inventory.viewHistory")}
                          </button>
                          {expandedHistory[safeId] && (
                            <div class={s.transferHistory}>
                              {item.transfer_history.map((t, idx) => (
                                <div key={idx} class={s.transferItem}>
                                  {t.type === "creation"
                                    ? "Created"
                                    : t.type === "transfer"
                                      ? `Transferred from ${t.from || ""} to ${t.to || ""}`
                                      : t.type === "purchase"
                                        ? `Purchased by ${t.to || ""} for ${formatPrice(t.price)} credits`
                                        : "Unknown"}
                                  {" - "}
                                  {formatDate(t.timestamp)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    <div class={s.itemActions}>
                      {!item.selling ? (
                        <button
                          class={s.btnPrimary}
                          onClick={() => putItemForSale(item.name)}
                        >
                          <Tag size={14} /> {t("inventory.putForSale")}
                        </button>
                      ) : (
                        <button
                          class={s.btnSecondary}
                          onClick={() => stopSelling(item.name)}
                        >
                          {t("inventory.stopSelling")}
                        </button>
                      )}
                    </div>
                    <div class={s.actionRow}>
                      <input
                        ref={(el) => {
                          priceInputRefs.current[safeId] = el;
                        }}
                        type="number"
                        class={s.formInput}
                        defaultValue={formatPrice(item.price)}
                        min={0}
                        placeholder={t("inventory.price")}
                        aria-label={`New price for ${item.name}`}
                      />
                      <button
                        class={s.btnSecondary}
                        onClick={() => updatePrice(item.name, safeId)}
                      >
                        <Tag size={14} /> {t("inventory.updatePrice")}
                      </button>
                    </div>
                    <div class={s.actionRow}>
                      <input
                        ref={(el) => {
                          transferInputRefs.current[safeId] = el;
                        }}
                        type="text"
                        class={s.formInput}
                        placeholder="Username"
                        aria-label={`Transfer ${item.name} to username`}
                      />
                      <button
                        class={s.btnSecondary}
                        onClick={() => transferItem(item.name, safeId)}
                      >
                        <Send size={14} /> {t("inventory.transfer")}
                      </button>
                    </div>
                    <div class={s.actionRow}>
                      <button
                        class={s.btnDanger}
                        onClick={() => deleteItem(item.name)}
                      >
                        <Trash2 size={14} /> {t("inventory.deleteItem")}
                      </button>
                    </div>
                    {msg && (
                      <div class={msg.type === "success" ? s.success : s.error}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AccountSection>
        )}

        {activeTab === "marketplace" && (
          <AccountSection
            icon={<ShoppingBag size={18} />}
            title={t("inventory.marketplace")}
            subtitle={`${marketplaceItems.length} items for sale`}
          >
            <div class={s.searchRow}>
              <input
                type="text"
                class={s.searchInput}
                placeholder={t("inventory.searchItems")}
                value={marketplaceSearch}
                onInput={(e) =>
                  setMarketplaceSearch((e.target as HTMLInputElement).value)
                }
              />
            </div>
            {marketplaceLoading && (
              <div class={s.loading}>{t("inventory.loadingMarketplace")}</div>
            )}
            {!marketplaceLoading && marketplaceItems.length === 0 && (
              <EmptyState
                icon={<ShoppingBag size={24} />}
                title={t("inventory.noItemsForSale")}
                text={t("inventory.noItemsMarketplace")}
              />
            )}
            {!marketplaceLoading &&
              marketplaceItems.length > 0 &&
              filteredMarketplaceItems.length === 0 && (
                <EmptyState
                  icon={<Search size={24} />}
                  title={t("inventory.noResults")}
                  text={t("inventory.noResultsText")}
                />
              )}
            <div class={s.itemGrid}>
              {filteredMarketplaceItems.map((item) => {
                const safeId = createSafeId(item.name);
                const msg = itemMessages[`mp-${safeId}`];
                const isOwn =
                  item.owner &&
                  currentUser &&
                  item.owner.toLowerCase() === currentUser.toLowerCase();
                return (
                  <div key={item.name} class={s.itemCard}>
                    <div class={s.itemHeader}>
                      <h3 class={s.itemName}>{item.name}</h3>
                      <button
                        class={s.copyBtn}
                        onClick={() => copyItemLink(item.name, `mp-${safeId}`)}
                        title="Copy link to this item"
                        aria-label={`Copy link to ${item.name}`}
                      >
                        <Link2 size={14} />
                      </button>
                    </div>
                    <div class={s.itemDescription}>
                      {item.description || t("inventory.noDescription")}
                    </div>
                    <div class={s.itemPrice}>
                      {formatPrice(item.price)} {t("inventory.credits")}
                    </div>
                    <div class={s.itemInfo}>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>{t("inventory.owner")}</span>
                        <span class={s.itemInfoValue}>{item.owner || ""}</span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>{t("inventory.author")}</span>
                        <span class={s.itemInfoValue}>{item.author}</span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>{t("inventory.created")}</span>
                        <span class={s.itemInfoValue}>
                          {formatDate(item.created)}
                        </span>
                      </div>
                    </div>
                    <div class={s.itemActions}>
                      {!isOwn ? (
                        <button
                          class={s.btnPrimary}
                          onClick={() => buyItemMarketplace(item.name, safeId)}
                          disabled={busy === `mp-${safeId}`}
                        >
                          <Coins size={14} />{" "}
                          {busy === `mp-${safeId}`
                            ? t("inventory.purchasing")
                            : t("inventory.buyItem", { price: String(formatPrice(item.price)) })}
                        </button>
                      ) : (
                        <div class={s.ownItemNotice}>{t("inventory.thisIsYourItem")}</div>
                      )}
                    </div>
                    {msg && (
                      <div class={msg.type === "success" ? s.success : s.error}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AccountSection>
        )}

        {activeTab === "create-item" && (
          <AccountSection
            icon={<PlusCircle size={18} />}
            title={t("inventory.createNewItem")}
            subtitle={t("inventory.createSubtitle")}
          >
            <div class={s.formGroup}>
              <label for="item-name">{t("inventory.itemName")}</label>
              <input
                type="text"
                id="item-name"
                class={s.formInput}
                placeholder={t("inventory.itemNamePlaceholder")}
                maxlength={50}
                value={createName}
                onInput={(e) =>
                  setCreateName((e.target as HTMLInputElement).value)
                }
              />
              <small class={s.formHint}>
                {t("inventory.itemNameHint")}
              </small>
            </div>

            <div class={s.formGroup}>
              <label for="item-description">{t("inventory.description")}</label>
              <textarea
                id="item-description"
                class={s.formInput}
                placeholder={t("inventory.descriptionPlaceholder")}
                maxlength={500}
                rows={4}
                value={createDescription}
                onInput={(e) =>
                  setCreateDescription((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {t("inventory.descriptionHint")}
              </small>
            </div>

            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label for="item-price">{t("inventory.priceCredits")}</label>
                <input
                  type="number"
                  id="item-price"
                  class={s.formInput}
                  placeholder="0"
                  min={0}
                  max={999999}
                  value={createPrice}
                  onInput={(e) =>
                    setCreatePrice((e.target as HTMLInputElement).value)
                  }
                />
                <small class={s.formHint}>{t("inventory.setYourPrice")}</small>
              </div>
            </div>

            <div class={s.formGroup}>
              <div class={s.checkboxGroup}>
                <input
                  type="checkbox"
                  id="item-selling"
                  checked={createSelling}
                  onChange={(e) =>
                    setCreateSelling((e.target as HTMLInputElement).checked)
                  }
                />
                <label for="item-selling">{t("inventory.putForSaleImmediate")}</label>
              </div>
              <small class={s.formHint}>
                {t("inventory.putForSaleHint")}
              </small>
            </div>

            <div class={s.formGroup}>
              <label for="item-data">{t("inventory.privateData")}</label>
              <textarea
                id="item-data"
                class={s.formInput}
                placeholder='{"key": "value"}'
                rows={3}
                value={createData}
                onInput={(e) =>
                  setCreateData((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {t("inventory.privateDataHint")}
              </small>
            </div>

            <div class={s.formActions}>
              <button
                class={s.btnPrimary}
                onClick={createNewItem}
                disabled={createSubmitting}
              >
                <PlusCircle size={14} />{" "}
                {createSubmitting ? t("inventory.creating") : t("inventory.createItem")}
              </button>
              <button class={s.btnSecondary} onClick={resetCreateForm}>
                {t("inventory.clearForm")}
              </button>
            </div>

            {createMessage && (
              <div
                class={createMessageType === "success" ? s.success : s.error}
              >
                {createMessage}
              </div>
            )}
          </AccountSection>
        )}
      </AccountTabPanel>
    </AccountPage>
  );
}
