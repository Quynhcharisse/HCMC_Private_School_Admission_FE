import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
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
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";

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
  const [messageItems, setMessageItems] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageNextCursorId, setMessageNextCursorId] = useState(null);
  const [messageHasMore, setMessageHasMore] = useState(false);

  const loadingMoreRef = useRef(false);
  const hasMarkedReadRef = useRef(false);
  const messageListRef = useRef(null);
  const selectedConversationIdRef = useRef(selectedConversationId);

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
      items: Array.isArray(payload?.items) ? payload.items : [],
      nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
      hasMore: !!payload?.hasMore,
    };
  };

  const normalizeConversation = (c, index) => {
    const conversationId = c?.conversationId ?? c?.id ?? c?.conversation?.id;
    const parentEmail =
      c?.parentEmail ?? c?.participantEmail ?? c?.parent?.email ?? c?.participant?.email;
    const counsellorEmail =
      c?.counsellorEmail ??
      c?.participantCounsellorEmail ??
      c?.counsellor?.email ??
      c?.counsellorEmailAddress;

    return {
      conversationId,
      name: c?.name ?? c?.parentName ?? c?.participantName ?? c?.parent?.name ?? "Phụ huynh",
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
      conversation?.parentEmail ?? conversation?.participantEmail ?? conversation?.parent?.email ?? "";
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
        bgcolor: "radial-gradient(circle at top left, #dbeafe 0, #eff6ff 35%, #f9fafb 70%, #ffffff 100%)",
        px: { xs: 0, md: 1 },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
          Tư vấn Phụ Huynh
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid rgba(59,130,246,0.45)",
          boxShadow: "0 22px 55px rgba(15, 23, 42, 0.14)",
          bgcolor: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Box
          sx={{
            borderRight: { xs: "none", md: "1px solid #e2e8f0" },
            display: "flex",
            flexDirection: "column",
            bgcolor: "#f8fafc",
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
                boxShadow: "0 8px 22px rgba(15,23,42,0.12)",
              }}
            >
              <SearchIcon fontSize="small" sx={{ color: "#94a3b8", mr: 1 }} />
              <InputBase
                placeholder="Tìm tên phụ huynh..."
                sx={{ fontSize: 13, flex: 1 }}
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
            ) : conversations.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                  Chưa có cuộc trò chuyện nào.
                </Typography>
              </Box>
            ) : (
              conversations.map((c) => {
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
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.5,
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      cursor: "pointer",
                      bgcolor: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                      border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                      boxShadow: isActive ? "0 8px 20px rgba(37,99,235,0.20)" : "none",
                      transition:
                        "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease",
                      "&:hover": {
                        bgcolor: isActive ? "rgba(59,130,246,0.12)" : "#f1f5f9",
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
                            width: 32,
                            height: 32,
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
                            {c.time}
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
                          {c.lastMessage}
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
              py: 1.75,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                    <Typography sx={{ fontSize: 12, color: "#22c55e" }}>Đang hoạt động</Typography>
                  </Box>
                </Box>
                <Tooltip title="Tuỳ chọn thêm">
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
                bgcolor: "#f8fafc",
              }}
              onScroll={handleMessageScroll}
              ref={messageListRef}
            >
              <Typography align="center" sx={{ fontSize: 11, color: "#94a3b8", mb: 2 }}>
                Hôm nay
              </Typography>

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
                messageItems.map((m) => {
                  const { counsellorEmail } = getConversationEmails(selectedConversation);
                  const sender = (m?.sender || "").toString().toLowerCase();
                  const isMe =
                    (counsellorEmail && sender === counsellorEmail.toLowerCase()) ||
                    sender === "counsellor" ||
                    sender.includes("counsellor");

                  return (
                    <Box
                      key={m.id}
                      sx={{
                        display: "flex",
                        justifyContent: isMe ? "flex-end" : "flex-start",
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "70%",
                          bgcolor: isMe ? "#2563eb" : "#e5e7eb",
                          color: isMe ? "#ffffff" : "#111827",
                          px: 1.75,
                          py: 1,
                          borderRadius: 2,
                          borderTopRightRadius: isMe ? 4 : 2,
                          borderTopLeftRadius: isMe ? 2 : 4,
                          boxShadow: "0 1px 4px rgba(15,23,42,0.15)",
                        }}
                      >
                        <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.text}</Typography>
                        <Typography
                          sx={{
                            fontSize: 10,
                            textAlign: "right",
                            opacity: 0.8,
                            mt: 0.25,
                          }}
                        >
                          {formatMessageTime(m.sentAt)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                px: 3,
                py: 2,
                bgcolor: "linear-gradient(135deg, #f8fafc 0, #f1f5f9 40%, #e5e7eb 100%)",
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
              bgcolor: "#ffffff",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid #e2e8f0",
                px: 2,
                py: 0.75,
                bgcolor: "#f8fafc",
              }}
            >
              <InputBase
                placeholder={
                  selectedConversation
                    ? "Nhập tin nhắn cho phụ huynh..."
                    : "Chọn một cuộc trò chuyện để bắt đầu nhắn tin..."
                }
                sx={{ flex: 1, fontSize: 13 }}
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
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!inputValue.trim() || !selectedConversation}
                sx={{
                  ml: 0.5,
                  bgcolor: inputValue.trim() && selectedConversation ? "#2563eb" : "transparent",
                  color: inputValue.trim() && selectedConversation ? "#ffffff" : "primary.main",
                  "&:hover": {
                    bgcolor:
                      inputValue.trim() && selectedConversation
                        ? "#1d4ed8"
                        : "rgba(37,99,235,0.08)",
                  },
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
