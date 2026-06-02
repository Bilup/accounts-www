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
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useAuth, getToken } from "../lib/auth";
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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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
  const currentUser = user?.username || "";
  const [userCurrency, setUserCurrency] = useState(0);

  const [activeTab, setActiveTab] = useState<TabName>("my-items");
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);

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
      }
    } catch {
      /* ignore */
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
        setItemMessage(
          safeId,
          `Transferred to ${escapeHtml(targetUser)}!`,
          "success",
        );
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
    if (
      !confirm(
        `Are you sure you want to delete "${itemName}"? This cannot be undone.`,
      )
    )
      return;
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
    if (!viewingItem || !currentUser) return;
    const itemName = viewingItem.name;
    if (!confirm(`Are you sure you want to buy "${itemName}"?`)) return;
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
    }
  }

  async function createNewItem() {
    if (!createName.trim()) {
      setCreateMessage("Item name is required");
      setCreateMessageType("error");
      return;
    }
    try {
      const itemData = {
        name: createName.trim(),
        description: createDescription.trim(),
        price: parseInt(createPrice) || 0,
        selling: createSelling,
        data: JSON.parse(createData.trim() || "{}"),
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
      setCreateMessage("Invalid JSON data or network error");
      setCreateMessageType("error");
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

  async function copyItemLink(itemName: string) {
    const url = `${location.origin}${location.pathname}?view=${encodeURIComponent(itemName)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
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
    if (!confirm(`Are you sure you want to buy "${itemName}"?`)) return;
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
    }
  }

  if (viewingItem) {
    const item = viewingItem;
    const isOwnItem =
      item.owner &&
      currentUser &&
      item.owner.toLowerCase() === currentUser.toLowerCase();

    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
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
                {escapeHtml(item.name)}
                <button
                  class={s.copyBtn}
                  onClick={() => copyItemLink(item.name)}
                  title="Copy link to this item"
                >
                  <Link2 size={14} />
                </button>
              </h2>
              <div class={s.singleItemDescription}>
                {escapeHtml(item.description || "No description available")}
              </div>
              <div class={s.singleItemPrice}>
                {formatPrice(item.price)} credits
              </div>
              <div
                class={`${s.saleStatus} ${item.selling ? s.forSale : s.notForSale}`}
              >
                {item.selling ? "For Sale" : "Not For Sale"}
              </div>
              <div class={s.singleItemMeta}>
                <div>
                  <strong>Owner:</strong>{" "}
                  {escapeHtml(item.owner || item.author)}
                </div>
                <div>
                  <strong>Author:</strong> {escapeHtml(item.author)}
                </div>
                <div>
                  <strong>Created:</strong> {formatDate(item.created)}
                </div>
                {item.total_income !== undefined && (
                  <div>
                    <strong>Total Income:</strong>{" "}
                    {formatPrice(item.total_income)} credits
                  </div>
                )}
              </div>
              <div class={s.singleItemActions}>
                {item.selling && user && !isOwnItem && (
                  <button class={s.btnPrimary} onClick={buySingleItem}>
                    <Coins size={14} /> Buy for {formatPrice(item.price)}{" "}
                    credits
                  </button>
                )}
                {isOwnItem && (
                  <div class={s.ownItemNotice}>This is your item</div>
                )}
                {!item.selling && !isOwnItem && (
                  <div class={s.notForSaleNotice}>
                    This item is not currently for sale
                  </div>
                )}
              </div>
              {singleItemMsg && <div class={s.success}>{singleItemMsg}</div>}
              {singleItemErr && <div class={s.error}>{singleItemErr}</div>}
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
          <div class={s.pageHeader}>
            <div>
              <h1 class={s.pageTitle}>Inventory Manager</h1>
              <p class={s.pageSubtitle}>
                Create, buy, sell, and manage your items
              </p>
            </div>
          </div>

          <div class={s.tabsBar} role="tablist" aria-label="Inventory sections">
            <div class={s.tabs}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  class={`${s.tab} ${activeTab === id ? s.tabActive : ""}`}
                  onClick={() => handleTabChange(id)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" class={s.tabPanel}>
            {activeTab === "my-items" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <Package size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Your Items</h2>
                      <p class={s.sectionSubtitle}>
                        {myItems.length} items &bull; {userCurrency} credits
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  {myItemsLoading && (
                    <div class={s.loading}>Loading your items…</div>
                  )}
                  {!myItemsLoading && myItems.length === 0 && (
                    <div class={s.empty}>
                      <div class={s.emptyIcon}>
                        <Package size={24} />
                      </div>
                      <div class={s.emptyTitle}>No items yet</div>
                      <div class={s.emptyText}>
                        Create your first item in the Create Item tab.
                      </div>
                    </div>
                  )}
                  <div class={s.itemGrid}>
                    {myItems.map((item) => {
                      const safeId = createSafeId(item.name);
                      const msg = itemMessages[safeId];
                      return (
                        <div key={item.name} class={s.itemCard}>
                          <div class={s.itemHeader}>
                            <h3 class={s.itemName}>{escapeHtml(item.name)}</h3>
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
                            {escapeHtml(item.description || "No description")}
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
                                            ? `Transferred from ${escapeHtml(t.from || "")} to ${escapeHtml(t.to || "")}`
                                            : t.type === "purchase"
                                              ? `Purchased by ${escapeHtml(t.to || "")} for ${formatPrice(t.price)} credits`
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
                            <div
                              class={
                                msg.type === "success" ? s.success : s.error
                              }
                            >
                              {msg.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "marketplace" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Marketplace</h2>
                      <p class={s.sectionSubtitle}>
                        {marketplaceItems.length} items for sale
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  <div class={s.searchRow}>
                    <input
                      type="text"
                      class={s.searchInput}
                      placeholder="Search items by name, description, or owner…"
                      value={marketplaceSearch}
                      onInput={(e) =>
                        setMarketplaceSearch(
                          (e.target as HTMLInputElement).value,
                        )
                      }
                    />
                  </div>
                  {marketplaceLoading && (
                    <div class={s.loading}>Loading marketplace…</div>
                  )}
                  {!marketplaceLoading && marketplaceItems.length === 0 && (
                    <div class={s.empty}>
                      <div class={s.emptyIcon}>
                        <ShoppingBag size={24} />
                      </div>
                      <div class={s.emptyTitle}>No items for sale</div>
                      <div class={s.emptyText}>
                        No items are currently listed in the marketplace.
                      </div>
                    </div>
                  )}
                  {!marketplaceLoading &&
                    marketplaceItems.length > 0 &&
                    filteredMarketplaceItems.length === 0 && (
                      <div class={s.empty}>
                        <div class={s.emptyIcon}>
                          <Search size={24} />
                        </div>
                        <div class={s.emptyTitle}>No results</div>
                        <div class={s.emptyText}>
                          No items match your search.
                        </div>
                      </div>
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
                            <h3 class={s.itemName}>{escapeHtml(item.name)}</h3>
                            <button
                              class={s.copyBtn}
                              onClick={() => copyItemLink(item.name)}
                              title="Copy link to this item"
                            >
                              <Link2 size={14} />
                            </button>
                          </div>
                          <div class={s.itemDescription}>
                            {escapeHtml(item.description || "No description")}
                          </div>
                          <div class={s.itemPrice}>
                            {formatPrice(item.price)} credits
                          </div>
                          <div class={s.itemInfo}>
                            <div class={s.itemInfoRow}>
                              <span class={s.itemInfoLabel}>Owner:</span>
                              <span class={s.itemInfoValue}>
                                {escapeHtml(item.owner || "")}
                              </span>
                            </div>
                            <div class={s.itemInfoRow}>
                              <span class={s.itemInfoLabel}>Author:</span>
                              <span class={s.itemInfoValue}>
                                {escapeHtml(item.author)}
                              </span>
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
                                onClick={() =>
                                  buyItemMarketplace(item.name, safeId)
                                }
                              >
                                <Coins size={14} /> Buy for{" "}
                                {formatPrice(item.price)} credits
                              </button>
                            ) : (
                              <div class={s.ownItemNotice}>
                                This is your item
                              </div>
                            )}
                          </div>
                          {msg && (
                            <div
                              class={
                                msg.type === "success" ? s.success : s.error
                              }
                            >
                              {msg.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "create-item" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Create New Item</h2>
                      <p class={s.sectionSubtitle}>
                        Fill in the details to create a new inventory item
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
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
                        setCreateDescription(
                          (e.target as HTMLTextAreaElement).value,
                        )
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
                          setCreateSelling(
                            (e.target as HTMLInputElement).checked,
                          )
                        }
                      />
                      <label for="item-selling">
                        Put up for sale immediately
                      </label>
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
                    <button class={s.btnPrimary} onClick={createNewItem}>
                      <PlusCircle size={14} /> Create Item
                    </button>
                    <button class={s.btnSecondary} onClick={resetCreateForm}>
                      Clear Form
                    </button>
                  </div>

                  {createMessage && (
                    <div
                      class={
                        createMessageType === "success" ? s.success : s.error
                      }
                    >
                      {createMessage}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
