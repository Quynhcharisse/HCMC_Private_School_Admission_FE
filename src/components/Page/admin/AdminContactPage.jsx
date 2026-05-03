import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Avatar, Box, CircularProgress, IconButton, InputBase, Paper, Typography} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import Divider from "@mui/material/Divider";
import {
  connectPrivateMessageSocket,
  removePrivateMessageListener,
  sendMessage,
  toLocalDateTimeIso,
} from "../../../services/WebSocketService.jsx";
import {APP_PRIMARY_DARK} from "../../../constants/homeLandingTheme";
import {getCampusConversationsForAdmin} from "../../../services/ConversationService.jsx";
import {getAdminMessagesHistory, markAdminMessagesRead} from "../../../services/MessageService.jsx";

const CONTACT_LABEL_FALLBACK = "Trường học";
const CONTACT_PRINCIPAL = "Trường học EduBridge";
const ADMIN_CONTACT_CONVERSATION_ID = 1;

const isSameConversationId = (a, b) => a != null && b != null && String(a) === String(b);

const extractConversationIdFromObject = (o) => {
  if (!o || typeof o !== "object") return null;
  const r =
    o.conversationId ??
    o.conversation_id ??
    o.conversationID ??
    o.threadId ??
    o.roomId ??
    o?.conversation?.id ??
    o?.conversation?.conversationId ??
    o?.chatMessage?.conversationId ??
    o?.message?.conversationId ??
    o?.message?.conversation?.id ??
    o?.chatMessage?.conversation?.id ??
    o?.data?.conversationId ??
    o?.dto?.conversationId ??
    o?.chatDto?.conversationId ??
    o?.privateConversationId ??
    o?.chatRoomId ??
    o?.privateRoomId ??
    null;
  if (r == null || r === "") return null;
  return r;
};

const pickIncomingConversationId = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  let body = payload;
  if (typeof payload.body === "string") {
    try {
      body = JSON.parse(payload.body);
    } catch {
      body = payload;
    }
  } else if (payload.body && typeof payload.body === "object") {
    body = payload.body;
  }
  let raw = extractConversationIdFromObject(body) ?? extractConversationIdFromObject(payload) ?? null;
  if (raw == null && typeof body?.message === "string") {
    const t = body.message.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        const inner = JSON.parse(body.message);
        raw = extractConversationIdFromObject(inner);
      } catch {
        /* ignore */
      }
    }
  }
  if (raw == null) {
    const nested = [body?.data, payload?.data, body?.payload, payload?.payload];
    for (let i = 0; i < nested.length; i += 1) {
      const n = nested[i];
      if (n && typeof n === "object") {
        raw = extractConversationIdFromObject(n);
        if (raw != null) break;
      }
    }
  }
  if (raw == null && body && typeof body === "object" && body.data && typeof body.data === "object") {
    raw = extractConversationIdFromObject(body.data);
  }
  if (raw == null || raw === "") return null;
  return raw;
};

const unwrapWsPayload = (p) => {
  if (!p || typeof p !== "object") return p;
  if (typeof p.body === "string") {
    try {
      return JSON.parse(p.body);
    } catch {
      return p;
    }
  }
  if (p.body && typeof p.body === "object") return p.body;
  return p;
};

/** Gộp frame STOMP, body đã unwrap và `data` lồng — BE có thể đặt id ở lớp bất kỳ. */
const mergeChatPayload = (payload) => {
  const root = unwrapWsPayload(payload);
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? {...payload} : {};
  const r = root && typeof root === "object" && !Array.isArray(root) ? root : {};
  const nestedData = r?.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : {};
  return {...base, ...r, ...nestedData};
};

const normalizeMessage = (m) => {
  const id = m?.id ?? m?.messageId ?? m?.clientMessageId ?? `${m?.sentAt || Date.now()}-${Math.random()}`;
  const text = m?.content ?? m?.message ?? m?.text ?? "";
  const sender =
    m?.senderEmail ??
    m?.sender ??
    m?.senderName ??
    m?.from ??
    m?.username ??
    m?.createdBy ??
    m?.senderId ??
    "";
  const sentAt = m?.sentAt ?? m?.createdAt ?? m?.timestamp ?? m?.time ?? null;
  return {id: String(id), text, sender, sentAt, raw: m};
};

const mergeUniqueMessages = (messages) => {
  const map = new Map();
  (messages || []).forEach((m) => {
    const id = m?.id ?? m?.messageId ?? m?.clientMessageId;
    if (id != null) map.set(String(id), m);
  });
  const arr = Array.from(map.values());
  return arr.sort((a, b) => {
    const aTimeRaw = a?.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bTimeRaw = b?.sentAt ? new Date(b.sentAt).getTime() : 0;
    const aTime = Number.isFinite(aTimeRaw) ? aTimeRaw : 0;
    const bTime = Number.isFinite(bTimeRaw) ? bTimeRaw : 0;
    return aTime - bTime;
  });
};

const formatMessageTime = (value) => {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleTimeString("vi-VN", {hour: "2-digit", minute: "2-digit"});
  } catch {
    return String(value);
  }
};

const normalizePrincipal = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/^["'<\s]+|["'>\s]+$/g, "");

const parseBodyObject = (value) => {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value : {};
};

const readConversationUnreadCount = (item) => {
  if (!item || typeof item !== "object") return 0;
  const u = Number(
    item.unreadCount ??
      item.unreadMessages ??
      item.unreadMessageCount ??
      item.unread ??
      0
  );
  if (!Number.isFinite(u) || u <= 0) return 0;
  return Math.min(99, Math.trunc(u));
};

const extractItemsArray = (obj) => {
  if (!obj || typeof obj !== "object") return [];
  const keys = ["items", "content", "data", "records", "conversations", "list"];
  for (let i = 0; i < keys.length; i += 1) {
    const v = obj[keys[i]];
    if (Array.isArray(v) && v.length) return v;
  }
  return [];
};

/** Lấy mảng conversation từ GET /admin/conversation (hỗ trợ body lồng). */
const extractAdminConversationList = (responseData) => {
  const envelope = parseBodyObject(responseData);
  const topBody = parseBodyObject(envelope?.body);
  let list = extractItemsArray(topBody);
  if (!list.length) {
    const inner = parseBodyObject(topBody?.body);
    list = extractItemsArray(inner);
  }
  if (!list.length) list = extractItemsArray(envelope);
  if (!list.length) {
    const first = pickFirstConversationItem(responseData);
    return first ? [first] : [];
  }
  return list;
};

const emitAdminContactUnreadAggregate = (list) => {
  if (typeof window === "undefined") return;
  const arr = Array.isArray(list) ? list : [];
  const conversationsWithUnread = Math.min(
    99,
    arr.filter((c) => Number(c._unreadCount) > 0).length
  );
  const totalUnreadMessages = Math.min(
    99,
    arr.reduce((s, c) => s + Math.max(0, Number(c._unreadCount) || 0), 0)
  );
  window.dispatchEvent(
    new CustomEvent("admin-contact-unread-aggregate", {
      detail: {conversationsWithUnread, totalUnreadMessages},
    })
  );
};

const pickFirstConversationItem = (responseData) => {
  const envelope = parseBodyObject(responseData);
  const topBody = parseBodyObject(envelope?.body);
  const innerBody = parseBodyObject(topBody?.body);

  const roots = [innerBody, topBody, envelope]
    .filter((x) => x && typeof x === "object");

  for (let i = 0; i < roots.length; i += 1) {
    const r = roots[i];
    if (Array.isArray(r?.items) && r.items.length) return r.items[0];
    if (Array.isArray(r?.content) && r.content.length) return r.content[0];
    if (Array.isArray(r?.data) && r.data.length) return r.data[0];
  }
  return null;
};

export default function AdminContactPage() {
  const userInfo = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const myPrincipal = (userInfo?.email || userInfo?.username || userInfo?.userName || "").trim();
  const myPrincipalLower = normalizePrincipal(myPrincipal);
  const [messageItems, setMessageItems] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationLoadError, setConversationLoadError] = useState("");
  const [conversationLabel, setConversationLabel] = useState(CONTACT_LABEL_FALLBACK);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [conversationId, setConversationId] = useState(ADMIN_CONTACT_CONVERSATION_ID);
  const [receiverCampusEmail, setReceiverCampusEmail] = useState("");
  const [senderAdminEmail, setSenderAdminEmail] = useState("");
  const [selectedCampusId, setSelectedCampusId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messageNextCursorId, setMessageNextCursorId] = useState(null);
  const [messageHasMore, setMessageHasMore] = useState(false);
  const [hasConversation, setHasConversation] = useState(false);
  const listRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const messageHasMoreRef = useRef(false);
  const messageNextCursorIdRef = useRef(null);
  const conversationIdRef = useRef(conversationId);
  const selectedConversationRef = useRef(null);
  const markReadInFlightRef = useRef(false);
  const lastMarkReadAtRef = useRef(0);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    emitAdminContactUnreadAggregate(conversations);
  }, [conversations]);

  const markAdminConversationRead = useCallback(async (conversationIdArg, {force = false} = {}) => {
    const id = conversationIdArg ?? conversationIdRef.current;
    if (id == null || String(id).trim() === "") return;
    const now = Date.now();
    if (!force && now - lastMarkReadAtRef.current < 400) return;
    if (markReadInFlightRef.current) return;
    lastMarkReadAtRef.current = now;
    markReadInFlightRef.current = true;
    try {
      const res = await markAdminMessagesRead(id);
      if (res?.status >= 200 && res?.status < 300) {
        setConversations((prev) =>
          prev.map((c) => (isSameConversationId(c._conversationId, id) ? {...c, _unreadCount: 0} : c))
        );
        /** Không dispatch admin-contact-conversations-refresh — tránh GET /admin/conversation mỗi lần focus ô nhập; badge sidebar nhận admin-contact-unread-aggregate từ state. */
      }
    } catch {
      /* ignore */
    } finally {
      markReadInFlightRef.current = false;
    }
  }, []);

  const handleMarkReadFromInput = useCallback(() => {
    const cid = selectedConversationRef.current?._conversationId;
    if (cid == null) return;
    void markAdminConversationRead(cid, {force: true});
  }, [markAdminConversationRead]);

  const isOutgoing = (m) => {
    const s = normalizePrincipal(m?.sender);
    return !!myPrincipalLower && s === myPrincipalLower;
  };

  useEffect(() => {
    messageHasMoreRef.current = messageHasMore;
  }, [messageHasMore]);

  useEffect(() => {
    messageNextCursorIdRef.current = messageNextCursorId;
  }, [messageNextCursorId]);

  const loadMessageHistoryForConversation = async ({conversation, cursorId = null, silent = false} = {}) => {
    if (!conversation) return;
    const campusId = conversation?.campusId ?? conversation?.campusID ?? null;
    if (campusId == null || String(campusId).trim() === "") return;
    if (!silent) setHistoryLoading(true);
    try {
      const response = await getAdminMessagesHistory({campusId, cursorId});
      if (response?.status !== 200) return;
      const envelope = parseBodyObject(response?.data);
      const outerBody = parseBodyObject(envelope?.body);
      const body = parseBodyObject(outerBody?.body ?? outerBody);
      const messagesRaw = Array.isArray(body?.messages)
        ? body.messages
        : Array.isArray(body?.items)
          ? body.items
          : [];
      const normalized = messagesRaw.map(normalizeMessage);
      setMessageItems((prev) =>
        cursorId ? mergeUniqueMessages([...normalized, ...prev]) : mergeUniqueMessages(normalized)
      );
      setMessageNextCursorId(body?.nextCursorId ?? body?.cursorId ?? null);
      setMessageHasMore(!!body?.hasMore);
      setSenderAdminEmail(String(body?.adminEmail || senderAdminEmail || myPrincipal || "").trim());
      setReceiverCampusEmail(String(body?.campusEmail || receiverCampusEmail || "").trim());
      setSelectedCampusId(Number(campusId));
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadConversations = async () => {
      setConversationsLoading(true);
      setConversationLoadError("");
      try {
        const response = await getCampusConversationsForAdmin();
        if (response?.status !== 200) {
          setHasConversation(false);
          setConversationLoadError("Không tải được danh sách hội thoại.");
          return;
        }
        const sourceItems = extractAdminConversationList(response?.data);
        if (!sourceItems.length) {
          setHasConversation(false);
          setConversations([]);
          setSelectedConversation(null);
          return;
        }
        const normalizedConversations = sourceItems.map((item, index) => {
          const schoolName = String(
            item?.schoolName ??
            item?.school_name ??
            item?.school ??
            item?.schoolTitle ??
            ""
          ).trim();
          const campusName = String(
            item?.campusName ??
            item?.campus_name ??
            item?.campus ??
            item?.campusTitle ??
            ""
          ).trim();
          const label =
            schoolName && campusName
              ? `${schoolName} - ${campusName}`
              : schoolName || campusName || CONTACT_LABEL_FALLBACK;
          const logo = String(
            item?.schoolLogoUrl ??
            item?.schoolLogoURL ??
            item?.school_logo_url ??
            item?.logoUrl ??
            item?.logo ??
            ""
          ).trim();
          const cid =
            item?.conversationId ??
            item?.conversationID ??
            item?.conversation_id ??
            item?.id ??
            `${ADMIN_CONTACT_CONVERSATION_ID}-${index}`;
          return {
            ...item,
            _label: label,
            _logo: logo,
            _conversationId: cid,
            _unreadCount: readConversationUnreadCount(item),
          };
        });
        setConversations(normalizedConversations);
        setSelectedConversation(null);
        setConversationLabel(CONTACT_LABEL_FALLBACK);
        setSchoolLogoUrl("");
        setConversationId(null);
        setSenderAdminEmail("");
        setReceiverCampusEmail("");
        setSelectedCampusId(null);
        setMessageItems([]);
        setMessageNextCursorId(null);
        setMessageHasMore(false);
        setHasConversation(normalizedConversations.length > 0);
      } catch (error) {
        console.error("Error loading campus conversations for admin contact:", error);
        setHasConversation(false);
        setConversations([]);
        setSelectedConversation(null);
        setConversationLoadError("Không tải được danh sách hội thoại.");
      } finally {
        setConversationsLoading(false);
        /** Không dispatch admin-contact-conversations-refresh — tránh GET /admin/conversation lần 2; badge sidebar nhận admin-contact-unread-aggregate khi conversations set. */
      }
    };
    void loadConversations();
  }, []);

  const handleSelectConversation = async (conversation) => {
    if (!conversation) return;
    selectedConversationRef.current = conversation;
    setSelectedConversation(conversation);
    setConversationLabel(conversation?._label || CONTACT_LABEL_FALLBACK);
    setSchoolLogoUrl(conversation?._logo || "");
    setConversationId(conversation?._conversationId ?? ADMIN_CONTACT_CONVERSATION_ID);
    setMessageItems([]);
    setMessageNextCursorId(null);
    setMessageHasMore(false);
    await loadMessageHistoryForConversation({conversation});
    setConversations((prev) =>
      prev.map((c) =>
        isSameConversationId(c._conversationId, conversation._conversationId) ? {...c, _unreadCount: 0} : c
      )
    );
    await markAdminConversationRead(conversation._conversationId, {force: true});
  };

  useEffect(() => {
    const rowCampusEmail = (c) =>
      normalizePrincipal(
        c?.campusEmail ?? c?.emailCampus ?? c?.campus_mail ?? c?.campusMail ?? ""
      );

    const matchesConversationRow = (c, convId, campusId, senderNorm) => {
      if (convId != null && isSameConversationId(c._conversationId, convId)) return true;
      if (campusId != null && campusId !== "") {
        const rowC = c.campusId ?? c.campusID;
        if (rowC != null && String(rowC) === String(campusId)) return true;
      }
      const cem = rowCampusEmail(c);
      if (cem && senderNorm && cem === senderNorm) return true;
      return false;
    };

    const onPrivateMessage = (payload) => {
      const merged = mergeChatPayload(payload);
      const root = merged;
      const incomingConversationId =
        pickIncomingConversationId(merged) ?? pickIncomingConversationId(payload);
      const rawCampus =
        merged.campusId ??
        merged.campusID ??
        merged.campus_id ??
        (payload && typeof payload === "object" ? payload.campusId ?? payload.campusID : null);
      const campusFromPayload =
        rawCampus !== undefined && rawCampus !== null && String(rawCampus).trim() !== "" ? rawCampus : null;

      const sender =
        merged.senderEmail ??
        merged.senderName ??
        merged.sender ??
        merged.from ??
        merged.username ??
        "";
      const senderLower = normalizePrincipal(sender);
      const selfSend = !!(myPrincipalLower && senderLower && senderLower === myPrincipalLower);
      if (selfSend) return;

      const activeId = conversationIdRef.current;
      const selected = selectedConversationRef.current;
      const selectedCampusId =
        selected?.campusId ?? selected?.campusID ?? selected?.campus_id ?? null;
      const selectedCampusEmail = rowCampusEmail(selected ?? {});

      /** Tin thuộc cuộc đang mở: conversationId / campusId / email campus khớp dòng đang chọn. */
      const openChatMatchesThisMessage =
        (incomingConversationId != null &&
          activeId != null &&
          isSameConversationId(incomingConversationId, activeId)) ||
        (campusFromPayload != null &&
          selectedCampusId != null &&
          String(campusFromPayload) === String(selectedCampusId)) ||
        (selectedCampusEmail &&
          senderLower &&
          selectedCampusEmail === senderLower);

      /**
       * Luôn tăng _unreadCount để sidebar + emit admin-contact-unread-aggregate cập nhật.
       * Trước đây nhánh “đang mở đúng cuộc” chỉ append tin → _unreadCount = 0 → badge Liên hệ không đổi.
       */
      setConversations((prev) => {
        let bumped = false;
        let next = prev.map((c) => {
          if (!matchesConversationRow(c, incomingConversationId, campusFromPayload, senderLower)) return c;
          bumped = true;
          return {
            ...c,
            _unreadCount: Math.min(99, Number(c._unreadCount || 0) + 1),
          };
        });
        if (!bumped && prev.length === 1) {
          const only = prev[0];
          return [
            {
              ...only,
              _unreadCount: Math.min(99, Number(only._unreadCount || 0) + 1),
            },
          ];
        }
        if (!bumped && openChatMatchesThisMessage && selected?._conversationId != null) {
          next = prev.map((c) =>
            isSameConversationId(c._conversationId, selected._conversationId)
              ? {
                  ...c,
                  _unreadCount: Math.min(99, Number(c._unreadCount || 0) + 1),
                }
              : c
          );
        }
        return next;
      });

      if (!openChatMatchesThisMessage) {
        return;
      }

      const normalized = normalizeMessage(root);
      setMessageItems((prev) => {
        let replacedOptimistic = false;
        const withoutMatchingOptimistic = prev.filter((m) => {
          if (!String(m?.id ?? "").startsWith("optimistic-")) return true;
          if (!normalized.text || String(m?.text ?? "") !== String(normalized.text ?? "")) return true;
          if (replacedOptimistic) return true;
          replacedOptimistic = true;
          return false;
        });
        return mergeUniqueMessages([...withoutMatchingOptimistic, normalized]);
      });
    };

    connectPrivateMessageSocket({onMessage: onPrivateMessage});
    return () => removePrivateMessageListener(onPrivateMessage);
  }, [myPrincipalLower]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [messageItems.length]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !myPrincipal || sending || !selectedConversation) return;

    const senderName = String(senderAdminEmail || myPrincipal || "").trim();
    const receiverName = String(receiverCampusEmail || CONTACT_PRINCIPAL).trim();
    const campusId = Number.isFinite(Number(selectedCampusId)) ? Number(selectedCampusId) : 0;
    const ts = toLocalDateTimeIso();
    const payload = {
      senderName,
      receiverName,
      campusId,
      message: text,
      conversationId,
      studentProfileId: null,
      timestamp: ts,
      content: text,
      sentAt: ts,
    };

    setSending(true);
    try {
      const sent = sendMessage(payload);
      if (!sent) return;
      setInputValue("");

      const optimisticRaw = {
        id: `optimistic-${Date.now()}`,
        messageId: `optimistic-${Date.now()}`,
        message: text,
        content: text,
        senderName,
        senderEmail: senderName,
        conversationId,
        timestamp: ts,
        sentAt: new Date().toISOString(),
      };
      setMessageItems((prev) => mergeUniqueMessages([...prev, normalizeMessage(optimisticRaw)]));
    } finally {
      setSending(false);
    }
  };

  const handleMessageScroll = async (event) => {
    const node = event.currentTarget;
    if (node.scrollTop > 120) return;
    if (loadingMoreRef.current || !selectedConversation) return;
    const hasMore = messageHasMoreRef.current;
    const nextCursorId = messageNextCursorIdRef.current;
    if (!hasMore || !nextCursorId) return;

    loadingMoreRef.current = true;
    setLoadingOlderMessages(true);
    const previousHeight = node.scrollHeight;
    try {
      await loadMessageHistoryForConversation({conversation: selectedConversation, cursorId: nextCursorId, silent: true});
      requestAnimationFrame(() => {
        const newHeight = node.scrollHeight;
        node.scrollTop = Math.max(newHeight - previousHeight, 0);
      });
    } finally {
      setLoadingOlderMessages(false);
      loadingMoreRef.current = false;
    }
  };

  return (
    <Box sx={{height: "calc(100vh - 110px)", display: "flex", flexDirection: "column", px: {xs: 0, md: 1}}}>
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateColumns: {xs: "1fr", md: "minmax(280px, 34%) minmax(0, 1fr)"},
          borderRadius: 4.5,
          overflow: "hidden",
          border: "1px solid rgba(37,99,235,0.16)",
          boxShadow: "0 18px 45px rgba(51,65,85,0.12)",
          bgcolor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box
          sx={{
            borderRight: {xs: "none", md: "1px solid rgba(37,99,235,0.12)"},
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            px: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              mt: 2.25,
              display: "flex",
              alignItems: "center",
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              borderColor: "rgba(148,163,184,0.8)",
              bgcolor: "#ffffff",
            }}
          >
            <SearchIcon fontSize="small" sx={{color: "#94a3b8", mr: 1}} />
            <Typography sx={{fontSize: 13, color: "#94a3b8"}}>Tìm kiếm...</Typography>
          </Paper>
          <Divider sx={{my: 2, borderColor: "rgba(148,163,184,0.35)"}} />
          {hasConversation ? (
            <Box>
              {conversations.map((item) => {
                const isActive = selectedConversation?._conversationId != null &&
                  isSameConversationId(selectedConversation?._conversationId, item?._conversationId);
                return (
                  <Paper
                    key={String(item?._conversationId)}
                    elevation={0}
                    onClick={() => void handleSelectConversation(item)}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.2,
                      mb: 0.75,
                      cursor: "pointer",
                      bgcolor: isActive ? "rgba(37,99,235,0.08)" : "#ffffff",
                      border: isActive
                        ? "1px solid rgba(37,99,235,0.28)"
                        : "1px solid rgba(148,163,184,0.25)",
                    }}
                  >
                    <Box sx={{width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(37,99,235,0.12)", display: "grid", placeItems: "center", flexShrink: 0}}>
                      {item?._logo ? (
                        <Avatar src={item._logo} sx={{width: 40, height: 40}} />
                      ) : (
                        <ContactSupportOutlinedIcon sx={{color: "#2563eb"}} />
                      )}
                    </Box>
                    <Box sx={{flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, justifyContent: "space-between"}}>
                      <Typography
                        sx={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#1e293b",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item?._label || CONTACT_LABEL_FALLBACK}
                      </Typography>
                      {Number(item?._unreadCount) > 0 ? (
                        <Box
                          component="span"
                          sx={{
                            flexShrink: 0,
                            minWidth: 22,
                            height: 22,
                            px: 0.75,
                            borderRadius: 999,
                            bgcolor: "#ef4444",
                            color: "#ffffff",
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {Math.min(99, Number(item._unreadCount))}
                        </Box>
                      ) : null}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          ) : null}
          {conversationLoadError ? (
            <Typography sx={{mt: 0.75, fontSize: 11, color: "#b91c1c"}}>{conversationLoadError}</Typography>
          ) : null}
        </Box>

        <Box sx={{display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0}}>
          <Box
            ref={listRef}
            onScroll={handleMessageScroll}
            sx={{
              flex: "1 1 0%",
              minHeight: 0,
              px: 3,
              pt: 2,
              pb: 6,
              overflowX: "hidden",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              bgcolor: "linear-gradient(180deg, rgba(238,242,255,0.55) 0%, rgba(248,250,252,0.95) 100%)",
            }}
          >
            {historyLoading ? (
              <Box sx={{height: "100%", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center"}}>
                <Typography sx={{fontSize: 13, color: "#64748b", textAlign: "center"}}>
                  Đang tải tin nhắn...
                </Typography>
              </Box>
            ) : messageItems.length === 0 ? (
              <Box sx={{height: "100%", minHeight: 260}} />
            ) : (
              <>
                {loadingOlderMessages ? (
                  <Box sx={{display: "flex", justifyContent: "center", mb: 0.75}}>
                    <Typography sx={{fontSize: 11, color: "#64748b"}}>Đang tải tin nhắn...</Typography>
                  </Box>
                ) : null}
                {messageItems.map((m) => {
                  const mine = isOutgoing(m);
                  return (
                    <Box key={m.id} sx={{display: "flex", justifyContent: mine ? "flex-end" : "flex-start", mb: 1}}>
                      <Box sx={{maxWidth: "78%"}}>
                        <Box
                          sx={{
                            bgcolor: mine ? "#0084ff" : "#e5e5ea",
                            color: mine ? "#ffffff" : "#1e293b",
                            px: 1.75,
                            py: 1.05,
                            borderRadius: "18px",
                            borderBottomRightRadius: mine ? "4px" : "18px",
                            borderBottomLeftRadius: mine ? "18px" : "4px",
                            border: "none",
                          }}
                        >
                          <Typography sx={{fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5}}>{m.text}</Typography>
                        </Box>
                        <Typography sx={{mt: 0.25, fontSize: 10.5, color: "#64748b", lineHeight: 1.2, textAlign: mine ? "right" : "left"}}>
                          {formatMessageTime(m.sentAt)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </>
            )}
          </Box>

          {selectedConversation ? (
            <Box sx={{px: 3, py: 1.5, borderTop: "1px solid #e2e8f0", bgcolor: "rgba(255,255,255,0.94)"}}>
              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  px: 1,
                  py: 0.5,
                  bgcolor: "#f8fafc",
                }}
              >
                <InputBase
                  placeholder="Nhập tin nhắn..."
                  sx={{flex: 1, fontSize: 13, px: 1}}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPointerDown={handleMarkReadFromInput}
                  onFocus={handleMarkReadFromInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={!inputValue.trim() || !myPrincipal || sending || !selectedConversation}
                  sx={{
                    ml: 0.5,
                    bgcolor: inputValue.trim() && myPrincipal ? "#4F46E5" : "transparent",
                    color: inputValue.trim() && myPrincipal ? "#ffffff" : "#4F46E5",
                    "&:hover": {
                      bgcolor: inputValue.trim() && myPrincipal ? APP_PRIMARY_DARK : "rgba(37,99,235,0.08)",
                    },
                  }}
                >
                  {sending ? <CircularProgress size={16} sx={{color: "inherit"}} /> : <SendIcon fontSize="small" />}
                </IconButton>
              </Paper>
              {!myPrincipal ? (
                <Typography sx={{mt: 0.75, fontSize: 11, color: "#b91c1c"}}>
                  Không tìm thấy email/username của tài khoản admin để gửi tin nhắn.
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
}
