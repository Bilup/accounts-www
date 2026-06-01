import { useState, useEffect, useCallback } from "preact/hooks";
import {
  Smartphone,
  UserCheck,
  ScrollText,
  Trash2,
  Copy,
} from "lucide-preact";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import {
  useAuth,
  getToken,
  formatRelativeTime,
  formatDateTime,
} from "../lib/auth";
import s from "./Notifications.module.css";

const API_BASE_URL = "https://api.rotur.dev";

type Tab = "devices" | "senders" | "log";

interface Endpoint {
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  source: string;
  created_at: number;
}

interface AllowedSender {
  username: string;
  count: number;
}

interface AllowedSource {
  senders: AllowedSender[];
}

interface NotifyLogItem {
  from: string;
  source: string;
  title: string;
  body?: string;
  at: number;
}

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

function truncate(text: string, len: number): string {
  if (text.length <= len) return text;
  return text.slice(0, len) + "…";
}

export function Notifications() {
  const { user, reload } = useAuth();
  const currentUser = user?.username || "";
  const [tab, setTab] = useState<Tab>("devices");

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);

  const [allowed, setAllowed] = useState<Record<string, AllowedSource>>({});
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [newSender, setNewSender] = useState("");
  const [newSource, setNewSource] = useState("");

  const [log, setLog] = useState<NotifyLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  function flash(text: string, type: "success" | "error") {
    setStatusMsg({ text, type });
    window.setTimeout(() => setStatusMsg(null), 4000);
  }

  // ── Data loading ──

  const fetchEndpoints = useCallback(async () => {
    setEndpointsLoading(true);
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/endpoints?auth=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.endpoints)) {
        setEndpoints(data.endpoints);
      } else {
        setEndpoints([]);
        if (data.error) flash(data.error, "error");
      }
    } catch {
      flash("Network error loading devices", "error");
    }
    setEndpointsLoading(false);
  }, []);

  const fetchAllowed = useCallback(async () => {
    setAllowedLoading(true);
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/allowed?auth=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (res.ok && data && typeof data === "object") {
        const map: Record<string, AllowedSource> = {};
        for (const [source, value] of Object.entries(data)) {
          if (
            value &&
            typeof value === "object" &&
            Array.isArray((value as AllowedSource).senders)
          ) {
            map[source] = value as AllowedSource;
          }
        }
        setAllowed(map);
      } else {
        setAllowed({});
        if (data.error) flash(data.error, "error");
      }
    } catch {
      flash("Network error loading allowed senders", "error");
    }
    setAllowedLoading(false);
  }, []);

  const fetchLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/log?auth=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.log)) {
        setLog(data.log);
      } else {
        setLog([]);
        if (data.error) flash(data.error, "error");
      }
    } catch {
      flash("Network error loading log", "error");
    }
    setLogLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (tab === "devices") fetchEndpoints();
    if (tab === "senders") fetchAllowed();
    if (tab === "log") fetchLog();
  }, [tab, user, fetchEndpoints, fetchAllowed, fetchLog]);

  // ── Auth ──



  // ── Actions ──

  async function deleteDevice(deviceId: string) {
    if (
      !confirm("Remove this device? It will no longer receive notifications.")
    )
      return;
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/device/${encodeURIComponent(deviceId)}?auth=${encodeURIComponent(token)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        flash("Device removed", "success");
        fetchEndpoints();
      } else {
        flash(data.error || "Failed to remove device", "error");
      }
    } catch {
      flash("Network error", "error");
    }
  }

  async function allowSender() {
    const username = newSender.trim().toLowerCase();
    const source = newSource.trim();
    if (!username) {
      flash("Username is required", "error");
      return;
    }
    if (!source) {
      flash("Source is required", "error");
      return;
    }
    if (currentUser && username === currentUser.toLowerCase()) {
      flash("You cannot add yourself as an allowed sender", "error");
      return;
    }
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/allowed/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        flash(`Allowed ${username} for ${source}`, "success");
        setNewSender("");
        setNewSource("");
        fetchAllowed();
        reload();
      } else {
        flash(data.error || "Failed to allow sender", "error");
      }
    } catch {
      flash("Network error", "error");
    }
  }

  async function removeSender(username: string, source: string) {
    if (
      !confirm(`Revoke ${username}'s permission to notify you from ${source}?`)
    )
      return;
    try {
      const token = getToken() || "";
      const res = await fetch(
        `${API_BASE_URL}/notify/allowed/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}&source=${encodeURIComponent(source)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        flash(`Removed ${username} from ${source}`, "success");
        fetchAllowed();
        reload();
      } else {
        flash(data.error || "Failed to remove sender", "error");
      }
    } catch {
      flash("Network error", "error");
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied`, "success");
    } catch {
      flash("Failed to copy", "error");
    }
  }

  // ── Render ──

  const senderSources = Object.keys(allowed).sort();
  const totalSenders = senderSources.reduce(
    (sum, src) => sum + (allowed[src]?.senders.length || 0),
    0,
  );

  return (
    <div class={s.page}>
      <Header />
      <div class={s.wrapper}>
        <h1 class={s.title}>Notifications</h1>
        <div class={s.rule} />
        <p class={s.sub}>
          Manage your push notification devices, control who is allowed to send
          you notifications, and review your recent notification history.
        </p>

      {user && (
        <>
          <div class={s.userInfo}>
            <div>
              <div class={s.welcomeText}>
                Welcome, <strong>{escapeHtml(currentUser)}</strong>
              </div>
              <p class={s.welcomeSub}>
                {endpoints.length} device{endpoints.length !== 1 ? "s" : ""} ·{" "}
                {totalSenders} allowed sender{totalSenders !== 1 ? "s" : ""} ·{" "}
                {log.length} log entr{log.length !== 1 ? "ies" : "y"}
              </p>
            </div>
          </div>

            {/* Tabs */}
            <div class={s.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={tab === "devices"}
                class={`${s.tab} ${tab === "devices" ? s.tabActive : ""}`}
                onClick={() => setTab("devices")}
              >
                <Smartphone size={15} /> Devices
                <span class={s.tabCount}>{endpoints.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === "senders"}
                class={`${s.tab} ${tab === "senders" ? s.tabActive : ""}`}
                onClick={() => setTab("senders")}
              >
                <UserCheck size={15} /> Allowed Senders
                <span class={s.tabCount}>{totalSenders}</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === "log"}
                class={`${s.tab} ${tab === "log" ? s.tabActive : ""}`}
                onClick={() => setTab("log")}
              >
                <ScrollText size={15} /> Log
                <span class={s.tabCount}>{log.length}</span>
              </button>
            </div>

            {statusMsg && (
              <div class={statusMsg.type === "success" ? s.success : s.error}>
                {statusMsg.text}
              </div>
            )}

            {/* Devices */}
            {tab === "devices" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div>
                    <h2 class={s.sectionTitle}>Registered Devices</h2>
                    <p class={s.sectionSub}>
                      Each device is identified by a server-generated ID derived
                      from your username, the source app, and a device
                      fingerprint. Removing a device stops it from receiving
                      notifications.
                    </p>
                  </div>
                  <button
                    class={`${s.invBtn} ${s.invBtnSecondary}`}
                    onClick={fetchEndpoints}
                  >
                    Refresh
                  </button>
                </div>

                {endpointsLoading && (
                  <div class={s.loading}>Loading devices…</div>
                )}
                {!endpointsLoading && endpoints.length === 0 && (
                  <div class={s.empty}>
                    No devices registered. Install or open a Rotur app that
                    supports push notifications to register a device.
                  </div>
                )}

                {endpoints.map((ep) => (
                  <div key={ep.device_id} class={s.card}>
                    <div class={s.cardHeader}>
                      <div>
                        <div class={s.deviceId}>
                          {ep.device_id}
                          <button
                            class={s.copyBtn}
                            onClick={() => copyText(ep.device_id, "Device ID")}
                            title="Copy device ID"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div class={s.cardMeta}>
                          <span class={s.sourceTag}>{ep.source}</span>
                          <span>Added {formatRelativeTime(ep.created_at)}</span>
                          <span title={formatDateTime(ep.created_at)}>
                            {formatDateTime(ep.created_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        class={`${s.invBtn} ${s.invBtnDanger}`}
                        onClick={() => deleteDevice(ep.device_id)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                    <div class={s.endpointBox} title={ep.endpoint}>
                      {truncate(ep.endpoint, 90)}
                    </div>
                    <div class={s.endpointMeta}>
                      <span>p256dh: {truncate(ep.p256dh, 32)}</span>
                      <span>auth: {truncate(ep.auth, 24)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Allowed senders */}
            {tab === "senders" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div>
                    <h2 class={s.sectionTitle}>Allowed Senders</h2>
                    <p class={s.sectionSub}>
                      By default, no one can send you notifications. Allow
                      specific users per source to receive alerts from them.
                      Counts show how many notifications each sender has
                      delivered.
                    </p>
                  </div>
                  <button
                    class={`${s.invBtn} ${s.invBtnSecondary}`}
                    onClick={fetchAllowed}
                  >
                    Refresh
                  </button>
                </div>

                <div class={s.addForm}>
                  <h3 class={s.addFormTitle}>Allow a New Sender</h3>
                  <div class={s.formRow}>
                    <div class={s.formGroup}>
                      <label for="allow-username">Username</label>
                      <input
                        id="allow-username"
                        type="text"
                        class={s.formInput}
                        placeholder="e.g. mist"
                        value={newSender}
                        onInput={(e) =>
                          setNewSender((e.target as HTMLInputElement).value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            allowSender();
                          }
                        }}
                      />
                    </div>
                    <div class={s.formGroup}>
                      <label for="allow-source">Source</label>
                      <input
                        id="allow-source"
                        type="text"
                        class={s.formInput}
                        placeholder="e.g. originChats"
                        value={newSource}
                        onInput={(e) =>
                          setNewSource((e.target as HTMLInputElement).value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            allowSender();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <button
                    class={`${s.invBtn} ${s.invBtnPrimary}`}
                    onClick={allowSender}
                  >
                    Allow Sender
                  </button>
                </div>

                {allowedLoading && (
                  <div class={s.loading}>Loading allowed senders…</div>
                )}
                {!allowedLoading && senderSources.length === 0 && (
                  <div class={s.empty}>
                    You haven't allowed any senders yet. Add one above to get
                    started.
                  </div>
                )}

                {senderSources.map((source) => {
                  const senders = allowed[source]?.senders || [];
                  if (senders.length === 0) return null;
                  return (
                    <div key={source} class={s.sourceGroup}>
                      <div class={s.sourceGroupHeader}>
                        <span class={s.sourceTag}>{source}</span>
                        <span class={s.sourceCount}>
                          {senders.length} sender
                          {senders.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {senders.map((snd) => (
                        <div
                          key={`${source}:${snd.username}`}
                          class={s.senderItem}
                        >
                          <div class={s.senderInfo}>
                            <div class={s.senderName}>
                              {escapeHtml(snd.username)}
                            </div>
                            <div class={s.senderCount}>
                              {snd.count} notification
                              {snd.count !== 1 ? "s" : ""} sent
                            </div>
                          </div>
                          <button
                            class={`${s.invBtn} ${s.invBtnSecondary}`}
                            onClick={() => removeSender(snd.username, source)}
                          >
                            <Trash2 size={12} /> Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Log */}
            {tab === "log" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div>
                    <h2 class={s.sectionTitle}>Notification Log</h2>
                    <p class={s.sectionSub}>
                      The most recent 200 notifications you've received.
                    </p>
                  </div>
                  <button
                    class={`${s.invBtn} ${s.invBtnSecondary}`}
                    onClick={fetchLog}
                  >
                    Refresh
                  </button>
                </div>

                {logLoading && <div class={s.loading}>Loading log…</div>}
                {!logLoading && log.length === 0 && (
                  <div class={s.empty}>
                    No notifications have been delivered yet.
                  </div>
                )}

                {log.map((entry, i) => (
                  <div key={`${entry.at}-${i}`} class={s.logItem}>
                    <div class={s.logHeader}>
                      <div class={s.logTitle}>{escapeHtml(entry.title)}</div>
                      <div class={s.logTime} title={formatDateTime(entry.at)}>
                        {formatRelativeTime(entry.at)}
                      </div>
                    </div>
                    {entry.body && (
                      <div class={s.logBody}>{escapeHtml(entry.body)}</div>
                    )}
                    <div class={s.logMeta}>
                      <span class={s.sourceTag}>{entry.source}</span>
                      <span>
                        from <strong>@{escapeHtml(entry.from)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p class={s.footerNote}>
              <a
                href="https://docs.rotur.dev/assorted-apis/notifications"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the full notifications API documentation →
              </a>
            </p>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
