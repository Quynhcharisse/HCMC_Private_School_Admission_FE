import React, { useState } from "react";
import { Box, Drawer, Fade } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import AuthHeader from "../partials/AuthHeader.jsx";
import AdminSidebar from "../partials/AdminSidebar.jsx";

const DRAWER_WIDTH = 280;

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "#f8fafc"
      }}
    >
      <AuthHeader
        showSidebarToggle
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <Box sx={{ display: "flex", flex: 1, pt: "65px" }}>
        <Drawer
          variant="persistent"
          open={sidebarOpen}
          sx={{
            zIndex: 1000, // Thấp hơn AppBar (1100) để không đè lên header
            width: sidebarOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: "width 0.25s ease-in-out",
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "1px solid #e0e7ff",
              bgcolor: "white",
              height: "calc(100vh - 65px)",
              mt: "65px",
              zIndex: 1000,
              transition: "transform 0.25s ease-in-out, width 0.25s ease-in-out"
            }
          }}
        >
          <AdminSidebar currentPath={location.pathname} />
        </Drawer>

        <Fade in key={location.pathname} timeout={{ enter: 250, exit: 150 }}>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pt: 3,
              pb: 3,
              px: 3,
              minHeight: "calc(100vh - 65px)",
              bgcolor: "#f8fafc",
              overflow: "auto"
            }}
          >
            <Outlet />
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}