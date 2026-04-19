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
  parseMessagesHistoryPayloadRoot,
  extractSubjectsInSystemFromPayload,
} from "../../chat/ParentStudentInfoPanel.jsx";

/**
 * GET history trả campusId / studentProfileId ở root body; list pending đôi khi thiếu.
 * Dùng merge trước khi gửi intro qua STOMP để payload đủ cho BE push tới phụ huynh.
 */
const mergeCounsellorConversationWithHistoryMeta = (conversation, historyMeta) => {
  if (!conversation) return conversation;
  const m = historyMeta && typeof historyMeta === "object" ? historyMeta : {};
  const cMeta = m.campusId;
  const campusNum =
    cMeta != null && Number.isFinite(Number(cMeta)) && Number(cMeta) > 0
      ? Math.trunc(Number(cMeta))
      : null;
  const raw = conversation.raw ?? {};
  const campusFromConv = (() => {
    const v = Number(
      conversation.campusId ??
        conversation.campusID ??
        raw.campusId ??
        conversation.campus?.id ??
        NaN
    );
    return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
  })();
  const campus = campusNum ?? campusFromConv;

  const spFromMeta =
    m.studentProfileId != null && String(m.studentProfileId).trim() !== ""
      ? String(m.studentProfileId).trim()
      : null;
  const spFromConv =
    conversation.studentProfileId != null && String(conversation.studentProfileId).trim() !== ""
      ? String(conversation.studentProfileId).trim()
      : raw.studentProfileId != null && String(raw.studentProfileId).trim() !== ""
        ? String(raw.studentProfileId).trim()
        : null;
  const studentProfileId = spFromMeta ?? spFromConv;

  return {
    ...conversation,
    ...(campus != null ? { campusId: campus, campusID: campus } : {}),
    ...(studentProfileId != null ? { studentProfileId } : {}),
  };
};

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
  const nestedPayload = parseWsObject(message?.payload ?? data?.payload);
  return { ...root, ...body, ...data, ...nestedPayload, ...chatMessage, ...message };
};

const pickWsControlEventType = (merged) => {
  if (!merged || typeof merged !== "object") return "";
  const hasChatBody =
    (merged.message != null && String(merged.message).trim() !== "") ||
    (merged.content != null && String(merged.content).trim() !== "") ||
    (merged.text != null && String(merged.text).trim() !== "");
  if (hasChatBody) return "";
  const direct = String(merged.type ?? merged.eventType ?? "").trim().toUpperCase();
  if (direct) return direct;
  return String(
    merged?.data?.type ?? merged?.payload?.type ?? merged?.body?.type ?? ""
  )
    .trim()
    .toUpperCase();
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
    merged?.conversation?.conversation_id ??
    merged?.chatMessage?.conversationId ??
    merged?.chatMessage?.conversation_id ??
    merged?.chatMessage?.conversation?.id ??
    merged?.message?.conversationId ??
    merged?.message?.conversation_id ??
    merged?.message?.conversation?.id ??
    merged?.data?.conversationId ??
    merged?.data?.conversation_id ??
    merged?.dto?.conversationId ??
    merged?.chatDto?.conversationId ??
    merged?.privateConversationId ??
    merged?.chatRoomId ??
    merged?.privateRoomId ??
    merged?.privateChatId ??
    merged?.chatId ??
    null;
  if (raw == null || raw === "") return null;
  return raw;
};

const normalizeWsPrincipal = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/^["'<\s]+|["'>\s]+$/g, "");

/** Fan-out campus: BE gửi broadcastToCampus hoặc receiver rỗng + campusId (receiverName ""). */
const isBroadcastCampusMessage = (merged) => {
  if (!merged || typeof merged !== "object") return false;
  const b = merged.broadcastToCampus;
  if (b === true || b === "true" || b === 1) return true;
  const recv = normalizeWsPrincipal(
    merged?.receiverName ?? merged?.receiverEmail ?? merged?.to ?? merged?.receiver
  );
  if (recv) return false;
  const cid = merged.campusId ?? merged.campusID ?? merged?.campus?.id ?? 0;
  const n = Number(cid);
  return Number.isFinite(n) && n > 0;
};

/**
 * Tin trên queue /user của tư vấn: receiverName thường là email tư vấn; BE fan-out campus có receiverName rỗng + broadcastToCampus.
 * Không dùng `username` làm người nhận — dễ trùng principal gây lọc sai.
 * Bỏ qua echo khi senderName là chính principal tư vấn.
 */
const receiverMatchesCounsellor = (payload, identityLowerSet) => {
  const merged = mergeCounsellorWsPayload(payload);
  if (isBroadcastCampusMessage(merged)) return true;
  const recv = normalizeWsPrincipal(
    merged?.receiverName ?? merged?.receiverEmail ?? merged?.to ?? merged?.receiver
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
  /** Không dùng trường username — frame /user queue của TVV thường mang principal phiên, dễ nhầm tin phụ huynh thành echo. */
  const identifiers = [
    normalizeWsPrincipal(merged?.senderName),
    normalizeWsPrincipal(merged?.senderEmail),
    normalizeWsPrincipal(merged?.from),
    normalizeWsPrincipal(merged?.sender),
    normalizeWsPrincipal(merged?.createdBy),
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

const pickStudentProfileIdFromMerged = (merged) => {
  if (!merged || typeof merged !== "object") return null;
  const raw =
    merged.studentProfileId ??
    merged.studentId ??
    merged?.student?.profileId ??
    merged?.student?.id ??
    null;
  if (raw == null || raw === "") return null;
  return String(raw).trim();
};

/** Jackson LocalDateTime có thể là chuỗi ISO hoặc mảng [y,m,d,h,mi,s,nano]. */
const coerceWsTimestamp = (v) => {
  if (v == null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "string" && v.trim() !== "") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (Array.isArray(v) && v.length >= 3) {
    const y = v[0];
    const mo = v[1];
    const d = v[2];
    const h = v[3] ?? 0;
    const mi = v[4] ?? 0;
    const s = v[5] ?? 0;
    const ms = v[6] != null ? Math.floor(Number(v[6]) / 1e6) : 0;
    const dt = new Date(y, mo - 1, d, h, mi, s, ms);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  return null;
};

/**
 * Khi conversationId trên WS không khớp state: vẫn cập nhật preview nếu khớp email phụ huynh (+ studentProfileId nếu có).
 */
const tryUpdateListByParentMatch = (list, merged, normalizedIncoming, identityLowerSet) => {
  const senders = extractSenderIdentifiers(merged).filter((id) => !identityLowerSet.has(id));
  if (senders.length === 0) return { next: list, matched: false };
  const spWs = pickStudentProfileIdFromMerged(merged);
  let matched = false;
  const next = list.map((item) => {
    const pItem = normalizeWsPrincipal(item?.parentEmail ?? item?.participantEmail ?? item?.otherUser);
    if (!pItem || !senders.includes(pItem)) return item;
    if (spWs != null && item?.studentProfileId != null && String(item.studentProfileId) !== String(spWs)) {
      return item;
    }
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

const writeCounsellorUnreadConversations = (value, options = {}) => {
  const next = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
  const silent = options?.silent === true;
  try {
    localStorage.setItem(COUNSELLOR_PARENT_UNREAD_CONVERSATIONS_KEY, String(next));
  } catch {
    // ignore storage errors
  }
  if (!silent && typeof window !== "undefined") {
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
  /** Tránh gửi lặp tin chào TVV sau khi xác nhận cuộc chờ (cùng conversationId). */
  const counsellorIntroSentIdsRef = useRef(new Set());

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
      const haystack = `${item?.name || ""} ${item?.studentName || ""} ${item?.lastMessage || ""} ${item?.parentEmail || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [activeConversations, searchValue]);

  const filteredPendingConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return pendingConversations;
    return pendingConversations.filter((item) => {
      const haystack = `${item?.name || ""} ${item?.studentName || ""} ${item?.lastMessage || ""} ${item?.parentEmail || ""}`.toLowerCase();
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
    const payload = parseMessagesHistoryPayloadRoot(response);
    const subjectsInSystem = extractSubjectsInSystemFromPayload(payload);
    const campusRaw = Number(payload?.campusId);
    const campusMeta =
      Number.isFinite(campusRaw) && campusRaw > 0 ? Math.trunc(campusRaw) : null;
    const spMeta =
      payload?.studentProfileId != null && String(payload.studentProfileId).trim() !== ""
        ? String(payload.studentProfileId).trim()
        : null;
    return {
      items: Array.isArray(payload?.messages)
        ? payload.messages
        : Array.isArray(payload?.items)
          ? payload.items
          : [],
      nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
      hasMore: !!payload?.hasMore,
      historyMeta: {
        campusId: campusMeta,
        studentProfileId: spMeta,
      },
      profile: {
        favouriteJob: payload?.favouriteJob ?? "",
        traits: Array.isArray(payload?.traits) ? payload.traits : [],
        gender: payload?.gender ?? "",
        conversationId: payload?.conversationId ?? null,
        academicInfos: Array.isArray(payload?.academicInfos) ? payload.academicInfos : [],
        academicProfileMetadata: Array.isArray(payload?.academicProfileMetadata) ? payload.academicProfileMetadata : [],
        childName: payload?.childName ?? payload?.ChildName ?? "",
        personalityCode: payload?.personalityCode ?? "",
        subjectsInSystem,
        campusId: campusMeta ?? undefined,
        studentProfileId: spMeta ?? undefined,
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
        (c?.studentName ?? c?.childName ?? c?.student?.name ?? c?.student?.fullName ?? "").trim(),
      studentProfileId: c?.studentProfileId ?? c?.student?.profileId ?? null,
      campusId: c?.campusId ?? c?.campusID ?? c?.raw?.campusId ?? c?.campus?.id ?? null,
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
    const sentAtRaw = m?.sentAt ?? m?.createdAt ?? m?.timestamp ?? m?.time ?? null;
    const sentAt = coerceWsTimestamp(sentAtRaw) ?? (typeof sentAtRaw === "string" ? sentAtRaw : null);
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

  const buildCounsellorIntroMessageText = (conversation, counsellorEmailResolved) => {
    const ce = String(counsellorEmailResolved ?? getConversationEmails(conversation).counsellorEmail ?? "").trim();
    const raw = conversation?.raw ?? conversation ?? {};
    const schoolName = String(raw.schoolName ?? conversation?.schoolName ?? "").trim() || "nhà trường";
    const campusName = String(raw.campusName ?? conversation?.campusName ?? "").trim();
    const campusPart = campusName ? `cơ sở ${campusName}` : "cơ sở này";
    const who = ce ? `Tôi là tư vấn viên phụ trách bạn — email liên hệ: ${ce}.` : "Tôi là tư vấn viên phụ trách bạn.";
    return `${who} Tôi là người giải đáp thắc mắc của bạn.`;
  };

  const sendCounsellorIntroAfterPendingAccept = (conversation) => {
    const cidRaw = conversation?.conversationId ?? conversation?.id ?? null;
    if (cidRaw == null || String(cidRaw).trim() === "") return false;
    const cidKey = String(cidRaw);
    if (counsellorIntroSentIdsRef.current.has(cidKey)) return false;

    const { parentEmail, counsellorEmail } = getConversationEmails(conversation);
    const pe = String(parentEmail || "").trim();
    const ce = String(counsellorEmail || "").trim();
    if (!pe || !ce) return false;

    const conversationId = Number.isFinite(Number(cidRaw)) ? Number(cidRaw) : cidRaw;
    const text = buildCounsellorIntroMessageText(conversation, ce);
    const spSend = String(
      conversation?.studentProfileId ?? conversation?.raw?.studentProfileId ?? ""
    ).trim();
    const payload = buildPrivateChatPayload({
      conversationId,
      message: text,
      senderName: ce,
      receiverName: pe,
      campusId:
        conversation?.campusId ??
        conversation?.campusID ??
        conversation?.raw?.campusId ??
        conversation?.campus?.id,
      studentProfileId: spSend || undefined,
    });
    const sent = sendMessage(payload);
    if (!sent) return false;

    counsellorIntroSentIdsRef.current.add(cidKey);
    const optimisticId = `optimistic-intro-${Date.now()}`;
    const optimisticRaw = {
      id: optimisticId,
      messageId: optimisticId,
      message: text,
      content: text,
      senderEmail: ce,
      senderName: ce,
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
    return true;
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
          academicInfos: Array.isArray(sp.academicInfos) ? sp.academicInfos : [],
          academicProfileMetadata: sp.academicProfileMetadata,
          subjectsInSystem: Array.isArray(sp.subjectsInSystem) ? sp.subjectsInSystem : [],
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
    if (!conversation?.conversationId) return { ok: false };
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
    const loadResult = await loadMessageHistory({ conversation });
    // Fallback sớm; effect phía dưới sẽ scroll chắc chắn sau khi render xong.
    scrollMessageListToBottom();
    setTimeout(scrollMessageListToBottom, 30);
    await handleMarkRead({ conversation });
    return loadResult;
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
    const wasPending = String(conversation?.status || "").toLowerCase() === "pending";
    const loadResult = await handleSelectConversation(conversation);
    if (wasPending && loadResult?.ok) {
      sendCounsellorIntroAfterPendingAccept(
        mergeCounsellorConversationWithHistoryMeta(conversation, loadResult.historyMeta)
      );
    }
    await loadConversations();
  };

  const mergeListUnreadWithPrevious = (prevList, nextItems) => {
    const prevById = new Map();
    (Array.isArray(prevList) ? prevList : []).forEach((row) => {
      const id = row?.conversationId ?? row?.id;
      if (id == null || String(id).trim() === "") return;
      const u = Number(row?.unreadCount ?? row?.unreadMessages ?? 0) || 0;
      prevById.set(String(id), u);
    });
    return (nextItems || []).map((item) => {
      const id = item?.conversationId ?? item?.id;
      if (id == null || String(id).trim() === "") return item;
      const prevU = prevById.get(String(id)) ?? 0;
      const apiU = Number(item?.unreadCount ?? item?.unreadMessages ?? 0) || 0;
      const merged = Math.min(99, Math.max(prevU, apiU));
      if (merged === apiU) return item;
      return { ...item, unreadCount: merged, unreadMessages: merged };
    });
  };

  const loadConversations = async ({ cursorId, silent = false } = {}) => {
    if (!silent) {
      setConversationsLoading(true);
      setConversationsError("");
    }
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
        if (silent) {
          setActiveConversations((prev) => mergeListUnreadWithPrevious(prev, activeItems));
          setPendingConversations((prev) => mergeListUnreadWithPrevious(prev, pendingItems));
        } else {
          setActiveConversations(activeItems);
          setPendingConversations(pendingItems);
        }
      } else if (!silent) {
        setConversationsError("Không thể tải danh sách cuộc trò chuyện.");
      }
    } catch (e) {
      console.error(e);
      if (!silent) setConversationsError("Không thể tải danh sách cuộc trò chuyện.");
    } finally {
      if (!silent) setConversationsLoading(false);
    }
  };

  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations;

  const wsListRefreshTimerRef = useRef(null);

  const loadMessageHistory = async ({ conversation, cursorId, silent = false }) => {
    if (!conversation) return { ok: false };
    if (!silent) {
      setMessageLoading(true);
      setMessageError("");
    }
    try {
      const { parentEmail, counsellorEmail } = getConversationEmails(conversation);
      const studentProfileId = conversation?.studentProfileId;
      if (!parentEmail || !counsellorEmail || !studentProfileId) {
        if (!silent) setMessageError("Thiếu thông tin email để tải lịch sử.");
        return { ok: false };
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
        const childName = String(parsed.profile?.childName ?? "").trim();
        const cid = conversation?.conversationId ?? conversation?.id;
        if (cid != null) {
          updateConversationInLists(cid, (item) => ({
            ...item,
            ...(childName ? { studentName: childName } : {}),
            ...(parsed.historyMeta?.campusId != null
              ? { campusId: parsed.historyMeta.campusId, campusID: parsed.historyMeta.campusId }
              : {}),
            ...(parsed.historyMeta?.studentProfileId
              ? { studentProfileId: parsed.historyMeta.studentProfileId }
              : {}),
          }));
        }
        return { ok: true, historyMeta: parsed.historyMeta };
      }
      if (!silent) {
        setMessageError("Không thể tải lịch sử tin nhắn.");
      }
      return { ok: false };
    } catch (error) {
      console.error("Error fetching message history:", error);
      if (!silent) setMessageError("Không thể tải lịch sử tin nhắn.");
      return { ok: false };
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

    const studentProfileIdForSend =
      selectedConversation?.studentProfileId ??
      studentProfileData?.studentProfileId ??
      selectedConversation?.raw?.studentProfileId;

    const payload = buildPrivateChatPayload({
      conversationId,
      message: text,
      senderName,
      receiverName,
      campusId:
        selectedConversation?.campusId ??
        selectedConversation?.campusID ??
        selectedConversation?.raw?.campusId ??
        selectedConversation?.campus?.id ??
        studentProfileData?.campusId,
      studentProfileId: studentProfileIdForSend,
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
        if (pickWsControlEventType(root) === "CONVERSATION_READ") {
          const cid = pickIncomingConversationId(payload);
          if (cid != null && String(cid).trim() !== "") {
            updateConversationInLists(cid, (item) => ({
              ...item,
              unreadCount: 0,
              unreadMessages: 0,
            }));
          }
          return;
        }
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
        if (conversationId == null || String(conversationId).trim() === "") {
          const normalizedIncomingNoId = normalizeMessage(root);
          if (
            !senderLooksLikeCounsellorSelf(root, identityLowerSet) &&
            receiverMatchesCounsellor(root, identityLowerSet)
          ) {
            const prevA = activeConversationsRef.current;
            const prevP = pendingConversationsRef.current;
            const rA = tryUpdateListByParentMatch(prevA, root, normalizedIncomingNoId, identityLowerSet);
            if (rA.matched) {
              activeConversationsRef.current = rA.next;
              setActiveConversations(rA.next);
              return;
            }
            const rP = tryUpdateListByParentMatch(prevP, root, normalizedIncomingNoId, identityLowerSet);
            if (rP.matched) {
              pendingConversationsRef.current = rP.next;
              setPendingConversations(rP.next);
              return;
            }
          }
          if (!senderLooksLikeCounsellorSelf(root, identityLowerSet)) {
            if (wsListRefreshTimerRef.current != null) clearTimeout(wsListRefreshTimerRef.current);
            wsListRefreshTimerRef.current = window.setTimeout(() => {
              wsListRefreshTimerRef.current = null;
              loadConversationsRef.current?.({ silent: true });
            }, 400);
          }
          return;
        }

        if (senderLooksLikeCounsellorSelf(root, identityLowerSet)) return;
        if (!receiverMatchesCounsellor(root, identityLowerSet)) return;

        const normalizedIncoming = normalizeMessage(root);

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
            const rA2 = tryUpdateListByParentMatch(prevA, root, normalizedIncoming, identityLowerSet);
            if (rA2.matched) {
              activeConversationsRef.current = rA2.next;
              pendingConversationsRef.current = prevP;
              setActiveConversations(rA2.next);
              setPendingConversations(prevP);
            } else {
              const rP2 = tryUpdateListByParentMatch(prevP, root, normalizedIncoming, identityLowerSet);
              if (rP2.matched) {
                activeConversationsRef.current = prevA;
                pendingConversationsRef.current = rP2.next;
                setActiveConversations(prevA);
                setPendingConversations(rP2.next);
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
                  loadConversationsRef.current?.({ silent: true });
                }, 450);
              }
            }
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
                const isActive = isSameConversationId(c?.conversationId, selectedConversationId);
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
                            primary={
                              <Box sx={{ width: "100%", minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
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
                                {c.studentName ? (
                                  <Typography
                                    sx={{
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#2563eb",
                                      mt: 0.15,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    Học sinh: {c.studentName}
                                  </Typography>
                                ) : null}
                              </Box>
                            }
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
                    const isActive = isSameConversationId(c?.conversationId, selectedConversationId);
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
                            primary={
                              <Box sx={{ width: "100%", minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
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
                                {c.studentName ? (
                                  <Typography
                                    sx={{
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: "#2563eb",
                                      mt: 0.15,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    Học sinh: {c.studentName}
                                  </Typography>
                                ) : null}
                              </Box>
                            }
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
                  subjectsInSystem={counsellorStudentForPanel.raw?.subjectsInSystem}
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
