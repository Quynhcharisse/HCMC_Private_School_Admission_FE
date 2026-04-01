import React, {useState, useMemo, useEffect} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    Fade,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getCampaignTemplatesByYear, createCampaignTemplate } from "../../../services/CampaignService.jsx";

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
};
const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};

// Backend has many statuses; UI focuses on main campaign lifecycle ones
const STATUS_OPTIONS = [
    {value: "DRAFT", label: "Bản nháp"},
    {value: "OPEN", label: "Đang mở"},
    {value: "PAUSED", label: "Tạm dừng"},
    {value: "CANCELLED", label: "Đã hủy"},
    {value: "CLOSED", label: "Đã đóng"},
    {value: "EXPIRED", label: "Hết hạn"},
];

/** Normalize template from API (id or admissionCampaignTemplateId) */
function normalizeCampaignStatus(rawStatus) {
    const s = String(rawStatus || "").trim().toUpperCase();
    if (!s) return "DRAFT";
    if (s === "OPEN" || s === "OPEN_ADMISSION_CAMPAIGN") return "OPEN";
    if (s === "CANCELLED" || s === "CANCELLED_ADMISSION_CAMPAIGN") return "CANCELLED";
    if (s === "DRAFT" || s === "DRAFT_ADMISSION_CAMPAIGN") return "DRAFT";
    return s;
}

function mapTemplate(row) {
    if (!row) return null;
    const id = row.admissionCampaignTemplateId ?? row.id;
    const status = normalizeCampaignStatus(row.status);

    return {
        ...row,
        id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status,
        numberOfOfferings: row.numberOfOfferings ?? 0,
    };
}

const emptyForm = {
    name: "",
    description: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
};

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/** Các năm quá khứ gộp trong tab «Các năm trước» (gọi API theo từng năm rồi merge). */
const PAST_YEARS_FETCH_COUNT = 8;
const PAST_YEARS_FOR_TAB = Array.from({length: PAST_YEARS_FETCH_COUNT}, (_, i) => CURRENT_YEAR - 1 - i);

const CAMPAIGN_TAB_CURRENT = "current";
const CAMPAIGN_TAB_PAST = "past";

/** Gộp nhiều response, trùng id chỉ giữ một bản. */
function mergeCampaignListsById(rowsArrays) {
    const byId = new Map();
    for (const rows of rowsArrays) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
            const m = mapTemplate(row);
            if (!m) continue;
            const id = m.id;
            if (!byId.has(id)) byId.set(id, m);
        }
    }
    return [...byId.values()].sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (yb !== ya) return yb - ya;
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
    });
}

/** Parse YYYY-MM-DD as local calendar date (tránh lệch múi giờ so với LocalDate BE). */
function parseLocalDate(iso) {
    const t = String(iso ?? "").trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return d;
}

function startOfLocalToday() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function addLocalDays(date, delta) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + delta);
    return d;
}

/** Map BE validation messages (EN) → hiển thị tiếng Việt (Create + Update) */
const CAMPAIGN_ERROR_VI = {
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch là bắt buộc",
    "Name is too long. Maximum length is 100 characters": "Tên chiến dịch quá dài. Tối đa 100 ký tự",
    "Description is required": "Mô tả là bắt buộc",
    "Year is required": "Năm học là bắt buộc",
    "Cannot create a campaign for a past academic year": "Không thể tạo chiến dịch cho năm học đã qua",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "Start date cannot be in the past":
        "Ngày bắt đầu không được ở quá khứ (cho phép lùi tối đa 1 ngày so với hôm nay)",
    "End date must be in the future": "Ngày kết thúc phải từ hôm nay trở đi (không được ở quá khứ)",
    "End date must be after start date":
        "Ngày kết thúc phải sau ngày bắt đầu (chiến dịch phải kéo dài ít nhất hơn 1 ngày)",
};

function getCampaignErrorMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    if (CAMPAIGN_ERROR_VI[trimmed]) return CAMPAIGN_ERROR_VI[trimmed];

    const earlyBird =
        /^Start date is too early\. Early bird for (\d+) should start from October (\d+)$/.exec(trimmed);
    if (earlyBird) {
        const [, y, octYear] = earlyBird;
        return `Ngày bắt đầu quá sớm. Chiến dịch năm ${y} chỉ được bắt đầu sớm nhất từ 01/10/${octYear}.`;
    }

    const endInvalid =
        /^End date is invalid\. A campaign for (\d+) must at least last until the end of (\d+)$/.exec(trimmed);
    if (endInvalid) {
        const [, y, untilYear] = endInvalid;
        return `Ngày kết thúc không hợp lệ. Chiến dịch năm ${y} phải kéo dài ít nhất đến hết ngày 31/12/${untilYear}.`;
    }

    const endWithin = /^End date must be within the academic year (\d+)$/.exec(trimmed);
    if (endWithin) {
        return `Ngày kết thúc phải nằm trọn trong năm dương lịch ${endWithin[1]} (theo năm học đã chọn).`;
    }

    const existsTypo = /^A campaign template for the (\d+)year already exists$/.exec(trimmed);
    if (existsTypo) {
        return `Đã tồn tại chiến dịch tuyển sinh cho năm ${existsTypo[1]}.`;
    }
    const existsSpaced = /^A campaign template for the (\d+) year already exists$/.exec(trimmed);
    if (existsSpaced) {
        return `Đã tồn tại chiến dịch tuyển sinh cho năm ${existsSpaced[1]}.`;
    }

    return trimmed || fallback;
}

export default function SchoolCampaigns() {
    const navigate = useNavigate();
    const { isPrimaryBranch } = useSchool();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [campaignTab, setCampaignTab] = useState(CAMPAIGN_TAB_CURRENT);
    const [statusFilter, setStatusFilter] = useState("all");
    const [campaignCountByTab, setCampaignCountByTab] = useState({});
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const parseBody = (res) => {
            const raw = res?.data?.body ?? res?.data;
            if (Array.isArray(raw)) return raw;
            if (raw) return [raw];
            return [];
        };

        if (campaignTab === CAMPAIGN_TAB_CURRENT) {
            getCampaignTemplatesByYear(CURRENT_YEAR)
                .then((res) => {
                    if (cancelled) return;
                    const list = parseBody(res);
                    setCampaigns(list.map(mapTemplate).filter(Boolean));
                })
                .catch((err) => {
                    if (cancelled) return;
                    console.error("Fetch campaign templates error:", err);
                    enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", {
                        variant: "error",
                    });
                    setCampaigns([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else {
            Promise.all(PAST_YEARS_FOR_TAB.map((y) => getCampaignTemplatesByYear(y)))
                .then((responses) => {
                    if (cancelled) return;
                    const lists = responses.map(parseBody);
                    const merged = mergeCampaignListsById(lists);
                    setCampaigns(merged.filter((c) => Number(c.year) < CURRENT_YEAR));
                })
                .catch((err) => {
                    if (cancelled) return;
                    console.error("Fetch campaign templates error:", err);
                    enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", {
                        variant: "error",
                    });
                    setCampaigns([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }

        return () => { cancelled = true; };
    }, [campaignTab]);

    useEffect(() => {
        if (loading) return;
        setCampaignCountByTab((prev) => ({ ...prev, [campaignTab]: campaigns.length }));
    }, [loading, campaigns, campaignTab]);

    useEffect(() => {
        setPage(0);
    }, [campaignTab, search, statusFilter]);

    const isPastYearView = campaignTab === CAMPAIGN_TAB_PAST;

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: name === "year" ? (value === "" ? "" : parseInt(value, 10)) : value,
        }));
    };

    const filteredCampaigns = useMemo(() => {
        let list = campaigns;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => c.name?.toLowerCase().includes(q));
        }
        if (statusFilter !== "all") {
            list = list.filter((c) => String(c.status).toUpperCase() === statusFilter);
        }
        // Ưu tiên campaign trạng thái DRAFT, sau đó OPEN
        return [...list].sort((a, b) => {
            const rank = (status) => {
                const s = String(status || "").toUpperCase();
                if (s === "DRAFT") return 0;
                if (s === "OPEN") return 1;
                return 2;
            };
            return rank(a?.status) - rank(b?.status);
        });
    }, [campaigns, search, statusFilter]);

    const paginatedCampaigns = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampaigns.slice(start, start + rowsPerPage);
    }, [filteredCampaigns, page]);

    const validateForm = () => {
        const errors = {};
        const name = formValues.name?.trim() ?? "";
        const description = formValues.description?.trim() ?? "";
        const yearRaw = formValues.year;
        const yearNum = typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw), 10);

        if (!name) errors.name = "Tên chiến dịch là bắt buộc";
        else if (name.length > 100) errors.name = "Tên chiến dịch quá dài. Tối đa 100 ký tự";

        if (!description) errors.description = "Mô tả là bắt buộc";

        if (!Number.isFinite(yearNum) || yearNum <= 0) {
            errors.year = "Năm học là bắt buộc";
        } else if (yearNum < CURRENT_YEAR) {
            errors.year = "Không thể tạo chiến dịch cho năm học đã qua";
        }

        const startIso = formValues.startDate?.trim() ?? "";
        const endIso = formValues.endDate?.trim() ?? "";
        if (!startIso) errors.startDate = "Ngày bắt đầu là bắt buộc";
        if (!endIso) errors.endDate = "Ngày kết thúc là bắt buộc";

        const start = parseLocalDate(startIso);
        const end = parseLocalDate(endIso);
        if (startIso && !start) errors.startDate = "Ngày bắt đầu không hợp lệ";
        if (endIso && !end) errors.endDate = "Ngày kết thúc không hợp lệ";

        const today = startOfLocalToday();
        const earliestStartAllowed = addLocalDays(today, -1);

        if (start && !errors.startDate) {
            if (start.getTime() < earliestStartAllowed.getTime()) {
                errors.startDate =
                    "Ngày bắt đầu không được ở quá khứ (cho phép lùi tối đa 1 ngày so với hôm nay)";
            }
        }
        if (end && !errors.endDate) {
            if (end.getTime() < today.getTime()) {
                errors.endDate = "Ngày kết thúc phải từ hôm nay trở đi (không được ở quá khứ)";
            }
        }
        if (start && end && !errors.startDate && !errors.endDate) {
            if (end.getTime() <= start.getTime()) {
                errors.endDate =
                    "Ngày kết thúc phải sau ngày bắt đầu (chiến dịch phải kéo dài ít nhất hơn 1 ngày)";
            }
        }

        if (Number.isFinite(yearNum) && yearNum > 0 && start && !errors.startDate) {
            const oct1Prev = new Date(yearNum - 1, 9, 1);
            if (start.getTime() < oct1Prev.getTime()) {
                errors.startDate = `Ngày bắt đầu quá sớm. Chiến dịch năm ${yearNum} chỉ được bắt đầu sớm nhất từ 01/10/${yearNum - 1}.`;
            }
        }
        if (Number.isFinite(yearNum) && yearNum > 0 && end && !errors.endDate) {
            const dec31Prev = new Date(yearNum - 1, 11, 31);
            if (end.getTime() < dec31Prev.getTime()) {
                errors.endDate = `Ngày kết thúc không hợp lệ. Chiến dịch năm ${yearNum} phải kéo dài ít nhất đến hết ngày 31/12/${yearNum - 1}.`;
            } else if (end.getFullYear() !== yearNum) {
                errors.endDate = `Ngày kết thúc phải nằm trọn trong năm dương lịch ${yearNum} (theo năm học đã chọn).`;
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getCreatePayload = () => {
        const y = formValues.year;
        const yearNum = typeof y === "number" ? y : parseInt(String(y), 10);
        return {
            name: formValues.name.trim(),
            description: formValues.description?.trim() || "",
            year: Number.isFinite(yearNum) ? yearNum : 0,
            startDate: formValues.startDate?.trim() || "",
            endDate: formValues.endDate?.trim() || "",
        };
    };

    const handleOpenCreate = () => {
        if (isPastYearView) {
            enqueueSnackbar("Năm học đã qua — chỉ xem, không thể tạo chiến dịch mới.", { variant: "info" });
            return;
        }
        setFormValues({
            ...emptyForm,
            year: new Date().getFullYear(),
        });
        setFormErrors({});
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = async () => {
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload();
            const res = await createCampaignTemplate(payload);
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar(res?.data?.message || "Tạo chiến dịch thành công", { variant: "success" });
                setCreateModalOpen(false);
                const createdYear = Number(payload.year);
                if (Number.isFinite(createdYear)) {
                    setCampaignTab(CAMPAIGN_TAB_CURRENT);
                }
                const refetch = await getCampaignTemplatesByYear(
                    Number.isFinite(createdYear) ? createdYear : CURRENT_YEAR
                );
                const raw = refetch?.data?.body ?? refetch?.data;
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw;
                } else if (raw) {
                    list = [raw];
                }
                const mapped = list.map(mapTemplate).filter(Boolean);
                setCampaigns(mapped);
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(res?.data?.message, "Tạo chiến dịch thất bại"),
                    { variant: "error" }
                );
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Tạo chiến dịch thất bại"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenView = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/detail/${id}`, { state: { campaign } });
    };

    const handleOpenEdit = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/detail/${id}`, { state: { campaign } });
    };

    const getStatusLabel = (status) => {
        const upper = String(status || "").toUpperCase();
        const mapped = STATUS_OPTIONS.find((s) => s.value === upper);
        return mapped?.label ?? status ?? "—";
    };

    const getStatusColor = (status) => {
        const upper = String(status || "").toUpperCase();
        if (upper === "DRAFT") return {bg: "rgba(100, 116, 139, 0.14)", color: "#475569"};
        if (upper === "OPEN") return {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"};
        if (upper === "PAUSED") return {bg: "rgba(250, 204, 21, 0.18)", color: "#a16207"};
        if (upper === "CANCELLED") return {bg: "rgba(248, 113, 113, 0.16)", color: "#b91c1c"};
        if (upper === "EXPIRED") return {bg: "rgba(248, 113, 113, 0.15)", color: "#b91c1c"};
        if (upper === "CLOSED") return {bg: "rgba(148, 163, 184, 0.2)", color: "#64748b"};
        return {bg: "rgba(148, 163, 184, 0.18)", color: "#64748b"};
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
            }}
        >
            {/* Header — cùng style trang Cơ sở */}
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
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý chiến dịch tuyển sinh
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {isPrimaryBranch
                                ? "Theo dõi và cấu hình chiến dịch tuyển sinh của trường"
                                : "Xem kế hoạch tuyển sinh"}
                        </Typography>
                    </Box>
                    {isPrimaryBranch && !isPastYearView && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenCreate}
                            sx={{
                                bgcolor: "rgba(255,255,255,0.95)",
                                color: "#0D64DE",
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                                py: 1.5,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                "&:hover": {
                                    bgcolor: "white",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                },
                            }}
                        >
                            Tạo chiến dịch
                        </Button>
                    )}
                </Box>
            </Box>

            <Fade in timeout={220} key={campaignTab}>
                <Box sx={{width: "100%"}}>
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
                {/* Tiêu đề trong card — cùng kiểu màn Cài đặt */}
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
                    <CampaignIcon sx={{color: "#0D64DE", fontSize: 28, mt: 0.25}}/>
                    <Box>
                        <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b", lineHeight: 1.3}}>
                            Danh sách chiến dịch
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                            {isPastYearView
                                ? "Năm học đã qua — chỉ xem lại dữ liệu, không tạo hay chỉnh sửa."
                                : "Xem và quản lý chiến dịch tuyển sinh cho năm học hiện tại."}
                        </Typography>
                    </Box>
                </Box>

                {/* Tabs năm học */}
                <Box sx={{px: 2.5}}>
                    <Tabs
                        value={campaignTab}
                        onChange={(_, v) => setCampaignTab(v)}
                        sx={{
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
                            "& .MuiTab-root:not(.Mui-selected) .campaign-year-tab-badge": {
                                bgcolor: "rgba(100, 116, 139, 0.14)",
                                color: "#64748b",
                            },
                        }}
                        TabIndicatorProps={{
                            sx: {
                                height: 3,
                                bgcolor: "#0D64DE",
                            },
                        }}
                    >
                        <Tab
                            value={CAMPAIGN_TAB_CURRENT}
                            label={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.75}
                                    component="span"
                                >
                                    <Typography component="span" variant="body2" sx={{fontWeight: "inherit"}}>
                                        {`Năm hiện tại (${CURRENT_YEAR})`}
                                    </Typography>
                                    {campaignCountByTab[CAMPAIGN_TAB_CURRENT] !== undefined && (
                                        <Box
                                            component="span"
                                            className="campaign-year-tab-badge"
                                            sx={{
                                                minWidth: 22,
                                                height: 22,
                                                px: 0.75,
                                                borderRadius: "999px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                lineHeight: "22px",
                                                textAlign: "center",
                                                bgcolor: "rgba(13, 100, 222, 0.12)",
                                                color: "#0D64DE",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {campaignCountByTab[CAMPAIGN_TAB_CURRENT]}
                                        </Box>
                                    )}
                                </Stack>
                            }
                        />
                        <Tab
                            value={CAMPAIGN_TAB_PAST}
                            label={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.75}
                                    component="span"
                                >
                                    <Typography component="span" variant="body2" sx={{fontWeight: "inherit"}}>
                                        Các năm trước
                                    </Typography>
                                    {campaignCountByTab[CAMPAIGN_TAB_PAST] !== undefined && (
                                        <Box
                                            component="span"
                                            className="campaign-year-tab-badge"
                                            sx={{
                                                minWidth: 22,
                                                height: 22,
                                                px: 0.75,
                                                borderRadius: "999px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                lineHeight: "22px",
                                                textAlign: "center",
                                                bgcolor: "rgba(13, 100, 222, 0.12)",
                                                color: "#0D64DE",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {campaignCountByTab[CAMPAIGN_TAB_PAST]}
                                        </Box>
                                    )}
                                </Stack>
                            }
                        />
                    </Tabs>
                </Box>

                <Divider sx={{borderColor: "#e2e8f0"}}/>

                <CardContent sx={{p: 2.5, pb: 2}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                        flexWrap="wrap"
                    >
                        <TextField
                            placeholder="Tìm theo tên chiến dịch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 280},
                                "& .MuiOutlinedInput-root": {borderRadius: "12px", bgcolor: "#f8fafc"},
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: "12px", bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>

                <TableContainer sx={{borderTop: "1px solid #e2e8f0"}}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tên chiến dịch
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Năm
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Bắt đầu — Kết thúc
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái
                                </TableCell>
                                {isPrimaryBranch && (
                                    <TableCell
                                        sx={{fontWeight: 700, color: "#1e293b", py: 2}}
                                        align="right"
                                    >
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                                        <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
                                        {isPrimaryBranch && <TableCell><Skeleton variant="rounded" width={100} height={32} /></TableCell>}
                                    </TableRow>
                                ))
                            ) : paginatedCampaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isPrimaryBranch ? 5 : 4} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <CampaignIcon sx={{fontSize: 56, color: "#cbd5e1"}}/>
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có chiến dịch
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampaigns.length === 0 && campaigns.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : campaigns.length === 0 && isPastYearView
                                                        ? "Không có chiến dịch nào trong các năm trước."
                                                        : campaigns.length === 0 &&
                                                            isPrimaryBranch &&
                                                            !isPastYearView
                                                          ? "Chưa có chiến dịch cho năm đã chọn — nhấn «+ Tạo chiến dịch» để bắt đầu."
                                                          : "Chưa có kế hoạch tuyển sinh."}
                                            </Typography>
                                            {campaigns.length === 0 && isPrimaryBranch && !isPastYearView && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background:
                                                            "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo chiến dịch
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCampaigns.map((row) => {
                                    const statusStyle = getStatusColor(row.status);
                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            onClick={() => handleOpenView(row)}
                                            sx={{
                                                cursor: "pointer",
                                                "&:hover": {
                                                    bgcolor: "rgba(122, 169, 235, 0.06)",
                                                },
                                            }}
                                        >
                                            <TableCell>
                                                <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                                    {row.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>{row.year}</TableCell>
                                            <TableCell sx={{color: "#64748b", whiteSpace: "nowrap"}}>
                                                {formatDate(row.startDate)} — {formatDate(row.endDate)}
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        bgcolor: statusStyle.bg,
                                                        color: statusStyle.color,
                                                    }}
                                                >
                                                    {getStatusLabel(row.status)}
                                                </Box>
                                            </TableCell>
                                            {isPrimaryBranch && (
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.25}
                                                        justifyContent="flex-end"
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenView(row)}
                                                            title="Xem chi tiết"
                                                            aria-label="Xem chi tiết"
                                                            sx={{
                                                                color: "#64748b",
                                                                "&:hover": {
                                                                    color: "#0D64DE",
                                                                    bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        {!isPastYearView && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenEdit(row)}
                                                                title="Chỉnh sửa"
                                                                aria-label="Chỉnh sửa"
                                                                disabled={String(row.status || "").toUpperCase() !== "DRAFT"}
                                                                sx={{
                                                                    color: "#64748b",
                                                                    "&:hover": {
                                                                        color: "#0D64DE",
                                                                        bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                    },
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampaigns.length > 0 && (
                    <Box
                        sx={{
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            px: 3,
                            py: 1.5,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Pagination
                            count={Math.ceil(filteredCampaigns.length / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>
            </Box>
            </Fade>

            {/* Create Campaign Modal */}
            <Dialog
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Tạo chiến dịch
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin chiến dịch tuyển sinh mới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setCreateModalOpen(false)}
                            size="small"
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2.5}>
                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Tên chiến dịch"
                                name="name"
                                fullWidth
                                value={formValues.name}
                                onChange={handleChange}
                                error={!!formErrors.name}
                                helperText={formErrors.name}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                            <TextField
                                label="Năm học"
                                name="year"
                                type="number"
                                fullWidth
                                value={formValues.year}
                                onChange={handleChange}
                                error={!!formErrors.year}
                                helperText={formErrors.year}
                                required
                                inputProps={{min: CURRENT_YEAR, max: CURRENT_YEAR + 30}}
                                sx={{
                                    maxWidth: {sm: 160},
                                    "& .MuiOutlinedInput-root": {borderRadius: "12px"},
                                }}
                            />
                        </Stack>
                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.description}
                            onChange={handleChange}
                            error={!!formErrors.description}
                            helperText={formErrors.description}
                            required
                            sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                        />
                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Ngày bắt đầu"
                                name="startDate"
                                type="date"
                                fullWidth
                                value={formValues.startDate}
                                onChange={handleChange}
                                error={!!formErrors.startDate}
                                helperText={formErrors.startDate}
                                InputLabelProps={{shrink: true}}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                fullWidth
                                value={formValues.endDate}
                                onChange={handleChange}
                                error={!!formErrors.endDate}
                                helperText={formErrors.endDate}
                                InputLabelProps={{shrink: true}}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => setCreateModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            bgcolor: "#0D64DE",
                        }}
                    >
                        {submitLoading ? "Đang tạo…" : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
