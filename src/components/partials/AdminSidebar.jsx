import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { signout } from "../../services/AccountService.jsx";
import { getCampusConversationsForAdmin } from "../../services/ConversationService.jsx";
import { connectPrivateMessageSocket, removePrivateMessageListener } from "../../services/WebSocketService.jsx";

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

const pickFirstConversationItem = (responseData) => {
    const envelope = parseBodyObject(responseData);
    const topBody = parseBodyObject(envelope?.body);
    const innerBody = parseBodyObject(topBody?.body);
    const roots = [innerBody, topBody, envelope].filter((x) => x && typeof x === "object");
    for (let i = 0; i < roots.length; i += 1) {
        const r = roots[i];
        if (Array.isArray(r?.items) && r.items.length) return r.items[0];
        if (Array.isArray(r?.content) && r.content.length) return r.content[0];
        if (Array.isArray(r?.data) && r.data.length) return r.data[0];
    }
    return null;
};

const conversationHasUnread = (item) => {
    if (!item || typeof item !== "object") return false;
    if (item.hasUnread === true) return true;
    const u = Number(
        item.unreadCount ??
            item.unreadMessages ??
            item.unread ??
            item.unreadMessageCount ??
            0
    );
    return Number.isFinite(u) && u > 0;
};

const getAdminConversationSourceItems = (responseData) => {
    const envelope = parseBodyObject(responseData);
    const topBody = parseBodyObject(envelope?.body);
    const list = Array.isArray(topBody?.items) ? topBody.items : [];
    const first = list.length ? null : pickFirstConversationItem(responseData);
    return list.length ? list : first ? [first] : [];
};

const countConversationsWithUnreadFromResponseData = (responseData) =>
    getAdminConversationSourceItems(responseData).reduce(
        (acc, item) => acc + (conversationHasUnread(item) ? 1 : 0),
        0
    );

const sumUnreadMessagesFromResponseData = (responseData) => {
    const total = getAdminConversationSourceItems(responseData).reduce((acc, item) => {
        const u = Number(
            item.unreadCount ?? item.unreadMessages ?? item.unreadMessageCount ?? item.unread ?? 0
        );
        if (!Number.isFinite(u) || u <= 0) return acc;
        return acc + Math.min(99, Math.trunc(u));
    }, 0);
    return Math.min(99, total);
};

const normalizePrincipal = (v) =>
    String(v || "")
        .trim()
        .toLowerCase()
        .replace(/^["'<\s]+|["'>\s]+$/g, "");

const unwrapWsPayloadAdmin = (p) => {
    if (!p || typeof p !== "object") return p;
    if (typeof p.body === "string") {
        try {
            return JSON.parse(p.body);
        } catch {
            return p;
        }
    }
    if (p.body && typeof p.body === "object") return p.body;
    return p;
};

const menuGroups = [
    {
        title: "TỔNG QUAN",
        items: [
            { text: "Bảng thống kê", icon: <DashboardIcon />, path: "/admin/dashboard" },
            {
                text: "Thống kê giao dịch",
                icon: <PaymentsOutlinedIcon />,
                path: "/admin/transaction-statistics",
            },
        ],
    },
    {
        title: "NGƯỜI DÙNG",
        items: [
            { text: "Quản lý người dùng", icon: <PeopleIcon />, path: "/admin/users" },
            {
                text: "Quản lý nhóm tính cách",
                icon: <PsychologyOutlinedIcon />,
                path: "/admin/personality-types",
            },
        ],
    },
    {
        title: "TRƯỜNG HỌC",
        items: [
            { text: "Xác thực trường học", icon: <SchoolIcon />, path: "/admin/schools/verification" },
            {
                text: "Trường đã mua gói",
                icon: <WorkspacePremiumOutlinedIcon />,
                path: "/admin/purchased-schools",
            },
            {
                text: "Quản lý môn học",
                icon: <MenuBookOutlinedIcon />,
                path: "/admin/subjects",
            },
        ],
    },
    {
        title: "NỀN TẢNG",
        items: [
            {
                text: "Cài đặt nền tảng",
                icon: <SettingsOutlinedIcon />,
                path: "/admin/platform-settings",
            },
            {
                text: "Quản lý phí gói dịch vụ",
                icon: <MonetizationOnOutlinedIcon />,
                path: "/admin/package-fees",
            },
            {
                text: "Quản lý tài liệu mẫu",
                icon: <DescriptionOutlinedIcon />,
                path: "/admin/document-templates",
            },
        ],
    },
    {
        title: "HỖ TRỢ",
        items: [{ text: "Liên hệ", icon: <ContactSupportOutlinedIcon />, path: "/admin/contact" }],
    },
];

export default function AdminSidebar({ currentPath, collapsed = false, onToggleCollapse }) {
    const navigate = useNavigate();
    const [userAnchorEl, setUserAnchorEl] = useState(null);
    /** Đồng bộ từ WS (aggregate) + GET lần đầu; khi không ở /admin/contact, WS bơm +từng tin. */
    const [contactUnreadConversationCount, setContactUnreadConversationCount] = useState(0);
    const [contactUnreadMessageTotal, setContactUnreadMessageTotal] = useState(0);
    const currentPathRef = useRef(currentPath);
    const offPageWsSyncTimerRef = useRef(null);

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
    const roleLabel = "Quản trị viên";
    const myPrincipalLower = normalizePrincipal(userInfo?.email || userInfo?.username || userInfo?.userName || "");

    const refreshAdminContactUnread = useCallback(async () => {
        try {
            const response = await getCampusConversationsForAdmin();
            if (response?.status !== 200) return;
            const nConv = countConversationsWithUnreadFromResponseData(response?.data);
            const nMsg = sumUnreadMessagesFromResponseData(response?.data);
            setContactUnreadConversationCount(Math.min(99, nConv));
            setContactUnreadMessageTotal(Math.min(99, nMsg));
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

    /** GET danh sách conversation chỉ lần đầu load sidebar; sau đó unread cập nhật qua WS (trang contact tự quản danh sách). */
    useEffect(() => {
        void refreshAdminContactUnread();
        const onCustom = () => void refreshAdminContactUnread();
        window.addEventListener("admin-contact-conversations-refresh", onCustom);
        return () => {
            window.removeEventListener("admin-contact-conversations-refresh", onCustom);
        };
    }, [refreshAdminContactUnread]);

    /** Trang Liên hệ emit sau mỗi lần cập nhật `conversations` (từ WS bump _unreadCount). */
    useEffect(() => {
        const onAggregate = (e) => {
            const cw = Number(e?.detail?.conversationsWithUnread);
            const tm = Number(e?.detail?.totalUnreadMessages);
            if (Number.isFinite(cw) && cw >= 0) setContactUnreadConversationCount(Math.min(99, cw));
            if (Number.isFinite(tm) && tm >= 0) setContactUnreadMessageTotal(Math.min(99, tm));
        };
        window.addEventListener("admin-contact-unread-aggregate", onAggregate);
        return () => window.removeEventListener("admin-contact-unread-aggregate", onAggregate);
    }, []);

    /**
     * Không GET khi có tin campus. Mỗi frame STOMP: +1 tổng tin; +1 số cuộc (debounce ~400ms, gộp nhiều tin cùng lúc).
     * Trang /admin/contact: aggregate từ AdminContactPage ghi đè cả hai.
     */
    useEffect(() => {
        const onPrivateMessage = (payload) => {
            const root = unwrapWsPayloadAdmin(payload);
            const sender =
                root?.senderName ??
                root?.senderEmail ??
                root?.sender ??
                root?.from ??
                root?.username ??
                "";
            const senderLower = normalizePrincipal(sender);
            if (senderLower && myPrincipalLower && senderLower === myPrincipalLower) return;
            const p = currentPathRef.current || "";
            if (p === "/admin/contact" || p.startsWith("/admin/contact/")) return;
            setContactUnreadMessageTotal((m) => Math.min(99, (m || 0) + 1));
            if (offPageWsSyncTimerRef.current) window.clearTimeout(offPageWsSyncTimerRef.current);
            offPageWsSyncTimerRef.current = window.setTimeout(() => {
                offPageWsSyncTimerRef.current = null;
                setContactUnreadConversationCount((c) => Math.min(99, (c || 0) + 1));
            }, 400);
        };
        connectPrivateMessageSocket({ onMessage: onPrivateMessage });
        return () => {
            if (offPageWsSyncTimerRef.current) window.clearTimeout(offPageWsSyncTimerRef.current);
            removePrivateMessageListener(onPrivateMessage);
        };
    }, [myPrincipalLower]);

    /** Badge menu Liên hệ: chỉ số cuộc có tin chưa đọc (không phải tổng số tin). Chi tiết tin/cuộc giữ trong tooltip. */
    const adminContactBadgeDisplay = Math.min(99, contactUnreadConversationCount || 0);

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
            <Box
                sx={{
                    flexShrink: 0,
                    pt: 2.5,
                    pb: 2.75,
                    pl: collapsed ? 2 : 3,
                    pr: 1,
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    minHeight: 48,
                    gap: 0.5,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: collapsed ? 0 : 1, overflow: "hidden" }}>
                    {collapsed ? (
                        <Tooltip title="Quản trị viên" placement="right">
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    letterSpacing: "-0.01em",
                                    flexShrink: 0,
                                }}
                            >
                                AD
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
                                Quản trị viên
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
                                (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path + "/"));
                            const contactSub =
                                item.path === "/admin/contact" &&
                                (contactUnreadMessageTotal > 0 || contactUnreadConversationCount > 0)
                                    ? ` — ${contactUnreadMessageTotal} tin · ${contactUnreadConversationCount} cuộc`
                                    : "";
                            const navItemTooltip = `${item.text}${contactSub}`;

                            const button = (
                                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            py: 1.25,
                                            px: collapsed ? 1.5 : 2,
                                            justifyContent: collapsed ? "center" : "flex-start",
                                            alignItems: "center",
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
                                                minWidth: 36,
                                                width: 36,
                                                flexShrink: 0,
                                                justifyContent: "center",
                                                mr: collapsed ? 0 : 0.75,
                                                alignSelf: "center",
                                            }}
                                        >
                                            {item.path === "/admin/contact" && adminContactBadgeDisplay > 0 ? (
                                                <Badge
                                                    badgeContent={adminContactBadgeDisplay}
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
                                                <ListItemText
                                                    primary={item.text}
                                                    sx={{ my: 0 }}
                                                    primaryTypographyProps={{
                                                        fontSize: 14,
                                                        fontWeight: isActive ? 600 : 500,
                                                        whiteSpace: "nowrap",
                                                        lineHeight: 1.35,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                />
                                            </Box>
                                        ) : null}
                                    </ListItemButton>
                                </ListItem>
                            );

                            return collapsed ? (
                                <Tooltip key={item.path} title={navItemTooltip} placement="right">
                                    <span style={{ display: "block" }}>{button}</span>
                                </Tooltip>
                            ) : item.path === "/admin/contact" && contactSub ? (
                                <Tooltip key={item.path} title={navItemTooltip} placement="right">
                                    <span style={{ display: "block" }}>{button}</span>
                                </Tooltip>
                            ) : (
                                <React.Fragment key={item.path}>{button}</React.Fragment>
                            );
                        })}
                    </React.Fragment>
                ))}
            </List>

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
                            <Box sx={{ ...labelWrapperStyle, ml: 0.875 }}>
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
                        navigate("/admin/profile");
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
