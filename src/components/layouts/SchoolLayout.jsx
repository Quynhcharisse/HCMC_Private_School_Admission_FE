import React, { useState, useMemo, useEffect } from "react";
import { Box, Drawer, Fade } from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SchoolProvider } from "../../contexts/SchoolContext.jsx";
import SchoolAuthHeader from "../Page/school/SchoolAuthHeader.jsx";
import SchoolSidebar from "../partials/SchoolSidebar.jsx";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_TRANSITION = "280ms cubic-bezier(0.4, 0, 0.2, 1)";

/** Phông chữ dùng cho toàn bộ trang School (sidebar + nội dung) */
const SCHOOL_FONT = '"Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif';

export default function SchoolLayout() {
  const baseTheme = useTheme();
  const schoolTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        typography: {
          ...baseTheme.typography,
          fontFamily: SCHOOL_FONT,
          allVariants: { fontFamily: SCHOOL_FONT },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { fontFamily: SCHOOL_FONT },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              root: { fontFamily: SCHOOL_FONT },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: { fontFamily: SCHOOL_FONT },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: { fontFamily: SCHOOL_FONT },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { fontFamily: SCHOOL_FONT },
            },
          },
        },
      }),
    [baseTheme]
  );

  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const HEADER_HEIGHT = 65;

  const toBoolean = (value) => value === true || value === "true" || value === 1 || value === "1";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed?.role === "SCHOOL" && toBoolean(parsed?.firstLogin)) {
        if (location.pathname !== "/school/profile") {
          navigate("/school/profile", { replace: true });
        }
      }
    } catch {
      /* ignore */
    }
  }, [location.pathname, navigate]);

  return (
    <ThemeProvider theme={schoolTheme}>
      <SchoolProvider>
        <Box
          sx={{
            display: "flex",
            minHeight: "100vh",
            bgcolor: "#f8fafc",
            fontFamily: SCHOOL_FONT,
          }}
        >
        {/* Sidebar: full height bên trái */}
        <Drawer
        variant="persistent"
        open
        sx={{
          zIndex: 1100,
          width: sidebarWidth,
          flexShrink: 0,
          transition: `width ${SIDEBAR_WIDTH_TRANSITION}`,
          "& .MuiDrawer-paper": {
            width: sidebarWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e5e7eb",
            bgcolor: "#ffffff",
            height: "100vh",
            minHeight: "100vh",
            top: 0,
            mt: 0,
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: `width ${SIDEBAR_WIDTH_TRANSITION}`,
            boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
          },
        }}
      >
        <SchoolSidebar
          currentPath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </Drawer>

      {/* Vùng header + content: bằng với nội dung dashboard */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <SchoolAuthHeader headerLeftOffset={sidebarWidth} />
        <Fade in key={location.pathname} timeout={{ enter: 250, exit: 150 }}>
          <Box
            component="main"
            sx={{
              flex: 1,
              pt: 3,
              pb: 3,
              px: 3,
              mt: `${HEADER_HEIGHT}px`,
              minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
              bgcolor: "#f8fafc",
              overflow: "auto",
            }}
          >
            <Outlet />
          </Box>
        </Fade>
      </Box>
    </Box>
      </SchoolProvider>
    </ThemeProvider>
  );
}