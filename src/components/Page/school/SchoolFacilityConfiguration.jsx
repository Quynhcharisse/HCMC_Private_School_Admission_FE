import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PhotoPreviewIcon from "@mui/icons-material/Photo";
import {useNavigate} from "react-router-dom";

import {enqueueSnackbar} from "notistack";
import CloudinaryUpload from "../../ui/CloudinaryUpload.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import CreatePostRichTextEditor from "../../ui/CreatePostRichTextEditor.jsx";

const MAX_OVERVIEW_CHARS = 500;

function plainTextLengthFromHtml(html) {
  if (html == null || html === "") return 0;
  const s = String(html);
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = s;
    return (el.textContent || "").length;
  }
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").length;
}

/** Dữ liệu cũ (thuần text) → bọc thẻ p; đã là HTML từ editor thì giữ nguyên. */
function overviewToInitialEditorHtml(stored) {
  const raw = stored ?? "";
  const s = String(raw).trim();
  if (!s) return "";
  if (/<[a-z][\s/>]/i.test(s)) return String(raw);
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${esc}</p>`;
}

function formatIsoLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toIsoLocalDateTime(raw) {
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

function normalizeFacilityData(raw) {
  const fd = raw && typeof raw === "object" ? raw : {};
  const imageData = fd.imageData && typeof fd.imageData === "object" ? fd.imageData : {};
  const list = Array.isArray(imageData.imageList) ? imageData.imageList : [];
  return {
    itemList: Array.isArray(fd.itemList) ? fd.itemList : [],
    overview: fd.overview ?? "",
    imageData: {
      coverUrl: imageData.coverUrl ?? "",
      imageList: list.map((img) => ({
        url: img.url ?? "",
        name: img.name ?? "",
        altName: img.altName ?? "",
        facilityCode: img.facilityCode ?? "",
        uploadDate: img.uploadDate ? toIsoLocalDateTime(img.uploadDate) : formatIsoLocalDateTime(new Date()),
        isUsage: img.isUsage ?? true,
      })),
    },
  };
}

/**
 * Tab "Cài đặt Cơ sở vật chất" — controlled by `facilityData` (API shape facilityData).
 */
export const SchoolFacilityFacilityForm = forwardRef(function SchoolFacilityFacilityForm(
  {value, onChange, loading = false, saving = false, readOnly = false, perCampus = false},
  ref
) {
  /** Luôn merge từ props mới nhất (tránh closure `value` cũ khi sync itemList sau xoá / cập nhật hàng loạt). */
  const valueRef = useRef(value);
  useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  const formLocked = loading || saving || readOnly;
  /** Giữ giao diện không xám khi chỉ xem — chặn tương tác bằng pointer-events thay vì disabled. */
  const blockPointerSx = formLocked ? { pointerEvents: "none", cursor: "default" } : undefined;
  const facilityData = useMemo(() => normalizeFacilityData(value), [value]);

  const overviewNoteBody = perCampus
    ? "Tổng quan về cơ sở vật chất là một đoạn văn mô tả chung về cơ sở vật chất của mỗi cơ sở"
    : "Tổng quan về cơ sở vật chất là một đoạn văn mô tả chung về cơ sở vật chất của trường";
  const coverNoteText = perCampus
    ? "Ảnh bìa là ảnh bao quát nhất về cơ sở vật chất (thường là ảnh chụp toàn cảnh trường từ trên cao hoặc cổng trường của mỗi cơ sở)"
    : "Ảnh bìa là ảnh bao quát nhất về cơ sở vật chất (thường là ảnh chụp toàn cảnh trường từ trên cao hoặc cổng trường)";

  const setFacilityData = useCallback(
    (updater) => {
      const current = normalizeFacilityData(valueRef.current);
      const next = typeof updater === "function" ? updater(current) : updater;
      onChange?.(next);
    },
    [onChange]
  );

  const overview = facilityData.overview ?? "";
  const overviewPlainLen = useMemo(() => plainTextLengthFromHtml(overview), [overview]);
  const coverUrl = facilityData.imageData?.coverUrl ?? "";
  const imageItems = facilityData.imageData?.imageList ?? [];

  const setOverview = useCallback(
    (v) => {
      setFacilityData((prev) => ({...prev, overview: v}));
    },
    [setFacilityData]
  );

  const setCoverUrl = useCallback(
    (v) => {
      setFacilityData((prev) => ({
        ...prev,
        imageData: {...prev.imageData, coverUrl: v},
      }));
    },
    [setFacilityData]
  );

  const setImageItems = useCallback(
    (nextListOrFn) => {
      setFacilityData((prev) => {
        const cur = normalizeFacilityData(prev).imageData?.imageList ?? [];
        const nextList = typeof nextListOrFn === "function" ? nextListOrFn(cur) : nextListOrFn;
        const im = prev.imageData && typeof prev.imageData === "object" ? prev.imageData : {};
        return {
          ...prev,
          imageData: {...im, imageList: nextList},
        };
      });
    },
    [setFacilityData]
  );

  const [facilityItems, setFacilityItemsState] = useState([]);

  useEffect(() => {
    const raw = Array.isArray(facilityData.itemList) ? facilityData.itemList : [];
    setFacilityItemsState((prev) =>
      raw.map((i, idx) => {
        const prevRow = prev[idx];
        // Không nhúng facilityCode vào id: mỗi lần gõ mã, itemList đổi → id cũ làm mất expandedFacilityId.
        const id =
          prevRow != null && prev.length === raw.length
            ? prevRow.id
            : `api-row-${idx}`;
        return {
          id,
          facilityCode: i.facilityCode ?? "",
          name: i.name ?? "",
          value: i.value ?? "",
          unit: i.unit ?? "",
          category: i.category ?? "",
        };
      })
    );
  }, [facilityData.itemList]);

  const syncItemListUp = useCallback(
    (rows) => {
      const itemList = rows.map((it) => ({
        facilityCode: it.facilityCode,
        name: it.name,
        value: it.value === "" || it.value == null ? "" : Number(it.value) || 0,
        unit: it.unit,
        category: it.category,
      }));
      setFacilityData((prev) => ({...prev, itemList}));
    },
    [setFacilityData]
  );

  const [categoriesFilter, setCategoriesFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedFacilityId, setExpandedFacilityId] = useState(null);
  const [facilityErrorsById, setFacilityErrorsById] = useState({});

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

  useImperativeHandle(
    ref,
    () => ({
      validate: () => validateFacilities(),
    }),
    [validateFacilities]
  );

  const handleUpdateFacilityField = useCallback(
    (facilityId, field, val) => {
      setFacilityItemsState((prev) => {
        const next = prev.map((it) => (it.id === facilityId ? {...it, [field]: val} : it));
        syncItemListUp(next);
        return next;
      });
      setFacilityErrorsById((prev) => {
        if (!prev[facilityId]) return prev;
        const next = {...prev};
        delete next[facilityId];
        return next;
      });
    },
    [syncItemListUp]
  );

  const openDeleteFacilityConfirm = useCallback((facilityId) => {
    setFacilityIdToDelete(facilityId);
    setConfirmDeleteFacilityOpen(true);
  }, []);

  const handleDeleteFacility = useCallback(() => {
    if (!facilityIdToDelete) return;
    setFacilityItemsState((prev) => {
      const next = prev.filter((it) => it.id !== facilityIdToDelete);
      syncItemListUp(next);
      return next;
    });
    setFacilityErrorsById((prev) => {
      if (!prev[facilityIdToDelete]) return prev;
      const next = {...prev};
      delete next[facilityIdToDelete];
      return next;
    });
    if (expandedFacilityId === facilityIdToDelete) setExpandedFacilityId(null);
    setConfirmDeleteFacilityOpen(false);
    setFacilityIdToDelete(null);
    enqueueSnackbar("Xoá cơ sở vật chất thành công", {variant: "success"});
  }, [expandedFacilityId, facilityIdToDelete, syncItemListUp]);

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
    setFacilityItemsState((prev) => {
      const next = [...prev, newItem];
      syncItemListUp(next);
      return next;
    });
    setExpandedFacilityId(id);
    pendingScrollFacilityIdRef.current = id;
  }, [syncItemListUp]);

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

  const openDeleteImageConfirm = useCallback((url) => {
    setImageUrlToDelete(url);
    setConfirmDeleteImageOpen(true);
  }, []);

  const handleDeleteImage = useCallback(() => {
    if (!imageUrlToDelete) return;
    setImageItems((list) => list.filter((img) => img.url !== imageUrlToDelete));
    setConfirmDeleteImageOpen(false);
    setImageUrlToDelete(null);
    enqueueSnackbar("Xoá ảnh thành công", {variant: "success"});
  }, [imageUrlToDelete, setImageItems]);

  const handleCoverUploaded = useCallback(
    (results) => {
      const first = results?.[0];
      if (!first?.url) return;
      setCoverUrl(first.url);
      enqueueSnackbar("Tải ảnh cover lên thành công", {variant: "success"});
    },
    [setCoverUrl]
  );

  const handleFacilityImagesUploaded = useCallback(
    (facility) => (results) => {
      const normalizedCode = normalizeFacilityCode(facility?.facilityCode);
      if (!normalizedCode) {
        enqueueSnackbar("Vui lòng nhập mã cơ sở vật chất trước khi tải ảnh", {variant: "warning"});
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
      setImageItems((list) => [...list, ...nextImages]);
      enqueueSnackbar(`Đã tải ${nextImages.length} ảnh lên thành công`, {variant: "success"});
    },
    [setImageItems]
  );

  const handleOpenImagePreview = useCallback((url) => {
    setImagePreviewUrl(url);
    setImagePreviewOpen(true);
  }, []);

  const imagePreviewItem = useMemo(() => {
    if (!imagePreviewUrl) return null;
    return imageItems.find((i) => i.url === imagePreviewUrl) || null;
  }, [imageItems, imagePreviewUrl]);

  const updatePreviewField = useCallback(
    (field, val) => {
      if (!imagePreviewItem) return;
      const codeUrl = imagePreviewItem.url;
      setImageItems((list) => list.map((img) => (img.url === codeUrl ? {...img, [field]: val} : img)));
    },
    [imagePreviewItem, setImageItems]
  );

  return (
    <Box sx={{width: "100%", display: "flex", flexDirection: "column", gap: 3, pb: 1}}>
      {!perCampus ? (
        <Card sx={{borderRadius: "12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)", border: "1px solid rgba(226,232,240,1)"}}>
          <CardContent sx={{p: 3}}>
            <Typography sx={{fontWeight: 900, color: "#0f172a", mb: 1.25, fontSize: 18}}>Tổng quan cơ sở vật chất</Typography>
            <Alert severity="info" sx={{borderRadius: 2, maxWidth: 1200, mb: 1.5}}>
              <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                Lưu ý:
              </Typography>
              <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                {overviewNoteBody}
              </Typography>
            </Alert>
            {loading ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={120} sx={{borderRadius: "12px"}}/>
                <Skeleton variant="text" width="35%"/>
              </Stack>
            ) : (
              <Box>
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.75}}>
                  <CreatePostRichTextEditor
                    initialHtml={overviewToInitialEditorHtml(overview)}
                    onChange={setOverview}
                    disabled={formLocked}
                    minEditorHeight={260}
                    maxEditorHeight={480}
                  />
                </Box>
                <Box sx={{display: "flex", justifyContent: "space-between", mt: 1}}>
                  <Typography
                    variant="caption"
                    sx={{color: overviewPlainLen >= MAX_OVERVIEW_CHARS ? "#ef4444" : "#94a3b8"}}
                  >
                    {overviewPlainLen}/{MAX_OVERVIEW_CHARS}
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Section 2: danh sách + ảnh bìa + lọc + từng mục */}
      <Card sx={{borderRadius: "12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)", border: "1px solid rgba(226,232,240,1)"}}>
        <CardContent sx={{p: 3}}>
          <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2}}>
            <Typography sx={{fontWeight: 900, color: "#0f172a", fontSize: 18}}>Danh sách cơ sở vật chất</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon/>}
              onClick={handleAddFacility}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)",
                ...blockPointerSx,
              }}
            >
              Thêm cơ sở vật chất
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{fontWeight: 800, color: "#0f172a", mb: 1.25}}>
            Ảnh bìa
          </Typography>
          <Alert severity="info" sx={{borderRadius: 2, maxWidth: 1200, mb: 1.5}}>
            <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
              Lưu ý:
            </Typography>
            <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
              {coverNoteText}
            </Typography>
          </Alert>
          {loading ? (
            <Skeleton variant="rounded" height={180} sx={{borderRadius: "12px", mb: 2.5}}/>
          ) : (
            <Box
              sx={{
                border: "1px dashed rgba(203, 213, 225, 1)",
                borderRadius: "12px",
                p: 0,
                bgcolor: "#f1f5f9",
                position: "relative",
                overflow: "hidden",
                mb: 2.5,
                ...(formLocked ? blockPointerSx : {}),
              }}
            >
              <CloudinaryUpload
                  inputId="school-facility-cover-upload"
                  accept="image/*"
                  multiple={false}
                  onSuccess={handleCoverUploaded}
                  onError={(msg) => enqueueSnackbar(msg, {variant: "error"})}
                >
                  {({inputId, loading: uploadLoading}) =>
                    !coverUrl ? (
                      <Box
                        component="label"
                        htmlFor={inputId}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          py: {xs: 3.5, sm: 4},
                          px: 2.5,
                          gap: 1.5,
                          cursor: uploadLoading ? "default" : "pointer",
                          minHeight: {xs: 220, sm: 200},
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <Typography sx={{fontWeight: 600, color: "#0f172a", fontSize: 15, lineHeight: 1.4, maxWidth: 360}}>
                          Chọn file hoặc kéo thả vào đây
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b", fontSize: 13, maxWidth: 400, lineHeight: 1.45}}>
                          Định dạng JPEG, PNG, WebP — dung lượng tối đa 50MB
                        </Typography>
                        {uploadLoading ? (
                          <CircularProgress size={32} thickness={4} sx={{color: "#2563eb", mt: 0.5}}/>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 40,
                              height: 40,
                              mt: 0.5,
                              borderRadius: "10px",
                              border: "1px solid rgba(37, 99, 235, 0.5)",
                              bgcolor: "rgba(37, 99, 235, 0.06)",
                            }}
                          >
                            <CloudUploadIcon sx={{fontSize: 22, color: "#2563eb"}}/>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Stack
                        alignItems="center"
                        spacing={2}
                        sx={{py: 2.5, px: 2.5}}
                      >
                        <Box
                          component="img"
                          src={coverUrl}
                          alt="Ảnh bìa"
                          sx={{
                            width: "100%",
                            maxWidth: 560,
                            maxHeight: 220,
                            height: "auto",
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "1px solid rgba(226,232,240,1)",
                            display: "block",
                          }}
                        />
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" alignItems="center">
                          <Box component="label" htmlFor={inputId} sx={{cursor: uploadLoading ? "default" : "pointer", display: "inline-flex"}}>
                            <IconButton
                              component="span"
                              size="small"
                              disabled={uploadLoading}
                              aria-label={uploadLoading ? "Đang tải lên" : "Thay ảnh bìa"}
                              sx={{
                                border: "1px solid rgba(203,213,225,1)",
                                borderRadius: "10px",
                                color: "#2563eb",
                                "&:hover": {bgcolor: "rgba(37,99,235,0.06)"},
                              }}
                            >
                              {uploadLoading ? (
                                <CircularProgress color="inherit" size={18}/>
                              ) : (
                                <CloudUploadIcon sx={{fontSize: 20}}/>
                              )}
                            </IconButton>
                          </Box>
                          <IconButton
                            size="small"
                            disabled={uploadLoading}
                            aria-label="Xoá ảnh bìa"
                            onClick={() => {
                              setCoverUrl("");
                              enqueueSnackbar("Đã xoá ảnh bìa", {variant: "info"});
                            }}
                            sx={{
                              border: "1px solid rgba(203,213,225,1)",
                              borderRadius: "10px",
                              color: "#dc2626",
                              "&:hover": {bgcolor: "rgba(220,38,38,0.08)"},
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small"/>
                          </IconButton>
                        </Stack>
                      </Stack>
                    )}
                </CloudinaryUpload>
            </Box>
          )}

          <Box sx={{display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2}}>
            <FormControl size="small" sx={{minWidth: 200, ...(formLocked ? blockPointerSx : {})}}>
              <Select
                value={categoriesFilter}
                onChange={(e) => setCategoriesFilter(e.target.value)}
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
              <Skeleton variant="rounded" height={76} sx={{borderRadius: "12px"}}/>
              <Skeleton variant="rounded" height={140} sx={{borderRadius: "12px"}}/>
            </Stack>
          ) : facilityItems.length === 0 ? (
            <Box sx={{py: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1}}>
              <PhotoPreviewIcon sx={{fontSize: 44, color: "#cbd5e1"}}/>
              <Typography sx={{fontWeight: 800, color: "#64748b"}}>Chưa có cơ sở vật chất</Typography>
              <Typography variant="body2" sx={{color: "#94a3b8", textAlign: "center"}}>
                Nhấn &quot;Thêm cơ sở vật chất&quot; để bắt đầu tạo danh sách.
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
                      if (el) facilityRowRefs.current[item.id] = el;
                      else delete facilityRowRefs.current[item.id];
                    }}
                    sx={{
                      border: "1px solid rgba(226,232,240,1)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      bgcolor: isExpanded ? "rgba(37, 99, 235, 0.04)" : "white",
                      transition: "background-color 180ms ease, box-shadow 180ms ease",
                      "&:hover": {boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)"},
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
                          sx={{color: "#64748b", "&:hover": {color: "#dc2626"}, ...(formLocked ? blockPointerSx : {})}}
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
                            inputProps={{readOnly: formLocked}}
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
                            inputProps={{readOnly: formLocked}}
                          />
                          <Autocomplete
                            freeSolo
                            options={facilityCategories}
                            value={item.category || ""}
                            readOnly={formLocked}
                            onChange={(e, newValue) => handleUpdateFacilityField(item.id, "category", newValue || "")}
                            onInputChange={(e, newInputValue, reason) => {
                              if (reason === "input" || reason === "clear") {
                                handleUpdateFacilityField(item.id, "category", newInputValue || "");
                              }
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Danh mục" error={Boolean(errors.category)} helperText={errors.category} size="small"/>
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
                              inputProps={{readOnly: formLocked}}
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
                              inputProps={{readOnly: formLocked}}
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
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1.5,
                                mb: 1,
                                ...(formLocked ? blockPointerSx : {}),
                              }}
                            >
                              <Typography sx={{fontWeight: 800, color: "#0f172a", fontSize: 14}}>Ảnh minh họa cho mục này</Typography>
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
                                    disabled={uploadLoading || !normalizeFacilityCode(item.facilityCode)}
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
                                const fallbackByName =
                                  !normalizeFacilityCode(img.facilityCode) &&
                                  normalizedName &&
                                  (img.name || "").trim().toLowerCase() === normalizedName;
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
                                        sx={{
                                          position: "absolute",
                                          top: 4,
                                          right: 4,
                                          bgcolor: "rgba(255,255,255,0.9)",
                                          zIndex: 2,
                                          ...(formLocked ? blockPointerSx : {}),
                                        }}
                                      >
                                        <DeleteOutlineIcon fontSize="small" color="error"/>
                                      </IconButton>
                                      <Box
                                        component="img"
                                        src={img.url}
                                        alt={img.altName || img.name || "Ảnh"}
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

        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteFacilityOpen}
        title="Xoá cơ sở vật chất?"
        description="Thao tác này sẽ xoá mục khỏi danh sách."
        cancelText="Huỷ"
        confirmText="Xoá"
        loading={saving}
        onCancel={() => {
          setConfirmDeleteFacilityOpen(false);
          setFacilityIdToDelete(null);
        }}
        onConfirm={handleDeleteFacility}
      />
      <ConfirmDialog
        open={confirmDeleteImageOpen}
        title="Xoá ảnh?"
        description="Ảnh sẽ bị xoá khỏi thư viện."
        cancelText="Huỷ"
        confirmText="Xoá"
        loading={saving}
        onCancel={() => {
          setConfirmDeleteImageOpen(false);
          setImageUrlToDelete(null);
        }}
        onConfirm={handleDeleteImage}
      />
      <Dialog
        open={imagePreviewOpen}
        onClose={(event, reason) => {
          if (reason === "backdropClick") return;
          setImagePreviewOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
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
                inputProps={{readOnly: formLocked}}
              />
              <TextField
                label="Tên thay thế (EN)"
                value={imagePreviewItem.altName}
                onChange={(e) => updatePreviewField("altName", e.target.value)}
                fullWidth
                size="small"
                inputProps={{readOnly: formLocked}}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" sx={{fontWeight: 800, color: "#0f172a"}}>
                  Dùng để hiển thị
                </Typography>
                <Switch
                  checked={Boolean(imagePreviewItem.isUsage)}
                  onChange={(e) => {
                    if (formLocked) return;
                    updatePreviewField("isUsage", e.target.checked);
                  }}
                  sx={formLocked ? blockPointerSx : undefined}
                />
              </Stack>
              <Typography variant="caption" sx={{color: "#94a3b8"}}>
                Ngày tải: {formatViDate(imagePreviewItem.uploadDate)}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{color: "#94a3b8"}}>
              Không có dữ liệu.
            </Typography>
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
});

/** @deprecated Dùng ref tới SchoolFacilityOverview; giữ route cũ */
export default function SchoolFacilityConfiguration() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/school/facility-config?tab=facility", {replace: true});
  }, [navigate]);
  return (
    <Box sx={{display: "flex", justifyContent: "center", p: 4}}>
      <CircularProgress/>
    </Box>
  );
}
