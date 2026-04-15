import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import api from "../../services/api";
import { Bell } from "../icons/Icons";
import "../../styles/NotificationBell.css";

const PANEL_WIDTH = 360;
const POLL_MS = 45_000;

const TYPE_CLASS = {
  INFO: "nb-type-info",
  SUCCESS: "nb-type-success",
  WARNING: "nb-type-warning",
  URGENT: "nb-type-urgent",
};

function typeAccentClass(type) {
  const k = String(type || "").toUpperCase();
  return TYPE_CLASS[k] || "nb-type-default";
}

function formatNotifTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * Chuông thông báo: polling unread-count, popup danh sách, đánh dấu đọc / đọc hết.
 * @param {"light"|"dark"} variant — dark cho ck-header (Admin/Manager), light cho topbar sm-page.
 */
function NotificationBell({ variant = "light" }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const [listError, setListError] = useState(null);

  const [panelStyle, setPanelStyle] = useState({});
  const buttonRef = useRef(null);
  const rootRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    const n = await api.getNotificationsUnreadCount();
    setUnreadCount(n);
  }, []);

  useEffect(() => {
    refreshUnread();
    const t = window.setInterval(refreshUnread, POLL_MS);
    return () => window.clearInterval(t);
  }, [refreshUnread]);

  const loadList = useCallback(async () => {
    setListError(null);
    setLoadingList(true);
    try {
      const list = await api.getNotifications();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setListError(e?.message || "Không tải được danh sách thông báo.");
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useLayoutEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const left = Math.min(
        Math.max(8, rect.right - PANEL_WIDTH),
        vw - PANEL_WIDTH - 8,
      );
      setPanelStyle({
        position: "fixed",
        left,
        top: rect.bottom + 8,
        width: PANEL_WIDTH,
        zIndex: 10000,
      });
    }
  }, [open]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    };
    if (open) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [open]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  const toggleOpen = () => {
    setOpen((v) => !v);
  };

  const handleItemClick = async (n) => {
    const wasUnread = !n.read;
    if (wasUnread) {
      try {
        await api.markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await refreshUnread();
      } catch (e) {
        window.alert(e?.message || "Không đánh dấu đã đọc được.");
        return;
      }
    }
    const link = n.referenceLink;
    if (link && String(link).trim()) {
      const s = String(link).trim();
      if (/^https?:\/\//i.test(s)) {
        window.open(s, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(s.startsWith("/") ? s : `/${s}`);
      }
    }
  };

  const handleMarkAll = async () => {
    setMarkAllBusy(true);
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
      await refreshUnread();
    } catch (e) {
      window.alert(e?.message || "Không đánh dấu tất cả đã đọc được.");
    } finally {
      setMarkAllBusy(false);
    }
  };

  const hasUnread = unreadCount > 0;
  const badgeText =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div
      ref={rootRef}
      className={`nb-root ${variant === "dark" ? "nb-variant-dark" : ""}`.trim()}
    >
      <button
        ref={buttonRef}
        type="button"
        className="nb-trigger"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        title="Thông báo"
      >
        <Bell size={17} />
        {hasUnread && badgeText && (
          <span
            className="nb-badge-count"
            aria-label={`${unreadCount} chưa đọc`}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          className="nb-panel"
          style={panelStyle}
          role="dialog"
          aria-label="Danh sách thông báo"
        >
          <div className="nb-panel-header">
            <h2 className="nb-panel-title">Thông báo</h2>
            <button
              type="button"
              className="nb-mark-all"
              onClick={handleMarkAll}
              disabled={
                markAllBusy || items.length === 0 || items.every((x) => x.read)
              }
            >
              {markAllBusy ? "Đang xử lý…" : "Đánh dấu tất cả đã đọc"}
            </button>
          </div>
          {listError && <div className="nb-error">{listError}</div>}
          <div className="nb-list">
            {loadingList && <div className="nb-loading">Đang tải…</div>}
            {!loadingList && !listError && items.length === 0 && (
              <div className="nb-empty">Chưa có thông báo.</div>
            )}
            {!loadingList &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`nb-item ${!n.read ? "nb-unread" : ""}`.trim()}
                  onClick={() => handleItemClick(n)}
                >
                  <span
                    className={`nb-type-bar ${typeAccentClass(n.type)}`}
                    aria-hidden
                  />
                  <div className="nb-item-body">
                    <p className="nb-item-title">{n.title || "Thông báo"}</p>
                    {n.message ? (
                      <p className="nb-item-msg">{n.message}</p>
                    ) : null}
                    <div className="nb-item-meta">
                      {formatNotifTime(n.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
