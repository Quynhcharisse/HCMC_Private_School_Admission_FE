import React, {useState, useEffect} from "react";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Collapse,
    Container,
    Divider,
    Fab,
    Grid,
    IconButton,
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
import Fade from '@mui/material/Fade';
import {enqueueSnackbar} from "notistack";
import {signout, getProfile} from "../../services/AccountService.jsx";
import logo from "../../assets/logo.png";
import {useLocation} from "react-router-dom";

function MainHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const location = useLocation();
    const isHomePage = location.pathname === '/home' || location.pathname === '/';
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

    const handleMobileMenuToggle = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleUserMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
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
            window.location.href = '/login';
        } else {
            handleUserMenuClick(event);
        }
    };

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
    const profileBody = profileData?.body ? (typeof profileData.body === 'string' ? JSON.parse(profileData.body) : profileData.body) : null;
    const displayName = profileBody?.name || profileBody?.email || userInfo?.name || userInfo?.email || 'Người dùng';
    const displayEmail = profileBody?.email || userInfo?.email || '';
    const avatarUrl = profileBody?.picture || userInfo?.picture || null;

    return (
        <AppBar position="sticky" elevation={0}
                sx={{bgcolor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 1000}}>
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
                             onClick={() => window.location.href = "/home"}
                             sx={{
                                 cursor: "pointer",
                                 height: 50,
                                 width: 50,
                                 borderRadius: '50%',
                                 p: 1,
                                 boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                             }}
                        />
                        <Typography onClick={() => window.location.href = "/home"} variant="h5"
                                    sx={{cursor: "pointer", fontWeight: 800, color: '#1976d2', letterSpacing: 1}}>
                            EduBridgeHCM
                        </Typography>
                    </Box>
                    {!isHomePage && (
                        <Box sx={{display: {xs: 'none', md: 'flex'}, gap: 1}}>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    px: 2,
                                    '&:hover': {color: '#1976d2', bgcolor: 'rgba(25,118,210,0.1)'}
                                }}
                                onClick={() => window.location.href = '/home'}
                            >
                                Trang Chủ
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    px: 2,
                                    '&:hover': {color: '#1976d2', bgcolor: 'rgba(25,118,210,0.1)'}
                                }}
                                onClick={() => window.location.href = '/schools'}
                            >
                                Danh Sách Trường
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    px: 2,
                                    '&:hover': {color: '#1976d2', bgcolor: 'rgba(25,118,210,0.1)'}
                                }}
                                onClick={() => window.location.href = '/guide'}
                            >
                                Hướng Dẫn
                            </Button>
                            <Button
                                color="inherit"
                                sx={{
                                    fontWeight: 600,
                                    color: '#333',
                                    fontSize: 16,
                                    px: 2,
                                    '&:hover': {color: '#1976d2', bgcolor: 'rgba(25,118,210,0.1)'}
                                }}
                                onClick={() => window.location.href = '/about'}
                            >
                                Về Chúng Tôi
                            </Button>
                        </Box>
                    )}
                    <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', gap: 1}}>
                        {isSignedIn ? (
                            <>
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
                                                         userInfo.role === 'ADMIN' ? 'Quản trị viên' : userInfo.role}
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
                                                    window.location.href = '/student/dashboard';
                                                } else if (userInfo.role === 'SCHOOL') {
                                                    window.location.href = '/school/dashboard';
                                                } else if (userInfo.role === 'ADMIN') {
                                                    window.location.href = '/admin/dashboard';
                                                } else {
                                                    window.location.href = '/home';
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
                                {buttonText}
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
                            {!isHomePage && (
                                <>
                                    <ListItem onClick={() => window.location.href = '/home'}>
                                        <ListItemText primary="Trang Chủ" sx={{color: '#1976d2', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => window.location.href = '/schools'}>
                                        <ListItemText primary="Danh Sách Trường" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => window.location.href = '/guide'}>
                                        <ListItemText primary="Hướng Dẫn" sx={{color: '#333', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={() => window.location.href = '/about'}>
                                        <ListItemText primary="Về Chúng Tôi" sx={{color: '#333', fontWeight: 600}}/>
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
                                                         userInfo.role === 'ADMIN' ? 'Quản trị viên' : userInfo.role}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </ListItem>
                                    <Divider sx={{my: 1}}/>
                                    <ListItem 
                                        onClick={() => {
                                            if (userInfo) {
                                                if (userInfo.role === 'STUDENT') {
                                                    window.location.href = '/student/dashboard';
                                                } else if (userInfo.role === 'SCHOOL') {
                                                    window.location.href = '/school/dashboard';
                                                } else if (userInfo.role === 'ADMIN') {
                                                    window.location.href = '/admin/dashboard';
                                                } else {
                                                    window.location.href = '/home';
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

    React.useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleClick = () => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    return (
        <Fade in={visible}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1300,
                }}
            >
                <Fab color="primary" size="medium" onClick={handleClick} aria-label="scroll back to top">
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

