import React, {useState, useEffect} from "react";
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
import {connectPrivateMessageSocket, disconnect, sendMessage} from "../../services/WebSocketService.jsx";
import logo from "../../assets/logo.png";
import {useLocation, useNavigate} from "react-router-dom";

function MainHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [messageAnchorEl, setMessageAnchorEl] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
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

    const chatListRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const hasMarkedReadRef = React.useRef(false);
    const selectedConversationRef = React.useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const isHomePage = location.pathname === '/home' || location.pathname === '/';
    const isSignedIn = typeof window !== 'undefined' && localStorage.getItem('user');

    const getUserInfo = () => {
        if (localStorage.getItem('user')) {
            try {
                return JSON.parse(localStorage.getItem('user'));
            } catch (e) {
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
        const payload = response?.data?.body?.body || response?.data?.body || {};
        return {
            items: Array.isArray(payload?.items) ? payload.items : [],
            nextCursorId: payload?.nextCursorId ?? null,
            hasMore: !!payload?.hasMore
        };
    };

    const normalizeMessage = (message) => {
        const id = message?.id || message?.messageId || message?.clientMessageId || `${message?.sentAt || Date.now()}-${Math.random()}`;
        const text = message?.content || message?.message || "";
        const sender = message?.sender || message?.senderEmail || message?.from || message?.username || message?.createdBy || "";
        const sentAt = message?.sentAt || message?.createdAt || message?.timestamp || null;
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

    const loadMessageHistory = async ({conversation, cursorId = null}) => {
        if (!conversation) return;
        const {parentEmail, counsellorEmail} = resolveConversationEmails(conversation);

        if (!parentEmail || !counsellorEmail) {
            setMessageError('Thiếu thông tin email để tải lịch sử tin nhắn.');
            return;
        }

        setMessageLoading(true);
        setMessageError('');
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
            } else {
                setMessageError('Không thể tải lịch sử tin nhắn.');
            }
        } catch (error) {
            console.error('Error fetching message history:', error);
            setMessageError('Không thể tải lịch sử tin nhắn.');
        } finally {
            setMessageLoading(false);
        }
    };

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

        const payload = {
            conversationId: selectedConversation?.conversationId || selectedConversation?.id,
            content: trimmed,
            senderEmail: userInfo?.email,
            receiverEmail: selectedConversation?.counsellorEmail || selectedConversation?.otherUser || selectedConversation?.participantEmail
        };
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
                const conversationId = payload?.conversationId || payload?.conversation?.id;
                setConversationItems((prev) =>
                    prev.map((item) => {
                        const id = item?.conversationId || item?.id;
                        if (id !== conversationId) return item;
                        const currentUnread = Number(item?.unreadCount ?? item?.unreadMessages ?? 0) || 0;
                        const currentSelected = selectedConversationRef.current;
                        const selectedId = currentSelected?.conversationId || currentSelected?.id;
                        const shouldIncreaseUnread = !(selectedId && selectedId === conversationId);
                        return {
                            ...item,
                            lastMessage: payload?.content || payload?.message || item?.lastMessage,
                            unreadCount: shouldIncreaseUnread ? currentUnread + 1 : currentUnread
                        };
                    })
                );

                const currentSelected = selectedConversationRef.current;
                const selectedId = currentSelected?.conversationId || currentSelected?.id;
                if (selectedId && selectedId === conversationId) {
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
        const response = await signout()
        if (response && response.status === 200) {
            if (localStorage.length > 0) {
                localStorage.clear();
            }
            if (sessionStorage.length > 0) {
                sessionStorage.clear()
            }
            enqueueSnackbar(response.data.message, {variant: 'success', autoHideDuration: 1000})
            setTimeout(() => {
                window.location.href = '/home';
            }, 1000)
        }
    };

    const buttonText = isSignedIn ? 'Khám Phá' : 'Đăng Nhập';

    const handleButtonClick = (event) => {
        if (!isSignedIn) {
            navigate('/login');
        } else {
            handleUserMenuClick(event);
        }
    };

    const smoothScrollToSection = (sectionId) => {
        if (isHomePage) {
            const element = document.getElementById(sectionId);
            if (element) {
                const headerHeight = 80;
                const elementTop = element.offsetTop;
                const offsetPosition = elementTop - headerHeight;

                window.history.pushState(null, '', `#${sectionId}`);
                
                const startPosition = window.pageYOffset;
                const distance = offsetPosition - startPosition;
                const duration = Math.min(Math.abs(distance) * 0.8, 1200); // Max 1.2 seconds, smoother
                let start = null;

                const easeInOutCubic = (t) => {
                    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                };

                const step = (timestamp) => {
                    if (!start) start = timestamp;
                    const progress = timestamp - start;
                    const progressPercent = Math.min(progress / duration, 1);
                    const eased = easeInOutCubic(progressPercent);
                    
                    window.scrollTo(0, startPosition + distance * eased);
                    
                    if (progress < duration) {
                        requestAnimationFrame(step);
                    }
                };

                requestAnimationFrame(step);
            }
        } else {
            navigate(`/home#${sectionId}`);
        }
    };

    const goTo = (path) => {
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
    const navButtonSx = (path) => ({
        fontWeight: 600,
        color: isActivePath(path) ? '#0f4fbf' : '#334155',
        fontSize: 16,
        textTransform: 'none',
        px: 2,
        py: 1,
        borderRadius: 999,
        border: isActivePath(path) ? '1px solid rgba(25,118,210,0.35)' : '1px solid transparent',
        bgcolor: isActivePath(path)
            ? 'linear-gradient(135deg, rgba(227,242,253,1) 0%, rgba(219,234,254,1) 100%)'
            : 'transparent',
        boxShadow: isActivePath(path)
            ? '0 6px 16px rgba(25,118,210,0.18), inset 0 1px 0 rgba(255,255,255,0.75)'
            : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            color: '#1976d2',
            bgcolor: 'rgba(25,118,210,0.08)',
            borderColor: 'rgba(25,118,210,0.25)',
            boxShadow: '0 4px 12px rgba(25,118,210,0.14)',
            transform: 'translateY(-1px)'
        }
    });
    const navMobileItemSx = (path) => ({
        cursor: 'pointer',
        bgcolor: isActivePath(path)
            ? 'linear-gradient(135deg, rgba(227,242,253,1) 0%, rgba(219,234,254,1) 100%)'
            : 'transparent',
        border: isActivePath(path) ? '1px solid rgba(25,118,210,0.28)' : '1px solid transparent',
        borderRadius: 2
    });
    const navMobileTextSx = (path) => ({
        color: isActivePath(path) ? '#0f4fbf' : '#334155',
        fontWeight: isActivePath(path) ? 700 : 600
    });

    return (
        <AppBar position="fixed" elevation={0}
                sx={{
                    bgcolor: 'white', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
                    zIndex: 1000,
                    top: 0,
                    left: 0,
                    right: 0
                }}>
            <Container maxWidth={false} sx={{px: {xs: 2, md: 8}}}>
                <Box sx={{
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                        <Box component="img"
                             src={logo}
                             alt="EduBridgeHCM"
                             onClick={() => goTo('/home')}
                             sx={{
                                 cursor: "pointer",
                                 height: 50,
                                 width: 50,
                                 borderRadius: '50%',
                                 p: 1,
                                 boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                             }}
                        />
                        <Typography onClick={() => goTo('/home')} variant="h5"
                                    sx={{cursor: "pointer", fontWeight: 800, color: '#1976d2', letterSpacing: 1}}>
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
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/login')}
                            >
                                Trường đã lưu
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/login')}
                            >
                                So sánh trường
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/admission-news')}
                            >
                                Tin tuyển sinh
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
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/saved-schools')}
                            >
                                Trường đã lưu
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/consultation-requests')}
                            >
                                So sánh trường
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    textTransform: 'none',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#1976d2',
                                        bgcolor: 'rgba(25,118,210,0.08)',
                                        transform: 'translateY(-1px)',
                                    }
                                }}
                                onClick={() => goTo('/admission-news')}
                            >
                                Tin tuyển sinh
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
                                                bgcolor: 'rgba(25,118,210,0.14)',
                                                color: '#1976d2',
                                                border: '1px solid rgba(25,118,210,0.22)',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: 'rgba(25,118,210,0.2)',
                                                    color: '#1565c0',
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: '0 4px 10px rgba(25,118,210,0.22)'
                                                }
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
                                                borderRadius: 2.5,
                                                border: '1px solid rgba(37,99,235,0.22)',
                                                boxShadow: '0 18px 40px rgba(15,23,42,0.22), 0 0 0 4px rgba(37,99,235,0.10)',
                                                minWidth: 360,
                                                maxWidth: 380,
                                                mt: 1.2,
                                                p: 0,
                                                overflow: 'hidden',
                                                backdropFilter: 'blur(2px)'
                                            }
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            borderBottom: '1px solid rgba(15,23,42,0.08)',
                                            bgcolor: '#ffffff'
                                        }}
                                    >
                                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Typography sx={{fontSize: 22, fontWeight: 800, color: '#0f172a'}}>
                                                Đoạn chat
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                mt: 1.5,
                                                px: 1.25,
                                                py: 0.9,
                                                borderRadius: 999,
                                                bgcolor: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}
                                        >
                                            <SearchIcon sx={{fontSize: 19, color: '#94a3b8'}}/>
                                            <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                                Tìm kiếm trên đoạn chat
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
                                                                    bgcolor: 'rgba(25,118,210,0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <Avatar sx={{width: 38, height: 38, bgcolor: '#1d4ed8', fontSize: 14, fontWeight: 700}}>
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
                                                        color: '#1976d2',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(25,118,210,0.08)'
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
                                            width: {xs: 'calc(100vw - 16px)', sm: 360},
                                            height: 520,
                                            bgcolor: '#ffffff',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            boxShadow: '0 16px 34px rgba(30,64,175,0.22)',
                                            border: '1px solid rgba(37,99,235,0.25)',
                                            zIndex: 1500,
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                bgcolor: '#eff6ff',
                                                borderBottom: '1px solid rgba(37,99,235,0.18)'
                                            }}
                                        >
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                                <Avatar sx={{width: 30, height: 30, bgcolor: '#2563eb', fontSize: 13}}>
                                                    {(selectedConversation?.title || selectedConversation?.name || 'C').charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography sx={{fontSize: 14, fontWeight: 700, color: '#1e3a8a'}} noWrap>
                                                    {selectedConversation?.title || selectedConversation?.name || selectedConversation?.schoolName || 'Cuộc trò chuyện'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                                                <IconButton size="small" onClick={handleMinimizeChatWindow} sx={{color: '#2563eb'}}>
                                                    <RemoveIcon sx={{fontSize: 18}}/>
                                                </IconButton>
                                                <IconButton size="small" onClick={handleCloseChatWindow} sx={{color: '#2563eb'}}>
                                                    <CloseIcon sx={{fontSize: 18}}/>
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        <Box
                                            ref={chatListRef}
                                            onScroll={handleChatScroll}
                                            sx={{
                                                flex: 1,
                                                px: 1.25,
                                                py: 1.25,
                                                overflowY: 'auto',
                                                bgcolor: '#f8fbff'
                                            }}
                                        >
                                            {messageLoading && messageItems.length === 0 ? (
                                                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4}}>
                                                    <CircularProgress size={22}/>
                                                </Box>
                                            ) : messageError ? (
                                                <Typography sx={{fontSize: 13, color: '#dc2626'}}>{messageError}</Typography>
                                            ) : messageItems.length === 0 ? (
                                                <Typography sx={{fontSize: 13, color: '#64748b', textAlign: 'center', mt: 2}}>
                                                    Chưa có tin nhắn nào trong cuộc trò chuyện này
                                                </Typography>
                                            ) : (
                                                messageItems.map((msg) => {
                                                    const isMine = userIdentitySet.has((msg.sender || '').toLowerCase());
                                                    return (
                                                        <Box key={msg.id} sx={{display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', mb: 1.1}}>
                                                            <Box
                                                                sx={{
                                                                    maxWidth: '80%',
                                                                    px: 1.3,
                                                                    py: 0.9,
                                                                    borderRadius: 3,
                                                                    bgcolor: isMine ? '#2563eb' : '#eaf2ff',
                                                                    color: isMine ? '#ffffff' : '#0f172a',
                                                                    border: isMine ? 'none' : '1px solid rgba(37,99,235,0.2)'
                                                                }}
                                                            >
                                                                <Typography sx={{fontSize: 13, whiteSpace: 'pre-wrap'}}>
                                                                    {msg.text}
                                                                </Typography>
                                                                {msg.sentAt && (
                                                                    <Typography
                                                                        sx={{
                                                                            mt: 0.5,
                                                                            fontSize: 10,
                                                                            textAlign: 'right',
                                                                            color: isMine ? 'rgba(255,255,255,0.82)' : '#64748b'
                                                                        }}
                                                                    >
                                                                        {formatMessageTime(msg.sentAt)}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    );
                                                })
                                            )}
                                        </Box>
                                        <Box sx={{px: 1, py: 0.9, borderTop: '1px solid rgba(37,99,235,0.18)', bgcolor: '#ffffff'}}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    borderRadius: 999,
                                                    px: 1.2,
                                                    py: 0.45,
                                                    bgcolor: '#f1f5ff',
                                                    border: '1px solid rgba(37,99,235,0.18)'
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
                                                    placeholder="Aa"
                                                    sx={{flex: 1, fontSize: 14, color: '#0f172a'}}
                                                />
                                                <IconButton size="small" onClick={handleSendMessage} sx={{color: '#60a5fa'}}>
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
                                                    bgcolor: '#2563eb',
                                                    boxShadow: '0 10px 24px rgba(0,0,0,0.28)'
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
                                            bgcolor: 'rgba(25,118,210,0.08)'
                                        }
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            bgcolor: '#1976d2',
                                            boxShadow: '0 2px 8px rgba(25,118,210,0.3)'
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
                                                    bgcolor: '#1976d2'
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
                                                    <Typography sx={{fontSize: 11, color: '#1976d2', mt: 0.5}}>
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
                                                    color: '#1976d2',
                                                    borderRadius: 1,
                                                    gap: 1.5,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(25,118,210,0.08)',
                                                        color: '#1565c0',
                                                    },
                                                    transition: 'background 0.2s, color 0.2s',
                                                }}
                                            >
                                                <PersonIcon sx={{color: '#1976d2', fontSize: 20}}/> Hồ sơ cá nhân
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() => {
                                                    handleUserMenuClose();
                                                    goTo('/children-info');
                                                }}
                                                sx={{
                                                    fontSize: 15,
                                                    fontWeight: 500,
                                                    color: '#1976d2',
                                                    borderRadius: 1,
                                                    gap: 1.5,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(25,118,210,0.08)',
                                                        color: '#1565c0',
                                                    },
                                                    transition: 'background 0.2s, color 0.2s',
                                                }}
                                            >
                                                <AccountCircleIcon sx={{color: '#1976d2', fontSize: 20}}/> Thông tin con
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
                                            color: '#1976d2',
                                            borderRadius: 1,
                                            gap: 1.5,
                                            mt: 0.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(25,118,210,0.08)',
                                                color: '#1565c0',
                                            },
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                    >
                                        <DashboardIcon sx={{color: '#1976d2', fontSize: 20}}/> Bảng Điều Khiển
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
                                    background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                                    marginLeft: '1vw',
                                    color: 'white',
                                    fontWeight: 700,
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontSize: 16,
                                    boxShadow: '0 4px 12px rgba(25,118,210,0.3)',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)',
                                        boxShadow: '0 6px 16px rgba(25,118,210,0.4)'
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
                        sx={{display: {md: 'none'}, color: '#1976d2'}}
                        onClick={handleMobileMenuToggle}
                    >
                        <MenuIcon/>
                    </IconButton>
                </Box>
                <Collapse in={mobileMenuOpen}>
                    <Box sx={{
                        bgcolor: 'white',
                        borderTop: '1px solid #e0e0e0',
                        py: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
                                    <ListItem onClick={() => goTo('/consultation-requests')}>
                                        <ListItemText primary="So sánh trường" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/admission-news')}>
                                        <ListItemText primary="Tin tuyển sinh" sx={{color: '#333', fontWeight: 600}}/>
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
                                    <ListItem onClick={() => goTo('/consultation-requests')}>
                                        <ListItemText primary="So sánh trường" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => goTo('/admission-news')}>
                                        <ListItemText primary="Tin tuyển sinh" sx={{color: '#333', fontWeight: 600}}/>
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
                                                    bgcolor: '#1976d2'
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
                                                    <Typography sx={{fontSize: 11, color: '#1976d2', mt: 0.5}}>
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
                                                onClick={() => goTo('/profile')}
                                                sx={{cursor: 'pointer'}}
                                            >
                                                <ListItemText 
                                                    primary="Hồ sơ cá nhân"
                                                    sx={{color: '#1976d2', fontWeight: 600}}
                                                />
                                            </ListItem>
                                            <ListItem 
                                                onClick={() => goTo('/children-info')}
                                                sx={{cursor: 'pointer'}}
                                            >
                                                <ListItemText 
                                                    primary="Thông tin con"
                                                    sx={{color: '#1976d2', fontWeight: 600}}
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
                                            sx={{color: '#1976d2', fontWeight: 600}}
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

