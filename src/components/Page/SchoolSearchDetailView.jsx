import React from "react";
import {
    Box,
    Button,
    Card,
    CardMedia,
    Chip,
    Divider,
    IconButton,
    Link,
    Rating,
    Stack,
    Tab,
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
    Email as EmailIcon,
    Hotel as HotelIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    MapsHomeWork as MapsHomeWorkIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    AutoStories as AutoStoriesIcon,
    Fingerprint as FingerprintIcon,
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
import {showSuccessSnackbar} from "../ui/AppSnackbar.jsx";
import {DEFAULT_SCHOOL_IMAGE} from "../../utils/schoolPublicMapper.js";

const MAP_CONTAINER_STYLE = {width: "100%", height: "260px"};
const NEARBY_SEARCH_RADIUS_KM = 10;

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

const curriculumTypePublicLabel = {
    NATIONAL: "Quốc gia",
    INTERNATIONAL: "Quốc tế",
    INTEGRATED: "Tích hợp"
};

const methodLearningPublicLabel = {
    TRADITIONAL: "Truyền thống",
    PROJECT_BASED: "Dự án (Project-based)",
    INQUIRY_BASED: "Khám phá (Inquiry-based)",
    STEM_STEAM: "STEM/STEAM"
};

function labelCurriculumType(value) {
    if (value == null || value === "") return "—";
    return curriculumTypePublicLabel[value] ?? String(value);
}

function labelMethodLearning(value) {
    if (value == null || value === "") return "—";
    return methodLearningPublicLabel[value] ?? String(value);
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

function SchoolCampusInfoCard({school, isParent, onMessageCampus}) {
    const list = Array.isArray(school?.campusList) ? school.campusList : [];

    return (
        <Box sx={detailMainColumnCardSx}>
            <Typography sx={mainDetailSectionTitleSx}>Thông tin cơ sở</Typography>

            {list.length === 0 ? (
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.6}}>
                    Chưa có thông tin cơ sở.
                </Typography>
            ) : (
                list.map((campus, idx) => {
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
                        <Box key={campus?.id ?? `${name}-${idx}`} sx={{mt: idx === 0 ? 0 : 2.5}}>
                            {idx > 0 && <Divider sx={{...contactDividerSx, mb: 2.5}}/>}

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
                })
            )}
        </Box>
    );
}

function SchoolCurriculumInfoCard({school}) {
    const list = Array.isArray(school?.curriculumList) ? school.curriculumList : [];

    return (
        <Box sx={detailMainColumnCardSx}>
            <Typography sx={mainDetailSectionTitleSx}>Chương trình đào tạo</Typography>

            {list.length === 0 ? (
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.6}}>
                    Chưa có thông tin chương trình đào tạo.
                </Typography>
            ) : (
                list.map((cur, idx) => {
                    const name = String(cur?.name || "").trim() || `Chương trình ${idx + 1}`;
                    const desc = cur?.description != null ? String(cur.description).trim() : "";
                    const year = cur?.enrollmentYear;
                    const groupCode = String(cur?.groupCode || "").trim();
                    const subjects = Array.isArray(cur?.subjectsJsonb) ? cur.subjectsJsonb : [];
                    const programs = Array.isArray(cur?.programList) ? cur.programList : [];

                    return (
                        <Box key={`${groupCode || name}-${idx}`} sx={{mt: idx === 0 ? 0 : 2.5}}>
                            {idx > 0 && <Divider sx={{...contactDividerSx, mb: 2.5}}/>}

                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.25} sx={{mb: 1.25}}>
                                <Stack
                                    direction="row"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{gap: 0.5, flex: 1, minWidth: 0, alignItems: "center"}}
                                >
                                    <Chip
                                        size="small"
                                        label={labelCurriculumType(cur?.curriculumType)}
                                        sx={curriculumClassificationChipSx("type")}
                                    />
                                    <Chip
                                        size="small"
                                        label={labelMethodLearning(cur?.methodLearning)}
                                        sx={curriculumClassificationChipSx("method")}
                                    />
                                    {year != null && String(year).trim() !== "" ? (
                                        <Chip
                                            size="small"
                                            label={`Khóa ${year}`}
                                            sx={curriculumClassificationChipSx("year")}
                                        />
                                    ) : null}
                                </Stack>
                                <Chip
                                    size="small"
                                    label={curriculumStatusLabel(cur?.curriculumStatus)}
                                    sx={curriculumHeaderStatusChipSx(cur?.curriculumStatus)}
                                />
                            </Stack>

                            <Typography
                                sx={{
                                    fontWeight: 900,
                                    color: "#0f172a",
                                    fontSize: {xs: "1.2rem", sm: "1.45rem"},
                                    letterSpacing: "-0.02em",
                                    mb: 1.5,
                                    lineHeight: 1.25
                                }}
                            >
                                {name}
                            </Typography>

                            {!desc && (groupCode || programs.length > 0 || subjects.length > 0) ? (
                                <Divider sx={{...contactDividerSx, mb: 1.5}}/>
                            ) : null}

                            {desc ? (
                                <>
                                    <Typography sx={{fontSize: "0.9rem", color: CURRICULUM_DESCRIPTION_TEXT, lineHeight: 1.55}}>
                                        {desc}
                                    </Typography>
                                    {(groupCode || programs.length > 0 || subjects.length > 0) && (
                                        <Divider sx={{...contactDividerSx, my: 1.5}}/>
                                    )}
                                </>
                            ) : null}

                            {groupCode ? (
                                <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                    <FingerprintIcon sx={{...contactIconSx, opacity: 0.95}}/>
                                    <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                        <Box component="span" sx={{fontWeight: 600}}>
                                            Mã nhóm:{" "}
                                        </Box>
                                        <Box
                                            component="span"
                                            sx={{fontFamily: "ui-monospace, monospace", color: "#334155", fontWeight: 600}}
                                        >
                                            {groupCode}
                                        </Box>
                                    </Typography>
                                </Box>
                            ) : null}

                            {groupCode && (programs.length > 0 || subjects.length > 0) ? (
                                <Divider sx={contactDividerSx}/>
                            ) : null}

                            {programs.length > 0 ? (
                                <>
                                    <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                        <BusinessIcon sx={contactIconSx}/>
                                        <Box sx={{minWidth: 0}}>
                                            <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                                <Box component="span" sx={{fontWeight: 600}}>
                                                    Chương trình con
                                                </Box>
                                            </Typography>
                                            <Stack component="ul" spacing={0.5} sx={{m: 0, mt: 0.75, pl: 2}}>
                                                {programs.map((p, pi) => (
                                                    <Typography
                                                        key={pi}
                                                        component="li"
                                                        sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}
                                                    >
                                                        {typeof p === "string"
                                                            ? p
                                                            : String(p?.name || p?.title || JSON.stringify(p))}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Box>
                                    {subjects.length > 0 ? <Divider sx={contactDividerSx}/> : null}
                                </>
                            ) : null}

                            {subjects.length > 0 ? (
                                <Box sx={{...contactRowSx, alignItems: "flex-start"}}>
                                    <AutoStoriesIcon sx={{...contactIconSx, opacity: 0.95}}/>
                                    <Box sx={{minWidth: 0, flex: 1}}>
                                        <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, lineHeight: 1.5}}>
                                            <Box component="span" sx={{fontWeight: 600}}>
                                                Môn học
                                            </Box>
                                        </Typography>
                                        <Stack spacing={1.1} sx={{mt: 1.1}}>
                                            {subjects.map((sub, si) => {
                                                const sn = String(sub?.name || "").trim() || `Môn ${si + 1}`;
                                                const sd = sub?.description != null ? String(sub.description).trim() : "";
                                                const mandatory = Boolean(sub?.isMandatory);
                                                return (
                                                    <Box
                                                        key={`${sn}-${si}`}
                                                        sx={{
                                                            borderRadius: {xs: 1.5, sm: 2},
                                                            border: "1px solid rgba(191,219,254,0.7)",
                                                            bgcolor: "rgba(248,252,255,0.98)",
                                                            px: {xs: 1.25, sm: 1.5},
                                                            py: {xs: 1.15, sm: 1.25}
                                                        }}
                                                    >
                                                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{mb: 0.75, flexWrap: "wrap"}}>
                                                            <Typography
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    fontSize: "1rem",
                                                                    color: BRAND_NAVY,
                                                                    lineHeight: 1.35,
                                                                    overflowWrap: "anywhere",
                                                                    wordBreak: "break-word"
                                                                }}
                                                            >
                                                                {sn}
                                                            </Typography>
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    px: 0.72,
                                                                    py: 0.14,
                                                                    borderRadius: 999,
                                                                    fontSize: "0.62rem",
                                                                    fontWeight: 700,
                                                                    lineHeight: 1.15,
                                                                    bgcolor: mandatory ? "rgba(59,130,246,0.16)" : "rgba(148,163,184,0.22)",
                                                                    color: mandatory ? "#1d4ed8" : "#334155",
                                                                    minHeight: 17
                                                                }}
                                                            >
                                                                {mandatory ? "Bắt buộc" : "Tự chọn"}
                                                            </Box>
                                                        </Stack>
                                                        <Typography
                                                            sx={{
                                                                fontSize: "0.875rem",
                                                                color: "#4B5563",
                                                                lineHeight: 1.6,
                                                                overflowWrap: "anywhere",
                                                                wordBreak: "break-word"
                                                            }}
                                                        >
                                                            {sd || "—"}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                </Box>
                            ) : null}
                        </Box>
                    );
                })
            )}
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

    const mapCampuses = normalizedNearbyCampuses.length > 0 ? normalizedNearbyCampuses : schoolCampusMarkers;

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
        detailActiveSection === "consult"
            ? 4
            : detailActiveSection === "location"
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
                    ["location", loc],
                    ["consult", consult]
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

    const openConsultMailto = React.useCallback(() => {
        if (!school) return;
        const email = (school.email || "").trim();
        if (!email) {
            navigate("/home");
            showSuccessSnackbar("Đến trang chủ để xem các hình thức hỗ trợ và đặt lịch tư vấn.");
            return;
        }
        const subject = encodeURIComponent(`Đặt lịch tư vấn — ${school.school}`);
        const body = encodeURIComponent(
            `Kính gửi ${school.school},\n\nTôi muốn đặt lịch tư vấn / tham quan trường.\n\nTrân trọng,`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }, [school, navigate]);

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
                        <Box sx={{maxWidth: 1100, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: {xs: 1, sm: 1.25}}}>
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
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.6}
                                        sx={{gap: 0.6, minHeight: 24}}
                                    >
                                        <Rating
                                            value={Math.min(5, Math.max(0, Number(school.averageRating) || 0))}
                                            precision={0.1}
                                            readOnly
                                            size="small"
                                            sx={{color: "#fbbf24", display: "flex", alignItems: "center"}}
                                        />
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: "0.84rem",
                                                color: "#eff6ff",
                                                lineHeight: 1.2,
                                                display: "inline-flex",
                                                alignItems: "center"
                                            }}
                                        >
                                            {school.averageRating > 0 ? school.averageRating.toFixed(1) : "—"}
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

                <Box sx={{maxWidth: 1100, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: 2}}>

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
                                              ? "location"
                                              : "consult"
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
                            <Tab label="Vị trí & bản đồ" disableRipple/>
                            <Tab label="Đặt lịch tư vấn" disableRipple/>
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
                                />
                            </Box>

                            <Box
                                ref={detailCurriculumRef}
                                id="school-detail-curriculum"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, mb: 3}}
                            >
                                <SchoolCurriculumInfoCard school={school}/>
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
                                    {!nearbyLoading && !nearbyError && normalizedNearbyCampuses.length === 0 && userLocation ? (
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
                                        border: "1px solid rgba(59,130,246,0.2)",
                                        bgcolor: "rgba(255,255,255,0.98)",
                                        boxShadow: "0 4px 20px rgba(51,65,85,0.06)"
                                    }}
                                >
                                    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                                        <CalendarMonthIcon
                                            sx={{fontSize: 28, color: BRAND_NAVY, flexShrink: 0, mt: 0.25}}
                                        />
                                        <Box sx={{minWidth: 0}}>
                                            <Typography sx={mainDetailSectionTitleSx}>
                                                Đặt lịch tư vấn
                                            </Typography>
                                            <Typography sx={{color: "#0f172a", fontSize: "0.9rem", lineHeight: 1.6, mb: 1.5}}>
                                                {(school?.email || "").trim()
                                                    ? "Soạn email đặt lịch với nhà trường hoặc điều chỉnh nội dung trước khi gửi."
                                                    : "Trường chưa công bố email trên hệ thống. Bạn có thể xem các hình thức hỗ trợ trên trang chủ."}
                                            </Typography>
                                            {(school?.email || "").trim() ? (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={openConsultMailto}
                                                    sx={{
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        bgcolor: BRAND_NAVY,
                                                        "&:hover": {bgcolor: APP_PRIMARY_DARK}
                                                    }}
                                                >
                                                    Soạn email đặt lịch
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => navigate("/home")}
                                                    sx={{textTransform: "none", fontWeight: 700}}
                                                >
                                                    Đến trang chủ
                                                </Button>
                                            )}
                                        </Box>
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
