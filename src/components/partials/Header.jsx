import React, {useState} from "react";
import {
    AppBar,
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
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Fade from '@mui/material/Fade';
import {enqueueSnackbar} from "notistack";
import {signout} from "../../services/AccountService.jsx";
import logo from "../../assets/logo.jpg";

function TopBar() {
    const handleRegisterClick = () => {
        window.location.href = '/register';
    };

    return (
        <Box sx={{
            width: '100%',
            bgcolor: '#1976d2',
            color: 'white',
            fontSize: 14,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Container maxWidth={false} sx={{
                px: {xs: 2, md: 8},
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 3}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                        <EmailIcon sx={{fontSize: 16, color: 'rgba(255,255,255,0.9)'}}/>
                        <Typography sx={{color: 'rgba(255,255,255,0.9)'}}>admission@hcmhighschool.edu.vn</Typography>
                    </Box>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                        <PhoneIcon sx={{fontSize: 16, color: 'rgba(255,255,255,0.9)'}}/>
                        <Typography
                            onClick={() => window.open("https://zalo.me/0839674767", "_blank")}
                            sx={{color: 'rgba(255,255,255,0.9)', '&:hover': {cursor: 'pointer'}}}>
                            0839-674-767
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                            fontSize: 12,
                            px: 2,
                            '&:hover': {borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)'}
                        }}
                        onClick={handleRegisterClick}
                    >
                        Đăng Ký Tư Vấn
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}

function MainHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

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

    const isSignedIn = typeof window !== 'undefined' && localStorage.getItem('user');
    const buttonText = isSignedIn ? 'Khám Phá' : 'Đăng Nhập';

    const handleButtonClick = (event) => {
        if (!isSignedIn) {
            window.location.href = '/login';
        } else {
            handleUserMenuClick(event);
        }
    };

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
                    <Box sx={{position: 'relative'}}>
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

                        {isSignedIn && (
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
                                            minWidth: 200,
                                            mt: 1,
                                            p: 0.5,
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
                                <MenuItem
                                    onClick={() => {
                                        handleUserMenuClose();
                                        if (localStorage.getItem('user')) {
                                            const user = JSON.parse(localStorage.getItem('user'))
                                            if (user.role === 'STUDENT') {
                                                window.location.href = '/student/dashboard';
                                            } else if (user.role === 'SCHOOL') {
                                                window.location.href = '/school/dashboard';
                                            } else if (user.role === 'ADMIN') {
                                                window.location.href = '/admin/dashboard';
                                            } else {
                                                window.location.href = '/home';
                                            }
                                        }

                                    }}
                                    sx={{
                                        fontSize: 16,
                                        fontWeight: 500,
                                        color: '#1976d2',
                                        borderRadius: 1,
                                        gap: 1.5,
                                        '&:hover': {
                                            bgcolor: 'rgba(25,118,210,0.08)',
                                            color: '#1565c0',
                                        },
                                        transition: 'background 0.2s, color 0.2s',
                                    }}
                                >
                                    <DashboardIcon sx={{color: '#1976d2', mr: 1}}/> Bảng Điều Khiển
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        handleUserMenuClose();
                                        handleLogout();
                                    }}
                                    sx={{
                                        fontSize: 16,
                                        fontWeight: 500,
                                        color: '#dc3545',
                                        borderRadius: 1,
                                        gap: 1.5,
                                        '&:hover': {
                                            bgcolor: 'rgba(220,53,69,0.08)',
                                            color: '#c82333',
                                        },
                                        transition: 'background 0.2s, color 0.2s',
                                    }}
                                >
                                    <LogoutIcon sx={{color: '#dc3545', mr: 1}}/> Đăng Xuất
                                </MenuItem>
                            </Menu>
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
                            {isSignedIn && (
                                <>
                                    <Divider sx={{my: 1}}/>
                                    <ListItem onClick={() => window.location.href = '/student/dashboard'}>
                                        <ListItemText primary="Bảng Điều Khiển"
                                                      sx={{color: '#1976d2', fontWeight: 600}}/>
                                    </ListItem>
                                    <ListItem onClick={handleLogout}>
                                        <ListItemText primary="Đăng Xuất" sx={{color: '#dc3545', fontWeight: 600}}/>
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
            <TopBar/>
            <MainHeader/>
        </>
    );
}

