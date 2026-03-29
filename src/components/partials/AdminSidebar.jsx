import React, { useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
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
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { signout } from "../../services/AccountService.jsx";

const menuItems = [
    { text: "Bảng Điều Khiển", icon: <DashboardIcon />, path: "/admin/dashboard" },
    { text: "Quản Lý Người Dùng", icon: <PeopleIcon />, path: "/admin/users" },
    { text: "Xác Thực Trường", icon: <SchoolIcon />, path: "/admin/schools/verification" },
];

const LABEL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const LABEL_TRANSITION_MS = 200;
const LABEL_TRANSITION = `${LABEL_TRANSITION_MS}ms ${LABEL_EASING}`;
const LABEL_OFFSET_COLLAPSED = -8;

export default function AdminSidebar({ currentPath, collapsed = false, onToggleCollapse }) {
    const navigate = useNavigate();
    const [userAnchorEl, setUserAnchorEl] = useState(null);

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

    const labelCollapsedStyle = {
        opacity: 0,
        transform: `translateX(${LABEL_OFFSET_COLLAPSED}px)`,
        transition: `opacity ${LABEL_TRANSITION}, transform ${LABEL_TRANSITION}`,
    };
    const labelExpandedStyle = {
        opacity: 1,
        transform: "translateX(0)",
        transition: `opacity ${LABEL_TRANSITION}, transform ${LABEL_TRANSITION}`,
    };
    const labelStyle = collapsed ? labelCollapsedStyle : labelExpandedStyle;
    const labelWrapperStyle = {
        flex: collapsed ? 0 : 1,
        minWidth: 0,
        maxWidth: collapsed ? 0 : "none",
        overflow: "hidden",
        transition: "max-width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
    };

    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#ffffff",
                overflow: "hidden",
                fontFamily: '"Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
        >
            <Box
                sx={{
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
                                ...labelStyle,
                            }}
                        >
                            Quản trị viên
                        </Typography>
                    </Box>
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
                {menuItems.map((item) => {
                    const isActive =
                        currentPath === item.path ||
                        (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path + "/"));

                    const button = (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                sx={{
                                    py: 1.25,
                                    px: collapsed ? 1.5 : 2,
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    overflow: "hidden",
                                    bgcolor: isActive ? "rgba(29, 78, 216, 0.1)" : "transparent",
                                    color: isActive ? "#2563eb" : "#475569",
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
                                    {item.icon}
                                </ListItemIcon>
                                <Box sx={labelWrapperStyle}>
                                    <Box sx={{ ...labelStyle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
            </List>

            <Box
                sx={{
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
                        <Box sx={{ ...labelWrapperStyle, ml: collapsed ? 0 : 1.5 }}>
                            <Box sx={{ ...labelStyle, minWidth: 0, overflow: "hidden" }}>
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
