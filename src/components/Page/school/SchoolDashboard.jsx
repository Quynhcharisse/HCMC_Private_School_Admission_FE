import React from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LaunchOutlinedIcon from "@mui/icons-material/LaunchOutlined";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getSchoolFavouriteParents, getParentStudentDetailById } from "../../../services/SchoolService.jsx";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage.js";
import { useNavigate } from "react-router-dom";

const statCards = [
    {
        label: "Tổng số cơ sở",
        value: 4,
        trend: "+5% tuần này",
        icon: <ApartmentIcon sx={{fontSize: 28}}/>,
        color: "#2563eb",
    },
    {
        label: "Tổng số tư vấn viên",
        value: 12,
        trend: "+2% tuần này",
        icon: <PeopleAltIcon sx={{fontSize: 28}}/>,
        color: "#0ea5e9",
    },
    {
        label: "Chiến dịch đang hoạt động",
        value: 2,
        trend: "+1 chiến dịch mới",
        icon: <CampaignIcon sx={{fontSize: 28}}/>,
        color: "#22c55e",
    },
    {
        label: "Yêu cầu tư vấn",
        value: 28,
        trend: "+5 yêu cầu mới",
        icon: <ChatBubbleOutlineIcon sx={{fontSize: 28}}/>,
        color: "#f97316",
    },
    {
        label: "Học sinh đã đăng ký",
        value: 65,
        trend: "+8% tuần này",
        icon: <SchoolIcon sx={{fontSize: 28}}/>,
        color: "#2563eb",
    },
];

const todayString = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const toGenderLabel = (value) => {
    const v = String(value || "").toUpperCase();
    if (v === "MALE") return "Nam";
    if (v === "FEMALE") return "Nữ";
    return "-";
};

const toRelationshipLabel = (value) => {
    const v = String(value || "").toUpperCase();
    if (v === "FATHER") return "Cha";
    if (v === "MOTHER") return "Mẹ";
    if (v === "GUARDIAN") return "Người giám hộ";
    return String(value || "-");
};

const normalizeChildren = (parent) => {
    const children = Array.isArray(parent?.children) ? parent.children : [];
    return children.map((child, index) => ({
        id: child?.id ?? `child-${parent?.id ?? "unknown"}-${index}`,
        name: String(child?.name || "Học sinh chưa có tên"),
        gender: child?.gender || "",
    }));
};

const getInitials = (name) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(-2)
        .join("")
        .toUpperCase() || "PH";

const toSubjectTypeLabel = (value) => {
    const v = String(value || "").toLowerCase();
    if (v === "regular") return "Môn chính";
    if (v === "foreign_language") return "Ngoại ngữ";
    return String(value || "-");
};

const getScoreTone = (score, isAvailable) => {
    if (!isAvailable) return { label: "N/A", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };

    const numeric = Number(score);
    if (!Number.isFinite(numeric)) return { label: "-", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };

    if (numeric >= 8) return { label: String(numeric), bg: "#dcfce7", color: "#166534", border: "#86efac" };
    if (numeric >= 6.5) return { label: String(numeric), bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" };
    if (numeric >= 5) return { label: String(numeric), bg: "#fef3c7", color: "#a16207", border: "#fcd34d" };
    return { label: String(numeric), bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" };
};

export default function SchoolDashboard() {
    const navigate = useNavigate();
    const { isPrimaryBranch, loading: schoolCtxLoading } = useSchool();

    const [parents, setParents] = React.useState([]);
    const [loadingParents, setLoadingParents] = React.useState(false);
    const [parentsError, setParentsError] = React.useState("");

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState("");
    const [studentDetail, setStudentDetail] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;

        if (schoolCtxLoading || !isPrimaryBranch) {
            setParents([]);
            setParentsError("");
            return undefined;
        }

        const loadParents = async () => {
            setLoadingParents(true);
            setParentsError("");
            try {
                const list = await getSchoolFavouriteParents();
                if (!cancelled) {
                    setParents(Array.isArray(list) ? list : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setParents([]);
                    setParentsError(getApiErrorMessage(error, "Không tải được danh sách phụ huynh quan tâm trường."));
                }
            } finally {
                if (!cancelled) setLoadingParents(false);
            }
        };

        loadParents();

        return () => {
            cancelled = true;
        };
    }, [isPrimaryBranch, schoolCtxLoading]);

    const handleOpenChildDetail = async (parent, child) => {
        setSelectedChild({
            id: child?.id,
            name: child?.name,
            parentName: parent?.name,
        });
        setStudentDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setDetailOpen(true);

        try {
            const detail = await getParentStudentDetailById(child?.id);
            setStudentDetail(detail);
        } catch (error) {
            setDetailError(getApiErrorMessage(error, "Không tải được hồ sơ học sinh."));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseDetail = () => {
        setDetailOpen(false);
        setSelectedChild(null);
        setStudentDetail(null);
        setDetailError("");
        setDetailLoading(false);
    };

    const parentRows = React.useMemo(() => {
        return (Array.isArray(parents) ? parents : []).map((parent) => ({
            ...parent,
            normalizedChildren: normalizeChildren(parent),
        }));
    }, [parents]);

    const recentParentRows = React.useMemo(() => {
        const toScore = (parent) => {
            const rawDate =
                parent?.createdAt ??
                parent?.created_at ??
                parent?.createdDate ??
                parent?.updatedAt ??
                parent?.updated_at ??
                null;
            const t = rawDate ? Date.parse(rawDate) : NaN;
            if (Number.isFinite(t)) return t;
            const idNum = Number(parent?.id);
            return Number.isFinite(idNum) ? idNum : 0;
        };

        return [...parentRows].sort((a, b) => toScore(b) - toScore(a)).slice(0, 5);
    }, [parentRows]);

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 4, width: "100%", pb: 4}}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.25)",
                    color: "white",
                    overflow: "hidden",
                }}
            >
                <CardContent
                    sx={{
                        p: {xs: 3, md: 4},
                        display: "flex",
                        flexDirection: {xs: "column", md: "row"},
                        alignItems: {xs: "flex-start", md: "center"},
                        justifyContent: "space-between",
                        gap: 3,
                    }}
                >
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{letterSpacing: "0.16em", opacity: 0.9, fontSize: 11}}
                        >
                            OVERVIEW DASHBOARD
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                mt: 1,
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                textShadow: "0 1px 3px rgba(51,65,85,0.4)",
                            }}
                        >
                            Chào mừng bạn trở lại
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{mt: 1, opacity: 0.92, maxWidth: 520, lineHeight: 1.6}}
                        >
                            Đây là tổng quan nhanh về hoạt động tuyển sinh, tư vấn và học sinh trong hệ
                            thống EduBridgeHCM của trường bạn.
                        </Typography>
                        <Typography variant="body2" sx={{mt: 2, opacity: 0.9}}>
                            <strong>Hôm nay:</strong> {todayString}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            alignItems: {xs: "flex-start", md: "flex-end"},
                        }}
                    >
                        <Typography variant="body2" sx={{opacity: 0.9}}>
                            Truy cập nhanh
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1.5}
                            sx={{alignItems: {xs: "stretch", sm: "center"}}}
                        >
                            <Button
                                variant="contained"
                                startIcon={<AddCircleOutlineIcon/>}
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 3,
                                    py: 1,
                                    bgcolor: "rgba(51,65,85,0.9)",
                                    "&:hover": {
                                        bgcolor: "rgba(51,65,85,1)",
                                    },
                                }}
                            >
                                Tạo chiến dịch mới
                            </Button>
                            <Button
                                variant="outlined"
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 2.5,
                                    py: 1,
                                    borderColor: "rgba(255,255,255,0.7)",
                                    color: "white",
                                    "&:hover": {
                                        borderColor: "white",
                                        bgcolor: "rgba(51,65,85,0.25)",
                                    },
                                }}
                                endIcon={<ArrowForwardIosIcon sx={{fontSize: 14}}/>}
                            >
                                Xem yêu cầu tư vấn
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={2.5}>
                {statCards.map((card) => (
                    <Grid key={card.label} item xs={12} sm={6} md={4} lg={2.4}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                boxShadow: "0 10px 30px rgba(51,65,85,0.08)",
                                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 16px 40px rgba(51,65,85,0.14)",
                                },
                            }}
                        >
                            <CardContent sx={{p: 2.5}}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#64748b",
                                                textTransform: "uppercase",
                                                fontSize: 11,
                                                letterSpacing: "0.08em",
                                            }}
                                        >
                                            {card.label}
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                mt: 0.5,
                                                fontWeight: 800,
                                                color: "#1e293b",
                                                letterSpacing: "-0.04em",
                                            }}
                                        >
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            bgcolor: `${card.color}12`,
                                            color: card.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{mt: 1.5}}>
                                    <TrendingUpIcon sx={{fontSize: 18, color: "#16a34a"}}/>
                                    <Typography variant="caption" sx={{color: "#16a34a", fontWeight: 500}}>
                                        {card.trend}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            boxShadow: "0 10px 30px rgba(51,65,85,0.08)",
                            transition: "transform 0.18s ease, box-shadow 0.18s ease",
                            "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: "0 16px 40px rgba(51,65,85,0.14)",
                            },
                        }}
                    >
                        <CardContent sx={{p: 2.5}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: "#64748b",
                                            textTransform: "uppercase",
                                            fontSize: 11,
                                            letterSpacing: "0.08em",
                                        }}
                                    >
                                        Phụ huynh quan tâm
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            mt: 0.5,
                                            fontWeight: 800,
                                            color: "#1e293b",
                                            letterSpacing: "-0.04em",
                                        }}
                                    >
                                        {schoolCtxLoading || loadingParents ? "..." : parentRows.length}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: "#14b8a612",
                                        color: "#14b8a6",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <PeopleAltIcon sx={{fontSize: 28}}/>
                                </Box>
                            </Stack>

                            <Typography variant="caption" sx={{display: "block", mt: 1.5, color: "#64748b", fontWeight: 500}}>
                                {schoolCtxLoading || loadingParents
                                    ? "Đang đồng bộ dữ liệu yêu thích"
                                    : !isPrimaryBranch
                                        ? "Campus phụ không có quyền xem"
                                        : parentsError
                                            ? "Không tải được dữ liệu"
                                            : "Từ danh sách trường yêu thích"}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                <Grid item xs={12} md={6} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Yêu cầu tư vấn theo thời gian
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <TimelineIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ minh họa – sẽ thay bằng dữ liệu thực khi API sẵn sàng.
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    height: 180,
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
                                    position: "relative",
                                    overflow: "hidden",
                                    px: 1,
                                    display: "flex",
                                    alignItems: "flex-end",
                                    gap: 1,
                                }}
                            >
                                {[30, 60, 45, 80, 55, 90, 70].map((h, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 999,
                                            bgcolor: "linear-gradient(180deg, #0D64DE, #7AA9EB)",
                                            background: "linear-gradient(180deg, #0D64DE, #7AA9EB)",
                                            height: `${h}%`,
                                            opacity: 0.9,
                                        }}
                                    />
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Học sinh đăng ký theo cơ sở
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <BarChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ cột minh họa cho số lượng học sinh ở từng cơ sở.
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    height: 180,
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-around",
                                    px: 1,
                                }}
                            >
                                {[
                                    {label: "Chính", value: 80},
                                    {label: "Cơ sở 2", value: 55},
                                    {label: "Cơ sở 3", value: 40},
                                ].map((bar) => (
                                    <Box
                                        key={bar.label}
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 26,
                                                borderRadius: 1.5,
                                                bgcolor: "#0D64DE",
                                                height: `${bar.value}%`,
                                            }}
                                        />
                                        <Typography variant="caption" sx={{color: "#64748b"}}>
                                            {bar.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            height: "100%",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Phân bố học sinh theo chiến dịch
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <PieChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ tròn minh họa tỉ lệ học sinh tham gia từng chiến dịch tuyển sinh.
                            </Typography>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2.5}
                                sx={{mt: 1, flexWrap: "wrap"}}
                            >
                                <Box
                                    sx={{
                                        width: 140,
                                        height: 140,
                                        borderRadius: "50%",
                                        background:
                                            "conic-gradient(#0D64DE 0 40%, #22c55e 40% 70%, #f97316 70% 100%)",
                                        position: "relative",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            inset: 14,
                                            borderRadius: "50%",
                                            bgcolor: "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{color: "#64748b"}}>
                                            Tổng
                                        </Typography>
                                        <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                            100%
                                        </Typography>
                                    </Box>
                                </Box>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#0D64DE"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Chiến dịch lớp 10 · 40%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Chiến dịch lớp 6 · 30%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#f97316"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Khác · 30%
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                <Grid item xs={12} md={8}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: "1px solid #dbeafe",
                            bgcolor: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 14px 36px rgba(30, 64, 175, 0.08)",
                            backgroundImage:
                                "radial-gradient(ellipse 130% 80% at 0% 0%, rgba(59,130,246,0.09) 0%, transparent 50%), radial-gradient(ellipse 130% 80% at 100% 100%, rgba(14,165,233,0.07) 0%, transparent 55%)",
                        }}
                    >
                        <CardContent sx={{p: { xs: 2, md: 3 }}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 2,
                                            bgcolor: "#dbeafe",
                                            color: "#1d4ed8",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <PeopleAltIcon sx={{ fontSize: 22 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em"}}>
                                            Phụ huynh quan tâm trường
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                                            Theo dõi danh sách phụ huynh đã lưu trường yêu thích
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Button
                                    size="small"
                                    variant="outlined"
                                    endIcon={<LaunchOutlinedIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => navigate("/school/parents-interest")}
                                    sx={{
                                        textTransform: "none",
                                        borderRadius: 999,
                                        borderColor: "#bfdbfe",
                                        color: "#1d4ed8",
                                        fontWeight: 700,
                                        px: 1.6,
                                        "&:hover": { borderColor: "#2563eb", bgcolor: "#eff6ff" },
                                    }}
                                >
                                    Xem tất cả
                                </Button>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#64748b", lineHeight: 1.65}}>
                                Dashboard hiển thị tối đa 5 phụ huynh mới nhất đã thêm trường vào yêu thích.
                            </Typography>

                            {schoolCtxLoading ? (
                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{py: 2}}>
                                    <CircularProgress size={20}/>
                                    <Typography variant="body2" sx={{color: "#64748b"}}>
                                        Đang xác định quyền campus...
                                    </Typography>
                                </Stack>
                            ) : !isPrimaryBranch ? (
                                <Alert severity="info" sx={{borderRadius: 2}}>
                                    Chỉ campus chính mới được xem danh sách phụ huynh quan tâm trường.
                                </Alert>
                            ) : loadingParents ? (
                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{py: 2}}>
                                    <CircularProgress size={20}/>
                                    <Typography variant="body2" sx={{color: "#64748b"}}>
                                        Đang tải danh sách phụ huynh...
                                    </Typography>
                                </Stack>
                            ) : parentsError ? (
                                <Alert severity="error" sx={{borderRadius: 2}}>
                                    {parentsError}
                                </Alert>
                            ) : recentParentRows.length === 0 ? (
                                <Alert severity="info" sx={{borderRadius: 2}}>
                                    Chưa có phụ huynh nào thêm trường vào danh sách yêu thích.
                                </Alert>
                            ) : (
                                <>
                                    <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#fff" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{bgcolor: "#f1f5f9"}}>
                                                    <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                        Phụ huynh
                                                    </TableCell>
                                                    <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                        Liên hệ
                                                    </TableCell>
                                                    <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                        Học sinh
                                                    </TableCell>
                                                    <TableCell sx={{fontWeight: 600, color: "#1e293b", minWidth: 180}}>
                                                        Xem hồ sơ
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recentParentRows.map((parent) => (
                                                <TableRow
                                                    key={String(parent.id ?? parent.phone ?? parent.name)}
                                                    hover
                                                    sx={{
                                                        "& td": { borderColor: "#e2e8f0" },
                                                        "&:hover": {
                                                            bgcolor: "#f8fbff",
                                                        },
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar
                                                                src={parent.avatar || undefined}
                                                                sx={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    bgcolor: "#0D64DE",
                                                                    fontSize: 14,
                                                                }}
                                                            >
                                                                {getInitials(parent.name)}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                                                    {parent.name || "Chưa có tên"}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{color: "#64748b"}}>
                                                                    {toRelationshipLabel(parent.relationship)} · {toGenderLabel(parent.gender)}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.2}>
                                                            <Typography variant="body2" sx={{color: "#1e293b"}}>
                                                                {parent.phone || "-"}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{color: "#64748b"}}>
                                                                {parent.currentAddress || parent.workplace || "-"}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.8}>
                                                            {parent.normalizedChildren.length === 0 ? (
                                                                <Typography variant="body2" sx={{color: "#64748b"}}>
                                                                    Chưa có hồ sơ học sinh
                                                                </Typography>
                                                            ) : (
                                                                parent.normalizedChildren.map((child) => (
                                                                    <Stack
                                                                        key={String(child.id)}
                                                                        direction="row"
                                                                        alignItems="center"
                                                                        spacing={1}
                                                                    >
                                                                        <Chip
                                                                            label={child.name}
                                                                            size="small"
                                                                            sx={{
                                                                                borderRadius: 999,
                                                                                bgcolor: "#eef2ff",
                                                                                color: "#3730a3",
                                                                                fontWeight: 600,
                                                                                border: "1px solid #c7d2fe",
                                                                            }}
                                                                        />
                                                                        <Typography variant="caption" sx={{color: "#64748b"}}>
                                                                            {toGenderLabel(child.gender)}
                                                                        </Typography>
                                                                    </Stack>
                                                                ))
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.8}>
                                                            {parent.normalizedChildren.length === 0 ? (
                                                                <Typography variant="caption" sx={{color: "#94a3b8"}}>
                                                                    Không có dữ liệu để xem
                                                                </Typography>
                                                            ) : (
                                                                parent.normalizedChildren.map((child) => (
                                                                    <Button
                                                                        key={`${String(parent.id ?? parent.phone ?? parent.name)}-${String(child.id)}`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        startIcon={<VisibilityOutlinedIcon/>}
                                                                        onClick={() => handleOpenChildDetail(parent, child)}
                                                                        sx={{
                                                                            justifyContent: "flex-start",
                                                                            textTransform: "none",
                                                                            borderRadius: 999,
                                                                            borderColor: "#bfdbfe",
                                                                            color: "#1e3a8a",
                                                                            fontWeight: 700,
                                                                            px: 1.6,
                                                                            "&:hover": {
                                                                                borderColor: "#2563eb",
                                                                                bgcolor: "#eff6ff",
                                                                                transform: "translateY(-1px)",
                                                                            },
                                                                        }}
                                                                    >
                                                                        {`Xem chi tiết: ${child.name}`}
                                                                    </Button>
                                                                ))
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            height: "100%",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b", mb: 2}}>
                                Thao tác nhanh
                            </Typography>
                            <Stack spacing={1.5}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ApartmentIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Tạo cơ sở
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<PeopleAltIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Thêm tư vấn viên
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<CampaignIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Tạo chiến dịch tuyển sinh
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ChatBubbleOutlineIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Xem yêu cầu tư vấn
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Dialog
                open={detailOpen}
                onClose={handleCloseDetail}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid #dbeafe",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        pb: 1.4,
                        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <Typography variant="h6" sx={{fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em"}}>
                        {`Chi tiết hồ sơ học sinh${selectedChild?.name ? ` - ${selectedChild.name}` : ""}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                        Student profile + academic profile
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{py: 2}}>
                            <CircularProgress size={20}/>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Đang tải chi tiết hồ sơ học sinh...
                            </Typography>
                        </Stack>
                    ) : detailError ? (
                        <Alert severity="error" sx={{borderRadius: 2}}>
                            {detailError}
                        </Alert>
                    ) : !studentDetail ? (
                        <Alert severity="info" sx={{borderRadius: 2}}>
                            Không có dữ liệu hồ sơ học sinh.
                        </Alert>
                    ) : (
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography variant="subtitle1" sx={{fontWeight: 700, color: "#1e293b", mb: 1}}>
                                    Student Profile
                                </Typography>
                                <Grid container spacing={1.5}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{color: "#64748b"}}>Học sinh</Typography>
                                        <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {studentDetail.studentName || selectedChild?.name || "-"}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{color: "#64748b"}}>Giới tính</Typography>
                                        <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {toGenderLabel(studentDetail.gender)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{color: "#64748b"}}>Tính cách</Typography>
                                        <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {studentDetail.personalityTypeCode || studentDetail.personalityCode || "-"}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{color: "#64748b"}}>Ngành yêu thích</Typography>
                                        <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {studentDetail.favouriteJob || "-"}
                                        </Typography>
                                    </Grid>
                                </Grid>
                                {Array.isArray(studentDetail.traits) && studentDetail.traits.length > 0 ? (
                                    <Stack direction="row" spacing={1} sx={{mt: 1.4, flexWrap: "wrap", rowGap: 1}}>
                                        {studentDetail.traits.map((trait, traitIndex) => (
                                            <Chip
                                                key={`${String(trait?.name || "trait")}-${traitIndex}`}
                                                label={String(trait?.name || "Trait")}
                                                sx={{bgcolor: "#f1f5f9", color: "#334155"}}
                                            />
                                        ))}
                                    </Stack>
                                ) : null}
                            </Box>

                            <Divider/>

                            <Box>
                                <Typography variant="subtitle1" sx={{fontWeight: 700, color: "#1e293b", mb: 1}}>
                                    Academic Profile
                                </Typography>

                                {Array.isArray(studentDetail.academicProfileMetadata) &&
                                studentDetail.academicProfileMetadata.length > 0 ? (
                                    <Stack spacing={1.5}>
                                        {studentDetail.academicProfileMetadata.map((gradeMeta, index) => {
                                            const subjects = Array.isArray(gradeMeta?.subjectResults) ? gradeMeta.subjectResults : [];
                                            const gradeLabel = String(gradeMeta?.gradeLevel || `GRADE_${index + 1}`);

                                            return (
                                                <Card key={`${gradeLabel}-${index}`} elevation={0} sx={{ border: "1px solid #166534", borderRadius: 2.5, overflow: "hidden" }}>
                                                    <CardContent sx={{ p: 0 }}>
                                                        <Box sx={{ px: 2, py: 1.4, bgcolor: "#dcfce7", borderBottom: "1px solid #166534" }}>
                                                            <Typography sx={{ fontWeight: 800, color: "#166534" }}>
                                                                {gradeLabel}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ p: 1.2 }}>
                                                            <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "#166534" } }}>
                                                                <TableHead>
                                                                    <TableRow sx={{ bgcolor: "#166534" }}>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Môn học</TableCell>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Loại</TableCell>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Điểm</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {subjects.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={3} sx={{ color: "#64748b" }}>
                                                                                Chưa có dữ liệu điểm
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        subjects.map((subject, subjectIndex) => {
                                                                            const tone = getScoreTone(subject?.score, subject?.isAvailable);
                                                                            return (
                                                                                <TableRow
                                                                                    key={String(subject?.id ?? `${subject?.name}-${subject?.type}`)}
                                                                                    sx={{ bgcolor: subjectIndex % 2 === 0 ? "#ffffff" : "#f0fdf4" }}
                                                                                >
                                                                                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                                                                                        {subject?.name || "-"}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Chip
                                                                                            size="small"
                                                                                            label={toSubjectTypeLabel(subject?.type)}
                                                                                            sx={{
                                                                                                borderRadius: 999,
                                                                                                bgcolor: "#f1f5f9",
                                                                                                color: "#334155",
                                                                                                border: "1px solid #e2e8f0",
                                                                                            }}
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Box
                                                                                            sx={{
                                                                                                display: "inline-flex",
                                                                                                minWidth: 38,
                                                                                                px: 1,
                                                                                                py: 0.25,
                                                                                                borderRadius: 999,
                                                                                                border: `1px solid ${tone.border}`,
                                                                                                bgcolor: tone.bg,
                                                                                                color: tone.color,
                                                                                                fontWeight: 800,
                                                                                                justifyContent: "center",
                                                                                            }}
                                                                                        >
                                                                                            {tone.label}
                                                                                        </Box>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" sx={{color: "#64748b"}}>
                                        Chưa có dữ liệu học tập.
                                    </Typography>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{fontWeight: 700, color: "#1e293b", mb: 1}}>
                                    Transcript Images
                                </Typography>
                                {Array.isArray(studentDetail.transcriptImages) && studentDetail.transcriptImages.length > 0 ? (
                                    <Grid container spacing={1.2}>
                                        {studentDetail.transcriptImages.map((image, idx) => (
                                            <Grid item xs={12} md={6} key={`${String(image?.grade || "grade")}-${idx}`}>
                                                <Card elevation={0} sx={{border: "1px solid #e2e8f0", borderRadius: 2}}>
                                                    <CardContent sx={{p: 1.5}}>
                                                        <Typography variant="body2" sx={{fontWeight: 600, mb: 0.8}}>
                                                            {image?.grade || "Không rõ khối"}
                                                        </Typography>
                                                        <Button
                                                            component="a"
                                                            href={image?.imageUrl || "#"}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            size="small"
                                                            variant="outlined"
                                                            disabled={!image?.imageUrl}
                                                            sx={{textTransform: "none", borderRadius: 2}}
                                                        >
                                                            Mở ảnh học bạ
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : (
                                    <Typography variant="body2" sx={{color: "#64748b"}}>
                                        Chưa có ảnh học bạ.
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

