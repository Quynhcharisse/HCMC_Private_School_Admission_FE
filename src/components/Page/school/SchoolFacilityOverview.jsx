import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Box, Button, Card, CardContent, Dialog, DialogContent, IconButton, Divider, Skeleton, Typography} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import {getFacilityTemplate} from "../../../services/SchoolFacilityService.jsx";

function normalizeFacilityCode(raw) {
  return String(raw || "").trim().toLowerCase();
}

export default function SchoolFacilityOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState("");
  const [facilityItems, setFacilityItems] = useState([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [imageItems, setImageItems] = useState([]);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

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
      .filter((i) => i.url && i.isUsage !== false)
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
      .filter((i) => i.url && i.isUsage !== false)
      .forEach((img) => {
        const key = (img.name || "").trim().toLowerCase();
        if (!key) return;
        map[key] = map[key] || [];
        map[key].push(img);
      });
    return map;
  }, [imageItems]);

  const usedImageItemsByAltName = useMemo(() => {
    const map = {};
    imageItems
      .filter((i) => i.url && i.isUsage !== false)
      .forEach((img) => {
        const key = (img.altName || "").trim().toLowerCase();
        if (!key) return;
        map[key] = map[key] || [];
        map[key].push(img);
      });
    return map;
  }, [imageItems]);

  const getMatchedImages = useCallback((facility) => {
    const imageKey = normalizeFacilityCode(facility?.facilityCode);
    const nameKey = (facility?.name || "").trim().toLowerCase();
    return (
      usedImageItemsByFacilityCode[imageKey] ||
      usedImageItemsByName[nameKey] ||
      usedImageItemsByAltName[nameKey] ||
      []
    );
  }, [usedImageItemsByAltName, usedImageItemsByFacilityCode, usedImageItemsByName]);

  const orphanImageItems = useMemo(() => {
    const matchedUrls = new Set();
    facilityItems.forEach((facility) => {
      getMatchedImages(facility).forEach((img) => {
        if (img?.url) matchedUrls.add(img.url);
      });
    });
    return imageItems.filter((img) => img?.url && img.isUsage !== false && !matchedUrls.has(img.url));
  }, [facilityItems, getMatchedImages, imageItems]);

  const handleOpenImagePreview = useCallback((url) => {
    if (!url) return;
    setImagePreviewUrl(url);
    setImagePreviewOpen(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await listCampuses();
        const campuses = extractCampusListBody(res);
        const schoolId = campuses?.[0]?.schoolId;

        if (!schoolId) {
          enqueueSnackbar("Không lấy được schoolId", {variant: "error"});
          return;
        }

        const facilityRes = await getFacilityTemplate({schoolId});
        const body = facilityRes?.data?.body ?? facilityRes?.body ?? {};

        setOverview(body?.overview ?? "");
        setFacilityItems(Array.isArray(body?.itemList) ? body.itemList : []);
        setCoverUrl(body?.imageJsonData?.coverUrl ?? "");
        setImageItems(
          Array.isArray(body?.imageJsonData?.itemList)
            ? body.imageJsonData.itemList.map((img) => ({
                ...img,
                isUsage: img?.isUsage ?? true,
                facilityCode: img?.facilityCode ?? "",
              }))
            : []
        );
      } catch (e) {
        console.error(e);
        enqueueSnackbar("Không thể tải dữ liệu cơ sở vật chất", {variant: "error"});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
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
            flexDirection: {xs: "column", sm: "row"},
            alignItems: {xs: "stretch", sm: "center"},
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{fontWeight: 700, letterSpacing: "-0.02em", textShadow: "0 1px 2px rgba(0,0,0,0.1)"}}>
              Cơ sở vật chất
            </Typography>
            <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
              Xem nhanh thông tin hiển thị trước khi chỉnh sửa chi tiết.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<VisibilityIcon/>}
            onClick={() => navigate("/school/facility-config/detail")}
            sx={{
              bgcolor: "rgba(255,255,255,0.95)",
              color: "#0D64DE",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1.5,
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              "&:hover": {bgcolor: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.2)"},
            }}
          >
            Xem chi tiết
          </Button>
        </Box>
      </Box>

      <Card sx={{borderRadius: "12px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)", border: "1px solid rgba(226,232,240,1)"}}>
        <CardContent sx={{p: 3}}>
          {loading ? (
            <Box>
              <Skeleton variant="rounded" height={200}/>
              <Skeleton variant="text" sx={{mt: 2}}/>
              <Skeleton variant="text" width="80%"/>
            </Box>
          ) : (
            <Box sx={{borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(226,232,240,1)"}}>
              {coverUrl ? (
                <Box
                  component="img"
                  src={coverUrl}
                  alt="Ảnh bìa cơ sở vật chất"
                  onClick={() => handleOpenImagePreview(coverUrl)}
                  sx={{width: "100%", height: 200, objectFit: "cover", cursor: "zoom-in"}}
                />
              ) : (
                <Box sx={{width: "100%", height: 180, bgcolor: "rgba(148,163,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Typography sx={{fontWeight: 900, color: "#94a3b8"}}>Chưa có ảnh bìa</Typography>
                </Box>
              )}

              <Box sx={{p: 2.5, bgcolor: "white"}}>
                <Typography variant="body1" sx={{fontWeight: 800, color: "#0f172a", mb: 1}}>
                  Tổng quan
                </Typography>
                <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.6}}>
                  {overview?.trim() ? overview : "—"}
                </Typography>

                <Divider sx={{my: 2}}/>

                <Typography variant="body1" sx={{fontWeight: 900, color: "#0f172a", mb: 1}}>
                  Cơ sở vật chất theo danh mục
                </Typography>

                {facilityItems.length === 0 ? (
                  <Typography variant="body2" sx={{color: "#94a3b8"}}>
                    Chưa có cơ sở vật chất để hiển thị.
                  </Typography>
                ) : (
                  <Box sx={{display: "flex", flexDirection: "column", gap: 1.5}}>
                    {Object.entries(previewFacilitiesByCategory).map(([cat, items]) => (
                      <Box key={cat}>
                        <Typography variant="subtitle2" sx={{fontWeight: 900, color: "#2563eb"}}>
                          {cat}
                        </Typography>
                        <Box sx={{mt: 0.5}}>
                          {items.map((it, idx) => {
                            const matchedImages = getMatchedImages(it);

                            return (
                              <Box key={`${it.facilityCode || it.name || "facility"}-${idx}`} sx={{py: 0.75, borderBottom: "1px solid rgba(241,245,249,1)"}}>
                                <Box sx={{display: "flex", justifyContent: "space-between", gap: 2}}>
                                  <Typography variant="body2" sx={{color: "#334155", fontWeight: 700}}>
                                    {it.name || "—"}
                                  </Typography>
                                  <Typography variant="body2" sx={{color: "#64748b", fontWeight: 800}}>
                                    {it.value || "0"} {it.unit || ""}
                                  </Typography>
                                </Box>
                                {matchedImages.length > 0 && (
                                  <Box sx={{mt: 1, display: "grid", gridTemplateColumns: {xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)"}, gap: 1.25}}>
                                    {matchedImages.map((img) => (
                                      <Box
                                        key={`${it.facilityCode || it.name}-${img.url}`}
                                        component="img"
                                        src={img.url}
                                        alt={img.altName || img.name || "Cơ sở vật chất"}
                                        onClick={() => handleOpenImagePreview(img.url)}
                                        sx={{width: "100%", height: 130, objectFit: "cover", borderRadius: "10px", border: "1px solid rgba(226,232,240,1)", cursor: "zoom-in"}}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {orphanImageItems.length > 0 && (
                  <>
                    <Divider sx={{my: 2}}/>
                    <Typography variant="body1" sx={{fontWeight: 900, color: "#0f172a", mb: 1}}>
                      Ảnh cơ sở vật chất (chưa gán mục)
                    </Typography>
                    <Box sx={{display: "grid", gridTemplateColumns: {xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)"}, gap: 1.25}}>
                      {orphanImageItems.map((img) => (
                        <Box
                          key={`orphan-${img.url}`}
                          component="img"
                          src={img.url}
                          alt={img.altName || img.name || "Cơ sở vật chất"}
                          onClick={() => handleOpenImagePreview(img.url)}
                          sx={{width: "100%", height: 130, objectFit: "cover", borderRadius: "10px", border: "1px solid rgba(226,232,240,1)", cursor: "zoom-in"}}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{p: 1.5, position: "relative", bgcolor: "#0f172a"}}>
          <IconButton
            onClick={() => setImagePreviewOpen(false)}
            sx={{position: "absolute", top: 8, right: 8, color: "white", bgcolor: "rgba(0,0,0,0.4)", "&:hover": {bgcolor: "rgba(0,0,0,0.55)"}}}
          >
            <CloseIcon fontSize="small"/>
          </IconButton>
          <Box
            component="img"
            src={imagePreviewUrl}
            alt="Zoom ảnh cơ sở vật chất"
            sx={{width: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "8px"}}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

