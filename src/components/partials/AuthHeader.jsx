import React, {useState, useEffect} from "react";
import {
    AppBar,
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    Typography
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import {enqueueSnackbar} from "notistack";
import {signout, getProfile} from "../../services/AccountService.jsx";
import {
    clearNotificationUnreadCount,
    getNotificationsForUser,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    readNotificationUnreadCount,
    refreshNotificationInboxForUser,
    watchNotificationList,
    watchNotificationUnread
} from "../../services/NotificationService.jsx";
import { ROLE_SHELL_HEADER_HEIGHT_PX } from "../../constants/appShellLayout.js";
import {
    APP_PRIMARY_DARK,
    BRAND_NAVY,
} from "../../constants/homeLandingTheme";
import logo from "../../assets/logo.png";

export default function AuthHeader({showSidebarToggle = false, onToggleSidebar, logoAlignLeft = false, headerLeftOffset}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [notificationItems, setNotificationItems] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const isSignedIn = typeof window !== 'undefined' && localStorage.getItem('user');

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

    const countUnreadNotifications = (items = []) =>
        items.reduce((acc, row) => acc + (row?.read ? 0 : 1), 0);

    const formatNotificationTime = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const now = new Date();
        const sameDate = date.toDateString() === now.toDateString();
        if (sameDate) {
            return `Hôm nay, ${date.toLocaleTimeString("vi-VN", {hour: "2-digit", minute: "2-digit"})}`;
        }
        return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                enqueueSnackbar('Đăng xuất thành công.', {variant: 'success', autoHideDuration: 5000});
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

    const handleUserMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => setAnchorEl(null);

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
    const profileBody = profileData?.body
        ? typeof profileData.body === 'string'
            ? (() => {
                  try {
                      return JSON.parse(profileData.body);
                  } catch {
                      return null;
                  }
              })()
            : profileData.body
        : null;
    const displayName =
        profileBody?.name ||
        profileBody?.fullName ||
        profileBody?.parent?.name ||
        userInfo?.name ||
        userInfo?.fullName ||
        'Người dùng';
    const displayEmail = profileBody?.email || userInfo?.email || '';
    const avatarUrl = profileBody?.picture || userInfo?.picture || null;
    const isLogoHomeNavigationDisabled =
        userInfo?.role === 'COUNSELLOR' || userInfo?.role === 'SCHOOL';

    const handleGoHome = () => {
        if (isLogoHomeNavigationDisabled) return;
        window.location.href = '/home';
    };

    const isHeaderOverContentOnly = headerLeftOffset != null && headerLeftOffset !== undefined;

    useEffect(() => {
        if (!isSignedIn || !userInfo?.email) {
            setNotificationUnreadCount(0);
            setNotificationItems([]);
            return undefined;
        }
        setNotificationUnreadCount(readNotificationUnreadCount());
        setNotificationItems(getNotificationsForUser(userInfo));
        const stopUnreadWatch = watchNotificationUnread((count) => {
            setNotificationUnreadCount(count);
        });
        const stopListWatch = watchNotificationList((items) => {
            setNotificationItems(items);
        }, userInfo);
        refreshNotificationInboxForUser(userInfo).catch(() => {});
        const timerId = window.setInterval(() => {
            refreshNotificationInboxForUser(userInfo).catch(() => {});
        }, 20000);
        return () => {
            window.clearInterval(timerId);
            stopUnreadWatch?.();
            stopListWatch?.();
        };
    }, [isSignedIn, userInfo?.email]);

    const handleNotificationClick = (event) => {
        setNotificationAnchorEl(event.currentTarget);
        refreshNotificationInboxForUser(userInfo).catch(() => {});
    };

    const handleNotificationClose = () => setNotificationAnchorEl(null);

    const handleMarkAllNotificationsRead = () => {
        setNotificationItems((prev) => prev.map((item) => ({...item, read: true})));
        setNotificationUnreadCount(0);
        clearNotificationUnreadCount();
        markAllNotificationsAsRead(userInfo)
            .finally(() => refreshNotificationInboxForUser(userInfo).catch(() => {}));
    };

    const handleNotificationItemClick = (item) => {
        const route = String(item?.route || '/posts').trim();
        if (item?.id) {
            setNotificationItems((prev) => {
                let changed = false;
                const next = prev.map((row) => {
                    if (row?.id !== item.id) return row;
                    if (row?.read) return row;
                    changed = true;
                    return {...row, read: true};
                });
                if (changed) {
                    const unreadCount = Math.min(99, countUnreadNotifications(next));
                    setNotificationUnreadCount(unreadCount);
                    if (unreadCount === 0) {
                        clearNotificationUnreadCount();
                    }
                }
                return next;
            });
            markNotificationAsRead({notificationId: item.id, user: userInfo})
                .finally(() => refreshNotificationInboxForUser(userInfo).catch(() => {}));
        }
        handleNotificationClose();
        if (route.startsWith('/')) window.location.assign(route);
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                bgcolor: 'white',
                borderBottom: '1px solid #e0e7ff',
                top: 0,
                height: ROLE_SHELL_HEADER_HEIGHT_PX,
                minHeight: ROLE_SHELL_HEADER_HEIGHT_PX,
                maxHeight: ROLE_SHELL_HEADER_HEIGHT_PX,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                ...(isHeaderOverContentOnly && { left: headerLeftOffset }),
                ...(!isHeaderOverContentOnly && { left: 0 }),
                right: 0,
                zIndex: 1100,
            }}
        >
            <Container
                maxWidth={false}
                sx={{
                    px: isHeaderOverContentOnly ? 3 : (logoAlignLeft ? 2 : { xs: 2, md: 8 }),
                    height: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: 0,
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: 0,
                        position: 'relative',
                        py: 0,
                    }}
                >
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1, pr: isHeaderOverContentOnly ? 12 : 0}}>
                        {showSidebarToggle && !isHeaderOverContentOnly && (
                            <IconButton
                                edge="start"
                                color="inherit"
                                onClick={onToggleSidebar}
                                sx={{
                                    ...(logoAlignLeft && { ml: 1 }),
                                    mr: 1,
                                    color: '#1e293b',
                                    bgcolor: 'rgba(51,65,85,0.04)',
                                    '&:hover': {
                                        bgcolor: 'rgba(51,65,85,0.08)',
                                    },
                                }}
                            >
                                <MenuIcon/>
                            </IconButton>
                        )}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                cursor: isLogoHomeNavigationDisabled ? 'default' : 'pointer',
                                minWidth: 0,
                            }}
                            onClick={handleGoHome}
                        >
                            <Box
                                component="img"
                                src={logo}
                                alt="EduBridgeHCM"
                                sx={{
                                    height: 40,
                                    width: 40,
                                    borderRadius: '50%',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                }}
                            />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    color: '#2563eb',
                                    letterSpacing: 0.5,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                EduBridgeHCM
                            </Typography>
                        </Box>
                    </Box>

                    {(isSignedIn || isHeaderOverContentOnly) && (
                        <>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flexShrink: 0,
                                    ...(!isHeaderOverContentOnly && {
                                        ml: "auto",
                                    }),
                                    ...(isHeaderOverContentOnly && {
                                        position: "fixed",
                                        top: 12,
                                        right: 24,
                                        zIndex: 1201,
                                    }),
                                }}
                            >
                                <Badge
                                    badgeContent={Math.min(99, notificationUnreadCount)}
                                    color="error"
                                    overlap="circular"
                                    invisible={notificationUnreadCount === 0}
                                    sx={{
                                        mr: 0.5,
                                        '& .MuiBadge-badge': {
                                            fontSize: 11,
                                            fontWeight: 700,
                                            minWidth: 18,
                                            height: 18,
                                            borderRadius: 9
                                        }
                                    }}
                                >
                                    <IconButton
                                        onClick={handleNotificationClick}
                                        aria-label="Thông báo"
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
                                        <NotificationsNoneRoundedIcon sx={{fontSize: 22}}/>
                                    </IconButton>
                                </Badge>
                                <Menu
                                    anchorEl={notificationAnchorEl}
                                    open={Boolean(notificationAnchorEl)}
                                    onClose={handleNotificationClose}
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                                    transformOrigin={{vertical: 'top', horizontal: 'right'}}
                                    disableScrollLock={true}
                                    slotProps={{
                                        paper: {
                                            sx: {
                                                borderRadius: 3,
                                                border: '1px solid rgba(59,130,246,0.18)',
                                                boxShadow: '0 22px 48px rgba(51,65,85,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset',
                                                width: 380,
                                                maxWidth: 'calc(100vw - 24px)',
                                                mt: 1.2,
                                                p: 0,
                                                overflow: 'hidden',
                                                backdropFilter: 'blur(10px)',
                                                bgcolor: 'rgba(255,255,255,0.97)'
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{px: 2, py: 1.5, borderBottom: '1px solid rgba(59,130,246,0.1)', bgcolor: 'rgba(248,250,252,0.95)'}}>
                                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Box>
                                                <Typography sx={{fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1.1}}>
                                                    Thông báo
                                                </Typography>
                                                <Typography sx={{fontSize: 13, color: '#64748b', mt: 0.5}}>
                                                    {countUnreadNotifications(notificationItems) > 0
                                                        ? `${countUnreadNotifications(notificationItems)} thông báo chưa đọc`
                                                        : "Bạn đã đọc hết thông báo"}
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                onClick={handleMarkAllNotificationsRead}
                                                disabled={countUnreadNotifications(notificationItems) === 0}
                                                sx={{textTransform: 'none', fontWeight: 700, borderRadius: 999}}
                                            >
                                                Đánh dấu đã đọc
                                            </Button>
                                        </Box>
                                    </Box>
                                    <List sx={{p: 0, maxHeight: 420, overflowY: 'auto'}}>
                                        {notificationItems.length === 0 ? (
                                            <ListItem>
                                                <ListItemText
                                                    primary="Chưa có thông báo"
                                                    secondary="Thông báo mới sẽ hiện tại đây."
                                                />
                                            </ListItem>
                                        ) : notificationItems.map((item) => (
                                            <ListItemButton
                                                key={item.id}
                                                onClick={() => handleNotificationItemClick(item)}
                                                sx={{
                                                    alignItems: 'flex-start',
                                                    gap: 1.25,
                                                    py: 1.5,
                                                    px: 2,
                                                    borderBottom: '1px solid rgba(226,232,240,0.8)',
                                                    bgcolor: item.read ? 'transparent' : 'rgba(59,130,246,0.06)',
                                                    borderLeft: item.read ? '3px solid transparent' : '3px solid #2563eb',
                                                    '&:hover': {
                                                        bgcolor: item.read ? 'rgba(148,163,184,0.08)' : 'rgba(59,130,246,0.12)'
                                                    }
                                                }}
                                            >
                                                <Avatar
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: 'rgba(37,99,235,0.12)',
                                                        color: '#1d4ed8',
                                                        fontWeight: 800
                                                    }}
                                                >
                                                    <NotificationsNoneRoundedIcon fontSize="small"/>
                                                </Avatar>
                                                <Box sx={{minWidth: 0, flex: 1}}>
                                                    <Typography sx={{
                                                        fontSize: 16,
                                                        fontWeight: item.read ? 700 : 800,
                                                        color: '#0b1220',
                                                        lineHeight: 1.3,
                                                        mb: 0.35
                                                    }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography sx={{
                                                        fontSize: 13.5,
                                                        fontWeight: 400,
                                                        color: '#1e293b',
                                                        lineHeight: 1.45
                                                    }}>
                                                        {item.body}
                                                    </Typography>
                                                    <Typography sx={{fontSize: 12, color: '#64748b', mt: 0.75}}>
                                                        {formatNotificationTime(item.createdAt)}
                                                    </Typography>
                                                </Box>
                                                {!item.read && (
                                                    <Box
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            bgcolor: '#3b82f6',
                                                            mt: 1
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Menu>
                                {(headerLeftOffset == null || headerLeftOffset === undefined) && (
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
                                            imgProps={{referrerPolicy: 'no-referrer'}}
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                bgcolor: '#2563eb',
                                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                                            }}
                                        >
                                            {!avatarUrl && (displayName.charAt(0).toUpperCase())}
                                        </Avatar>
                                    </Box>
                                )}
                            </Box>
                            {(headerLeftOffset == null || headerLeftOffset === undefined) && (
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
                                                    bgcolor: '#2563eb'
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
                                                    <Typography sx={{fontSize: 11, color: '#2563eb', mt: 0.5}}>
                                                        {userInfo.role === 'STUDENT'
                                                            ? 'Học sinh'
                                                            : userInfo.role === 'SCHOOL'
                                                            ? 'Trường học'
                                                            : userInfo.role === 'ADMIN'
                                                            ? 'Quản trị viên'
                                                            : userInfo.role === 'COUNSELLOR'
                                                            ? 'Tư vấn viên'
                                                            : userInfo.role === 'PARENT'
                                                            ? 'Phụ huynh'
                                                            : userInfo.role}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <MenuItem
                                        onClick={() => {
                                            handleUserMenuClose();
                                            if (userInfo) {
                                                if (userInfo.role === 'STUDENT') {
                                                    window.location.href = '/student/profile';
                                                } else if (userInfo.role === 'SCHOOL') {
                                                    window.location.href = '/school/profile';
                                                } else if (userInfo.role === 'ADMIN') {
                                                    window.location.href = '/admin/profile';
                                                } else if (userInfo.role === 'COUNSELLOR') {
                                                    window.location.href = '/counsellor/profile';
                                                } else if (userInfo.role === 'PARENT') {
                                                    window.location.href = '/parent/profile';
                                                } else {
                                                    window.location.href = '/home';
                                                }
                                            }
                                        }}
                                        sx={{
                                            fontSize: 15,
                                            fontWeight: 500,
                                            color: '#2563eb',
                                            borderRadius: 1,
                                            gap: 1.5,
                                            mt: 0.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(59,130,246,0.08)',
                                                color: '#2563eb',
                                            },
                                            transition: 'background 0.2s, color 0.2s',
                                        }}
                                    >
                                        Hồ sơ cá nhân
                                    </MenuItem>
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
                            )}
                        </>
                    )}
                </Box>
            </Container>
        </AppBar>
    );
}

