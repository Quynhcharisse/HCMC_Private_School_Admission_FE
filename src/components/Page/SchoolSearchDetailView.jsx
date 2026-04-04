import React from "react";
import {
    Box,
    Breadcrumbs,
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
    School as SchoolIcon,
    Share as ShareIcon,
    Bookmark as BookmarkIcon,
    BookmarkBorder as BookmarkBorderIcon
} from "@mui/icons-material";
import {GoogleMap, MarkerF, useJsApiLoader} from "@react-google-maps/api";
import {APP_PRIMARY_DARK, BRAND_NAVY, landingSectionShadow} from "../../constants/homeLandingTheme";
import {OPEN_PARENT_CHAT_EVENT} from "../../constants/parentChatEvents";
import {showSuccessSnackbar} from "../ui/AppSnackbar.jsx";

const LOCATION_FALLBACK_PROVINCE = "Tất cả";
const LOCATION_FALLBACK_WARD = "Tất cả";

export function mapPublicSchoolDetailToRow(api) {
    if (!api || typeof api !== "object") return null;
    const campusList = Array.isArray(api.campusList)
        ? api.campusList
        : Array.isArray(api.campustList)
          ? api.campustList
          : [];
    const firstCampus = campusList[0] ?? null;
    const consultantEmails = campusList
        .flatMap((campus) => (Array.isArray(campus?.consultantEmails) ? campus.consultantEmails : []))
        .map((email) => String(email || "").trim())
        .filter(Boolean);
    const primaryConsultantEmail = consultantEmails[0] || "";
    const province = (firstCampus?.city || "").trim() || LOCATION_FALLBACK_PROVINCE;
    const ward = (firstCampus?.district || "").trim() || LOCATION_FALLBACK_WARD;
    return {
        id: api.id,
        school: api.name ?? "",
        province,
        ward,
        website: api.websiteUrl || "",
        phone: firstCampus?.phoneNumber || api.hotline || "",
        email: primaryConsultantEmail || firstCampus?.email || api.email || api.schoolEmail || api.accountEmail || "",
        counsellorEmail:
            primaryConsultantEmail ||
            firstCampus?.counsellorEmail ||
            firstCampus?.email ||
            api.counsellorEmail ||
            api.email ||
            api.schoolEmail ||
            api.accountEmail ||
            "",
        consultantEmails,
        address: firstCampus?.address || (api.description ? String(api.description) : "Đang cập nhật"),
        locationLabel: province,
        description: api.description,
        averageRating: typeof api.averageRating === "number" ? api.averageRating : 0,
        totalCampus: api.totalCampus ?? campusList.length,
        logoUrl: api.logoUrl || null,
        isFavourite: Boolean(api.isFavourite),
        foundingDate: api.foundingDate,
        representativeName: api.representativeName,
        campusList,
        curriculumList: Array.isArray(api.curriculumList) ? api.curriculumList : [],
        boardingType: firstCampus?.boardingType || "",
        hasDetailLoaded: true
    };
}

export const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

const FALLBACK_MAP_CENTER = {lat: 10.7769, lng: 106.7009};
const MAP_CONTAINER_STYLE = {width: "100%", height: "260px"};

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

const CONTACT_BODY = "#64748b";
const CONTACT_MUTED = "#94a3b8";
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
    borderRadius: 3,
    border: "1px solid rgba(51,65,85,0.08)",
    boxShadow: landingSectionShadow(2),
    bgcolor: "#fff"
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

function SchoolCampusInfoCard({school}) {
    const list = Array.isArray(school?.campusList) ? school.campusList : [];

    const sectionBoxSx = {
        p: 2.5,
        borderRadius: 2,
        border: "1px solid rgba(51,65,85,0.1)",
        bgcolor: "#fff",
        boxShadow: "0 1px 3px rgba(51,65,85,0.06)"
    };

    return (
        <Box sx={sectionBoxSx}>
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

function SchoolLocationMap({school, apiKey}) {
    const [markerPosition, setMarkerPosition] = React.useState(null);
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const [geocodeError, setGeocodeError] = React.useState("");
    const {isLoaded, loadError} = useJsApiLoader({
        id: "school-location-map-script",
        googleMapsApiKey: apiKey
    });

    React.useEffect(() => {
        if (!isLoaded || !school || !window.google?.maps?.Geocoder) return;
        setIsGeocoding(true);
        setGeocodeError("");
        const address = `${school.school}, ${school.ward}, ${school.province}, Vietnam`;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({address}, (results, status) => {
            setIsGeocoding(false);
            if (status === "OK" && results?.[0]?.geometry?.location) {
                const location = results[0].geometry.location;
                setMarkerPosition({lat: location.lat(), lng: location.lng()});
                return;
            }
            setMarkerPosition(null);
            setGeocodeError("Không thể định vị trường trên bản đồ.");
        });
    }, [isLoaded, school]);

    if (loadError) {
        return (
            <Typography sx={{color: "#dc2626", fontSize: "0.9rem"}}>
                Không tải được Google Maps. Vui lòng kiểm tra API key.
            </Typography>
        );
    }

    if (!isLoaded) {
        return <Typography sx={{color: "#64748b"}}>Đang tải bản đồ...</Typography>;
    }

    return (
        <Box>
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={markerPosition ?? FALLBACK_MAP_CENTER}
                zoom={markerPosition ? 15 : 11}
                options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false
                }}
            >
                {markerPosition && <MarkerF position={markerPosition} />}
            </GoogleMap>
            {isGeocoding && (
                <Typography sx={{mt: 1, color: "#64748b", fontSize: "0.9rem"}}>
                    Đang định vị địa chỉ trường...
                </Typography>
            )}
            {!!geocodeError && (
                <Typography sx={{mt: 1, color: "#dc2626", fontSize: "0.9rem"}}>
                    {geocodeError}
                </Typography>
            )}
        </Box>
    );
}

export default function SchoolSearchDetailView({
    school,
    detailKeyRaw,
    detailLoading,
    detailError,
    googleMapsApiKey,
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
    const detailLocationRef = React.useRef(null);
    const detailConsultRef = React.useRef(null);
    const detailGeneralRef = React.useRef(null);
    const detailContactRef = React.useRef(null);
    const detailTabScrollLockRef = React.useRef(false);
    const detailTabUnlockTimerRef = React.useRef(0);

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
            ? 3
            : detailActiveSection === "location"
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
                const loc = detailLocationRef.current;
                const consult = detailConsultRef.current;
                if (!intro || !campus || !loc || !consult) return;
                const rootRect = root.getBoundingClientRect();
                const anchor = rootRect.top + DETAIL_SCROLL_HEADROOM;
                const activationLine = anchor + 24;
                const sectionOrder = [
                    ["intro", intro],
                    ["campus", campus],
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
            });
        };

        onScroll();
        root.addEventListener("scroll", onScroll, {passive: true});
        return () => {
            cancelAnimationFrame(raf);
            root.removeEventListener("scroll", onScroll);
        };
    }, [school, detailKeyRaw]);

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

    const messageSchoolDetail = React.useCallback(() => {
        if (!school || typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent(OPEN_PARENT_CHAT_EVENT, {
                detail: {
                    schoolName: school.school,
                    schoolEmail: (school.email || "").trim(),
                    counsellorEmail: (school.counsellorEmail || school.email || "").trim(),
                    schoolLogoUrl: (school.logoUrl || "").toString().trim()
                }
            })
        );
    }, [school]);

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
                bgcolor: "#f8fafc",
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
                        minHeight: {xs: 280, sm: 320},
                        backgroundImage: `
                                linear-gradient(180deg, rgba(51,65,85,0.55) 0%, rgba(51,65,85,0.82) 100%),
                                url(${school.logoUrl || DEFAULT_SCHOOL_IMAGE})
                            `,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "#fff"
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            pt: {xs: 5, sm: 6},
                            pb: {xs: 2, sm: 3},
                            px: {xs: 24, sm: 40}
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: {xs: "column", sm: "row"},
                                alignItems: {xs: "stretch", sm: "center"},
                                justifyContent: "space-between",
                                gap: {xs: 0, sm: 2},
                                width: "100%"
                            }}
                        >
                            <Box sx={{flex: "1 1 auto", minWidth: 0}}>
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: {xs: "1.35rem", sm: "1.75rem"},
                                        lineHeight: 1.25,
                                        textShadow: "0 2px 12px rgba(0,0,0,0.35)"
                                    }}
                                >
                                    {school.school}
                                </Typography>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{mt: 1.25, gap: {xs: 1, sm: 2.5}, rowGap: 1}}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.5}
                                        flexWrap="wrap"
                                        useFlexGap
                                        sx={{gap: 0.5, minHeight: 28}}
                                    >
                                        <Rating
                                            value={Math.min(5, Math.max(0, Number(school.averageRating) || 0))}
                                            precision={0.1}
                                            readOnly
                                            size="small"
                                            sx={{color: "#fbbf24", display: "flex", alignItems: "center"}}
                                        />
                                        <Typography
                                            sx={{
                                                fontSize: "0.85rem",
                                                opacity: 0.95,
                                                lineHeight: 1.2,
                                                display: "flex",
                                                alignItems: "center"
                                            }}
                                        >
                                            {school.averageRating > 0
                                                ? school.averageRating.toFixed(1)
                                                : "—"}
                                        </Typography>
                                    </Stack>
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={0.5}
                                        useFlexGap
                                        sx={{gap: 0.5, minHeight: 28}}
                                    >
                                        <LocationOnIcon sx={{fontSize: 18, opacity: 0.92, flexShrink: 0}}/>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: "0.85rem",
                                                opacity: 0.9,
                                                lineHeight: 1.2,
                                                display: "inline-flex",
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
                                justifyContent="flex-end"
                                sx={{
                                    mt: {xs: 2, sm: 0},
                                    gap: 0.75,
                                    flexShrink: 0,
                                    width: {xs: "100%", sm: "auto"},
                                    alignSelf: {xs: "stretch", sm: "center"}
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
                                    sx={detailHeroActionBtnSx}
                                >
                                    {(school.website || "").trim() ? "Website trường" : "Tìm trên web"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ChatBubbleOutlineIcon sx={{fontSize: 18}}/>}
                                    onClick={messageSchoolDetail}
                                    title={
                                        isParent
                                            ? "Mở chat với tư vấn viên trường (cần đăng nhập phụ huynh)"
                                            : "Đăng nhập với vai trò Phụ huynh để chat với tư vấn viên"
                                    }
                                    sx={detailHeroActionBtnSx}
                                >
                                    Nhắn tin
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
                                    sx={detailHeroActionBtnSx}
                                >
                                    {detailInCompare ? "Đã chọn so sánh" : "So sánh"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={!canSaveSchool}
                                    title={
                                        canSaveSchool
                                            ? detailIsSaved
                                                ? "Bỏ lưu trường này"
                                                : "Lưu trường vào danh sách"
                                            : "Đăng nhập với vai trò Phụ huynh để lưu trường"
                                    }
                                    startIcon={
                                        detailIsSaved ? (
                                            <BookmarkIcon sx={{fontSize: 18, color: "#fb923c"}}/>
                                        ) : (
                                            <BookmarkBorderIcon sx={{fontSize: 18}}/>
                                        )
                                    }
                                    onClick={() => toggleSave(school)}
                                    sx={{
                                        ...detailHeroActionBtnSx,
                                        "&.Mui-disabled": {
                                            color: "rgba(255,255,255,0.45)",
                                            border: "1px solid rgba(255,255,255,0.45)",
                                            WebkitTextFillColor: "rgba(255,255,255,0.45)"
                                        }
                                    }}
                                >
                                    {detailIsSaved ? "Đã lưu" : "Lưu trường"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ShareIcon sx={{fontSize: 18}}/>}
                                    onClick={shareSchoolDetail}
                                    sx={detailHeroActionBtnSx}
                                >
                                    Chia sẻ
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{maxWidth: 1100, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: 2}}>
                    <Breadcrumbs sx={{mb: 2, "& a": {color: BRAND_NAVY, fontWeight: 600}}}>
                        <Link
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={() => navigate("/home")}
                            sx={{cursor: "pointer", border: "none", background: "none", font: "inherit"}}
                        >
                            Trang chủ
                        </Link>
                        <Link
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={onClose}
                            sx={{cursor: "pointer", border: "none", background: "none", font: "inherit"}}
                        >
                            Tìm trường
                        </Link>
                        <Typography
                            color="text.secondary"
                            sx={{fontWeight: 600, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis"}}
                        >
                            {school.school}
                        </Typography>
                    </Breadcrumbs>

                    <Box
                        sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 20,
                            bgcolor: "#f8fafc",
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
                                    color: "#64748b",
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
                            <Tab label="Vị trí & bản đồ" disableRipple/>
                            <Tab label="Đặt lịch tư vấn" disableRipple/>
                        </Tabs>
                    </Box>
                    {detailLoading && (
                        <Typography sx={{fontSize: "0.85rem", color: "#64748b", mb: 1}}>
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
                            gridTemplateColumns: {xs: "1fr", md: "1fr 320px"},
                            gap: 3,
                            alignItems: "start",
                            pt: 1.5
                        }}
                    >
                        <Box>
                            <Box
                                ref={detailIntroRef}
                                id="school-detail-intro"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, mb: 3}}
                            >
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: "1px solid rgba(51,65,85,0.1)",
                                        bgcolor: "#fff",
                                        boxShadow: "0 1px 3px rgba(51,65,85,0.06)",
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
                                                    fontSize: "0.95rem"
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
                                                width: {xs: "100%", sm: 140, md: 160},
                                                display: "flex",
                                                alignItems: "flex-start",
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
                                                    width: "auto",
                                                    maxWidth: "100%",
                                                    height: "auto",
                                                    maxHeight: "calc(0.95rem * 1.75 * 4)",
                                                    objectFit: "contain",
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
                                <SchoolCampusInfoCard school={school}/>
                            </Box>

                            <Box
                                ref={detailLocationRef}
                                id="school-detail-location"
                                sx={{scrollMarginTop: {xs: 56, sm: 52}, pt: 1, pb: 2}}
                            >
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: "1px solid rgba(51,65,85,0.1)",
                                        bgcolor: "#fff",
                                        boxShadow: "0 1px 3px rgba(51,65,85,0.06)"
                                    }}
                                >
                                    <Typography sx={mainDetailSectionTitleSx}>Vị trí &amp; bản đồ</Typography>
                                    <Typography sx={{color: "#64748b", fontSize: "0.92rem", mb: 2}}>
                                        {school.ward}, {school.province}, Việt Nam
                                    </Typography>
                                    {!googleMapsApiKey ? (
                                        <Typography sx={{color: "#b45309", fontSize: "0.9rem"}}>
                                            Chưa có API key. Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào file{" "}
                                            <code>.env</code> để hiển thị bản đồ.
                                        </Typography>
                                    ) : (
                                        <SchoolLocationMap school={school} apiKey={googleMapsApiKey}/>
                                    )}
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
                                            <Typography sx={{color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6, mb: 1.5}}>
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
