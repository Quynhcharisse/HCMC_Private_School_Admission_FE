import React, { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Container,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { enqueueSnackbar } from "notistack";
import { getProfile, signout } from "../../../services/AccountService.jsx";
import logo from "../../../assets/logo.png";

/**
 * Header dành RIÊNG cho School.
 * Copy từ `src/components/partials/AuthHeader.jsx` để tránh thay đổi ở file chung ảnh hưởng School.
 */
export default function SchoolAuthHeader({ headerLeftOffset }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const isSignedIn = typeof window !== "undefined" && localStorage.getItem("user");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isSignedIn) return;
      try {
        const response = await getProfile();
        if (response && response.status === 200) setProfileData(response.data);
      } catch (error) {
        // giữ hành vi giống file chung: chỉ log
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [isSignedIn]);

  const handleUserMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleUserMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      const response = await signout();
      if (response && response.status === 200) {
        if (localStorage.length > 0) localStorage.clear();
        if (sessionStorage.length > 0) sessionStorage.clear();
        enqueueSnackbar("Đăng xuất thành công.", { variant: "success", autoHideDuration: 5000 });
        setTimeout(() => {
          window.location.href = "/home";
        }, 1000);
      } else {
        enqueueSnackbar("Không thể đăng xuất.", { variant: "error" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      enqueueSnackbar("Không thể đăng xuất.", { variant: "error" });
    }
  };

  const getUserInfo = () => {
    if (localStorage.getItem("user")) {
      try {
        return JSON.parse(localStorage.getItem("user"));
      } catch {
        return null;
      }
    }
    return null;
  };

  const userInfo = getUserInfo();
  const profileBody = profileData?.body
    ? typeof profileData.body === "string"
      ? JSON.parse(profileData.body)
      : profileData.body
    : null;

  const displayName =
    profileBody?.name || profileBody?.email || userInfo?.name || userInfo?.email || "Người dùng";
  const displayEmail = profileBody?.email || userInfo?.email || "";
  const avatarUrl = profileBody?.picture || userInfo?.picture || null;
  const isAdmin = userInfo?.role === "ADMIN";

  const handleGoHome = () => {
    // Với role ADMIN không cho click về /home từ logo
    if (isAdmin) return;
    window.location.href = "/home";
  };

  const isHeaderOverContentOnly = headerLeftOffset != null && headerLeftOffset !== undefined;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "white",
        borderBottom: "1px solid #e0e7ff",
        top: 0,
        ...(isHeaderOverContentOnly && { left: headerLeftOffset }),
        ...(!isHeaderOverContentOnly && { left: 0 }),
        right: 0,
        zIndex: 1100,
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          px: 2,
        }}
      >
        <Box
          sx={{
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: isAdmin ? "default" : "pointer",
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
                  borderRadius: "50%",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#2563eb",
                  letterSpacing: 0.5,
                }}
              >
                EduBridgeHCM
              </Typography>
            </Box>
          </Box>

          {isSignedIn && (
            <>
              <Box
                onClick={handleUserMenuClick}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "50%",
                  transition: "background 0.2s",
                  "&:hover": {
                    bgcolor: "rgba(25,118,210,0.08)",
                  },
                }}
              >
                <Avatar
                  src={avatarUrl}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#2563eb",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {!avatarUrl && displayName.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                disableScrollLock
                slotProps={{
                  paper: {
                    style: {
                      maxHeight: "80vh",
                      overflow: "visible",
                    },
                    sx: {
                      borderRadius: 2,
                      boxShadow: "0 6px 24px rgba(25, 118, 210, 0.15)",
                      minWidth: 250,
                      mt: 1,
                      p: 1,
                      bgcolor: "white",
                    },
                  },
                }}
                sx={{
                  "& .MuiPopover-paper": {
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(0,0,0,0.12)",
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={avatarUrl}
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#2563eb",
                      }}
                    >
                      {!avatarUrl && displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                        {displayName}
                      </Typography>
                      {displayEmail && (
                        <Typography sx={{ fontSize: 12, color: "#666" }}>
                          {displayEmail}
                        </Typography>
                      )}
                      {userInfo?.role && (
                        <Typography sx={{ fontSize: 11, color: "#2563eb", mt: 0.5 }}>
                          {userInfo.role === "STUDENT"
                            ? "Học sinh"
                            : userInfo.role === "SCHOOL"
                              ? "Trường học"
                              : userInfo.role === "ADMIN"
                                ? "Quản trị viên"
                                : userInfo.role === "COUNSELLOR"
                                  ? "Tư vấn viên"
                                  : userInfo.role}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    window.location.href = "/school/profile";
                  }}
                  sx={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#2563eb",
                    borderRadius: 1,
                    gap: 1.5,
                    mt: 0.5,
                    "&:hover": {
                      bgcolor: "rgba(59,130,246,0.08)",
                      color: "#2563eb",
                    },
                    transition: "background 0.2s, color 0.2s",
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
                    color: "#dc3545",
                    borderRadius: 1,
                    gap: 1.5,
                    mt: 0.5,
                    "&:hover": {
                      bgcolor: "rgba(220,53,69,0.08)",
                      color: "#c82333",
                    },
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <LogoutIcon sx={{ color: "#dc3545", fontSize: 20 }} /> Đăng Xuất
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Container>
    </AppBar>
  );
}
