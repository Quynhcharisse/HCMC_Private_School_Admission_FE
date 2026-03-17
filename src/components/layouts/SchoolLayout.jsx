import React, { useState } from "react";
import { Box, Drawer, Fade } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import AuthHeader from "../partials/AuthHeader.jsx";
import SchoolSidebar from "../partials/SchoolSidebar.jsx";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_TRANSITION = "280ms cubic-bezier(0.4, 0, 0.2, 1)";

export default function SchoolLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const HEADER_HEIGHT = 65;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8fafc" }}>
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
            top: 0,
            mt: 0,
            zIndex: 1100,
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
        <AuthHeader
          logoAlignLeft
          headerLeftOffset={sidebarWidth}
        />
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
  );
}