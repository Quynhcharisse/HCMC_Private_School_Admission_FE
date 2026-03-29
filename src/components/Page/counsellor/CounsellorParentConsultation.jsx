import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
  Tooltip,
  Badge,
  CircularProgress,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import MoodRoundedIcon from "@mui/icons-material/MoodRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import { getCounsellorConversations } from "../../../services/ConversationService.jsx";
import {
  getCounsellorMessagesHistory,
  markCounsellorMessagesRead,
} from "../../../services/MessageService.jsx";
import {
  buildPrivateChatPayload,
  connectPrivateMessageSocket,
  disconnect,
  sendMessage,
} from "../../../services/WebSocketService.jsx";
import {APP_PRIMARY_DARK, APP_PRIMARY_MAIN} from "../../../constants/homeLandingTheme";

const fallbackAvatarColors = ["#2563eb", "#3b82f6", "#38bdf8", "#0ea5e9", "#60a5fa", "#7dd3fc"];

const formatMessageTime = (value) => {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value);
  }
};

const formatSectionDate = (value) => {
  if (!value) return "Hôm nay";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hôm nay";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Hôm nay";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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

const isSameConversationId = (a, b) => a != null && b != null && String(a) === String(b);

export default function CounsellorParentConsultation() {
  const userInfo = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const usernameForRead = userInfo?.email || userInfo?.username || userInfo?.userName;

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c?.conversationId === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [messageItems, setMessageItems] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageNextCursorId, setMessageNextCursorId] = useState(null);
  const [messageHasMore, setMessageHasMore] = useState(false);

  const loadingMoreRef = useRef(false);
  const hasMarkedReadRef = useRef(false);
  const messageListRef = useRef(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const selectedConversationRef = useRef(selectedConversation);

  const filteredConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return conversations;
    return conversations.filter((item) => {
      const haystack = `${item?.name || ""} ${item?.lastMessage || ""} ${item?.parentEmail || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [conversations, searchValue]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentKey = "";
    messageItems.forEach((message) => {
      const sentAt = message?.sentAt;
      const key = sentAt ? new Date(sentAt).toDateString() : "unknown";
      if (!groups.length || currentKey !== key) {
        groups.push({
          key,
          label: formatSectionDate(sentAt),
          items: [message],
        });
        currentKey = key;
      } else {
        groups[groups.length - 1].items.push(message);
      }
    });
    return groups;
  }, [messageItems]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    const node = messageListRef.current;
    if (!node) return;
    if (loadingMoreRef.current) return;
    const scrollEnd = () => {
      node.scrollTop = node.scrollHeight;
    };
    scrollEnd();
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollEnd);
    });
  }, [selectedConversationId, messageItems.length]);

  const parseConversationResponse = (response) => {
    const payload = response?.data?.body?.body || response?.data?.body || response?.data || {};
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
      hasMore: !!payload?.hasMore,
    };
  };

  const parseHistoryResponse = (response) => {
    const payload = response?.data?.body?.body || response?.data?.body || response?.data || {};
    return {
      items: Array.isArray(payload?.messages)
        ? payload.messages
        : Array.isArray(payload?.items)
          ? payload.items
          : [],
      nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
      hasMore: !!payload?.hasMore,
    };
  };

  const normalizeConversation = (c, index) => {
    const conversationId = c?.conversationId ?? c?.id ?? c?.conversation?.id;
    const parentEmail =
      c?.parentEmail ??
      c?.participantEmail ??
      c?.parent?.email ??
      c?.participant?.email ??
      c?.otherUser;
    const counsellorEmail =
      c?.counsellorEmail ??
      c?.participantCounsellorEmail ??
      c?.counsellor?.email ??
      c?.counsellorEmailAddress;

    return {
      conversationId,
      name: c?.name ?? c?.parentName ?? c?.participantName ?? c?.parent?.name ?? c?.otherUser ?? "Phụ huynh",
      avatarColor: c?.avatarColor ?? fallbackAvatarColors[index % fallbackAvatarColors.length],
      lastMessage: c?.lastMessage ?? c?.lastText ?? c?.lastContent ?? c?.last?.content ?? "",
      time: c?.time ?? c?.lastMessageTime ?? c?.last?.sentAt ?? "",
      unreadCount: Number(c?.unreadCount ?? c?.unreadMessages ?? c?.unread ?? 0) || 0,
      parentEmail,
      counsellorEmail,
      raw: c,
    };
  };

  const normalizeMessage = (m) => {
    const id = m?.id ?? m?.messageId ?? m?.clientMessageId ?? `${m?.sentAt || Date.now()}-${Math.random()}`;
    const text = m?.content ?? m?.message ?? m?.text ?? "";
    // BE lưu email trong senderName/receiverName — cần map vào sender để căn trái/phải đúng
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
    return { id: String(id), text, sender, sentAt, raw: m };
  };

  const getConversationEmails = (conversation) => {
    const parentEmail =
      conversation?.parentEmail ??
      conversation?.participantEmail ??
      conversation?.parent?.email ??
      conversation?.otherUser ??
      "";
    const counsellorEmail =
      conversation?.counsellorEmail ?? conversation?.counsellor?.email ?? userInfo?.email ?? "";
    return { parentEmail, counsellorEmail };
  };

  /**
   * Tin do tư vấn viên gửi (bên phải / xanh). BE thường lưu senderName/receiverName, không phải email.
   */
  const isCounsellorOutgoingMessage = (m, conv) => {
    const lower = (v) => (v ?? "").toString().trim().toLowerCase();
    const r = m?.raw || {};
    const { parentEmail, counsellorEmail } = getConversationEmails(conv);
    const pe = lower(parentEmail);
    const ce = lower(counsellorEmail);
    const myEmail = lower(userInfo?.email);
    const myName = lower(userInfo?.name || userInfo?.fullName || userInfo?.username);
    const parentDisplay = lower(conv?.name);

    const nested = r.sender && typeof r.sender === "object" ? r.sender : null;
    const emailCandidates = [
      r.senderEmail,
      r.senderName && String(r.senderName).includes("@") ? r.senderName : null,
      nested?.email,
      typeof r.sender === "string" && r.sender.includes("@") ? r.sender : null,
      m.sender,
      r.from,
      r.userEmail,
    ]
      .map(lower)
      .filter(Boolean);

    for (const e of emailCandidates) {
      if (pe && e === pe) return false;
      if ((ce && e === ce) || (myEmail && e === myEmail)) return true;
    }

    const nameCandidates = [
      r.senderName,
      r.senderDisplayName,
      typeof r.sender === "string" && !r.sender.includes("@") ? r.sender : null,
    ]
      .map(lower)
      .filter(Boolean);

    for (const n of nameCandidates) {
      if (pe && n === pe) return false;
      if (parentDisplay && n === parentDisplay) return false;
      if (myName && n === myName) return true;
    }

    const flatSender = lower(m.sender);
    if (flatSender) {
      if (pe && flatSender === pe) return false;
      if ((ce && flatSender === ce) || (myEmail && flatSender === myEmail)) return true;
      if (flatSender.includes("counsellor") && !flatSender.includes("parent")) return true;
      if (flatSender.includes("parent")) return false;
    }

    return false;
  };

  const handleSelectConversation = async (conversation) => {
    if (!conversation?.conversationId) return;
    setSelectedConversationId(conversation.conversationId);
    hasMarkedReadRef.current = false;
    setMessageItems([]);
    setMessageNextCursorId(null);
    setMessageHasMore(false);
    setMessageError("");
    await loadMessageHistory({ conversation });
    await handleMarkRead({ conversation });
  };

  const loadConversations = async ({ cursorId } = {}) => {
    setConversationsLoading(true);
    setConversationsError("");
    try {
      const response = await getCounsellorConversations(cursorId);
      if (response?.status === 200) {
        const parsed = parseConversationResponse(response);
        const normalized = parsed.items.map((c, idx) => normalizeConversation(c, idx));
        setConversations(normalized);
      } else {
        setConversationsError("Không thể tải danh sách cuộc trò chuyện.");
      }
    } catch (e) {
      console.error(e);
      setConversationsError("Không thể tải danh sách cuộc trò chuyện.");
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadMessageHistory = async ({ conversation, cursorId, silent = false }) => {
    if (!conversation) return;
    if (!silent) {
      setMessageLoading(true);
      setMessageError("");
    }
    try {
      const { parentEmail, counsellorEmail } = getConversationEmails(conversation);
      if (!parentEmail || !counsellorEmail) {
        if (!silent) setMessageError("Thiếu thông tin email để tải lịch sử.");
        return;
      }

      const response = await getCounsellorMessagesHistory({
        parentEmail,
        counsellorEmail,
        cursorId,
      });

      if (response?.status === 200) {
        const parsed = parseHistoryResponse(response);
        const normalized = parsed.items.map(normalizeMessage);
        setMessageItems((prev) =>
          // If history returns empty while we're refreshing after sending,
          // keep current messages instead of wiping UI.
          cursorId
            ? mergeUniqueMessages([...normalized, ...prev])
            : normalized.length
              ? mergeUniqueMessages(normalized)
              : prev
        );
        setMessageNextCursorId(parsed.nextCursorId);
        setMessageHasMore(parsed.hasMore);
      } else if (!silent) {
        setMessageError("Không thể tải lịch sử tin nhắn.");
      }
    } catch (error) {
      console.error("Error fetching message history:", error);
      if (!silent) setMessageError("Không thể tải lịch sử tin nhắn.");
    } finally {
      if (!silent) setMessageLoading(false);
    }
  };

  /** Khi WS trễ / lỡ — đồng bộ REST mỗi vài giây khi đang mở cuộc trò chuyện (không hiện spinner). */
  useEffect(() => {
    if (!selectedConversationId) return;
    const intervalId = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const conv = selectedConversationRef.current;
      if (!conv) return;
      loadMessageHistory({ conversation: conv, cursorId: null, silent: true });
    }, 3500);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  const handleMarkRead = async ({ conversation } = {}) => {
    const targetConversation = conversation || selectedConversation;
    if (!targetConversation || !targetConversation.conversationId) return;
    if (hasMarkedReadRef.current) return;
    if (!usernameForRead) return;

    try {
      await markCounsellorMessagesRead({
        conversationId: targetConversation.conversationId,
        username: usernameForRead,
      });
      hasMarkedReadRef.current = true;
      setConversations((prev) =>
        prev.map((item) => {
          if (item?.conversationId !== targetConversation.conversationId) return item;
          return { ...item, unreadCount: 0 };
        })
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConversation) return;

    const text = inputValue.trim();
    const { parentEmail, counsellorEmail } = getConversationEmails(selectedConversation);
    // Trùng principal Spring cho convertAndSendToUser — dùng email, không dùng tên hiển thị
    const senderName = (counsellorEmail || userInfo?.email || "").trim();
    const receiverName = (parentEmail || "").trim();
    if (!senderName || !receiverName) return;

    const payload = buildPrivateChatPayload({
      conversationId: selectedConversation.conversationId,
      message: text,
      senderName,
      receiverName,
    });

    const sent = sendMessage(payload);
    if (!sent) return;
    setInputValue("");

    // BE thường chỉ broadcast tới queue người nhận — người gửi không nhận echo → hiển thị ngay (optimistic).
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticRaw = {
      id: optimisticId,
      messageId: optimisticId,
      message: text,
      content: text,
      senderEmail: senderName,
      senderName,
      conversationId: selectedConversation.conversationId,
      timestamp: payload.timestamp,
      sentAt: new Date().toISOString(),
    };
    const optimisticMsg = normalizeMessage(optimisticRaw);
    setMessageItems((prev) => mergeUniqueMessages([...prev, optimisticMsg]));
    setConversations((prev) =>
      prev.map((item) => {
        if (!isSameConversationId(item?.conversationId, selectedConversation.conversationId)) return item;
        return { ...item, lastMessage: text, time: optimisticMsg.sentAt };
      })
    );
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const client = connectPrivateMessageSocket({
      onMessage: (payload) => {
        const conversationId = payload?.conversationId ?? payload?.conversation?.id;
        if (conversationId == null || conversationId === "") return;

        const normalizedIncoming = normalizeMessage(payload);

        setConversations((prev) =>
          prev.map((item) => {
            if (!isSameConversationId(item?.conversationId, conversationId)) return item;
            const currentSelectedId = selectedConversationIdRef.current;
            const shouldIncreaseUnread = !(
              currentSelectedId != null && isSameConversationId(currentSelectedId, conversationId)
            );
            return {
              ...item,
              lastMessage: normalizedIncoming.text || item.lastMessage,
              time: normalizedIncoming.sentAt || item.time,
              unreadCount: shouldIncreaseUnread ? Number(item.unreadCount || 0) + 1 : item.unreadCount || 0,
            };
          })
        );

        if (isSameConversationId(selectedConversationIdRef.current, conversationId)) {
          setMessageItems((prev) => {
            let replacedOptimistic = false;
            const withoutMatchingOptimistic = prev.filter((m) => {
              if (!String(m.id).startsWith("optimistic-")) return true;
              if (!normalizedIncoming.text || m.text !== normalizedIncoming.text) return true;
              if (replacedOptimistic) return true;
              replacedOptimistic = true;
              return false;
            });
            return mergeUniqueMessages([...withoutMatchingOptimistic, normalizedIncoming]);
          });
        }
      },
    });

    return () => {
      if (client?.active) disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessageScroll = async (event) => {
    if (!messageHasMore || loadingMoreRef.current || !selectedConversation) return;
    const node = event.currentTarget;
    if (node.scrollTop > 60) return;

    loadingMoreRef.current = true;
    const previousHeight = node.scrollHeight;
    await loadMessageHistory({ conversation: selectedConversation, cursorId: messageNextCursorId });
    requestAnimationFrame(() => {
      const newHeight = node.scrollHeight;
      node.scrollTop = Math.max(newHeight - previousHeight, 0);
      loadingMoreRef.current = false;
    });
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 110px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "linear-gradient(145deg, #eef2ff 0%, #ecfeff 45%, #f8fafc 100%)",
        px: { xs: 0, md: 1 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          display: "grid",
          // md+: hai cột (dashboard tư vấn). lg-only khiến tablet/laptop nhỏ thành 1 cột giống chat parent.
          gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 34%) minmax(0, 1fr)" },
          gridTemplateRows: { xs: "auto minmax(0, 1fr)", md: "minmax(0, 1fr)" },
          alignItems: "stretch",
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
            borderRight: { xs: "none", md: "1px solid rgba(37,99,235,0.12)" },
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            bgcolor: {
              xs: "rgba(248,250,252,0.8)",
              md: "linear-gradient(180deg, rgba(37,99,235,0.07) 0%, rgba(248,250,252,0.98) 48%, #f8fafc 100%)",
            },
            px: 2,
          }}
        >
          <Box sx={{ pt: 2.25, pb: 1.75 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b", mb: 0.25 }}>
              Tin nhắn
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b", mb: 1, fontWeight: 500 }}>
              Tư vấn viên · Danh sách phụ huynh
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                borderColor: "rgba(148,163,184,0.8)",
                bgcolor: "#ffffff",
                boxShadow: "0 8px 20px rgba(37,99,235,0.08)",
              }}
            >
              <SearchIcon fontSize="small" sx={{ color: "#94a3b8", mr: 1 }} />
              <InputBase
                placeholder="Tìm tên phụ huynh..."
                sx={{ fontSize: 13, flex: 1 }}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                inputProps={{ "aria-label": "search conversations" }}
              />
            </Paper>
          </Box>

          <List
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              py: 0.5,
              px: 0,
            }}
          >
            {conversationsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={22} />
              </Box>
            ) : conversationsError ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#dc2626" }}>{conversationsError}</Typography>
              </Box>
            ) : filteredConversations.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                  Không tìm thấy cuộc trò chuyện phù hợp.
                </Typography>
              </Box>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c?.conversationId === selectedConversationId;
                return (
                <ListItem
                  key={c.conversationId}
                  disablePadding
                  sx={{
                    px: 0,
                    "&:not(:last-of-type)": { mb: 0.5 },
                  }}
                >
                  <Paper
                    onClick={() => handleSelectConversation(c)}
                    elevation={0}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      cursor: "pointer",
                      bgcolor: isActive ? "rgba(37,99,235,0.08)" : "transparent",
                      border: isActive ? "1px solid rgba(37,99,235,0.35)" : "1px solid transparent",
                      boxShadow: isActive ? "0 10px 22px rgba(37,99,235,0.15)" : "none",
                      transition:
                        "all 0.22s ease-in-out",
                      "&:hover": {
                        bgcolor: isActive ? "rgba(37,99,235,0.12)" : "#f1f5f9",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Badge
                        color="error"
                        overlap="circular"
                        variant={c.unreadCount ? "dot" : "standard"}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: 14,
                            bgcolor: c.avatarColor,
                          }}
                        >
                          {(c.name || "P").charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: isActive ? 600 : 500,
                              color: "#1e293b",
                              mr: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                            {formatMessageTime(c.time)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 12,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                          }}
                        >
                          {c.lastMessage || "Bắt đầu cuộc trò chuyện..."}
                        </Typography>
                      }
                    />
                  </Paper>
                </ListItem>
                );
              })
            )}
          </List>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            height: "100%",
            maxHeight: "100%",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "rgba(255,255,255,0.9)",
              flexShrink: 0,
            }}
          >
            {selectedConversation ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: selectedConversation.avatarColor,
                      fontSize: 16,
                    }}
                  >
                    {selectedConversation.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                      {selectedConversation.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Tooltip title="Tài khoản đối phương trong cuộc trò chuyện này">
                        <Chip
                          size="small"
                          label="Phụ huynh"
                          sx={{
                            height: 20,
                            borderRadius: 2,
                            fontSize: 11,
                            bgcolor: "rgba(148,163,184,0.2)",
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        />
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Tooltip title="Tuỳ chọn thêm">
                    <IconButton size="small">
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Chọn một cuộc trò chuyện ở bên trái để xem nội dung.
              </Typography>
            )}
          </Box>

          {selectedConversation ? (
            <Box
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
                scrollBehavior: "smooth",
              }}
              onScroll={handleMessageScroll}
              ref={messageListRef}
            >
              {messageLoading && messageItems.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : messageError ? (
                <Typography sx={{ fontSize: 13, color: "#dc2626" }}>{messageError}</Typography>
              ) : messageItems.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "#64748b", textAlign: "center", mt: 1 }}>
                  Chưa có tin nhắn.
                </Typography>
              ) : (
                groupedMessages.map((group) => (
                  <Box key={group.key} sx={{ mb: 1.25 }}>
                    <Typography
                      align="center"
                      sx={{
                        fontSize: 11,
                        color: "#64748b",
                        mb: 0.75,
                        fontWeight: 500,
                      }}
                    >
                      {group.label}
                    </Typography>
                    {group.items.map((m) => {
                      const isMine = isCounsellorOutgoingMessage(m, selectedConversation);

                      return (
                        <Box
                          key={m.id}
                          sx={{
                            display: "flex",
                            justifyContent: isMine ? "flex-end" : "flex-start",
                            mb: 0.5,
                            // opacity:0 vẫn giữ chỗ — chỉ hiện khi hover để khỏi giãn dòng
                            ".msg-actions": { display: "none" },
                            "&:hover .msg-actions": { display: "flex" },
                          }}
                        >
                          <Box sx={{ maxWidth: "78%" }}>
                            <Box
                              sx={{
                                bgcolor: isMine ? "#0084ff" : "#e5e5ea",
                                color: isMine ? "#ffffff" : "#1e293b",
                                px: 1.75,
                                py: 1.05,
                                borderRadius: "18px",
                                borderBottomRightRadius: isMine ? "4px" : "18px",
                                borderBottomLeftRadius: isMine ? "18px" : "4px",
                                boxShadow: isMine ? "0 1px 1px rgba(0,0,0,0.08)" : "none",
                                border: "none",
                              }}
                            >
                              <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                                {m.text}
                              </Typography>
                              {m?.raw?.fileUrl ? (
                                <Typography sx={{ mt: 0.75, fontSize: 11, opacity: 0.85 }}>
                                  Tep dinh kem: {m.raw.fileName || "Xem tep"}
                                </Typography>
                              ) : null}
                            </Box>

                            <Box
                              sx={{
                                mt: 0.25,
                                display: "flex",
                                justifyContent: isMine ? "flex-end" : "flex-start",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography sx={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.2 }}>
                                {formatMessageTime(m.sentAt)}
                              </Typography>
                              {isMine ? (
                                <Typography sx={{ fontSize: 10.5, color: "#22c55e", fontWeight: 500, lineHeight: 1.2 }}>
                                  Seen
                                </Typography>
                              ) : null}
                            </Box>

                            <Box
                              className="msg-actions"
                              sx={{
                                mt: 0.25,
                                justifyContent: isMine ? "flex-end" : "flex-start",
                                gap: 0.25,
                              }}
                            >
                              <IconButton size="small"><ReplyRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                              <IconButton size="small"><ContentCopyRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                              <IconButton size="small"><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))
              )}
              {selectedConversation && messageLoading && messageItems.length > 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                  <Typography sx={{ fontSize: 11, color: "#64748b" }}>Dang tai them...</Typography>
                </Box>
              ) : null}
            </Box>
          ) : (
            <Box
              sx={{
                flex: "1 1 0%",
                minHeight: 0,
                px: 3,
                py: 2,
                bgcolor: "linear-gradient(135deg, #f8fafc 0, #eef2ff 40%, #e0f2fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: 14, color: "#94a3b8" }}>
                Chưa có cuộc trò chuyện nào được chọn.
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: "1px solid #e2e8f0",
              bgcolor: "rgba(255,255,255,0.94)",
              flexShrink: 0,
            }}
          >
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
                transition: "all 0.2s ease-in-out",
                "&:focus-within": {
                  borderColor: "rgba(37,99,235,0.45)",
                  boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                },
              }}
            >
              <Tooltip title="Dinh kem">
                <IconButton size="small" sx={{ color: APP_PRIMARY_MAIN, ml: 0.25 }}>
                  <AttachFileRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <InputBase
                placeholder={
                  selectedConversation
                    ? "Type a message..."
                    : "Chon mot cuoc tro chuyen de bat dau nhan tin..."
                }
                sx={{ flex: 1, fontSize: 13, px: 1 }}
                value={inputValue}
                disabled={!selectedConversation}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => handleMarkRead()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Tooltip title="Emoji">
                <IconButton size="small" sx={{ color: APP_PRIMARY_MAIN }}>
                  <MoodRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={handleSend}
                disabled={!inputValue.trim() || !selectedConversation}
                sx={{
                  ml: 0.5,
                  bgcolor: inputValue.trim() && selectedConversation ? "#4F46E5" : "transparent",
                  color: inputValue.trim() && selectedConversation ? "#ffffff" : "#4F46E5",
                  "&:hover": {
                    bgcolor:
                      inputValue.trim() && selectedConversation
                        ? APP_PRIMARY_DARK
                        : "rgba(37,99,235,0.08)",
                  },
                  "&:active": { transform: "scale(0.95)" },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
