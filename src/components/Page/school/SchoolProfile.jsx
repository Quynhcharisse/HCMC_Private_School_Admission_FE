import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SettingsIcon from "@mui/icons-material/Settings";
import TimelineIcon from "@mui/icons-material/Timeline";
import SchoolIcon from "@mui/icons-material/School";
import CloseIcon from "@mui/icons-material/Close";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LockIcon from "@mui/icons-material/Lock";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { enqueueSnackbar } from "notistack";
import { getProfile, updateProfile } from "../../../services/AccountService.jsx";
import CloudinaryUpload from "../../ui/CloudinaryUpload.jsx";

const SectionHeader = ({ icon: Icon, title }) => (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Box
            sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(29, 78, 216, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Icon sx={{ color: "#1d4ed8", fontSize: 22 }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#1e293b" }}>
            {title}
        </Typography>
    </Stack>
);

function InfoRow({ label, value }) {
    return (
        <Box sx={{ py: 1.25, borderBottom: "1px solid #f1f5f9", "&:last-of-type": { borderBottom: 0 } }}>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 0.25 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ color: "#1e293b" }}>
                {value || "—"}
            </Typography>
        </Box>
    );
}

function toIsoUploadDateForPut(raw) {
    if (raw == null || raw === "") return new Date().toISOString();
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw.length >= 3) {
        const [y, mo, d, h = 0, mi = 0, s = 0, nano = 0] = raw;
        const ms = Number.isFinite(nano) ? Math.floor(nano / 1e6) : 0;
        return new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms)).toISOString();
    }
    return new Date().toISOString();
}

function imageItemIsUsage(item) {
    if (item == null) return true;
    if (typeof item.isUsage === "boolean") return item.isUsage;
    if (typeof item.usage === "boolean") return item.usage;
    return true;
}

export default function SchoolProfile() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [policyDetailProvided, setPolicyDetailProvided] = useState(false);
    const [formValues, setFormValues] = useState({
        campusName: "",
        phoneNumber: "",
        policyDetail: "",
        address: "",
        schoolName: "",
        schoolDescription: "",
        logoUrl: "",
        websiteUrl: "",
        representativeName: "",
        hotline: "",
        businessLicenseUrl: "",
        foundingDate: "",
        coverUrl: "",
        itemList: [],
        facilityOverview: "",
        facilityItemList: [],
    });

    const hydrateFromBody = useCallback((body) => {
        if (body == null) return;
        setProfile(body);
        const campus = body?.campus || {};
        const hasPolicyDetail = Object.prototype.hasOwnProperty.call(campus, "policyDetail");
        setPolicyDetailProvided(hasPolicyDetail);
        const legacySchoolData = campus.schoolData || {};
        const facilityJson = campus.facilityJson || campus.facility || {};
        const imageJson = campus.imageJson || {};
        const list = Array.isArray(imageJson.itemList) ? imageJson.itemList : [];
        const facilityList = Array.isArray(facilityJson.itemList) ? facilityJson.itemList : [];
        const schoolName = campus.schoolName || legacySchoolData.name || "";
        setFormValues({
            campusName: campus.name || "",
            phoneNumber: campus.phoneNumber || "",
            policyDetail: campus.policyDetail || "",
            address: campus.address || "",
            schoolName: schoolName || "",
            schoolDescription: campus.schoolDescription ?? legacySchoolData.description ?? "",
            logoUrl: campus.logoUrl ?? legacySchoolData.logoUrl ?? "",
            websiteUrl: campus.websiteUrl ?? legacySchoolData.websiteUrl ?? "",
            representativeName: campus.representativeName ?? legacySchoolData.representativeName ?? "",
            hotline: campus.hotline ?? legacySchoolData.hotline ?? "",
            businessLicenseUrl: campus.businessLicenseUrl ?? legacySchoolData.businessLicenseUrl ?? "",
            foundingDate: campus.foundingDate ?? legacySchoolData.foundingDate ?? "",
            coverUrl: imageJson.coverUrl || "",
            itemList: list.map((item) => ({
                name: item.name || "",
                url: item.url || "",
                altName: item.altName || "",
                isUsage: imageItemIsUsage(item),
                uploadDate: item.uploadDate,
            })),
            facilityOverview: facilityJson.overview || "",
            facilityItemList: facilityList.map((f) => ({
                facilityCode: f.facilityCode || "",
                name: f.name || "",
                value: f.value || "",
                unit: f.unit || "",
                category: f.category || "",
            })),
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getProfile();
                if (res?.status === 200) {
                    hydrateFromBody(res?.data?.body);
                } else {
                    enqueueSnackbar(res?.data?.message || "Không tải được thông tin hồ sơ", { variant: "error" });
                }
            } catch {
                enqueueSnackbar("Không tải được thông tin hồ sơ", { variant: "error" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [hydrateFromBody]);

    const handleImageItemChange = (index, field) => (e) => {
        const next = formValues.itemList.map((item, i) => (i === index ? { ...item, [field]: e.target.value } : item));
        setFormValues((p) => ({ ...p, itemList: next }));
    };

    const handleAddImageItem = () => {
        setFormValues((p) => ({
            ...p,
            itemList: [...p.itemList, { name: "", url: "", altName: "", isUsage: true }],
        }));
    };

    const handleRemoveImageItem = (index) => {
        setFormValues((p) => ({ ...p, itemList: p.itemList.filter((_, i) => i !== index) }));
    };

    const handleFacilityItemChange = (index, field) => (e) => {
        const next = formValues.facilityItemList.map((item, i) => (i === index ? { ...item, [field]: e.target.value } : item));
        setFormValues((p) => ({ ...p, facilityItemList: next }));
    };

    const handleAddFacilityItem = () => {
        setFormValues((p) => ({
            ...p,
            facilityItemList: [...p.facilityItemList, { facilityCode: "", name: "", value: "", unit: "", category: "" }],
        }));
    };

    const handleRemoveFacilityItem = (index) => {
        setFormValues((p) => ({ ...p, facilityItemList: p.facilityItemList.filter((_, i) => i !== index) }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const itemListPayload = formValues.itemList
                .filter((item) => item.url?.trim())
                .map((item) => ({
                    name: item.name?.trim() || "",
                    url: item.url?.trim() || "",
                    altName: item.altName?.trim() || "",
                    uploadDate: toIsoUploadDateForPut(item.uploadDate),
                    isUsage: item.isUsage !== false,
                }));
            const facilityItemListPayload = formValues.facilityItemList.map((item) => ({
                facilityCode: item.facilityCode?.trim() || "",
                name: item.name?.trim() || "",
                value: item.value?.trim() || "",
                unit: item.unit?.trim() || "",
                category: item.category?.trim() || "",
            }));

            const hasImages = !!formValues.coverUrl?.trim() || itemListPayload.length > 0;
            const payload = {
                campusData: {
                    name: formValues.campusName?.trim() || "",
                    phoneNumber: formValues.phoneNumber?.trim() || "",
                    policyDetail: policyDetailProvided ? formValues.policyDetail?.trim() || "" : "",
                    address: formValues.address?.trim() || "",
                    schoolData: {
                        description: formValues.schoolDescription?.trim() || "",
                        logoUrl: formValues.logoUrl?.trim() || "",
                        websiteUrl: formValues.websiteUrl?.trim() || "",
                        representativeName: formValues.representativeName?.trim() || "",
                        hotline: formValues.hotline?.trim() || "",
                        businessLicenseUrl: formValues.businessLicenseUrl?.trim() || "",
                        foundingDate: formValues.foundingDate?.trim() || "",
                    },
                    facilityJson: {
                        overview: formValues.facilityOverview?.trim() || "",
                        itemList: facilityItemListPayload,
                    },
                    ...(hasImages
                        ? {
                              imageJson: {
                                  coverUrl: formValues.coverUrl?.trim() || "",
                                  itemList: itemListPayload,
                              },
                          }
                        : {}),
                },
            };
            const res = await updateProfile(payload);
            if (res?.status === 200) {
                enqueueSnackbar("Cập nhật hồ sơ thành công", { variant: "success" });
                setEditOpen(false);
                const putBody = res.data?.body;
                if (putBody) {
                    hydrateFromBody(putBody);
                } else {
                    const fresh = await getProfile();
                    if (fresh?.status === 200) hydrateFromBody(fresh?.data?.body);
                }
            } else {
                enqueueSnackbar("Cập nhật thất bại", { variant: "error" });
            }
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || "Cập nhật thất bại", { variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const campus = profile?.campus || {};
    const facility = campus.facility ?? campus.facilityJson ?? { overview: "", itemList: [] };
    const facilityItemList = facility.itemList ?? [];

    if (loading) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", pb: 4 }}>
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", pb: 4 }}>
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
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                bgcolor: "rgba(255,255,255,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                overflow: "hidden",
                            }}
                        >
                            {formValues.logoUrl ? (
                                <Box component="img" src={formValues.logoUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                            ) : null}
                            {!formValues.logoUrl && <SchoolIcon sx={{ fontSize: 36 }} />}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                                {campus.schoolName || campus.name || "Hồ sơ trường"}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                                Quản lý thông tin và cài đặt tài khoản
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                                <Chip label="Trường học" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }} />
                                {campus.status === "VERIFIED" && (
                                    <Chip icon={<VerifiedUserIcon sx={{ fontSize: 16, color: "white !important" }} />} label="Đã xác thực" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }} />
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => setEditOpen(true)}
                        sx={{
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#0D64DE",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                            "&:hover": { bgcolor: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.2)" },
                        }}
                    >
                        Chỉnh sửa hồ sơ
                    </Button>
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={PersonIcon} title="Thông tin liên hệ" />
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <InfoRow label="Tên trường" value={campus.schoolName} />
                        <InfoRow label="Mô tả trường" value={campus.schoolDescription ?? campus.schoolData?.description} />
                        <InfoRow label="Cơ sở" value={campus.name} />
                        <InfoRow label="Email" value={profile?.email} />
                        <InfoRow label="Số điện thoại" value={campus.phoneNumber} />
                        <InfoRow label="Đại diện" value={campus.representativeName ?? campus.schoolData?.representativeName} />
                        <InfoRow label="Hotline" value={campus.hotline ?? campus.schoolData?.hotline} />
                        <InfoRow label="Website URL" value={campus.websiteUrl ?? campus.schoolData?.websiteUrl} />
                        <InfoRow label="Giấy phép kinh doanh" value={campus.businessLicenseUrl ?? campus.schoolData?.businessLicenseUrl} />
                        <InfoRow label="Ngày thành lập" value={campus.foundingDate ?? campus.schoolData?.foundingDate} />
                    </Box>
                </CardContent>
            </Card>

            {(campus.imageJson?.coverUrl || (campus.imageJson?.itemList?.length > 0)) && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <SectionHeader icon={AddPhotoAlternateIcon} title="Hình ảnh cơ sở" />
                        {campus.imageJson?.coverUrl && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1 }}>
                                    Ảnh bìa
                                </Typography>
                                <Box
                                    component="img"
                                    src={campus.imageJson.coverUrl}
                                    alt="Ảnh bìa"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                    sx={{
                                        width: "100%",
                                        maxHeight: 280,
                                        objectFit: "cover",
                                        borderRadius: 2,
                                        border: "1px solid #e2e8f0",
                                    }}
                                />
                            </Box>
                        )}
                        {campus.imageJson?.itemList?.length > 0 && (
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1 }}>
                                    Danh sách ảnh
                                </Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 2 }}>
                                    {campus.imageJson.itemList.map((item, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                border: "1px solid #e2e8f0",
                                                bgcolor: "#f8fafc",
                                                aspectRatio: "1",
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={item.url}
                                                alt={item.altName || item.name || "Ảnh"}
                                                onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' fill='%23e2e8f0'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12'%3E?%3C/text%3E%3C/svg%3E"; }}
                                                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                            {(item.name || item.altName) && (
                                                <Typography variant="caption" sx={{ display: "block", p: 1, color: "#64748b" }} noWrap>
                                                    {item.name || item.altName}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {(facility?.overview || facilityItemList.length > 0) && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <SectionHeader icon={SettingsIcon} title="Cơ sở vật chất" />
                        {facility?.overview && <InfoRow label="Tổng quan" value={facility.overview} />}
                        {facilityItemList.length > 0 ? (
                            <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
                                {facilityItemList.map((item, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            border: "1px solid #e2e8f0",
                                            bgcolor: "#f8fafc",
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {item.name || item.facilityCode || "Facility"}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#1e293b" }}>
                                            {item.value || "—"}
                                            {item.unit ? ` ${item.unit}` : ""}
                                        </Typography>
                                        {(item.category || item.facilityCode) && (
                                            <Typography variant="caption" sx={{ display: "block", color: "#64748b", mt: 0.5 }}>
                                                {item.category ? `Category: ${item.category}` : `Code: ${item.facilityCode}`}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Chưa có dữ liệu facility.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={LocationOnIcon} title="Địa chỉ" />
                    <InfoRow label="Địa chỉ" value={campus.address} />
                    <Box
                        sx={{
                            mt: 2,
                            height: 180,
                            borderRadius: 2,
                            bgcolor: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px dashed #e2e8f0",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Bản đồ (tích hợp sau)
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={SettingsIcon} title="Cài đặt tài khoản" />
                    <Button variant="outlined" startIcon={<LockIcon />} size="medium" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                        Đổi mật khẩu
                    </Button>
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={TimelineIcon} title="Hoạt động gần đây" />
                    <Box sx={{ py: 4, display: "flex", flexDirection: "column", alignItems: "center", color: "#94a3b8" }}>
                        <TimelineIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
                        <Typography variant="body2">Chưa có hoạt động nào</Typography>
                    </Box>
                </CardContent>
            </Card>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Chỉnh sửa hồ sơ
                    <IconButton onClick={() => setEditOpen(false)} size="small" aria-label="Đóng">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: "85vh" }}>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        <TextField
                            label="Tên trường"
                            value={formValues.schoolName}
                            onChange={(e) => setFormValues((p) => ({ ...p, schoolName: e.target.value }))}
                            fullWidth
                            size="small"
                            disabled
                        />
                        <TextField label="Tên cơ sở" value={formValues.campusName} onChange={(e) => setFormValues((p) => ({ ...p, campusName: e.target.value }))} fullWidth size="small" />
                        <TextField label="Số điện thoại" value={formValues.phoneNumber} onChange={(e) => setFormValues((p) => ({ ...p, phoneNumber: e.target.value }))} fullWidth size="small" />
                        <TextField label="Địa chỉ" value={formValues.address} onChange={(e) => setFormValues((p) => ({ ...p, address: e.target.value }))} fullWidth size="small" multiline rows={2} />
                        <TextField label="Mô tả chính sách" value={formValues.policyDetail} onChange={(e) => setFormValues((p) => ({ ...p, policyDetail: e.target.value }))} fullWidth size="small" multiline rows={2} placeholder="policyDetail" />
                        <TextField label="Mô tả trường" value={formValues.schoolDescription} onChange={(e) => setFormValues((p) => ({ ...p, schoolDescription: e.target.value }))} fullWidth size="small" multiline rows={2} placeholder="schoolDescription" />
                        <TextField label="Website URL" value={formValues.websiteUrl} onChange={(e) => setFormValues((p) => ({ ...p, websiteUrl: e.target.value }))} fullWidth size="small" placeholder="https://..." />
                        <TextField label="Đại diện" value={formValues.representativeName} onChange={(e) => setFormValues((p) => ({ ...p, representativeName: e.target.value }))} fullWidth size="small" />
                        <TextField label="Hotline" value={formValues.hotline} onChange={(e) => setFormValues((p) => ({ ...p, hotline: e.target.value }))} fullWidth size="small" />
                        <TextField label="Ngày thành lập" type="date" InputLabelProps={{ shrink: true }} value={formValues.foundingDate} onChange={(e) => setFormValues((p) => ({ ...p, foundingDate: e.target.value }))} fullWidth size="small" />
                        <Box>
                            <TextField
                                label="Ảnh giấy phép kinh doanh"
                                value={formValues.businessLicenseUrl}
                                onChange={(e) => setFormValues((p) => ({ ...p, businessLicenseUrl: e.target.value }))}
                                fullWidth
                                size="small"
                                placeholder="URL ảnh hoặc tải JPG/PNG"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <CloudinaryUpload
                                                inputId="school-profile-business-license"
                                                accept="image/*"
                                                multiple={false}
                                                onSuccess={([f]) => {
                                                    if (f?.url) {
                                                        setFormValues((p) => ({ ...p, businessLicenseUrl: f.url }));
                                                        enqueueSnackbar("Đã tải ảnh lên", { variant: "success" });
                                                    }
                                                }}
                                                onError={(m) => enqueueSnackbar(m, { variant: "error" })}
                                            >
                                                {({ inputId, loading }) => (
                                                    <IconButton
                                                        component="label"
                                                        htmlFor={inputId}
                                                        disabled={loading}
                                                        size="small"
                                                        sx={{
                                                            borderRadius: 1,
                                                            bgcolor: loading ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                                        }}
                                                    >
                                                        <CloudUploadIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </CloudinaryUpload>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Box>
                            <TextField
                                label="URL logo"
                                value={formValues.logoUrl}
                                onChange={(e) => setFormValues((p) => ({ ...p, logoUrl: e.target.value }))}
                                fullWidth
                                size="small"
                                placeholder="https://..."
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <CloudinaryUpload
                                                inputId="school-profile-logo"
                                                accept="image/*"
                                                multiple={false}
                                                onSuccess={([f]) => {
                                                    if (f?.url) {
                                                        setFormValues((p) => ({ ...p, logoUrl: f.url }));
                                                        enqueueSnackbar("Đã tải logo lên Cloudinary", { variant: "success" });
                                                    }
                                                }}
                                                onError={(m) => enqueueSnackbar(m, { variant: "error" })}
                                            >
                                                {({ inputId, loading }) => (
                                                    <IconButton
                                                        component="label"
                                                        htmlFor={inputId}
                                                        disabled={loading}
                                                        size="small"
                                                        sx={{
                                                            borderRadius: 1,
                                                            bgcolor: loading ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                                        }}
                                                    >
                                                        <CloudUploadIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </CloudinaryUpload>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1e293b", pt: 1 }}>
                            Hình ảnh (imageJson)
                        </Typography>
                        <Box>
                            <TextField
                                label="URL ảnh bìa (coverUrl)"
                                value={formValues.coverUrl}
                                onChange={(e) => setFormValues((p) => ({ ...p, coverUrl: e.target.value }))}
                                fullWidth
                                size="small"
                                placeholder="https://..."
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <CloudinaryUpload
                                                inputId="school-profile-cover"
                                                accept="image/*"
                                                multiple={false}
                                                onSuccess={([f]) => {
                                                    if (f?.url) {
                                                        setFormValues((p) => ({ ...p, coverUrl: f.url }));
                                                        enqueueSnackbar("Đã tải ảnh bìa lên Cloudinary", { variant: "success" });
                                                    }
                                                }}
                                                onError={(m) => enqueueSnackbar(m, { variant: "error" })}
                                            >
                                                {({ inputId, loading }) => (
                                                    <IconButton
                                                        component="label"
                                                        htmlFor={inputId}
                                                        disabled={loading}
                                                        size="small"
                                                        sx={{
                                                            borderRadius: 1,
                                                            bgcolor: loading ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                                        }}
                                                    >
                                                        <CloudUploadIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </CloudinaryUpload>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>

                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                    Danh sách ảnh (itemList)
                                </Typography>
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={handleAddImageItem} sx={{ textTransform: "none", fontWeight: 600 }}>
                                    Thêm ảnh
                                </Button>
                            </Box>
                            <Stack spacing={2}>
                                {formValues.itemList.map((item, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: "1px solid #e2e8f0",
                                            bgcolor: "#f8fafc",
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                <IconButton size="small" onClick={() => handleRemoveImageItem(index)} aria-label="Xóa ảnh" sx={{ color: "#64748b" }}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            <TextField label="URL ảnh" value={item.url} onChange={handleImageItemChange(index, "url")} fullWidth size="small" placeholder="https://..." />
                                            <CloudinaryUpload
                                                inputId={`school-profile-gallery-${index}`}
                                                accept="image/*"
                                                multiple={false}
                                                onSuccess={([f]) => {
                                                    if (!f?.url) return;
                                                    const next = formValues.itemList.map((it, i) =>
                                                        i === index ? { ...it, url: f.url } : it
                                                    );
                                                    setFormValues((p) => ({ ...p, itemList: next }));
                                                    enqueueSnackbar("Đã tải ảnh lên Cloudinary", { variant: "success" });
                                                }}
                                                onError={(m) => enqueueSnackbar(m, { variant: "error" })}
                                            >
                                                {({ inputId, loading }) => (
                                                    <Button
                                                        component="label"
                                                        htmlFor={inputId}
                                                        disabled={loading}
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<CloudUploadIcon />}
                                                        sx={{ textTransform: "none", alignSelf: "flex-start" }}
                                                    >
                                                        {loading ? "Đang tải..." : "Tải ảnh (Cloudinary)"}
                                                    </Button>
                                                )}
                                            </CloudinaryUpload>
                                            <TextField label="Tên" value={item.name} onChange={handleImageItemChange(index, "name")} fullWidth size="small" />
                                            <TextField label="Alt / Mô tả" value={item.altName} onChange={handleImageItemChange(index, "altName")} fullWidth size="small" />
                                        </Stack>
                                    </Box>
                                ))}
                                {formValues.itemList.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                                        Chưa có ảnh. Bấm &quot;Thêm ảnh&quot; để thêm.
                                    </Typography>
                                )}
                            </Stack>
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1e293b", pt: 1 }}>
                            Cơ sở vật chất (facilityJson)
                        </Typography>
                        <TextField
                            label="Overview"
                            value={formValues.facilityOverview}
                            onChange={(e) => setFormValues((p) => ({ ...p, facilityOverview: e.target.value }))}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />

                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                    Danh sách facility (itemList)
                                </Typography>
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={handleAddFacilityItem} sx={{ textTransform: "none", fontWeight: 600 }}>
                                    Thêm facility
                                </Button>
                            </Box>
                            <Stack spacing={2}>
                                {formValues.facilityItemList.map((item, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: "1px solid #e2e8f0",
                                            bgcolor: "#f8fafc",
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                <IconButton size="small" onClick={() => handleRemoveFacilityItem(index)} aria-label="Xóa facility" sx={{ color: "#64748b" }}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                                                <TextField label="Facility code" value={item.facilityCode} onChange={handleFacilityItemChange(index, "facilityCode")} fullWidth size="small" />
                                                <TextField label="Tên" value={item.name} onChange={handleFacilityItemChange(index, "name")} fullWidth size="small" />
                                                <TextField label="Giá trị" value={item.value} onChange={handleFacilityItemChange(index, "value")} fullWidth size="small" />
                                                <TextField label="Đơn vị" value={item.unit} onChange={handleFacilityItemChange(index, "unit")} fullWidth size="small" />
                                                <TextField
                                                    label="Category"
                                                    value={item.category}
                                                    onChange={handleFacilityItemChange(index, "category")}
                                                    fullWidth
                                                    size="small"
                                                    sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
                                                />
                                            </Box>
                                        </Stack>
                                    </Box>
                                ))}
                                {formValues.facilityItemList.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                                        Chưa có facility. Bấm &quot;Thêm facility&quot; để thêm.
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setEditOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveProfile} disabled={saving} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#1d4ed8", "&:hover": { bgcolor: "#1e40af" } }}>
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
