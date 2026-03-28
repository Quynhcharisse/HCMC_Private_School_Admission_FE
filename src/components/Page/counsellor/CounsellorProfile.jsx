import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import TimelineIcon from "@mui/icons-material/Timeline";
import CloseIcon from "@mui/icons-material/Close";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SchoolIcon from "@mui/icons-material/School";
import BadgeIcon from "@mui/icons-material/Badge";
import LockIcon from "@mui/icons-material/Lock";
import { enqueueSnackbar } from "notistack";
import { getProfile, updateProfile } from "../../../services/AccountService.jsx";

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
        {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
      </Typography>
    </Box>
  );
}

function normalizeProfileBody(raw) {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function formatAccountStatus(status) {
  if (!status) return "";
  const map = {
    ACCOUNT_ACTIVE: "Đang hoạt động",
    ACCOUNT_INACTIVE: "Không hoạt động",
    ACCOUNT_SUSPENDED: "Tạm khóa",
  };
  return map[status] || status;
}

export default function CounsellorProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
  });

  const fetchProfile = useCallback(async ({ showFullSkeleton = true } = {}) => {
    if (showFullSkeleton) setLoading(true);
    try {
      const res = await getProfile();
      if (res?.status !== 200) {
        enqueueSnackbar(res?.data?.message || "Không tải được thông tin hồ sơ", { variant: "error" });
        setProfile(null);
        return;
      }
      const body = normalizeProfileBody(res?.data?.body);
      setProfile(body);
      const c = body.counsellor || {};
      setFormValues({
        name: c.name || "",
      });
      setAvatarLoadError(false);
    } catch {
      enqueueSnackbar("Không tải được thông tin hồ sơ", { variant: "error" });
    } finally {
      if (showFullSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile({ showFullSkeleton: true });
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    const trimmed = formValues.name?.trim() || "";
    if (!trimmed) {
      enqueueSnackbar("Vui lòng nhập họ và tên", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const requestBody = {
        counsellorData: {
          name: trimmed,
        },
      };
      const res = await updateProfile(requestBody);
      if (res?.status === 200) {
        enqueueSnackbar(res?.data?.message || "Cập nhật hồ sơ thành công", { variant: "success" });
        setEditOpen(false);
        await fetchProfile({ showFullSkeleton: false });
      } else {
        enqueueSnackbar(res?.data?.message || "Cập nhật thất bại", { variant: "error" });
      }
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Cập nhật thất bại", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const counsellor = profile?.counsellor || {};
  const displayName = counsellor.name || profile?.email || "Tư vấn viên";
  // GET /account/profile (COUNSELLOR): ảnh nằm trong counsellor.avatar; giữ fallback picture nếu BE cũ còn gửi.
  const picture = counsellor.avatar ?? profile?.picture;

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
              {picture && !avatarLoadError ? (
                <Box
                  component="img"
                  src={picture}
                  alt=""
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <SupportAgentIcon sx={{ fontSize: 36 }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                {displayName}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                Quản lý thông tin và cài đặt tài khoản tư vấn
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                <Chip
                  label="Tư vấn viên"
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }}
                />
              </Stack>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              setFormValues({ name: counsellor.name || "" });
              setEditOpen(true);
            }}
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
          <SectionHeader icon={PersonIcon} title="Tài khoản" />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <InfoRow label="Email" value={profile?.email} />
            <InfoRow label="Vai trò" value={profile?.role === "COUNSELLOR" ? "Tư vấn viên" : profile?.role} />
            <InfoRow label="Trạng thái" value={formatAccountStatus(profile?.status)} />
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
          <SectionHeader icon={BadgeIcon} title="Thông tin tư vấn viên" />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <InfoRow label="Họ và tên" value={counsellor.name} />
            <InfoRow label="Mã nhân viên" value={counsellor.employeeCode} />
          </Box>
        </CardContent>
      </Card>

      {(counsellor.campusName != null && counsellor.campusName !== "") || counsellor.campusId != null ? (
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
            <SectionHeader icon={SchoolIcon} title="Cơ sở làm việc" />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <InfoRow label="Tên cơ sở" value={counsellor.campusName} />
              <InfoRow label="Mã cơ sở (campusId)" value={counsellor.campusId} />
            </Box>
          </CardContent>
        </Card>
      ) : null}

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
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            size="medium"
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
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
              label="Họ và tên"
              value={formValues.name}
              onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
              required
            />
            <TextField label="Email" value={profile?.email || ""} fullWidth size="small" disabled helperText="Email do hệ thống gán, không chỉnh sửa tại đây" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: "#1d4ed8",
              "&:hover": { bgcolor: "#1e40af" },
            }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
