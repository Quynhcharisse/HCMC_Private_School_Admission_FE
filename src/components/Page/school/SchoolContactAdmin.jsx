import React, {useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, IconButton, InputBase, Paper, Typography} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import {
  connectPrivateMessageSocket,
  removePrivateMessageListener,
  sendMessage,
  toLocalDateTimeIso,
} from "../../../services/WebSocketService.jsx";
import {APP_PRIMARY_DARK} from "../../../constants/homeLandingTheme";
import {createCampusAdminConversation} from "../../../services/ConversationService.jsx";
import {getCampusAdminMessagesHistory, markCampusMessagesRead} from "../../../services/MessageService.jsx";


const isSameConversationId = (a, b) => a != null && b != null && String(a) === String(b);

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

const pickIncomingConversationId = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.conversationId ??
    payload.conversation_id ??
    payload.conversationID ??
    payload?.conversation?.id ??
    payload?.conversation?.conversationId ??
    payload?.chatMessage?.conversationId ??
    payload?.message?.conversationId ??
    payload?.data?.conversationId ??
    null
  );
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

/** Giống SchoolSidebar — STOMP có thể gửi body string hoặc lồng `data`. */
const mergeSchoolIncomingWsPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  let body = payload;
  if (payload.body != null) {
    if (typeof payload.body === "string") {
      try {
        body = JSON.parse(payload.body);
      } catch {
        body = payload;
      }
    } else if (typeof payload.body === "object") {
      body = payload.body;
    }
  }
  const base = {...payload};
  const r = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const nestedData = r?.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : {};
  return {...base, ...r, ...nestedData};
};

const extractPrivateMessageSender = (merged) => {
  const layers = [merged, merged?.chatMessage, merged?.message, merged?.data, merged?.dto, merged?.payload].filter(
    (x) => x && typeof x === "object" && !Array.isArray(x),
  );
  for (let i = 0; i < layers.length; i += 1) {
    const o = layers[i];
    const s =
      o.senderEmail ??
      o.senderName ??
      o.sender ??
      o.from ??
      o.username ??
      o.createdBy ??
      "";
    if (String(s).trim()) return String(s);
  }
  return "";
};

/** Chuẩn hóa object tin trước khi normalizeMessage — sender nằm trong chatMessage. */
const flattenWsForNormalize = (merged) => {
  const cm = merged?.chatMessage;
  const msg = merged?.message;
  return {
    ...merged,
    ...(cm && typeof cm === "object" && !Array.isArray(cm) ? cm : {}),
    ...(msg && typeof msg === "object" && !Array.isArray(msg) ? msg : {}),
  };
};

const SCHOOL_CONTACT_UNREAD_KEY = "school_contact_admin_unread_count";

/** Xóa badge local — không dispatch school-contact-conversation-refresh (tránh GET /campus/conversation). */
const clearSchoolContactUnreadLocally = () => {
  try {
    localStorage.setItem(SCHOOL_CONTACT_UNREAD_KEY, "0");
  } catch {
    // ignore storage errors
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-contact-unread-updated", {detail: {count: 0}}));
  }
};

export default function SchoolContactAdmin() {
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [campusId, setCampusId] = useState(0);
  const [campusEmail, setCampusEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const listRef = useRef(null);
  const conversationIdRef = useRef(null);
  const lastUnreadClearAtRef = useRef(0);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const isOutgoing = (m) => {
    const s = normalizePrincipal(m?.sender);
    return !!myPrincipalLower && s === myPrincipalLower;
  };

  const loadHistory = async ({createIfMissing = false} = {}) => {
    setHistoryLoading(true);
    try {
      const response = await getCampusAdminMessagesHistory();
      if (response?.status !== 200) return false;

      const envelope = parseBodyObject(response?.data);
      const outerBody = parseBodyObject(envelope?.body);
      const body = parseBodyObject(outerBody?.body ?? outerBody);

      const cidRaw = body?.conversationId;
      const cidNum = cidRaw != null && String(cidRaw).trim() !== "" ? Number(cidRaw) : NaN;
      const resolvedConversationId = Number.isFinite(cidNum) ? cidNum : null;
      setConversationId(resolvedConversationId);

      const campusIdRaw = Number(body?.campusId ?? body?.campusID ?? 0);
      setCampusId(Number.isFinite(campusIdRaw) ? campusIdRaw : 0);
      const campusEmailRaw =
        body?.campusEmail ??
        body?.emailCampus ??
        body?.campusMailId ??
        body?.campus_mail ??
        "";
      const adminEmailRaw =
        body?.adminEmail ??
        body?.emailAdmin ??
        body?.adminMailId ??
        body?.admin_mail ??
        "";
      setCampusEmail(String(campusEmailRaw || "").trim());
      setAdminEmail(String(adminEmailRaw || "").trim());

      const messagesRaw = Array.isArray(body?.messages)
        ? body.messages
        : Array.isArray(body?.items)
          ? body.items
          : [];
      const normalized = messagesRaw.map(normalizeMessage);
      setMessageItems(mergeUniqueMessages(normalized));

      if (createIfMissing && resolvedConversationId == null) {
        const createRes = await createCampusAdminConversation();
        if (createRes?.status >= 200 && createRes?.status < 300) {
          await loadHistory({createIfMissing: false});
        }
      }
      return true;
    } finally {
      setHistoryLoading(false);
      /** Không dispatch school-contact-conversation-refresh: GET /campus/conversation sau load lịch sử hay trả unread=0 và xóa badge đã + qua WebSocket. */
    }
  };

  useEffect(() => {
    void loadHistory({createIfMissing: true});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPrivateMessage = (payload) => {
      const merged = mergeSchoolIncomingWsPayload(payload);
      const incomingConversationId = pickIncomingConversationId(merged);
      const cid = conversationIdRef.current;
      if (cid != null && incomingConversationId != null && !isSameConversationId(incomingConversationId, cid)) {
        return;
      }

      const senderNorm = normalizePrincipal(extractPrivateMessageSender(merged));
      const selfSend = !!(myPrincipalLower && senderNorm && senderNorm === myPrincipalLower);

      const normalized = normalizeMessage(flattenWsForNormalize(merged));
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

  const clearUnreadOnComposerEngage = () => {
    const now = Date.now();
    if (now - lastUnreadClearAtRef.current < 250) return;
    lastUnreadClearAtRef.current = now;
    const cid = conversationIdRef.current;
    clearSchoolContactUnreadLocally();
    if (cid != null) {
      void markCampusMessagesRead(cid).catch(() => {
        /* ignore */
      });
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !myPrincipal || sending) return;

    setSending(true);
    void (async () => {
      try {
        let cid = conversationIdRef.current;
        if (cid == null) {
          const createRes = await createCampusAdminConversation();
          const createOk = createRes?.status >= 200 && createRes?.status < 300;
          if (!createOk) return;
          await loadHistory({createIfMissing: false});
          cid = conversationIdRef.current;
        }
        if (cid == null) return;

        const senderName = String(campusEmail || myPrincipal).trim();
        const receiverName = String(adminEmail || "").trim();
        if (!receiverName) return;
        const cidNum = Number(cid);
        const campusIdNum = Number.isFinite(Number(campusId)) ? Number(campusId) : 0;
        const ts = toLocalDateTimeIso();
        const payload = {
          senderName,
          receiverName,
          campusId: campusIdNum,
          message: text,
          conversationId: Number.isFinite(cidNum) ? cidNum : cid,
          studentProfileId: null,
          timestamp: ts,
          content: text,
          sentAt: ts,
        };

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
          conversationId: payload.conversationId,
          studentProfileId: null,
          timestamp: ts,
          sentAt: new Date().toISOString(),
        };
        setMessageItems((prev) => mergeUniqueMessages([...prev, normalizeMessage(optimisticRaw)]));
      } finally {
        setSending(false);
      }
    })();
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
            elevation={0}
            sx={{
              mt: 2.25,
              px: 1.75,
              py: 1.25,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              bgcolor: "rgba(37,99,235,0.08)",
              border: "1px solid rgba(37,99,235,0.28)",
            }}
          >
            <Box sx={{width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(37,99,235,0.12)", display: "grid", placeItems: "center"}}>
              <SupportAgentIcon sx={{color: "#2563eb"}} />
            </Box>
            <Box sx={{minWidth: 0}}>
              <Typography sx={{fontSize: 18, fontWeight: 700, color: "#1e293b"}}>Admin EduBridge</Typography>
            </Box>
          </Paper>
        </Box>

        <Box sx={{display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0}}>
          <Box
            ref={listRef}
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
              <Box
                sx={{
                  height: "100%",
                  minHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                }}
              >
                <CircularProgress size={28} sx={{color: "#2563eb"}} />
                <Typography sx={{fontSize: 13, color: "#64748b", textAlign: "center"}}>Đang tải tin nhắn...</Typography>
              </Box>
            ) : messageItems.length === 0 ? (
              <Box sx={{height: "100%", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center"}}>
                <Typography sx={{fontSize: 13, color: "#64748b", textAlign: "center"}}>Chưa có tin nhắn.</Typography>
              </Box>
            ) : (
              messageItems.map((m) => {
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
              })
            )}
          </Box>

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
                disabled={historyLoading}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={clearUnreadOnComposerEngage}
                onPointerDown={clearUnreadOnComposerEngage}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    clearUnreadOnComposerEngage();
                    handleSend();
                  }
                }}
              />
              <IconButton
                onClick={() => {
                  clearUnreadOnComposerEngage();
                  handleSend();
                }}
                disabled={historyLoading || !inputValue.trim() || !myPrincipal || sending || !String(adminEmail || "").trim()}
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
                Không tìm thấy email/username của tài khoản trường để gửi tin nhắn.
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
