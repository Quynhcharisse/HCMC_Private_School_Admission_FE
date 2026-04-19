import React, {useState, useEffect, useMemo} from "react";
import {
    AppBar,
    Avatar,
    Badge,
    Box,
    Button,
    Collapse,
    Container,
    CircularProgress,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    IconButton,
    InputBase,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Typography
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import SearchIcon from "@mui/icons-material/Search";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Fade from '@mui/material/Fade';
import Zoom from '@mui/material/Zoom';
import {enqueueSnackbar} from "notistack";
import {signout, getProfile} from "../../services/AccountService.jsx";
import {createParentConversation, getParentConversations} from "../../services/ConversationService.jsx";
import {getParentMessagesHistory, markParentMessagesRead} from "../../services/MessageService.jsx";
import {getParentStudent} from "../../services/ParentService.jsx";
import {
    buildPrivateChatPayload,
    connectPrivateMessageSocket,
    removePrivateMessageListener,
    sendMessage,
} from "../../services/WebSocketService.jsx";
import logo from "../../assets/logo.png";
import {useLocation, useNavigate} from "react-router-dom";
import {normalizeUserRole} from "../../utils/userRole.js";
import {
    APP_PRIMARY_DARK,
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    HEADER_HOME_BAR_BG
} from "../../constants/homeLandingTheme";
import {OPEN_PARENT_CHAT_EVENT, PARENT_CHAT_WINDOW_STATE_EVENT} from "../../constants/parentChatEvents";
import ParentStudentInfoPanel, {
    getStudentCompactInfo,
    buildAcademicScoreTable,
    extractPersonalityInsights,
    parseMessagesHistoryPayloadRoot,
    extractSubjectsInSystemFromPayload,
} from "../chat/ParentStudentInfoPanel.jsx";

/** Khi bật poll: khoảng cách tối thiểu giữa các lần GET lịch sử tin (chỉ khi ENABLE_PARENT_CHAT_POLLING). */
const PARENT_CHAT_POLL_INTERVAL_MS = 30000;
/** Poll GET /parent/conversations (đang tắt — ENABLE_PARENT_CONVERSATION_POLL). */
/** Debounce GET khi handler WS cần đồng bộ danh sách (thiếu conversationId, …) — không gọi sau mỗi tin TVV. */
const PARENT_CONVERSATION_POLL_INTERVAL_MS = 5500;
const PARENT_WS_CONVERSATION_REFRESH_DEBOUNCE_MS = 320;
/**
 * Poll GET lịch sử tin nhắn trong khi cửa chat mở — dễ gây nhiều request liên tục trên Network.
 * Tin mới nên qua WebSocket; chỉ bật lại (và có thể giảm PARENT_CHAT_POLL_INTERVAL_MS) nếu BE chưa push tin tới /user.
 */
const ENABLE_PARENT_CHAT_POLLING = false;
const ENABLE_PARENT_CONVERSATION_POLL = false;

const isSameConversationId = (a, b) => a != null && b != null && String(a) === String(b);

const sessionCampusLoose = (o) => {
    const raw = o?.campusId ?? o?.campusID ?? null;
    if (raw == null || String(raw).trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
};

/** campusId > 0 — BE hay gửi 0 (primitive int default); không dùng để loại tin WS hoặc chặn khớp draft. */
const meaningfulSessionCampus = (o) => {
    const c = sessionCampusLoose(o);
    return c != null && c > 0 ? c : null;
};

const sessionStudentIdLoose = (o) => String(o?.studentProfileId ?? o?.studentId ?? o?.student?.id ?? '').trim();

/** Cùng phiên tư vấn (học sinh + campus) khi chưa/đã có conversationId — dùng để khớp WS với selection lệch id hoặc draft. */
const isSameConversationSessionLoose = (a, b) => {
    if (!a || !b) return false;
    const ida = a?.conversationId ?? a?.id;
    const idb = b?.conversationId ?? b?.id;
    if (
        ida != null &&
        String(ida).trim() !== '' &&
        idb != null &&
        String(idb).trim() !== '' &&
        isSameConversationId(ida, idb)
    ) {
        return true;
    }
    const sp1 = sessionStudentIdLoose(a);
    const sp2 = sessionStudentIdLoose(b);
    const c1 = sessionCampusLoose(a);
    const c2 = sessionCampusLoose(b);
    return Boolean(sp1 && sp1 === sp2 && c1 != null && c2 != null && c1 === c2);
};

const extractConversationIdFromObject = (o) => {
    if (!o || typeof o !== 'object') return null;
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
    if (r == null || r === '') return null;
    return r;
};

const pickIncomingConversationId = (payload) => {
    if (!payload || typeof payload !== 'object') return null;
    let body = payload;
    if (typeof payload.body === 'string') {
        try {
            body = JSON.parse(payload.body);
        } catch {
            body = payload;
        }
    } else if (payload.body && typeof payload.body === 'object') {
        body = payload.body;
    }
    let raw =
        extractConversationIdFromObject(body) ?? extractConversationIdFromObject(payload) ?? null;
    if (raw == null && typeof body?.message === 'string') {
        const t = body.message.trim();
        if (t.startsWith('{') || t.startsWith('[')) {
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
            if (n && typeof n === 'object') {
                raw = extractConversationIdFromObject(n);
                if (raw != null) break;
            }
        }
    }
    if (raw == null && body && typeof body === 'object' && body.data && typeof body.data === 'object') {
        raw = extractConversationIdFromObject(body.data);
    }
    if (raw == null || raw === '') return null;
    return raw;
};

const getParentUserEmailLower = () => {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return '';
        const u = JSON.parse(raw);
        return String(u?.email || u?.username || '').trim().toLowerCase();
    } catch {
        return '';
    }
};

const getParentPrincipalCandidatesLower = () => {
    const set = new Set();
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return set;
        const u = JSON.parse(raw);
        [u?.email, u?.username, u?.userName, u?.sub].forEach((x) => {
            const s = String(x || '').trim().toLowerCase();
            if (s) set.add(s);
        });
    } catch {
        /* ignore */
    }
    return set;
};

const normalizeWsPrincipal = (v) =>
    String(v || '')
        .trim()
        .toLowerCase()
        .replace(/^["'<\s]+|["'>\s]+$/g, '');

/**
 * receiverName từ BE có thể là email/username principal — khớp với identity phụ huynh.
 * Nhiều BE khi push qua convertAndSendToUser **không gửi receiverName** trong body (chỉ có sender + nội dung);
 * frame đã vào queue /user/... của đúng session — khi đó coi là tin cho phụ huynh nếu sender không phải chính mình.
 */
const receiverMatchesParent = (payload, emailFallbackLower) => {
    const recv = normalizeWsPrincipal(payload?.receiverName);
    const send = normalizeWsPrincipal(payload?.senderName);
    const candidates = getParentPrincipalCandidatesLower();
    const fb = String(emailFallbackLower || '').trim().toLowerCase();
    if (fb) candidates.add(fb);

    if (!recv) {
        if (send && candidates.has(send)) return false;
        return true;
    }
    if (candidates.has(recv)) return true;
    /** BE đôi khi ghi nhầm receiver (vd email tư vấn). Tin đã vào queue /user của phụ huynh thì vẫn nhận nếu không phải echo tự gửi. */
    if (send && candidates.has(send)) return false;
    return true;
};

/**
 * Echo tin tự gửi (bỏ qua khỏi WS handler).
 * Ưu tiên senderEmail: có email và không phải phụ huynh → luôn là tin đối phương (TVV/system), không lọc.
 * Tránh lỗi cũ: senderName + senderEmail cùng TVV nhưng .every() lên cả hai field vẫn false — OK;
 * nhưng chỉ một field khớp parent + field kia TVV có thể làm every false — tin vẫn nhận;
 * quan trọng: BE chỉ gửi senderEmail TVV → không còn nhầm với “self” vì thiếu email.
 * Chỉ một field (vd senderName) trùng parent + receiverName rỗng: BE thường bỏ receiver — không coi echo
 * (tránh nuốt tin; echo thật từ server thường có receiverName = TVV).
 */
const senderLooksLikeParentSelf = (payload) => {
    if (!payload || typeof payload !== 'object') return false;
    const candidates = getParentPrincipalCandidatesLower();
    const email = normalizeWsPrincipal(payload?.senderEmail);
    if (email) {
        if (!candidates.has(email)) return false;
        return true;
    }
    const identifiers = [
        normalizeWsPrincipal(payload?.senderName),
        normalizeWsPrincipal(typeof payload?.sender === 'string' ? payload.sender : ''),
        normalizeWsPrincipal(payload?.fromUser),
        normalizeWsPrincipal(payload?.username),
    ].filter(Boolean);
    if (identifiers.length === 0) return false;
    const allSelf = identifiers.every((id) => candidates.has(id));
    if (!allSelf) return false;
    const recv = normalizeWsPrincipal(payload?.receiverName);
    if (identifiers.length === 1 && !recv) {
        return false;
    }
    return true;
};

/**
 * Khớp tin WS với cuộc đang mở: theo id; hoặc id trên selection lệch nhưng list có dòng đúng id + cùng phiên;
 * hoặc draft: receiver = phụ huynh, sender khác phụ huynh — không bắt buộc trùng email tư vấn trên thẻ trường (dữ liệu search hay sai).
 */
const privateMessageBelongsToParentSelection = (
    selected,
    incomingConversationId,
    payload,
    userEmail,
    conversationItems
) => {
    if (!selected || incomingConversationId == null || String(incomingConversationId).trim() === '') return false;

    const selectedId = selected?.conversationId ?? selected?.id;
    const selectedIdStr = selectedId != null ? String(selectedId).trim() : '';

    if (selectedIdStr !== '' && isSameConversationId(selectedId, incomingConversationId)) {
        return true;
    }

    const items = Array.isArray(conversationItems) ? conversationItems : [];
    if (selectedIdStr !== '') {
        const listAligns = items.some((item) => {
            if (!isSameConversationId(item?.conversationId ?? item?.id, incomingConversationId)) return false;
            if (isSameConversationSessionLoose(selected, item)) return true;
            const cSel = sessionCampusLoose(selected);
            const cIt = sessionCampusLoose(item);
            if (cSel != null && cIt != null && cSel !== cIt) return false;
            if (cSel != null && cIt == null) return true;
            const spSel = sessionStudentIdLoose(selected);
            const spIt = sessionStudentIdLoose(item);
            if (cSel == null && cIt == null) return !spSel || !spIt || spSel === spIt;
            return !spSel || !spIt || spSel === spIt;
        });
        if (listAligns) return true;
        // Không mở rộng "đang xem" sang mọi tin tới parent: đang mở cuộc A mà tin thuộc cuộc B vẫn phải tăng unread.
        return false;
    }

    if (!receiverMatchesParent(payload, userEmail)) return false;
    const send = normalizeWsPrincipal(payload?.senderName);
    if (!send || senderLooksLikeParentSelf(payload)) return false;

    const selCampus = meaningfulSessionCampus(selected);
    const payloadCampus = meaningfulSessionCampus(payload);
    if (selCampus != null && payloadCampus != null && payloadCampus !== selCampus) {
        return false;
    }

    /**
     * BE/STOMP thường chỉ gửi conversationId + nội dung; campusId/studentProfileId có thể thiếu hoặc = 0.
     * Khi phụ huynh mở chat từ trang trường (draft đã có campus + con), lấy campus/student từ selected
     * khi payload không có giá trị có nghĩa — không thì tin TVV không khớp phiên → không append bubble.
     */
    const payloadSession = {
        conversationId: incomingConversationId,
        campusId: meaningfulSessionCampus(payload) ?? meaningfulSessionCampus(selected),
        studentProfileId:
            sessionStudentIdLoose(payload) ||
            sessionStudentIdLoose(selected) ||
            null,
    };

    const counsellor = (
        selected?.counsellorEmail ||
        selected?.participantEmail ||
        selected?.otherUser ||
        ''
    )
        .toString()
        .trim()
        .toLowerCase();
    /** Cùng email tư vấn ≠ cùng cuộc (nhánh draft): chỉ coi “đang xem” khi khớp session hoặc đúng id trên list. */
    if (counsellor && send === counsellor) {
        if (isSameConversationSessionLoose(selected, payloadSession)) return true;
        if (items.some((item) => isSameConversationId(item?.conversationId ?? item?.id, incomingConversationId))) {
            return true;
        }
        return false;
    }

    if (items.some((item) => isSameConversationId(item?.conversationId ?? item?.id, incomingConversationId))) {
        return true;
    }

    if (isSameConversationSessionLoose(selected, payloadSession)) return true;

    return false;
};

const tryParseJsonObject = (value) => {
    if (value == null) return {};
    if (typeof value === 'string') {
        try {
            const o = JSON.parse(value);
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch {
            return {};
        }
    }
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    return {};
};

const unwrapEnvelopePayload = (response) => {
    let node = response?.data?.body?.body ?? response?.data?.body ?? response?.data ?? {};
    if (typeof node === 'string') {
        node = tryParseJsonObject(node);
    }
    if (node && typeof node === 'object' && !Array.isArray(node) && node.body != null) {
        const inner = typeof node.body === 'string' ? tryParseJsonObject(node.body) : node.body;
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
            return inner;
        }
    }
    return node && typeof node === 'object' && !Array.isArray(node) ? node : {};
};

const pickListItemsFromPayload = (p) => {
    if (p == null) return [];
    if (Array.isArray(p)) return p;
    if (typeof p !== 'object') return [];
    if (Array.isArray(p.items)) return p.items;
    if (Array.isArray(p.content)) return p.content;
    if (Array.isArray(p.conversations)) return p.conversations;
    if (Array.isArray(p.data)) return p.data;
    if (Array.isArray(p.result)) return p.result;
    if (p.data && typeof p.data === 'object') {
        if (Array.isArray(p.data.items)) return p.data.items;
        if (Array.isArray(p.data.content)) return p.data.content;
    }
    return [];
};

/** Chuẩn hóa envelope GET /parent/conversations (body string, items/content, v.v.). */
const parseParentConversationsEnvelope = (response) => {
    const top = unwrapEnvelopePayload(response);
    return {
        items: pickListItemsFromPayload(top),
        nextCursorId: top?.nextCursorId ?? top?.cursorId ?? null,
        hasMore: !!top?.hasMore,
    };
};

const formatSectionDateLabel = (value) => {
    if (!value) return "Hôm nay";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Hôm nay";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Hôm nay";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
    return date.toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit", year: "numeric"});
};

const STUDENT_CHAT_THEMES = [
    {
        headerGradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 52%, #38bdf8 100%)',
        bubbleGradient: 'linear-gradient(145deg, #38bdf8 0%, #3b82f6 52%, #2563eb 100%)',
        accent: '#2563eb',
        accentSoft: 'rgba(59, 130, 246, 0.16)',
        border: 'rgba(59, 130, 246, 0.34)',
        peerAvatar: '#2563eb',
    },
    {
        headerGradient: 'linear-gradient(135deg, #065f46 0%, #059669 55%, #2dd4bf 100%)',
        bubbleGradient: 'linear-gradient(145deg, #2dd4bf 0%, #059669 52%, #065f46 100%)',
        accent: '#047857',
        accentSoft: 'rgba(5, 150, 105, 0.16)',
        border: 'rgba(5, 150, 105, 0.34)',
        peerAvatar: '#065f46',
    },
    {
        headerGradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #f59e0b 100%)',
        bubbleGradient: 'linear-gradient(145deg, #f59e0b 0%, #ea580c 52%, #7c2d12 100%)',
        accent: '#c2410c',
        accentSoft: 'rgba(234, 88, 12, 0.16)',
        border: 'rgba(234, 88, 12, 0.34)',
        peerAvatar: '#9a3412',
    },
];

const lowerString = (value) => (value ?? '').toString().trim().toLowerCase();

const parseParentStudentsResponse = (response) => {
    const body = response?.data?.body?.body ?? response?.data?.body ?? response?.data ?? null;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.students)) return body.students;
    if (Array.isArray(body?.items)) return body.items;
    if (body && typeof body === "object") return [body];
    return [];
};

const normalizeParentStudent = (student, index) => {
    const studentProfileId =
        student?.studentProfileId ??
        student?.studentId ??
        student?.id ??
        null;
    const childName =
        student?.childName ??
        student?.studentName ??
        student?.name ??
        `Học sinh ${index + 1}`;
    return {
        studentProfileId: studentProfileId != null ? String(studentProfileId).trim() : "",
        childName: String(childName || `Học sinh ${index + 1}`).trim() || `Học sinh ${index + 1}`,
        raw: student || null
    };
};

const getConversationDisplayTitle = (c) =>
    c?.title || c?.name || c?.schoolName || c?.school || 'Cuộc trò chuyện';

const pickConversationSchoolLogoUrl = (c) => {
    if (!c || typeof c !== "object") return "";
    const r = c.raw;
    const candidates = [
        c.schoolLogoUrl,
        c.schoolLogo,
        c.school_logo_url,
        c.logoUrl,
        c.school?.schoolLogoUrl,
        c.school?.schoolLogo,
        c.school?.logoUrl,
        c.school?.logo,
        r?.schoolLogoUrl,
        r?.schoolLogo,
        r?.school?.logoUrl,
        r?.school?.schoolLogoUrl
    ];
    for (const v of candidates) {
        const s = (v ?? "").toString().trim();
        if (s) return s;
    }
    return "";
};

const doesConversationMatchStudent = (conversation, student) => {
    if (!student) return true;

    const conversationKeys = [
        conversation?.studentId,
        conversation?.student?.id,
        conversation?.studentProfileId,
        conversation?.childId,
        conversation?.studentName,
        conversation?.student?.name,
        conversation?.childName,
    ]
        .map(lowerString)
        .filter(Boolean);

    if (!conversationKeys.length) return true;

    const studentKeys = [student?.id, student?.name].map(lowerString).filter(Boolean);
    if (!studentKeys.length) return true;

    return conversationKeys.some((conversationKey) =>
        studentKeys.some((studentKey) => conversationKey === studentKey)
    );
};

const areStudentProfilesEquivalent = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const aTraits = Array.isArray(a?.traits) ? a.traits : [];
    const bTraits = Array.isArray(b?.traits) ? b.traits : [];
    if (aTraits.length !== bTraits.length) return false;
    for (let i = 0; i < aTraits.length; i += 1) {
        const at = aTraits[i] || {};
        const bt = bTraits[i] || {};
        if ((at?.name || '') !== (bt?.name || '') || (at?.description || '') !== (bt?.description || '')) return false;
    }
    return (
        String(a?.studentProfileId ?? '') === String(b?.studentProfileId ?? '') &&
        String(a?.childName ?? '') === String(b?.childName ?? '') &&
        String(a?.favouriteJob ?? '') === String(b?.favouriteJob ?? '') &&
        String(a?.gender ?? '') === String(b?.gender ?? '') &&
        String(a?.personalityCode ?? a?.personalityTypeCode ?? '') ===
            String(b?.personalityCode ?? b?.personalityTypeCode ?? '') &&
        String(a?.academicProfileMetadata?.length ?? 0) === String(b?.academicProfileMetadata?.length ?? 0) &&
        String(a?.subjectsInSystem?.length ?? 0) === String(b?.subjectsInSystem?.length ?? 0)
    );
};

const areMessageListsEquivalent = (prev, next) => {
    if (prev === next) return true;
    if (!Array.isArray(prev) || !Array.isArray(next)) return false;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i += 1) {
        const p = prev[i] || {};
        const n = next[i] || {};
        if (
            String(p?.id ?? '') !== String(n?.id ?? '') ||
            String(p?.text ?? '') !== String(n?.text ?? '') ||
            String(p?.sender ?? '') !== String(n?.sender ?? '') ||
            String(p?.sentAt ?? '') !== String(n?.sentAt ?? '')
        ) {
            return false;
        }
    }
    return true;
};

function MainHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [messageAnchorEl, setMessageAnchorEl] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [_loadingProfile, setLoadingProfile] = useState(false);
    const [conversationItems, setConversationItems] = useState([]);
    const [conversationLoading, setConversationLoading] = useState(false);
    const [conversationError, setConversationError] = useState('');
    const [nextCursorId, setNextCursorId] = useState(null);
    const [hasMoreConversations, setHasMoreConversations] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messageItems, setMessageItems] = useState([]);
    const [messageLoading, setMessageLoading] = useState(false);
    const [messageError, setMessageError] = useState('');
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [messageNextCursorId, setMessageNextCursorId] = useState(null);
    const [messageHasMore, setMessageHasMore] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatWindowOpen, setChatWindowOpen] = useState(false);
    const [chatWindowMinimized, setChatWindowMinimized] = useState(false);
    const [selectedConversationStudent, setSelectedConversationStudent] = useState(null);
    const [studentInfoOpen, setStudentInfoOpen] = useState(false);
    const [headerScrolled, setHeaderScrolled] = useState(false);
    const [studentSelectDialogOpen, setStudentSelectDialogOpen] = useState(false);
    const [studentSelectLoading, setStudentSelectLoading] = useState(false);
    const [studentSelectOptions, setStudentSelectOptions] = useState([]);
    const [pendingChatTarget, setPendingChatTarget] = useState(null);
    /** Badge khi BE không gửi conversationId trên WS nhưng tin đã vào queue phụ huynh. */
    const [parentWsUnreadBump, setParentWsUnreadBump] = useState(0);

    const chatListRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const hasMarkedReadRef = React.useRef(false);
    const markReadInFlightRef = React.useRef(false);
    /** PUT read đang chạy mà có thêm yêu cầu force (WS / focus ô nhập) → chạy lại ngay sau khi xong. */
    const pendingParentMarkReadAfterInFlightRef = React.useRef(false);
    const lastParentInputMarkReadAtRef = React.useRef(0);
    const parentWsPostRefreshTimerRef = React.useRef(null);
    const markParentConversationReadRef = React.useRef(null);
    const selectedConversationRef = React.useRef(null);
    const chatWindowOpenRef = React.useRef(false);
    const chatWindowMinimizedRef = React.useRef(false);
    const conversationItemsRef = React.useRef([]);
    const loadMessageHistoryRef = React.useRef(null);
    const loadConversationsRef = React.useRef(null);
    const forbiddenHistoryConversationIdsRef = React.useRef(new Set());
    const parentStickToBottomRef = React.useRef(true);
    const messageHasMoreRef = React.useRef(false);
    const messageNextCursorIdRef = React.useRef(null);
    /** Chỉ true sau khi phụ huynh tương tác ô nhập (pointer/key) — tránh mở chat là coi như đã đọc, WS không tăng unread. */
    const parentComposerEngagedRef = React.useRef(false);
    conversationItemsRef.current = conversationItems;
    chatWindowOpenRef.current = chatWindowOpen;
    chatWindowMinimizedRef.current = chatWindowMinimized;
    selectedConversationRef.current = selectedConversation;
    messageHasMoreRef.current = messageHasMore;
    messageNextCursorIdRef.current = messageNextCursorId;

    const location = useLocation();
    const navigate = useNavigate();
    const isHomePage = location.pathname === '/home' || location.pathname === '/';
    const isSignedIn = typeof window !== 'undefined' && localStorage.getItem('user');
    const headerElevated = headerScrolled || !isHomePage;
    const isHomeHeroTransparent = isHomePage && !headerElevated;

    const getUserInfo = () => {
        if (localStorage.getItem('user')) {
            try {
                return JSON.parse(localStorage.getItem('user'));
            } catch {
                return null;
            }
        }
        return null;
    };
    
    const userInfo = getUserInfo();
    const normalizedRole = normalizeUserRole(userInfo?.role);
    const isParent = normalizedRole === 'PARENT';
    const isSchool = normalizedRole === 'SCHOOL';
    const isAdmin = normalizedRole === 'ADMIN';
    const userIdentitySet = React.useMemo(() => {
        return new Set(
            [
                userInfo?.email,
                userInfo?.username,
                userInfo?.userName,
                userInfo?.sub
            ]
                .filter(Boolean)
                .map((v) => String(v).toLowerCase())
        );
    }, [userInfo]);
    const selectedParentStudent = useMemo(() => {
        if (!selectedConversationStudent && !selectedConversation) return null;
        const idCandidate =
            selectedConversationStudent?.studentProfileId ??
            selectedConversation?.studentProfileId ??
            selectedConversation?.studentId ??
            selectedConversation?.student?.id;
        const nameCandidate =
            selectedConversationStudent?.childName ??
            selectedConversationStudent?.studentName ??
            selectedConversation?.studentName ??
            selectedConversation?.childName;
        return {
            id: idCandidate != null ? String(idCandidate) : '',
            name: String(nameCandidate || '').trim() || 'Học sinh',
            index: 0,
            raw: selectedConversationStudent || selectedConversation || null
        };
    }, [selectedConversationStudent, selectedConversation]);
    const filteredConversationItems = useMemo(
        () => conversationItems,
        [conversationItems]
    );
    const selectedStudentTheme = useMemo(() => {
        const studentIndex = Math.max(0, selectedParentStudent?.index ?? 0);
        return STUDENT_CHAT_THEMES[studentIndex % STUDENT_CHAT_THEMES.length];
    }, [selectedParentStudent]);
    const selectedStudentName =
        selectedConversation?.studentName ||
        selectedConversation?.childName ||
        selectedParentStudent?.name ||
        'Học sinh';
    const selectedStudentCompactInfo = useMemo(
        () => getStudentCompactInfo(selectedParentStudent),
        [selectedParentStudent]
    );
    const selectedStudentGradeTable = useMemo(
        () => buildAcademicScoreTable(selectedParentStudent?.raw),
        [selectedParentStudent]
    );
    const selectedStudentPersonalityInsights = useMemo(
        () => extractPersonalityInsights(selectedParentStudent?.raw),
        [selectedParentStudent]
    );
    const selectedConversationTitle = useMemo(
        () => getConversationDisplayTitle(selectedConversation),
        [selectedConversation]
    );
    const selectedCounsellorEmail = useMemo(
        () =>
            (
                selectedConversation?.counsellorEmail ||
                selectedConversation?.participantEmail ||
                selectedConversation?.otherUser ||
                ""
            )
                .toString()
                .trim(),
        [selectedConversation]
    );
    const peerChatInitial = useMemo(() => {
        const ch = (selectedConversationTitle || '').trim().charAt(0);
        return ch ? ch.toUpperCase() : 'T';
    }, [selectedConversationTitle]);
    const peerSchoolLogoUrl = useMemo(() => {
        const u = pickConversationSchoolLogoUrl(selectedConversation);
        return u || null;
    }, [selectedConversation]);
    const selectedConversationUnreadCount = useMemo(() => {
        const unread = Number(
            selectedConversation?.unreadCount ??
                selectedConversation?.unreadMessages ??
                selectedConversation?.unread ??
                selectedConversation?.unreadMessageCount ??
                selectedConversation?.numberOfUnread ??
                0
        );
        return Number.isFinite(unread) && unread > 0 ? Math.trunc(unread) : 0;
    }, [selectedConversation]);
    const parentChatHasUnread = selectedConversationUnreadCount > 0;
    const isStudentInfoOpen = studentInfoOpen;
    /** Badge header: số cuộc trò chuyện có tin chưa đọc (không cộng dồn từng tin). */
    const conversationsWithUnreadCount = filteredConversationItems.reduce((count, item) => {
        const unread = Number(
            item?.unreadCount ??
                item?.unreadMessages ??
                item?.unread ??
                item?.unreadMessageCount ??
                item?.numberOfUnread ??
                0
        );
        return count + (Number.isFinite(unread) && unread > 0 ? 1 : 0);
    }, 0);
    /** WS thiếu conversationId: coi thêm tối đa 1 cuộc chưa gắn danh sách. */
    const parentHeaderUnreadDisplay = Math.min(
        99,
        conversationsWithUnreadCount + (parentWsUnreadBump > 0 ? 1 : 0)
    );

    const parseConversationResponse = parseParentConversationsEnvelope;

    const normalizeConversation = (conversation) => {
        const rawCampusId = conversation?.campusId ?? conversation?.campusID ?? null;
        const campusIdParsed = rawCampusId != null ? Number(rawCampusId) : NaN;
        const unreadNorm =
            Number(
                conversation?.unreadCount ??
                    conversation?.unreadMessages ??
                    conversation?.unread ??
                    conversation?.unreadMessageCount ??
                    conversation?.numberOfUnread ??
                    0
            ) || 0;
        return {
            ...conversation,
            conversationId: conversation?.conversationId ?? conversation?.id ?? conversation?.conversation?.id ?? null,
            campusId: Number.isFinite(campusIdParsed) ? campusIdParsed : null,
            unreadCount: unreadNorm,
            unreadMessages: unreadNorm,
            participantEmail: conversation?.participantEmail ?? conversation?.otherUser ?? conversation?.counsellorEmail ?? '',
            /** Chỉ email TVV được gán rõ — không dùng otherUser/participantEmail làm TVV (thường là trường/inbox), kẻo WS gửi receiverName khác rỗng và BE không fan-out campus. */
            counsellorEmail:
                String(conversation?.counsellorEmail ?? '').trim() ||
                String(conversation?.participantCounsellorEmail ?? '').trim() ||
                '',
            schoolEmail: conversation?.schoolEmail ?? conversation?.otherUser ?? conversation?.participantEmail ?? '',
            schoolName: conversation?.schoolName ?? conversation?.school ?? '',
            schoolLogoUrl: pickConversationSchoolLogoUrl(conversation),
            name:
                conversation?.name ??
                conversation?.participantName ??
                conversation?.title ??
                conversation?.schoolName ??
                conversation?.school ??
                conversation?.otherUser ??
                'Cuộc trò chuyện',
            title:
                conversation?.title ??
                conversation?.name ??
                conversation?.participantName ??
                conversation?.schoolName ??
                conversation?.school ??
                conversation?.otherUser ??
                'Cuộc trò chuyện',
            lastMessage: conversation?.lastMessage?.content ?? conversation?.lastMessage ?? conversation?.latestMessage ?? '',
            updatedAt: conversation?.updatedAt ?? conversation?.lastMessageTime ?? conversation?.time ?? null,
            childName: String(conversation?.childName ?? conversation?.student?.childName ?? '').trim(),
            studentName: String(
                conversation?.studentName ?? conversation?.childName ?? conversation?.student?.name ?? ''
            ).trim()
        };
    };

    const parseHistoryResponse = (response) => {
        const payload = parseMessagesHistoryPayloadRoot(response);
        const items = Array.isArray(payload?.messages)
            ? payload.messages
            : Array.isArray(payload?.items)
              ? payload.items
              : [];
        const subjectsInSystem = extractSubjectsInSystemFromPayload(payload);
        const studentProfile = {
            ...payload,
            studentProfileId: payload?.studentProfileId ?? payload?.studentId ?? null,
            childName: payload?.childName ?? payload?.ChildName ?? payload?.studentName ?? '',
            personalityTypeCode:
                payload?.personalityCode ?? payload?.personalityTypeCode ?? payload?.personalityType?.code ?? '',
            favouriteJob: payload?.favouriteJob ?? payload?.favoriteJob ?? '',
            traits: Array.isArray(payload?.traits) ? payload.traits : [],
            academicProfileMetadata: Array.isArray(payload?.academicProfileMetadata)
                ? payload.academicProfileMetadata
                : [],
            academicInfos: Array.isArray(payload?.academicInfos) ? payload.academicInfos : [],
            subjectsInSystem,
        };
        return {
            items,
            nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
            hasMore: !!payload?.hasMore,
            studentProfile
        };
    };

    const normalizeMessage = (message) => {
        const id = message?.id || message?.messageId || message?.clientMessageId || `${message?.sentAt || Date.now()}-${Math.random()}`;
        const text = message?.content || message?.message || message?.text || "";
        const sender =
            message?.senderEmail ||
            message?.sender ||
            message?.senderName ||
            message?.from ||
            message?.username ||
            message?.createdBy ||
            "";
        const sentAt = message?.sentAt || message?.createdAt || message?.timestamp || message?.time || null;
        return {id, text, sender, sentAt, raw: message};
    };

    const mergeUniqueMessages = (messages) => {
        const map = new Map();
        messages.forEach((message, index) => {
            if (message == null) return;
            const idRaw = message.id;
            const hasStableId = idRaw != null && String(idRaw).trim() !== '';
            const key = hasStableId
                ? String(idRaw)
                : `noid-${index}-${message.sentAt ?? ''}-${String(message.text ?? '').slice(0, 24)}-${Math.random().toString(36).slice(2, 9)}`;
            map.set(key, message);
        });
        return Array.from(map.values()).sort((a, b) => {
            const aTime = a?.sentAt ? new Date(a.sentAt).getTime() : 0;
            const bTime = b?.sentAt ? new Date(b.sentAt).getTime() : 0;
            return aTime - bTime;
        });
    };

    const formatMessageTime = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("vi-VN", {hour: "2-digit", minute: "2-digit"});
    };

    const groupedParentMessages = useMemo(() => {
        const groups = [];
        let currentKey = "";
        messageItems.forEach((message) => {
            const sentAt = message?.sentAt;
            const key = sentAt ? new Date(sentAt).toDateString() : "unknown";
            if (!groups.length || currentKey !== key) {
                groups.push({
                    key,
                    label: formatSectionDateLabel(sentAt),
                    items: [message],
                });
                currentKey = key;
            } else {
                groups[groups.length - 1].items.push(message);
            }
        });
        return groups;
    }, [messageItems]);

    const isParentMessageMine = React.useCallback(
        (msg) => {
            const r = msg?.raw || {};
            const nested = r.sender && typeof r.sender === "object" ? r.sender : null;
            const candidates = [
                r.senderEmail,
                r.senderName,
                nested?.email,
                nested?.name,
                typeof r.sender === "string" ? r.sender : null,
                msg.sender,
                r.from,
                r.username,
                r.createdBy,
                r.userEmail,
            ]
                .map(lowerString)
                .filter(Boolean);

            for (const c of candidates) {
                if (userIdentitySet.has(c)) return true;
            }

            const myName = lowerString(userInfo?.name || userInfo?.fullName);
            const senderDisplay = lowerString(r.senderName || r.senderDisplayName);
            if (myName && senderDisplay && myName === senderDisplay) return true;

            return false;
        },
        [userIdentitySet, userInfo]
    );

    /** Bubble tin từ tư vấn: vệt nền xanh theo unreadCount (N tin peer gần nhất). */
    const peerUnreadBubbleIdSet = React.useMemo(() => {
        const raw = Number(selectedConversationUnreadCount || 0) || 0;
        const n = Math.min(40, raw);
        if (n <= 0 || !messageItems.length) return new Set();
        const set = new Set();
        let counted = 0;
        for (let i = messageItems.length - 1; i >= 0 && counted < n; i -= 1) {
            const m = messageItems[i];
            if (!m || isParentMessageMine(m)) continue;
            set.add(String(m.id ?? ''));
            counted += 1;
        }
        return set;
    }, [messageItems, selectedConversationUnreadCount, isParentMessageMine]);

    /** Tránh 2 bubble: optimistic + cùng tin từ API sau poll/refresh history (khác id). */
    const removeOptimisticShadowedByServer = React.useCallback(
        (merged, serverNormalized) => {
            if (!Array.isArray(merged) || !Array.isArray(serverNormalized) || !serverNormalized.length) {
                return merged;
            }
            const textsFromMeOnServer = new Set();
            for (const sm of serverNormalized) {
                if (!isParentMessageMine(sm)) continue;
                const t = String(sm.text ?? '').trim();
                if (t) textsFromMeOnServer.add(t);
            }
            if (!textsFromMeOnServer.size) return merged;
            return merged.filter((m) => {
                if (!String(m.id ?? '').startsWith('optimistic-')) return true;
                const t = String(m.text ?? '').trim();
                return !textsFromMeOnServer.has(t);
            });
        },
        [isParentMessageMine]
    );

    const loadConversations = async (cursorId = null, options = {}) => {
        const silent = Boolean(options.silent);
        if (!silent) {
            setConversationLoading(true);
            setConversationError('');
        }

        try {
            const response = await getParentConversations(cursorId);
            if (response?.status === 200) {
                const parsed = parseConversationResponse(response);
                const normalizedItems = parsed.items.map(normalizeConversation);
                setConversationItems((prev) => {
                    if (cursorId) return [...prev, ...normalizedItems];
                    if (!normalizedItems.length) return prev;
                    // API thường trả unread=0 — giữ max với state local; giữ dòng chỉ có từ WS (chưa có trong API)
                    const mergedFromApi = normalizedItems.map((norm) => {
                        const id = norm?.conversationId ?? norm?.id;
                        const openChatSameConv =
                            chatWindowOpenRef.current &&
                            !chatWindowMinimizedRef.current &&
                            selectedConversationRef.current &&
                            id != null &&
                            String(id).trim() !== '' &&
                            isSameConversationId(
                                selectedConversationRef.current?.conversationId ??
                                    selectedConversationRef.current?.id,
                                id
                            );
                        /** Đã chạm ô nhập trong cuộc đang mở → GET ép unread 0. */
                        const viewingThisAsRead =
                            openChatSameConv && parentComposerEngagedRef.current;
                        const prevHit = prev.find((p) =>
                            isSameConversationId(p?.conversationId ?? p?.id, id)
                        );
                        if (!prevHit) {
                            if (viewingThisAsRead) {
                                return {...norm, unreadCount: 0, unreadMessages: 0};
                            }
                            return norm;
                        }
                        const pu = Number(prevHit.unreadCount ?? prevHit.unreadMessages ?? 0) || 0;
                        const nu = Number(norm.unreadCount ?? norm.unreadMessages ?? 0) || 0;
                        /** Không ép u=0 chỉ vì đang mở popup (openChatSameConv) — dễ nuốt unread mới khi chưa PUT mark read. */
                        const u = viewingThisAsRead ? 0 : Math.max(pu, nu);
                        return {...norm, unreadCount: u, unreadMessages: u};
                    });
                    const apiIdSet = new Set(
                        mergedFromApi
                            .map((x) => String(x?.conversationId ?? x?.id ?? '').trim())
                            .filter(Boolean)
                    );
                    const onlyLocal = prev.filter((p) => {
                        const pid = String(p?.conversationId ?? p?.id ?? '').trim();
                        return pid && !apiIdSet.has(pid);
                    });
                    return [...onlyLocal, ...mergedFromApi];
                });
                setNextCursorId(parsed.nextCursorId);
                setHasMoreConversations(parsed.hasMore);
                if (!cursorId && !silent) {
                    setParentWsUnreadBump(0);
                }
            } else if (!silent) {
                setConversationError('Không thể tải danh sách tin nhắn.');
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            if (!silent) {
                setConversationError('Không thể tải danh sách tin nhắn.');
            }
        } finally {
            if (!silent) {
                setConversationLoading(false);
            }
        }
    };

    loadConversationsRef.current = loadConversations;

    useEffect(() => {
        if (!isSignedIn || !isParent) return;
        void loadConversations();
    }, [isSignedIn, isParent]);

    useEffect(() => {
        if (!ENABLE_PARENT_CONVERSATION_POLL || !isSignedIn || !isParent) return;
        const intervalId = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            void loadConversationsRef.current?.(null, {silent: true});
        }, PARENT_CONVERSATION_POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isSignedIn, isParent]);

    const resolveConversationEmails = (conversation) => {
        const parentEmail = userInfo?.email || conversation?.parentEmail || conversation?.participantParentEmail || '';
        const counsellorEmail = conversation?.counsellorEmail || conversation?.otherUser || conversation?.participantCounsellorEmail || conversation?.participantEmail || '';
        return {parentEmail, counsellorEmail};
    };

    /**
     * Người nhận STOMP: khớp hiển thị "Tư vấn viên:" (counsellorEmail → participantEmail → otherUser).
     * BE đôi khi chỉ trả email TVV ở otherUser/participantEmail, không điền counsellorEmail — vẫn phải gửi receiverName cho TVV.
     * Chỉ fallback sang otherUser/participantEmail khi có dạng email (@) để tránh inbox trường/tên hiển thị làm hết fan-out campus.
     */
    const resolveWebSocketReceiverName = (conversation) => {
        const explicit =
            String(conversation?.counsellorEmail ?? '').trim() ||
            String(conversation?.participantCounsellorEmail ?? '').trim();
        if (explicit) return explicit;
        const peer = String(conversation?.participantEmail ?? conversation?.otherUser ?? '').trim();
        if (peer.includes('@')) return peer;
        return '';
    };

    const resolveHistoryCampusId = (conversation) => {
        const raw = conversation?.campusId ?? conversation?.campusID ?? null;
        if (raw == null || String(raw).trim() === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    };

    const resolveCampusIdFromHistory = (parsed) => {
        const profile = parsed?.studentProfile || {};
        const fromProfile = profile?.campusId ?? profile?.campusID ?? profile?.campus?.id ?? null;
        if (fromProfile != null && String(fromProfile).trim() !== '') {
            const n = Number(fromProfile);
            if (Number.isFinite(n)) return n;
        }
        const firstItem = Array.isArray(parsed?.items) && parsed.items.length ? parsed.items[0] : null;
        const fromMessage = firstItem?.campusId ?? firstItem?.campusID ?? firstItem?.campus?.id ?? null;
        if (fromMessage != null && String(fromMessage).trim() !== '') {
            const n = Number(fromMessage);
            if (Number.isFinite(n)) return n;
        }
        return null;
    };

    const resolveConversationIdFromHistory = (parsed) => {
        const profile = parsed?.studentProfile || {};
        const candidates = [
            profile?.conversationId,
            parsed?.conversationId,
            parsed?.items?.[0]?.conversationId,
            parsed?.items?.[0]?.conversation?.id
        ];
        for (const candidate of candidates) {
            if (candidate == null || String(candidate).trim() === '') continue;
            return candidate;
        }
        return null;
    };

    /** Khớp cuộc đang chọn với payload history khi chưa có conversationId (draft). */
    const isSameConversationSession = (prev, conv) => {
        if (!prev || !conv) return false;
        const prevId = prev?.conversationId ?? prev?.id;
        const convId = conv?.conversationId ?? conv?.id;
        if (prevId != null && convId != null) {
            return isSameConversationId(prevId, convId);
        }
        const sp1 = String(prev?.studentProfileId ?? prev?.studentId ?? prev?.student?.id ?? '').trim();
        const sp2 = String(conv?.studentProfileId ?? conv?.studentId ?? conv?.student?.id ?? '').trim();
        const c1 = resolveHistoryCampusId(prev);
        const c2 = resolveHistoryCampusId(conv);
        return Boolean(sp1 && sp1 === sp2 && c1 != null && c1 === c2);
    };

    const loadMessageHistory = async ({conversation, cursorId = null, silent = false}) => {
        if (!conversation) return;
        const conversationKey = String(conversation?.conversationId ?? conversation?.id ?? '');
        if (silent && conversationKey && forbiddenHistoryConversationIdsRef.current.has(conversationKey)) {
            return;
        }
        const {parentEmail} = resolveConversationEmails(conversation);
        const campusId = resolveHistoryCampusId(conversation);

        if (!parentEmail || campusId == null) {
            if (!silent) setMessageError('Thiếu thông tin cơ sở hoặc tài khoản để tải lịch sử tin nhắn.');
            return;
        }

        const studentProfileId =
            conversation?.studentProfileId ??
            conversation?.studentId ??
            conversation?.student?.id ??
            null;
        if (studentProfileId == null || String(studentProfileId).trim() === '') {
            if (!silent) setMessageError('Thiếu studentProfileId để tải lịch sử tin nhắn.');
            return;
        }

        if (!silent) {
            setMessageLoading(true);
            setMessageError('');
        }
        try {
            const response = await getParentMessagesHistory({
                parentEmail,
                campusId,
                studentProfileId,
                cursorId
            });
            if (response?.status === 200) {
                if (conversationKey) forbiddenHistoryConversationIdsRef.current.delete(conversationKey);
                const parsed = parseHistoryResponse(response);
                const loadedCampusId = resolveCampusIdFromHistory(parsed);
                const loadedConversationId = resolveConversationIdFromHistory(parsed);
                if (loadedCampusId != null) {
                    const targetConversationId = conversation?.conversationId ?? conversation?.id;
                    setConversationItems((prev) =>
                        prev.map((item) => {
                            const id = item?.conversationId ?? item?.id;
                            const matchById =
                                targetConversationId != null &&
                                String(targetConversationId).trim() !== '' &&
                                isSameConversationId(id, targetConversationId);
                            const matchDraft =
                                (targetConversationId == null || String(targetConversationId).trim() === '') &&
                                (id == null || String(id).trim() === '') &&
                                isSameConversationSession(item, conversation);
                            if (!matchById && !matchDraft) return item;
                            return {...item, campusId: loadedCampusId};
                        })
                    );
                    setSelectedConversation((prev) => {
                        if (!prev) return prev;
                        const selectedId = prev?.conversationId ?? prev?.id;
                        const matchById =
                            targetConversationId != null &&
                            String(targetConversationId).trim() !== '' &&
                            isSameConversationId(selectedId, targetConversationId);
                        const matchDraft =
                            (targetConversationId == null || String(targetConversationId).trim() === '') &&
                            (selectedId == null || String(selectedId).trim() === '') &&
                            isSameConversationSession(prev, conversation);
                        if (!matchById && !matchDraft) return prev;
                        const next = {...prev, campusId: loadedCampusId};
                        selectedConversationRef.current = next;
                        return next;
                    });
                }
                if (loadedConversationId != null) {
                    const targetConversationId = conversation?.conversationId ?? conversation?.id;
                    setConversationItems((prev) =>
                        prev.map((item) => {
                            const id = item?.conversationId ?? item?.id;
                            const matchById =
                                targetConversationId != null &&
                                String(targetConversationId).trim() !== '' &&
                                isSameConversationId(id, targetConversationId);
                            const matchDraft =
                                (targetConversationId == null || String(targetConversationId).trim() === '') &&
                                (id == null || String(id).trim() === '') &&
                                isSameConversationSession(item, conversation);
                            if (!matchById && !matchDraft) return item;
                            return {...item, conversationId: loadedConversationId, id: loadedConversationId};
                        })
                    );
                    setSelectedConversation((prev) => {
                        if (!prev) return prev;
                        const selectedId = prev?.conversationId ?? prev?.id;
                        const matchById =
                            targetConversationId != null &&
                            String(targetConversationId).trim() !== '' &&
                            isSameConversationId(selectedId, targetConversationId);
                        const matchDraft =
                            (targetConversationId == null || String(targetConversationId).trim() === '') &&
                            (selectedId == null || String(selectedId).trim() === '') &&
                            isSameConversationSession(prev, conversation);
                        if (!matchById && !matchDraft) return prev;
                        const next = {...prev, conversationId: loadedConversationId, id: loadedConversationId};
                        selectedConversationRef.current = next;
                        return next;
                    });
                }
                const childNameFromHistory = String(parsed.studentProfile?.childName ?? '').trim();
                if (childNameFromHistory) {
                    const targetConversationId = conversation?.conversationId ?? conversation?.id;
                    setConversationItems((prev) =>
                        prev.map((item) => {
                            const id = item?.conversationId ?? item?.id;
                            const matchById =
                                targetConversationId != null &&
                                String(targetConversationId).trim() !== '' &&
                                isSameConversationId(id, targetConversationId);
                            const matchDraft =
                                (targetConversationId == null || String(targetConversationId).trim() === '') &&
                                (id == null || String(id).trim() === '') &&
                                isSameConversationSession(item, conversation);
                            if (!matchById && !matchDraft) return item;
                            return {...item, childName: childNameFromHistory, studentName: childNameFromHistory};
                        })
                    );
                    setSelectedConversation((prev) => {
                        if (!prev) return prev;
                        const selectedId = prev?.conversationId ?? prev?.id;
                        const matchById =
                            targetConversationId != null &&
                            String(targetConversationId).trim() !== '' &&
                            isSameConversationId(selectedId, targetConversationId);
                        const matchDraft =
                            (targetConversationId == null || String(targetConversationId).trim() === '') &&
                            (selectedId == null || String(selectedId).trim() === '') &&
                            isSameConversationSession(prev, conversation);
                        if (!matchById && !matchDraft) return prev;
                        const next = {
                            ...prev,
                            childName: childNameFromHistory,
                            studentName: childNameFromHistory
                        };
                        selectedConversationRef.current = next;
                        return next;
                    });
                }
                setSelectedConversationStudent((prev) =>
                    areStudentProfilesEquivalent(prev, parsed.studentProfile || null) ? prev : (parsed.studentProfile || null)
                );
                const normalized = parsed.items.map(normalizeMessage);
                setMessageItems((prev) => {
                    // Merge với prev (WS / optimistic): history lần đầu hoặc silent sau gửi tin có thể
                    // trả snapshot cũ hơn socket — không replace toàn list để tránh mất tin mới.
                    const merged =
                        normalized.length > 0 ? mergeUniqueMessages([...normalized, ...prev]) : prev;
                    const next = removeOptimisticShadowedByServer(merged, normalized);
                    return areMessageListsEquivalent(prev, next) ? prev : next;
                });
                setMessageNextCursorId(parsed.nextCursorId);
                setMessageHasMore(parsed.hasMore);
                messageNextCursorIdRef.current = parsed.nextCursorId ?? null;
                messageHasMoreRef.current = !!parsed.hasMore;
            } else if (response?.status === 403) {
                if (conversationKey) forbiddenHistoryConversationIdsRef.current.add(conversationKey);
                messageHasMoreRef.current = false;
                messageNextCursorIdRef.current = null;
                if (!silent) setMessageError('Bạn không có quyền xem lịch sử tin nhắn của cuộc trò chuyện này.');
            } else if (!silent) {
                setMessageError('Không thể tải lịch sử tin nhắn.');
            }
        } catch (error) {
            if (error?.response?.status === 403 && conversationKey) {
                forbiddenHistoryConversationIdsRef.current.add(conversationKey);
                messageHasMoreRef.current = false;
                messageNextCursorIdRef.current = null;
            }
            console.error('Error fetching message history:', error);
            if (!silent) setMessageError('Không thể tải lịch sử tin nhắn.');
        } finally {
            if (!silent) setMessageLoading(false);
        }
    };

    /**
     * PUT đánh dấu đã đọc — chỉ gọi khi: (1) chọn một cuộc trong danh sách Tin nhắn, (2) focus/chạm ô nhập.
     * Không gọi khi chỉ mở popup, nhận tin WS, hay gửi tin; hai PUT force chồng nhau thì xếp hàng sau khi xong.
     */
    const markParentConversationRead = React.useCallback(
        async (conv, opts = {}) => {
            const {syncComposerEngaged = false, force = false} = opts;
            if (syncComposerEngaged === true) {
                parentComposerEngagedRef.current = true;
            }

            const target = conv ?? selectedConversation;
            if (!target) return;
            if (!force && hasMarkedReadRef.current) return;
            const conversationId = target?.conversationId ?? target?.id ?? null;
            const u = getUserInfo();
            const username = (u?.email || u?.username || '').trim();
            if (conversationId == null || String(conversationId).trim() === '' || !username) return;
            if (markReadInFlightRef.current) {
                if (force) {
                    pendingParentMarkReadAfterInFlightRef.current = true;
                }
                return;
            }

            markReadInFlightRef.current = true;
            try {
                await markParentMessagesRead({conversationId, username});
                hasMarkedReadRef.current = true;
                setParentWsUnreadBump(0);
                setConversationItems((prev) =>
                    prev.map((item) => {
                        const id = item?.conversationId || item?.id;
                        if (!isSameConversationId(id, conversationId)) return item;
                        return {...item, unreadCount: 0, unreadMessages: 0};
                    })
                );
                setSelectedConversation((prev) => {
                    if (!prev) return prev;
                    const id = prev?.conversationId ?? prev?.id;
                    if (!isSameConversationId(id, conversationId)) return prev;
                    const next = {...prev, unreadCount: 0, unreadMessages: 0};
                    selectedConversationRef.current = next;
                    return next;
                });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            } finally {
                markReadInFlightRef.current = false;
                if (pendingParentMarkReadAfterInFlightRef.current) {
                    pendingParentMarkReadAfterInFlightRef.current = false;
                    const nextConv = selectedConversationRef.current ?? target;
                    queueMicrotask(() => {
                        void markParentConversationReadRef.current?.(nextConv, {force: true});
                    });
                }
            }
        },
        [selectedConversation]
    );

    markParentConversationReadRef.current = markParentConversationRead;

    loadMessageHistoryRef.current = loadMessageHistory;

    useEffect(() => {
        if (!ENABLE_PARENT_CHAT_POLLING) return;
        if (!isSignedIn || !isParent || !chatWindowOpen || !selectedConversation) return;
        const intervalId = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            // Đang đọc tin cũ (không ở gần đáy) thì không poll history để tránh gọi API liên tục.
            if (!parentStickToBottomRef.current) return;
            loadMessageHistoryRef.current?.({
                conversation: selectedConversationRef.current,
                cursorId: null,
                silent: true
            });
        }, PARENT_CHAT_POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isSignedIn, isParent, chatWindowOpen, selectedConversation?.conversationId]);

    const handleSelectConversation = async (conversation) => {
        const conversationKey = String(conversation?.conversationId ?? conversation?.id ?? '');
        if (conversationKey) forbiddenHistoryConversationIdsRef.current.delete(conversationKey);
        parentComposerEngagedRef.current = false;
        setParentWsUnreadBump(0);
        parentStickToBottomRef.current = true;
        setSelectedConversationStudent(null);
        setSelectedConversation(conversation);
        selectedConversationRef.current = conversation;
        setMessageItems([]);
        setMessageNextCursorId(null);
        setMessageHasMore(false);
        messageNextCursorIdRef.current = null;
        messageHasMoreRef.current = false;
        setLoadingOlderMessages(false);
        setMessageError('');
        setMessageAnchorEl(null);
        setChatWindowOpen(true);
        setChatWindowMinimized(false);
        hasMarkedReadRef.current = false;
        await loadMessageHistory({conversation});
        const convAfterHistory = selectedConversationRef.current || conversation;
        await markParentConversationRead(convAfterHistory, {force: true});
    };

    const handleChatScroll = async (event) => {
        const node = event.currentTarget;
        const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
        parentStickToBottomRef.current = distanceFromBottom <= 120;

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
            await loadMessageHistory({conversation: conv, cursorId: nextCursorId, silent: true});
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

    /** Chạm / focus ô nhập: bỏ qua hasMarkedReadRef (sau tin mới vẫn gọi lại API). */
    const handleMarkRead = () => {
        const now = Date.now();
        if (now - lastParentInputMarkReadAtRef.current < 450) return;
        lastParentInputMarkReadAtRef.current = now;
        void markParentConversationRead(selectedConversationRef.current, {
            syncComposerEngaged: true,
            force: true,
        });
    };

    const handleSendMessage = async () => {
        const trimmed = chatInput.trim();
        const convFromRef = selectedConversationRef.current;
        const convEffective = convFromRef || selectedConversation;
        if (!trimmed || !convEffective) return;

        let workingConversation = convEffective;
        const {parentEmail} = resolveConversationEmails(workingConversation);
        const senderName = (parentEmail || userInfo?.email || '').trim();
        const receiverName = resolveWebSocketReceiverName(workingConversation);
        let conversationId = workingConversation?.conversationId ?? workingConversation?.id ?? null;

        if (conversationId == null || String(conversationId).trim() === '') {
            await loadMessageHistory({conversation: workingConversation, cursorId: null, silent: true});
            workingConversation = selectedConversationRef.current || workingConversation;
            conversationId =
                workingConversation?.conversationId ??
                workingConversation?.id ??
                selectedConversationStudent?.conversationId ??
                null;
            if (conversationId == null || String(conversationId).trim() === '') {
                const pe = (parentEmail || userInfo?.email || '').trim();
                const cid = resolveHistoryCampusId(workingConversation);
                const spid =
                    workingConversation?.studentProfileId ??
                    workingConversation?.studentId ??
                    workingConversation?.student?.id ??
                    null;
                const createRes = await createParentConversation({
                    parentEmail: pe,
                    campusId: cid,
                    studentProfileId: spid
                });
                const root = createRes?.data;
                const inner = root?.body;
                const newIdRaw =
                    inner != null && typeof inner === 'object'
                        ? (inner.body ?? inner.conversationId ?? inner.id)
                        : inner;
                const newIdNum = newIdRaw != null ? Number(newIdRaw) : NaN;
                const createOk =
                    createRes?.status != null && createRes.status >= 200 && createRes.status < 300;
                if (createOk && Number.isFinite(newIdNum)) {
                    conversationId = newIdNum;
                    const merged = {...workingConversation, conversationId: newIdNum, id: newIdNum};
                    workingConversation = merged;
                    selectedConversationRef.current = merged;
                    setSelectedConversation(merged);
                    setConversationItems((prev) =>
                        prev.map((item) => {
                            const existingId = item?.conversationId ?? item?.id;
                            if (existingId != null && String(existingId).trim() !== '') return item;
                            const sameSp =
                                String(item?.studentProfileId ?? item?.studentId ?? '') ===
                                String(merged.studentProfileId ?? merged.studentId ?? '');
                            const sameCampus =
                                resolveHistoryCampusId(item) === resolveHistoryCampusId(merged);
                            return sameSp && sameCampus
                                ? {...item, conversationId: newIdNum, id: newIdNum}
                                : item;
                        })
                    );
                } else {
                    enqueueSnackbar('Thiếu conversationId để gửi tin nhắn. Vui lòng mở lại cuộc trò chuyện.', {variant: 'warning'});
                    return;
                }
            }
        }
       
        const payload = buildPrivateChatPayload({
            conversationId,
            message: trimmed,
            senderName,
            receiverName,
            campusId: resolveHistoryCampusId(workingConversation),
            studentProfileId:
                workingConversation?.studentProfileId ??
                workingConversation?.studentId ??
                selectedConversationStudent?.studentProfileId ??
                undefined,
        });
        const sent = sendMessage(payload);
        if (!sent) {
            enqueueSnackbar('WebSocket chưa sẵn sàng, vui lòng thử lại.', {variant: 'warning'});
            return;
        }
        setChatInput('');

        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticRaw = {
            id: optimisticId,
            messageId: optimisticId,
            message: trimmed,
            content: trimmed,
            senderEmail: senderName,
            senderName,
            conversationId,
            timestamp: payload.timestamp,
            sentAt: new Date().toISOString(),
        };
        setMessageItems((prev) => mergeUniqueMessages([...prev, normalizeMessage(optimisticRaw)]));
        setConversationItems((prev) =>
            prev.map((item) => {
                const id = item?.conversationId || item?.id;
                if (!isSameConversationId(id, conversationId)) return item;
                return {
                    ...item,
                    lastMessage: trimmed,
                    time: optimisticRaw.sentAt,
                    updatedAt: optimisticRaw.sentAt,
                };
            })
        );
    };

    useEffect(() => {
        setStudentInfoOpen(false);
    }, [selectedConversation?.conversationId, selectedConversation?.id]);

    useEffect(() => {
        const onScroll = () => {
            setHeaderScrolled(window.scrollY > 32);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => window.removeEventListener('scroll', onScroll);
    }, [location.pathname]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (isSignedIn) {
                setLoadingProfile(true);
                try {
                    const response = await getProfile();
                    if (response && response.status === 200) {
                        setProfileData(response.data);
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                } finally {
                    setLoadingProfile(false);
                }
            }
        };
        fetchProfile();
    }, [isSignedIn]);

    useEffect(() => {
        if (!isSignedIn || !isParent) return;

        const scheduleSilentConversationRefresh = () => {
            if (parentWsPostRefreshTimerRef.current != null) {
                clearTimeout(parentWsPostRefreshTimerRef.current);
            }
            parentWsPostRefreshTimerRef.current = window.setTimeout(() => {
                parentWsPostRefreshTimerRef.current = null;
                loadConversationsRef.current?.(null, {silent: true});
            }, PARENT_WS_CONVERSATION_REFRESH_DEBOUNCE_MS);
        };

        const unwrapWsPayload = (p) => {
            if (!p || typeof p !== 'object') return p;
            if (typeof p.body === 'string') {
                try {
                    return JSON.parse(p.body);
                } catch {
                    return p;
                }
            }
            if (p.body && typeof p.body === 'object') return p.body;
            return p;
        };

        const inferCounsellorEmailFromIncomingWs = (msgRoot, parentEmailLower) => {
            const guess = String(msgRoot?.senderEmail ?? msgRoot?.senderName ?? msgRoot?.from ?? '').trim();
            if (!guess.includes('@')) return '';
            if (!parentEmailLower || guess.toLowerCase() === parentEmailLower) return '';
            return guess;
        };

        /**
         * Sự kiện điều khiển (CONVERSATION_READ, …).
         * Không lấy type từ data/payload khi đã có nội dung tin — BE đôi khi lồng metadata khiến tin TVV bị coi nhầm CONVERSATION_READ
         * → return sớm, không append bubble (lỗi: phụ huynh “không bắt” tin chat).
         */
        const pickWsControlEventType = (obj) => {
            if (!obj || typeof obj !== 'object') return '';
            /** Phải ưu tiên nội dung tin: BE có thể gửi type/status (vd MESSAGE_SENT) cùng message → không được coi là control trước khi thấy body. */
            const hasChatBody =
                (obj.message != null && String(obj.message).trim() !== '') ||
                (obj.content != null && String(obj.content).trim() !== '') ||
                (obj.text != null && String(obj.text).trim() !== '');
            if (hasChatBody) return '';

            const direct = String(obj.type ?? obj.eventType ?? '').trim().toUpperCase();
            if (direct) return direct;

            const nested = String(
                obj?.data?.type ?? obj?.payload?.type ?? obj?.body?.type ?? ''
            )
                .trim()
                .toUpperCase();
            return nested;
        };

        /**
         * CONVERSATION_READ từ BE có thể broadcast khi TVV xác nhậnh cuộc — không được xóa unread inbox phụ huynh.
         * Chỉ đồng bộ unread=0 khi payload nói rõ phụ huynh (chính user) là người đọc (đồng bộ tab/máy khác).
         */
        const conversationReadTargetsParentInbox = (root, rawPayload, parentEmailLower) => {
            const identities = new Set();
            const add = (x) => {
                const s = String(x || '').trim().toLowerCase();
                if (s) identities.add(s);
            };
            add(parentEmailLower);
            try {
                const u = getUserInfo();
                add(u?.email);
                add(u?.username);
                add(u?.userName);
                add(u?.sub);
            } catch {
                /* ignore */
            }
            if (!identities.size) return false;

            const actorFields = (obj) => {
                if (!obj || typeof obj !== 'object') return [];
                return [
                    obj.readBy,
                    obj.readerEmail,
                    obj.readByEmail,
                    obj.readerUsername,
                    obj.username,
                    obj.userEmail,
                    obj.userName,
                    obj.email,
                    obj.actor,
                    obj.markedBy,
                    obj.readByUser,
                    obj.reader,
                    obj.user,
                    obj?.data?.readBy,
                    obj?.payload?.readBy
                ];
            };

            const flattenActor = (v) => {
                if (v == null) return [];
                if (typeof v === 'object' && !Array.isArray(v)) {
                    const parts = [
                        v.email,
                        v.username,
                        v.userName,
                        v.name,
                        v.sub
                    ]
                        .map((x) => String(x || '').trim().toLowerCase())
                        .filter(Boolean);
                    return parts;
                }
                const s = String(v).trim().toLowerCase();
                return s ? [s] : [];
            };

            const actors = new Set();
            for (const v of [...actorFields(root), ...actorFields(rawPayload)]) {
                for (const a of flattenActor(v)) {
                    actors.add(a);
                }
            }
            if (!actors.size) return false;
            for (const a of actors) {
                if (identities.has(a)) return true;
            }
            return false;
        };

        const onPrivateMessage = (payload) => {
                const root = unwrapWsPayload(payload);
                const emailForMatch = getParentUserEmailLower() || String(userInfo?.email || '').trim().toLowerCase();

                /** BE: CONVERSATION_READ — chỉ xóa unread phụ huynh khi sự kiện thuộc hành động đọc của chính phụ huynh. */
                const wsEventType = pickWsControlEventType(root) || pickWsControlEventType(payload);
                if (wsEventType === 'CONVERSATION_READ') {
                    const readConversationId =
                        pickIncomingConversationId(root) ?? pickIncomingConversationId(payload);
                    if (readConversationId == null || String(readConversationId).trim() === '') {
                        scheduleSilentConversationRefresh();
                        return;
                    }
                    if (!conversationReadTargetsParentInbox(root, payload, emailForMatch)) {
                        return;
                    }
                    const readTime = root?.timestamp ?? root?.sentAt ?? root?.time ?? null;
                    setConversationItems((prev) =>
                        prev.map((item) => {
                            const id = item?.conversationId || item?.id;
                            if (!isSameConversationId(id, readConversationId)) return item;
                            return {
                                ...item,
                                unreadCount: 0,
                                unreadMessages: 0,
                                ...(readTime != null ? {time: readTime, updatedAt: readTime} : {}),
                            };
                        })
                    );
                    setSelectedConversation((prev) => {
                        if (!prev) return prev;
                        const sid = prev?.conversationId ?? prev?.id;
                        if (!isSameConversationId(sid, readConversationId)) return prev;
                        const next = {
                            ...prev,
                            unreadCount: 0,
                            unreadMessages: 0,
                            ...(readTime != null ? {time: readTime, updatedAt: readTime} : {}),
                        };
                        selectedConversationRef.current = next;
                        return next;
                    });
                    return;
                }

                if (senderLooksLikeParentSelf(root)) return;

                const conversationId = pickIncomingConversationId(root);
                const inferredCounsellorEmail = inferCounsellorEmailFromIncomingWs(root, emailForMatch);
                if (conversationId == null || String(conversationId).trim() === "") {
                    if (import.meta.env.DEV) {
                        console.warn('[parent chat WS] Thiếu conversationId — refresh danh sách từ API.', root);
                    }
                    scheduleSilentConversationRefresh();
                    return;
                }

                /** Không gọi receiverMatchesParent: tin đã vào queue /user/... của phiên phụ huynh là đủ. */

                const previewText = root?.message ?? root?.content ?? payload?.message ?? payload?.content ?? "";
                const previewTime = root?.timestamp ?? root?.sentAt ?? root?.time ?? payload?.timestamp ?? null;

                const currentSelected = selectedConversationRef.current;
                const chatOpen = chatWindowOpenRef.current;
                const chatMinimized = chatWindowMinimizedRef.current;
                /**
                 * “Đang xem đúng cuộc” = popup chat mở và không thu nhỏ in-app.
                 * Unread cục bộ +1 khi nhận tin TVV nếu chưa chạm ô nhập — GET thường trả unread=0 (BE lệch DB).
                 */
                const wsBelongsToSelection = privateMessageBelongsToParentSelection(
                    currentSelected,
                    conversationId,
                    root,
                    emailForMatch,
                    conversationItemsRef.current
                );
                const selectedIdForThread = currentSelected?.conversationId ?? currentSelected?.id;
                const sameConversationIdAsSelection =
                    currentSelected != null &&
                    selectedIdForThread != null &&
                    String(selectedIdForThread).trim() !== '' &&
                    isSameConversationId(selectedIdForThread, conversationId);
                const liveViewingThread =
                    chatOpen &&
                    !chatMinimized &&
                    currentSelected &&
                    (wsBelongsToSelection || sameConversationIdAsSelection);
                /**
                 * Luôn +1 unread cho tin từ đối phương (đã loại echo phụ huynh ở trên).
                 * Không gắn với liveViewingThread / ô nhập: khi đang mở chat và vừa gửi “Hi”, ref composer = true
                 * mà vẫn cần badge + unread list khi TVV trả lời/intro.
                 * PUT mark read / merge GET sau đọc sẽ về 0.
                 */
                const shouldBumpLocalUnreadFromCounsellorWs = true;
                if (liveViewingThread && currentSelected) {
                    const sid = currentSelected?.conversationId ?? currentSelected?.id;
                    if (
                        sid == null ||
                        String(sid).trim() === '' ||
                        !isSameConversationId(sid, conversationId)
                    ) {
                        const prevCe = String(currentSelected?.counsellorEmail ?? '').trim();
                        const prevPc = String(currentSelected?.participantCounsellorEmail ?? '').trim();
                        const fillIntroCounsellor =
                            inferredCounsellorEmail && !prevCe && !prevPc;
                        const merged = {
                            ...currentSelected,
                            conversationId,
                            id: conversationId,
                            ...(fillIntroCounsellor
                                ? {
                                      counsellorEmail: inferredCounsellorEmail,
                                      participantCounsellorEmail: inferredCounsellorEmail,
                                  }
                                : {}),
                        };
                        selectedConversationRef.current = merged;
                        setSelectedConversation(merged);
                    }
                }

                setConversationItems((prev) => {
                    let matched = false;
                    const mapped = prev.map((item) => {
                        const id = item?.conversationId || item?.id;
                        if (!isSameConversationId(id, conversationId)) return item;
                        matched = true;
                        const currentUnread = Number(item?.unreadCount ?? item?.unreadMessages ?? 0) || 0;
                        const nextUnread = shouldBumpLocalUnreadFromCounsellorWs
                            ? Math.min(99, currentUnread + 1)
                            : currentUnread;
                        const itemCe = String(item?.counsellorEmail ?? '').trim();
                        const itemPc = String(item?.participantCounsellorEmail ?? '').trim();
                        const fillIntroCounsellor =
                            inferredCounsellorEmail && !itemCe && !itemPc;
                        return {
                            ...item,
                            ...(fillIntroCounsellor
                                ? {
                                      counsellorEmail: inferredCounsellorEmail,
                                      participantCounsellorEmail: inferredCounsellorEmail,
                                  }
                                : {}),
                            lastMessage: previewText || item?.lastMessage,
                            ...(previewTime != null ? {time: previewTime, updatedAt: previewTime} : {}),
                            unreadCount: nextUnread,
                            unreadMessages: nextUnread,
                        };
                    });
                    if (matched) return mapped;
                    const peerLabel = String(root?.senderName || '').trim() || 'Tư vấn';
                    const synthetic = normalizeConversation({
                        conversationId,
                        id: conversationId,
                        title: currentSelected?.schoolName || currentSelected?.title || peerLabel,
                        schoolName: currentSelected?.schoolName,
                        counsellorEmail: peerLabel.includes('@') ? peerLabel : currentSelected?.counsellorEmail,
                        participantEmail: currentSelected?.participantEmail || peerLabel,
                        parentEmail: emailForMatch,
                        otherUser: peerLabel,
                        studentProfileId:
                            currentSelected?.studentProfileId ??
                            currentSelected?.studentId ??
                            currentSelected?.student?.id,
                        childName: currentSelected?.childName,
                        studentName: currentSelected?.studentName,
                        campusId: currentSelected?.campusId ?? currentSelected?.campusID ?? null,
                        lastMessage: previewText,
                        time: previewTime,
                        updatedAt: previewTime,
                        unreadCount: shouldBumpLocalUnreadFromCounsellorWs ? 1 : 0,
                        unreadMessages: shouldBumpLocalUnreadFromCounsellorWs ? 1 : 0,
                    });
                    return [synthetic, ...mapped];
                });

                setSelectedConversation((prev) => {
                    if (!prev) return prev;
                    const selectedId = prev?.conversationId ?? prev?.id;
                    if (!isSameConversationId(selectedId, conversationId)) return prev;
                    const currentUnread = Number(prev?.unreadCount ?? prev?.unreadMessages ?? 0) || 0;
                    const nextUnreadSel = shouldBumpLocalUnreadFromCounsellorWs
                        ? Math.min(99, currentUnread + 1)
                        : currentUnread;
                    const prevCe = String(prev?.counsellorEmail ?? '').trim();
                    const prevPc = String(prev?.participantCounsellorEmail ?? '').trim();
                    const fillIntroCounsellor =
                        inferredCounsellorEmail && !prevCe && !prevPc;
                    const next = {
                        ...prev,
                        ...(fillIntroCounsellor
                            ? {
                                  counsellorEmail: inferredCounsellorEmail,
                                  participantCounsellorEmail: inferredCounsellorEmail,
                              }
                            : {}),
                        lastMessage: previewText || prev?.lastMessage,
                        ...(previewTime != null ? {time: previewTime, updatedAt: previewTime} : {}),
                        unreadCount: nextUnreadSel,
                        unreadMessages: nextUnreadSel,
                    };
                    selectedConversationRef.current = next;
                    return next;
                });

                if (liveViewingThread) {
                    setMessageItems((prev) => {
                        const tsFromPayload =
                            root?.timestamp ??
                            root?.sentAt ??
                            root?.time ??
                            root?.createdAt ??
                            payload?.timestamp ??
                            payload?.sentAt ??
                            null;
                        const rootForNormalize =
                            root && typeof root === 'object'
                                ? tsFromPayload != null && String(tsFromPayload).trim() !== ''
                                    ? root
                                    : {...root, sentAt: new Date().toISOString()}
                                : root;
                        const normalizedIncoming = normalizeMessage(rootForNormalize);
                        let replacedOptimistic = false;
                        const withoutMatchingOptimistic = prev.filter((m) => {
                            if (!String(m.id).startsWith('optimistic-')) return true;
                            if (!normalizedIncoming.text || m.text !== normalizedIncoming.text) return true;
                            if (replacedOptimistic) return true;
                            replacedOptimistic = true;
                            return false;
                        });
                        return mergeUniqueMessages([...withoutMatchingOptimistic, normalizedIncoming]);
                    });
                }

                /** Không GET /parent/conversations sau mỗi tin TVV — đã merge preview + unread cục bộ ở trên; GET dễ trùng request và (nếu BE lỗi) tác động read state. */
        }

        connectPrivateMessageSocket({onMessage: onPrivateMessage});

        return () => {
            if (parentWsPostRefreshTimerRef.current != null) {
                clearTimeout(parentWsPostRefreshTimerRef.current);
                parentWsPostRefreshTimerRef.current = null;
            }
            removePrivateMessageListener(onPrivateMessage);
        };
    }, [isSignedIn, isParent]);

    useEffect(() => {
        if (!selectedConversation || messageItems.length === 0) return;
        if (!chatListRef.current) return;
        if (loadingMoreRef.current) return;
        if (!parentStickToBottomRef.current) return;
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }, [selectedConversation, messageItems.length]);

    const handleMobileMenuToggle = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleUserMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    const handleMessageMenuOpen = (event) => {
        setMessageAnchorEl(event.currentTarget);
    };

    const handleMessageMenuClose = () => {
        setMessageAnchorEl(null);
    };

    const handleCloseChatWindow = () => {
        parentComposerEngagedRef.current = false;
        setParentWsUnreadBump(0);
        setChatWindowOpen(false);
        setChatWindowMinimized(false);
        setSelectedConversation(null);
        selectedConversationRef.current = null;
        setMessageItems([]);
        setMessageError('');
        setChatInput('');
        setStudentInfoOpen(false);
    };

    const handleMinimizeChatWindow = () => {
        parentComposerEngagedRef.current = false;
        setChatWindowMinimized(true);
        setStudentInfoOpen(false);
    };

    const handleRestoreChatWindow = () => {
        parentComposerEngagedRef.current = false;
        setChatWindowMinimized(false);
        hasMarkedReadRef.current = false;
    };

    const handleToggleStudentInfo = () => {
        setStudentInfoOpen((open) => !open);
    };

    const handleCloseStudentInfo = () => {
        setStudentInfoOpen(false);
    };

    const handleCloseStudentSelectDialog = () => {
        if (studentSelectLoading) return;
        setStudentSelectDialogOpen(false);
        setStudentSelectOptions([]);
        setPendingChatTarget(null);
    };

    const openParentChatForStudent = React.useCallback(
        async ({target, student}) => {
            const parentEmail = (userInfo?.email || "").trim();
            const counsellorEmail = (target?.counsellorEmail || "").trim();
            const schoolEmail = (target?.schoolEmail || "").trim();
            const campusIdRaw = target?.campusId;
            const campusId = campusIdRaw != null ? Number(campusIdRaw) : NaN;
            const studentProfileId = String(student?.studentProfileId || "").trim();
            const childName = String(student?.childName || "Học sinh").trim() || "Học sinh";
            if (!parentEmail || !Number.isFinite(campusId) || !studentProfileId) {
                enqueueSnackbar("Thiếu thông tin để mở hội thoại tư vấn.", {variant: "warning"});
                return;
            }
            const draftConversation = normalizeConversation({
                title: target?.schoolName || counsellorEmail,
                name: target?.schoolName || counsellorEmail,
                schoolName: target?.schoolName || "",
                schoolLogoUrl: (target?.schoolLogoUrl ?? target?.logoUrl ?? "").toString().trim(),
                schoolEmail,
                participantEmail: counsellorEmail,
                counsellorEmail,
                campusId,
                parentEmail,
                studentProfileId,
                childName
            });
            setSelectedConversationStudent(null);
            setSelectedConversation(draftConversation);
            selectedConversationRef.current = draftConversation;
            setMessageItems([]);
            setMessageNextCursorId(null);
            setMessageHasMore(false);
            setMessageError("");
            setMessageAnchorEl(null);
            setChatWindowOpen(true);
            setChatWindowMinimized(false);
            parentComposerEngagedRef.current = false;
            setParentWsUnreadBump(0);
            hasMarkedReadRef.current = false;
            await loadMessageHistory({conversation: draftConversation});
        },
        [loadMessageHistory, normalizeConversation, userInfo?.email]
    );

    const openParentChatRef = React.useRef(null);
    React.useEffect(() => {
        openParentChatRef.current = async ({
            schoolName: sn,
            schoolEmail: se,
            counsellorEmail: ce,
            campusId: cid,
            schoolLogoUrl: slu
        } = {}) => {
            const schoolName = (sn || "").trim();
            const schoolEmail = (se || "").trim();
            const counsellorEmail = (ce || "").trim();
            const schoolLogoUrl = (slu ?? "").toString().trim();
            const campusIdNum = cid != null ? Number(cid) : NaN;
            if (!isSignedIn) {
                enqueueSnackbar("Vui lòng đăng nhập để nhắn tin với tư vấn viên trường.", {variant: "info"});
                navigate("/login");
                return;
            }
            if (!isParent) {
                enqueueSnackbar("Tính năng chat chỉ dành cho phụ huynh.", {variant: "warning"});
                return;
            }
            if (!Number.isFinite(campusIdNum)) {
                enqueueSnackbar("Thiếu thông tin cơ sở (campus) để mở chat.", {variant: "warning"});
                return;
            }
        
            try {
                setStudentSelectLoading(true);
                const response = await getParentStudent();
                if (response?.status !== 200) {
                    enqueueSnackbar("Không tải được danh sách học sinh.", {variant: "error"});
                    return;
                }
                const normalizedStudents = parseParentStudentsResponse(response)
                    .map(normalizeParentStudent)
                    .filter((s) => s.studentProfileId);
                if (!normalizedStudents.length) {
                    enqueueSnackbar("Bạn chưa có hồ sơ học sinh. Vui lòng thêm thông tin con trước.", {variant: "info"});
                    navigate("/children-info");
                    return;
                }
                const target = {schoolName, schoolEmail, counsellorEmail, campusId: campusIdNum, schoolLogoUrl};
                if (normalizedStudents.length === 1) {
                    await openParentChatForStudent({target, student: normalizedStudents[0]});
                    return;
                }
                setPendingChatTarget(target);
                setStudentSelectOptions(normalizedStudents);
                setStudentSelectDialogOpen(true);
            } catch (err) {
                console.error("openParentChat:", err);
                enqueueSnackbar("Không thể mở chat.", {variant: "error"});
            } finally {
                setStudentSelectLoading(false);
            }
        };
    });

    React.useEffect(() => {
        const onOpenParentChat = (event) => {
            const detail = event?.detail || {};
            openParentChatRef.current?.(detail);
        };
        window.addEventListener(OPEN_PARENT_CHAT_EVENT, onOpenParentChat);
        return () => window.removeEventListener(OPEN_PARENT_CHAT_EVENT, onOpenParentChat);
    }, []);

    React.useEffect(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent(PARENT_CHAT_WINDOW_STATE_EVENT, {
                detail: {open: Boolean(chatWindowOpen)}
            })
        );
    }, [chatWindowOpen]);

    const handleSelectStudentForConsult = async (student) => {
        if (!pendingChatTarget || studentSelectLoading) return;
        setStudentSelectDialogOpen(false);
        try {
            setStudentSelectLoading(true);
            await openParentChatForStudent({target: pendingChatTarget, student});
        } catch (error) {
            console.error("handleSelectStudentForConsult:", error);
            enqueueSnackbar("Không thể mở hội thoại tư vấn.", {variant: "error"});
        } finally {
            setStudentSelectLoading(false);
            setStudentSelectOptions([]);
            setPendingChatTarget(null);
        }
    };

    const handleLogout = async () => {
        try {
            const response = await signout();
            if (response && response.status === 200) {
                if (localStorage.length > 0) {
                    localStorage.clear();
                }
                if (sessionStorage.length > 0) {
                    sessionStorage.clear();
                }
                enqueueSnackbar('Đăng xuất thành công.', {variant: 'success', autoHideDuration: 1000});
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1000);
            } else {
                enqueueSnackbar('Không thể đăng xuất.', {variant: 'error'});
            }
        } catch (error) {
            console.error('Logout error:', error);
            enqueueSnackbar('Không thể đăng xuất.', {variant: 'error'});
        }
    };

    const handleButtonClick = (event) => {
        if (!isSignedIn) {
            navigate('/login');
        } else {
            handleUserMenuClick(event);
        }
    };

    const goTo = (path) => {
        if (location.pathname === '/search-schools') {
            window.location.assign(path);
            return;
        }
        navigate(path);
        setMobileMenuOpen(false);
    };

    const profileBody = React.useMemo(() => {
        if (!profileData?.body) return null;
        if (typeof profileData.body !== 'string') return profileData.body;
        try {
            return JSON.parse(profileData.body);
        } catch (error) {
            console.error('Invalid profile body JSON:', error);
            return null;
        }
    }, [profileData]);
    const displayName =
        profileBody?.name ||
        profileBody?.fullName ||
        profileBody?.parent?.name ||
        userInfo?.name ||
        userInfo?.fullName ||
        'Người dùng';
    const displayEmail = profileBody?.email || userInfo?.email || '';
    const avatarUrl = profileBody?.picture || userInfo?.picture || null;
    const isActivePath = (path) => location.pathname === path;
    const brandIndigo = BRAND_NAVY;

    const navButtonSx = (path) => {
        const active = isActivePath(path);
        const inactiveColor = '#475569';
        const activeColor = brandIndigo;
        const underlineBg = BRAND_SKY;
        return {
            fontWeight: 700,
            color: active ? activeColor : inactiveColor,
            fontSize: 15,
            textTransform: 'none',
            px: 1.4,
            py: 1,
            borderRadius: 0,
            minWidth: 'auto',
            bgcolor: 'transparent',
            position: 'relative',
            transition: 'color 0.25s ease, opacity 0.25s ease, transform 0.25s ease',
            '&::after': {
                content: '""',
                position: 'absolute',
                left: 10,
                right: 10,
                bottom: 6,
                height: 3,
                borderRadius: 2,
                bgcolor: underlineBg,
                opacity: active ? 1 : 0,
                transform: active ? 'scaleX(1)' : 'scaleX(0.3)',
                transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)'
            },
            '&:hover': {
                color: brandIndigo,
                bgcolor: 'transparent',
                backgroundColor: 'transparent',
                '&::after': {
                    opacity: 1,
                    transform: 'scaleX(1)'
                }
            }
        };
    };

    const navMobileItemSx = (path) => ({
        cursor: 'pointer',
        bgcolor: isActivePath(path) ? 'rgba(37,99,235,0.08)' : 'transparent',
        border: isActivePath(path) ? '1px solid rgba(59,130,246,0.32)' : '1px solid transparent',
        borderRadius: 2,
        borderLeft: isActivePath(path) ? `3px solid ${BRAND_SKY}` : '3px solid transparent'
    });
    const navMobileTextSx = (path) => ({
        color: isActivePath(path) ? brandIndigo : '#334155',
        fontWeight: isActivePath(path) ? 700 : 600
    });

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                zIndex: chatWindowOpen ? 1700 : 1000,
                top: 0,
                left: 0,
                right: 0,
                bgcolor: isHomeHeroTransparent ? HEADER_HOME_BAR_BG : headerElevated
                    ? 'rgba(255,255,255,0.97)'
                    : 'rgba(255,255,255,0.22)',
                backgroundImage: 'none',
                backdropFilter: isHomeHeroTransparent ? 'none' : headerElevated ? 'none' : 'blur(16px)',
                WebkitBackdropFilter: isHomeHeroTransparent ? 'none' : headerElevated ? 'none' : 'blur(16px)',
                boxShadow: isHomeHeroTransparent
                    ? 'none'
                    : headerElevated
                        ? '0 1px 0 rgba(51,65,85,0.06), 0 12px 40px rgba(51,65,85,0.07)'
                        : '0 1px 0 rgba(255,255,255,0.55)',
                borderBottom: isHomeHeroTransparent
                    ? 'none'
                    : headerElevated
                        ? '1px solid rgba(226,232,240,0.95)'
                        : '1px solid rgba(255,255,255,0.45)',
                transition: 'background 0.35s ease, background-color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease'
            }}
        >
            <Container maxWidth="lg" sx={{px: {xs: 2, md: 4}}}>
                <Box sx={{
                    py: {xs: 1.5, md: 1.75},
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                        <Box
                            component="img"
                            src={logo}
                            alt="EduBridgeHCM"
                            onClick={() => goTo('/home')}
                            sx={{
                                cursor: 'pointer',
                                height: 48,
                                width: 48,
                                borderRadius: '50%',
                                p: 0.75,
                                boxShadow: isHomeHeroTransparent
                                    ? '0 4px 18px rgba(37,99,235,0.14)'
                                    : headerElevated
                                        ? '0 4px 18px rgba(37,99,235,0.14)'
                                        : '0 6px 22px rgba(37,99,235,0.16)',
                                border: '2px solid rgba(255,255,255,0.95)',
                                transition: 'box-shadow 0.35s ease'
                            }}
                        />
                        <Typography
                            onClick={() => goTo('/home')}
                            variant="h5"
                            sx={{
                                cursor: 'pointer',
                                fontWeight: 800,
                                letterSpacing: 0.4,
                                fontSize: {xs: '1.15rem', sm: '1.35rem'},
                                background: `linear-gradient(120deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 50%, ${BRAND_SKY_LIGHT} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            EduBridgeHCM
                        </Typography>
                    </Box>
                    {isSignedIn && isParent ? (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/home')}
                                onClick={() => goTo('/home')}
                            >
                                Trang chủ
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/search-schools')}
                                onClick={() => goTo('/search-schools')}
                            >
                                Tìm trường
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/posts')} onClick={() => goTo('/posts')}>
                                Bảng tin
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/saved-schools')} onClick={() => goTo('/saved-schools')}>
                                Trường yêu thích
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/compare-schools')} onClick={() => goTo('/compare-schools')}>
                                So sánh trường
                            </Button>
                        </Box>
                    ) : isSignedIn && isSchool ? (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button color="inherit" sx={navButtonSx('/home')} onClick={() => goTo('/home')}>
                                Trang chủ
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/search-schools')} onClick={() => goTo('/search-schools')}>
                                Tìm trường
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/posts')} onClick={() => goTo('/posts')}>
                                Bảng tin
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/compare-schools')} onClick={() => goTo('/compare-schools')}>
                                So sánh trường
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/package-fees')} onClick={() => goTo('/package-fees')}>
                                Gói dịch vụ
                            </Button>
                        </Box>
                    ) : isSignedIn && isAdmin ? (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button color="inherit" sx={navButtonSx('/home')} onClick={() => goTo('/home')}>
                                Trang chủ
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/search-schools')} onClick={() => goTo('/search-schools')}>
                                Tìm trường
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/posts')} onClick={() => goTo('/posts')}>
                                Bảng tin
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/compare-schools')} onClick={() => goTo('/compare-schools')}>
                                So sánh trường
                            </Button>
                        </Box>
                    ) : !isSignedIn ? (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/home')}
                                onClick={() => goTo('/home')}
                            >
                                Trang chủ
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/search-schools')}
                                onClick={() => goTo('/search-schools')}
                            >
                                Tìm trường
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/posts')} onClick={() => goTo('/posts')}>
                                Bảng tin
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/saved-schools')} onClick={() => goTo('/saved-schools')}>
                                Trường yêu thích
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/compare-schools')} onClick={() => goTo('/compare-schools')}>
                                So sánh trường
                            </Button>
                        </Box>
                    ) : !isHomePage && (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/home')}
                                onClick={() => goTo('/home')}
                            >
                                Trang Chủ
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/search-schools')}
                                onClick={() => goTo('/search-schools')}
                            >
                                Danh Sách Trường
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/posts')}
                                onClick={() => goTo('/posts')}
                            >
                                Bảng tin
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/compare-schools')}
                                onClick={() => goTo('/compare-schools')}
                            >
                                So sánh trường
                            </Button>
                        </Box>
                    )}
                    <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', gap: 1}}>
                        {isSignedIn ? (
                            <>
                                {isParent && (
                                    <Badge
                                        badgeContent={parentHeaderUnreadDisplay}
                                        color="error"
                                        overlap="circular"
                                        invisible={parentHeaderUnreadDisplay === 0}
                                        sx={{
                                            mr: 0.5,
                                            '& .MuiBadge-badge': {
                                                fontSize: 11,
                                                fontWeight: 700,
                                                minWidth: 18,
                                                height: 18,
                                                borderRadius: 9,
                                                boxShadow: '0 2px 8px rgba(220,53,69,0.4)'
                                            }
                                        }}
                                    >
                                        <IconButton
                                            onClick={handleMessageMenuOpen}
                                            aria-label="Tin nhắn"
                                            sx={{
                                                width: 42,
                                                height: 42,
                                                bgcolor: 'rgba(37,99,235,0.08)',
                                                color: BRAND_NAVY,
                                                border: '1px solid rgba(59,130,246,0.35)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(37,99,235,0.12)',
                                                    color: APP_PRIMARY_DARK,
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: '0 4px 14px rgba(37,99,235,0.18)'
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <ChatBubbleRoundedIcon sx={{fontSize: 22}}/>
                                        </IconButton>
                                    </Badge>
                                )}
                                <Menu
                                    anchorEl={messageAnchorEl}
                                    open={Boolean(messageAnchorEl)}
                                    onClose={handleMessageMenuClose}
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                                    transformOrigin={{vertical: 'top', horizontal: 'right'}}
                                    disableScrollLock={true}
                                    slotProps={{
                                        paper: {
                                            sx: {
                                                borderRadius: 3,
                                                border: '1px solid rgba(59,130,246,0.18)',
                                                boxShadow: '0 22px 48px rgba(51,65,85,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset',
                                                minWidth: 360,
                                                maxWidth: 380,
                                                mt: 1.2,
                                                p: 0,
                                                overflow: 'hidden',
                                                backdropFilter: 'blur(10px)',
                                                bgcolor: 'rgba(255,255,255,0.97)'
                                            }
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.75,
                                            borderBottom: '1px solid rgba(59,130,246,0.1)',
                                            background: 'linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(255,255,255,0.98) 100%)'
                                        }}
                                    >
                                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Typography sx={{fontSize: 17, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em'}}>
                                                Tin nhắn
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                mt: 1.5,
                                                px: 1.25,
                                                py: 0.85,
                                                borderRadius: 999,
                                                bgcolor: 'rgba(59,130,246,0.06)',
                                                border: '1px solid rgba(59,130,246,0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}
                                        >
                                            <SearchIcon sx={{fontSize: 19, color: '#818cf8'}}/>
                                            <Typography sx={{fontSize: 13, color: '#64748b'}}>
                                                Tìm cuộc trò chuyện
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <>
                                        {conversationLoading && conversationItems.length === 0 ? (
                                            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4}}>
                                                <CircularProgress size={24}/>
                                            </Box>
                                        ) : conversationError ? (
                                            <Box sx={{px: 2, py: 3}}>
                                                <Typography sx={{fontSize: 14, color: '#dc2626'}}>
                                                    {conversationError}
                                                </Typography>
                                            </Box>
                                        ) : filteredConversationItems.length === 0 ? (
                                            <Box sx={{px: 2, py: 4, textAlign: 'center'}}>
                                                <ChatBubbleRoundedIcon sx={{fontSize: 30, color: '#94a3b8'}}/>
                                                <Typography sx={{fontSize: 14, color: '#475569', mt: 1}}>
                                                    Chưa có tin nhắn
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{maxHeight: 420, overflowY: 'auto'}}>
                                                {filteredConversationItems.map((conversation, index) => {
                                                    const conversationId = conversation?.id || conversation?.conversationId;
                                                    const conversationName = conversation?.title || conversation?.name || conversation?.schoolName || conversation?.participantName || 'Cuộc trò chuyện';
                                                    const studentDisplayName = String(
                                                        conversation?.studentName || conversation?.childName || ''
                                                    ).trim();
                                                    const latestMessage = conversation?.lastMessage?.content || conversation?.lastMessage || conversation?.latestMessage || 'Chưa có nội dung';
                                                    const unreadCount = Number(conversation?.unreadCount ?? conversation?.unreadMessages ?? 0) || 0;
                                                    const hasUnread = unreadCount > 0;
                                                    const listLogoUrl = pickConversationSchoolLogoUrl(conversation) || null;

                                                    return (
                                                        <Box
                                                            key={conversationId || `${conversationName}-${index}`}
                                                            onClick={() => handleSelectConversation(conversation)}
                                                            sx={{
                                                                px: 2,
                                                                py: 1.25,
                                                                borderBottom: '1px solid rgba(51,65,85,0.06)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1.5,
                                                                cursor: 'pointer',
                                                                bgcolor: hasUnread ? 'rgba(37,99,235,0.12)' : 'transparent',
                                                                borderLeft: hasUnread ? '3px solid #2563eb' : '3px solid transparent',
                                                                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                                                                '&:hover': {
                                                                    bgcolor: hasUnread ? 'rgba(37,99,235,0.16)' : 'rgba(59,130,246,0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <Avatar
                                                                src={listLogoUrl || undefined}
                                                                sx={{width: 40, height: 40, bgcolor: BRAND_NAVY, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 12px rgba(59,130,246,0.35)'}}
                                                            >
                                                                {conversationName.charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <Box sx={{minWidth: 0, flex: 1}}>
                                                                <Typography noWrap sx={{fontSize: 14, fontWeight: hasUnread ? 800 : 700, color: '#1e293b'}}>
                                                                    {conversationName}
                                                                </Typography>
                                                                {studentDisplayName ? (
                                                                    <Typography
                                                                        noWrap
                                                                        sx={{
                                                                            fontSize: 12,
                                                                            fontWeight: 600,
                                                                            color: '#2563eb',
                                                                            lineHeight: 1.35,
                                                                            mt: 0.1
                                                                        }}
                                                                    >
                                                                        Học sinh: {studentDisplayName}
                                                                    </Typography>
                                                                ) : null}
                                                                <Typography noWrap sx={{fontSize: 13, color: hasUnread ? '#1e3a8a' : '#475569', fontWeight: hasUnread ? 600 : 500}}>
                                                                    {latestMessage}
                                                                </Typography>
                                                            </Box>
                                                            {unreadCount > 0 && (
                                                                <Badge
                                                                    badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                                                                    color="error"
                                                                    sx={{
                                                                        '& .MuiBadge-badge': {
                                                                            right: 0,
                                                                            top: 0
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        )}

                                        {hasMoreConversations && (
                                            <Box sx={{px: 2, py: 1.25, borderTop: '1px solid rgba(51,65,85,0.08)'}}>
                                                <Button
                                                    fullWidth
                                                    size="small"
                                                    variant="text"
                                                    disabled={conversationLoading}
                                                    onClick={() => loadConversations(nextCursorId)}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        color: BRAND_NAVY,
                                                        '&:hover': {
                                                            bgcolor: 'rgba(59,130,246,0.08)'
                                                        }
                                                    }}
                                                >
                                                    {conversationLoading ? 'Đang tải...' : 'Xem thêm'}
                                                </Button>
                                            </Box>
                                        )}
                                    </>
                                </Menu>
                                {chatWindowOpen && selectedConversation && !chatWindowMinimized && (
                                    <Box
                                        sx={{
                                            position: 'fixed',
                                            right: {xs: 74, sm: 100},
                                            bottom: 16,
                                            width: {xs: 'calc(100vw - 16px)', sm: 380},
                                            height: 540,
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            zIndex: isStudentInfoOpen ? 1550 : 1500,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            bgcolor: parentChatHasUnread ? '#fff7ed' : '#f8fafc',
                                            border: parentChatHasUnread
                                                ? '1px solid rgba(249,115,22,0.45)'
                                                : `1px solid ${selectedStudentTheme.border}`,
                                            boxShadow: parentChatHasUnread
                                                ? '0 26px 60px rgba(249,115,22,0.22), 0 0 0 1px rgba(255,255,255,0.55) inset'
                                                : '0 24px 56px rgba(51,65,85,0.18), 0 0 0 1px rgba(255,255,255,0.5) inset'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.85,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: parentChatHasUnread
                                                    ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                                                    : selectedStudentTheme.headerGradient,
                                                borderBottom: '1px solid rgba(255,255,255,0.12)',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0}}>
                                                <Avatar
                                                    src={peerSchoolLogoUrl || undefined}
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        bgcolor: 'rgba(255,255,255,0.22)',
                                                        fontSize: 15,
                                                        fontWeight: 800,
                                                        border: '2px solid rgba(255,255,255,0.35)'
                                                    }}
                                                >
                                                    {peerChatInitial}
                                                </Avatar>
                                                <Box
                                                    sx={{
                                                        minWidth: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-start',
                                                        justifyContent: 'center',
                                                        gap: 0.4
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2, m: 0, display: 'block'}}
                                                        noWrap
                                                    >
                                                        {selectedConversationTitle}
                                                    </Typography>
                                                    {!!selectedCounsellorEmail && (
                                                        <Typography
                                                            sx={{
                                                                fontSize: 10.5,
                                                                color: 'rgba(255,255,255,0.85)',
                                                                maxWidth: 220,
                                                                lineHeight: 1.2,
                                                                m: 0,
                                                                display: 'block'
                                                            }}
                                                            noWrap
                                                        >
                                                            Tư vấn viên: {selectedCounsellorEmail}
                                                        </Typography>
                                                    )}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            maxWidth: '100%',
                                                            minHeight: 20
                                                        }}
                                                    >
                                                        <Typography
                                                            component="span"
                                                            sx={{
                                                                fontSize: 10.5,
                                                                fontWeight: 600,
                                                                color: 'rgba(255,255,255,0.9)',
                                                                lineHeight: 1.2,
                                                                display: 'inline-block',
                                                                m: 0
                                                            }}
                                                            noWrap
                                                        >
                                                            Học sinh: {selectedStudentName}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleStudentInfo();
                                                            }}
                                                            aria-label="Thông tin học sinh"
                                                            aria-expanded={studentInfoOpen}
                                                            aria-pressed={studentInfoOpen}
                                                            sx={{
                                                                flexShrink: 0,
                                                                p: 0,
                                                                width: 24,
                                                                height: 24,
                                                                minWidth: 24,
                                                                minHeight: 24,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'rgba(255,255,255,0.95)',
                                                                bgcolor: 'transparent',
                                                                border: 'none',
                                                                borderRadius: 0,
                                                                transition: 'transform 0.22s ease, opacity 0.22s ease',
                                                                opacity: studentInfoOpen ? 1 : 0.92,
                                                                transform: studentInfoOpen ? 'scale(1.08)' : 'scale(1)',
                                                                '&:hover': {bgcolor: 'rgba(255,255,255,0.12)'}
                                                            }}
                                                        >
                                                            <InfoOutlinedIcon
                                                                sx={{
                                                                    fontSize: 14,
                                                                    transition: 'transform 0.22s ease',
                                                                    transform: studentInfoOpen ? 'rotate(12deg)' : 'none'
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
                                                <IconButton size="small" onClick={handleMinimizeChatWindow} sx={{color: 'rgba(255,255,255,0.92)'}}>
                                                    <RemoveIcon sx={{fontSize: 18}}/>
                                                </IconButton>
                                                <IconButton size="small" onClick={handleCloseChatWindow} sx={{color: 'rgba(255,255,255,0.92)'}}>
                                                    <CloseIcon sx={{fontSize: 18}}/>
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        <Box
                                            ref={chatListRef}
                                            onScroll={handleChatScroll}
                                            sx={{
                                                flex: 1,
                                                minHeight: 0,
                                                px: 1.5,
                                                pt: 1.5,
                                                pb: 2,
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                background: parentChatHasUnread ? `
                                                    linear-gradient(180deg, rgba(255,237,213,0.92) 0%, rgba(255,247,237,0.98) 35%, #fff7ed 100%),
                                                    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.14), transparent 55%)
                                                ` : `
                                                    linear-gradient(180deg, rgba(238,242,255,0.65) 0%, rgba(248,250,252,0.98) 28%, #f1f5f9 100%),
                                                    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12), transparent 55%)
                                                `,
                                                WebkitOverflowScrolling: 'touch'
                                            }}
                                        >
                                            {messageLoading && messageItems.length === 0 ? (
                                                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5}}>
                                                    <CircularProgress size={24} sx={{color: selectedStudentTheme.accent}}/>
                                                </Box>
                                            ) : messageError ? (
                                                <Typography sx={{fontSize: 13, color: '#dc2626'}}>{messageError}</Typography>
                                            ) : messageItems.length === 0 ? (
                                                <Box sx={{textAlign: 'center', py: 4, px: 2}}>
                                                    <ChatBubbleRoundedIcon sx={{fontSize: 40, color: 'rgba(59,130,246,0.35)', mb: 1}}/>
                                                    <Typography sx={{fontSize: 13, color: '#64748b', lineHeight: 1.55}}>
                                                        Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện cho {selectedStudentName}.
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <>
                                                    {loadingOlderMessages && (
                                                        <Box
                                                            sx={{
                                                                position: 'sticky',
                                                                top: 0,
                                                                zIndex: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 1,
                                                                py: 0.6,
                                                                mb: 0.6,
                                                                bgcolor: 'rgba(241,245,249,0.9)',
                                                                backdropFilter: 'blur(4px)',
                                                                borderRadius: 999,
                                                                border: '1px solid rgba(148,163,184,0.25)'
                                                            }}
                                                        >
                                                            <CircularProgress size={13} sx={{color: selectedStudentTheme.accent}}/>
                                                            <Typography sx={{fontSize: 10.5, color: '#64748b', fontWeight: 600}}>
                                                                Đang tải tin nhắn
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {groupedParentMessages.map((group) => (
                                                        <Box key={group.key} sx={{mb: 0.5}}>
                                                            <Box sx={{display: 'flex', justifyContent: 'center', mb: 1.25, mt: 0.5}}>
                                                                <Typography
                                                                    component="span"
                                                                    sx={{
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        color: '#64748b',
                                                                        px: 1.5,
                                                                        py: 0.45,
                                                                        borderRadius: 999,
                                                                        bgcolor: 'rgba(255,255,255,0.85)',
                                                                        border: '1px solid rgba(148,163,184,0.35)',
                                                                        boxShadow: '0 1px 2px rgba(51,65,85,0.06)'
                                                                    }}
                                                                >
                                                                    {group.label}
                                                                </Typography>
                                                            </Box>
                                                            {group.items.map((msg, idx) => {
                                                                const isMine = isParentMessageMine(msg);
                                                                const peerUnreadHighlight =
                                                                    !isMine &&
                                                                    peerUnreadBubbleIdSet.has(String(msg.id ?? ''));
                                                                const prev = idx > 0 ? group.items[idx - 1] : null;
                                                                const prevIsMine = prev ? isParentMessageMine(prev) : null;
                                                                const showPeerAvatar = !isMine && (idx === 0 || prevIsMine === true);
                                                                const stackTight = idx > 0 && prevIsMine === isMine;
                                                                return (
                                                                    <Box
                                                                        key={`${group.key}-${idx}-${msg.id}-${msg.sentAt ?? ''}`}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                                            alignItems: 'flex-end',
                                                                            gap: 0.75,
                                                                            mb: stackTight ? 0.35 : 1.1,
                                                                            pl: isMine ? 3 : 0,
                                                                            pr: isMine ? 0 : 0
                                                                        }}
                                                                    >
                                                                        {!isMine && (
                                                                            <Box sx={{width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center', pb: 0.25}}>
                                                                                {showPeerAvatar ? (
                                                                                    <Avatar
                                                                                        src={peerSchoolLogoUrl || undefined}
                                                                                        sx={{
                                                                                            width: 32,
                                                                                            height: 32,
                                                                                            fontSize: 13,
                                                                                            fontWeight: 700,
                                                                                            bgcolor: selectedStudentTheme.peerAvatar,
                                                                                            boxShadow: '0 2px 8px rgba(59,130,246,0.35)'
                                                                                        }}
                                                                                    >
                                                                                        {peerChatInitial}
                                                                                    </Avatar>
                                                                                ) : (
                                                                                    <Box sx={{width: 32}}/>
                                                                                )}
                                                                            </Box>
                                                                        )}
                                                                        <Box sx={{maxWidth: isMine ? '82%' : 'calc(100% - 40px)', minWidth: 0}}>
                                                                            <Box
                                                                                sx={{
                                                                                    px: 1.6,
                                                                                    py: 1,
                                                                                    borderRadius: 2.25,
                                                                                    borderTopLeftRadius: !isMine ? (stackTight ? 2.25 : 0.5) : 2.25,
                                                                                    borderTopRightRadius: isMine ? (stackTight ? 2.25 : 0.5) : 2.25,
                                                                                    background: isMine
                                                                                        ? selectedStudentTheme.bubbleGradient
                                                                                        : peerUnreadHighlight
                                                                                          ? 'linear-gradient(135deg, rgba(219,234,254,0.98) 0%, rgba(191,219,254,0.92) 100%)'
                                                                                          : '#ffffff',
                                                                                    color: isMine ? '#ffffff' : '#1e293b',
                                                                                    border: isMine
                                                                                        ? 'none'
                                                                                        : peerUnreadHighlight
                                                                                          ? '1px solid rgba(37,99,235,0.42)'
                                                                                          : '1px solid rgba(148,163,184,0.4)',
                                                                                    boxShadow: isMine
                                                                                        ? '0 2px 8px rgba(59,130,246,0.3), 0 1px 0 rgba(255,255,255,0.12) inset'
                                                                                        : peerUnreadHighlight
                                                                                          ? '0 2px 8px rgba(37,99,235,0.12)'
                                                                                          : '0 1px 3px rgba(51,65,85,0.06)'
                                                                                }}
                                                                            >
                                                                                <Typography sx={{fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word'}}>
                                                                                    {msg.text}
                                                                                </Typography>
                                                                            </Box>
                                                                            {msg.sentAt && (
                                                                            <Typography
                                                                                sx={{
                                                                                    mt: 0.35,
                                                                                    fontSize: 10.5,
                                                                                    fontWeight: 500,
                                                                                    textAlign: isMine ? 'right' : 'left',
                                                                                    color: '#94a3b8',
                                                                                    lineHeight: 1.2,
                                                                                    px: 0.35
                                                                                }}
                                                                            >
                                                                                {formatMessageTime(msg.sentAt)}
                                                                            </Typography>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    ))}
                                                </>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                px: 1.25,
                                                py: 1,
                                                borderTop: `1px solid ${selectedStudentTheme.border}`,
                                                bgcolor: 'rgba(255,255,255,0.96)',
                                                backdropFilter: 'blur(8px)',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        borderRadius: 2.5,
                                                        px: 1.35,
                                                        py: 0.55,
                                                        bgcolor: selectedStudentTheme.accentSoft,
                                                        border: `1px solid ${selectedStudentTheme.border}`,
                                                        boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset',
                                                        flex: 1
                                                    }}
                                                >
                                                    <InputBase
                                                        value={chatInput}
                                                        onPointerDown={handleMarkRead}
                                                        onChange={(e) => {
                                                            parentComposerEngagedRef.current = true;
                                                            setChatInput(e.target.value);
                                                        }}
                                                        onClick={handleMarkRead}
                                                        onFocus={handleMarkRead}
                                                        onKeyDown={(e) => {
                                                            parentComposerEngagedRef.current = true;
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleSendMessage();
                                                            }
                                                        }}
                                                        placeholder="Nhập tin nhắn…"
                                                        sx={{flex: 1, fontSize: 14, color: '#1e293b', '& ::placeholder': {color: '#94a3b8', opacity: 1}}}
                                                    />
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleSendMessage}
                                                        disabled={!chatInput.trim()}
                                                        sx={{
                                                            color: chatInput.trim() ? selectedStudentTheme.accent : 'rgba(59,130,246,0.35)',
                                                            bgcolor: chatInput.trim() ? selectedStudentTheme.accentSoft : 'transparent',
                                                            '&:hover': {bgcolor: chatInput.trim() ? selectedStudentTheme.accentSoft : 'transparent'}
                                                        }}
                                                    >
                                                        <SendRoundedIcon fontSize="small"/>
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                {chatWindowOpen && selectedConversation && chatWindowMinimized && (
                                    <Box
                                        sx={{
                                            position: 'fixed',
                                            right: {xs: 24, sm: 24},
                                            bottom: 98,
                                            zIndex: isStudentInfoOpen ? 1550 : 1500
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                width: 56,
                                                height: 56,
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s ease',
                                                '&:hover': {
                                                    transform: 'none'
                                                },
                                                '&:hover .min-chat-close': {
                                                    opacity: 1,
                                                    transform: 'translateY(0)'
                                                }
                                            }}
                                            onClick={handleRestoreChatWindow}
                                        >
                                            <Avatar
                                                src={peerSchoolLogoUrl || undefined}
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: selectedStudentTheme.peerAvatar,
                                                    boxShadow: '0 10px 28px rgba(59,130,246,0.45)',
                                                    border: '2px solid rgba(255,255,255,0.35)'
                                                }}
                                            >
                                                {peerChatInitial}
                                            </Avatar>

                                            <IconButton
                                                className="min-chat-close"
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloseChatWindow();
                                                }}
                                                sx={{
                                                    position: 'absolute',
                                                    top: -6,
                                                    right: -6,
                                                    opacity: 0,
                                                    transform: 'translateY(2px) scale(0.92)',
                                                    transition: 'opacity 0.15s ease, transform 0.15s ease',
                                                    color: '#ffffff',
                                                    bgcolor: 'rgba(51,65,85,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.14)',
                                                    borderRadius: '50%',
                                                    padding: 0.25,
                                                    width: 18,
                                                    height: 18,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(51,65,85,1)'
                                                    }
                                                }}
                                            >
                                                <CloseIcon sx={{fontSize: 14}} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
                                <Fade in={studentInfoOpen} timeout={220} unmountOnExit>
                                    <Box
                                        role="presentation"
                                        aria-hidden
                                        sx={{
                                            position: 'fixed',
                                            inset: 0,
                                            zIndex: 1490,
                                            backgroundColor: 'rgba(15, 23, 42, 0.52)',
                                            pointerEvents: 'auto'
                                        }}
                                    />
                                </Fade>
                                <Zoom
                                    in={studentInfoOpen}
                                    timeout={260}
                                    unmountOnExit
                                    style={{transformOrigin: 'bottom right'}}
                                >
                                    <Box
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="student-info-dialog-title"
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{
                                            pointerEvents: 'auto',
                                            position: 'fixed',
                                            right: {xs: 16, sm: 'calc(100px + 380px + 12px)'},
                                            bottom: 16,
                                            left: {xs: 16, sm: 'auto'},
                                            width: {xs: 'min(92vw, 520px)', sm: 520},
                                            maxWidth: '100%',
                                            height: {xs: 'min(85vh, 540px)', sm: 540},
                                            maxHeight: '85vh',
                                            zIndex: 1600,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            outline: 'none',
                                            borderRadius: 2,
                                            border: `1px solid ${selectedStudentTheme.border}`,
                                            boxShadow: '0 22px 48px rgba(30,41,59,0.28)',
                                            background: 'linear-gradient(180deg, #f8fbff 0%, #f8fafc 38%, #ffffff 100%)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                px: 1.5,
                                                py: 1,
                                                borderBottom: '1px solid rgba(148,163,184,0.35)',
                                                bgcolor: 'rgba(255,255,255,0.92)',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Typography id="student-info-dialog-title" sx={{fontWeight: 800, fontSize: 16, color: '#0f172a'}}>
                                                Thông tin học sinh
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={handleCloseStudentInfo}
                                                aria-label="Đóng thông tin học sinh"
                                                sx={{color: '#64748b'}}
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </Box>
                                        <Box
                                            onWheel={(event) => {
                                                event.stopPropagation();
                                            }}
                                            sx={{
                                                flex: 1,
                                                minHeight: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                overscrollBehavior: 'contain',
                                                WebkitOverflowScrolling: 'touch',
                                                scrollbarGutter: 'stable',
                                                p: 1.2
                                            }}
                                        >
                                            <ParentStudentInfoPanel
                                                studentName={selectedStudentName}
                                                compactInfo={selectedStudentCompactInfo}
                                                gradeTable={selectedStudentGradeTable}
                                                personalityInsights={selectedStudentPersonalityInsights}
                                                subjectsInSystem={selectedParentStudent?.raw?.subjectsInSystem}
                                            />
                                        </Box>
                                    </Box>
                                </Zoom>
                                <Box
                                    onClick={handleUserMenuClick}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '50%',
                                        transition: 'background 0.2s',
                                        '&:hover': {
                                            bgcolor: 'rgba(37,99,235,0.08)'
                                        }
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl}
                                        imgProps={{referrerPolicy: 'no-referrer'}}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            bgcolor: BRAND_NAVY,
                                            boxShadow: '0 4px 14px rgba(59,130,246,0.35)'
                                        }}
                                    >
                                        {!avatarUrl && (displayName.charAt(0).toUpperCase())}
                                    </Avatar>
                                </Box>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleUserMenuClose}
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                                    transformOrigin={{vertical: 'top', horizontal: 'right'}}
                                    disableScrollLock={true}
                                    slotProps={{
                                        paper: {
                                            style: {
                                                maxHeight: '80vh',
                                                overflow: 'visible'
                                            },
                                            sx: {
                                                borderRadius: 2,
                                                boxShadow: '0 6px 24px rgba(25, 118, 210, 0.15)',
                                                minWidth: 250,
                                                mt: 1,
                                                p: 1,
                                                bgcolor: 'white'
                                            }
                                        }
                                    }}
                                    sx={{
                                        '& .MuiPopover-paper': {
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                            border: '1px solid rgba(0,0,0,0.12)'
                                        }
                                    }}
                                >
                                    <Box sx={{px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.08)'}}>
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                            <Avatar
                                                src={avatarUrl}
                                                imgProps={{referrerPolicy: 'no-referrer'}}
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    bgcolor: BRAND_NAVY
                                                }}
                                            >
                                                {!avatarUrl && (displayName.charAt(0).toUpperCase())}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{fontSize: 14, fontWeight: 600, color: '#333'}}>
                                                    {displayName}
                                                </Typography>
                                                {displayEmail && (
                                                    <Typography sx={{fontSize: 12, color: '#666'}}>
                                                        {displayEmail}
                                                    </Typography>
                                                )}
                                                {userInfo?.role && (
                                                    <Typography sx={{fontSize: 11, color: BRAND_NAVY, mt: 0.5}}>
                                                        {userInfo.role === 'STUDENT' ? 'Học sinh' :
                                                         userInfo.role === 'SCHOOL' ? 'Trường học' :
                                                         userInfo.role === 'ADMIN' ? 'Quản trị viên' :
                                                         userInfo.role === 'COUNSELLOR' ? 'Tư vấn viên' :
                                                         userInfo.role === 'PARENT' ? 'Phụ huynh' : userInfo.role}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                    {isParent ? (
                                        <>
                                            <MenuItem
                                                onClick={() => {
                                                    handleUserMenuClose();
                                                    goTo('/parent/profile');
                                                }}
                                                sx={{
                                                    fontSize: 15,
                                                    fontWeight: 500,
                                                    color: BRAND_NAVY,
                                                    borderRadius: 1,
                                                    gap: 1.5,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(59,130,246,0.08)',
                                                        color: APP_PRIMARY_DARK,
                                                    },
                                                    transition: 'background 0.2s, color 0.2s',
                                                }}
                                            >
                                                <PersonIcon sx={{color: BRAND_NAVY, fontSize: 20}}/> Hồ sơ cá nhân
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => {
                                                    handleUserMenuClose();
                                                    goTo('/children-info');
                                                }}
                                                sx={{
                                                    fontSize: 15,
                                                    fontWeight: 500,
                                                    color: BRAND_NAVY,
                                                    borderRadius: 1,
                                                    gap: 1.5,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(59,130,246,0.08)',
                                                        color: APP_PRIMARY_DARK,
                                                    },
                                                    transition: 'background 0.2s, color 0.2s',
                                                }}
                                            >
                                                <AccountCircleIcon sx={{color: BRAND_NAVY, fontSize: 20}}/> Thông tin con
                                            </MenuItem>
                                        </>
                                    ) : (
                                    <MenuItem
                                        onClick={() => {
                                            handleUserMenuClose();
                                            if (userInfo) {
                                                if (userInfo.role === 'STUDENT') {
                                                    goTo('/student/dashboard');
                                                } else if (userInfo.role === 'SCHOOL') {
                                                    goTo('/school/dashboard');
                                                } else if (userInfo.role === 'ADMIN') {
                                                    goTo('/admin/dashboard');
                                                } else if (userInfo.role === 'COUNSELLOR') {
                                                    goTo('/counsellor/dashboard');
                                                } else {
                                                    goTo('/home');
                                                }
                                            }
                                        }}
                                        sx={{
                                            fontSize: 15,
                                            fontWeight: 500,
                                            color: BRAND_NAVY,
                                            borderRadius: 1,
                                            gap: 1.5,
                                            mt: 0.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(59,130,246,0.08)',
                                                color: APP_PRIMARY_DARK,
                                            },
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                    >
                                        <DashboardIcon sx={{color: BRAND_NAVY, fontSize: 20}}/> Bảng Thống Kê
                                    </MenuItem>
                                    )}
                                    <MenuItem
                                        onClick={() => {
                                            handleUserMenuClose();
                                            handleLogout();
                                        }}
                                        sx={{
                                            fontSize: 15,
                                            fontWeight: 500,
                                            color: '#dc3545',
                                            borderRadius: 1,
                                            gap: 1.5,
                                            mt: 0.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(220,53,69,0.08)',
                                                color: '#c82333',
                                            },
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                    >
                                        <LogoutIcon sx={{color: '#dc3545', fontSize: 20}}/> Đăng Xuất
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                sx={{
                                    ml: {xs: 0, sm: 1},
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    px: {xs: 3, sm: 3.5},
                                    py: 1.15,
                                    fontSize: 15,
                                    textTransform: 'none',
                                    ...(isHomeHeroTransparent
                                        ? {
                                              color: BRAND_NAVY,
                                              bgcolor: '#ffffff',
                                              background: '#ffffff',
                                              boxShadow: '0 4px 18px rgba(15,23,42,0.12)',
                                              '&:hover': {
                                                  bgcolor: '#f1f5f9',
                                                  background: '#f1f5f9',
                                                  boxShadow: '0 6px 22px rgba(15,23,42,0.16)'
                                              }
                                          }
                                        : {
                                              color: '#fff',
                                              background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                                              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)',
                                              '&:hover': {
                                                  background: `linear-gradient(90deg, ${APP_PRIMARY_DARK} 0%, ${BRAND_NAVY} 100%)`,
                                                  boxShadow: '0 12px 32px rgba(37, 99, 235, 0.36)'
                                              }
                                          })
                                }}
                                onClick={handleButtonClick}
                            >
                                Đăng nhập
                            </Button>
                        )}
                    </Box>
                    <IconButton
                        color="inherit"
                        sx={{
                            display: {md: 'none'},
                            color: BRAND_NAVY,
                            border: '1px solid rgba(59,130,246,0.38)',
                            bgcolor: 'rgba(255,255,255,0.72)',
                            '&:hover': {bgcolor: 'rgba(37,99,235,0.08)'}
                        }}
                        onClick={handleMobileMenuToggle}
                    >
                        <MenuIcon/>
                    </IconButton>
                </Box>
                <Collapse in={mobileMenuOpen}>
                    <Box sx={{
                        bgcolor: 'rgba(255,255,255,0.98)',
                        borderTop: '1px solid rgba(226,232,240,0.95)',
                        py: 2,
                        boxShadow: '0 12px 32px rgba(51,65,85,0.06)'
                    }}>
                        <List>
                            {isSignedIn && isParent ? (
                                <>
                                    <ListItem onClick={() => goTo('/home')} sx={navMobileItemSx('/home')}>
                                        <ListItemText primary="Trang chủ" sx={navMobileTextSx('/home')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/search-schools')} sx={navMobileItemSx('/search-schools')}>
                                        <ListItemText primary="Tìm trường" sx={navMobileTextSx('/search-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/posts')} sx={navMobileItemSx('/posts')}>
                                        <ListItemText primary="Bảng tin" sx={navMobileTextSx('/posts')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/saved-schools')}>
                                        <ListItemText primary="Trường yêu thích" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/compare-schools')}>
                                        <ListItemText primary="So sánh trường" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                </>
                            ) : isSignedIn && isSchool ? (
                                <>
                                    <ListItem onClick={() => goTo('/home')} sx={navMobileItemSx('/home')}>
                                        <ListItemText primary="Trang chủ" sx={navMobileTextSx('/home')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/search-schools')} sx={navMobileItemSx('/search-schools')}>
                                        <ListItemText primary="Tìm trường" sx={navMobileTextSx('/search-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/posts')} sx={navMobileItemSx('/posts')}>
                                        <ListItemText primary="Bảng tin" sx={navMobileTextSx('/posts')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/compare-schools')} sx={navMobileItemSx('/compare-schools')}>
                                        <ListItemText primary="So sánh trường" sx={navMobileTextSx('/compare-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/package-fees')} sx={navMobileItemSx('/package-fees')}>
                                        <ListItemText primary="Gói dịch vụ" sx={navMobileTextSx('/package-fees')}/>
                                    </ListItem>
                                </>
                            ) : isSignedIn && isAdmin ? (
                                <>
                                    <ListItem onClick={() => goTo('/home')} sx={navMobileItemSx('/home')}>
                                        <ListItemText primary="Trang chủ" sx={navMobileTextSx('/home')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/search-schools')} sx={navMobileItemSx('/search-schools')}>
                                        <ListItemText primary="Tìm trường" sx={navMobileTextSx('/search-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/posts')} sx={navMobileItemSx('/posts')}>
                                        <ListItemText primary="Bảng tin" sx={navMobileTextSx('/posts')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/compare-schools')} sx={navMobileItemSx('/compare-schools')}>
                                        <ListItemText primary="So sánh trường" sx={navMobileTextSx('/compare-schools')}/>
                                    </ListItem>
                                </>
                            ) : !isSignedIn ? (
                                <>
                                    <ListItem onClick={() => goTo('/home')} sx={navMobileItemSx('/home')}>
                                        <ListItemText primary="Trang chủ" sx={navMobileTextSx('/home')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/search-schools')} sx={navMobileItemSx('/search-schools')}>
                                        <ListItemText primary="Tìm trường" sx={navMobileTextSx('/search-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/posts')} sx={navMobileItemSx('/posts')}>
                                        <ListItemText primary="Bảng tin" sx={navMobileTextSx('/posts')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/saved-schools')}>
                                        <ListItemText primary="Trường yêu thích" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/compare-schools')}>
                                        <ListItemText primary="So sánh trường" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                </>
                            ) : !isHomePage && (
                                <>
                                    <ListItem onClick={() => goTo('/home')} sx={navMobileItemSx('/home')}>
                                        <ListItemText primary="Trang Chủ" sx={navMobileTextSx('/home')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/search-schools')} sx={navMobileItemSx('/search-schools')}>
                                        <ListItemText primary="Danh Sách Trường" sx={navMobileTextSx('/search-schools')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/posts')} sx={navMobileItemSx('/posts')}>
                                        <ListItemText primary="Bảng tin" sx={navMobileTextSx('/posts')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/compare-schools')} sx={navMobileItemSx('/compare-schools')}>
                                        <ListItemText primary="So sánh trường" sx={navMobileTextSx('/compare-schools')}/>
                                    </ListItem>
                                </>
                            )}
                            {isSignedIn && (
                                <>
                                    <Divider sx={{my: 1}}/>
                                    <ListItem sx={{py: 2}}>
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 2, width: '100%'}}>
                                            <Avatar
                                                src={avatarUrl}
                                                imgProps={{referrerPolicy: 'no-referrer'}}
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    bgcolor: BRAND_NAVY
                                                }}
                                            >
                                                {!avatarUrl && (displayName.charAt(0).toUpperCase())}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{fontSize: 14, fontWeight: 600, color: '#333'}}>
                                                    {displayName}
                                                </Typography>
                                                {displayEmail && (
                                                    <Typography sx={{fontSize: 12, color: '#666'}}>
                                                        {displayEmail}
                                                    </Typography>
                                                )}
                                                {userInfo?.role && (
                                                    <Typography sx={{fontSize: 11, color: BRAND_NAVY, mt: 0.5}}>
                                                        {userInfo.role === 'STUDENT' ? 'Học sinh' : 
                                                         userInfo.role === 'SCHOOL' ? 'Trường học' : 
                                                         userInfo.role === 'ADMIN' ? 'Quản trị viên' :
                                                         userInfo.role === 'PARENT' ? 'Phụ huynh' : userInfo.role}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </ListItem>
                                    <Divider sx={{my: 1}}/>
                                    {isParent ? (
                                        <>
                                            <ListItem 
                                                onClick={() => goTo('/parent/profile')}
                                                sx={{cursor: 'pointer'}}
                                            >
                                                <ListItemText 
                                                    primary="Hồ sơ cá nhân"
                                                    sx={{color: BRAND_NAVY, fontWeight: 600}}
                                                />
                                            </ListItem>
                                            <ListItem 
                                                onClick={() => goTo('/children-info')}
                                                sx={{cursor: 'pointer'}}
                                            >
                                                <ListItemText 
                                                    primary="Thông tin con"
                                                    sx={{color: BRAND_NAVY, fontWeight: 600}}
                                                />
                                            </ListItem>
                                        </>
                                    ) : (
                                    <ListItem 
                                        onClick={() => {
                                            if (userInfo) {
                                                if (userInfo.role === 'STUDENT') {
                                                    goTo('/student/dashboard');
                                                } else if (userInfo.role === 'SCHOOL') {
                                                    goTo('/school/dashboard');
                                                } else if (userInfo.role === 'ADMIN') {
                                                    goTo('/admin/dashboard');
                                                } else if (userInfo.role === 'COUNSELLOR') {
                                                    goTo('/counsellor/dashboard');
                                                } else {
                                                    goTo('/home');
                                                }
                                            }
                                        }}
                                        sx={{cursor: 'pointer'}}
                                    >
                                        <ListItemText 
                                            primary="Bảng Thống Kê"
                                            sx={{color: BRAND_NAVY, fontWeight: 600}}
                                        />
                                    </ListItem>
                                    )}
                                    <ListItem onClick={handleLogout} sx={{cursor: 'pointer'}}>
                                        <ListItemText 
                                            primary="Đăng Xuất" 
                                            sx={{color: '#dc3545', fontWeight: 600}}
                                        />
                                    </ListItem>
                                </>
                            )}
                        </List>
                    </Box>
                </Collapse>
            </Container>
            <Dialog
                open={studentSelectDialogOpen}
                onClose={handleCloseStudentSelectDialog}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid rgba(59,130,246,0.18)",
                        boxShadow: "0 20px 50px rgba(30,41,59,0.2)"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 700,
                        fontSize: 24,
                        color: BRAND_NAVY,
                        background: "linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(219,234,254,0.75) 100%)",
                        borderBottom: "1px solid rgba(59,130,246,0.16)"
                    }}
                >
                    Chọn học sinh cần tư vấn
                </DialogTitle>
                <DialogContent dividers sx={{py: 2.5, px: 2.5}}>
                    <Typography sx={{fontSize: 15, color: "#64748b", mb: 2, lineHeight: 1.6}}>
                        Vui lòng chọn hồ sơ học sinh để được tư vấn chi tiết hơn
                    </Typography>
                    <List disablePadding>
                        {studentSelectOptions.map((student) => (
                            <ListItem key={student.studentProfileId} disablePadding sx={{mb: 0.75}}>
                                <ListItemButton
                                    onClick={() => handleSelectStudentForConsult(student)}
                                    disabled={studentSelectLoading}
                                    sx={{
                                        borderRadius: 2.5,
                                        border: "1px solid rgba(51,65,85,0.12)",
                                        bgcolor: "rgba(248,250,252,0.86)",
                                        py: 1.35,
                                        transition: "all 0.25s ease",
                                        "&:hover": {
                                            borderColor: "rgba(59,130,246,0.38)",
                                            bgcolor: "rgba(239,246,255,0.95)",
                                            transform: "translateY(-1px)"
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={student.childName}
                                        primaryTypographyProps={{fontWeight: 600, color: "#0f172a", fontSize: 16}}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions sx={{px: 2, py: 1.25, borderTop: "1px solid rgba(148,163,184,0.22)"}}>
                    <Button onClick={handleCloseStudentSelectDialog} disabled={studentSelectLoading}>
                        Hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </AppBar>
    );
}

export function ScrollTopButton() {
    const [visible, setVisible] = React.useState(false);
    const isAnimatingRef = React.useRef(false);

    React.useEffect(() => {
        const handleScroll = () => {
            if (!isAnimatingRef.current) {
                setVisible(window.scrollY > 200);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleClick = () => {
        const start = window.scrollY || window.pageYOffset;
        const duration = 600;
        const startTime = performance.now();

        isAnimatingRef.current = true;

        const easeInOutCubic = (t) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutCubic(progress);
            const newY = start * (1 - eased);

            window.scrollTo(0, newY);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isAnimatingRef.current = false;
                setVisible(window.scrollY > 200);
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <Fade in={visible} timeout={500}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1300,
                    transition: 'transform 0.3s ease-out',
                    '&:hover': {
                        transform: 'translateX(-50%) translateY(-4px)'
                    }
                }}
            >
                <Fab
                    color="primary"
                    size="medium"
                    onClick={handleClick}
                    aria-label="scroll back to top"
                    sx={{
                        boxShadow: '0 8px 20px rgba(51,65,85,0.35)',
                        '&:hover': {
                            boxShadow: '0 12px 28px rgba(51,65,85,0.45)'
                        }
                    }}
                >
                    <KeyboardArrowUpIcon/>
                </Fab>
            </Box>
        </Fade>
    );
}

export default function Header() {
    return (
        <>
            <MainHeader/>
        </>
    );
}

