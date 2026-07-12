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
import s from "./InventoryManager.module.css";

const API_BASE_URL = "https://api.rotur.dev";

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

const TABS: { id: TabName; label: string; icon: typeof Package }[] = [
  { id: "my-items", label: "My Items", icon: Package },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { id: "create-item", label: "Create Item", icon: PlusCircle },
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
          <ArrowLeft size={14} /> Back to Inventory
        </button>

        <div class={s.singleItemCard}>
          <h2 class={s.singleItemName}>
            {item.name}
            <button
              class={s.copyBtn}
              onClick={() => copyItemLink(item.name)}
              title="Copy link to this item"
              aria-label={`Copy link to ${item.name}`}
            >
              <Link2 size={14} />
            </button>
          </h2>
          <div class={s.singleItemDescription}>
            {item.description || "No description available"}
          </div>
          <div class={s.singleItemPrice}>{formatPrice(item.price)} credits</div>
          <div
            class={`${s.saleStatus} ${item.selling ? s.forSale : s.notForSale}`}
          >
            {item.selling ? "For Sale" : "Not For Sale"}
          </div>
          <div class={s.singleItemMeta}>
            <div>
              <strong>Owner:</strong> {item.owner || item.author}
            </div>
            <div>
              <strong>Author:</strong> {item.author}
            </div>
            <div>
              <strong>Created:</strong> {formatDate(item.created)}
            </div>
            {item.total_income !== undefined && (
              <div>
                <strong>Total Income:</strong> {formatPrice(item.total_income)}{" "}
                credits
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
                  ? "Purchasing…"
                  : `Buy for ${formatPrice(item.price)} credits`}
              </button>
            )}
            {isOwnItem && <div class={s.ownItemNotice}>This is your item</div>}
            {!item.selling && !isOwnItem && (
              <div class={s.notForSaleNotice}>
                This item is not currently for sale
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
          title="Item not found"
          text={`We couldn't find an item called "${viewNotFound}". It may have been deleted or renamed.`}
        >
          <button
            class={s.btnPrimary}
            onClick={() => setViewNotFound(null)}
            disabled={!currentUser}
          >
            <ArrowLeft size={14} /> Back to inventory
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
        title="Sign in to manage inventory"
        text="Sign in to create, buy, sell, and manage your items."
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/inventory-manager")}`}
      />
    );
  }

  return (
    <AccountPage
      title="Inventory Manager"
      subtitle="Create, buy, sell, and manage your items"
    >
      {confirmDialog}
      <AccountTabs
        tabs={TABS}
        active={activeTab}
        onChange={handleTabChange}
        ariaLabel="Inventory sections"
      />

      <AccountTabPanel>
        {activeTab === "my-items" && (
          <AccountSection
            icon={<Package size={18} />}
            title="Your Items"
            subtitle={
              <>
                {myItems.length} items &bull; {userCurrency} credits
              </>
            }
          >
            {myItemsLoading && <div class={s.loading}>Loading your items…</div>}
            {!myItemsLoading && myItems.length === 0 && (
              <EmptyState
                icon={<Package size={24} />}
                title="No items yet"
                text="Create your first item in the Create Item tab."
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
                          For Sale
                        </span>
                      ) : (
                        <span class={`${s.itemTag} ${s.notForSale}`}>
                          Private
                        </span>
                      )}
                    </div>
                    <div class={s.itemDescription}>
                      {item.description || "No description"}
                    </div>
                    <div class={s.itemPrice}>
                      {formatPrice(item.price)} credits
                    </div>
                    <div class={s.itemInfo}>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>Created:</span>
                        <span class={s.itemInfoValue}>
                          {formatDate(item.created)}
                        </span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>Income:</span>
                        <span class={s.itemInfoValue}>
                          {formatPrice(item.total_income)} credits
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
                              ? "Hide Transfer History"
                              : "View Transfer History"}
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
                          <Tag size={14} /> Put For Sale
                        </button>
                      ) : (
                        <button
                          class={s.btnSecondary}
                          onClick={() => stopSelling(item.name)}
                        >
                          Stop Selling
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
                        placeholder="Price"
                        aria-label={`New price for ${item.name}`}
                      />
                      <button
                        class={s.btnSecondary}
                        onClick={() => updatePrice(item.name, safeId)}
                      >
                        <Tag size={14} /> Update Price
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
                        <Send size={14} /> Transfer
                      </button>
                    </div>
                    <div class={s.actionRow}>
                      <button
                        class={s.btnDanger}
                        onClick={() => deleteItem(item.name)}
                      >
                        <Trash2 size={14} /> Delete Item
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
            title="Marketplace"
            subtitle={`${marketplaceItems.length} items for sale`}
          >
            <div class={s.searchRow}>
              <input
                type="text"
                class={s.searchInput}
                placeholder="Search items by name, description, or owner…"
                value={marketplaceSearch}
                onInput={(e) =>
                  setMarketplaceSearch((e.target as HTMLInputElement).value)
                }
              />
            </div>
            {marketplaceLoading && (
              <div class={s.loading}>Loading marketplace…</div>
            )}
            {!marketplaceLoading && marketplaceItems.length === 0 && (
              <EmptyState
                icon={<ShoppingBag size={24} />}
                title="No items for sale"
                text="No items are currently listed in the marketplace."
              />
            )}
            {!marketplaceLoading &&
              marketplaceItems.length > 0 &&
              filteredMarketplaceItems.length === 0 && (
                <EmptyState
                  icon={<Search size={24} />}
                  title="No results"
                  text="No items match your search."
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
                      {item.description || "No description"}
                    </div>
                    <div class={s.itemPrice}>
                      {formatPrice(item.price)} credits
                    </div>
                    <div class={s.itemInfo}>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>Owner:</span>
                        <span class={s.itemInfoValue}>{item.owner || ""}</span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>Author:</span>
                        <span class={s.itemInfoValue}>{item.author}</span>
                      </div>
                      <div class={s.itemInfoRow}>
                        <span class={s.itemInfoLabel}>Created:</span>
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
                            ? "Purchasing…"
                            : `Buy for ${formatPrice(item.price)} credits`}
                        </button>
                      ) : (
                        <div class={s.ownItemNotice}>This is your item</div>
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
            title="Create New Item"
            subtitle="Fill in the details to create a new inventory item"
          >
            <div class={s.formGroup}>
              <label for="item-name">Item Name</label>
              <input
                type="text"
                id="item-name"
                class={s.formInput}
                placeholder="Enter a unique name for your item"
                maxlength={50}
                value={createName}
                onInput={(e) =>
                  setCreateName((e.target as HTMLInputElement).value)
                }
              />
              <small class={s.formHint}>
                Choose a descriptive name (max 50 characters)
              </small>
            </div>

            <div class={s.formGroup}>
              <label for="item-description">Description</label>
              <textarea
                id="item-description"
                class={s.formInput}
                placeholder="Describe your item in detail…"
                maxlength={500}
                rows={4}
                value={createDescription}
                onInput={(e) =>
                  setCreateDescription((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                Provide a clear description (max 500 characters)
              </small>
            </div>

            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label for="item-price">Price (credits)</label>
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
                <small class={s.formHint}>Set your asking price</small>
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
                <label for="item-selling">Put up for sale immediately</label>
              </div>
              <small class={s.formHint}>
                Enable this to make the item available in the marketplace
              </small>
            </div>

            <div class={s.formGroup}>
              <label for="item-data">Private Data (JSON)</label>
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
                Optional: Store private metadata in JSON format
              </small>
            </div>

            <div class={s.formActions}>
              <button
                class={s.btnPrimary}
                onClick={createNewItem}
                disabled={createSubmitting}
              >
                <PlusCircle size={14} />{" "}
                {createSubmitting ? "Creating…" : "Create Item"}
              </button>
              <button class={s.btnSecondary} onClick={resetCreateForm}>
                Clear Form
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
