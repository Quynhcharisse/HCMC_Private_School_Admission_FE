import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import MoodRoundedIcon from "@mui/icons-material/MoodRounded";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Zoom from "@mui/material/Zoom";

import { getCounsellorConversations } from "../../../services/ConversationService.jsx";
import {
  getCounsellorMessagesHistory,
  markCounsellorMessagesRead,
} from "../../../services/MessageService.jsx";
import {
  buildPrivateChatPayload,
  connectPrivateMessageSocket,
  removePrivateMessageListener,
  sendMessage,
} from "../../../services/WebSocketService.jsx";
import {APP_PRIMARY_DARK, APP_PRIMARY_MAIN} from "../../../constants/homeLandingTheme";
import ParentStudentInfoPanel, {
  getStudentCompactInfo,
  buildAcademicScoreTable,
  extractPersonalityInsights,
} from "../../chat/ParentStudentInfoPanel.jsx";

const fallbackAvatarColors = ["#2563eb", "#3b82f6", "#38bdf8", "#0ea5e9", "#60a5fa", "#7dd3fc"];
const getInitials = (name) => {
  const clean = (name || "").trim();
  if (!clean) return "ST";
  const words = clean.split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("");
};

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

const parseWsObject = (value) => {
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

const mergeCounsellorWsPayload = (payload) => {
  const root = parseWsObject(payload);
  const body = parseWsObject(root?.body);
  const data = parseWsObject(body?.data ?? root?.data);
  const chatMessage = parseWsObject(root?.chatMessage ?? body?.chatMessage ?? data?.chatMessage);
  const message = parseWsObject(root?.message ?? body?.message ?? data?.message);
  return { ...root, ...body, ...data, ...chatMessage, ...message };
};

const pickIncomingConversationId = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const merged = mergeCounsellorWsPayload(payload);
  const raw =
    merged.conversationId ??
    merged.conversation_id ??
    merged.conversationID ??
    merged.threadId ??
    merged.roomId ??
    merged?.conversation?.id ??
    merged?.conversation?.conversationId ??
    merged?.chatMessage?.conversationId ??
    merged?.chatMessage?.conversation?.id ??
    merged?.message?.conversationId ??
    merged?.message?.conversation?.id ??
    merged?.data?.conversationId ??
    merged?.dto?.conversationId ??
    merged?.chatDto?.conversationId ??
    merged?.privateConversationId ??
    merged?.chatRoomId ??
    merged?.privateRoomId ??
    null;
  if (raw == null || raw === "") return null;
  return raw;
};

const normalizeWsPrincipal = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/^["'<\s]+|["'>\s]+$/g, "");

/**
 * Tin trên queue /user của tư vấn: receiverName thường là email tư vấn; có BE bỏ trống receiverName.
 * Bỏ qua echo khi senderName là chính principal tư vấn.
 */
const receiverMatchesCounsellor = (payload, identityLowerSet) => {
  const merged = mergeCounsellorWsPayload(payload);
  const recv = normalizeWsPrincipal(
    merged?.receiverName ?? merged?.receiverEmail ?? merged?.to ?? merged?.username ?? merged?.receiver
  );
  const senderIds = extractSenderIdentifiers(merged);
  if (!recv) {
    if (senderIds.length > 0 && senderIds.every((id) => identityLowerSet.has(id))) return false;
    return true;
  }
  if (identityLowerSet.has(recv)) return true;
  // WS frame da vao /user queue cua counsellor, receiver trong body co the sai.
  if (senderIds.length > 0 && senderIds.every((id) => identityLowerSet.has(id))) return false;
  return true;
};

const senderLooksLikeCounsellorSelf = (payload, identityLowerSet) => {
  const merged = mergeCounsellorWsPayload(payload);
  const identifiers = [
    normalizeWsPrincipal(merged?.senderName),
    normalizeWsPrincipal(merged?.senderEmail),
    normalizeWsPrincipal(merged?.from),
    normalizeWsPrincipal(merged?.sender),
    normalizeWsPrincipal(merged?.createdBy),
    normalizeWsPrincipal(merged?.username),
  ].filter(Boolean);
  if (identifiers.length === 0) return false;
  return identifiers.every((id) => identityLowerSet.has(id));
};

const extractSenderIdentifiers = (payload) => {
  const merged = mergeCounsellorWsPayload(payload);
  return [
    normalizeWsPrincipal(merged?.senderName),
    normalizeWsPrincipal(merged?.senderEmail),
    normalizeWsPrincipal(merged?.from),
    normalizeWsPrincipal(merged?.sender),
    normalizeWsPrincipal(merged?.createdBy),
    normalizeWsPrincipal(merged?.username),
  ].filter(Boolean);
};

/** Số cuộc tối đa mỗi lần tải / mỗi tab (theo yêu cầu UI). */
const CONVERSATION_PAGE_SIZE = 20;

/** Hiển thị số lượng trên tab: nếu BE báo hasMore thì hiện 20+ */
const formatConversationCountLabel = (count, hasMore) => (hasMore ? "20+" : String(count));
const COUNSELLOR_PARENT_UNREAD_CONVERSATIONS_KEY = "counsellor_parent_unread_conversations";

const countUnreadConversations = (items = []) =>
  (Array.isArray(items) ? items : []).reduce((total, item) => {
    const unread = Number(item?.unreadCount ?? item?.unreadMessages ?? 0) || 0;
    return total + (unread > 0 ? 1 : 0);
  }, 0);

const writeCounsellorUnreadConversations = (value) => {
  const next = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
  try {
    localStorage.setItem(COUNSELLOR_PARENT_UNREAD_CONVERSATIONS_KEY, String(next));
  } catch {
    // ignore storage errors
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("counsellor-parent-unread-updated", { detail: { count: next } }));
  }
  return next;
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

  const [activeConversations, setActiveConversations] = useState([]);
  const [pendingConversations, setPendingConversations] = useState([]);
  const [activeHasMore, setActiveHasMore] = useState(false);
  const [pendingHasMore, setPendingHasMore] = useState(false);
  const [listTab, setListTab] = useState("pending");
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const allConversationsFlat = useMemo(
    () => [...pendingConversations, ...activeConversations],
    [pendingConversations, activeConversations]
  );

  const selectedConversation = useMemo(
    () =>
      allConversationsFlat.find((c) => isSameConversationId(c?.conversationId, selectedConversationId)) || null,
    [allConversationsFlat, selectedConversationId]
  );

  const updateConversationInLists = (conversationId, updater) => {
    const mapRow = (item) =>
      isSameConversationId(item?.conversationId, conversationId) ? updater(item) : item;
    setActiveConversations((prev) => prev.map(mapRow));
    setPendingConversations((prev) => prev.map(mapRow));
  };

  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [messageItems, setMessageItems] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messageNextCursorId, setMessageNextCursorId] = useState(null);
  const [messageHasMore, setMessageHasMore] = useState(false);
  const [studentProfileData, setStudentProfileData] = useState(null);
  const [studentInfoOpen, setStudentInfoOpen] = useState(false);

  const loadingMoreRef = useRef(false);
  const hasMarkedReadRef = useRef(false);
  const markReadInFlightRef = useRef(false);
  const lastInputMarkReadAtRef = useRef(0);
  const messageListRef = useRef(null);
  const chatColumnRef = useRef(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const selectedConversationRef = useRef(selectedConversation);
  const activeConversationsRef = useRef([]);
  const pendingConversationsRef = useRef([]);
  const counsellorStickToBottomRef = useRef(true);
  const messageHasMoreRef = useRef(false);
  const messageNextCursorIdRef = useRef(null);
  const pendingInitialBottomScrollRef = useRef(false);

  /** fixed: neo panel ngoài khung chat, cạnh trái cột tin nhắn (giống chat parent trên Header) */
  const [studentPanelLayout, setStudentPanelLayout] = useState({
    right: undefined,
    left: undefined,
    width: 520,
    top: undefined,
    maxHeight: undefined,
  });

  useLayoutEffect(() => {
    if (!studentInfoOpen || !selectedConversation) {
      setStudentPanelLayout({
        right: undefined,
        left: undefined,
        width: 520,
        top: undefined,
        maxHeight: undefined,
      });
      return;
    }

    const update = () => {
      const el = chatColumnRef.current;
      if (!el || typeof window === "undefined") return;
      const rect = el.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      const gap = 12;
      const marginX = 16;
      const maxPanelW = 520;
      const topPx = Math.max(marginX, rect.top);
      const maxHeightPx = Math.min(540, h - topPx - marginX);

      if (w < 600) {
        setStudentPanelLayout({
          right: undefined,
          left: marginX,
          width: Math.min(maxPanelW, w - 32),
          top: topPx,
          maxHeight: maxHeightPx,
        });
      } else {
        const rightPx = w - rect.left + gap;
        const availableW = rect.left - gap - marginX;
        const widthPx =
          availableW <= 0
            ? Math.min(maxPanelW, 360)
            : Math.min(maxPanelW, availableW);
        setStudentPanelLayout({
          right: rightPx,
          left: undefined,
          width: widthPx,
          top: topPx,
          maxHeight: maxHeightPx,
        });
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [studentInfoOpen, selectedConversation]);

  const filteredActiveConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return activeConversations;
    return activeConversations.filter((item) => {
      const haystack = `${item?.name || ""} ${item?.lastMessage || ""} ${item?.parentEmail || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [activeConversations, searchValue]);

  const filteredPendingConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return pendingConversations;
    return pendingConversations.filter((item) => {
      const haystack = `${item?.name || ""} ${item?.lastMessage || ""} ${item?.parentEmail || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [pendingConversations, searchValue]);

  const visibleConversationList = listTab === "pending" ? filteredPendingConversations : filteredActiveConversations;
  const shouldShowPendingBlankPanel = listTab === "pending" && !selectedConversation;

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
    activeConversationsRef.current = activeConversations;
  }, [activeConversations]);

  useEffect(() => {
    pendingConversationsRef.current = pendingConversations;
  }, [pendingConversations]);

  useEffect(() => {
    const unreadConversationCount =
      countUnreadConversations(activeConversations) + countUnreadConversations(pendingConversations);
    writeCounsellorUnreadConversations(unreadConversationCount);
  }, [activeConversations, pendingConversations]);

  useEffect(() => {
    messageHasMoreRef.current = messageHasMore;
  }, [messageHasMore]);

  useEffect(() => {
    messageNextCursorIdRef.current = messageNextCursorId;
  }, [messageNextCursorId]);

  useEffect(() => {
    const node = messageListRef.current;
    if (!node) return;
    if (loadingMoreRef.current) return;
    if (!counsellorStickToBottomRef.current) return;
    const scrollEnd = () => {
      node.scrollTop = node.scrollHeight;
    };
    scrollEnd();
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollEnd);
    });
  }, [selectedConversationId, messageItems.length]);

  const scrollMessageListToBottom = () => {
    const node = messageListRef.current;
    if (!node) return;
    const prevBehavior = node.style.scrollBehavior;
    node.style.scrollBehavior = "auto";
    const scrollEnd = () => {
      node.scrollTop = node.scrollHeight;
    };
    scrollEnd();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollEnd();
        setTimeout(() => {
          scrollEnd();
          node.style.scrollBehavior = prevBehavior;
        }, 0);
      });
    });
  };

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
      profile: {
        favouriteJob: payload?.favouriteJob ?? "",
        traits: Array.isArray(payload?.traits) ? payload.traits : [],
        gender: payload?.gender ?? "",
        conversationId: payload?.conversationId ?? null,
        academicProfileMetadata: Array.isArray(payload?.academicProfileMetadata) ? payload.academicProfileMetadata : [],
        childName: payload?.childName ?? "",
        personalityCode: payload?.personalityCode ?? "",
      },
    };
  };

  const normalizeConversation = (c, index, fallbackStatus = "active") => {
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
      studentName:
        c?.studentName ?? c?.childName ?? c?.student?.name ?? c?.student?.fullName ?? "",
      studentProfileId: c?.studentProfileId ?? c?.student?.profileId ?? null,
      avatarUrl: c?.avatarUrl ?? "",
      otherUser: c?.otherUser ?? "",
      updatedAt: c?.updatedAt ?? "",
      avatarColor: c?.avatarColor ?? fallbackAvatarColors[index % fallbackAvatarColors.length],
      lastMessage: c?.lastMessage ?? c?.lastText ?? c?.lastContent ?? c?.last?.content ?? "",
      time: c?.time ?? c?.lastMessageTime ?? c?.last?.sentAt ?? "",
      unreadCount: Number(c?.unreadCount ?? c?.unreadMessages ?? c?.unread ?? 0) || 0,
      status: String(c?.status || fallbackStatus).toLowerCase(),
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

  const getOutgoingMessageStatusLabel = (message) => {
    const raw = message?.raw || {};
    const statusRaw =
      raw?.status ??
      raw?.messageStatus ??
      raw?.deliveryStatus ??
      raw?.readStatus ??
      message?.status ??
      null;
    const s = String(statusRaw ?? "").trim().toUpperCase();
    if (s.includes("SEEN") || s.includes("READ")) return "Seen";
    if (s.includes("DELIVER")) return "Delivered";
    if (s.includes("SEND") || s.includes("SENT")) return "Send";
    if (raw?.seenAt || raw?.readAt || raw?.readTime) return "Seen";
    if (raw?.deliveredAt || raw?.deliveredTime) return "Delivered";
    return "Send";
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

  /** Shape giống phụ huynh (Header): name + raw cho panel thông tin học sinh */
  const counsellorStudentForPanel = useMemo(() => {
    const sp = studentProfileData;
    const name =
      sp?.childName || selectedConversation?.studentName || "Học sinh";
    const raw = sp
      ? {
          gender: sp.gender,
          personalityTypeCode: sp.personalityCode,
          favouriteJob: sp.favouriteJob,
          traits: sp.traits,
          academicProfileMetadata: sp.academicProfileMetadata,
        }
      : {};
    return { name, raw };
  }, [studentProfileData, selectedConversation]);

  const selectedStudentCompactInfo = useMemo(
    () => getStudentCompactInfo(counsellorStudentForPanel),
    [counsellorStudentForPanel]
  );
  const selectedStudentGradeTable = useMemo(
    () => buildAcademicScoreTable(counsellorStudentForPanel.raw),
    [counsellorStudentForPanel]
  );
  const selectedStudentPersonalityInsights = useMemo(
    () => extractPersonalityInsights(counsellorStudentForPanel.raw),
    [counsellorStudentForPanel]
  );

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
    setStudentProfileData(null);
    setStudentInfoOpen(false);
    hasMarkedReadRef.current = false;
    setMessageItems([]);
    setMessageNextCursorId(null);
    setMessageHasMore(false);
    messageNextCursorIdRef.current = null;
    messageHasMoreRef.current = false;
    counsellorStickToBottomRef.current = true;
    pendingInitialBottomScrollRef.current = true;
    setLoadingOlderMessages(false);
    setMessageError("");
    await loadMessageHistory({ conversation });
    // Fallback sớm; effect phía dưới sẽ scroll chắc chắn sau khi render xong.
    scrollMessageListToBottom();
    setTimeout(scrollMessageListToBottom, 30);
    await handleMarkRead({ conversation });
  };

  useEffect(() => {
    if (!pendingInitialBottomScrollRef.current) return;
    if (messageLoading) return;
    if (!selectedConversationId) return;
    scrollMessageListToBottom();
    pendingInitialBottomScrollRef.current = false;
  }, [selectedConversationId, messageLoading, messageItems.length]);

  const handleAcceptPendingConversation = async (event, conversation) => {
    event?.stopPropagation?.();
    if (!conversation) return;
    await handleSelectConversation(conversation);
    await loadConversations();
  };

  const loadConversations = async ({ cursorId } = {}) => {
    setConversationsLoading(true);
    setConversationsError("");
    try {
      const [activeResponse, pendingResponse] = await Promise.all([
        getCounsellorConversations({ cursorId, status: "active" }),
        getCounsellorConversations({ cursorId, status: "pending" }),
      ]);
      if (activeResponse?.status === 200 && pendingResponse?.status === 200) {
        const activeParsed = parseConversationResponse(activeResponse);
        const pendingParsed = parseConversationResponse(pendingResponse);
        const activeItems = activeParsed.items
          .slice(0, CONVERSATION_PAGE_SIZE)
          .map((c, idx) => normalizeConversation(c, idx, "active"));
        const pendingItems = pendingParsed.items
          .slice(0, CONVERSATION_PAGE_SIZE)
          .map((c, idx) => normalizeConversation(c, idx, "pending"));
        setActiveHasMore(!!activeParsed.hasMore);
        setPendingHasMore(!!pendingParsed.hasMore);
        setActiveConversations(activeItems);
        setPendingConversations(pendingItems);
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

  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations;

  const wsListRefreshTimerRef = useRef(null);

  const loadMessageHistory = async ({ conversation, cursorId, silent = false }) => {
    if (!conversation) return;
    if (!silent) {
      setMessageLoading(true);
      setMessageError("");
    }
    try {
      const { parentEmail, counsellorEmail } = getConversationEmails(conversation);
      const studentProfileId = conversation?.studentProfileId;
      if (!parentEmail || !counsellorEmail || !studentProfileId) {
        if (!silent) setMessageError("Thiếu thông tin email để tải lịch sử.");
        return;
      }

      const response = await getCounsellorMessagesHistory({
        parentEmail,
        counsellorEmail,
        studentProfileId,
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
        messageNextCursorIdRef.current = parsed.nextCursorId ?? null;
        messageHasMoreRef.current = !!parsed.hasMore;
        setStudentProfileData(parsed.profile);
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

  const handleMarkRead = async ({ conversation, force } = {}) => {
    const targetConversation = conversation || selectedConversation;
    const cid = targetConversation?.conversationId ?? targetConversation?.id ?? null;
    if (!targetConversation || cid == null || String(cid).trim() === "") return;
    if (!usernameForRead) return;
    if (!force && hasMarkedReadRef.current) return;
    if (markReadInFlightRef.current) return;

    markReadInFlightRef.current = true;
    try {
      await markCounsellorMessagesRead({
        conversationId: cid,
        username: usernameForRead,
      });
      hasMarkedReadRef.current = true;
      updateConversationInLists(cid, (item) => ({
        ...item,
        unreadCount: 0,
        unreadMessages: 0,
      }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
    } finally {
      markReadInFlightRef.current = false;
    }
  };

  /** Bấm / focus ô nhập: luôn thử mark read (sau khi có tin mới hasMarkedReadRef vẫn có thể true). */
  const handleMarkReadFromInput = () => {
    if (!selectedConversation) return;
    const now = Date.now();
    if (now - lastInputMarkReadAtRef.current < 450) return;
    lastInputMarkReadAtRef.current = now;
    void handleMarkRead({ force: true });
  };

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConversation) return;

    const text = inputValue.trim();
    const { parentEmail, counsellorEmail } = getConversationEmails(selectedConversation);
    const conversationId = selectedConversation?.conversationId ?? selectedConversation?.id ?? null;
    // Trùng principal Spring cho convertAndSendToUser — dùng email, không dùng tên hiển thị
    const senderName = (counsellorEmail || userInfo?.email || "").trim();
    const receiverName = (parentEmail || "").trim();
    if (!senderName || !receiverName) return;
    if (conversationId == null || String(conversationId).trim() === "") return;

    const payload = buildPrivateChatPayload({
      conversationId,
      message: text,
      senderName,
      receiverName,
      campusId:
        selectedConversation?.campusId ??
        selectedConversation?.campusID ??
        selectedConversation?.campus?.id,
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
      conversationId,
      timestamp: payload.timestamp,
      sentAt: new Date().toISOString(),
      status: "SEND",
    };
    const optimisticMsg = normalizeMessage(optimisticRaw);
    setMessageItems((prev) => mergeUniqueMessages([...prev, optimisticMsg]));
    updateConversationInLists(conversationId, (item) => ({
      ...item,
      lastMessage: text,
      time: optimisticMsg.sentAt,
    }));
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const identityLowerSet = new Set();
    [userInfo?.email, userInfo?.username, userInfo?.userName, userInfo?.sub].forEach((x) => {
      const s = String(x || "").trim().toLowerCase();
      if (s) identityLowerSet.add(s);
    });

    const onCounsellorPrivateMessage = (payload) => {
        const root = mergeCounsellorWsPayload(payload);
        let conversationId = pickIncomingConversationId(root);
        if (conversationId == null || String(conversationId).trim() === "") {
          const senderIds = extractSenderIdentifiers(root).filter((id) => !identityLowerSet.has(id));
          if (senderIds.length > 0) {
            const combined = [...activeConversationsRef.current, ...pendingConversationsRef.current];
            const matched = combined.find((item) => {
              const parent = normalizeWsPrincipal(item?.parentEmail ?? item?.participantEmail ?? item?.otherUser);
              return !!parent && senderIds.includes(parent);
            });
            if (matched?.conversationId != null && String(matched.conversationId).trim() !== "") {
              conversationId = matched.conversationId;
            }
          }
        }
        if (conversationId == null || String(conversationId).trim() === "") return;

        if (!receiverMatchesCounsellor(root, identityLowerSet)) return;
        if (senderLooksLikeCounsellorSelf(root, identityLowerSet)) return;

        const normalizedIncoming = normalizeMessage(root);
        const tabVisible = typeof document === "undefined" || document.visibilityState === "visible";
        const viewingThisThread =
          tabVisible &&
          selectedConversationIdRef.current != null &&
          isSameConversationId(selectedConversationIdRef.current, conversationId);

        /** Không tạo mảng mới khi không có dòng khớp — tránh re-render thừa. */
        const mapList = (list) => {
          let matched = false;
          const next = list.map((item) => {
            if (!isSameConversationId(item?.conversationId, conversationId)) return item;
            matched = true;
            const u = Number(item.unreadCount ?? item.unreadMessages ?? 0) || 0;
            const nextUnread = Math.min(99, u + 1);
            return {
              ...item,
              lastMessage: normalizedIncoming.text || item.lastMessage,
              time: normalizedIncoming.sentAt || item.time,
              unreadCount: nextUnread,
              unreadMessages: nextUnread,
            };
          });
          return { next: matched ? next : list, matched };
        };

        const prevA = activeConversationsRef.current;
        const prevP = pendingConversationsRef.current;
        const rA = mapList(prevA);

        if (rA.matched) {
          activeConversationsRef.current = rA.next;
          pendingConversationsRef.current = prevP;
          setActiveConversations(rA.next);
          setPendingConversations(prevP);
        } else {
          const rP = mapList(prevP);
          if (rP.matched) {
            activeConversationsRef.current = prevA;
            pendingConversationsRef.current = rP.next;
            setActiveConversations(prevA);
            setPendingConversations(rP.next);
          } else {
            /**
             * Không chèn hàng “ảo” từ WS: BE chưa lưu / chưa trả list thì không có conversationId ổn định trên DB,
             * mỗi tin + setState bất đồng bộ dễ sinh nhiều dòng trùng một phụ huynh. Chỉ gọi lại REST (debounce).
             */
            if (wsListRefreshTimerRef.current != null) {
              clearTimeout(wsListRefreshTimerRef.current);
            }
            wsListRefreshTimerRef.current = window.setTimeout(() => {
              wsListRefreshTimerRef.current = null;
              loadConversationsRef.current?.();
            }, 450);
          }
        }

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
    };

    connectPrivateMessageSocket({ onMessage: onCounsellorPrivateMessage });

    return () => {
      if (wsListRefreshTimerRef.current != null) {
        clearTimeout(wsListRefreshTimerRef.current);
        wsListRefreshTimerRef.current = null;
      }
      removePrivateMessageListener(onCounsellorPrivateMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessageScroll = async (event) => {
    const node = event.currentTarget;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    counsellorStickToBottomRef.current = distanceFromBottom <= 120;

    const conv = selectedConversationRef.current;
    const hasMore = messageHasMoreRef.current;
    const nextCursorId = messageNextCursorIdRef.current;
    if (!hasMore || loadingMoreRef.current || !conv || !nextCursorId) return;
    if (node.scrollTop > 120) return;

    loadingMoreRef.current = true;
    const loadingStartAt = Date.now();
    setLoadingOlderMessages(true);
    const previousHeight = node.scrollHeight;
    try {
      await loadMessageHistory({ conversation: conv, cursorId: nextCursorId, silent: true });
    requestAnimationFrame(() => {
      const newHeight = node.scrollHeight;
      node.scrollTop = Math.max(newHeight - previousHeight, 0);
      });
    } finally {
      const elapsed = Date.now() - loadingStartAt;
      const minVisibleMs = 280;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setLoadingOlderMessages(false);
      loadingMoreRef.current = false;
    }
  };

  const handleCloseStudentInfo = () => setStudentInfoOpen(false);

  const handleToggleStudentInfo = () => setStudentInfoOpen((prev) => !prev);

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
            ) : activeConversations.length === 0 && pendingConversations.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>Chưa có cuộc trò chuyện nào.</Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    px: 0.5,
                    pt: 0.5,
                    pb: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Paper
                    component="button"
                    type="button"
                    onClick={() => setListTab("pending")}
                    elevation={0}
                    sx={{
                      flex: 1,
                      minWidth: 120,
                      py: 1,
                      px: 1.25,
                      cursor: "pointer",
                      borderRadius: 2,
                      border:
                        listTab === "pending"
                          ? "1px solid rgba(245,158,11,0.45)"
                          : "1px solid rgba(148,163,184,0.45)",
                      bgcolor: listTab === "pending" ? "rgba(245,158,11,0.12)" : "rgba(248,250,252,0.9)",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                      Đang chờ (
                      {formatConversationCountLabel(pendingConversations.length, pendingHasMore)})
                    </Typography>
                  </Paper>
                  <Paper
                    component="button"
                    type="button"
                    onClick={() => setListTab("active")}
                    elevation={0}
                    sx={{
                      flex: 1,
                      minWidth: 120,
                      py: 1,
                      px: 1.25,
                      cursor: "pointer",
                      borderRadius: 2,
                      border:
                        listTab === "active"
                          ? "1px solid rgba(37,99,235,0.45)"
                          : "1px solid rgba(148,163,184,0.45)",
                      bgcolor: listTab === "active" ? "rgba(37,99,235,0.1)" : "rgba(248,250,252,0.9)",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#2563eb" }}>
                      Đang hoạt động (
                      {formatConversationCountLabel(activeConversations.length, activeHasMore)})
                    </Typography>
                  </Paper>
                </Box>

                {visibleConversationList.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                      {searchValue.trim()
                        ? "Không tìm thấy cuộc trò chuyện phù hợp."
                        : listTab === "pending"
                          ? "Không có cuộc trò chuyện đang chờ."
                          : "Không có cuộc trò chuyện đang hoạt động."}
                </Typography>
              </Box>
                ) : listTab === "pending" ? (
                  filteredPendingConversations.map((c) => {
                const isActive = c?.conversationId === selectedConversationId;
                return (
                <ListItem
                        key={`pending-${c.conversationId}`}
                  disablePadding
                        sx={{ px: 0, "&:not(:last-of-type)": { mb: 0.5 } }}
                      >
                        <Paper
                          elevation={0}
                  sx={{
                            px: 1.75,
                            py: 1.25,
                            borderRadius: 3,
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            cursor: "default",
                            bgcolor: isActive ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.03)",
                            border: isActive ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(245,158,11,0.15)",
                            boxShadow: isActive ? "0 10px 22px rgba(245,158,11,0.15)" : "none",
                            transition: "all 0.22s ease-in-out",
                            "&:hover": {
                              bgcolor: isActive ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.08)",
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Badge
                              color="warning"
                              overlap="circular"
                              badgeContent={c.unreadCount > 0 ? Math.min(99, c.unreadCount) : null}
                              invisible={!c.unreadCount}
                              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                              sx={{
                                "& .MuiBadge-badge": {
                                  fontSize: 10,
                                  fontWeight: 700,
                                  minWidth: 18,
                                  height: 18,
                                },
                              }}
                            >
                              <Avatar
                                sx={{ width: 36, height: 36, fontSize: 14, bgcolor: c.avatarColor }}
                                src={c.avatarUrl || undefined}
                              >
                                {getInitials(c.studentName || c.name || "P")}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: "#1e293b", mr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</Typography><Typography sx={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{formatMessageTime(c.time)}</Typography></Box>}
                            secondary={<Typography component="span" sx={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{c.lastMessage || "Bắt đầu cuộc trò chuyện..."}</Typography>}
                          />
                          <Tooltip title="Chấp nhận cuộc trò chuyện">
                            <IconButton
                              size="small"
                              onClick={(event) => handleAcceptPendingConversation(event, c)}
                              sx={{
                                ml: 0.5,
                                color: "#b45309",
                                border: "1px solid rgba(245,158,11,0.35)",
                                bgcolor: "rgba(255,255,255,0.75)",
                                "&:hover": { bgcolor: "rgba(245,158,11,0.12)" },
                              }}
                            >
                              <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Paper>
                      </ListItem>
                    );
                  })
                ) : (
                  filteredActiveConversations.map((c) => {
                    const isActive = c?.conversationId === selectedConversationId;
                    return (
                      <ListItem
                        key={`active-${c.conversationId}`}
                        disablePadding
                        sx={{ px: 0, "&:not(:last-of-type)": { mb: 0.5 } }}
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
                            transition: "all 0.22s ease-in-out",
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
                        badgeContent={c.unreadCount > 0 ? Math.min(99, c.unreadCount) : null}
                        invisible={!c.unreadCount}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        sx={{
                          "& .MuiBadge-badge": {
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 18,
                            height: 18,
                          },
                        }}
                      >
                        <Avatar
                                sx={{ width: 36, height: 36, fontSize: 14, bgcolor: c.avatarColor }}
                          src={c.avatarUrl || undefined}
                        >
                          {getInitials(c.studentName || c.name || "P")}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                            primary={<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: "#1e293b", mr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</Typography><Typography sx={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{formatMessageTime(c.time)}</Typography></Box>}
                            secondary={<Typography component="span" sx={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{c.lastMessage || "Bắt đầu cuộc trò chuyện..."}</Typography>}
                    />
                  </Paper>
                </ListItem>
                );
              })
                )}
              </>
            )}
          </List>
        </Box>

        <Box
          ref={chatColumnRef}
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
                    src={selectedConversation.avatarUrl || undefined}
                  >
                    {getInitials(selectedConversation.studentName || selectedConversation.name)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                      {selectedConversation.name}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        mt: 0.25,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tooltip title="Tên học sinh trong cuộc trò chuyện này">
                        <Typography
                          component="div"
                          sx={{
                            fontSize: 12.5,
                            lineHeight: 1.45,
                          }}
                        >
                          <Box component="span" sx={{ color: "#64748b", fontWeight: 500 }}>
                            Học sinh:{" "}
                          </Box>
                          <Box
                            component="span"
                            sx={{ color: "#2563eb", fontWeight: 600 }}
                          >
                            {studentProfileData?.childName ||
                              selectedConversation?.studentName ||
                              "—"}
                          </Box>
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Xem thông tin học sinh">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStudentInfo();
                          }}
                          aria-label="Thông tin học sinh"
                          aria-expanded={studentInfoOpen}
                          sx={{
                            p: 0.25,
                            color: "#2563eb",
                            "&:hover": { bgcolor: "rgba(37,99,235,0.08)" },
                          }}
                        >
                          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </>
            ) : shouldShowPendingBlankPanel ? null : (
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
                <>
                  {loadingOlderMessages ? (
                    <Box
                      sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.8,
                        py: 0.55,
                        mb: 0.6,
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.24)",
                        bgcolor: "rgba(241,245,249,0.9)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <CircularProgress size={12} />
                      <Typography sx={{ fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>
                        Đang tải tin nhắn
                      </Typography>
                    </Box>
                  ) : null}
                  {groupedMessages.map((group) => (
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
                            ".msg-actions": { display: "none" },
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
                                  {getOutgoingMessageStatusLabel(m)}
                                </Typography>
                              ) : null}
                            </Box>

                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                  ))}
                </>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                flex: "1 1 0%",
                minHeight: 0,
                px: 3,
                py: 2,
                bgcolor: shouldShowPendingBlankPanel
                  ? "#ffffff"
                  : "linear-gradient(135deg, #f8fafc 0, #eef2ff 40%, #e0f2fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {shouldShowPendingBlankPanel ? null : (
              <Typography sx={{ fontSize: 14, color: "#94a3b8" }}>
                Chưa có cuộc trò chuyện nào được chọn.
              </Typography>
              )}
            </Box>
          )}

          {shouldShowPendingBlankPanel ? null : (
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
                  onPointerDown={handleMarkReadFromInput}
                  onFocus={handleMarkReadFromInput}
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
          )}
        </Box>
      </Paper>

      {studentInfoOpen && selectedConversation ? (
        <>
          {/* Không dùng backdrop toàn màn — khung chat vẫn nhìn và gõ được; panel chỉ nằm trái mép chat */}
          {(studentPanelLayout.right != null || studentPanelLayout.left != null) &&
            studentPanelLayout.top != null && (
          <Zoom
            in={studentInfoOpen}
            timeout={260}
            unmountOnExit
            style={{ transformOrigin: "top right" }}
          >
            <Box
              role="dialog"
              aria-modal="false"
              aria-labelledby="counsellor-student-info-panel-title"
              onClick={(e) => e.stopPropagation()}
              sx={{
                pointerEvents: "auto",
                position: "fixed",
                zIndex: 1400,
                top: studentPanelLayout.top,
                bottom: "auto",
                ...(studentPanelLayout.left != null
                  ? {
                      left: studentPanelLayout.left,
                      right: 16,
                      width: "auto",
                      maxWidth: "min(92vw, 520px)",
                    }
                  : {
                      right: studentPanelLayout.right,
                      left: "auto",
                      width: studentPanelLayout.width,
                    }),
                maxHeight:
                  studentPanelLayout.maxHeight != null
                    ? `${studentPanelLayout.maxHeight}px`
                    : "min(85vh, 540px)",
                display: "flex",
                flexDirection: "column",
                outline: "none",
                borderRadius: 2,
                border: "1px solid rgba(148,163,184,0.4)",
                boxShadow: "0 22px 48px rgba(30,41,59,0.28)",
                background:
                  "linear-gradient(180deg, #f8fbff 0%, #f8fafc 38%, #ffffff 100%)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  flexShrink: 0,
                  borderBottom: "1px solid rgba(148,163,184,0.35)",
                  bgcolor: "rgba(255,255,255,0.92)",
                }}
              >
                <Typography
                  id="counsellor-student-info-panel-title"
                  sx={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}
                >
                  Thông tin học sinh
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCloseStudentInfo}
                  aria-label="Đóng thông tin học sinh"
                  sx={{ color: "#64748b" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box
                sx={{
                  p: 1.2,
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <ParentStudentInfoPanel
                  studentName={counsellorStudentForPanel.name}
                  compactInfo={selectedStudentCompactInfo}
                  gradeTable={selectedStudentGradeTable}
                  personalityInsights={selectedStudentPersonalityInsights}
                />
              </Box>
            </Box>
          </Zoom>
            )}
        </>
      ) : null}
    </Box>
  );
}
