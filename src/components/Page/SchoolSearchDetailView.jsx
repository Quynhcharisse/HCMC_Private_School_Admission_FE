import React from "react";
import {
    Box,
    Button,
    Card,
    CardMedia,
    Chip,
    CircularProgress,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    MenuItem,
    Select,
    Stack,
    Tab,
    TextField,
    Tabs,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    Business as BusinessIcon,
    CalendarToday as CalendarTodayIcon,
    CalendarMonth as CalendarMonthIcon,
    CheckCircle as CheckCircleIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    Description as DescriptionIcon,
    Email as EmailIcon,
    Hotel as HotelIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    MapsHomeWork as MapsHomeWorkIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    School as SchoolIcon,
    Share as ShareIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from "@mui/icons-material";
import {MapContainer, Marker, Popup, TileLayer} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {APP_PRIMARY_DARK, BRAND_NAVY, landingSectionShadow} from "../../constants/homeLandingTheme";
import {OPEN_PARENT_CHAT_EVENT} from "../../constants/parentChatEvents";
import {showErrorSnackbar, showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {DEFAULT_SCHOOL_IMAGE} from "../../utils/schoolPublicMapper.js";
import {getPublicSchoolCampaignTemplates} from "../../services/SchoolPublicService.jsx";
import {
    bookParentOfflineConsultation,
    getParentConsultSlots,
    parseParentConsultSlotsBody
} from "../../services/ParentConsultSlotsService.jsx";

const MAP_CONTAINER_STYLE = {width: "100%", height: "260px"};
const NEARBY_SEARCH_RADIUS_KM = 10;
const CONSULT_CALENDAR_DAYS = [
    {key: "MON", label: "Th 2", offset: 0},
    {key: "TUE", label: "Th 3", offset: 1},
    {key: "WED", label: "Th 4", offset: 2},
    {key: "THU", label: "Th 5", offset: 3},
    {key: "FRI", label: "Th 6", offset: 4},
    {key: "SAT", label: "Th 7", offset: 5},
    {key: "SUN", label: "CN", offset: 6}
];
const CONSULT_CALENDAR_SHIFTS = [
    {
        key: "MORNING",
        mailLabel: "Ca sáng",
        stripBg: "#fef3c7",
        rowBg: "rgba(254, 243, 199, 0.35)"
    },
    {
        key: "AFTERNOON",
        mailLabel: "Ca chiều",
        stripBg: "#dbeafe",
        rowBg: "rgba(219, 234, 254, 0.35)"
    }
];

const CONSULT_HEADER_BG = "#6c8fcf";
const CONSULT_CARD_BORDER = "1px solid rgba(59,130,246,0.22)";
const CONSULT_GRID_LINE_ROW = "1px solid rgba(100, 116, 139, 0.36)";
const CONSULT_GRID_LINE_COL = "1px solid rgba(100, 116, 139, 0.32)";
const CONSULT_GRID_HEADER_COL = "1px solid rgba(255, 255, 255, 0.55)";
const CONSULT_YEAR_OPTIONS = Array.from({length: 7}, (_, i) => String(new Date().getFullYear() - 2 + i));
const CONSULT_SLOT_STATUS_CHIP = {
    UPCOMING: "info",
    ONGOING: "success",
    COMPLETED: "default",
    CANCELLED: "error"
};

const OFFLINE_CONSULT_REQUEST_STATUS_LABEL = {
    CONSULTATION_PENDING: "Chờ tư vấn",
    CONSULTATION_CONFIRMED: "Đã xác nhận",
    CONSULTATION_APPROVED: "Đã duyệt",
    CONSULTATION_REJECTED: "Không được duyệt",
    CONSULTATION_CANCELLED: "Đã hủy",
    CONSULTATION_COMPLETED: "Đã hoàn thành",
    CONSULTATION_NO_SHOW: "Không đến"
};

function offlineConsultRequestStatusVi(slot) {
    const key = String(slot?.consultationOfflineRequest?.status || "").toUpperCase();
    if (OFFLINE_CONSULT_REQUEST_STATUS_LABEL[key]) {
        return OFFLINE_CONSULT_REQUEST_STATUS_LABEL[key];
    }
    const raw = String(slot?.consultationOfflineRequest?.status || "").trim();
    return raw || "Đã đặt";
}

function offlineConsultRequestChipColor(slot) {
    const s = String(slot?.consultationOfflineRequest?.status || "").toUpperCase();
    if (s.includes("CANCEL") || s.includes("REJECT")) return "error";
    if (s.includes("COMPLETE")) return "success";
    if (s.includes("CONFIRM") || s.includes("APPROVE")) return "success";
    return "warning";
}

const PARENT_OFFLINE_CONSULTATIONS_PATH = "/parent/offline-consultations";

function parentConsultOfflinePendingNavigable(slot) {
    if (slot?.consultationOfflineRequest == null) return false;
    return String(slot.consultationOfflineRequest.status || "").toUpperCase() === "CONSULTATION_PENDING";
}

function consultSlotLooksCompleted(status, statusLabel) {
    const s = String(status || "").toUpperCase();
    if (s === "COMPLETED") return true;
    return String(statusLabel || "")
        .trim()
        .toLowerCase()
        .includes("đã qua");
}

function consultSlotLooksUpcoming(status, statusLabel) {
    const s = String(status || "").toUpperCase();
    if (s === "UPCOMING") return true;
    return String(statusLabel || "")
        .trim()
        .toLowerCase()
        .includes("sắp diễn ra");
}

function parentConsultSlotChipLabel(slot) {
    if (slot?.consultationOfflineRequest != null) {
        return offlineConsultRequestStatusVi(slot);
    }
    const max = Number(slot?.maxBookingPerSlot);
    const total = Number(slot?.totalRequests);
    if (Number.isFinite(max) && max >= 0 && Number.isFinite(total) && total >= 0) {
        return `${total}/${max}`;
    }
    return String(slot?.statusLabel || "").trim() || String(slot?.status || "");
}

function parentConsultSlotInputDisabled(slot, datesWithOfflineBooking) {
    const date = String(slot?.date || "").slice(0, 10);
    if (!slot || !date) return {disabled: false, reason: ""};
    if (slot.consultationOfflineRequest != null) {
        return {disabled: true, reason: "Bạn đã đặt lịch cho khung giờ này."};
    }
    if (datesWithOfflineBooking instanceof Set && datesWithOfflineBooking.has(date)) {
        return {
            disabled: true,
            reason: "Bạn đã đặt lịch trong ngày này — không thể chọn thêm khung giờ khác."
        };
    }
    return {disabled: false, reason: ""};
}

function consultCalendarSlotChipSx(status, statusLabel) {
    const s = String(status || "").toUpperCase();
    const label = {
        px: 0.75,
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.25
    };
    const base = {
        height: 26,
        maxWidth: "100%",
        fontSize: "0.68rem",
        overflow: "hidden",
        "& .MuiChip-label": label
    };
    if (consultSlotLooksCompleted(s, statusLabel)) {
        return {
            ...base,
            fontWeight: 600,
            borderRadius: "6px",
            boxShadow: "none",
            bgcolor: "rgba(255,255,255,0.88)",
            color: "#475569",
            border: "1px solid rgba(148,163,184,0.65)",
            "&:hover": {
                bgcolor: "rgba(255,255,255,0.98)",
                borderColor: "rgba(100,116,139,0.55)"
            }
        };
    }
    return {
        ...base,
        fontWeight: 700,
        borderRadius: "8px",
        boxShadow: "0 3px 10px rgba(15,23,42,0.12)",
        cursor: consultSlotLooksUpcoming(s, statusLabel) ? "pointer" : "default"
    };
}

function formatDayMonth(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
}

function toYmdDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseYmdLocal(ymd) {
    const [y, mo, d] = String(ymd || "")
        .slice(0, 10)
        .split("-")
        .map((x) => Number(x));
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return new Date(NaN);
    return new Date(y, mo - 1, d);
}

function normalizeConsultSlotTime(value) {
    return String(value || "").slice(0, 5);
}

function consultTimeToMinutes(value) {
    const [h, m] = String(value || "")
        .split(":")
        .map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

function consultSessionKeyFromStart(startTime) {
    const mins = consultTimeToMinutes(startTime);
    if (mins == null || !Number.isFinite(mins)) return "AFTERNOON";
    return mins < 12 * 60 ? "MORNING" : "AFTERNOON";
}

function startOfMonday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function buildWeeksOfYear(year) {
    const y = Number(year);
    if (!Number.isFinite(y)) return [];
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31);
    const cursor = startOfMonday(yearStart);
    const out = [];
    let weekNo = 1;
    while (cursor <= yearEnd || cursor.getFullYear() < y) {
        const weekStart = new Date(cursor);
        const weekEnd = new Date(cursor);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekStart.getFullYear() === y || weekEnd.getFullYear() === y) {
            const code = `${y}-W${String(weekNo).padStart(2, "0")}`;
            out.push({
                value: code,
                label: `${formatDayMonth(weekStart)} - ${formatDayMonth(weekEnd)}`,
                start: weekStart,
                end: weekEnd
            });
            weekNo += 1;
        }
        cursor.setDate(cursor.getDate() + 7);
        if (weekNo > 60) break;
    }
    return out;
}

function findWeekValueByDate(weeks, date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const hit = weeks.find((w) => w?.start && w?.end && d >= w.start && d <= w.end);
    return hit?.value || "";
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

const parentLocationIcon = L.divIcon({
    className: "parent-location-marker",
    html: '<span style="display:block;width:14px;height:14px;border-radius:999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.25);"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const DETAIL_SCROLL_HEADROOM = 88;
const DETAIL_WITH_HEADER_OFFSET = 78;
const DETAIL_SCROLL_MIN_MS = 420;
const DETAIL_SCROLL_MAX_MS = 980;
const DETAIL_SCROLL_LOCK_BUFFER_MS = 140;

function smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function getBoardingTypeTags(rawValue) {
    const normalized = String(rawValue || "").trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === "both") return ["Nội trú", "Bán trú"];
    if (normalized.includes("both")) return ["Nội trú", "Bán trú"];
    if (normalized === "full_boarding" || normalized.includes("full_boarding")) return ["Nội trú"];
    if (normalized === "day_boarding" || normalized.includes("day_boarding")) return ["Bán trú"];
    if (normalized.includes("nội trú") && normalized.includes("bán trú")) {
        return ["Nội trú", "Bán trú"];
    }
    const tags = [];
    if (normalized.includes("nội trú")) tags.push("Nội trú");
    if (normalized.includes("bán trú")) tags.push("Bán trú");
    return tags.length ? tags : [String(rawValue)];
}

function formatCampusStatus(status) {
    const s = String(status || "").trim().toUpperCase();
    if (s === "VERIFIED") return "Đã xác minh";
    if (s === "PENDING") return "Chờ duyệt";
    if (s === "REJECTED") return "Không đạt";
    return status ? String(status) : "—";
}

function curriculumStatusChipSx(status) {
    const s = String(status || "").toUpperCase();
    const base = {borderRadius: 999, fontWeight: 700};
    if (s === "CUR_ACTIVE") {
        return {
            ...base,
            bgcolor: "rgba(34, 197, 94, 0.12)",
            color: "#16a34a",
            border: "1px solid rgba(34, 197, 94, 0.35)"
        };
    }
    if (s === "CUR_DRAFT") {
        return {
            ...base,
            bgcolor: "rgba(148, 163, 184, 0.16)",
            color: "#475569",
            border: "1px solid rgba(148, 163, 184, 0.35)"
        };
    }
    if (s === "CUR_ARCHIVED") {
        return {
            ...base,
            bgcolor: "rgba(234, 88, 12, 0.12)",
            color: "#c2410c",
            border: "1px solid rgba(234, 88, 12, 0.3)"
        };
    }
    return {
        ...base,
        bgcolor: "rgba(148, 163, 184, 0.14)",
        color: "#64748b",
        border: "1px solid rgba(148, 163, 184, 0.3)"
    };
}

function curriculumStatusLabel(status) {
    const s = String(status || "").toUpperCase();
    if (s === "CUR_ACTIVE") return "Đang áp dụng";
    if (s === "CUR_DRAFT") return "Bản nháp";
    if (s === "CUR_ARCHIVED") return "Lưu trữ";
    return status ? String(status) : "—";
}

function curriculumClassificationChipSx(kind) {
    const labelPad = {px: 0.875};
    if (kind === "method") {
        return {
            height: 22,
            fontSize: "0.625rem",
            fontWeight: 600,
            bgcolor: "#f3edff",
            color: "#7c6aa6",
            border: "1px solid rgba(167, 139, 250, 0.28)",
            borderRadius: 999,
            "& .MuiChip-label": labelPad
        };
    }
    if (kind === "year") {
        return {
            height: 22,
            fontSize: "0.625rem",
            fontWeight: 600,
            bgcolor: "#fff7ed",
            color: "#b45309",
            border: "1px solid rgba(253, 186, 116, 0.45)",
            borderRadius: 999,
            "& .MuiChip-label": labelPad
        };
    }
    return {
        height: 22,
        fontSize: "0.625rem",
        fontWeight: 600,
        bgcolor: "#eef2ff",
        color: "#6478c8",
        border: "1px solid rgba(129, 140, 248, 0.28)",
        borderRadius: 999,
        "& .MuiChip-label": labelPad
    };
}

function curriculumHeaderStatusChipSx(status) {
    return {
        ...curriculumStatusChipSx(status),
        height: 28,
        fontSize: "0.7rem",
        flexShrink: 0,
        "& .MuiChip-label": {px: 1.125}
    };
}

function mapCurriculumTypeLabel(type) {
    const value = String(type || "").trim().toUpperCase();
    if (value === "NATIONAL") return "Khung chương trình Bộ GD&ĐT";
    if (value === "INTERNATIONAL") return "Chương trình quốc tế";
    if (value === "BILINGUAL") return "Chương trình song ngữ";
    return value || "Đang cập nhật";
}

function mapLearningMethodLabel(method) {
    const value = String(method || "").trim().toUpperCase();
    if (!value) return "";
    if (value === "COOPERATIVE") return "Học tập hợp tác";
    if (value === "VISUAL_PRACTICE") return "Thị giác & thực hành";
    if (value === "PROJECT_BASED") return "Học theo dự án";
    if (value === "EXPERIENTIAL") return "Học qua trải nghiệm";
    return value
        .split("_")
        .filter(Boolean)
        .map((s) => s[0] + s.slice(1).toLowerCase())
        .join(" ");
}

function stripHtmlToPlainText(value) {
    return String(value || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function resolveCampusImageUrl(imageJson) {
    if (imageJson == null || imageJson === "") return null;
    if (typeof imageJson === "string") {
        const t = imageJson.trim();
        if (t.startsWith("http://") || t.startsWith("https://")) return t;
        try {
            const parsed = JSON.parse(t);
            if (typeof parsed === "string") return parsed;
            if (parsed && typeof parsed === "object" && parsed.url) return String(parsed.url);
        } catch {
            return null;
        }
    }
    return null;
}

function formatFoundingDate(value) {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateArray(value) {
    if (!Array.isArray(value) || value.length < 3) return "—";
    const [y, m, d] = value;
    if (!Number.isFinite(Number(y)) || !Number.isFinite(Number(m)) || !Number.isFinite(Number(d))) return "—";
    const day = String(Number(d)).padStart(2, "0");
    const month = String(Number(m)).padStart(2, "0");
    const year = String(Number(y));
    return `${day}/${month}/${year}`;
}

function formatIsoDate(value) {
    if (!value) return "—";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatVnd(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(amount);
}

function classifyMandatoryDocument(name) {
    const text = String(name || "").toLowerCase();
    if (
        text.includes("học bạ") ||
        text.includes("hoc ba") ||
        text.includes("tốt nghiệp") ||
        text.includes("tot nghiep") ||
        text.includes("đăng ký xét tuyển") ||
        text.includes("dang ky xet tuyen")
    ) {
        return "academic";
    }
    if (
        text.includes("khai sinh") ||
        text.includes("cccd") ||
        text.includes("căn cước") ||
        text.includes("can cuoc") ||
        text.includes("ảnh") ||
        text.includes("anh") ||
        text.includes("hộ khẩu") ||
        text.includes("ho khau") ||
        text.includes("cư trú") ||
        text.includes("cu tru")
    ) {
        return "personal";
    }
    return "form";
}

function getDocCopyBadge(name) {
    const text = String(name || "").toLowerCase();
    if (text.includes("bản chính") || text.includes("ban chinh")) return "Bản chính";
    if (text.includes("bản sao") || text.includes("ban sao")) return "Bản sao";
    if (text.includes("photo") || text.includes("photocopy")) return "Photo";
    return "";
}

function splitDocPrimaryAndNote(name) {
    const text = String(name || "").trim();
    if (!text) return {primary: "", note: ""};
    const match = text.match(/^(.*?)(\s*\(([^)]*)\)\s*)$/);
    if (!match) return {primary: text, note: ""};
    return {
        primary: String(match[1] || "").trim(),
        note: String(match[2] || "").trim()
    };
}

let detailScrollAnimGeneration = 0;

function smoothScrollContainerToElement(container, element) {
    if (!container || !element || typeof window === "undefined") return;
    const startTop = container.scrollTop;
    const elRect = element.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const relativeTop = elRect.top - cRect.top + startTop - DETAIL_SCROLL_HEADROOM;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(relativeTop, maxScroll));
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 0.5) return;
    const duration = Math.max(
        DETAIL_SCROLL_MIN_MS,
        Math.min(DETAIL_SCROLL_MAX_MS, 360 + Math.abs(distance) * 0.55)
    );

    const myGen = ++detailScrollAnimGeneration;
    const startTime = performance.now();

    const step = (now) => {
        if (myGen !== detailScrollAnimGeneration) return;
        const rawT = Math.min(1, (now - startTime) / duration);
        const t = smootherstep(rawT);
        container.scrollTop = startTop + distance * t;
        if (rawT < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return duration;
}

function buildSchoolContact(school) {
    const hasWebsite = Boolean(school?.website);
    const resolvedEmail = (() => {
        const fromList = Array.isArray(school?.consultantEmails)
            ? school.consultantEmails.map((e) => String(e || "").trim()).find(Boolean)
            : "";
        return (
            String(school?.emailSupport || "").trim() ||
            String(school?.email || "").trim() ||
            String(school?.counsellorEmail || "").trim() ||
            fromList ||
            ""
        );
    })();
    return {
        websiteUrl: hasWebsite
            ? school.website
            : `https://www.google.com/search?q=${encodeURIComponent(school?.school ?? "")}`,
        websiteIsExternal: hasWebsite,
        websiteDisplay: hasWebsite ? school.website : "Tìm kiếm trên Google",
        address: school?.address || `${school?.ward ?? ""}, ${school?.province ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim() || "—",
        phone: school?.phone || "Đang cập nhật",
        email: resolvedEmail || "Đang cập nhật",
        location: school?.locationLabel || school?.province || "—"
    };
}

const CONTACT_BODY = "#0f172a";
const CONTACT_MUTED = "#0f172a";
const CURRICULUM_DESCRIPTION_TEXT = "#0f172a";
const contactIconSx = {fontSize: 22, color: CONTACT_BODY, flexShrink: 0, opacity: 0.92};
const contactRowSx = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    py: 1.65,
    minHeight: 48
};
const contactDividerSx = {borderColor: "rgba(51,65,85,0.1)"};

const generalInfoCardSx = {
    p: {xs: 2, sm: 2.5},
    borderRadius: 3.25,
    border: "1px solid rgba(96,165,250,0.55)",
    background: "linear-gradient(180deg, #eaf4ff 0%, #dcecff 100%)",
    boxShadow: "0 10px 22px rgba(59,130,246,0.16), 0 2px 6px rgba(15,23,42,0.05)"
};

const verticalCardTitleSx = {
    fontWeight: 800,
    color: BRAND_NAVY,
    fontSize: {xs: "1.35rem", sm: "1.5rem"},
    lineHeight: 1.2,
    mb: 2.25,
    letterSpacing: "-0.02em"
};

const mainDetailSectionTitleSx = {
    fontWeight: 800,
    color: BRAND_NAVY,
    fontSize: {xs: "1.5rem", sm: "1.875rem"},
    lineHeight: 1.2,
    mb: {xs: 2.25, sm: 2.75},
    letterSpacing: "-0.02em"
};

const detailMainColumnCardSx = {
    p: 2.5,
    borderRadius: 2.75,
    border: "1px solid rgba(96,165,250,0.52)",
    background: "linear-gradient(180deg, #edf6ff 0%, #dfeeff 100%)",
    boxShadow: "0 10px 22px rgba(59,130,246,0.15), 0 2px 6px rgba(15,23,42,0.05)",
    minWidth: 0
};

function SchoolGeneralInfoCard({school}) {
    const rep = (school?.representativeName || "").trim() || "Chưa cập nhật";
    const dateStr = formatFoundingDate(school?.foundingDate) || "Chưa cập nhật";
    const hasCampus = (school?.totalCampus ?? 0) > 0;

    return (
        <Card sx={generalInfoCardSx}>
            <Typography sx={verticalCardTitleSx}>Thông tin chung</Typography>

            <Box sx={contactRowSx}>
                <PersonIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.45}}>
                    <Box component="span" sx={{fontWeight: 600}}>
                        Người đại diện:{" "}
                    </Box>
                    <Box component="span" sx={{color: "#334155", fontWeight: 700}}>
                        {rep}
                    </Box>
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <CalendarTodayIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.45}}>
                    <Box component="span" sx={{fontWeight: 600}}>
                        Ngày thành lập:{" "}
                    </Box>
                    <Box component="span" sx={{color: "#334155", fontWeight: 700}}>
                        {dateStr}
                    </Box>
                </Typography>
            </Box>

            {hasCampus && <Divider sx={contactDividerSx}/>}

            {hasCampus && (
                <Box sx={contactRowSx}>
                    <SchoolIcon sx={contactIconSx}/>
                    <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.45}}>
                        <Box component="span" sx={{color: "#334155", fontWeight: 800}}>
                            {school.totalCampus}
                        </Box>{" "}
                        <Box component="span" sx={{fontWeight: 600}}>
                            cơ sở
                        </Box>
                    </Typography>
                </Box>
            )}
        </Card>
    );
}

function SchoolCampusInfoCard({school, isParent, onMessageCampus, activeCampusIndex: activeCampusIndexProp, onActiveCampusIndexChange}) {
    const list = Array.isArray(school?.campusList) ? school.campusList : [];
    const [internalActiveIdx, setInternalActiveIdx] = React.useState(0);
    const controlled =
        typeof activeCampusIndexProp === "number" && typeof onActiveCampusIndexChange === "function";
    const activeCampusIndex = controlled ? activeCampusIndexProp : internalActiveIdx;
    const setActiveCampusIndex = controlled ? onActiveCampusIndexChange : setInternalActiveIdx;

    React.useEffect(() => {
        if (!controlled) {
            setInternalActiveIdx(0);
        }
    }, [school?.id, list.length, controlled]);

    const activeCampus = list[activeCampusIndex] || null;

    return (
        <Box sx={detailMainColumnCardSx}>
            <Typography sx={mainDetailSectionTitleSx}>Thông tin cơ sở</Typography>

            {list.length === 0 ? (
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.6}}>
                    Chưa có thông tin cơ sở.
                </Typography>
            ) : (
                <>

                    <Tabs
                        value={activeCampusIndex}
                        onChange={(_, idx) => setActiveCampusIndex(idx)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            minHeight: 44,
                            mb: 2,
                            "& .MuiTabs-scrollButtons": {
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                border: "1px solid rgba(148,163,184,0.42)",
                                mx: 0.35,
                                "&.Mui-disabled": {opacity: 0.32}
                            },
                            "& .MuiTabs-indicator": {
                                display: "none"
                            },
                            "& .MuiTabs-flexContainer": {
                                gap: 0.75
                            },
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                minHeight: 34,
                                minWidth: "auto",
                                px: 1.5,
                                py: 0.85,
                                color: "#334155",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.42)",
                                bgcolor: "rgba(255,255,255,0.72)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.9)",
                                    borderColor: "rgba(71,85,105,0.48)"
                                }
                            },
                            "& .Mui-selected": {
                                color: "#ffffff !important",
                                borderColor: "rgba(29,78,216,0.95)",
                                bgcolor: "#2563eb",
                                boxShadow: "0 6px 14px rgba(37,99,235,0.28)",
                                "&:hover": {
                                    bgcolor: "#2563eb",
                                    borderColor: "rgba(29,78,216,0.95)"
                                }
                            }
                        }}
                    >
                        {list.map((campus, idx) => {
                            const tabLabel = String(campus?.name || "").trim() || `Cơ sở ${idx + 1}`;
                            return <Tab key={campus?.id ?? `campus-tab-${idx}`} label={tabLabel} disableRipple/>;
                        })}
                    </Tabs>
                    {activeCampus &&
                        (() => {
                            const campus = activeCampus;
                            const idx = activeCampusIndex;
                            const name = String(campus?.name || "").trim() || `Cơ sở ${idx + 1}`;
                    const city = String(campus?.city || "").trim();
                    const district = String(campus?.district || "").trim();
                    const addrRaw = String(campus?.address || "").trim();
                    const displayAddr =
                        addrRaw || [district, city].filter(Boolean).join(", ") || "";
                    const phone = String(campus?.phoneNumber || "").trim();
                    const boardingTags = getBoardingTypeTags(campus?.boardingType);
                    const emails = Array.isArray(campus?.consultantEmails)
                        ? campus.consultantEmails.map((e) => String(e || "").trim()).filter(Boolean)
                        : [];
                    const policy = campus?.policyDetail != null ? String(campus.policyDetail).trim() : "";
                    const facility = campus?.facility != null ? String(campus.facility).trim() : "";
                    const statusRaw = campus?.status;
                    const imgUrl = resolveCampusImageUrl(campus?.imageJson);
                    const hasStatus = statusRaw != null && String(statusRaw).trim() !== "";
                    const hasAfterAddr =
                        Boolean(phone) ||
                        boardingTags.length > 0 ||
                        emails.length > 0 ||
                        hasStatus ||
                        Boolean(facility) ||
                        Boolean(policy);
                    const hasAfterPhone =
                        boardingTags.length > 0 ||
                        emails.length > 0 ||
                        hasStatus ||
                        Boolean(facility) ||
                        Boolean(policy);
                    const hasAfterBoarding =
                        emails.length > 0 || hasStatus || Boolean(facility) || Boolean(policy);
                    const hasAfterEmails = hasStatus || Boolean(facility) || Boolean(policy);

                            return (
                                <Box key={campus?.id ?? `${name}-${idx}`}>

                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    color: BRAND_NAVY,
                                    fontSize: "1.05rem",
                                    mb: 1.5
                                }}
                            >
                                {name}
                            </Typography>

                            {imgUrl && (
                                <CardMedia
                                    component="img"
                                    image={imgUrl}
                                    alt=""
                                    sx={{
                                        width: "100%",
                                        maxHeight: 200,
                                        objectFit: "cover",
                                        borderRadius: 2,
                                        mb: 1.5,
                                        border: "1px solid rgba(51,65,85,0.08)"
                                    }}
                                />
                            )}

                            {displayAddr ? (
                                <>
                                    <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                        <MapsHomeWorkIcon sx={contactIconSx}/>
                                        <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                            {displayAddr}
                                        </Typography>
                                    </Box>
                                    {hasAfterAddr && <Divider sx={contactDividerSx}/>}
                                </>
                            ) : null}

                            {phone ? (
                                <>
                                    <Box sx={contactRowSx}>
                                        <PhoneIcon sx={contactIconSx}/>
                                        <Typography
                                            component="a"
                                            href={`tel:${phone.replace(/\s/g, "")}`}
                                            sx={{
                                                fontSize: "0.9rem",
                                                color: CONTACT_BODY,
                                                textDecoration: "none",
                                                "&:hover": {color: BRAND_NAVY}
                                            }}
                                        >
                                            {phone}
                                        </Typography>
                                    </Box>
                                    {hasAfterPhone && <Divider sx={contactDividerSx}/>}
                                </>
                            ) : null}

                            {boardingTags.length > 0 ? (
                                <>
                                    <Box sx={{...contactRowSx, alignItems: "center", flexWrap: "wrap", py: 1.25}}>
                                        <HotelIcon sx={{...contactIconSx, alignSelf: "flex-start", mt: 0.35}}/>
                                        <Box sx={{display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center"}}>
                                            {boardingTags.map((tag) => (
                                                <Chip
                                                    key={tag}
                                                    label={tag}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(59,130,246,0.1)",
                                                        color: BRAND_NAVY,
                                                        border: "1px solid rgba(59,130,246,0.25)"
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                    {hasAfterBoarding && <Divider sx={contactDividerSx}/>}
                                </>
                            ) : null}

                            {emails.length > 0 ? (
                                <>
                                    <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                        <EmailIcon sx={contactIconSx}/>
                                        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75}}>
                                            {emails.map((em) => (
                                                <Typography
                                                    key={em}
                                                    component="a"
                                                    href={`mailto:${em}`}
                                                    sx={{
                                                        fontSize: "0.9rem",
                                                        color: CONTACT_BODY,
                                                        wordBreak: "break-all",
                                                        textDecoration: "none",
                                                        "&:hover": {color: BRAND_NAVY}
                                                    }}
                                                >
                                                    {em}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                    {hasAfterEmails && <Divider sx={contactDividerSx}/>}
                                </>
                            ) : null}

                            {statusRaw != null && String(statusRaw).trim() !== "" ? (
                                <>
                                    <Box sx={contactRowSx}>
                                        <CheckCircleIcon sx={contactIconSx}/>
                                        <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY}}>
                                            Trạng thái:{" "}
                                            <Box component="span" sx={{fontWeight: 700, color: "#334155"}}>
                                                {formatCampusStatus(statusRaw)}
                                            </Box>
                                        </Typography>
                                    </Box>
                                    {(facility || policy) && <Divider sx={contactDividerSx}/>}
                                </>
                            ) : null}

                            {facility ? (
                                <>
                                    <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                        <BusinessIcon sx={contactIconSx}/>
                                        <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                            <Box component="span" sx={{fontWeight: 600}}>
                                                Cơ sở vật chất:{" "}
                                            </Box>
                                            {facility}
                                        </Typography>
                                    </Box>
                                    {policy ? <Divider sx={contactDividerSx}/> : null}
                                </>
                            ) : null}

                            {policy ? (
                                <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                    <ChatBubbleOutlineIcon sx={contactIconSx}/>
                                    <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                        <Box component="span" sx={{fontWeight: 600}}>
                                            Chính sách:{" "}
                                        </Box>
                                        {policy}
                                    </Typography>
                                </Box>
                            ) : null}

                            {isParent && campus?.id != null && typeof onMessageCampus === "function" ? (
                                <>
                                    <Divider sx={contactDividerSx}/>
                                    <Box sx={{pt: 1.5}}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<ChatBubbleOutlineIcon sx={{fontSize: 18}}/>}
                                            onClick={() => onMessageCampus(campus)}
                                            title="Mở chat với tư vấn viên cơ sở này (cần đăng nhập phụ huynh)"
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                borderColor: BRAND_NAVY,
                                                color: BRAND_NAVY,
                                                "&:hover": {
                                                    borderColor: APP_PRIMARY_DARK,
                                                    bgcolor: "rgba(30,58,138,0.06)"
                                                }
                                            }}
                                        >
                                            Nhắn tin
                                        </Button>
                                    </Box>
                                </>
                            ) : null}
                                </Box>
                            );
                        })()}
                </>
            )}
        </Box>
    );
}

function SchoolCurriculumInfoCard({campaignTemplates, campaignLoading, campaignError, curriculumList}) {
    const list = Array.isArray(campaignTemplates) ? campaignTemplates : [];
    const curriculumDataList = Array.isArray(curriculumList) ? curriculumList : [];

    return (
        <Box sx={detailMainColumnCardSx}>
            <Typography sx={mainDetailSectionTitleSx}>Chiến dịch tuyển sinh</Typography>

            {campaignLoading ? (
                <Typography sx={{fontSize: "1.06rem", color: CONTACT_BODY, lineHeight: 1.65}}>
                    Đang tải chiến dịch tuyển sinh...
                </Typography>
            ) : null}
            {!campaignLoading && campaignError ? (
                <Typography sx={{fontSize: "1.06rem", color: "#b45309", lineHeight: 1.65}}>
                    {campaignError}
                </Typography>
            ) : null}
            {!campaignLoading && !campaignError && list.length === 0 ? (
                <Typography sx={{fontSize: "1.06rem", color: CONTACT_BODY, lineHeight: 1.65}}>
                    Chưa có thông tin chiến dịch tuyển sinh.
                </Typography>
            ) : null}

            {!campaignLoading &&
                !campaignError &&
                list.map((campaign, idx) => {
                    const campaignName = String(campaign?.name || "").trim() || `Chiến dịch ${idx + 1}`;
                    const campaignDesc = String(campaign?.description || "").trim();
                    const admissionMethodDetails = Array.isArray(campaign?.admissionMethodDetails)
                        ? campaign.admissionMethodDetails
                        : [];
                    const mandatoryAll = Array.isArray(campaign?.mandatoryAll) ? campaign.mandatoryAll : [];
                    const campusProgramOfferings = Array.isArray(campaign?.campusProgramOfferings)
                        ? campaign.campusProgramOfferings
                        : [];

                    return (
                        <Box key={`${campaign?.id ?? idx}-${campaignName}`} sx={{mt: idx === 0 ? 0 : 3}}>
                            {idx > 0 ? <Divider sx={{...contactDividerSx, mb: 2.5}}/> : null}

                            <Typography
                                sx={{
                                    fontWeight: 900,
                                    color: "#0f172a",
                                    fontSize: {xs: "1.36rem", sm: "1.68rem"},
                                    letterSpacing: "-0.02em",
                                    mb: 1,
                                    lineHeight: 1.25
                                }}
                            >
                                {campaignName}
                            </Typography>

                            <Box
                                sx={{
                                    mb: 1.6,
                                    p: {xs: 1.2, sm: 1.4},
                                    borderRadius: 2,
                                    border: "1px solid rgba(191,219,254,0.75)",
                                    bgcolor: "rgba(239,246,255,0.75)"
                                }}
                            >
                                <Typography sx={{fontSize: "1.04rem", fontWeight: 800, color: BRAND_NAVY, mb: 0.7}}>
                                    Thông tin chiến dịch
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.8, mb: campaignDesc ? 0.75 : 0}}>
                                    <Chip size="small" label={`Năm ${campaign?.year ?? "—"}`} sx={curriculumClassificationChipSx("year")}/>
                                    <Chip
                                        size="small"
                                        label={`Từ ${formatIsoDate(campaign?.startDate)} đến ${formatIsoDate(campaign?.endDate)}`}
                                        sx={curriculumClassificationChipSx("method")}
                                    />
                                    <Chip
                                        size="small"
                                        label={String(campaign?.status || "—")}
                                        sx={curriculumHeaderStatusChipSx(campaign?.status)}
                                    />
                                </Stack>
                                {campaignDesc ? (
                                    <Typography sx={{fontSize: "1.06rem", color: CURRICULUM_DESCRIPTION_TEXT, lineHeight: 1.65}}>
                                        {campaignDesc.replace(/<[^>]+>/g, "")}
                                    </Typography>
                                ) : null}
                            </Box>

                            {campusProgramOfferings.length > 0 ? (
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: {xs: 1.2, sm: 1.4},
                                        borderRadius: 2,
                                        border: "1px solid rgba(148,163,184,0.24)",
                                        bgcolor: "rgba(255,255,255,0.78)"
                                    }}
                                >
                                    <Typography sx={{fontSize: "1.16rem", fontWeight: 800, color: BRAND_NAVY, mb: 1.1}}>
                                        Gói tuyển sinh theo cơ sở
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr",
                                            gap: 1.2
                                        }}
                                    >
                                        {campusProgramOfferings.map((offering, offerIdx) => {
                                            const program = offering?.program || {};
                                            const curriculum = offering?.curriculum || program?.curriculum || {};
                                            const subjects = Array.isArray(curriculum?.subjectOptions) ? curriculum.subjectOptions : [];
                                            const quota = Number(offering?.quota);
                                            const remainingQuota = Number(offering?.remainingQuota);
                                            const hasQuota = Number.isFinite(quota) && quota > 0;
                                            const hasRemaining = Number.isFinite(remainingQuota);
                                            const filledRatio = hasQuota && hasRemaining
                                                ? Math.max(0, Math.min(1, (quota - remainingQuota) / quota))
                                                : 0;
                                            const filledPercent = Math.round(filledRatio * 100);
                                            const adjustmentPercent = Number(offering?.priceAdjustmentPercentage);
                                            const isLowQuota = hasRemaining && remainingQuota < 50;
                                            const quotaTone = isLowQuota
                                                ? {main: "#c2410c", soft: "#9a3412"}
                                                : {main: "#047857", soft: "#065f46"};
                                            return (
                                                <Box
                                                    key={`${offering?.id ?? offerIdx}-${offering?.campusId ?? "campus"}`}
                                                    sx={{
                                                        borderRadius: "16px",
                                                        background:
                                                            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,252,255,0.98) 100%)",
                                                        p: {xs: 2, sm: 2.4},
                                                        boxShadow: "0 14px 34px rgba(15,23,42,0.1)"
                                                    }}
                                                >
                                                    <Box sx={{minWidth: 0, mb: 1.25}}>
                                                        <Typography sx={{fontSize: "1.35rem", fontWeight: 900, color: "#111827", mb: 0.35, lineHeight: 1.2}}>
                                                            {offering?.campusName || `Cơ sở ${offerIdx + 1}`}
                                                        </Typography>
                                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{color: "#64748b"}}>
                                                            <LocationOnIcon sx={{fontSize: 14, color: "#94a3b8"}}/>
                                                            <Typography sx={{fontSize: "1rem", color: "#6b7280"}}>
                                                                {String(offering?.district || "").trim() || "—"},{" "}
                                                                {String(offering?.city || "").trim() || "—"}
                                                            </Typography>
                                                        </Stack>
                                                    </Box>

                                                    <Stack
                                                        direction={{xs: "column", sm: "row"}}
                                                        alignItems={{xs: "flex-start", sm: "flex-end"}}
                                                        justifyContent="space-between"
                                                        spacing={1.25}
                                                        sx={{mb: 1.15}}
                                                    >
                                                        <Box sx={{minWidth: 0}}>
                                                            <Typography sx={{fontSize: "0.76rem", color: "#6b7280", fontWeight: 600, mb: 0.12}}>
                                                                Học phí
                                                            </Typography>
                                                            <Typography sx={{fontSize: {xs: "1.45rem", sm: "1.62rem"}, color: "#1e3a8a", fontWeight: 900, lineHeight: 1.12}}>
                                                                {formatVnd(offering?.tuitionFee)}
                                                            </Typography>
                                                            <Typography sx={{fontSize: "0.76rem", color: "#475569", mt: 0.25, fontWeight: 500}}>
                                                                {formatVnd(offering?.baseTuitionFee)}
                                                                {Number.isFinite(adjustmentPercent)
                                                                    ? ` • ${(adjustmentPercent * 100).toFixed(1)}%`
                                                                    : ""}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{textAlign: {xs: "left", sm: "right"}}}>
                                                            <Typography sx={{fontSize: "0.76rem", color: "#6b7280", fontWeight: 600, mb: 0.12}}>
                                                                Chỉ tiêu
                                                            </Typography>
                                                            <Typography sx={{fontSize: "1.02rem", color: quotaTone.main, fontWeight: 900}}>
                                                                Còn {offering?.remainingQuota ?? "—"} suất
                                                            </Typography>
                                                            <Typography sx={{fontSize: "0.76rem", color: quotaTone.soft, fontWeight: 500}}>
                                                                Tổng {offering?.quota ?? "—"} • {String(offering?.admissionMethod || "—")}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>

                                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 1.2}}>
                                                        <Box sx={{minWidth: 0}}>
                                                            <Typography sx={{fontSize: "0.78rem", color: "#6b7280", fontWeight: 600}}>
                                                                Chương trình
                                                            </Typography>
                                                            <Typography sx={{fontSize: "1.08rem", color: "#111827", fontWeight: 700, lineHeight: 1.45}}>
                                                                {program?.name || "—"}
                                                            </Typography>
                                                            <Typography sx={{fontSize: "0.78rem", color: "#6b7280", fontStyle: "italic", mt: 0.2}}>
                                                                ({curriculum?.name || "—"})
                                                            </Typography>
                                                        </Box>
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={0.6}
                                                            sx={{
                                                                px: 1,
                                                                py: 0.5,
                                                                borderRadius: 999,
                                                                bgcolor: "rgba(255,247,237,0.95)",
                                                                border: "1px solid rgba(251,191,36,0.24)",
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            <CalendarTodayIcon sx={{fontSize: 14, color: "#b45309"}}/>
                                                            <Typography sx={{fontSize: "0.76rem", color: "#92400e", fontWeight: 700, whiteSpace: "nowrap"}}>
                                                                {formatIsoDate(offering?.openDate)} - {formatIsoDate(offering?.closeDate)}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>

                                                    {hasQuota && hasRemaining && filledPercent > 0 ? (
                                                        <Typography sx={{fontSize: "0.76rem", color: "#475569", mb: 1.05, fontWeight: 500}}>
                                                            Đã tuyển {filledPercent}% chỉ tiêu
                                                        </Typography>
                                                    ) : null}

                                                    {subjects.length > 0 ? (
                                                        <Box sx={{mt: 1.35}}>
                                                            <Typography sx={{fontSize: "0.76rem", color: "#6b7280", fontWeight: 600, mb: 0.55}}>
                                                                Môn học
                                                            </Typography>
                                                            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.55}}>
                                                                {subjects.map((sub, subIdx) => (
                                                                    <Box
                                                                        key={`${sub?.name || subIdx}-${subIdx}`}
                                                                        sx={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: 0.45,
                                                                            px: 0.9,
                                                                            py: 0.35,
                                                                            borderRadius: 999,
                                                                            bgcolor: "#f3f4f6",
                                                                            color: "#374151",
                                                                            fontSize: "0.74rem",
                                                                            fontWeight: 500,
                                                                            lineHeight: 1.2
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            component="span"
                                                                            sx={{
                                                                                width: 5,
                                                                                height: 5,
                                                                                borderRadius: "50%",
                                                                                bgcolor: sub?.isMandatory ? "#1d4ed8" : "#9ca3af",
                                                                                flexShrink: 0
                                                                            }}
                                                                        />
                                                                        {String(sub?.name || "").trim() || `Môn ${subIdx + 1}`}
                                                                    </Box>
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    ) : null}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ) : null}

                            {admissionMethodDetails.length > 0 ? (
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: {xs: 1.35, sm: 1.6},
                                        borderRadius: 2,
                                        bgcolor: "rgba(248,252,255,0.86)",
                                        boxShadow: "0 10px 22px rgba(15,23,42,0.07)"
                                    }}
                                >
                                    <Typography sx={{fontSize: "1.16rem", fontWeight: 800, color: BRAND_NAVY, mb: 1}}>
                                        Phương thức xét tuyển
                                    </Typography>
                                    <Stack spacing={1}>
                                        {admissionMethodDetails.map((method, methodIdx) => {
                                            const steps = Array.isArray(method?.admissionProcessSteps) ? method.admissionProcessSteps : [];
                                            return (
                                                <Box
                                                    key={`${method?.methodCode || methodIdx}-${methodIdx}`}
                                                    sx={{
                                                        borderRadius: 2.4,
                                                        bgcolor: "#ffffff",
                                                        px: {xs: 1.25, sm: 1.45},
                                                        py: {xs: 1.15, sm: 1.3},
                                                        boxShadow: "0 8px 18px rgba(15,23,42,0.06)"
                                                    }}
                                                >
                                                    <Typography sx={{fontSize: "1.02rem", fontWeight: 900, color: BRAND_NAVY, textTransform: "uppercase", letterSpacing: "0.01em"}}>
                                                        {method?.displayName || method?.methodCode || `Phương thức ${methodIdx + 1}`}
                                                    </Typography>
                                                    <Typography sx={{fontSize: "1rem", color: "#475569", lineHeight: 1.65, mt: 0.2}}>
                                                        {String(method?.description || "").trim() || "—"}
                                                    </Typography>

                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={0.6}
                                                        sx={{
                                                            mt: 1,
                                                            width: "fit-content",
                                                            px: 1,
                                                            py: 0.45,
                                                            borderRadius: 999,
                                                            bgcolor: "rgba(59,130,246,0.1)",
                                                            border: "1px solid rgba(59,130,246,0.22)"
                                                        }}
                                                    >
                                                        <CalendarTodayIcon sx={{fontSize: 14, color: "#1d4ed8"}}/>
                                                        <Typography sx={{fontSize: "0.78rem", color: "#1e3a8a", fontWeight: 700}}>
                                                            {formatDateArray(method?.startDate)} - {formatDateArray(method?.endDate)}
                                                        </Typography>
                                                    </Stack>

                                                    {Array.isArray(method?.methodDocumentRequirements) &&
                                                    method.methodDocumentRequirements.length > 0 ? (
                                                        <Box sx={{mt: 1.15}}>
                                                            <Typography sx={{fontSize: "0.78rem", color: "#64748b", fontWeight: 700, mb: 0.55}}>
                                                                Hồ sơ cần chuẩn bị
                                                            </Typography>
                                                            <Box
                                                                sx={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: {xs: "1fr", sm: "repeat(2, minmax(0, 1fr))"},
                                                                    gap: 0.55
                                                                }}
                                                            >
                                                                {method.methodDocumentRequirements.map((doc, reqIdx) => (
                                                                    <Stack key={`${doc?.code || reqIdx}-${reqIdx}`} direction="row" alignItems="center" spacing={0.55} sx={{minWidth: 0}}>
                                                                        <CheckCircleIcon sx={{fontSize: 15, color: "#16a34a", flexShrink: 0}}/>
                                                                        <Typography sx={{fontSize: "0.96rem", color: "#334155", lineHeight: 1.62}}>
                                                                            {doc?.name || doc?.code || `Hồ sơ ${reqIdx + 1}`}
                                                                            {doc?.required ? (
                                                                                <Box component="span" sx={{color: "#dc2626", fontWeight: 800, fontSize: "0.72rem", ml: 0.28}}>
                                                                                    *
                                                                                </Box>
                                                                            ) : null}
                                                                        </Typography>
                                                                    </Stack>
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    ) : null}

                                                    {steps.length > 0 ? (
                                                        <Box sx={{mt: 1.3}}>
                                                            <Typography sx={{fontSize: "0.78rem", color: "#64748b", fontWeight: 700, mb: 0.7}}>
                                                                Quy trình thực hiện
                                                            </Typography>
                                                            <Stack spacing={0.9}>
                                                                {steps.map((step, stepIdx) => {
                                                                    const isLast = stepIdx === steps.length - 1;
                                                                    const stepName = String(step?.stepName || "").trim() || `Bước ${stepIdx + 1}`;
                                                                    const lower = stepName.toLowerCase();
                                                                    const stepIcon = lower.includes("phỏng vấn") || lower.includes("phong van")
                                                                        ? <ChatBubbleOutlineIcon sx={{fontSize: 14, color: "#1e40af"}}/>
                                                                        : <DescriptionIcon sx={{fontSize: 14, color: "#1e40af"}}/>;
                                                                    return (
                                                                        <Box key={`${step?.stepOrder || stepIdx}-${stepIdx}`} sx={{display: "flex", gap: 0.85, alignItems: "flex-start"}}>
                                                                            <Box sx={{position: "relative", pt: 0.05}}>
                                                                                <Box
                                                                                    sx={{
                                                                                        width: 22,
                                                                                        height: 22,
                                                                                        borderRadius: "50%",
                                                                                        bgcolor: "rgba(59,130,246,0.14)",
                                                                                        border: "1px solid rgba(59,130,246,0.35)",
                                                                                        display: "inline-flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center",
                                                                                        color: "#1d4ed8",
                                                                                        fontSize: "0.72rem",
                                                                                        fontWeight: 800
                                                                                    }}
                                                                                >
                                                                                    {step?.stepOrder ?? stepIdx + 1}
                                                                                </Box>
                                                                                {!isLast ? (
                                                                                    <Box
                                                                                        sx={{
                                                                                            position: "absolute",
                                                                                            left: "50%",
                                                                                            top: 23,
                                                                                            transform: "translateX(-50%)",
                                                                                            width: 1.5,
                                                                                            height: 26,
                                                                                            bgcolor: "rgba(148,163,184,0.35)",
                                                                                            borderRadius: 999
                                                                                        }}
                                                                                    />
                                                                                ) : null}
                                                                            </Box>
                                                                            <Box sx={{pt: 0.02, minWidth: 0}}>
                                                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                                    {stepIcon}
                                                                                    <Typography sx={{fontSize: "1rem", color: "#0f172a", fontWeight: 800, lineHeight: 1.5}}>
                                                                                        {stepName}
                                                                                    </Typography>
                                                                                </Stack>
                                                                                <Typography sx={{fontSize: "0.96rem", color: "#475569", lineHeight: 1.65}}>
                                                                                    {String(step?.description || "").trim()}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    );
                                                                })}
                                                            </Stack>
                                                        </Box>
                                                    ) : null}
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            ) : null}

                            {mandatoryAll.length > 0 ? (
                                <Box
                                    sx={{
                                        p: {xs: 1.8, sm: 2.25},
                                        borderRadius: 2.4,
                                        bgcolor: "#ffffff",
                                        border: "1px solid rgba(229,231,235,0.9)",
                                        boxShadow: "0 18px 36px rgba(15,23,42,0.1)"
                                    }}
                                >
                                    <Typography sx={{fontSize: "1.08rem", fontWeight: 900, color: BRAND_NAVY, mb: 1.3}}>
                                        Hồ sơ cần nộp
                                    </Typography>
                                    {(() => {
                                        const groups = {
                                            academic: {
                                                title: "Giấy tờ học tập",
                                                items: []
                                            },
                                            personal: {
                                                title: "Giấy tờ cá nhân",
                                                items: []
                                            },
                                            form: {
                                                title: "Đơn từ & cam kết",
                                                items: []
                                            }
                                        };
                                        mandatoryAll.forEach((doc) => {
                                            const bucket = classifyMandatoryDocument(doc?.name || doc?.code || "");
                                            groups[bucket].items.push(doc);
                                        });
                                        const orderedGroups = [groups.academic, groups.personal, groups.form].filter(
                                            (group) => group.items.length > 0
                                        );
                                        const totalDocs = mandatoryAll.length;
                                        const preparedDocs = 0;
                                        const progressPercent = totalDocs > 0 ? Math.round((preparedDocs / totalDocs) * 100) : 0;
                                        return (
                                            <Stack spacing={1.8}>
                                                {orderedGroups.map((group) => (
                                                    <Box key={group.title}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: "1.06rem",
                                                                fontWeight: 800,
                                                                color: "#111827",
                                                                mb: 0.75
                                                            }}
                                                        >
                                                            {group.title}
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                p: {xs: 1.1, sm: 1.25},
                                                                borderRadius: 2,
                                                                bgcolor: "#ffffff",
                                                                boxShadow: "0 4px 12px rgba(15,23,42,0.05)"
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"},
                                                                    rowGap: 1.35,
                                                                    columnGap: 1.2
                                                                }}
                                                            >
                                                                {group.items.map((doc, docIdx) => {
                                                                    const name = doc?.name || doc?.code || `Hồ sơ ${docIdx + 1}`;
                                                                    const copyBadge = getDocCopyBadge(name);
                                                                    const {primary, note} = splitDocPrimaryAndNote(name);
                                                                    return (
                                                                        <Stack
                                                                            key={`${group.title}-${doc?.code || docIdx}`}
                                                                            direction="row"
                                                                            alignItems="flex-start"
                                                                            spacing={0.75}
                                                                            sx={{
                                                                                py: 0.1,
                                                                                pr: 0.3
                                                                            }}
                                                                        >
                                                                            <CheckCircleIcon sx={{fontSize: 15, color: "#cbd5e1", mt: 0.2, flexShrink: 0}}/>
                                                                            <Box sx={{minWidth: 0}}>
                                                                                <Typography
                                                                                    sx={{
                                                                                        fontSize: "0.86rem",
                                                                                        color: "#374151",
                                                                                        lineHeight: 1.7,
                                                                                        fontWeight: 500
                                                                                    }}
                                                                                >
                                                                                    {primary || name}{" "}
                                                                                    {copyBadge ? (
                                                                                        <Box
                                                                                            component="span"
                                                                                            sx={{
                                                                                                fontSize: "0.73rem",
                                                                                                fontWeight: 700,
                                                                                                color:
                                                                                                    copyBadge === "Bản chính"
                                                                                                        ? "#1e40af"
                                                                                                        : "#9a3412"
                                                                                            }}
                                                                                        >
                                                                                            ({copyBadge})
                                                                                        </Box>
                                                                                    ) : null}
                                                                                </Typography>
                                                                                {note && !copyBadge ? (
                                                                                    <Typography sx={{fontSize: "0.76rem", color: "#9ca3af", lineHeight: 1.55}}>
                                                                                        {note}
                                                                                    </Typography>
                                                                                ) : null}
                                                                            </Box>
                                                                        </Stack>
                                                                    );
                                                                })}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                ))}
                                                <Box
                                                    sx={{
                                                        mt: 0.25
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 0.45}}>
                                                        <Typography sx={{fontSize: "0.78rem", color: "#475569", fontWeight: 600}}>
                                                            Đã chuẩn bị {preparedDocs}/{totalDocs} loại giấy tờ
                                                        </Typography>
                                                        <Typography sx={{fontSize: "0.74rem", color: "#64748b", fontWeight: 700}}>
                                                            {progressPercent}%
                                                        </Typography>
                                                    </Stack>
                                                    <Box
                                                        sx={{
                                                            width: "100%",
                                                            height: 6,
                                                            borderRadius: 999,
                                                            bgcolor: "rgba(148,163,184,0.24)",
                                                            overflow: "hidden"
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: `${progressPercent}%`,
                                                                height: "100%",
                                                                borderRadius: 999,
                                                                bgcolor: "#2563eb",
                                                                transition: "width 0.25s ease"
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography sx={{fontSize: "0.72rem", color: "#94a3b8", mt: 0.45}}>
                                                        Tích chọn từng giấy tờ sau khi chuẩn bị để cập nhật tiến độ.
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        );
                                    })()}
                                </Box>
                            ) : null}
                        </Box>
                    );
                })}

            <Divider sx={{...contactDividerSx, mt: list.length > 0 ? 3 : 2, mb: 2.5}}/>
            <Typography sx={mainDetailSectionTitleSx}>Chương trình đào tạo</Typography>

            {curriculumDataList.length === 0 ? (
                <Typography sx={{fontSize: "1.06rem", color: CONTACT_BODY, lineHeight: 1.65}}>
                    Chưa có thông tin chương trình đào tạo.
                </Typography>
            ) : null}

            {curriculumDataList.map((curriculum, curriculumIdx) => {
                const curriculumName = String(curriculum?.name || "").trim() || `Chương trình ${curriculumIdx + 1}`;
                const methodLearningList = Array.isArray(curriculum?.methodLearningList)
                    ? curriculum.methodLearningList
                    : [];
                const subjects = Array.isArray(curriculum?.subjectsJsonb) ? curriculum.subjectsJsonb : [];
                const programList = Array.isArray(curriculum?.programList) ? curriculum.programList : [];
                const curriculumDescription = stripHtmlToPlainText(curriculum?.description);
                const yearLabel = Number.isFinite(Number(curriculum?.applicationYear))
                    ? String(curriculum?.applicationYear)
                    : "—";
                const mandatorySubjects = subjects.filter((item) => item?.isMandatory).length;
                return (
                    <Box
                        key={`${curriculum?.groupCode || curriculumName}-${curriculumIdx}`}
                        sx={{
                            mt: curriculumIdx === 0 ? 1.2 : 2.1,
                            p: {xs: 1.4, sm: 1.75},
                            borderRadius: "16px",
                            border: "1px solid rgba(148,163,184,0.24)",
                            background:
                                "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)",
                            boxShadow: "0 12px 28px rgba(15,23,42,0.08)"
                        }}
                    >
                        <Stack
                            direction={{xs: "column", md: "row"}}
                            spacing={1}
                            alignItems={{xs: "flex-start", md: "center"}}
                            justifyContent="space-between"
                            sx={{mb: 1}}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 900,
                                    color: "#0f172a",
                                    fontSize: {xs: "1.24rem", sm: "1.42rem"},
                                    lineHeight: 1.35
                                }}
                            >
                                {curriculumName}
                            </Typography>
                            <Chip
                                size="small"
                                label={curriculumStatusLabel(curriculum?.curriculumStatus)}
                                sx={curriculumHeaderStatusChipSx(curriculum?.curriculumStatus)}
                            />
                        </Stack>

                        <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.7, mb: curriculumDescription ? 0.9 : 1.1}}>
                            <Chip size="small" label={`Năm áp dụng ${yearLabel}`} sx={curriculumClassificationChipSx("year")}/>
                            <Chip
                                size="small"
                                label={mapCurriculumTypeLabel(curriculum?.curriculumType)}
                                sx={curriculumClassificationChipSx("method")}
                            />
                            {curriculum?.groupCode ? (
                                <Chip
                                    size="small"
                                    label={`Mã nhóm: ${String(curriculum.groupCode).trim()}`}
                                    sx={curriculumClassificationChipSx("default")}
                                />
                            ) : null}
                        </Stack>

                        {curriculumDescription ? (
                            <Typography sx={{fontSize: "1.04rem", color: CURRICULUM_DESCRIPTION_TEXT, lineHeight: 1.7, mb: 1.2}}>
                                {curriculumDescription}
                            </Typography>
                        ) : null}

                        {methodLearningList.length > 0 ? (
                            <Box sx={{mb: 1.15}}>
                                <Typography sx={{fontSize: "0.96rem", color: "#64748b", fontWeight: 700, mb: 0.6}}>
                                    Phương pháp học tập
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.55}}>
                                    {methodLearningList.map((method, methodIdx) => (
                                        <Chip
                                            key={`${method}-${methodIdx}`}
                                            size="small"
                                            label={mapLearningMethodLabel(method)}
                                            sx={curriculumClassificationChipSx("method")}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        ) : null}

                        <Box
                            sx={{
                                p: {xs: 1.1, sm: 1.25},
                                borderRadius: 2,
                                border: "1px solid rgba(191,219,254,0.72)",
                                bgcolor: "rgba(239,246,255,0.68)"
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 0.7}}>
                                <Typography sx={{fontSize: "1rem", color: "#1e3a8a", fontWeight: 800}}>
                                    Danh mục môn học
                                </Typography>
                                <Typography sx={{fontSize: "0.76rem", color: "#334155", fontWeight: 700}}>
                                    {mandatorySubjects}/{subjects.length} môn bắt buộc
                                </Typography>
                            </Stack>
                            {subjects.length === 0 ? (
                                <Typography sx={{fontSize: "0.98rem", color: "#475569"}}>
                                    Chưa có dữ liệu môn học.
                                </Typography>
                            ) : (
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {xs: "1fr", sm: "repeat(2, minmax(0, 1fr))"},
                                        gap: 0.8
                                    }}
                                >
                                    {subjects.map((subject, subjectIdx) => (
                                        <Box
                                            key={`${subject?.name || subjectIdx}-${subjectIdx}`}
                                            sx={{
                                                p: 0.85,
                                                borderRadius: 1.5,
                                                border: "1px solid rgba(148,163,184,0.28)",
                                                bgcolor: "#ffffff"
                                            }}
                                        >
                                            <Stack direction="row" spacing={0.55} alignItems="center" sx={{mb: 0.32}}>
                                                <CheckCircleIcon
                                                    sx={{
                                                        fontSize: 14,
                                                        color: subject?.isMandatory ? "#16a34a" : "#94a3b8",
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <Typography sx={{fontSize: "0.98rem", color: "#0f172a", fontWeight: 700}}>
                                                    {String(subject?.name || "").trim() || `Môn ${subjectIdx + 1}`}
                                                </Typography>
                                            </Stack>
                                            <Typography sx={{fontSize: "0.92rem", color: "#475569", lineHeight: 1.58}}>
                                                {String(subject?.description || "").trim() || "Đang cập nhật mô tả."}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Box sx={{mt: 1.25}}>
                            <Typography sx={{fontSize: "1rem", color: BRAND_NAVY, fontWeight: 800, mb: 0.65}}>
                                Chương trình thành phần
                            </Typography>
                            {programList.length === 0 ? (
                                <Typography sx={{fontSize: "0.98rem", color: "#475569"}}>
                                    Chưa có chương trình thành phần.
                                </Typography>
                            ) : (
                                <Stack spacing={0.8}>
                                    {programList.map((program, programIdx) => (
                                        <Box
                                            key={`${program?.name || programIdx}-${programIdx}`}
                                            sx={{
                                                p: 1,
                                                borderRadius: 1.7,
                                                border: "1px solid rgba(148,163,184,0.28)",
                                                bgcolor: "rgba(255,255,255,0.96)"
                                            }}
                                        >
                                            <Stack
                                                direction={{xs: "column", sm: "row"}}
                                                spacing={0.7}
                                                alignItems={{xs: "flex-start", sm: "center"}}
                                                justifyContent="space-between"
                                                sx={{mb: 0.45}}
                                            >
                                                <Typography sx={{fontSize: "1.04rem", color: "#0f172a", fontWeight: 800}}>
                                                    {String(program?.name || "").trim() || `Chương trình ${programIdx + 1}`}
                                                </Typography>
                                                <Stack direction="row" spacing={0.55} alignItems="center">
                                                    <Chip
                                                        size="small"
                                                        label={String(program?.isActive || "—").trim()}
                                                        sx={curriculumHeaderStatusChipSx(program?.isActive)}
                                                    />
                                                    <Chip
                                                        size="small"
                                                        label={`Học phí gốc: ${formatVnd(program?.baseTuitionFee)}`}
                                                        sx={curriculumClassificationChipSx("year")}
                                                    />
                                                </Stack>
                                            </Stack>
                                            <Typography sx={{fontSize: "0.92rem", color: "#334155", lineHeight: 1.62, mb: 0.35}}>
                                                <b>Đối tượng học sinh:</b>{" "}
                                                {stripHtmlToPlainText(program?.targetStudentDescription) || "Đang cập nhật"}
                                            </Typography>
                                            <Typography sx={{fontSize: "0.92rem", color: "#334155", lineHeight: 1.62}}>
                                                <b>Chuẩn đầu ra:</b>{" "}
                                                {stripHtmlToPlainText(program?.graduationStandard) || "Đang cập nhật"}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}

function SchoolContactPanel({school}) {
    const c = buildSchoolContact(school);
    return (
        <Card sx={generalInfoCardSx}>
            <Typography sx={verticalCardTitleSx}>Thông tin liên hệ</Typography>

            <Box sx={contactRowSx}>
                <LanguageIcon sx={contactIconSx}/>
                <Link
                    href={c.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{
                        fontSize: "0.9rem",
                        color: CONTACT_BODY,
                        fontWeight: 400,
                        wordBreak: "break-all",
                        "&:hover": {color: BRAND_NAVY}
                    }}
                >
                    {c.websiteDisplay}
                </Link>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <MapsHomeWorkIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, fontWeight: 400, lineHeight: 1.45}}>
                    {c.address}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <PhoneIcon sx={contactIconSx}/>
                <Typography
                    component={c.phone !== "Đang cập nhật" ? "a" : "span"}
                    href={c.phone !== "Đang cập nhật" ? `tel:${c.phone.replace(/\s/g, "")}` : undefined}
                    sx={{
                        fontSize: "0.9rem",
                        color: c.phone === "Đang cập nhật" ? CONTACT_MUTED : CONTACT_BODY,
                        fontWeight: 400,
                        textDecoration: "none",
                        "&:hover": c.phone !== "Đang cập nhật" ? {color: BRAND_NAVY} : {}
                    }}
                >
                    {c.phone}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <EmailIcon sx={contactIconSx}/>
                <Typography
                    component={c.email !== "Đang cập nhật" ? "a" : "span"}
                    href={c.email !== "Đang cập nhật" ? `mailto:${c.email}` : undefined}
                    sx={{
                        fontSize: "0.9rem",
                        color: c.email === "Đang cập nhật" ? CONTACT_MUTED : CONTACT_BODY,
                        fontWeight: 400,
                        wordBreak: "break-all",
                        textDecoration: "none",
                        "&:hover": c.email !== "Đang cập nhật" ? {color: BRAND_NAVY} : {}
                    }}
                >
                    {c.email}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={{...contactRowSx, py: 1.65}}>
                <LocationOnIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, fontWeight: 400}}>
                    {c.location}
                </Typography>
            </Box>
        </Card>
    );
}

function SchoolLocationMap({userLocation, fallbackCenter, campuses, maptilerApiKey, onViewSchoolDetail}) {
    const center = userLocation || fallbackCenter || null;
    if (!center) return <Typography sx={{color: "#0f172a"}}>Không có tọa độ để hiển thị bản đồ.</Typography>;
    const mapUrl = `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerApiKey}`;
    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={11}
            style={MAP_CONTAINER_STYLE}
            scrollWheelZoom
        >
            <TileLayer url={mapUrl} attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap contributors'/>
            {userLocation ? (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={parentLocationIcon}>
                    <Popup>Vị trí của bạn</Popup>
                </Marker>
            ) : null}
            {campuses.map((campus) => (
                <Marker key={`${campus.id ?? campus.schoolId}-${campus.latitude}-${campus.longitude}`} position={[campus.latitude, campus.longitude]}>
                    <Popup>
                        <Box sx={{minWidth: 220}}>
                            <Typography sx={{fontWeight: 800, color: "#0f172a", mb: 0.25}}>
                                {campus.name || "Campus"}
                            </Typography>
                            <Typography sx={{fontSize: "0.82rem", color: "#0f172a", mb: 0.5}}>
                                {campus.address || "Đang cập nhật địa chỉ"}
                            </Typography>
                            <Typography sx={{fontSize: "0.82rem", color: "#0f172a", mb: 1}}>
                                <b>Khoảng cách:</b> {campus.distanceLabel}
                            </Typography>
                            {campus.schoolId ? (
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => onViewSchoolDetail?.(campus.schoolId)}
                                    sx={{textTransform: "none", fontWeight: 700, bgcolor: BRAND_NAVY, "&:hover": {bgcolor: APP_PRIMARY_DARK}}}
                                >
                                    Xem chi tiết trường
                                </Button>
                            ) : null}
                        </Box>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default function SchoolSearchDetailView({
    school,
    detailKeyRaw,
    detailLoading,
    detailError,
    maptilerApiKey,
    onSearchNearbyCampuses,
    onOpenSchoolById,
    onClose,
    navigate,
    isParent,
    canSaveSchool,
    detailIsSaved,
    detailInCompare,
    toggleCompare,
    toggleSave
}) {
    const [detailActiveSection, setDetailActiveSection] = React.useState("intro");
    const detailScrollRef = React.useRef(null);
    const detailIntroRef = React.useRef(null);
    const detailCampusRef = React.useRef(null);
    const detailCurriculumRef = React.useRef(null);
    const detailLocationRef = React.useRef(null);
    const detailConsultRef = React.useRef(null);
    const detailGeneralRef = React.useRef(null);
    const detailContactRef = React.useRef(null);
    const detailTabScrollLockRef = React.useRef(false);
    const detailTabUnlockTimerRef = React.useRef(0);
    const [userLocation, setUserLocation] = React.useState(null);
    const [nearbyCampuses, setNearbyCampuses] = React.useState([]);
    const [nearbyLoading, setNearbyLoading] = React.useState(false);
    const [nearbyError, setNearbyError] = React.useState("");
    const [nearbyNotice, setNearbyNotice] = React.useState("");
    const [showScrollTopButton, setShowScrollTopButton] = React.useState(false);
    const [campaignTemplates, setCampaignTemplates] = React.useState([]);
    const [campaignLoading, setCampaignLoading] = React.useState(false);
    const [campaignError, setCampaignError] = React.useState("");
    const [campusDetailTabIndex, setCampusDetailTabIndex] = React.useState(0);
    const [parentSlotsRaw, setParentSlotsRaw] = React.useState([]);
    const [parentSlotsLoading, setParentSlotsLoading] = React.useState(false);
    const [parentSlotsError, setParentSlotsError] = React.useState("");
    const [consultBookingDialogOpen, setConsultBookingDialogOpen] = React.useState(false);
    const [selectedConsultBookingSlot, setSelectedConsultBookingSlot] = React.useState(null);
    const [bookingPhone, setBookingPhone] = React.useState("");
    const [bookingQuestion, setBookingQuestion] = React.useState("");
    const [bookingSubmitting, setBookingSubmitting] = React.useState(false);

    React.useEffect(() => {
        setCampusDetailTabIndex(0);
    }, [school?.id]);

    const campusListForDetail = React.useMemo(
        () => (Array.isArray(school?.campusList) ? school.campusList : []),
        [school?.campusList]
    );

    React.useEffect(() => {
        if (campusListForDetail.length > 0 && campusDetailTabIndex >= campusListForDetail.length) {
            setCampusDetailTabIndex(0);
        }
    }, [campusListForDetail.length, campusDetailTabIndex]);

    const schoolCampusMarkers = React.useMemo(() => {
        const list = Array.isArray(school?.campusList) ? school.campusList : [];
        return list
            .map((campus, idx) => {
                const lat = Number(campus?.latitude);
                const lng = Number(campus?.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return {
                    id: campus?.id ?? idx,
                    schoolId: school?.id ?? null,
                    name: campus?.name || `Campus ${idx + 1}`,
                    address: campus?.address || "",
                    latitude: lat,
                    longitude: lng,
                    distanceLabel: "Đang cập nhật"
                };
            })
            .filter(Boolean);
    }, [school]);

    const fallbackCenter = React.useMemo(() => {
        const first = schoolCampusMarkers[0];
        if (!first) return null;
        return {lat: first.latitude, lng: first.longitude};
    }, [schoolCampusMarkers]);

    const requestUserLocation = React.useCallback(() => {
        setUserLocation(null);
        setNearbyCampuses([]);
        setNearbyError("");
        setNearbyNotice("");
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setNearbyNotice("");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setNearbyNotice("");
                setUserLocation({
                    lat: Number(position.coords.latitude),
                    lng: Number(position.coords.longitude)
                });
            },
            (error) => {
                if (error?.code === 1) {
                    setNearbyNotice("");
                    return;
                }
                setNearbyNotice("");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }, []);

    const normalizedNearbyCampuses = React.useMemo(() => {
        return nearbyCampuses
            .map((item, idx) => {
                const lat = Number(item?.latitude);
                const lng = Number(item?.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                const distanceNumber = Number(item?.distance);
                return {
                    ...item,
                    id: item?.id ?? item?.campusId ?? idx,
                    schoolId: item?.schoolId ?? item?.school?.id ?? null,
                    name: item?.name ?? item?.campusName ?? item?.schoolName ?? `Campus ${idx + 1}`,
                    address: item?.address ?? "",
                    latitude: lat,
                    longitude: lng,
                    distanceLabel: Number.isFinite(distanceNumber) ? `${distanceNumber.toFixed(2)} km` : "Đang cập nhật"
                };
            })
            .filter(Boolean);
    }, [nearbyCampuses]);

    const nearbyCampusesOfCurrentSchool = React.useMemo(() => {
        const currentSchoolId = Number(school?.id);
        return normalizedNearbyCampuses.filter((campus) => {
            const campusSchoolId = Number(campus?.schoolId);
            if (Number.isFinite(currentSchoolId) && Number.isFinite(campusSchoolId)) {
                return campusSchoolId === currentSchoolId;
            }
            return String(campus?.schoolId ?? "").trim() === String(school?.id ?? "").trim();
        });
    }, [normalizedNearbyCampuses, school?.id]);

    const mapCampuses = nearbyCampusesOfCurrentSchool.length > 0 ? nearbyCampusesOfCurrentSchool : schoolCampusMarkers;

    React.useEffect(() => {
        requestUserLocation();
    }, [detailKeyRaw, requestUserLocation]);

    React.useEffect(() => {
        if (typeof onSearchNearbyCampuses !== "function") return;
        const searchOrigin = userLocation || fallbackCenter;
        if (!searchOrigin) return;
        let cancelled = false;
        (async () => {
            setNearbyLoading(true);
            if (userLocation) {
                setNearbyError("");
            }
            try {
                const list = await onSearchNearbyCampuses({
                    lat: searchOrigin.lat,
                    lng: searchOrigin.lng,
                    radius: NEARBY_SEARCH_RADIUS_KM
                });
                if (cancelled) return;
                setNearbyCampuses(Array.isArray(list) ? list : []);
            } catch (e) {
                if (cancelled) return;
                const status = Number(e?.response?.status);
                const backendMsg = String(e?.response?.data?.message || "").trim();
                let msg = "Không tải được danh sách campus gần bạn.";
                if (status === 403) {
                    msg = "Bạn không có quyền truy cập dữ liệu campus lân cận.";
                } else if (backendMsg) {
                    msg = backendMsg;
                }
                setNearbyError(msg);
                setNearbyCampuses([]);
            } finally {
                if (!cancelled) setNearbyLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userLocation, fallbackCenter, onSearchNearbyCampuses]);

    React.useEffect(() => {
        const schoolId = Number(school?.id);
        if (!Number.isFinite(schoolId)) {
            setCampaignTemplates([]);
            setCampaignError("");
            setCampaignLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setCampaignLoading(true);
            setCampaignError("");
            try {
                const templates = await getPublicSchoolCampaignTemplates(schoolId, 0);
                if (cancelled) return;
                setCampaignTemplates(Array.isArray(templates) ? templates : []);
            } catch (error) {
                if (cancelled) return;
                const msg = String(error?.response?.data?.message || error?.message || "").trim();
                setCampaignTemplates([]);
                setCampaignError(msg || "Không tải được chiến dịch tuyển sinh.");
            } finally {
                if (!cancelled) setCampaignLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [school?.id]);

    React.useEffect(() => {
        setDetailActiveSection("intro");
    }, [detailKeyRaw]);

    React.useEffect(
        () => () => {
            if (detailTabUnlockTimerRef.current) {
                window.clearTimeout(detailTabUnlockTimerRef.current);
            }
        },
        []
    );

    const scrollDetailToSection = React.useCallback((section) => {
        detailTabScrollLockRef.current = true;
        setDetailActiveSection(section);
        const id =
            section === "intro"
                ? "school-detail-intro"
                : section === "campus"
                  ? "school-detail-campus"
                  : section === "curriculum"
                    ? "school-detail-curriculum"
                    : section === "location"
                      ? "school-detail-location"
                      : "school-detail-consult";
        const container = detailScrollRef.current;
        const el = typeof document !== "undefined" ? document.getElementById(id) : null;
        let lockMs = DETAIL_SCROLL_MIN_MS + DETAIL_SCROLL_LOCK_BUFFER_MS;
        if (container && el) {
            requestAnimationFrame(() => {
                const ms = smoothScrollContainerToElement(container, el);
                lockMs = (Number(ms) || DETAIL_SCROLL_MIN_MS) + DETAIL_SCROLL_LOCK_BUFFER_MS;
                if (detailTabUnlockTimerRef.current) {
                    window.clearTimeout(detailTabUnlockTimerRef.current);
                }
                detailTabUnlockTimerRef.current = window.setTimeout(() => {
                    detailTabScrollLockRef.current = false;
                    detailTabUnlockTimerRef.current = 0;
                }, lockMs);
            });
            return;
        }
        if (detailTabUnlockTimerRef.current) {
            window.clearTimeout(detailTabUnlockTimerRef.current);
        }
        detailTabUnlockTimerRef.current = window.setTimeout(() => {
            detailTabScrollLockRef.current = false;
            detailTabUnlockTimerRef.current = 0;
        }, lockMs);
    }, []);

    const detailTabIndex =
        detailActiveSection === "location"
            ? 4
            : detailActiveSection === "consult"
              ? 3
              : detailActiveSection === "curriculum"
                ? 2
                : detailActiveSection === "campus"
                  ? 1
                  : 0;

    React.useEffect(() => {
        const root = detailScrollRef.current;
        if (!root || !school) return undefined;

        let raf = 0;
        const onScroll = () => {
            if (detailTabScrollLockRef.current) return;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const intro = detailIntroRef.current;
                const campus = detailCampusRef.current;
                const curriculum = detailCurriculumRef.current;
                const loc = detailLocationRef.current;
                const consult = detailConsultRef.current;
                if (!intro || !campus || !curriculum || !loc || !consult) return;
                const rootRect = root.getBoundingClientRect();
                const anchor = rootRect.top + DETAIL_SCROLL_HEADROOM;
                const activationLine = anchor + 24;
                const sectionOrder = [
                    ["intro", intro],
                    ["campus", campus],
                    ["curriculum", curriculum],
                    ["consult", consult],
                    ["location", loc]
                ];
                let active = "intro";
                for (const [key, el] of sectionOrder) {
                    if (el && el.getBoundingClientRect().top <= activationLine) {
                        active = key;
                    }
                }
                setDetailActiveSection(active);
                setShowScrollTopButton(root.scrollTop > 260);
            });
        };

        onScroll();
        root.addEventListener("scroll", onScroll, {passive: true});
        return () => {
            cancelAnimationFrame(raf);
            root.removeEventListener("scroll", onScroll);
        };
    }, [school, detailKeyRaw]);

    const scrollToDetailTop = React.useCallback(() => {
        const root = detailScrollRef.current;
        if (!root) return;
        root.scrollTo({top: 0, behavior: "smooth"});
    }, []);

    const schoolCategoryLabel = String(school?.schoolTypeLabel || school?.type || "Tư thục")
        .trim()
        .toUpperCase();

    const detailHeroActionBtnSx = {
        textTransform: "none",
        fontWeight: 700,
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.55)",
        borderRadius: 2,
        minWidth: 0,
        "&:hover": {
            borderColor: "#fff",
            bgcolor: "rgba(255,255,255,0.12)"
        }
    };
    const detailHeroPrimaryBtnSx = {
        ...detailHeroActionBtnSx,
        bgcolor: "rgba(255,255,255,0.2)",
        borderColor: "rgba(255,255,255,0.72)",
        boxShadow: "0 8px 20px rgba(15,23,42,0.2)",
        "&:hover": {
            borderColor: "#fff",
            bgcolor: "rgba(255,255,255,0.3)"
        }
    };
    const detailHeroSecondaryIconBtnSx = {
        width: 32,
        height: 32,
        borderRadius: 1.5,
        border: "1px solid rgba(255,255,255,0.6)",
        bgcolor: "rgba(255,255,255,0.08)",
        color: "#fff",
        "&:hover": {
            borderColor: "#fff",
            bgcolor: "rgba(255,255,255,0.16)"
        },
        "&.Mui-disabled": {
            color: "rgba(255,255,255,0.45)",
            borderColor: "rgba(255,255,255,0.35)"
        }
    };

    const shareSchoolDetail = React.useCallback(() => {
        if (!school) return;
        const url = typeof window !== "undefined" ? window.location.href : "";
        if (typeof navigator !== "undefined" && navigator.share) {
            navigator
                .share({
                    title: school.school,
                    text: `${school.school} — ${school.ward}, ${school.province}`,
                    url
                })
                .catch(() => {});
        } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                showSuccessSnackbar("Đã sao chép liên kết trường.");
            });
        }
    }, [school]);

    const messageCampus = React.useCallback(
        (campus) => {
            if (!school || typeof window === "undefined" || !campus) return;
            const rawId = campus?.id;
            if (rawId == null) return;
            const campusId = Number(rawId);
            if (!Number.isFinite(campusId)) return;
            const counsellorEmail = "";
            window.dispatchEvent(
                new CustomEvent(OPEN_PARENT_CHAT_EVENT, {
                    detail: {
                        schoolName: school.school,
                        schoolEmail: (school.email || "").trim(),
                        counsellorEmail,
                        campusId,
                        schoolLogoUrl: (school.logoUrl || "").toString().trim()
                    }
                })
            );
        },
        [school]
    );

    const openConsultBookingDialog = React.useCallback(
        (slot) => {
            if (!isParent || !slot) return;
            if (!consultSlotLooksUpcoming(slot.status, slot.statusLabel)) return;
            const datesWithOffline = new Set();
            parentSlotsRaw.forEach((item) => {
                const d = String(item?.date || "").slice(0, 10);
                if (d && item?.consultationOfflineRequest != null) {
                    datesWithOffline.add(d);
                }
            });
            if (parentConsultSlotInputDisabled(slot, datesWithOffline).disabled) {
                return;
            }
            const selectedCampus = campusListForDetail[campusDetailTabIndex];
            const rawCampusId = selectedCampus?.id ?? selectedCampus?.campusId ?? selectedCampus?.campusID;
            const campusId = Number(rawCampusId);
            if (!Number.isFinite(campusId) || campusId <= 0) {
                showWarningSnackbar("Không lấy được thông tin cơ sở. Vui lòng chọn lại cơ sở.");
                return;
            }
            const cachedUser = (() => {
                try {
                    if (typeof window === "undefined") return null;
                    const raw = window.localStorage.getItem("user");
                    return raw ? JSON.parse(raw) : null;
                } catch {
                    return null;
                }
            })();
            setSelectedConsultBookingSlot({
                appointmentDate: String(slot.date || "").slice(0, 10),
                appointmentTime: normalizeConsultSlotTime(slot.startTime),
                campusId
            });
            setBookingPhone(
                String(
                    cachedUser?.phone ??
                        cachedUser?.phoneNumber ??
                        cachedUser?.mobile ??
                        cachedUser?.phoneNo ??
                        ""
                ).trim()
            );
            setBookingQuestion("");
            setConsultBookingDialogOpen(true);
        },
        [isParent, campusListForDetail, campusDetailTabIndex, parentSlotsRaw]
    );
    const closeConsultBookingDialog = React.useCallback(() => {
        if (bookingSubmitting) return;
        setConsultBookingDialogOpen(false);
        setSelectedConsultBookingSlot(null);
        setBookingPhone("");
        setBookingQuestion("");
    }, [bookingSubmitting]);
    const submitConsultBooking = React.useCallback(async () => {
        if (!selectedConsultBookingSlot) return;
        const campusId = Number(selectedConsultBookingSlot.campusId);
        const phone = bookingPhone.trim();
        const question = bookingQuestion.trim();
        if (!Number.isFinite(campusId) || campusId <= 0) {
            showWarningSnackbar("Không lấy được campusId hợp lệ.");
            return;
        }
        if (!phone) {
            showWarningSnackbar("Vui lòng nhập số điện thoại.");
            return;
        }
        if (!question) {
            showWarningSnackbar("Vui lòng nhập nội dung câu hỏi.");
            return;
        }
        const appointmentTime = String(selectedConsultBookingSlot.appointmentTime || "").trim();
        const appointmentDate = String(selectedConsultBookingSlot.appointmentDate || "").slice(0, 10);
        if (!appointmentTime || !appointmentDate) {
            showErrorSnackbar("Không lấy được thông tin khung giờ đã chọn. Vui lòng chọn lại.");
            return;
        }
        setBookingSubmitting(true);
        try {
            await bookParentOfflineConsultation({
                campusId,
                phone,
                question,
                appointmentTime,
                appointmentDate
            });
            showSuccessSnackbar("Đặt lịch tư vấn thành công.");
            setConsultBookingDialogOpen(false);
            setSelectedConsultBookingSlot(null);
            setBookingPhone("");
            setBookingQuestion("");
        } catch (error) {
            const apiMessage =
                error?.response?.data?.message ||
                error?.response?.data?.body?.message ||
                error?.response?.data?.error;
            showErrorSnackbar(apiMessage || "Không thể đặt lịch tư vấn. Vui lòng thử lại.");
        } finally {
            setBookingSubmitting(false);
        }
    }, [bookingPhone, bookingQuestion, selectedConsultBookingSlot]);
    const consultBookingDisplayDate = React.useMemo(() => {
        const raw = String(selectedConsultBookingSlot?.appointmentDate || "").slice(0, 10);
        if (!raw) return "";
        const dt = parseYmdLocal(raw);
        if (Number.isNaN(dt.getTime())) return raw;
        return dt.toLocaleDateString("vi-VN");
    }, [selectedConsultBookingSlot]);
    const consultBookingDisplayTime = React.useMemo(() => {
        const raw = String(selectedConsultBookingSlot?.appointmentTime || "").trim();
        return raw ? `${raw}` : "";
    }, [selectedConsultBookingSlot]);
    const [consultCalendarYear, setConsultCalendarYear] = React.useState(String(new Date().getFullYear()));
    const consultWeekOptions = React.useMemo(
        () => buildWeeksOfYear(consultCalendarYear),
        [consultCalendarYear]
    );
    const currentConsultWeekValue = React.useMemo(
        () => findWeekValueByDate(consultWeekOptions, new Date()),
        [consultWeekOptions]
    );
    const [consultCalendarWeek, setConsultCalendarWeek] = React.useState("");
    React.useEffect(() => {
        if (!consultWeekOptions.length) {
            setConsultCalendarWeek("");
            return;
        }
        if (!consultWeekOptions.some((w) => w.value === consultCalendarWeek)) {
            setConsultCalendarWeek(currentConsultWeekValue || consultWeekOptions[0].value);
        }
    }, [consultWeekOptions, consultCalendarWeek, currentConsultWeekValue]);
    const selectedConsultWeek = React.useMemo(
        () => consultWeekOptions.find((w) => w.value === consultCalendarWeek) || consultWeekOptions[0] || null,
        [consultWeekOptions, consultCalendarWeek]
    );

    React.useEffect(() => {
        if (!isParent || !school || !selectedConsultWeek?.start || !selectedConsultWeek?.end) {
            setParentSlotsRaw([]);
            setParentSlotsError("");
            setParentSlotsLoading(false);
            return undefined;
        }
        const campus = campusListForDetail[campusDetailTabIndex];
        const rawId = campus?.id;
        if (rawId == null) {
            setParentSlotsRaw([]);
            setParentSlotsLoading(false);
            return undefined;
        }
        const campusId = Number(rawId);
        if (!Number.isFinite(campusId)) {
            setParentSlotsRaw([]);
            setParentSlotsLoading(false);
            return undefined;
        }
        const startDate = toYmdDate(selectedConsultWeek.start);
        const endDate = toYmdDate(selectedConsultWeek.end);
        const ac = new AbortController();
        setParentSlotsLoading(true);
        setParentSlotsError("");
        setParentSlotsRaw([]);
        (async () => {
            try {
                const res = await getParentConsultSlots(campusId, {startDate, endDate}, {signal: ac.signal});
                const body = parseParentConsultSlotsBody(res);
                if (!ac.signal.aborted) {
                    setParentSlotsRaw(Array.isArray(body) ? body : []);
                }
            } catch (e) {
                if (ac.signal.aborted || e?.code === "ERR_CANCELED") return;
                if (!ac.signal.aborted) {
                    setParentSlotsRaw([]);
                    setParentSlotsError("Không tải được lịch khả dụng của cơ sở. Vui lòng thử lại.");
                }
            } finally {
                if (!ac.signal.aborted) {
                    setParentSlotsLoading(false);
                }
            }
        })();
        return () => ac.abort();
    }, [isParent, school, campusDetailTabIndex, selectedConsultWeek, campusListForDetail]);

    const parentSlotsNormalized = React.useMemo(() => {
        const dedup = new Map();
        parentSlotsRaw.forEach((item) => {
            const date = String(item?.date || "").slice(0, 10);
            const startTime = normalizeConsultSlotTime(item?.startTime);
            const endTime = normalizeConsultSlotTime(item?.endTime);
            const status = String(item?.status || "UPCOMING").toUpperCase();
            if (!date || !startTime || !endTime) return;
            const key = `${date}|${startTime}|${endTime}|${status}`;
            const offlineReq = item?.consultationOfflineRequest ?? null;
            const tr = Number(item?.totalRequests);
            const mx = Number(item?.maxBookingPerSlot);
            if (!dedup.has(key)) {
                dedup.set(key, {
                    date,
                    dayOfWeek: String(item?.dayOfWeek || "").toUpperCase(),
                    startTime,
                    endTime,
                    status: status || "UPCOMING",
                    statusLabel: String(item?.statusLabel || "").trim() || status || "UPCOMING",
                    campusScheduleTemplateId: item?.campusScheduleTemplateId,
                    totalRequests: Number.isFinite(tr) && tr >= 0 ? tr : 0,
                    maxBookingPerSlot: Number.isFinite(mx) ? mx : NaN,
                    consultationOfflineRequest: offlineReq != null ? offlineReq : null
                });
            } else if (offlineReq != null) {
                const prev = dedup.get(key);
                prev.consultationOfflineRequest = offlineReq;
            }
        });
        return Array.from(dedup.values()).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });
    }, [parentSlotsRaw]);

    const parentConsultDateHasOfflineBooking = React.useMemo(() => {
        const set = new Set();
        parentSlotsNormalized.forEach((s) => {
            if (s.consultationOfflineRequest != null) {
                set.add(s.date);
            }
        });
        return set;
    }, [parentSlotsNormalized]);

    const parentConsultAllowBookingBeforeHours = React.useMemo(() => {
        let min = null;
        parentSlotsRaw.forEach((item) => {
            const n = Number(item?.allowBookingBeforeHours);
            if (!Number.isFinite(n) || n <= 0) return;
            min = min == null ? n : Math.min(min, n);
        });
        return min;
    }, [parentSlotsRaw]);

    const consultWeekColumns = React.useMemo(() => {
        if (!selectedConsultWeek?.start) return [];
        return CONSULT_CALENDAR_DAYS.map((day) => {
            const cellDate = new Date(selectedConsultWeek.start);
            cellDate.setDate(cellDate.getDate() + day.offset);
            return {
                ...day,
                ymd: toYmdDate(cellDate)
            };
        });
    }, [selectedConsultWeek]);

    const consultDynamicTimeRows = React.useMemo(() => {
        if (!selectedConsultWeek?.start || !selectedConsultWeek?.end) return [];
        const startY = toYmdDate(selectedConsultWeek.start);
        const endY = toYmdDate(selectedConsultWeek.end);
        const inWeek = parentSlotsNormalized.filter((s) => s.date >= startY && s.date <= endY);
        const keyMap = new Map();
        inWeek.forEach((row) => {
            const key = `${row.startTime}-${row.endTime}`;
            if (!keyMap.has(key)) {
                const sessionKey = consultSessionKeyFromStart(row.startTime);
                const stripBg = sessionKey === "MORNING" ? "#fef3c7" : "#dbeafe";
                const rowBg = sessionKey === "MORNING" ? "rgba(254, 243, 199, 0.35)" : "rgba(219, 234, 254, 0.35)";
                keyMap.set(key, {
                    key,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    sortValue: row.startTime,
                    sessionKey,
                    stripBg,
                    rowBg
                });
            }
        });
        return Array.from(keyMap.values()).sort((a, b) => a.sortValue.localeCompare(b.sortValue));
    }, [parentSlotsNormalized, selectedConsultWeek]);

    const consultSlotByCell = React.useMemo(() => {
        const map = new Map();
        parentSlotsNormalized.forEach((slot) => {
            const rowKey = `${slot.startTime}-${slot.endTime}`;
            map.set(`${slot.date}|${rowKey}`, slot);
        });
        return map;
    }, [parentSlotsNormalized]);

    const showConsultApiGrid = Boolean(isParent && consultDynamicTimeRows.length > 0);
    const showConsultParentDefaultShiftsGrid = Boolean(
        isParent && selectedConsultWeek?.start && consultDynamicTimeRows.length === 0
    );

    return (
        <Box
            sx={{
                position: "fixed",
                inset: 0,
                top: `${DETAIL_WITH_HEADER_OFFSET}px`,
                height: `calc(100vh - ${DETAIL_WITH_HEADER_OFFSET}px)`,
                zIndex: 900,
                display: "flex",
                flexDirection: "column",
                bgcolor: "#eef2f7",
                overflow: "hidden"
            }}
        >
            <IconButton
                aria-label="Quay lại trang tìm kiếm"
                onClick={onClose}
                sx={{
                    position: "fixed",
                    top: `calc(${DETAIL_WITH_HEADER_OFFSET}px + 8px + env(safe-area-inset-top, 0px))`,
                    left: 12,
                    zIndex: 1400,
                    color: "#fff",
                    bgcolor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    p: 0.5,
                    "&:hover": {bgcolor: "transparent", opacity: 0.85}
                }}
            >
                <ArrowBackIcon/>
            </IconButton>
            <Dialog
                open={consultBookingDialogOpen}
                onClose={closeConsultBookingDialog}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        border: "1px solid rgba(148,163,184,0.28)",
                        boxShadow: "0 24px 50px rgba(15,23,42,0.24)",
                        overflow: "hidden"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        fontSize: "1.35rem",
                        color: "#0f172a",
                        pb: 1,
                        background:
                            "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.06) 100%)"
                    }}
                >
                    Đặt lịch tư vấn offline
                    <Typography sx={{mt: 0.5, fontSize: "0.84rem", color: "#475569", fontWeight: 500}}>
                        Vui lòng để lại số điện thoại và câu hỏi để nhà trường liên hệ lại.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{pt: "16px !important", pb: 1.5, bgcolor: "#f8fafc"}}>
                    <Stack spacing={1.5}>
                        <TextField
                            label="Số điện thoại"
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value)}
                            disabled={bookingSubmitting}
                            fullWidth
                            required
                            placeholder="Ví dụ: 09xxxxxxxx"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "#fff"
                                }
                            }}
                        />
                        <TextField
                            label="Nội dung câu hỏi"
                            value={bookingQuestion}
                            onChange={(e) => setBookingQuestion(e.target.value)}
                            disabled={bookingSubmitting}
                            multiline
                            minRows={3}
                            fullWidth
                            required
                            placeholder="Nhập nội dung bạn cần tư vấn..."
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "#fff"
                                }
                            }}
                        />
                        <Box
                            sx={{
                                mt: 0.5,
                                borderRadius: 2,
                                border: "1px dashed rgba(59,130,246,0.45)",
                                bgcolor: "rgba(239,246,255,0.95)",
                                px: 1.25,
                                py: 1
                            }}
                        >
                            <Typography sx={{fontSize: "0.75rem", color: "#475569", fontWeight: 700, mb: 0.6}}>
                                LỊCH HẸN ĐÃ CHỌN
                            </Typography>
                            <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                                <TextField
                                    label="Ngày hẹn"
                                    value={consultBookingDisplayDate}
                                    fullWidth
                                    InputProps={{readOnly: true}}
                                    disabled
                                    size="small"
                                />
                                <TextField
                                    label="Giờ hẹn"
                                    value={consultBookingDisplayTime}
                                    fullWidth
                                    InputProps={{readOnly: true}}
                                    disabled
                                    size="small"
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 2.5,
                        py: 1.75,
                        borderTop: "1px solid rgba(148,163,184,0.22)",
                        bgcolor: "#fff"
                    }}
                >
                    <Button
                        onClick={closeConsultBookingDialog}
                        disabled={bookingSubmitting}
                        sx={{textTransform: "none", fontWeight: 700, px: 2}}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={submitConsultBooking}
                        disabled={bookingSubmitting}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            px: 2.5,
                            py: 0.9,
                            borderRadius: 2,
                            boxShadow: "0 8px 18px rgba(37,99,235,0.3)"
                        }}
                    >
                        {bookingSubmitting ? "Đang gửi..." : "Đặt lịch"}
                    </Button>
                </DialogActions>
            </Dialog>
            <IconButton
                aria-label="Cuộn lên đầu trang"
                onClick={scrollToDetailTop}
                sx={{
                    position: "fixed",
                    left: {xs: "50%", sm: 20},
                    bottom: {xs: 14, sm: 20},
                    transform: showScrollTopButton
                        ? {xs: "translateX(-50%) translateY(0)", sm: "translateY(0)"}
                        : {xs: "translateX(-50%) translateY(12px)", sm: "translateY(12px)"},
                    zIndex: 1400,
                    width: 40,
                    height: 40,
                    bgcolor: BRAND_NAVY,
                    color: "#fff",
                    boxShadow: "0 10px 24px rgba(15,23,42,0.25)",
                    opacity: showScrollTopButton ? 1 : 0,
                    pointerEvents: showScrollTopButton ? "auto" : "none",
                    transition: "opacity 0.24s ease, transform 0.24s ease",
                    "&:hover": {bgcolor: APP_PRIMARY_DARK}
                }}
            >
                <KeyboardArrowUpIcon/>
            </IconButton>

            <Box
                ref={detailScrollRef}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    WebkitOverflowScrolling: "touch",
                    scrollBehavior: "auto",
                    overscrollBehavior: "contain",
                    willChange: "scroll-position"
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        minHeight: {xs: 156, sm: 176},
                        background: `
                            radial-gradient(120% 120% at 10% 0%, rgba(96,165,250,0.54) 0%, rgba(96,165,250,0) 58%),
                            radial-gradient(100% 120% at 92% 6%, rgba(125,211,252,0.46) 0%, rgba(125,211,252,0) 55%),
                            linear-gradient(135deg, #60a5fa 0%, #3b82f6 46%, #38bdf8 100%)
                        `,
                        color: "#fff",
                        "&::after": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            opacity: 0.14,
                            backgroundImage: `
                                linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)
                            `,
                            backgroundSize: "26px 26px"
                        }
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            px: 0
                        }}
                    >
                        <Box sx={{maxWidth: 1360, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: {xs: 1, sm: 1.25}}}>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "flex-start",
                                    gap: 1.2,
                                    width: "100%"
                                }}
                            >
                            <Box sx={{flex: "1 1 auto", minWidth: 0}}>
                                <Typography
                                    sx={{
                                        fontSize: "0.66rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.12em",
                                        textTransform: "uppercase",
                                        color: "#dbeafe",
                                        mb: 0.6
                                    }}
                                >
                                    {schoolCategoryLabel}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: {xs: "1.45rem", sm: "1.85rem"},
                                        lineHeight: 1.25,
                                        color: "#f8fafc",
                                        textShadow: "0 3px 14px rgba(15,23,42,0.45)"
                                    }}
                                >
                                    {school.school}
                                </Typography>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{mt: 1.1, gap: {xs: 1.5, sm: 2.5}, rowGap: 0.8}}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.6}
                                        sx={{gap: 0.6, minHeight: 24}}
                                    >
                                        <LocationOnIcon sx={{fontSize: 16, color: "rgba(191,219,254,0.96)", flexShrink: 0}}/>
                                        <Typography
                                            sx={{
                                                fontSize: "0.84rem",
                                                color: "#eff6ff",
                                                lineHeight: 1.2,
                                                display: "flex",
                                                alignItems: "center"
                                            }}
                                        >
                                            {school.ward}, {school.province}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>

                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                useFlexGap
                                justifyContent="flex-start"
                                sx={{
                                    mt: 0.2,
                                    gap: 0.65,
                                    flexShrink: 0,
                                    width: "100%",
                                    alignSelf: "flex-start"
                                }}
                            >
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<LanguageIcon sx={{fontSize: 18}}/>}
                                    href={
                                        (school.website || "").trim()
                                            ? school.website
                                            : `https://www.google.com/search?q=${encodeURIComponent(school.school)}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{
                                        ...detailHeroPrimaryBtnSx,
                                        bgcolor: "#ffffff",
                                        color: BRAND_NAVY,
                                        borderColor: "rgba(255,255,255,0.95)",
                                        "&:hover": {
                                            bgcolor: "#eff6ff",
                                            borderColor: "#ffffff"
                                        }
                                    }}
                                >
                                    {(school.website || "").trim() ? "Website trường" : "Tìm trên web"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        detailInCompare ? (
                                            <CheckCircleIcon sx={{fontSize: 18}}/>
                                        ) : (
                                            <AddIcon sx={{fontSize: 18}}/>
                                        )
                                    }
                                    onClick={() => toggleCompare(school)}
                                    sx={{
                                        ...detailHeroActionBtnSx,
                                        borderColor: "rgba(255,255,255,0.9)",
                                        bgcolor: "rgba(15,23,42,0.18)",
                                        color: "#f8fafc",
                                        "&:hover": {
                                            borderColor: "#fff",
                                            bgcolor: "rgba(15,23,42,0.3)"
                                        }
                                    }}
                                >
                                    {detailInCompare ? "Đã chọn so sánh" : "So sánh"}
                                </Button>
                                <IconButton
                                    disabled={!canSaveSchool}
                                    onClick={() => toggleSave(school)}
                                    aria-label={
                                        canSaveSchool
                                            ? detailIsSaved
                                                ? "Bỏ yêu thích trường này"
                                                : "Thêm trường vào danh sách yêu thích"
                                            : "Đăng nhập với vai trò Phụ huynh để yêu thích trường"
                                    }
                                    sx={{
                                        ...detailHeroSecondaryIconBtnSx,
                                        bgcolor: "rgba(15,23,42,0.2)",
                                        borderColor: "rgba(255,255,255,0.9)"
                                    }}
                                >
                                    {detailIsSaved ? (
                                        <FavoriteIcon sx={{fontSize: 18, color: "#e11d48"}}/>
                                    ) : (
                                        <FavoriteBorderIcon sx={{fontSize: 18, color: "#fff"}}/>
                                    )}
                                </IconButton>
                                <IconButton
                                    aria-label="Chia sẻ trường"
                                    onClick={shareSchoolDetail}
                                    sx={{
                                        ...detailHeroSecondaryIconBtnSx,
                                        bgcolor: "rgba(15,23,42,0.2)",
                                        borderColor: "rgba(255,255,255,0.9)"
                                    }}
                                >
                                    <ShareIcon sx={{fontSize: 18}}/>
                                </IconButton>
                            </Stack>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{maxWidth: 1360, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: 2}}>

                    <Box
                        sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 20,
                            bgcolor: "#eef2f7",
                            pt: 0.25,
                            pb: 0,
                            mb: 1.5,
                            borderBottom: 1,
                            borderColor: "rgba(51,65,85,0.08)",
                            pl: {xs: 6.5, sm: 7},
                            boxShadow: "0 1px 0 rgba(51,65,85,0.04)"
                        }}
                    >
                        <Tabs
                            value={detailTabIndex}
                            onChange={(_, v) =>
                                scrollDetailToSection(
                                    v === 0
                                        ? "intro"
                                        : v === 1
                                          ? "campus"
                                          : v === 2
                                            ? "curriculum"
                                            : v === 3
                                              ? "consult"
                                              : "location"
                                )
                            }
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            TabIndicatorProps={{
                                sx: {
                                    height: 2.5,
                                    borderRadius: "2px 2px 0 0",
                                    bgcolor: BRAND_NAVY,
                                    transition:
                                        "left 0.52s cubic-bezier(0.2, 0, 0, 1), width 0.52s cubic-bezier(0.2, 0, 0, 1)"
                                }
                            }}
                            sx={{
                                minHeight: 40,
                                "& .MuiTabs-scrollButtons": {
                                    width: 28,
                                    "&.Mui-disabled": {opacity: 0.35}
                                },
                                "& .MuiTab-root": {
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.8125rem",
                                    letterSpacing: "0.01em",
                                    minHeight: 40,
                                    minWidth: "auto",
                                    px: 1.75,
                                    py: 0.75,
                                    color: "#0f172a",
                                    transition: "color 0.5s cubic-bezier(0.2, 0, 0, 1)"
                                },
                                "& .Mui-selected": {
                                    color: `${BRAND_NAVY} !important`,
                                    fontWeight: 700
                                },
                                "& .MuiTabs-flexContainer": {gap: 0.25}
                            }}
                        >
                            <Tab label="Giới thiệu" disableRipple/>
                            <Tab label="Thông tin cơ sở" disableRipple/>
                            <Tab label="Chương trình đào tạo" disableRipple/>
                            <Tab label="Đặt lịch tư vấn" disableRipple/>
                            <Tab label="Vị trí & bản đồ" disableRipple/>
                        </Tabs>
                    </Box>
                    {detailLoading && (
                        <Typography sx={{fontSize: "0.85rem", color: "#0f172a", mb: 1}}>
                            Đang tải chi tiết trường...
                        </Typography>
                    )}
                    {!!detailError && (
                        <Typography sx={{fontSize: "0.85rem", color: "#b45309", mb: 1}}>
                            {detailError}
                        </Typography>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {xs: "1fr", md: "minmax(0, 1fr) 320px"},
                            gap: 3,
                            alignItems: "start",
                            pt: 1.5
                        }}
                    >
                        <Box sx={{minWidth: 0}}>
                            <Box
                                ref={detailIntroRef}
                                id="school-detail-intro"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, mb: 3}}
                            >
                                <Box
                                    sx={{
                                        ...detailMainColumnCardSx,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2
                                    }}
                                >
                                    <Typography sx={mainDetailSectionTitleSx}>Giới thiệu trường</Typography>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: {xs: "column", sm: "row"},
                                            gap: {xs: 2.5, sm: 3},
                                            alignItems: {xs: "stretch", sm: "flex-start"}
                                        }}
                                    >
                                        <Box sx={{flex: 1, minWidth: 0}}>
                                            <Typography
                                                sx={{
                                                    color: "#0f172a",
                                                    lineHeight: 1.75,
                                                    fontSize: "0.95rem",
                                                    overflowWrap: "anywhere",
                                                    wordBreak: "break-word"
                                                }}
                                            >
                                                {school.description
                                                    ? String(school.description)
                                                    : `Thông tin tổng quan về ${school.school}. Nội dung chi tiết sẽ được cập nhật từ nhà trường trên hệ thống EduBridge.`}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                flexShrink: 0,
                                                width: "calc(0.95rem * 1.75 * 4)",
                                                height: "calc(0.95rem * 1.75 * 4)",
                                                maxWidth: "100%",
                                                borderRadius: "50%",
                                                overflow: "hidden",
                                                bgcolor: "transparent",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                alignSelf: {xs: "center", sm: "flex-start"},
                                                mx: {xs: "auto", sm: 0}
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={school.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                                alt=""
                                                sx={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "contain",
                                                    objectPosition: "center",
                                                    display: "block"
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                ref={detailCampusRef}
                                id="school-detail-campus"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, mb: 3}}
                            >
                                <SchoolCampusInfoCard
                                    school={school}
                                    isParent={isParent}
                                    onMessageCampus={messageCampus}
                                    activeCampusIndex={campusDetailTabIndex}
                                    onActiveCampusIndexChange={setCampusDetailTabIndex}
                                />
                            </Box>

                            <Box
                                ref={detailCurriculumRef}
                                id="school-detail-curriculum"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, mb: 3}}
                            >
                                <SchoolCurriculumInfoCard
                                    campaignTemplates={campaignTemplates}
                                    campaignLoading={campaignLoading}
                                    campaignError={campaignError}
                                    curriculumList={school?.curriculumList}
                                />
                            </Box>

                            <Box
                                ref={detailConsultRef}
                                id="school-detail-consult"
                                sx={{
                                    scrollMarginTop: {xs: 56, sm: 52},
                                    pt: 1,
                                    pb: 2
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: CONSULT_CARD_BORDER,
                                        bgcolor: "rgba(255,255,255,0.98)",
                                        boxShadow: "0 4px 20px rgba(51,65,85,0.06)",
                                        width: "100%",
                                        maxWidth: "100%",
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <Stack
                                        direction="column"
                                        alignItems="stretch"
                                        spacing={1.5}
                                        sx={{width: "100%", minWidth: 0}}
                                    >
                                        <Box sx={{minWidth: 0, width: "100%"}}>
                                            <Typography sx={mainDetailSectionTitleSx}>
                                                Đặt lịch tư vấn
                                            </Typography>
                                            {isParent && parentSlotsError ? (
                                                <Typography sx={{color: "#b45309", fontSize: "0.82rem", mb: 1}}>
                                                    {parentSlotsError}
                                                </Typography>
                                            ) : null}
                                            <Box sx={{width: "100%", minWidth: 0}}>
                                            <Box
                                                sx={{
                                                    position: "relative",
                                                    border: CONSULT_CARD_BORDER,
                                                    borderRadius: 2,
                                                    overflow: "hidden",
                                                    bgcolor: "#fff",
                                                    width: "100%",
                                                    maxWidth: "100%",
                                                    minWidth: 0,
                                                    boxSizing: "border-box"
                                                }}
                                            >
                                                {isParent && parentSlotsLoading ? (
                                                    <Box
                                                        sx={{
                                                            position: "absolute",
                                                            inset: 0,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            bgcolor: "rgba(255,255,255,0.58)",
                                                            zIndex: 3
                                                        }}
                                                    >
                                                        <CircularProgress size={28} sx={{color: "#2563eb"}}/>
                                                    </Box>
                                                ) : null}
                                                <Box
                                                    sx={{
                                                        display: "grid",
                                                        width: "100%",
                                                        minWidth: 0,
                                                        gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                                                        bgcolor: CONSULT_HEADER_BG,
                                                        color: "#fff"
                                                    }}
                                                >
                                                    <Box sx={{px: 1, py: 0.65}}>
                                                        <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: "0.72rem",
                                                                    color: "#fff",
                                                                    fontWeight: 800,
                                                                    letterSpacing: "0.02em"
                                                                }}
                                                            >
                                                                NĂM
                                                            </Typography>
                                                            <Box
                                                                component="select"
                                                                value={consultCalendarYear}
                                                                onChange={(e) => setConsultCalendarYear(e.target.value)}
                                                                sx={{
                                                                    fontSize: "0.72rem",
                                                                    height: 24,
                                                                    border: "1px solid #cbd5e1",
                                                                    borderRadius: 0.5,
                                                                    bgcolor: "#fff",
                                                                    color: "#333"
                                                                }}
                                                            >
                                                                {CONSULT_YEAR_OPTIONS.map((year) => (
                                                                    <option key={year} value={year}>
                                                                        {year}
                                                                    </option>
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                    {CONSULT_CALENDAR_DAYS.map((day) => (
                                                        <Box
                                                            key={`consult-head-${day.key}`}
                                                            sx={{
                                                                px: 0.85,
                                                                py: 0.65,
                                                                borderLeft: CONSULT_GRID_HEADER_COL,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center"
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: "0.72rem",
                                                                    fontWeight: 600,
                                                                    color: "#fff",
                                                                    textAlign: "center",
                                                                    width: "100%"
                                                                }}
                                                            >

                                                                {day.label}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "grid",
                                                        width: "100%",
                                                        minWidth: 0,
                                                        gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                                                        bgcolor: CONSULT_HEADER_BG,
                                                        color: "#fff",
                                                        borderTop: "1px solid rgba(255,255,255,0.28)",
                                                        borderBottom: "1px solid rgba(148,163,184,0.35)"
                                                    }}
                                                >
                                                    <Box sx={{px: 1, py: 0.6}}>
                                                        <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                                                            <Typography sx={{fontSize: "0.7rem", color: "#fff", fontWeight: 600}}>
                                                                TUẦN
                                                            </Typography>
                                                            <Select
                                                                value={consultCalendarWeek}
                                                                onChange={(e) => setConsultCalendarWeek(String(e.target.value || ""))}
                                                                size="small"
                                                                displayEmpty
                                                                renderValue={(value) => {
                                                                    const hit = consultWeekOptions.find((week) => week.value === value);
                                                                    return hit?.label || "";
                                                                }}
                                                                MenuProps={{
                                                                    PaperProps: {
                                                                        sx: {
                                                                            maxHeight: 300
                                                                        }
                                                                    }
                                                                }}
                                                                sx={{
                                                                    fontSize: "0.72rem",
                                                                    height: 22,
                                                                    minWidth: 132,
                                                                    bgcolor: "#fff",
                                                                    borderRadius: 0.5,
                                                                    ".MuiSelect-select": {py: 0.1, pr: 2.5, pl: 0.8},
                                                                    ".MuiOutlinedInput-notchedOutline": {borderColor: "#cbd5e1"}
                                                                }}
                                                            >
                                                                {consultWeekOptions.map((week) => (
                                                                    <MenuItem
                                                                        key={week.value}
                                                                        value={week.value}
                                                                        sx={{
                                                                            fontSize: "0.78rem",
                                                                            minHeight: 30,
                                                                            ...(week.value === currentConsultWeekValue
                                                                                ? {
                                                                                      bgcolor: "rgba(16,185,129,0.18)",
                                                                                      color: "#065f46",
                                                                                      fontWeight: 700
                                                                                  }
                                                                                : null),
                                                                            "&:hover": {
                                                                                bgcolor:
                                                                                    week.value === currentConsultWeekValue
                                                                                        ? "rgba(16,185,129,0.26)"
                                                                                        : "rgba(59,130,246,0.14)"
                                                                            },
                                                                            "&.Mui-selected": {
                                                                                bgcolor:
                                                                                    week.value === currentConsultWeekValue
                                                                                        ? "rgba(16,185,129,0.18)"
                                                                                        : "rgba(59,130,246,0.22)"
                                                                            },
                                                                            "&.Mui-selected:hover": {
                                                                                bgcolor:
                                                                                    week.value === currentConsultWeekValue
                                                                                        ? "rgba(16,185,129,0.26)"
                                                                                        : "rgba(59,130,246,0.28)"
                                                                            }
                                                                        }}
                                                                    >
                                                                        {week.label}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </Box>
                                                    </Box>
                                                    {CONSULT_CALENDAR_DAYS.map((day) => (
                                                        <Box
                                                            key={`consult-date-${day.key}`}
                                                            sx={{
                                                                px: 0.85,
                                                                py: 0.6,
                                                                borderLeft: CONSULT_GRID_HEADER_COL,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center"
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: "0.72rem",
                                                                    fontWeight: 500,
                                                                    color: "#fff",
                                                                    textAlign: "center",
                                                                    width: "100%"
                                                                }}
                                                            >
                                                                {selectedConsultWeek?.start
                                                                    ? formatDayMonth(
                                                                          new Date(
                                                                              selectedConsultWeek.start.getFullYear(),
                                                                              selectedConsultWeek.start.getMonth(),
                                                                              selectedConsultWeek.start.getDate() + day.offset
                                                                          )
                                                                      )
                                                                    : "--/--"}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                                {showConsultApiGrid
                                                    ? consultDynamicTimeRows.map((row) => (
                                                          <Box
                                                              key={row.key}
                                                              sx={{
                                                                  display: "grid",
                                                                  width: "100%",
                                                                  minWidth: 0,
                                                                  gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                                                                  borderBottom: CONSULT_GRID_LINE_ROW,
                                                                  bgcolor: row.rowBg
                                                              }}
                                                          >
                                                              <Box
                                                                  sx={{
                                                                      minHeight: 36,
                                                                      bgcolor: row.stripBg,
                                                                      borderRight: CONSULT_GRID_LINE_COL,
                                                                      px: 1,
                                                                      py: 0.5,
                                                                      display: "flex",
                                                                      alignItems: "center"
                                                                  }}
                                                              >
                                                                  <Typography
                                                                      sx={{
                                                                          fontSize: "0.72rem",
                                                                          fontWeight: 700,
                                                                          color: "#334155",
                                                                          letterSpacing: "0.01em"
                                                                      }}
                                                                  >
                                                                      {row.startTime} – {row.endTime}
                                                                  </Typography>
                                                              </Box>
                                                              {consultWeekColumns.map((col) => {
                                                                  const slot = consultSlotByCell.get(`${col.ymd}|${row.key}`);
                                                                  const {disabled: slotInputDisabled} =
                                                                      slot != null
                                                                          ? parentConsultSlotInputDisabled(
                                                                                slot,
                                                                                parentConsultDateHasOfflineBooking
                                                                            )
                                                                          : {disabled: false, reason: ""};
                                                                  const slotBookedHere = Boolean(slot?.consultationOfflineRequest);
                                                                  const slotBlockedSameDayOnly = slotInputDisabled && !slotBookedHere;
                                                                  const canOpenBooking =
                                                                      Boolean(slot) &&
                                                                      consultSlotLooksUpcoming(slot.status, slot.statusLabel) &&
                                                                      !slotInputDisabled;
                                                                  const consultPendingNavigable =
                                                                      Boolean(isParent) &&
                                                                      typeof navigate === "function" &&
                                                                      Boolean(slot) &&
                                                                      parentConsultOfflinePendingNavigable(slot);
                                                                  const chipWrapSx = {
                                                                      maxWidth: "100%",
                                                                      display: "inline-flex",
                                                                      justifyContent: "center"
                                                                  };
                                                                  const chipEl = slot ? (
                                                                      <Chip
                                                                          label={parentConsultSlotChipLabel(slot)}
                                                                          color={
                                                                              slotBookedHere
                                                                                  ? offlineConsultRequestChipColor(slot)
                                                                                  : consultSlotLooksCompleted(
                                                                                        slot.status,
                                                                                        slot.statusLabel
                                                                                    )
                                                                                    ? undefined
                                                                                    : CONSULT_SLOT_STATUS_CHIP[slot.status] ||
                                                                                      "default"
                                                                          }
                                                                          size="small"
                                                                          onClick={
                                                                              canOpenBooking
                                                                                  ? () => openConsultBookingDialog(slot)
                                                                                  : consultPendingNavigable
                                                                                    ? () => navigate(PARENT_OFFLINE_CONSULTATIONS_PATH)
                                                                                    : undefined
                                                                          }
                                                                          sx={{
                                                                              ...consultCalendarSlotChipSx(
                                                                                  slot.status,
                                                                                  slot.statusLabel
                                                                              ),
                                                                              ...(slotBookedHere
                                                                                  ? {
                                                                                        fontWeight: 700,
                                                                                        opacity: 1,
                                                                                        boxShadow: "0 2px 8px rgba(15,23,42,0.1)",
                                                                                        ...(consultPendingNavigable
                                                                                            ? {
                                                                                                  cursor: "pointer",
                                                                                                  "&:hover": {
                                                                                                      boxShadow:
                                                                                                          "0 4px 14px rgba(15,23,42,0.16)",
                                                                                                      opacity: 0.94
                                                                                                  }
                                                                                              }
                                                                                            : {cursor: "default"})
                                                                                    }
                                                                                  : {}),
                                                                              ...(slotBlockedSameDayOnly
                                                                                  ? {
                                                                                        opacity: 0.58,
                                                                                        cursor: "not-allowed",
                                                                                        bgcolor: "rgba(241, 245, 249, 0.95) !important",
                                                                                        color: "#64748b !important",
                                                                                        border: "1px solid rgba(148,163,184,0.45)",
                                                                                        boxShadow: "none",
                                                                                        fontWeight: 600,
                                                                                        "&:hover": {
                                                                                            bgcolor: "rgba(241, 245, 249, 0.98) !important"
                                                                                        }
                                                                                    }
                                                                                  : {})
                                                                          }}
                                                                      />
                                                                  ) : null;
                                                                  return (
                                                                      <Box
                                                                          key={`${row.key}-${col.key}`}
                                                                          sx={{
                                                                              px: 0.75,
                                                                              py: 0.5,
                                                                              borderLeft: CONSULT_GRID_LINE_COL,
                                                                              display: "flex",
                                                                              alignItems: "center",
                                                                              justifyContent: "center",
                                                                              minHeight: 36
                                                                          }}
                                                                      >
                                                                          {slot ? (
                                                                              <span style={chipWrapSx}>{chipEl}</span>
                                                                          ) : (
                                                                              <Box sx={{width: "100%", minHeight: 32}} />
                                                                          )}
                                                                      </Box>
                                                                  );
                                                              })}
                                                          </Box>
                                                      ))
                                                    : null}
                                                {!isParent || showConsultParentDefaultShiftsGrid
                                                    ? CONSULT_CALENDAR_SHIFTS.map((shift) => (
                                                          <Box
                                                              key={shift.key}
                                                              sx={{
                                                                  display: "grid",
                                                                  width: "100%",
                                                                  minWidth: 0,
                                                                  gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                                                                  borderBottom: CONSULT_GRID_LINE_ROW,
                                                                  bgcolor: shift.rowBg
                                                              }}
                                                          >
                                                              <Box
                                                                  sx={{
                                                                      minHeight: 36,
                                                                      bgcolor: shift.stripBg,
                                                                      borderRight: CONSULT_GRID_LINE_COL,
                                                                      px: 1,
                                                                      py: 0.5,
                                                                      display: "flex",
                                                                      alignItems: "center"
                                                                  }}
                                                              >
                                                                  <Typography
                                                                      sx={{
                                                                          fontSize: "0.72rem",
                                                                          fontWeight: 700,
                                                                          color: "#334155"
                                                                      }}
                                                                  >
                                                                      {shift.mailLabel}
                                                                  </Typography>
                                                              </Box>
                                                              {CONSULT_CALENDAR_DAYS.map((day) => (
                                                                  <Box
                                                                      key={`${shift.key}-${day.key}`}
                                                                      sx={{
                                                                          px: 0.75,
                                                                          py: 0.5,
                                                                          borderLeft: CONSULT_GRID_LINE_COL,
                                                                          display: "flex",
                                                                          alignItems: "center",
                                                                          justifyContent: "center",
                                                                          minHeight: 36
                                                                      }}
                                                                  >
                                                                      {isParent ? (
                                                                          <Box sx={{width: "100%", minHeight: 32}} />
                                                                      ) : (
                                                                          <Button
                                                                              variant="text"
                                                                              size="small"
                                                                              disabled
                                                                              sx={{
                                                                                  minWidth: 0,
                                                                                  minHeight: 32,
                                                                                  px: 0.5,
                                                                                  py: 0,
                                                                                  color: "#64748b",
                                                                                  textTransform: "none",
                                                                                  fontSize: "0.8rem",
                                                                                  lineHeight: 1,
                                                                                  cursor: "default"
                                                                              }}
                                                                          >
                                                                              Đặt lịch
                                                                          </Button>
                                                                      )}
                                                                  </Box>
                                                              ))}
                                                          </Box>
                                                      ))
                                                    : null}
                                            </Box>
                                            {isParent &&
                                            parentConsultAllowBookingBeforeHours != null &&
                                            !parentSlotsError ? (
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.8rem",
                                                        color: "#dc2626",
                                                        fontWeight: 600,
                                                        mt: 1,
                                                        lineHeight: 1.45
                                                    }}
                                                >
                                                    * Phụ huynh vui lòng đặt lịch trước {parentConsultAllowBookingBeforeHours} giờ
                                                </Typography>
                                            ) : null}
                                            </Box>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Box>

                            <Box
                                ref={detailLocationRef}
                                id="school-detail-location"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, pt: 1, pb: 2}}
                            >
                                <Box sx={detailMainColumnCardSx}>
                                    <Typography sx={mainDetailSectionTitleSx}>Vị trí &amp; bản đồ</Typography>
                                    <Typography sx={{color: "#0f172a", fontSize: "0.92rem", mb: 2}}>
                                        {school.ward}, {school.province}, Việt Nam
                                    </Typography>
                                    {!maptilerApiKey ? (
                                        <Typography sx={{color: "#b45309", fontSize: "0.9rem"}}>
                                            Chưa có API key MapTiler. Thêm <code>VITE_MAPTILER_API_KEY</code> vào file{" "}
                                            <code>.env</code> để hiển thị bản đồ.
                                        </Typography>
                                    ) : (
                                        <SchoolLocationMap
                                            userLocation={userLocation}
                                            fallbackCenter={fallbackCenter}
                                            campuses={mapCampuses}
                                            maptilerApiKey={maptilerApiKey}
                                            onViewSchoolDetail={onOpenSchoolById}
                                        />
                                    )}
                                    {nearbyLoading && (
                                        <Typography sx={{mt: 1, color: "#0f172a", fontSize: "0.9rem"}}>
                                            Đang tìm campus lân cận...
                                        </Typography>
                                    )}
                                    {!!nearbyError && (
                                        <Typography sx={{mt: 1, color: "#dc2626", fontSize: "0.9rem"}}>
                                            {nearbyError}
                                        </Typography>
                                    )}
                                    {!!nearbyNotice && (
                                        <Typography sx={{mt: 1, color: "#0f172a", fontSize: "0.9rem"}}>
                                            {nearbyNotice}
                                        </Typography>
                                    )}
                                    {!!nearbyError && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={requestUserLocation}
                                            sx={{mt: 1, textTransform: "none", fontWeight: 700}}
                                        >
                                            Thử định vị lại
                                        </Button>
                                    )}
                                    {!nearbyLoading && !nearbyError && nearbyCampusesOfCurrentSchool.length === 0 && userLocation ? (
                                        <Typography sx={{mt: 1, color: "#0f172a", fontSize: "0.9rem"}}>
                                            Không có campus nào trong bán kính {NEARBY_SEARCH_RADIUS_KM}km.
                                        </Typography>
                                    ) : null}
                                    <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} sx={{mt: 2.5}}>
                                        <Button
                                            variant="contained"
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                                `${school.school}, ${school.ward}, ${school.province}, Vietnam`
                                            )}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                bgcolor: BRAND_NAVY,
                                                "&:hover": {bgcolor: APP_PRIMARY_DARK}
                                            }}
                                        >
                                            Chỉ đường đến trường
                                        </Button>
                                    </Stack>
                                </Box>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                width: "100%",
                                alignSelf: "start",
                                position: {md: "sticky"},
                                top: {md: 16}
                            }}
                        >
                            <Box ref={detailGeneralRef} sx={{width: "100%"}}>
                                <SchoolGeneralInfoCard school={school}/>
                            </Box>
                            <Box ref={detailContactRef} sx={{width: "100%"}}>
                                <SchoolContactPanel school={school}/>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
