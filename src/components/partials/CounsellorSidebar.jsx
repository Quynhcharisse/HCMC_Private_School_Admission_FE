import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import GroupsIcon from "@mui/icons-material/Groups";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { signout } from "../../services/AccountService.jsx";
import { getCounsellorConversations } from "../../services/ConversationService.jsx";
import { connectPrivateMessageSocket, removePrivateMessageListener } from "../../services/WebSocketService.jsx";

const COUNSELLOR_PARENT_UNREAD_CONVERSATIONS_KEY = "counsellor_parent_unread_conversations";

const readCounsellorUnreadConversations = () => {
  try {
    const raw = localStorage.getItem(COUNSELLOR_PARENT_UNREAD_CONVERSATIONS_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
};

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

const countUnreadConversationRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).reduce((total, row) => {
    const unread = Number(row?.unreadCount ?? row?.unreadMessages ?? row?.unread ?? 0) || 0;
    return total + (unread > 0 ? 1 : 0);
  }, 0);

const parseConversationResponse = (response) => {
  const payload = response?.data?.body?.body || response?.data?.body || response?.data || {};
  return Array.isArray(payload?.items) ? payload.items : [];
};

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

const normalizeWsPrincipal = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/^["'<\s]+|["'>\s]+$/g, "");

const mergeCounsellorWsPayload = (payload) => {
  const root = parseWsObject(payload);
  const body = parseWsObject(root?.body);
  const data = parseWsObject(body?.data ?? root?.data);
  const chatMessage = parseWsObject(root?.chatMessage ?? body?.chatMessage ?? data?.chatMessage);
  const message = parseWsObject(root?.message ?? body?.message ?? data?.message);
  const nestedPayload = parseWsObject(message?.payload ?? data?.payload);
  return { ...root, ...body, ...data, ...nestedPayload, ...chatMessage, ...message };
};

const pickConversationIdFromWsMerged = (merged) => {
  if (!merged || typeof merged !== "object") return null;
  const raw =
    merged.conversationId ??
    merged.conversation_id ??
    merged?.conversation?.id ??
    merged?.conversation?.conversationId ??
    merged?.chatMessage?.conversationId ??
    merged?.message?.conversationId ??
    merged?.message?.conversation?.id ??
    null;
  if (raw == null || raw === "") return null;
  return String(raw).trim();
};

const rebuildUnreadConversationIdSet = (activeItems, pendingItems) => {
  const s = new Set();
  [...activeItems, ...pendingItems].forEach((row) => {
    const unread = Number(row?.unreadCount ?? row?.unreadMessages ?? row?.unread ?? 0) || 0;
    if (unread <= 0) return;
    const cid = row?.conversationId ?? row?.id ?? row?.conversation?.id;
    if (cid != null && String(cid).trim() !== "") s.add(String(cid).trim());
  });
  return s;
};

const menuGroups = [
  {
    title: "TỔNG QUAN",
    items: [{ text: "Bảng thống kê", icon: <DashboardIcon />, path: "/counsellor/dashboard" }],
  },
  {
    title: "TƯ VẤN",
    items: [
      { text: "Tư vấn Phụ Huynh", icon: <GroupsIcon />, path: "/counsellor/parent-consultation" },
      { text: "Lịch tư vấn", icon: <CalendarMonthIcon />, path: "/counsellor/calendar" },
      { text: "Lịch tư vấn trực tiếp", icon: <EventAvailableIcon />, path: "/counsellor/offline-consultation" },
    ],
  },
];

export default function CounsellorSidebar({ currentPath, collapsed = false, onToggleCollapse }) {
  const navigate = useNavigate();
  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [parentUnreadConversations, setParentUnreadConversations] = useState(() => readCounsellorUnreadConversations());
  /** conversationId đã tính vào badge (đồng bộ với GET lần đầu + tin WS), tránh gọi API mỗi tin parent. */
  const conversationIdsWithUnreadRef = useRef(new Set());
  const eventUnreadSyncTimerRef = useRef(null);
  /** So sánh với count mới từ event: chỉ GET khi số giảm (đã đọc), không GET khi parent nhắn làm count tăng. */
  const lastUnreadCountRef = useRef(readCounsellorUnreadConversations());

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
  const roleLabel = "Tư vấn viên";

  const identityLowerSet = useMemo(() => {
    const set = new Set();
    [userInfo?.email, userInfo?.username, userInfo?.userName, userInfo?.sub].forEach((x) => {
      const s = String(x || "").trim().toLowerCase();
      if (s) set.add(s);
    });
    return set;
  }, [userInfo]);

  const refreshCounsellorUnreadFromApi = useCallback(async () => {
    try {
      const [activeResponse, pendingResponse] = await Promise.all([
        getCounsellorConversations({ status: "active" }),
        getCounsellorConversations({ status: "pending" }),
      ]);
      const activeItems = parseConversationResponse(activeResponse);
      const pendingItems = parseConversationResponse(pendingResponse);
      conversationIdsWithUnreadRef.current = rebuildUnreadConversationIdSet(activeItems, pendingItems);
      const unreadConversationCount =
        countUnreadConversationRows(activeItems) + countUnreadConversationRows(pendingItems);
      lastUnreadCountRef.current = unreadConversationCount;
      setParentUnreadConversations(unreadConversationCount);
      writeCounsellorUnreadConversations(unreadConversationCount, { silent: true });
    } catch {
      // ignore sidebar unread sync errors
    }
  }, []);

  useEffect(() => {
    void refreshCounsellorUnreadFromApi();
  }, [refreshCounsellorUnreadFromApi]);

  useEffect(() => {
    const onUnreadUpdated = (event) => {
      const next = Number(event?.detail?.count);
      if (Number.isFinite(next) && next >= 0) {
        const prev = lastUnreadCountRef.current;
        const n = Math.trunc(next);
        lastUnreadCountRef.current = n;
        setParentUnreadConversations(n);
        /** Chỉ GET khi unread giảm (đánh dấu đã đọc trên trang tư vấn). Parent nhắn → count tăng → không GET. */
        if (n < prev) {
          if (eventUnreadSyncTimerRef.current != null) clearTimeout(eventUnreadSyncTimerRef.current);
          eventUnreadSyncTimerRef.current = window.setTimeout(() => {
            eventUnreadSyncTimerRef.current = null;
            void refreshCounsellorUnreadFromApi();
          }, 400);
        }
        return;
      }
      const fallback = readCounsellorUnreadConversations();
      lastUnreadCountRef.current = fallback;
      setParentUnreadConversations(fallback);
    };
    window.addEventListener("counsellor-parent-unread-updated", onUnreadUpdated);
    return () => {
      if (eventUnreadSyncTimerRef.current != null) {
        clearTimeout(eventUnreadSyncTimerRef.current);
        eventUnreadSyncTimerRef.current = null;
      }
      window.removeEventListener("counsellor-parent-unread-updated", onUnreadUpdated);
    };
  }, [refreshCounsellorUnreadFromApi]);

  useEffect(() => {
    const onPrivateMessage = (payload) => {
      const isInsideParentConsultation = currentPath?.startsWith("/counsellor/parent-consultation");
      if (isInsideParentConsultation) return;

      const merged = mergeCounsellorWsPayload(payload);
      const cid = pickConversationIdFromWsMerged(merged);
      if (cid == null || cid === "") return;

      const set = conversationIdsWithUnreadRef.current;
      if (set.has(cid)) return;
      set.add(cid);
      const next = Math.min(99, set.size);
      lastUnreadCountRef.current = next;
      setParentUnreadConversations(next);
      writeCounsellorUnreadConversations(next, { silent: true });
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

    const receiverMatchesCounsellor = (payload) => {
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

    const senderLooksLikeSelf = (payload) => {
      const merged = mergeCounsellorWsPayload(payload);
      // Không dùng username — trùng principal phiên TVV trên frame /user.
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

    const onWsMessage = (payload) => {
      const root = mergeCounsellorWsPayload(payload);
      if (!receiverMatchesCounsellor(root)) return;
      if (senderLooksLikeSelf(root)) return;
      onPrivateMessage(payload);
    };

    connectPrivateMessageSocket({ onMessage: onWsMessage });
    return () => {
      removePrivateMessageListener(onWsMessage);
    };
  }, [currentPath, identityLowerSet]);

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
      enqueueSnackbar("Lỗi đăng xuất", { variant: "error" });
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
            <Tooltip title="Tư vấn viên" placement="right">
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#2563eb",
                  letterSpacing: "-0.01em",
                  flexShrink: 0,
                }}
              >
                TV
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
                Tư vấn viên
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
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
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
                (item.path !== "/counsellor/dashboard" &&
                  currentPath.startsWith(item.path + "/"));

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
                      {item.path === "/counsellor/parent-consultation" && parentUnreadConversations > 0 ? (
                        <Badge
                          badgeContent={Math.min(99, parentUnreadConversations)}
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
            navigate("/counsellor/profile");
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
