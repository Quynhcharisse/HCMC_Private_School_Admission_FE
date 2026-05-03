import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
import {createCampusAdminConversation, getCampusConversation} from "../../../services/ConversationService.jsx";
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

/**
 * Root payload GET /campus/message/history/admin — có thể là `{ message, body: { schoolName, campusName, messages… } }`
 * hoặc phẳng; chọn object chứa messages/conversationId/metadata để gán state + payload gửi tin.
 */
const pickCampusAdminHistoryBody = (responseData) => {
  const envelope = parseBodyObject(responseData);
  const layer1 = parseBodyObject(envelope?.body);
  const layer2 = parseBodyObject(layer1?.body);

  const candidates = [layer2, layer1, envelope].filter((x) => x && typeof x === "object");
  for (let i = 0; i < candidates.length; i += 1) {
    const o = candidates[i];
    if (
      Array.isArray(o.messages) ||
      Array.isArray(o.items) ||
      o.conversationId != null ||
      o.schoolName != null ||
      o.campusName != null
    ) {
      return o;
    }
  }
  if (layer2 && Object.keys(layer2).length) return layer2;
  if (layer1 && Object.keys(layer1).length) return layer1;
  return envelope;
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

/** Chuẩn hóa object tin — BE có thể đặt nội dung trong `chatMessage` hoặc `message` object. */
const flattenWsForNormalize = (merged) => {
  const cm = merged?.chatMessage;
  const msg = merged?.message;
  return {
    ...merged,
    ...(cm && typeof cm === "object" && !Array.isArray(cm) ? cm : {}),
    ...(msg && typeof msg === "object" && !Array.isArray(msg) ? msg : {}),
  };
};

const stripInvisibleAndTrim = (s) =>
  String(s ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

const normalizeMessage = (m) => {
  const flat = m && typeof m === "object" && !Array.isArray(m) ? flattenWsForNormalize(m) : m || {};
  const id = flat?.id ?? flat?.messageId ?? flat?.clientMessageId ?? `${flat?.sentAt || Date.now()}-${Math.random()}`;
  const rawText = flat?.content ?? flat?.message ?? flat?.text ?? "";
  const text = typeof rawText === "string" ? stripInvisibleAndTrim(rawText) : stripInvisibleAndTrim(String(rawText ?? ""));
  const sender =
    flat?.senderEmail ??
    flat?.sender ??
    flat?.senderName ??
    flat?.from ??
    flat?.username ??
    flat?.createdBy ??
    flat?.senderId ??
    "";
  const sentAt = flat?.sentAt ?? flat?.createdAt ?? flat?.timestamp ?? flat?.time ?? null;
  return {id: String(id), text, sender, sentAt, raw: m};
};

const hasRenderableChatText = (m) => stripInvisibleAndTrim(m?.text ?? "") !== "";

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

/** GET /campus/conversation — không tạo conversation; chỉ bổ sung campus/admin email khi history chưa có. */
const pickCampusConversationPayload = (responseData) => {
  const envelope = parseBodyObject(responseData);
  const body = parseBodyObject(envelope?.body);
  const inner = parseBodyObject(body?.body);
  if (inner && typeof inner === "object") return inner;
  return body && typeof body === "object" ? body : {};
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
  const [schoolName, setSchoolName] = useState("");
  const [campusName, setCampusName] = useState("");
  const listRef = useRef(null);
  const conversationIdRef = useRef(null);
  const lastUnreadClearAtRef = useRef(0);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  /** GET /campus/conversation — bổ sung metadata (email + tên trường/cơ sở cho payload ChatMessage BE). */
  const fillContactContextFromCampusGet = useCallback(async () => {
    try {
      const response = await getCampusConversation();
      if (response?.status !== 200) return null;
      const p = pickCampusConversationPayload(response?.data);
      if (!p || typeof p !== "object") return null;

      let conversationIdOut = null;
      const cidRaw = p.conversationId ?? p.conversation_id ?? p.conversationID ?? p.id ?? null;
      if (cidRaw != null && String(cidRaw).trim() !== "") {
        const cidNum = Number(cidRaw);
        conversationIdOut = Number.isFinite(cidNum) ? cidNum : cidRaw;
        setConversationId(conversationIdOut);
      }

      const campusIdRaw = Number(p.campusId ?? p.campusID ?? 0);
      const campusIdOut = Number.isFinite(campusIdRaw) && campusIdRaw >= 0 ? campusIdRaw : 0;
      setCampusId(campusIdOut);

      const campusEmailRaw =
        p.campusEmail ??
        p.emailCampus ??
        p.campusMailId ??
        p.campus_mail ??
        "";
      const adminEmailRaw =
        p.emailAdmin ??
        p.adminEmail ??
        p.adminMailId ??
        p.admin_mail ??
        "";
      const ce = String(campusEmailRaw || "").trim();
      const ae = String(adminEmailRaw || "").trim();
      if (ce) setCampusEmail(ce);
      if (ae) setAdminEmail(ae);

      const sn = String(p.schoolName ?? p.school_name ?? "").trim();
      const cn = String(p.campusName ?? p.campus_name ?? "").trim();
      if (sn) setSchoolName(sn);
      if (cn) setCampusName(cn);

      return {
        conversationId: conversationIdOut,
        campusId: campusIdOut,
        campusEmail: ce,
        adminEmail: ae,
        schoolName: sn,
        campusName: cn,
      };
    } catch {
      return null;
    }
  }, []);

  const isOutgoing = (m) => {
    const s = normalizePrincipal(m?.sender);
    return !!myPrincipalLower && s === myPrincipalLower;
  };

  /** Trả về context để handleSend dùng ngay sau await (tránh stale state). `false` khi lỗi HTTP. */
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await getCampusAdminMessagesHistory();
      if (response?.status !== 200) return false;

      const envelope = parseBodyObject(response?.data);
      const outerBody = parseBodyObject(envelope?.body);
      const body = parseBodyObject(outerBody?.body ?? outerBody);

      const cidRaw = body?.conversationId;
      const cidNum = cidRaw != null && String(cidRaw).trim() !== "" ? Number(cidRaw) : NaN;
      let resolvedConversationId = Number.isFinite(cidNum) ? cidNum : null;
      setConversationId(resolvedConversationId);

      const campusIdRaw = Number(body?.campusId ?? body?.campusID ?? 0);
      let campusIdResolved = Number.isFinite(campusIdRaw) ? campusIdRaw : 0;
      setCampusId(campusIdResolved);
      const campusEmailRaw =
        body?.campusEmail ??
        body?.emailCampus ??
        body?.campusMailId ??
        body?.campus_mail ??
        "";
      const adminEmailRaw =
        body?.emailAdmin ??
        body?.adminEmail ??
        body?.adminMailId ??
        body?.admin_mail ??
        "";
      let campusEmailStr = String(campusEmailRaw || "").trim();
      let adminEmailStr = String(adminEmailRaw || "").trim();
      setCampusEmail(campusEmailStr);
      setAdminEmail(adminEmailStr);

      let schoolNameStr = String(body?.schoolName ?? body?.school_name ?? "").trim();
      let campusNameStr = String(body?.campusName ?? body?.campus_name ?? "").trim();
      /** Ưu tiên user chỉ khi API không trả (history luôn có school/campus khi BE đã thêm). */
      if (!schoolNameStr) schoolNameStr = String(userInfo?.schoolName ?? userInfo?.school ?? "").trim();
      if (!campusNameStr) campusNameStr = String(userInfo?.campusName ?? userInfo?.campus ?? "").trim();
      setSchoolName(schoolNameStr);
      setCampusName(campusNameStr);

      const messagesRaw = Array.isArray(body?.messages)
        ? body.messages
        : Array.isArray(body?.items)
          ? body.items
          : [];
      const normalized = messagesRaw.map(normalizeMessage).filter(hasRenderableChatText);
      setMessageItems(mergeUniqueMessages(normalized));
      /** Lịch sử trống → đồng bộ badge sidebar (localStorage/WS trước đó có thể còn 1 dù chưa có tin admin). */
      if (normalized.length === 0) {
        clearSchoolContactUnreadLocally();
      }

      /** Chưa có email admin trên history — chỉ GET metadata (không POST tạo conversation). */
      if (!adminEmailStr) {
        const filled = await fillContactContextFromCampusGet();
        if (filled) {
          if (filled.adminEmail) adminEmailStr = filled.adminEmail;
          if (filled.campusEmail) campusEmailStr = filled.campusEmail;
          if (filled.conversationId != null) resolvedConversationId = filled.conversationId;
          if (filled.campusId != null && filled.campusId >= 0) campusIdResolved = filled.campusId;
          if (filled.schoolName) schoolNameStr = filled.schoolName;
          if (filled.campusName) campusNameStr = filled.campusName;
          setSchoolName(schoolNameStr);
          setCampusName(campusNameStr);
        }
      }

      return {
        conversationId: resolvedConversationId,
        campusEmail: campusEmailStr,
        adminEmail: adminEmailStr,
        campusId: campusIdResolved,
        schoolName: schoolNameStr,
        campusName: campusNameStr,
      };
    } finally {
      setHistoryLoading(false);
      /** Không dispatch school-contact-conversation-refresh: GET /campus/conversation sau load lịch sử hay trả unread=0 và xóa badge đã + qua WebSocket. */
    }
  };

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPrivateMessage = (payload) => {
      const merged = mergeSchoolIncomingWsPayload(payload);
      const normalized = normalizeMessage(merged);
      if (!hasRenderableChatText(normalized)) return;

      const incomingConversationId = pickIncomingConversationId(merged);
      const cid = conversationIdRef.current;
      if (cid != null && incomingConversationId != null && !isSameConversationId(incomingConversationId, cid)) {
        return;
      }

      const senderNorm = normalizePrincipal(extractPrivateMessageSender(merged));
      const selfSend = !!(myPrincipalLower && senderNorm && senderNorm === myPrincipalLower);

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
        let ctx = {
          campusEmail,
          adminEmail,
          campusId,
          schoolName,
          campusName,
        };
        if (cid == null) {
          const createRes = await createCampusAdminConversation();
          const createOk = createRes?.status >= 200 && createRes?.status < 300;
          if (!createOk) return;
          const meta = await loadHistory();
          if (meta === false) return;
          cid = meta.conversationId ?? conversationIdRef.current;
          ctx = {
            campusEmail: meta.campusEmail,
            adminEmail: meta.adminEmail,
            campusId: meta.campusId,
            schoolName: meta.schoolName ?? "",
            campusName: meta.campusName ?? "",
          };
        }
        if (cid == null) return;

        const senderName = String(ctx.campusEmail || myPrincipal).trim();
        const receiverName = String(ctx.adminEmail || "").trim();
        if (!receiverName) return;
        const cidNum = Number(cid);
        const campusIdNum = Number.isFinite(Number(ctx.campusId)) ? Number(ctx.campusId) : 0;
        const schoolNameOut = String(
          ctx.schoolName || userInfo?.schoolName || userInfo?.school || ""
        ).trim();
        const campusNameOut = String(
          ctx.campusName || userInfo?.campusName || userInfo?.campus || ""
        ).trim();
        const ts = toLocalDateTimeIso();
        const payload = {
          senderName,
          receiverName,
          campusId: campusIdNum,
          schoolName: schoolNameOut,
          campusName: campusNameOut,
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
              messageItems.filter(hasRenderableChatText).map((m) => {
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
