import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import SchoolIcon from "@mui/icons-material/School";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import CategoryIcon from "@mui/icons-material/Category";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageNotSupportedOutlinedIcon from "@mui/icons-material/ImageNotSupportedOutlined";
import { enqueueSnackbar } from "notistack";
import {
  getSchoolCampusConfigList,
  parseSchoolCampusConfigListBody,
  schoolCampusListRowPolicyText,
} from "../../../services/SchoolFacilityService.jsx";

function facilityCoverUrl(imageData) {
  if (!imageData || typeof imageData !== "object") return "";
  const c =
    imageData.coverUrl ??
    imageData.cover ??
    imageData.thumbnailUrl ??
    imageData.thumbnail ??
    "";
  return typeof c === "string" && c.trim() ? c.trim() : "";
}

function normalizeFacilityMatchKey(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Bản ghi ảnh từ `imageData.imageList` (có thể có `facilityCode` nếu BE gửi). */
function facilityImageRecords(imageData) {
  if (!imageData || typeof imageData !== "object") return [];
  const list = Array.isArray(imageData.imageList) ? imageData.imageList : [];
  return list
    .map((im, i) => {
      const url = im?.url != null && String(im.url).trim() !== "" ? String(im.url).trim() : "";
      if (!url) return null;
      const name = im?.name != null ? String(im.name) : "";
      const altName = im?.altName != null ? String(im.altName) : "";
      const facilityCode = im?.facilityCode != null ? String(im.facilityCode).trim() : "";
      const displayAlt = (altName || name || `Ảnh ${i + 1}`).trim();
      return {url, name, altName, facilityCode, displayAlt, sourceIndex: i};
    })
    .filter(Boolean);
}

/** Các ảnh trong `imageData.imageList` — giữ cho tương thích / fallback ảnh chính. */
function facilityImageEntries(imageData) {
  return facilityImageRecords(imageData).map((r) => ({
    url: r.url,
    name: r.name,
    altName: r.displayAlt,
  }));
}

/**
 * Mỗi phần tử `itemList` ↔ một ảnh trong `imageList`: ưu tiên facilityCode, rồi tên/altName,
 * cuối cùng cùng chỉ số (dữ liệu song song như mẫu BE).
 */
function pairFacilityItemsWithImages(itemList, imageData) {
  const items = Array.isArray(itemList) ? itemList : [];
  const entries = facilityImageRecords(imageData);
  const used = new Set();
  const out = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemCode = item?.facilityCode != null ? String(item.facilityCode).trim() : "";
    const nameKey = normalizeFacilityMatchKey(item?.name);
    const itemLabel = item?.name != null ? String(item.name).trim() : "";

    let pick = -1;

    for (let j = 0; j < entries.length; j++) {
      if (used.has(j)) continue;
      const e = entries[j];
      if (
        itemCode &&
        e.facilityCode &&
        normalizeFacilityMatchKey(e.facilityCode) === normalizeFacilityMatchKey(itemCode)
      ) {
        pick = j;
        break;
      }
    }

    if (pick < 0 && nameKey) {
      for (let j = 0; j < entries.length; j++) {
        if (used.has(j)) continue;
        const e = entries[j];
        const nkName = normalizeFacilityMatchKey(e.name);
        const nkAlt = normalizeFacilityMatchKey(e.altName);
        if (nameKey === nkName || nameKey === nkAlt) {
          pick = j;
          break;
        }
      }
    }

    if (pick < 0 && i < entries.length && !used.has(i)) {
      pick = i;
    }

    if (pick >= 0) {
      used.add(pick);
      const e = entries[pick];
      out.push({imageUrl: e.url, imageAlt: e.displayAlt});
    } else {
      out.push({imageUrl: "", imageAlt: itemLabel || "Hạng mục CSVC"});
    }
  }

  return out;
}

/** Ảnh lớn phía trên: ưu tiên bìa; không có thì ảnh đầu trong danh sách. */
function facilityPrimaryImageUrl(imageData) {
  const cover = facilityCoverUrl(imageData);
  if (cover) return cover;
  const first = facilityImageEntries(imageData)[0];
  return first?.url || "";
}

function displayCampusConfigName(name, fallbackIndex) {
  const raw = name != null && String(name).trim() !== "" ? String(name).trim() : "";
  if (!raw) return `Cơ sở ${fallbackIndex + 1}`;
  return raw;
}

function CategoryFacilityIcon({ category }) {
  const s = String(category || "").toLowerCase();
  const sx = { fontSize: 28, color: "#0D64DE" };
  if (s.includes("học") || s.includes("learning") || s.includes("academic")) {
    return <SchoolIcon sx={sx} />;
  }
  if (s.includes("thể") || s.includes("sport")) {
    return <SportsEsportsIcon sx={sx} />;
  }
  if (s.includes("ăn") || s.includes("food") || s.includes("canteen")) {
    return <RestaurantIcon sx={sx} />;
  }
  if (s.includes("y tế") || s.includes("health") || s.includes("medical")) {
    return <LocalHospitalIcon sx={sx} />;
  }
  if (s.includes("phòng") || s.includes("room") || s.includes("hall")) {
    return <MeetingRoomIcon sx={sx} />;
  }
  return <CategoryIcon sx={sx} />;
}

function FacilitySkeletonBlock() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        bgcolor: "white",
        overflow: "hidden",
      }}
    >
      <Skeleton
        variant="rectangular"
        sx={{ width: "100%", height: { xs: 200, sm: 250, md: 285 }, borderRadius: "12px" }}
      />
      <CardContent sx={{ p: 3 }}>
        <Skeleton width="40%" height={28} sx={{ mb: 2 }} />
        <Skeleton width="100%" />
        <Skeleton width="92%" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2, mt: 3 }}>
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function PolicySkeleton() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        bgcolor: "white",
        p: 3,
      }}
    >
      <Skeleton width="55%" height={26} sx={{ mb: 2 }} />
      <Skeleton width="100%" />
      <Skeleton width="100%" />
      <Skeleton width="88%" />
    </Card>
  );
}

function EmptyFacilitiesCard() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        bgcolor: "white",
        p: 4,
        textAlign: "center",
      }}
    >
      <ImageNotSupportedOutlinedIcon sx={{ fontSize: 56, color: "#cbd5e1", mb: 1.5 }} />
      <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
        Chưa có cấu hình cơ sở vật chất
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
        Cơ sở này chưa có dữ liệu CSVC.
      </Typography>
    </Card>
  );
}

function EmptyPolicyBlock() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1px dashed #e2e8f0",
        bgcolor: "#fafafa",
        p: 4,
        textAlign: "center",
      }}
    >
      <DescriptionOutlinedIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1.5 }} />
      <Typography sx={{ fontSize: "1rem", fontWeight: 500, color: "#64748b" }}>
        Chưa có thông tin chính sách
      </Typography>
    </Card>
  );
}

function BothEmptyState() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        bgcolor: "white",
        p: 5,
        textAlign: "center",
        maxWidth: 480,
        mx: "auto",
        mt: 2,
      }}
    >
      <CorporateFareIllustration />
      <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e293b", mt: 2 }}>
        Chưa có cấu hình cho cơ sở này
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>
        Phần cơ sở vật chất và chính sách vận hành chưa được thiết lập.
      </Typography>
    </Card>
  );
}

function CorporateFareIllustration() {
  return (
    <Box
      sx={{
        width: 88,
        height: 88,
        borderRadius: "20px",
        bgcolor: "rgba(13, 100, 222, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mx: "auto",
      }}
    >
      <Typography component="span" sx={{ fontSize: 40 }}>
        🏫
      </Typography>
    </Box>
  );
}

export default function SchoolCampusConfigOverview() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [tabIndex, setTabIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? rows : rows.filter((r) => String(r?.campusName || "").toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => {
    if (tabIndex >= filtered.length) {
      setTabIndex(0);
    }
  }, [filtered.length, tabIndex]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSchoolCampusConfigList();
      if (res?.status !== 200) {
        throw new Error(res?.data?.message || "Yêu cầu thất bại");
      }
      setRows(parseSchoolCampusConfigListBody(res));
    } catch (e) {
      console.error(e);
      enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được danh sách cấu hình cơ sở.", {
        variant: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = filtered[tabIndex] || null;
  const facilityConfig = active?.facilityConfig && typeof active.facilityConfig === "object" ? active.facilityConfig : null;
  const itemList = Array.isArray(facilityConfig?.itemList) ? facilityConfig.itemList : [];
  const overviewText =
    facilityConfig?.overview != null && String(facilityConfig.overview).trim() !== ""
      ? String(facilityConfig.overview)
      : null;
  const facilityImageData =
    facilityConfig?.imageData && typeof facilityConfig.imageData === "object" ? facilityConfig.imageData : null;
  const cover = facilityPrimaryImageUrl(facilityImageData);
  const facilityItemImages = useMemo(() => {
    const cfg = active?.facilityConfig;
    if (!cfg || typeof cfg !== "object") return [];
    const items = Array.isArray(cfg.itemList) ? cfg.itemList : [];
    const img = cfg.imageData && typeof cfg.imageData === "object" ? cfg.imageData : null;
    return pairFacilityItemsWithImages(items, img);
  }, [active?.facilityConfig]);
  const policyDetail = schoolCampusListRowPolicyText(active);
  const bothEmpty = !facilityConfig && !policyDetail;

  const campaignsTabSx = {
    minHeight: 48,
    "& .MuiTabs-flexContainer": {
      gap: 0.5,
    },
    "& .MuiTab-root": {
      minHeight: 48,
      px: 2,
      py: 1,
      textTransform: "none",
      fontSize: "0.9375rem",
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      color: "#64748b",
      fontWeight: 500,
      borderRadius: "8px",
      transition: "all 0.2s ease",
      "&:hover": {
        color: "#334155",
        bgcolor: "rgba(148, 163, 184, 0.12)",
      },
      "&.Mui-selected": {
        color: "#0D64DE",
        fontWeight: 700,
      },
    },
    "& .MuiTabs-indicator": {
      height: 3,
      borderRadius: "3px 3px 0 0",
      bgcolor: "#0D64DE",
      transition: "all 0.2s ease",
    },
  };

  const gradientHeader = (
    <Box
      sx={{
        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
        borderRadius: 3,
        p: 3,
        color: "white",
        boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            Danh sách cấu hình
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
            Xem nhanh cơ sở vật chất và chính sách vận hành từng cơ sở
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  const mainCardShell = (children) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
        bgcolor: "#fff",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <CorporateFareOutlinedIcon sx={{ color: "#0D64DE", fontSize: 28, mt: 0.25 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
            Danh sách theo cơ sở
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            Chọn cơ sở hoặc lọc theo tên.
          </Typography>
        </Box>
      </Box>
      {children}
    </Card>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        pb: 4,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {gradientHeader}

      {loading ? (
        mainCardShell(
          <>
            <Box sx={{ px: 2.5 }}>
              <Skeleton variant="rounded" width="100%" height={48} sx={{ borderRadius: 2 }} />
            </Box>
            <Divider sx={{ borderColor: "#e2e8f0" }} />
            <CardContent sx={{ p: 2.5, pb: 2 }}>
              <Skeleton variant="rounded" height={40} sx={{ borderRadius: "12px", maxWidth: 280 }} />
            </CardContent>
            <Box sx={{ px: 2.5, pb: 3, display: "flex", flexDirection: "column", gap: 3 }}>
              <FacilitySkeletonBlock />
              <PolicySkeleton />
            </Box>
          </>
        )
      ) : filtered.length === 0 ? (
        mainCardShell(
          <>
            <CardContent sx={{ p: 2.5, pb: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  placeholder="Tìm theo tên cơ sở..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    maxWidth: { md: 280 },
                    "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#f8fafc" },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#64748b" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </CardContent>
            <Box sx={{ borderTop: "1px solid #e2e8f0", py: 8, px: 3, textAlign: "center" }}>
              <CorporateFareOutlinedIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
              <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 600, mt: 1.5 }}>
                {rows.length === 0 ? "Chưa có dữ liệu cơ sở" : "Không có cơ sở phù hợp"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
                {rows.length === 0
                  ? "Danh sách cấu hình cơ sở trống."
                  : "Thử từ khóa tìm kiếm khác."}
              </Typography>
            </Box>
          </>
        )
      ) : (
        mainCardShell(
          <>
            <Box sx={{ px: 2.5 }}>
              <Tabs
                value={Math.min(tabIndex, Math.max(filtered.length - 1, 0))}
                onChange={(_, v) => setTabIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={campaignsTabSx}
              >
                {filtered.map((c, i) => (
                  <Tab
                    key={c.campusId ?? i}
                    label={displayCampusConfigName(c.campusName ?? c.campus_name, i)}
                  />
                ))}
              </Tabs>
            </Box>

            <Divider sx={{ borderColor: "#e2e8f0" }} />

            <CardContent sx={{ p: 2.5, pb: 2 }}>
              <TextField
                placeholder="Tìm theo tên cơ sở..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  maxWidth: { md: 280 },
                  "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#f8fafc" },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#64748b" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>

            <Box
              sx={{
                borderTop: "1px solid #e2e8f0",
                p: 2.5,
                display: "flex",
                flexDirection: "column",
                gap: 3,
                animation: "fadeIn 0.28s ease",
                "@keyframes fadeIn": {
                  from: { opacity: 0, transform: "translateY(6px)" },
                  to: { opacity: 1, transform: "translateY(0)" },
                },
              }}
            >
            {bothEmpty ? (
              <BothEmptyState />
            ) : (
              <>
                {facilityConfig ? (
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: "16px",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                      bgcolor: "white",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: { xs: 200, sm: 250, md: 285 },
                        borderRadius: "12px",
                        overflow: "hidden",
                        bgcolor: "#f1f5f9",
                      }}
                    >
                      {cover ? (
                        <Box
                          component="img"
                          src={cover}
                          alt="Ảnh bìa cơ sở vật chất"
                          loading="lazy"
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: 1,
                            color: "#94a3b8",
                          }}
                        >
                          <ImageNotSupportedOutlinedIcon sx={{ fontSize: 48 }} />
                          <Typography variant="body2">Chưa có ảnh bìa / thư viện ảnh</Typography>
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                      <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", mb: 1.5 }}>
                        Tổng quan cơ sở vật chất
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: overviewText ? "#475569" : "#94a3b8",
                          fontStyle: overviewText ? "normal" : "italic",
                          lineHeight: 1.65,
                          mb: 3,
                        }}
                      >
                        {overviewText || "Chưa có mô tả tổng quan."}
                      </Typography>
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#334155", mb: 0.5 }}>
                        Danh mục cơ sở vật chất
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 2 }}>
                        Mỗi hạng mục hiển thị ảnh tương ứng trong thư viện (theo mã/tên hoặc cùng thứ tự với API).
                      </Typography>
                      {itemList.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                          Chưa có hạng mục nào trong danh sách.
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                            gap: 2,
                          }}
                        >
                          {itemList.map((item, idx) => {
                            const name = item?.name != null ? String(item.name) : "";
                            const unit = item?.unit != null ? String(item.unit) : "";
                            const value = item?.value;
                            const valueLabel =
                              value != null && value !== "" ? `${value}${unit ? ` ${unit}` : ""}` : unit || "—";
                            const paired = facilityItemImages[idx] || {imageUrl: "", imageAlt: name || "Hạng mục CSVC"};
                            return (
                              <Card
                                key={item?.facilityCode || idx}
                                variant="outlined"
                                sx={{
                                  borderRadius: "12px",
                                  borderColor: "#e2e8f0",
                                  bgcolor: "#fafafa",
                                  overflow: "hidden",
                                  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                                  "&:hover": {
                                    borderColor: "rgba(13, 100, 222, 0.35)",
                                    boxShadow: "0 4px 14px rgba(13, 100, 222, 0.12)",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    position: "relative",
                                    width: "100%",
                                    height: 140,
                                    bgcolor: "#e2e8f0",
                                    flexShrink: 0,
                                  }}
                                >
                                  {paired.imageUrl ? (
                                    <Box
                                      component="img"
                                      src={paired.imageUrl}
                                      alt={paired.imageAlt}
                                      loading="lazy"
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexDirection: "column",
                                        gap: 0.75,
                                        color: "#94a3b8",
                                        px: 1,
                                      }}
                                    >
                                      <CategoryFacilityIcon category={item?.category} />
                                      <Typography variant="caption" sx={{ textAlign: "center", lineHeight: 1.35 }}>
                                        Chưa có ảnh cho hạng mục này
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                                    <Box
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "10px",
                                        bgcolor: "rgba(13, 100, 222, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <CategoryFacilityIcon category={item?.category} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                      {name.length > 48 ? (
                                        <Tooltip title={name}>
                                          <Typography
                                            sx={{
                                              fontWeight: 600,
                                              color: "#0f172a",
                                              fontSize: "0.9375rem",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {name || "—"}
                                          </Typography>
                                        </Tooltip>
                                      ) : (
                                        <Typography
                                          sx={{
                                            fontWeight: 600,
                                            color: "#0f172a",
                                            fontSize: "0.9375rem",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {name || "—"}
                                        </Typography>
                                      )}
                                      <Typography variant="body2" sx={{ color: "#0D64DE", fontWeight: 600, mt: 0.25 }}>
                                        {valueLabel}
                                      </Typography>
                                      {item?.category ? (
                                        <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                                          {String(item.category)}
                                        </Typography>
                                      ) : null}
                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                                        {item?.isUsage ? (
                                          <Chip label="Đang sử dụng" size="small" sx={{ height: 24, fontSize: "0.7rem", bgcolor: "rgba(34,197,94,0.12)", color: "#15803d" }} />
                                        ) : null}
                                        {item?.isCustom ? (
                                          <Chip label="Tùy chỉnh" size="small" sx={{ height: 24, fontSize: "0.7rem", bgcolor: "rgba(13, 100, 222, 0.12)", color: "#0D64DE" }} />
                                        ) : null}
                                      </Box>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyFacilitiesCard />
                )}

                <Box>
                  <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", mb: 1.5 }}>
                    Chính sách &amp; thông tin vận hành cơ sở
                  </Typography>
                  {policyDetail ? (
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: "16px",
                        border: "1px solid #e8e8e8",
                        bgcolor: "#ffffff",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Typography
                          component="pre"
                          sx={{
                            m: 0,
                            fontFamily: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
                            fontSize: "0.9375rem",
                            lineHeight: 1.7,
                            color: "#334155",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {policyDetail}
                        </Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyPolicyBlock />
                  )}
                </Box>
              </>
            )}
          </Box>
          </>
        )
      )
      }
    </Box>
  );
}
