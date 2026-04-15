import React, { useMemo, useState } from "react";
import { Box, Drawer, Fade } from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import { Outlet, useLocation } from "react-router-dom";
import CounsellorAuthHeader from "../Page/counsellor/CounsellorAuthHeader.jsx";
import CounsellorSidebar from "../partials/CounsellorSidebar.jsx";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_TRANSITION = "280ms cubic-bezier(0.4, 0, 0.2, 1)";
const COUNSELLOR_FONT = '"Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif';

export default function CounsellorLayout() {
  const baseTheme = useTheme();
  const counsellorTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        typography: {
          ...baseTheme.typography,
          fontFamily: COUNSELLOR_FONT,
          allVariants: { fontFamily: COUNSELLOR_FONT },
        },
      }),
    [baseTheme]
  );

  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const HEADER_HEIGHT = 65;

  return (
    <ThemeProvider theme={counsellorTheme}>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "#f8fafc",
          fontFamily: COUNSELLOR_FONT,
        }}
      >
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
          <CounsellorSidebar
            currentPath={location.pathname}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
        </Drawer>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <CounsellorAuthHeader headerLeftOffset={sidebarWidth} />
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
    </ThemeProvider>
  );
}
