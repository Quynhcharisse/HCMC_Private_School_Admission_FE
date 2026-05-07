import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Badge,
    Box,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ApartmentIcon from "@mui/icons-material/Apartment";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CampaignIcon from "@mui/icons-material/Campaign";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { ROLE_SHELL_HEADER_HEIGHT_PX } from "../../constants/appShellLayout.js";
import { signout } from "../../services/AccountService.jsx";
import { useSchool } from "../../contexts/SchoolContext.jsx";
import { getCampusConversation } from "../../services/ConversationService.jsx";
import { markCampusMessagesRead } from "../../services/MessageService.jsx";
import { connectPrivateMessageSocket, removePrivateMessageListener } from "../../services/WebSocketService.jsx";

const SCHOOL_CONTACT_UNREAD_KEY = "school_contact_admin_unread_count";

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

const pickCampusConversationPayload = (responseData) => {
    const envelope = parseBodyObject(responseData);
    const body = parseBodyObject(envelope?.body);
    const inner = parseBodyObject(body?.body);
    if (inner && typeof inner === "object" && (inner.unreadCount != null || inner.hasNewMessage != null || inner.conversationId != null)) {
        return inner;
    }
    return body;
};

const extractCampusAdminConversationId = (responseData) => {
    const p = pickCampusConversationPayload(responseData);
    if (!p || typeof p !== "object") return null;
    const raw =
        p.conversationId ??
        p.conversation_id ??
        p.conversationID ??
        p.id ??
        null;
    if (raw == null || String(raw).trim() === "") return null;
    return raw;
};

/** Chỉ dùng field rõ ràng của conversation — tránh `unread` trùng tên field khác trên DTO tin nhắn WS. */
const unreadDisplayFromCampusConversationPayload = (payload) => {
    if (!payload || typeof payload !== "object") return 0;
    const raw =
        payload.unreadCount ??
        payload.unreadMessages ??
        payload.unreadMessageCount ??
        payload.numberOfUnread ??
        null;
    if (raw != null && raw !== "") {
        const unread = Number(raw);
        if (Number.isFinite(unread) && unread > 0) return Math.min(99, Math.trunc(unread));
    }
    if (payload.hasNewMessage === true) return 1;
    return 0;
};

/** BE có thể đặt sender trong chatMessage / message lồng. */
const extractPrivateMessageSender = (merged) => {
    const layers = [merged, merged?.chatMessage, merged?.message, merged?.data, merged?.dto, merged?.payload].filter(
        (x) => x && typeof x === "object" && !Array.isArray(x)
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

/** Gộp frame STOMP / body (kể cả chuỗi JSON) / data lồng — BE có thể gửi sender ở lớp bất kỳ. */
const mergeSchoolContactWsPayload = (payload) => {
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

/** Cùng logic với SchoolContactAdmin — chỉ tăng badge khi thật sự có nội dung tin. */
const flattenWsForSidebarMessage = (merged) => {
    const cm = merged?.chatMessage;
    const msg = merged?.message;
    return {
        ...merged,
        ...(cm && typeof cm === "object" && !Array.isArray(cm) ? cm : {}),
        ...(msg && typeof msg === "object" && !Array.isArray(msg) ? msg : {}),
    };
};

const stripInvisibleAndTrimSidebar = (s) =>
    String(s ?? "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

const normalizeSidebarMessage = (m) => {
    const flat = m && typeof m === "object" && !Array.isArray(m) ? flattenWsForSidebarMessage(m) : m || {};
    const rawText = flat?.content ?? flat?.message ?? flat?.text ?? "";
    const text =
        typeof rawText === "string"
            ? stripInvisibleAndTrimSidebar(rawText)
            : stripInvisibleAndTrimSidebar(String(rawText ?? ""));
    return { text };
};

const hasRenderableSidebarChatText = (m) => stripInvisibleAndTrimSidebar(m?.text ?? "") !== "";

/** Chỉ số unread số từ BE — không dùng `hasNewMessage` (dễ gây ghost badge khi chưa có tin thật). */
const explicitUnreadNumericFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return 0;
    const raw =
        payload.unreadCount ??
        payload.unreadMessages ??
        payload.unreadMessageCount ??
        payload.numberOfUnread ??
        null;
    if (raw != null && raw !== "") {
        const unread = Number(raw);
        if (Number.isFinite(unread) && unread > 0) return Math.min(99, Math.trunc(unread));
    }
    return 0;
};

const normalizePrincipal = (v) =>
    String(v || "")
        .trim()
        .toLowerCase()
        .replace(/^["'<\s]+|["'>\s]+$/g, "");

const readSchoolContactUnreadCount = () => {
    try {
        const raw = localStorage.getItem(SCHOOL_CONTACT_UNREAD_KEY);
        const num = Number(raw);
        return Number.isFinite(num) && num > 0 ? Math.trunc(num) : 0;
    } catch {
        return 0;
    }
};

const writeSchoolContactUnreadCount = (value) => {
    const next = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
    try {
        localStorage.setItem(SCHOOL_CONTACT_UNREAD_KEY, String(next));
    } catch {
        // ignore storage errors
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("school-contact-unread-updated", { detail: { count: next } }));
    }
    return next;
};

function buildConfigMenuItems(isPrimaryBranch, schoolCtxLoading) {
    const items = [];
    if (schoolCtxLoading || isPrimaryBranch) {
        items.push({
            text: "Cấu hình toàn trường",
            icon: <SettingsOutlinedIcon />,
            path: "/school/facility-config",
        });
    }
    items.push(
        {
            text: "Xem theo từng cơ sở",
            icon: <CorporateFareOutlinedIcon />,
            path: "/school/campus-config",
        },
        {
            text: "Cấu hình cơ sở của bạn",
            icon: <ApartmentIcon />,
            path: "/school/campus-facility-config",
        },
        {
            text: "Ngày nghỉ & lịch tư vấn",
            icon: <EventBusyOutlinedIcon />,
            path: "/school/holiday-settings",
        },
    );
    return items;
}

const menuGroupsBase = [
    {
        title: "TỔNG QUAN",
        items: [
            { text: "Bảng thống kê", icon: <DashboardIcon />, path: "/school/dashboard" },
            { text: "Thống kê tư vấn", icon: <BarChartRoundedIcon />, path: "/school/consultation-stats" },
            { text: "Phụ huynh quan tâm", icon: <PeopleAltIcon />, path: "/school/parents-interest" },
            { text: "Gói đã mua", icon: <CardMembershipIcon />, path: "/school/purchased-packages" },
        ],
    },
    {
        title: "QUẢN LÝ HỆ THỐNG",
        items: [
            { text: "Cơ sở", icon: <ApartmentIcon />, path: "/school/campus" },
            { text: "Tư vấn viên", icon: <SupportAgentIcon />, path: "/school/counselors" },
            { text: "Lịch tư vấn viên", icon: <EventAvailableIcon />, path: "/school/counselor-schedule" },
        ],
    },
    {
        title: "TUYỂN SINH",
        items: [
            { text: "Chiến dịch tuyển sinh", icon: <CampaignIcon />, path: "/school/campaigns" },
            { text: "Chỉ tiêu tuyển sinh", icon: <ViewAgendaIcon />, path: "/school/campaign-offerings" },
            { text: "Duyệt hồ sơ nhập học", icon: <FactCheckOutlinedIcon />, path: "/school/admission-reservations" },
        ],
    },
    {
        title: "CHƯƠNG TRÌNH",
        items: [
            { text: "Khung chương trình", icon: <MenuBookIcon />, path: "/school/curriculums" },
            { text: "Chương trình đào tạo", icon: <ViewAgendaIcon />, path: "/school/programs" },
        ],
    },
    {
        title: "CẤU HÌNH",
        items: [],
    },
    {
        title: "HỖ TRỢ",
        items: [{ text: "Liên hệ", icon: <ContactSupportOutlinedIcon />, path: "/school/contact" }],
    },
];

export default function SchoolSidebar({ currentPath, collapsed = false, onToggleCollapse }) {
    const navigate = useNavigate();
    const { isPrimaryBranch, loading: schoolCtxLoading } = useSchool();

    const menuGroups = useMemo(() => {
        return menuGroupsBase.map((g) => {
            if (g.title === "CẤU HÌNH") {
                return { ...g, items: buildConfigMenuItems(isPrimaryBranch, schoolCtxLoading) };
            }
            if (g.title === "TỔNG QUAN") {
                const items = g.items.filter((item) => {
                    if (item.path === "/school/purchased-packages") {
                        return schoolCtxLoading || isPrimaryBranch;
                    }
                    return true;
                });
                return { ...g, items };
            }
            return g;
        });
    }, [isPrimaryBranch, schoolCtxLoading]);
    const [userAnchorEl, setUserAnchorEl] = useState(null);
    const [contactUnreadCount, setContactUnreadCount] = useState(() => readSchoolContactUnreadCount());

    const userInfo = useMemo(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    const displayName = userInfo?.name || userInfo?.email || "Người dùng";
    const displayEmail = userInfo?.email || "";
    const avatarUrl = userInfo?.picture || null;
    const roleLabel = "Trường học";
    const myPrincipalLower = normalizePrincipal(userInfo?.email || userInfo?.username || userInfo?.userName || "");

    const refreshSchoolContactFromApi = useCallback(async () => {
        try {
            const response = await getCampusConversation();
            if (response?.status !== 200) return;
            const payload = pickCampusConversationPayload(response?.data);
            const apiN = unreadDisplayFromCampusConversationPayload(payload);
            /** Không ghi đè bump từ WS: GET đôi khi trả unread=0 chậm / lệch so với tin vừa tới qua STOMP. */
            const localN = readSchoolContactUnreadCount();
            const merged = Math.max(apiN, localN);
            writeSchoolContactUnreadCount(merged);
        } catch {
            /* ignore */
        }
    }, []);

    /** Vào trang Liên hệ từ sidebar → đánh dấu đã đọc trên server rồi xóa badge. */
    const markSchoolContactReadAndClearBadge = useCallback(async () => {
        try {
            const response = await getCampusConversation();
            if (response?.status !== 200) {
                writeSchoolContactUnreadCount(0);
                return;
            }
            const cid = extractCampusAdminConversationId(response?.data);
            if (cid != null) {
                const res = await markCampusMessagesRead(cid);
                if (res?.status >= 200 && res?.status < 300) {
                    writeSchoolContactUnreadCount(0);
                    return;
                }
            }
            writeSchoolContactUnreadCount(0);
        } catch {
            writeSchoolContactUnreadCount(0);
        }
    }, []);

    /** GET /campus/conversation: lần đầu load sidebar + sau khi trang Liên hệ sync (event). Không gọi theo từng tin WS. */
    useEffect(() => {
        void refreshSchoolContactFromApi();
        const onConversationRefresh = () => void refreshSchoolContactFromApi();
        window.addEventListener("school-contact-conversation-refresh", onConversationRefresh);
        return () => {
            window.removeEventListener("school-contact-conversation-refresh", onConversationRefresh);
        };
    }, [refreshSchoolContactFromApi]);

    useEffect(() => {
        const onUnreadUpdated = (event) => {
            const next = Number(event?.detail?.count);
            if (Number.isFinite(next) && next >= 0) {
                const v = Math.trunc(next);
                setContactUnreadCount(v);
                try {
                    localStorage.setItem(SCHOOL_CONTACT_UNREAD_KEY, String(v));
                } catch {
                    /* ignore */
                }
                return;
            }
            setContactUnreadCount(readSchoolContactUnreadCount());
        };
        window.addEventListener("school-contact-unread-updated", onUnreadUpdated);
        return () => window.removeEventListener("school-contact-unread-updated", onUnreadUpdated);
    }, []);

    useEffect(() => {
        const onPrivateMessage = (payload) => {
            const merged = mergeSchoolContactWsPayload(payload);
            const sender = extractPrivateMessageSender(merged);
            const senderLower = normalizePrincipal(sender);
            /** Tin do chính campus gửi (STOMP echo) — không tăng badge. */
            if (senderLower && myPrincipalLower && senderLower === myPrincipalLower) return;

            const normalized = normalizeSidebarMessage(merged);
            const hasText = hasRenderableSidebarChatText(normalized);
            const explicitUnread = explicitUnreadNumericFromPayload(merged);
            /**
             * Trước đây mọi frame WS (kể cả rỗng/heartbeat) đều +1 — lệch với trang chat (lọc tin rỗng) → ghost badge.
             * Chỉ cập nhật khi có số unread từ BE, hoặc khi payload giống tin chat thật (có nội dung).
             */
            if (!hasText) {
                if (explicitUnread > 0) {
                    setContactUnreadCount(explicitUnread);
                    writeSchoolContactUnreadCount(explicitUnread);
                }
                return;
            }

            const fromApiShape = unreadDisplayFromCampusConversationPayload(merged);
            if (fromApiShape > 0) {
                setContactUnreadCount(fromApiShape);
                writeSchoolContactUnreadCount(fromApiShape);
                return;
            }

            const prev = readSchoolContactUnreadCount();
            const next = Math.min(99, prev + 1);
            setContactUnreadCount(next);
            writeSchoolContactUnreadCount(next);
        };
        connectPrivateMessageSocket({ onMessage: onPrivateMessage });
        return () => removePrivateMessageListener(onPrivateMessage);
    }, [myPrincipalLower]);

    const handleUserMenuOpen = (e) => {
        e.stopPropagation();
        setUserAnchorEl(e.currentTarget);
    };

    const handleUserMenuClose = () => setUserAnchorEl(null);

    const handleLogout = async () => {
        handleUserMenuClose();
        try {
            const response = await signout();
            if (response && response.status === 200) {
                if (localStorage.length > 0) localStorage.clear();
                if (sessionStorage.length > 0) sessionStorage.clear();
                enqueueSnackbar("Đăng xuất thành công.", {
                    variant: "success",
                    autoHideDuration: 1000,
                });
                setTimeout(() => {
                    window.location.href = "/home";
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            enqueueSnackbar("Không thể đăng xuất.", { variant: "error" });
        }
    };

    const labelWrapperStyle = {
        flex: collapsed ? 0 : 1,
        minWidth: 0,
        maxWidth: collapsed ? 0 : "none",
        overflow: "hidden",
        flexShrink: collapsed ? 0 : 1,
    };

    return (
        <Box
            sx={{
                height: "100%",
                minHeight: "100%",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                bgcolor: "#ffffff",
                overflow: "hidden",
                fontFamily: '"Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
        >
            {/* Top: Trường Học + nút thu gọn/mở rộng */}
            <Box
                sx={{
                    flexShrink: 0,
                    height: ROLE_SHELL_HEADER_HEIGHT_PX,
                    minHeight: ROLE_SHELL_HEADER_HEIGHT_PX,
                    maxHeight: ROLE_SHELL_HEADER_HEIGHT_PX,
                    boxSizing: "border-box",
                    pl: collapsed ? 2 : 3,
                    pr: 1,
                    borderBottom: "1px solid #e0e7ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    gap: 0.5,
                    py: 0,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: collapsed ? 0 : 1, overflow: "hidden" }}>
                    {collapsed ? (
                        <Tooltip title="Trường Học" placement="right">
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    letterSpacing: "-0.01em",
                                    flexShrink: 0,
                                }}
                            >
                                TH
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {!collapsed ? (
                        <Box sx={labelWrapperStyle}>
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    letterSpacing: "-0.01em",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                Trường Học
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
                {onToggleCollapse && (
                    <Tooltip title={collapsed ? "Mở rộng" : "Thu gọn"} placement="right">
                        <IconButton
                            size="small"
                            onClick={onToggleCollapse}
                            sx={{
                                flexShrink: 0,
                                color: "#64748b",
                                bgcolor: "rgba(100, 116, 139, 0.08)",
                                "&:hover": {
                                    bgcolor: "rgba(100, 116, 139, 0.14)",
                                    color: "#1e293b",
                                },
                            }}
                        >
                            {collapsed ? (
                                <ChevronRightIcon fontSize="small" />
                            ) : (
                                <ChevronLeftIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <List
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    pt: 2,
                    pb: 2,
                    px: 1,
                    minWidth: 0,
                    "& .MuiListItemButton-root": {
                        borderRadius: "10px",
                        transition: "background-color 0.2s ease, border-color 0.2s ease",
                    },
                }}
            >
                {menuGroups.map((group, groupIndex) => (
                    <React.Fragment key={group.title}>
                        {!collapsed && groupIndex > 0 && (
                            <Divider
                                component="li"
                                sx={{
                                    my: 1.25,
                                    mx: 1.5,
                                    borderColor: "rgba(148, 163, 184, 0.35)",
                                    listStyle: "none",
                                }}
                            />
                        )}
                        {!collapsed && (
                            <ListSubheader
                                disableSticky
                                sx={{
                                    px: 2,
                                    py: 0,
                                    pt: groupIndex === 0 ? 0 : 0.25,
                                    pb: 1,
                                    mb: 0,
                                    lineHeight: 1.2,
                                    bgcolor: "transparent",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "#0f172a",
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
                                    boxSizing: "border-box",
                                }}
                            >
                                {group.title}
                            </ListSubheader>
                        )}
                        {collapsed && groupIndex > 0 && (
                            <Divider
                                component="li"
                                sx={{
                                    my: 1,
                                    mx: 0.5,
                                    borderColor: "rgba(148, 163, 184, 0.35)",
                                    listStyle: "none",
                                }}
                            />
                        )}
                        {group.items.map((item) => {
                            const isActive =
                                currentPath === item.path ||
                                (item.path !== "/school/dashboard" &&
                                    currentPath.startsWith(item.path + "/"));

                            const button = (
                                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => {
                                            navigate(item.path);
                                            if (item.path === "/school/contact") {
                                                void markSchoolContactReadAndClearBadge();
                                            }
                                        }}
                                        sx={{
                                            py: 1.25,
                                            px: collapsed ? 1.5 : 2,
                                            justifyContent: collapsed ? "center" : "flex-start",
                                            overflow: "hidden",
                                            bgcolor: isActive ? "rgba(29, 78, 216, 0.1)" : "transparent",
                                            color: isActive ? "#2563eb" : "#64748b",
                                            borderLeft: "3px solid transparent",
                                            ...(isActive && {
                                                borderLeftColor: "#2563eb",
                                                fontWeight: 600,
                                            }),
                                            "&:hover": {
                                                bgcolor: isActive
                                                    ? "rgba(29, 78, 216, 0.14)"
                                                    : "rgba(100, 116, 139, 0.08)",
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                color: isActive ? "#2563eb" : "#64748b",
                                                minWidth: 40,
                                                width: 40,
                                                flexShrink: 0,
                                                justifyContent: "center",
                                                mr: collapsed ? 0 : 1.5,
                                            }}
                                        >
                                            {item.path === "/school/contact" && contactUnreadCount > 0 ? (
                                                <Badge
                                                    badgeContent={Math.min(99, contactUnreadCount)}
                                                    color="error"
                                                    sx={{
                                                        "& .MuiBadge-badge": {
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            minWidth: 18,
                                                            height: 18,
                                                        },
                                                    }}
                                                >
                                                    {item.icon}
                                                </Badge>
                                            ) : (
                                                item.icon
                                            )}
                                        </ListItemIcon>
                                        {!collapsed ? (
                                            <Box sx={labelWrapperStyle}>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 1,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={item.text}
                                                        primaryTypographyProps={{
                                                            fontSize: 14,
                                                            fontWeight: isActive ? 600 : 500,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        ) : null}
                                    </ListItemButton>
                                </ListItem>
                            );

                            return collapsed ? (
                                <Tooltip key={item.path} title={item.text} placement="right">
                                    <span style={{ display: "block" }}>{button}</span>
                                </Tooltip>
                            ) : (
                                <React.Fragment key={item.path}>{button}</React.Fragment>
                            );
                        })}
                    </React.Fragment>
                ))}
            </List>

            {/* Bottom: Avatar + tên + role + dropdown */}
            <Box
                sx={{
                    flexShrink: 0,
                    p: 1.5,
                    borderTop: "1px solid #f1f5f9",
                    bgcolor: "rgba(248, 250, 252, 0.8)",
                }}
            >
                <Tooltip title={collapsed ? `${displayName} · ${roleLabel}` : ""} placement="right">
                    <ListItemButton
                        onClick={handleUserMenuOpen}
                        sx={{
                            borderRadius: "10px",
                            py: 1.25,
                            px: collapsed ? 1.5 : 2,
                            justifyContent: collapsed ? "center" : "flex-start",
                            overflow: "hidden",
                            "&:hover": {
                                bgcolor: "rgba(100, 116, 139, 0.08)",
                            },
                        }}
                    >
                        <Avatar
                            src={avatarUrl}
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "#2563eb",
                                fontSize: 14,
                                flexShrink: 0,
                            }}
                        >
                            {!avatarUrl && displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        {!collapsed ? (
                            <Box sx={{ ...labelWrapperStyle, ml: 1.5 }}>
                                <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: "#1e293b",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {displayName}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "#64748b",
                                            display: "block",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {roleLabel}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                    </ListItemButton>
                </Tooltip>
            </Box>

            <Menu
                anchorEl={userAnchorEl}
                open={Boolean(userAnchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                slotProps={{
                    paper: {
                        elevation: 8,
                        sx: {
                            mt: 1.5,
                            minWidth: 200,
                            borderRadius: 2,
                            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        },
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                        {displayName}
                    </Typography>
                    {displayEmail && (
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                            {displayEmail}
                        </Typography>
                    )}
                </Box>
                <Divider />
                <MenuItem
                    onClick={() => {
                        handleUserMenuClose();
                        navigate("/school/profile");
                    }}
                    sx={{ gap: 1.5, py: 1.25 }}
                >
                    <PersonOutlineIcon fontSize="small" sx={{ color: "#64748b" }} />
                    Hồ sơ
                </MenuItem>
                <MenuItem onClick={handleUserMenuClose} sx={{ gap: 1.5, py: 1.25 }}>
                    <SettingsOutlinedIcon fontSize="small" sx={{ color: "#64748b" }} />
                    Cài đặt
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.25, color: "#dc2626" }}>
                    <LogoutIcon fontSize="small" />
                    Đăng xuất
                </MenuItem>
            </Menu>
        </Box>
    );
}
