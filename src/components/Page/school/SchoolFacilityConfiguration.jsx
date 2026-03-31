import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
  Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PhotoPreviewIcon from "@mui/icons-material/Photo";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {useNavigate} from "react-router-dom";

import {enqueueSnackbar} from "notistack";
import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import CloudinaryUpload from "../../ui/CloudinaryUpload.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import {getFacilityTemplate, upsertFacilityTemplate} from "../../../services/SchoolFacilityService.jsx";

const MAX_OVERVIEW_CHARS = 500;

function formatIsoLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toIsoLocalDateTime(raw) {
  // Chuẩn hoá về ISO_LOCAL_DATE_TIME: yyyy-MM-dd'T'HH:mm:ss
  if (raw == null || raw === "") return formatIsoLocalDateTime(new Date());
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return formatIsoLocalDateTime(d);
    return raw.length >= 19 ? raw.slice(0, 19) : raw;
  }
  if (Array.isArray(raw) && raw.length >= 3) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = raw;
    return formatIsoLocalDateTime(new Date(y, mo - 1, d, h, mi, s));
  }
  return formatIsoLocalDateTime(new Date());
}

function formatViDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("vi-VN");
}

function normalizeFacilityCode(raw) {
  return String(raw || "").trim().toLowerCase();
}

function imageCardSx() {
  return {
    border: "1px solid rgba(226,232,240,1)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    bgcolor: "white",
  };
}

export default function SchoolFacilityConfiguration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [facilityTemplateId, setFacilityTemplateId] = useState(null);
  const [schoolId, setSchoolId] = useState(null);

  const [overview, setOverview] = useState("");
  const [facilityItems, setFacilityItems] = useState([]);
  const [categoriesFilter, setCategoriesFilter] = useState("ALL");

  const [search, setSearch] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [imageItems, setImageItems] = useState([]); // gallery images

  const [expandedFacilityId, setExpandedFacilityId] = useState(null);
  const [facilityErrorsById, setFacilityErrorsById] = useState({});

  const initialStateRef = useRef(null);

  const [confirmDeleteFacilityOpen, setConfirmDeleteFacilityOpen] = useState(false);
  const [facilityIdToDelete, setFacilityIdToDelete] = useState(null);

  const [confirmDeleteImageOpen, setConfirmDeleteImageOpen] = useState(false);
  const [imageUrlToDelete, setImageUrlToDelete] = useState(null);

  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const facilityRowRefs = useRef({});
  const pendingScrollFacilityIdRef = useRef(null);

  const facilityCategories = useMemo(() => {
    const set = new Set(facilityItems.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [facilityItems]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facilityItems.filter((item) => {
      if (categoriesFilter !== "ALL" && item.category !== categoriesFilter) return false;
      if (!q) return true;
      return (
        item.name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.unit?.toLowerCase().includes(q)
      );
    });
  }, [facilityItems, categoriesFilter, search]);

  const snapshot = useMemo(() => {
    return JSON.stringify({
      overview,
      facilityItems,
      coverUrl,
      imageItems,
    });
  }, [overview, facilityItems, coverUrl, imageItems]);

  const isDirty = useMemo(() => {
    const init = initialStateRef.current;
    if (!init) return false;
    return snapshot !== init.snapshot;
  }, [snapshot]);

  const resetToInitial = useCallback(() => {
    const init = initialStateRef.current;
    if (!init) return;
    setFacilityTemplateId(init.facilityTemplateId);
    setSchoolId(init.schoolId);
    setOverview(init.overview);
    setFacilityItems(init.facilityItems);
    setCoverUrl(init.coverUrl);
    setImageItems(init.imageItems);
    setExpandedFacilityId(null);
    setFacilityErrorsById({});
    enqueueSnackbar("Đã huỷ thay đổi", { variant: "info" });
  }, []);

  const validateFacilities = useCallback(() => {
    const errorsById = {};
    const facilityCodeCount = facilityItems.reduce((acc, item) => {
      const code = item.facilityCode?.trim();
      if (!code) return acc;
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    facilityItems.forEach((item) => {
      const errors = {};
      if (!item.facilityCode?.trim()) {
        errors.facilityCode = "Mã cơ sở vật chất là bắt buộc";
      } else if (facilityCodeCount[item.facilityCode.trim()] > 1) {
        errors.facilityCode = "Mã cơ sở vật chất không được trùng";
      }
      if (!item.name?.trim()) errors.name = "Tên là bắt buộc";
      if (item.value == null || item.value === "" || Number.isNaN(Number(item.value)) || Number(item.value) <= 0) {
        errors.value = "Số lượng phải lớn hơn 0";
      }
      if (!item.unit?.trim()) errors.unit = "Đơn vị là bắt buộc";
      if (!item.category?.trim()) errors.category = "Danh mục là bắt buộc";
      if (Object.keys(errors).length > 0) errorsById[item.id] = errors;
    });
    setFacilityErrorsById(errorsById);
    return Object.keys(errorsById).length === 0;
  }, [facilityItems]);

  const handleUpdateFacilityField = useCallback((facilityId, field, value) => {
    setFacilityItems((prev) => prev.map((it) => (it.id === facilityId ? {...it, [field]: value} : it)));
    setFacilityErrorsById((prev) => {
      if (!prev[facilityId]) return prev;
      const next = {...prev};
      delete next[facilityId];
      return next;
    });
  }, []);

  const openDeleteFacilityConfirm = useCallback((facilityId) => {
    setFacilityIdToDelete(facilityId);
    setConfirmDeleteFacilityOpen(true);
  }, []);

  const handleDeleteFacility = useCallback(() => {
    if (!facilityIdToDelete) return;
    setFacilityItems((prev) => prev.filter((it) => it.id !== facilityIdToDelete));
    setFacilityErrorsById((prev) => {
      if (!prev[facilityIdToDelete]) return prev;
      const next = {...prev};
      delete next[facilityIdToDelete];
      return next;
    });
    if (expandedFacilityId === facilityIdToDelete) setExpandedFacilityId(null);
    setConfirmDeleteFacilityOpen(false);
    setFacilityIdToDelete(null);
    enqueueSnackbar("Xoá cơ sở vật chất thành công", { variant: "success" });
  }, [expandedFacilityId, facilityIdToDelete]);

  const handleAddFacility = useCallback(() => {
    const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newItem = {
      id,
      facilityCode: "",
      name: "",
      value: "1",
      unit: "",
      category: "",
    };
    setFacilityItems((prev) => [...prev, newItem]);
    setExpandedFacilityId(id);
    pendingScrollFacilityIdRef.current = id;
  }, []);

  useEffect(() => {
    const targetId = pendingScrollFacilityIdRef.current;
    if (!targetId) return;

    const node = facilityRowRefs.current[targetId];
    if (!node) return;

    requestAnimationFrame(() => {
      node.scrollIntoView({behavior: "smooth", block: "center"});
      pendingScrollFacilityIdRef.current = null;
    });
  }, [facilityItems]);

  const handleCancelDeleteFacility = () => {
    setConfirmDeleteFacilityOpen(false);
    setFacilityIdToDelete(null);
  };

  const openDeleteImageConfirm = useCallback((url) => {
    setImageUrlToDelete(url);
    setConfirmDeleteImageOpen(true);
  }, []);

  const handleDeleteImage = useCallback(() => {
    if (!imageUrlToDelete) return;
    setImageItems((prev) => prev.filter((img) => img.url !== imageUrlToDelete));
    setConfirmDeleteImageOpen(false);
    setImageUrlToDelete(null);
    enqueueSnackbar("Xoá ảnh thành công", { variant: "success" });
  }, [imageUrlToDelete]);

  const handleCancelDeleteImage = () => {
    setConfirmDeleteImageOpen(false);
    setImageUrlToDelete(null);
  };

  const handleFetch = useCallback(async () => {
    try {
      setLoading(true);

      const res = await listCampuses();
      const items = extractCampusListBody(res);
      const sid = items?.[0]?.schoolId ?? null;
      if (sid == null) {
        enqueueSnackbar("Không lấy được `schoolId` từ danh sách cơ sở", { variant: "error" });
        setLoading(false);
        return;
      }
      setSchoolId(sid);

      const facilityRes = await getFacilityTemplate({ schoolId: sid });
      const body = facilityRes?.data?.body ?? facilityRes?.body ?? null;
      const status = facilityRes?.status;
      const statusOk = status === 200;
      const isNotFound = status === 404;

      if (!statusOk && !body && !isNotFound) {
        enqueueSnackbar(
          facilityRes?.data?.message || "Không tải được cấu hình cơ sở vật chất. Bạn vẫn có thể tạo mới.",
          { variant: "error" }
        );
      }

      // Luôn build một "nextForm" theo defaults để đảm bảo `initialStateRef` luôn tồn tại,
      // tránh trường hợp `isDirty` luôn false => nút Huỷ/Lưu bị disable vĩnh viễn.
      const templateId = body?.templateId ?? body?.id ?? null;
      const nextFacilityItemsRaw = Array.isArray(body?.itemList) ? body.itemList : [];
      const nextImages = body?.imageJsonData?.itemList ?? [];

      const nextForm = {
        facilityTemplateId: templateId,
        schoolId: sid,
        overview: body?.overview ?? "",
        facilityItems: nextFacilityItemsRaw.map((i, idx) => ({
          id: `api-${idx}`,
          facilityCode: i.facilityCode ?? "",
          name: i.name ?? "",
          value: i.value ?? "",
          unit: i.unit ?? "",
          category: i.category ?? "",
        })),
        coverUrl: body?.imageJsonData?.coverUrl ?? "",
        imageItems: Array.isArray(nextImages)
          ? nextImages.map((img) => ({
              url: img.url ?? "",
              name: img.name ?? "",
              altName: img.altName ?? "",
              facilityCode: img.facilityCode ?? "",
              uploadDate: toIsoLocalDateTime(img.uploadDate),
              isUsage: img.isUsage ?? true,
            }))
          : [],
      };

      setFacilityTemplateId(nextForm.facilityTemplateId);
      setOverview(nextForm.overview);
      setFacilityItems(nextForm.facilityItems);
      setCoverUrl(nextForm.coverUrl);
      setImageItems(nextForm.imageItems);

      initialStateRef.current = {
        facilityTemplateId: nextForm.facilityTemplateId,
        schoolId: nextForm.schoolId,
        overview: nextForm.overview,
        facilityItems: nextForm.facilityItems,
        coverUrl: nextForm.coverUrl,
        imageItems: nextForm.imageItems,
        snapshot: JSON.stringify({
          overview: nextForm.overview,
          facilityItems: nextForm.facilityItems,
          coverUrl: nextForm.coverUrl,
          imageItems: nextForm.imageItems,
        }),
      };
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Không thể tải cấu hình cơ sở vật chất", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFetch();
  }, [handleFetch]);

  const handleSave = useCallback(async () => {
    if (!schoolId) return;
    if (!validateFacilities()) {
      enqueueSnackbar("Vui lòng kiểm tra lại dữ liệu cơ sở vật chất", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payloadItemList = facilityItems.map((it) => ({
        facilityCode: it.facilityCode,
        name: it.name,
        value: String(it.value ?? ""),
        unit: it.unit,
        category: it.category,
      }));

      const payloadImageJsonData = {
        coverUrl: coverUrl ?? "",
        itemList: imageItems.map((img) => ({
          url: img.url,
          name: img.name ?? "",
          altName: img.altName ?? "",
          facilityCode: img.facilityCode ?? "",
          uploadDate: img.uploadDate ? toIsoLocalDateTime(img.uploadDate) : formatIsoLocalDateTime(new Date()),
          isUsage: Boolean(img.isUsage),
        })),
      };

      const res = await upsertFacilityTemplate({
        schoolId,
        id: facilityTemplateId,
        overview: overview.trim(),
        itemList: payloadItemList,
        imageJsonData: payloadImageJsonData,
      });

      if (res?.status === 200) {
        enqueueSnackbar("Lưu thành công", { variant: "success" });
        // Refresh initial snapshot after save
        const newInitSnapshot = JSON.stringify({
          overview,
          facilityItems,
          coverUrl,
          imageItems,
        });
        initialStateRef.current = {
          facilityTemplateId,
          schoolId,
          overview,
          facilityItems,
          coverUrl,
          imageItems,
          snapshot: newInitSnapshot,
        };
        navigate("/school/facility-config");
      } else {
        enqueueSnackbar(res?.data?.message || "Đã có lỗi xảy ra", { variant: "error" });
      }
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Đã có lỗi xảy ra", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }, [coverUrl, facilityItems, facilityTemplateId, imageItems, navigate, overview, schoolId, validateFacilities]);

  const handleCoverUploaded = useCallback((results) => {
    const first = results?.[0];
    if (!first?.url) return;
    setCoverUrl(first.url);
    enqueueSnackbar("Tải ảnh cover lên thành công", { variant: "success" });
  }, []);

  const handleFacilityImagesUploaded = useCallback((facility) => (results) => {
    const normalizedCode = normalizeFacilityCode(facility?.facilityCode);
    if (!normalizedCode) {
      enqueueSnackbar("Vui lòng nhập mã cơ sở vật chất trước khi tải ảnh", { variant: "warning" });
      return;
    }

    const nowIso = formatIsoLocalDateTime(new Date());
    const nextImages = (results || [])
      .filter((r) => r?.url)
      .map((r) => ({
        url: r.url,
        name: facility.name ?? "",
        altName: facility.name ?? "",
        facilityCode: facility.facilityCode ?? "",
        uploadDate: nowIso,
        isUsage: true,
      }));

    if (nextImages.length === 0) return;

    setImageItems((prev) => [...prev, ...nextImages]);
    enqueueSnackbar(`Đã tải ${nextImages.length} ảnh lên thành công`, { variant: "success" });
  }, []);

  const handleOpenImagePreview = useCallback((url) => {
    setImagePreviewUrl(url);
    setImagePreviewOpen(true);
  }, []);

  const imagePreviewItem = useMemo(() => {
    if (!imagePreviewUrl) return null;
    return imageItems.find((i) => i.url === imagePreviewUrl) || null;
  }, [imageItems, imagePreviewUrl]);

  const updatePreviewField = useCallback((field, value) => {
    if (!imagePreviewItem) return;
    const codeUrl = imagePreviewItem.url;
    setImageItems((prev) =>
      prev.map((img) => (img.url === codeUrl ? {...img, [field]: value} : img))
    );
  }, [imagePreviewItem]);

  const previewFacilitiesByCategory = useMemo(() => {
    const grouped = {};
    facilityItems.forEach((item) => {
      const key = item.category || "Chưa phân loại";
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
    });
    return grouped;
  }, [facilityItems]);

  const usedImageItemsByFacilityCode = useMemo(() => {
    const map = {};
    imageItems
      .filter((i) => i.isUsage && i.url)
      .forEach((img) => {
        const key = normalizeFacilityCode(img.facilityCode);
        if (!key) return;
        map[key] = map[key] || [];
        map[key].push(img);
      });
    return map;
  }, [imageItems]);

  const usedImageItemsByName = useMemo(() => {
    const map = {};
    imageItems
      .filter((i) => i.isUsage && i.url)
      .forEach((img) => {
        const key = (img.name || "").trim().toLowerCase();
        if (!key) return;
        map[key] = map[key] || [];
        map[key].push(img);
      });
    return map;
  }, [imageItems]);

  return (
    <Box sx={{width: "100%", display: "flex", flexDirection: "column", gap: 3, pb: 10}}>
      {/* Header with gradient */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
          borderRadius: 3,
          p: 3,
          color: "white",
          boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon/>}
          onClick={() => navigate("/school/facility-config")}
          sx={{
            color: "#fff",
            textTransform: "none",
            mb: 1,
            "&:hover": {bgcolor: "rgba(255,255,255,0.12)"},
          }}
        >
          Quay lại xem trước
        </Button>
        <Box
          sx={{
            display: "flex",
            flexDirection: {xs: "column", sm: "row"},
            alignItems: {xs: "stretch", sm: "center"},
            justifyContent: "flex-start",
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
              Cấu hình Cơ sở vật chất
            </Typography>
            <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
              Quản lý overview, danh sách cơ sở vật chất và thư viện hình ảnh hiển thị.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Section 1: Facility Overview */}
      <Card sx={{borderRadius: "12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)", border: "1px solid rgba(226,232,240,1)"}}>
        <CardContent sx={{p: 3}}>
          <Typography sx={{fontWeight: 900, color: "#0f172a", mb: 1.25, fontSize: 18}}>
            Tổng quan cơ sở vật chất
          </Typography>

          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={120}/>
              <Skeleton variant="text" width="35%"/>
            </Stack>
          ) : (
            <Box>
              <TextField
                multiline
                minRows={5}
                value={overview}
                placeholder="Mô tả cơ sở vật chất của trường..."
                onChange={(e) => setOverview(e.target.value.slice(0, MAX_OVERVIEW_CHARS))}
                inputProps={{maxLength: MAX_OVERVIEW_CHARS}}
                fullWidth
                variant="outlined"
              />
              <Box sx={{display: "flex", justifyContent: "space-between", mt: 1}}>
                
                <Typography variant="caption" sx={{color: overview.length >= MAX_OVERVIEW_CHARS ? "#ef4444" : "#94a3b8"}}>
                  {overview.length}/{MAX_OVERVIEW_CHARS}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Facility List */}
      <Card sx={{borderRadius: "12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)", border: "1px solid rgba(226,232,240,1)"}}>
        <CardContent sx={{p: 3}}>
          <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2}}>
            <Typography sx={{fontWeight: 900, color: "#0f172a", fontSize: 18}}>
              Danh sách cơ sở vật chất
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon/>}
              onClick={handleAddFacility}
              disabled={loading || saving}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)",
              }}
            >
              Thêm cơ sở vật chất
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{fontWeight: 800, color: "#0f172a", mb: 1.25}}>
            Ảnh bìa
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" height={180}/>
          ) : (
            <Box
              sx={{
                border: "1px dashed rgba(148,163,184,0.9)",
                borderRadius: "12px",
                p: 2.25,
                bgcolor: "rgba(248,250,252,1)",
                position: "relative",
                overflow: "hidden",
                mb: 2.5,
              }}
            >
              <CloudinaryUpload
                inputId="school-facility-cover-upload"
                accept="image/*"
                multiple={false}
                onSuccess={handleCoverUploaded}
                onError={(msg) => enqueueSnackbar(msg, { variant: "error" })}
              >
                {({inputId, loading: uploadLoading}) => (
                  <Box
                    component="label"
                    htmlFor={inputId}
                    sx={{
                      display: "flex",
                      flexDirection: {xs: "column", sm: "row"},
                      alignItems: {xs: "stretch", sm: "center"},
                      justifyContent: "space-between",
                      gap: 2,
                      cursor: uploadLoading ? "default" : "pointer",
                    }}
                  >
                    <Box sx={{display: "flex", flexDirection: "column", gap: 0.75}}>
                      <Typography sx={{fontWeight: 900, color: "#0f172a"}}>
                        {coverUrl ? "Thay ảnh bìa" : "Kéo thả hoặc bấm để tải lên"}
                      </Typography>
                      {coverUrl && (
                        <Box sx={{display: "flex", gap: 1.25, mt: 0.75, flexWrap: "wrap"}}>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={uploadLoading || saving}
                            sx={{textTransform: "none", borderRadius: "12px"}}
                          >
                            {uploadLoading ? "Đang tải lên..." : "Thay ảnh"}
                          </Button>
                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            disabled={saving || uploadLoading}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCoverUrl("");
                              enqueueSnackbar("Đã xoá cover image", { variant: "info" });
                            }}
                            sx={{textTransform: "none", fontWeight: 800}}
                          >
                            Xoá
                          </Button>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{flex: 1, minWidth: 180}}>
                      {coverUrl ? (
                        <Box
                          component="img"
                          src={coverUrl}
                          alt="Cover preview"
                          sx={{
                            width: "100%",
                            height: {xs: 180, sm: 150},
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "1px solid rgba(226,232,240,1)",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: {xs: 180, sm: 150},
                            borderRadius: "12px",
                            border: "1px solid rgba(226,232,240,1)",
                            bgcolor: "rgba(148,163,184,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94a3b8",
                            fontWeight: 800,
                          }}
                        >
                          Xem trước
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </CloudinaryUpload>
            </Box>
          )}

          {/* Search & Filter */}
          <Box sx={{display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2}}>
            <TextField
              size="small"
              placeholder="Tìm kiếm cơ sở vật chất..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading || saving}
              sx={{flex: 1, minWidth: 220}}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{color: "#64748b"}}/>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{minWidth: 200}}>
              <Select
                value={categoriesFilter}
                onChange={(e) => setCategoriesFilter(e.target.value)}
                disabled={loading || saving}
                displayEmpty
                sx={{borderRadius: "12px"}}
              >
                <MenuItem value="ALL">Lọc theo danh mục</MenuItem>
                {facilityCategories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={76}/>
              <Skeleton variant="rounded" height={140}/>
            </Stack>
          ) : facilityItems.length === 0 ? (
            <Box sx={{py: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1}}>
              <PhotoPreviewIcon sx={{fontSize: 44, color: "#cbd5e1"}}/>
              <Typography sx={{fontWeight: 800, color: "#64748b"}}>Chưa có cơ sở vật chất</Typography>
              <Typography variant="body2" sx={{color: "#94a3b8", textAlign: "center"}}>
                Nhấn "Thêm cơ sở vật chất" để bắt đầu tạo danh sách.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {filteredFacilities.map((item) => {
                const isExpanded = expandedFacilityId === item.id;
                const errors = facilityErrorsById[item.id] || {};

                return (
                  <Box
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        facilityRowRefs.current[item.id] = el;
                      } else {
                        delete facilityRowRefs.current[item.id];
                      }
                    }}
                    sx={{
                      border: "1px solid rgba(226,232,240,1)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      bgcolor: isExpanded ? "rgba(37, 99, 235, 0.04)" : "white",
                      transition: "background-color 180ms ease, box-shadow 180ms ease",
                      "&:hover": { boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" },
                    }}
                  >
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedFacilityId((prev) => (prev === item.id ? null : item.id))}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <Box sx={{flex: 1, minWidth: 0}}>
                        <Typography sx={{fontWeight: 900, color: "#0f172a", fontSize: 15}}>
                          {item.name?.trim() ? item.name : "Cơ sở vật chất chưa đặt tên"}
                        </Typography>
                        <Box sx={{display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75, alignItems: "center"}}>
                          <Chip
                            size="small"
                            label={item.category?.trim() ? item.category : "Chưa phân loại"}
                            sx={{bgcolor: "rgba(37,99,235,0.08)", color: "#2563eb", fontWeight: 700}}
                          />
                          <Typography variant="body2" sx={{color: "#64748b", fontWeight: 600}}>
                            {item.value ? `${item.value} ` : ""}
                            {item.unit || ""}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{display: "flex", gap: 0.5, alignItems: "center"}}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedFacilityId((prev) => (prev === item.id ? null : item.id));
                          }}
                          sx={{color: "#64748b"}}
                          title={isExpanded ? "Thu gọn" : "Chỉnh sửa"}
                        >
                          {isExpanded ? <ExpandLessIcon fontSize="small"/> : <EditIcon fontSize="small"/>}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteFacilityConfirm(item.id);
                          }}
                          disabled={saving}
                          sx={{
                            color: "#64748b",
                            "&:hover": {color: "#dc2626"},
                          }}
                          title="Xoá"
                        >
                          <DeleteOutlineIcon fontSize="small"/>
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={isExpanded} timeout={220} unmountOnExit>
                      <Box sx={{p: 2}}>
                        <Stack spacing={1.5}>
                          <TextField
                            label="Mã cơ sở vật chất"
                            value={item.facilityCode}
                            onChange={(e) => handleUpdateFacilityField(item.id, "facilityCode", e.target.value)}
                            error={Boolean(errors.facilityCode)}
                            helperText={errors.facilityCode}
                            required
                            fullWidth
                            size="small"
                            placeholder="Ví dụ: LAB_PHYSICS"
                          />
                          <TextField
                            label="Tên"
                            value={item.name}
                            onChange={(e) => handleUpdateFacilityField(item.id, "name", e.target.value)}
                            error={Boolean(errors.name)}
                            helperText={errors.name}
                            required
                            fullWidth
                            size="small"
                          />

                          <Autocomplete
                            freeSolo
                            options={facilityCategories}
                            value={item.category || ""}
                            onChange={(e, newValue) => handleUpdateFacilityField(item.id, "category", newValue || "")}
                            onInputChange={(e, newInputValue, reason) => {
                              if (reason === "input" || reason === "clear") {
                                handleUpdateFacilityField(item.id, "category", newInputValue || "");
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Danh mục"
                                error={Boolean(errors.category)}
                                helperText={errors.category}
                                size="small"
                              />
                            )}
                          />

                          <Stack direction={{xs: "column", sm: "row"}} spacing={1.5}>
                            <TextField
                              label="Số lượng"
                              value={item.value}
                              onChange={(e) => handleUpdateFacilityField(item.id, "value", e.target.value)}
                              error={Boolean(errors.value)}
                              helperText={errors.value}
                              required
                              type="number"
                              size="small"
                              fullWidth
                            />
                            <TextField
                              label="Đơn vị"
                              value={item.unit}
                              onChange={(e) => handleUpdateFacilityField(item.id, "unit", e.target.value)}
                              error={Boolean(errors.unit)}
                              helperText={errors.unit}
                              required
                              size="small"
                              fullWidth
                            />
                          </Stack>

                          <Divider/>
                          <Box sx={{display: "flex", justifyContent: "space-between", gap: 2}}>
                            <Typography variant="caption" sx={{color: "#94a3b8"}}>
                              facilityCode: <strong>{item.facilityCode || "—"}</strong>
                            </Typography>
                            <Typography variant="caption" sx={{color: "#94a3b8"}}>
                              Nhấn vào dòng để thu gọn
                            </Typography>
                          </Box>

                          <Divider/>
                          <Box>
                            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, mb: 1}}>
                              <Typography sx={{fontWeight: 800, color: "#0f172a", fontSize: 14}}>
                                Ảnh minh họa cho mục này
                              </Typography>
                              <CloudinaryUpload
                                inputId={`school-facility-images-${item.id}`}
                                accept="image/*"
                                multiple
                                onSuccess={handleFacilityImagesUploaded(item)}
                                onError={(msg) => enqueueSnackbar(msg, {variant: "error"})}
                              >
                                {({inputId, loading: uploadLoading}) => (
                                  <Button
                                    component="label"
                                    htmlFor={inputId}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CloudUploadIcon/>}
                                    disabled={saving || uploadLoading || !normalizeFacilityCode(item.facilityCode)}
                                    sx={{textTransform: "none", borderRadius: "12px", fontWeight: 700}}
                                  >
                                    {uploadLoading ? "Đang tải..." : "Tải ảnh"}
                                  </Button>
                                )}
                              </CloudinaryUpload>
                            </Box>

                            {!normalizeFacilityCode(item.facilityCode) ? (
                              <Typography variant="caption" sx={{color: "#f59e0b"}}>
                                Cần nhập Mã cơ sở vật chất trước khi tải ảnh cho mục này.
                              </Typography>
                            ) : (() => {
                              const normalizedCode = normalizeFacilityCode(item.facilityCode);
                              const normalizedName = (item.name || "").trim().toLowerCase();
                              const itemImages = imageItems.filter((img) => {
                                const sameCode = normalizeFacilityCode(img.facilityCode) === normalizedCode;
                                const fallbackByName = !normalizeFacilityCode(img.facilityCode) && normalizedName && (img.name || "").trim().toLowerCase() === normalizedName;
                                return sameCode || fallbackByName;
                              });

                              if (itemImages.length === 0) {
                                return (
                                  <Typography variant="caption" sx={{color: "#94a3b8"}}>
                                    Chưa có ảnh cho mục này.
                                  </Typography>
                                );
                              }

                              return (
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)"}, gap: 1}}>
                                  {itemImages.map((img) => (
                                    <Box key={`${item.id}-${img.url}`} sx={{...imageCardSx(), position: "relative"}}>
                                      <IconButton
                                        size="small"
                                        onClick={() => openDeleteImageConfirm(img.url)}
                                        sx={{position: "absolute", top: 4, right: 4, bgcolor: "rgba(255,255,255,0.9)", zIndex: 2}}
                                      >
                                        <DeleteOutlineIcon fontSize="small" color="error"/>
                                      </IconButton>
                                      <Box
                                        component="img"
                                        src={img.url}
                                        alt={img.altName || img.name || "Ảnh cơ sở vật chất"}
                                        onClick={() => handleOpenImagePreview(img.url)}
                                        sx={{width: "100%", height: 100, objectFit: "cover", cursor: "pointer"}}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              );
                            })()}
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Stack>
          )}

          <Box
            sx={{
              mt: 3,
              background: "rgba(255,255,255,0.92)",
              py: 1.75,
              px: 0,
            }}
          >
            <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1.5}>
              <Button
                variant="outlined"
                onClick={resetToInitial}
                sx={{borderRadius: "12px", textTransform: "none", fontWeight: 800}}
              >
                Huỷ
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 900,
                  px: 3,
                  boxShadow: "0 12px 26px rgba(37, 99, 235, 0.24)",
                }}
              >
                {saving ? <CircularProgress size={18} sx={{color: "white", mr: 1}}/> : null}
                Lưu
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Confirm: delete facility */}
      <ConfirmDialog
        open={confirmDeleteFacilityOpen}
        title="Xoá cơ sở vật chất?"
        description="Thao tác này sẽ xoá mục cơ sở vật chất khỏi mẫu cấu hình."
        cancelText="Huỷ"
        confirmText="Xoá"
        loading={saving}
        onCancel={handleCancelDeleteFacility}
        onConfirm={handleDeleteFacility}
      />

      {/* Confirm: delete image */}
      <ConfirmDialog
        open={confirmDeleteImageOpen}
        title="Xoá ảnh?"
        description="Thao tác này sẽ xoá ảnh khỏi thư viện của mẫu cấu hình."
        cancelText="Huỷ"
        confirmText="Xoá"
        loading={saving}
        onCancel={handleCancelDeleteImage}
        onConfirm={handleDeleteImage}
      />

      {/* Image Preview Modal */}
      <Dialog open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2}}>
          <Typography sx={{fontWeight: 900, color: "#0f172a"}}>Xem trước ảnh</Typography>
          <IconButton size="small" onClick={() => setImagePreviewOpen(false)}>
            <CloseIcon fontSize="small"/>
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{p: 2.5}}>
          {imagePreviewItem ? (
            <Stack spacing={2}>
              <Box
                component="img"
                src={imagePreviewItem.url}
                alt={imagePreviewItem.name || "Xem trước"}
                sx={{width: "100%", height: 260, objectFit: "cover", borderRadius: "12px"}}
              />
              <TextField
                label="Tên"
                value={imagePreviewItem.name}
                onChange={(e) => updatePreviewField("name", e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Tên thay thế (EN)"
                value={imagePreviewItem.altName}
                onChange={(e) => updatePreviewField("altName", e.target.value)}
                fullWidth
                size="small"
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" sx={{fontWeight: 800, color: "#0f172a"}}>Dùng để hiển thị</Typography>
                <Switch
                  checked={Boolean(imagePreviewItem.isUsage)}
                  onChange={(e) => updatePreviewField("isUsage", e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" sx={{color: "#94a3b8"}}>
                Ngày tải lên: {formatViDate(imagePreviewItem.uploadDate)}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{color: "#94a3b8"}}>Không có dữ liệu xem trước.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{p: 2.5}}>
          <Button onClick={() => setImagePreviewOpen(false)} variant="outlined" sx={{borderRadius: "12px", textTransform: "none", fontWeight: 800}}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

