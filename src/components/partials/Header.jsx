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
    Fab,
    IconButton,
    InputBase,
    List,
    ListItem,
    ListItemText,
    Menu,
    MenuItem,
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
import Fade from '@mui/material/Fade';
import {enqueueSnackbar} from "notistack";
import {signout, getProfile} from "../../services/AccountService.jsx";
import {getParentConversations} from "../../services/ConversationService.jsx";
import {getParentMessagesHistory, markParentMessagesRead} from "../../services/MessageService.jsx";
import {buildPrivateChatPayload, connectPrivateMessageSocket, disconnect, sendMessage} from "../../services/WebSocketService.jsx";
import logo from "../../assets/logo.png";
import {useLocation, useNavigate} from "react-router-dom";
import {BRAND_NAVY, BRAND_SKY, BRAND_SKY_LIGHT} from "../../constants/homeLandingTheme";

const isSameConversationId = (a, b) => a != null && b != null && String(a) === String(b);

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
    const [messageNextCursorId, setMessageNextCursorId] = useState(null);
    const [messageHasMore, setMessageHasMore] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatWindowOpen, setChatWindowOpen] = useState(false);
    const [chatWindowMinimized, setChatWindowMinimized] = useState(false);
    /** Trên Home: header trong suốt lúc đầu; kéo xuống → thanh trắng nổi (đồng bộ landing) */
    const [headerScrolled, setHeaderScrolled] = useState(false);

    const chatListRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const hasMarkedReadRef = React.useRef(false);
    const selectedConversationRef = React.useRef(null);

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
    const isParent = userInfo?.role === 'PARENT';
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
    const unreadMessagesCount = conversationItems.reduce((sum, item) => {
        const unread = Number(item?.unreadCount ?? item?.unreadMessages ?? 0);
        return Number.isFinite(unread) ? sum + unread : sum;
    }, 0);

    const parseConversationResponse = (response) => {
        const payload = response?.data?.body?.body || response?.data?.body || response?.data || {};
        return {
            items: Array.isArray(payload?.items) ? payload.items : [],
            nextCursorId: payload?.nextCursorId ?? null,
            hasMore: !!payload?.hasMore
        };
    };

    const normalizeConversation = (conversation) => {
        return {
            ...conversation,
            conversationId: conversation?.conversationId ?? conversation?.id ?? conversation?.conversation?.id ?? null,
            // API parent currently returns the other participant in `otherUser`.
            participantEmail: conversation?.otherUser ?? conversation?.participantEmail ?? conversation?.counsellorEmail ?? conversation?.schoolEmail ?? '',
            counsellorEmail: conversation?.otherUser ?? conversation?.counsellorEmail ?? conversation?.participantEmail ?? conversation?.schoolEmail ?? '',
            schoolEmail: conversation?.schoolEmail ?? conversation?.otherUser ?? conversation?.participantEmail ?? '',
            name: conversation?.name ?? conversation?.participantName ?? conversation?.title ?? conversation?.otherUser ?? 'Cuộc trò chuyện',
            title: conversation?.title ?? conversation?.name ?? conversation?.participantName ?? conversation?.otherUser ?? 'Cuộc trò chuyện',
            lastMessage: conversation?.lastMessage?.content ?? conversation?.lastMessage ?? conversation?.latestMessage ?? '',
            updatedAt: conversation?.updatedAt ?? conversation?.lastMessageTime ?? conversation?.time ?? null
        };
    };

    const parseHistoryResponse = (response) => {
        const payload = response?.data?.body?.body || response?.data?.body || response?.data || {};
        const items = Array.isArray(payload?.messages)
            ? payload.messages
            : Array.isArray(payload?.items)
              ? payload.items
              : [];
        return {
            items,
            nextCursorId: payload?.nextCursorId ?? payload?.cursorId ?? null,
            hasMore: !!payload?.hasMore
        };
    };

    const normalizeMessage = (message) => {
        const id = message?.id || message?.messageId || message?.clientMessageId || `${message?.sentAt || Date.now()}-${Math.random()}`;
        const text = message?.content || message?.message || message?.text || "";
        // BE thường lưu email trong senderName/receiverName — cần để nhận diện tin của mình (bubble phải)
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
        messages.forEach((message) => {
            if (message?.id) {
                map.set(String(message.id), message);
            }
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

    /** Phụ huynh: tin của mình bên phải (xanh), giống counsellor. senderName trên BE thường là email. */
    const isParentMessageMine = React.useCallback(
        (msg) => {
            const lower = (v) => (v ?? "").toString().trim().toLowerCase();
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
                .map(lower)
                .filter(Boolean);

            for (const c of candidates) {
                if (userIdentitySet.has(c)) return true;
            }

            const myName = lower(userInfo?.name || userInfo?.fullName);
            const senderDisplay = lower(r.senderName || r.senderDisplayName);
            if (myName && senderDisplay && myName === senderDisplay) return true;

            return false;
        },
        [userIdentitySet, userInfo]
    );

    const loadConversations = async (cursorId = null) => {
        setConversationLoading(true);
        setConversationError('');

        try {
            const response = await getParentConversations(cursorId);
            if (response?.status === 200) {
                const parsed = parseConversationResponse(response);
                const normalizedItems = parsed.items.map(normalizeConversation);
                setConversationItems((prev) => (cursorId ? [...prev, ...normalizedItems] : normalizedItems));
                setNextCursorId(parsed.nextCursorId);
                setHasMoreConversations(parsed.hasMore);
            } else {
                setConversationError('Không thể tải danh sách tin nhắn.');
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setConversationError('Không thể tải danh sách tin nhắn.');
        } finally {
            setConversationLoading(false);
        }
    };

    const resolveConversationEmails = (conversation) => {
        const parentEmail = userInfo?.email || conversation?.parentEmail || conversation?.participantParentEmail || '';
        const counsellorEmail = conversation?.counsellorEmail || conversation?.otherUser || conversation?.schoolEmail || conversation?.participantCounsellorEmail || conversation?.participantEmail || '';
        return {parentEmail, counsellorEmail};
    };

    const loadMessageHistory = async ({conversation, cursorId = null, silent = false}) => {
        if (!conversation) return;
        const {parentEmail, counsellorEmail} = resolveConversationEmails(conversation);

        if (!parentEmail || !counsellorEmail) {
            if (!silent) setMessageError('Thiếu thông tin email để tải lịch sử tin nhắn.');
            return;
        }

        if (!silent) {
            setMessageLoading(true);
            setMessageError('');
        }
        try {
            const response = await getParentMessagesHistory({
                parentEmail,
                counsellorEmail,
                cursorId
            });
            if (response?.status === 200) {
                const parsed = parseHistoryResponse(response);
                const normalized = parsed.items.map(normalizeMessage);
                setMessageItems((prev) => {
                    // When refreshing after sending, backend may not persist instantly.
                    // If history returns empty array, keep current messages (e.g. the websocket event).
                    if (cursorId) return mergeUniqueMessages([...normalized, ...prev]);
                    if (!normalized.length) return prev;
                    return mergeUniqueMessages(normalized);
                });
                setMessageNextCursorId(parsed.nextCursorId);
                setMessageHasMore(parsed.hasMore);
            } else if (!silent) {
                setMessageError('Không thể tải lịch sử tin nhắn.');
            }
        } catch (error) {
            console.error('Error fetching message history:', error);
            if (!silent) setMessageError('Không thể tải lịch sử tin nhắn.');
        } finally {
            if (!silent) setMessageLoading(false);
        }
    };

    /** Phụ huynh: đồng bộ REST khi WS trễ (cửa sổ chat đang mở). */
    useEffect(() => {
        if (!isSignedIn || !isParent || !chatWindowOpen || !selectedConversation) return;
        const intervalId = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            loadMessageHistory({conversation: selectedConversationRef.current, cursorId: null, silent: true});
        }, 3500);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, isParent, chatWindowOpen, selectedConversation?.conversationId]);

    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        selectedConversationRef.current = conversation;
        setMessageItems([]);
        setMessageNextCursorId(null);
        setMessageHasMore(false);
        setMessageError('');
        setMessageAnchorEl(null);
        setChatWindowOpen(true);
        setChatWindowMinimized(false);
        hasMarkedReadRef.current = false;
        await loadMessageHistory({conversation});
    };

    const handleChatScroll = async (event) => {
        if (!messageHasMore || loadingMoreRef.current || !selectedConversation) return;
        const node = event.currentTarget;
        if (node.scrollTop > 60) return;

        loadingMoreRef.current = true;
        const previousHeight = node.scrollHeight;
        await loadMessageHistory({conversation: selectedConversation, cursorId: messageNextCursorId});
        requestAnimationFrame(() => {
            const newHeight = node.scrollHeight;
            node.scrollTop = Math.max(newHeight - previousHeight, 0);
            loadingMoreRef.current = false;
        });
    };

    const handleMarkRead = async () => {
        if (!selectedConversation || hasMarkedReadRef.current) return;
        const conversationId = selectedConversation?.conversationId || selectedConversation?.id;
        const username = userInfo?.email || userInfo?.username;
        if (!conversationId || !username) return;

        try {
            await markParentMessagesRead({conversationId, username});
            hasMarkedReadRef.current = true;
            setConversationItems((prev) =>
                prev.map((item) => {
                    const id = item?.conversationId || item?.id;
                    if (id !== conversationId) return item;
                    return {...item, unreadCount: 0, unreadMessages: 0};
                })
            );
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleSendMessage = async () => {
        const trimmed = chatInput.trim();
        if (!trimmed || !selectedConversation) return;

        const {parentEmail, counsellorEmail} = resolveConversationEmails(selectedConversation);
        // Trùng principal Spring cho convertAndSendToUser — email, không phải tên hiển thị
        const senderName = (parentEmail || userInfo?.email || '').trim();
        const receiverName = (counsellorEmail || '').trim();
        if (!senderName || !receiverName) {
            enqueueSnackbar('Thiếu email phụ huynh hoặc tư vấn viên để gửi tin.', {variant: 'warning'});
            return;
        }
        const payload = buildPrivateChatPayload({
            conversationId: selectedConversation?.conversationId || selectedConversation?.id,
            message: trimmed,
            senderName,
            receiverName,
        });
        const sent = sendMessage(payload);
        if (!sent) {
            enqueueSnackbar('WebSocket chưa sẵn sàng, vui lòng thử lại.', {variant: 'warning'});
            return;
        }
        setChatInput('');

        // Refresh full history so the UI always reflects the latest backend state.
        // Delay helps the backend persist message before history request.
        await new Promise((resolve) => setTimeout(resolve, 400));
        await loadMessageHistory({ conversation: selectedConversation, cursorId: null });
    };

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

        const client = connectPrivateMessageSocket({
            onMessage: (payload) => {
                const conversationId = payload?.conversationId ?? payload?.conversation?.id;
                if (conversationId == null || conversationId === "") return;

                const previewText = payload?.message ?? payload?.content ?? "";
                const previewTime = payload?.timestamp ?? payload?.sentAt ?? payload?.time ?? null;

                setConversationItems((prev) =>
                    prev.map((item) => {
                        const id = item?.conversationId || item?.id;
                        if (!isSameConversationId(id, conversationId)) return item;
                        const currentUnread = Number(item?.unreadCount ?? item?.unreadMessages ?? 0) || 0;
                        const currentSelected = selectedConversationRef.current;
                        const selectedId = currentSelected?.conversationId || currentSelected?.id;
                        const shouldIncreaseUnread = !(
                            selectedId != null && isSameConversationId(selectedId, conversationId)
                        );
                        return {
                            ...item,
                            lastMessage: previewText || item?.lastMessage,
                            ...(previewTime != null ? {time: previewTime, updatedAt: previewTime} : {}),
                            unreadCount: shouldIncreaseUnread ? currentUnread + 1 : currentUnread,
                        };
                    })
                );

                const currentSelected = selectedConversationRef.current;
                const selectedId = currentSelected?.conversationId || currentSelected?.id;
                if (selectedId != null && isSameConversationId(selectedId, conversationId)) {
                    setMessageItems((prev) => mergeUniqueMessages([...prev, normalizeMessage(payload)]));
                }
            }
        });

        return () => {
            if (client?.active) {
                disconnect();
            }
        };
    }, [isSignedIn, isParent]);

    useEffect(() => {
        if (!selectedConversation || messageItems.length === 0) return;
        if (!chatListRef.current) return;
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

    const handleMessageMenuOpen = async (event) => {
        setMessageAnchorEl(event.currentTarget);
        await loadConversations();
    };

    const handleMessageMenuClose = () => {
        setMessageAnchorEl(null);
    };

    const handleCloseChatWindow = () => {
        setChatWindowOpen(false);
        setChatWindowMinimized(false);
        setSelectedConversation(null);
        selectedConversationRef.current = null;
        setMessageItems([]);
        setMessageError('');
        setChatInput('');
    };

    const handleMinimizeChatWindow = () => {
        setChatWindowMinimized(true);
    };

    const handleRestoreChatWindow = () => {
        setChatWindowMinimized(false);
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
        // Workaround: on School Search, some parent sessions keep stale outlet UI
        // even though URL changes. Force a full navigation from that page.
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
    const displayName = profileBody?.name || profileBody?.email || userInfo?.name || userInfo?.email || 'Người dùng';
    const displayEmail = profileBody?.email || userInfo?.email || '';
    const avatarUrl = profileBody?.picture || userInfo?.picture || null;
    const isActivePath = (path) => location.pathname === path;
    const brandIndigo = BRAND_NAVY;

    const navButtonSx = (path) => {
        const active = isActivePath(path);
        const hero = isHomeHeroTransparent;
        const inactiveColor = hero ? 'rgba(255,255,255,0.9)' : '#475569';
        const activeColor = hero ? '#ffffff' : brandIndigo;
        const underlineBg = hero ? 'rgba(255,255,255,0.85)' : BRAND_SKY;
        return {
            fontWeight: 700,
            color: active ? activeColor : inactiveColor,
            fontSize: 15,
            textTransform: 'none',
            px: 2,
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
                color: hero ? '#ffffff' : brandIndigo,
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
        bgcolor: isActivePath(path) ? 'rgba(45,95,115,0.1)' : 'transparent',
        border: isActivePath(path) ? '1px solid rgba(85,179,217,0.35)' : '1px solid transparent',
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
                zIndex: 1000,
                top: 0,
                left: 0,
                right: 0,
                bgcolor: isHomeHeroTransparent
                    ? 'transparent'
                    : headerElevated
                        ? 'rgba(255,255,255,0.97)'
                        : 'rgba(255,255,255,0.22)',
                backdropFilter: isHomeHeroTransparent ? 'none' : headerElevated ? 'none' : 'blur(16px)',
                WebkitBackdropFilter: isHomeHeroTransparent ? 'none' : headerElevated ? 'none' : 'blur(16px)',
                boxShadow: isHomeHeroTransparent
                    ? 'none'
                    : headerElevated
                        ? '0 1px 0 rgba(15,23,42,0.06), 0 12px 40px rgba(15,23,42,0.07)'
                        : '0 1px 0 rgba(255,255,255,0.55)',
                borderBottom: isHomeHeroTransparent
                    ? 'none'
                    : headerElevated
                        ? '1px solid rgba(226,232,240,0.95)'
                        : '1px solid rgba(255,255,255,0.45)',
                transition: 'background-color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease'
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
                                    ? '0 4px 20px rgba(15,23,42,0.15)'
                                    : headerElevated
                                        ? '0 4px 18px rgba(45,95,115,0.22)'
                                        : '0 6px 22px rgba(45,95,115,0.24)',
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
                                ...(isHomeHeroTransparent
                                    ? {
                                          color: '#ffffff',
                                          textShadow: '0 1px 2px rgba(15,23,42,0.35)'
                                      }
                                    : {
                                          background: `linear-gradient(120deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 50%, ${BRAND_SKY_LIGHT} 100%)`,
                                          WebkitBackgroundClip: 'text',
                                          WebkitTextFillColor: 'transparent',
                                          backgroundClip: 'text'
                                      })
                            }}
                        >
                            EduBridgeHCM
                        </Typography>
                    </Box>
                    {isSignedIn && isParent ? (
                        // Navigation cho PARENT đã đăng nhập
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
                            <Button color="inherit" sx={navButtonSx('/saved-schools')} onClick={() => goTo('/saved-schools')}>
                                Trường đã lưu
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/guide')} onClick={() => goTo('/guide')}>
                                Hướng dẫn
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/about')} onClick={() => goTo('/about')}>
                                Về chúng tôi
                            </Button>
                        </Box>
                    ) : !isSignedIn ? (
                        // Navigation cho guest (chưa đăng nhập) giống role PARENT
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
                            <Button color="inherit" sx={navButtonSx('/saved-schools')} onClick={() => goTo('/saved-schools')}>
                                Trường đã lưu
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/guide')} onClick={() => goTo('/guide')}>
                                Hướng dẫn
                            </Button>
                            <Button color="inherit" sx={navButtonSx('/about')} onClick={() => goTo('/about')}>
                                Về chúng tôi
                            </Button>
                        </Box>
                    ) : !isHomePage && (
                        // Navigation mặc định cho các trang khác
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
                                sx={navButtonSx('/guide')}
                                onClick={() => goTo('/guide')}
                            >
                                Hướng Dẫn
                            </Button>
                            <Button
                                color="inherit"
                                sx={navButtonSx('/about')}
                                onClick={() => goTo('/about')}
                            >
                                Về Chúng Tôi
                            </Button>
                        </Box>
                    )}
                    <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', gap: 1}}>
                        {isSignedIn ? (
                            <>
                                {isParent && (
                                    <Badge
                                        badgeContent={unreadMessagesCount}
                                        color="error"
                                        overlap="circular"
                                        invisible={unreadMessagesCount === 0}
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
                                                ...(isHomeHeroTransparent
                                                    ? {
                                                          bgcolor: 'rgba(255,255,255,0.14)',
                                                          color: '#ffffff',
                                                          border: '1px solid rgba(255,255,255,0.38)',
                                                          '&:hover': {
                                                              bgcolor: 'rgba(255,255,255,0.22)',
                                                              color: '#ffffff',
                                                              transform: 'translateY(-1px)',
                                                              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                                                          }
                                                      }
                                                    : {
                                                          bgcolor: 'rgba(45,95,115,0.08)',
                                                          color: BRAND_NAVY,
                                                          border: '1px solid rgba(85,179,217,0.4)',
                                                          '&:hover': {
                                                              bgcolor: 'rgba(45,95,115,0.12)',
                                                              color: '#265a6b',
                                                              transform: 'translateY(-1px)',
                                                              boxShadow: '0 4px 14px rgba(45,95,115,0.22)'
                                                          }
                                                      }),
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
                                                border: '1px solid rgba(45,95,115,0.18)',
                                                boxShadow: '0 22px 48px rgba(15,23,42,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset',
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
                                            borderBottom: '1px solid rgba(45,95,115,0.1)',
                                            background: 'linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(255,255,255,0.98) 100%)'
                                        }}
                                    >
                                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Typography sx={{fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em'}}>
                                                Tin nhắn
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                mt: 1.5,
                                                px: 1.25,
                                                py: 0.85,
                                                borderRadius: 999,
                                                bgcolor: 'rgba(45,95,115,0.06)',
                                                border: '1px solid rgba(45,95,115,0.12)',
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
                                        ) : conversationItems.length === 0 ? (
                                            <Box sx={{px: 2, py: 4, textAlign: 'center'}}>
                                                <ChatBubbleRoundedIcon sx={{fontSize: 30, color: '#94a3b8'}}/>
                                                <Typography sx={{fontSize: 14, color: '#475569', mt: 1}}>
                                                    Chưa có tin nhắn nào
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{maxHeight: 420, overflowY: 'auto'}}>
                                                {conversationItems.map((conversation, index) => {
                                                    const conversationId = conversation?.id || conversation?.conversationId;
                                                    const conversationName = conversation?.title || conversation?.name || conversation?.schoolName || conversation?.participantName || 'Cuộc trò chuyện';
                                                    const latestMessage = conversation?.lastMessage?.content || conversation?.lastMessage || conversation?.latestMessage || 'Chưa có nội dung';
                                                    const unreadCount = Number(conversation?.unreadCount ?? conversation?.unreadMessages ?? 0) || 0;

                                                    return (
                                                        <Box
                                                            key={conversationId || `${conversationName}-${index}`}
                                                            onClick={() => handleSelectConversation(conversation)}
                                                            sx={{
                                                                px: 2,
                                                                py: 1.25,
                                                                borderBottom: '1px solid rgba(15,23,42,0.06)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1.5,
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s ease',
                                                                '&:hover': {
                                                                    bgcolor: 'rgba(45,95,115,0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <Avatar sx={{width: 40, height: 40, bgcolor: BRAND_NAVY, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 12px rgba(45,95,115,0.35)'}}>
                                                                {conversationName.charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <Box sx={{minWidth: 0, flex: 1}}>
                                                                <Typography noWrap sx={{fontSize: 14, fontWeight: 700, color: '#0f172a'}}>
                                                                    {conversationName}
                                                                </Typography>
                                                                <Typography noWrap sx={{fontSize: 13, color: '#475569'}}>
                                                                    {latestMessage}
                                                                </Typography>
                                                            </Box>
                                                            {unreadCount > 0 && (
                                                                <Badge
                                                                    badgeContent={unreadCount}
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
                                            <Box sx={{px: 2, py: 1.25, borderTop: '1px solid rgba(15,23,42,0.08)'}}>
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
                                                            bgcolor: 'rgba(45,95,115,0.08)'
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
                                            zIndex: 1500,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            bgcolor: '#f8fafc',
                                            border: '1px solid rgba(45,95,115,0.2)',
                                            boxShadow: '0 24px 56px rgba(15,23,42,0.18), 0 0 0 1px rgba(255,255,255,0.5) inset'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 1.15,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: `linear-gradient(135deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 55%, ${BRAND_SKY_LIGHT} 100%)`,
                                                borderBottom: '1px solid rgba(255,255,255,0.12)',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0}}>
                                                <Avatar
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        bgcolor: 'rgba(255,255,255,0.22)',
                                                        fontSize: 15,
                                                        fontWeight: 800,
                                                        border: '2px solid rgba(255,255,255,0.35)'
                                                    }}
                                                >
                                                    {(selectedConversation?.title || selectedConversation?.name || 'C').charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Box sx={{minWidth: 0}}>
                                                    <Typography sx={{fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.25}} noWrap>
                                                        {selectedConversation?.title || selectedConversation?.name || selectedConversation?.schoolName || 'Cuộc trò chuyện'}
                                                    </Typography>
                                                    <Typography sx={{fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.78)', mt: 0.15}}>
                                                        Tư vấn viên
                                                    </Typography>
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
                                                background: `
                                                    linear-gradient(180deg, rgba(238,242,255,0.65) 0%, rgba(248,250,252,0.98) 28%, #f1f5f9 100%),
                                                    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12), transparent 55%)
                                                `,
                                                WebkitOverflowScrolling: 'touch'
                                            }}
                                        >
                                            {messageLoading && messageItems.length === 0 ? (
                                                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5}}>
                                                    <CircularProgress size={24} sx={{color: BRAND_NAVY}}/>
                                                </Box>
                                            ) : messageError ? (
                                                <Typography sx={{fontSize: 13, color: '#dc2626'}}>{messageError}</Typography>
                                            ) : messageItems.length === 0 ? (
                                                <Box sx={{textAlign: 'center', py: 4, px: 2}}>
                                                    <ChatBubbleRoundedIcon sx={{fontSize: 40, color: 'rgba(45,95,115,0.35)', mb: 1}}/>
                                                    <Typography sx={{fontSize: 13, color: '#64748b', lineHeight: 1.55}}>
                                                        Chưa có tin nhắn. Hãy chào tư vấn viên để bắt đầu cuộc trò chuyện.
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                groupedParentMessages.map((group) => (
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
                                                                    boxShadow: '0 1px 2px rgba(15,23,42,0.06)'
                                                                }}
                                                            >
                                                                {group.label}
                                                            </Typography>
                                                        </Box>
                                                        {group.items.map((msg, idx) => {
                                                            const isMine = isParentMessageMine(msg);
                                                            const prev = idx > 0 ? group.items[idx - 1] : null;
                                                            const prevIsMine = prev ? isParentMessageMine(prev) : null;
                                                            const showPeerAvatar = !isMine && (idx === 0 || prevIsMine === true);
                                                            const stackTight = idx > 0 && prevIsMine === isMine;
                                                            const peerLabel = selectedConversation?.title || selectedConversation?.name || selectedConversation?.schoolName || 'T';
                                                            return (
                                                                <Box
                                                                    key={msg.id}
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
                                                                                    sx={{
                                                                                        width: 32,
                                                                                        height: 32,
                                                                                        fontSize: 13,
                                                                                        fontWeight: 700,
                                                                                        bgcolor: BRAND_NAVY,
                                                                                        boxShadow: '0 2px 8px rgba(45,95,115,0.35)'
                                                                                    }}
                                                                                >
                                                                                    {peerLabel.charAt(0).toUpperCase()}
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
                                                                                    ? `linear-gradient(145deg, ${BRAND_SKY} 0%, ${BRAND_NAVY} 50%, #265a6b 100%)`
                                                                                    : '#ffffff',
                                                                                color: isMine ? '#ffffff' : '#0f172a',
                                                                                border: isMine ? 'none' : '1px solid rgba(148,163,184,0.4)',
                                                                                boxShadow: isMine
                                                                                    ? '0 2px 8px rgba(45,95,115,0.3), 0 1px 0 rgba(255,255,255,0.12) inset'
                                                                                    : '0 1px 3px rgba(15,23,42,0.06)'
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
                                                ))
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                px: 1.25,
                                                py: 1,
                                                borderTop: '1px solid rgba(45,95,115,0.12)',
                                                bgcolor: 'rgba(255,255,255,0.96)',
                                                backdropFilter: 'blur(8px)',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    borderRadius: 2.5,
                                                    px: 1.35,
                                                    py: 0.55,
                                                    bgcolor: 'rgba(45,95,115,0.06)',
                                                    border: '1px solid rgba(45,95,115,0.15)',
                                                    boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset'
                                                }}
                                            >
                                                <InputBase
                                                    value={chatInput}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    onFocus={handleMarkRead}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                    placeholder="Nhập tin nhắn…"
                                                    sx={{flex: 1, fontSize: 14, color: '#0f172a', '& ::placeholder': {color: '#94a3b8', opacity: 1}}}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={handleSendMessage}
                                                    disabled={!chatInput.trim()}
                                                    sx={{
                                                        color: chatInput.trim() ? BRAND_NAVY : 'rgba(45,95,115,0.35)',
                                                        bgcolor: chatInput.trim() ? 'rgba(85,179,217,0.15)' : 'transparent',
                                                        '&:hover': {bgcolor: chatInput.trim() ? 'rgba(85,179,217,0.22)' : 'transparent'}
                                                    }}
                                                >
                                                    <SendRoundedIcon fontSize="small"/>
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                {chatWindowOpen && selectedConversation && chatWindowMinimized && (
                                    <Box
                                        sx={{
                                            position: 'fixed',
                                            // Align with Chatbot button in `src/components/ui/Chatbot.jsx` (right: 24, width: 64)
                                            // Our minimized avatar is 56px wide, so move it left by ~4px to align centers.
                                            right: {xs: 24, sm: 24},
                                            // Stack directly above Chatbot button:
                                            // Chatbot: bottom=24, height=64 => top=88. Add small gap.
                                            bottom: 98,
                                            zIndex: 1500
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
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: BRAND_NAVY,
                                                    boxShadow: '0 10px 28px rgba(45,95,115,0.45)',
                                                    border: '2px solid rgba(255,255,255,0.35)'
                                                }}
                                            >
                                                {(selectedConversation?.title || selectedConversation?.name || 'C').charAt(0).toUpperCase()}
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
                                                    bgcolor: 'rgba(15,23,42,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.14)',
                                                    borderRadius: '50%',
                                                    padding: 0.25,
                                                    width: 18,
                                                    height: 18,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(15,23,42,1)'
                                                    }
                                                }}
                                            >
                                                <CloseIcon sx={{fontSize: 14}} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
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
                                            bgcolor: isHomeHeroTransparent ? 'rgba(255,255,255,0.14)' : 'rgba(45,95,115,0.1)'
                                        }
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            bgcolor: BRAND_NAVY,
                                            boxShadow: '0 4px 14px rgba(45,95,115,0.35)'
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
                                                         userInfo.role === 'COUNSELLOR' ? 'Tư vấn viên' : userInfo.role}
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
                                                        bgcolor: 'rgba(45,95,115,0.08)',
                                                        color: '#265a6b',
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
                                                        bgcolor: 'rgba(45,95,115,0.08)',
                                                        color: '#265a6b',
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
                                                bgcolor: 'rgba(45,95,115,0.08)',
                                                color: '#265a6b',
                                            },
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                    >
                                        <DashboardIcon sx={{color: BRAND_NAVY, fontSize: 20}}/> Bảng Điều Khiển
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
                                    color: '#fff',
                                    background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                                    boxShadow: '0 8px 24px rgba(45, 95, 115, 0.32)',
                                    '&:hover': {
                                        background: `linear-gradient(90deg, #265a6b 0%, ${BRAND_NAVY} 100%)`,
                                        boxShadow: '0 12px 32px rgba(45, 95, 115, 0.42)'
                                    }
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
                            ...(isHomeHeroTransparent
                                ? {
                                      color: '#ffffff',
                                      border: '1px solid rgba(255,255,255,0.45)',
                                      bgcolor: 'rgba(255,255,255,0.12)',
                                      '&:hover': {bgcolor: 'rgba(255,255,255,0.2)'}
                                  }
                                : {
                                      color: BRAND_NAVY,
                                      border: '1px solid rgba(85,179,217,0.45)',
                                      bgcolor: 'rgba(255,255,255,0.65)',
                                      '&:hover': {bgcolor: 'rgba(45,95,115,0.08)'}
                                  })
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
                        boxShadow: '0 12px 32px rgba(15,23,42,0.06)'
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
                                    <ListItem onClick={() => goTo('/saved-schools')}>
                                        <ListItemText primary="Trường đã lưu" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/guide')}>
                                        <ListItemText primary="Hướng dẫn" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/about')}>
                                        <ListItemText primary="Về chúng tôi" sx={{color: '#333', fontWeight: 600}}/>
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
                                    <ListItem onClick={() => goTo('/saved-schools')}>
                                        <ListItemText primary="Trường đã lưu" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/guide')}>
                                        <ListItemText primary="Hướng dẫn" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/about')}>
                                        <ListItemText primary="Về chúng tôi" sx={{color: '#333', fontWeight: 600}}/>
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
                                    <ListItem onClick={() => goTo('/guide')} sx={navMobileItemSx('/guide')}>
                                        <ListItemText primary="Hướng Dẫn" sx={navMobileTextSx('/guide')}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/about')} sx={navMobileItemSx('/about')}>
                                        <ListItemText primary="Về Chúng Tôi" sx={navMobileTextSx('/about')}/>
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
                                            primary="Bảng Điều Khiển"
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
                        boxShadow: '0 8px 20px rgba(15,23,42,0.35)',
                        '&:hover': {
                            boxShadow: '0 12px 28px rgba(15,23,42,0.45)'
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

