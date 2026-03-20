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
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
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
import { connectPrivateMessageSocket, disconnect, sendMessage } from "../../../services/WebSocketService.jsx";

const fallbackAvatarColors = ["#f97316", "#6366f1", "#ec4899", "#22c55e", "#0ea5e9", "#a855f7"];

const formatMessageTime = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.length <= 6 ? value : value;
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

const getRoleTag = (conversation) => {
  if (!conversation) return "";
  return "Parent";
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
    const node = messageListRef.current;
    if (!node) return;
    if (loadingMoreRef.current) return;
    node.scrollTop = node.scrollHeight;
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
    const sender =
      m?.senderEmail ?? m?.sender ?? m?.from ?? m?.username ?? m?.createdBy ?? m?.senderId ?? "";
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

  const loadMessageHistory = async ({ conversation, cursorId }) => {
    if (!conversation) return;
    setMessageLoading(true);
    setMessageError("");
    try {
      const { parentEmail, counsellorEmail } = getConversationEmails(conversation);
      if (!parentEmail || !counsellorEmail) {
        setMessageError("Thiếu thông tin email để tải lịch sử.");
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
          cursorId ? mergeUniqueMessages([...normalized, ...prev]) : mergeUniqueMessages(normalized)
        );
        setMessageNextCursorId(parsed.nextCursorId);
        setMessageHasMore(parsed.hasMore);
      } else {
        setMessageError("Không thể tải lịch sử tin nhắn.");
      }
    } catch (error) {
      console.error("Error fetching message history:", error);
      setMessageError("Không thể tải lịch sử tin nhắn.");
    } finally {
      setMessageLoading(false);
    }
  };

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

    const { parentEmail, counsellorEmail } = getConversationEmails(selectedConversation);
    const payload = {
      conversationId: selectedConversation.conversationId,
      content: inputValue.trim(),
      senderEmail: counsellorEmail || userInfo?.email,
      receiverEmail: parentEmail,
    };

    const sent = sendMessage(payload);
    if (!sent) return;
    setInputValue("");
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const client = connectPrivateMessageSocket({
      onMessage: (payload) => {
        const conversationId = payload?.conversationId ?? payload?.conversation?.id;
        if (!conversationId) return;

        const normalizedIncoming = normalizeMessage(payload);

        setConversations((prev) =>
          prev.map((item) => {
            if (item?.conversationId !== conversationId) return item;
            const currentSelectedId = selectedConversationIdRef.current;
            const shouldIncreaseUnread = !(currentSelectedId && currentSelectedId === conversationId);
            return {
              ...item,
              lastMessage: normalizedIncoming.text || item.lastMessage,
              time: normalizedIncoming.sentAt || item.time,
              unreadCount: shouldIncreaseUnread ? Number(item.unreadCount || 0) + 1 : item.unreadCount || 0,
            };
          })
        );

        if (selectedConversationIdRef.current === conversationId) {
          setMessageItems((prev) => mergeUniqueMessages([...prev, normalizedIncoming]));
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
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "30% 70%" },
          borderRadius: 4.5,
          overflow: "hidden",
          border: "1px solid rgba(79,70,229,0.16)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
          bgcolor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box
          sx={{
            borderRight: { xs: "none", lg: "1px solid #e2e8f0" },
            display: "flex",
            flexDirection: "column",
            bgcolor: "rgba(248,250,252,0.8)",
            px: 2,
          }}
        >
          <Box sx={{ pt: 2.25, pb: 1.75 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a", mb: 1 }}>
              Tin nhắn
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
                boxShadow: "0 8px 20px rgba(79,70,229,0.08)",
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
                      bgcolor: isActive ? "rgba(79,70,229,0.08)" : "transparent",
                      border: isActive ? "1px solid rgba(79,70,229,0.35)" : "1px solid transparent",
                      boxShadow: isActive ? "0 10px 22px rgba(79,70,229,0.15)" : "none",
                      transition:
                        "all 0.22s ease-in-out",
                      "&:hover": {
                        bgcolor: isActive ? "rgba(79,70,229,0.12)" : "#f1f5f9",
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
                              color: "#0f172a",
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

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "rgba(255,255,255,0.9)",
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
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                      {selectedConversation.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        size="small"
                        label={getRoleTag(selectedConversation)}
                        sx={{
                          height: 20,
                          borderRadius: 2,
                          fontSize: 11,
                          bgcolor: "rgba(79,70,229,0.1)",
                          color: "#4338ca",
                          fontWeight: 600,
                        }}
                      />
                      <Typography sx={{ fontSize: 12, color: "#22c55e" }}>
                        <Box
                          component="span"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: "#22c55e",
                            display: "inline-block",
                            mr: 0.6,
                            boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
                          }}
                        />
                        Online
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Tooltip title="Gọi thoại">
                    <IconButton size="small" sx={{ color: "#4F46E5", bgcolor: "rgba(79,70,229,0.08)" }}>
                      <CallOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Gọi video">
                    <IconButton size="small" sx={{ color: "#4F46E5", bgcolor: "rgba(79,70,229,0.08)" }}>
                      <VideocamOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
                flex: 1,
                px: 3,
                py: 2,
                overflowY: "auto",
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
                  <Box key={group.key} sx={{ mb: 2.25 }}>
                    <Typography
                      align="center"
                      sx={{
                        fontSize: 11,
                        color: "#64748b",
                        mb: 1.25,
                        fontWeight: 500,
                      }}
                    >
                      {group.label}
                    </Typography>
                    {group.items.map((m) => {
                      const { counsellorEmail } = getConversationEmails(selectedConversation);
                      const sender = (m?.sender || "").toString().toLowerCase();
                      const isSenderParent =
                        sender.includes("parent") ||
                        (selectedConversation?.parentEmail &&
                          sender === selectedConversation.parentEmail.toLowerCase());
                      const isMe = !isSenderParent && (
                        (counsellorEmail && sender === counsellorEmail.toLowerCase()) ||
                        sender === "counsellor" ||
                        sender.includes("counsellor")
                      );

                      return (
                        <Box
                          key={m.id}
                          sx={{
                            display: "flex",
                            justifyContent: isSenderParent ? "flex-end" : "flex-start",
                            mb: 1.5,
                            ".msg-actions": {
                              opacity: 0,
                              transform: "translateY(2px)",
                              transition: "all 0.2s ease-in-out",
                            },
                            "&:hover .msg-actions": {
                              opacity: 1,
                              transform: "translateY(0)",
                            },
                          }}
                        >
                          <Box sx={{ maxWidth: "76%" }}>
                            <Box
                              sx={{
                                bgcolor: isSenderParent ? "#4F46E5" : "#eef2ff",
                                color: isSenderParent ? "#ffffff" : "#111827",
                                px: 1.75,
                                py: 1.1,
                                borderRadius: 2,
                                borderTopRightRadius: isSenderParent ? 0.8 : 2,
                                borderTopLeftRadius: isSenderParent ? 2 : 0.8,
                                boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
                                border: isSenderParent ? "none" : "1px solid rgba(148,163,184,0.25)",
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
                                mt: 0.5,
                                display: "flex",
                                justifyContent: isSenderParent ? "flex-end" : "flex-start",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>{formatMessageTime(m.sentAt)}</Typography>
                              {isMe ? (
                                <Typography sx={{ fontSize: 10.5, color: "#22c55e", fontWeight: 500 }}>
                                  Seen
                                </Typography>
                              ) : null}
                            </Box>

                            <Box
                              className="msg-actions"
                              sx={{
                                mt: 0.35,
                                display: "flex",
                                justifyContent: isSenderParent ? "flex-end" : "flex-start",
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
                flex: 1,
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
              position: "sticky",
              bottom: 0,
              zIndex: 2,
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
                  borderColor: "rgba(79,70,229,0.45)",
                  boxShadow: "0 0 0 4px rgba(79,70,229,0.08)",
                },
              }}
            >
              <Tooltip title="Dinh kem">
                <IconButton size="small" sx={{ color: "#6366f1", ml: 0.25 }}>
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
                <IconButton size="small" sx={{ color: "#6366f1" }}>
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
                        ? "#4338ca"
                        : "rgba(79,70,229,0.08)",
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
