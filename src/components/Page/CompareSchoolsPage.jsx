import React from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    ChecklistOutlined as ChecklistOutlinedIcon,
    CastForEducation as CastForEducationIcon,
    DescriptionOutlined as DescriptionOutlinedIcon,
    Lock as LockIcon,
    MoreVert as MoreVertIcon,
    MenuBookOutlined as MenuBookOutlinedIcon,
    PlaceOutlined as PlaceOutlinedIcon,
    RouteOutlined as RouteOutlinedIcon,
    SchoolOutlined as SchoolOutlinedIcon,
    SourceOutlined as SourceOutlinedIcon,
    StairsOutlined as StairsOutlinedIcon,
    TimelineOutlined as TimelineOutlinedIcon,
    TodayOutlined as TodayOutlinedIcon,
    ViewListOutlined as ViewListOutlinedIcon,
    Wc as WcIcon
} from "@mui/icons-material";
import {FaSchool} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

import {getUserIdentity} from "../../utils/savedSchoolsStorage";
import {
    getCompareSchools,
    MAX_COMPARE_SCHOOLS,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import {
    BRAND_NAVY,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import {getPublicSchoolCampaignTemplates, getPublicSchoolDetail} from "../../services/SchoolPublicService.jsx";
import {mapPublicSchoolDetailToRow} from "../../utils/schoolPublicMapper.js";

const SCHOOL_ICON_TINTS = ["#2563eb", "#3b82f6", "#0ea5e9", "#38bdf8"];
const NEARBY_MARK_KM = 10;

function formatLocation(row) {
    if (row?.locationLabel) return String(row.locationLabel);
    const w = row?.ward;
    const p = row?.province;
    if (w && p) return `${w}, ${p}`;
    return p || w || "—";
}

function parseSchoolIdFromKey(schoolKey) {
    const s = String(schoolKey || "").trim();
    if (!s.startsWith("id:")) return null;
    const id = Number(s.slice(3));
    return Number.isFinite(id) ? id : null;
}

function toText(value, fallback = "—") {
    const t = String(value ?? "").trim();
    return t || fallback;
}

function stripHtml(value) {
    return String(value || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(n);
}

function formatDistanceKm(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2)} km`;
}

function formatDateDisplay(value) {
    if (!value) return "—";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function mapCurriculumType(type) {
    const s = String(type || "").trim().toUpperCase();
    if (s === "NATIONAL") return "Quốc gia (MOET)";
    if (s === "INTERNATIONAL") return "Quốc tế";
    if (s === "BILINGUAL") return "Song ngữ";
    return s || "Đang cập nhật";
}

function mapMethodLabel(method) {
    const s = String(method || "").trim().toUpperCase();
    if (s === "COOPERATIVE") return "Học tập hợp tác";
    if (s === "VISUAL_PRACTICE") return "Trực quan - thực hành";
    if (s === "PROJECT_BASED") return "Học theo dự án";
    if (s === "EXPERIENTIAL") return "Học qua trải nghiệm";
    if (!s) return "";
    return s
        .split("_")
        .filter(Boolean)
        .map((part) => part[0] + part.slice(1).toLowerCase())
        .join(" ");
}

function metricIconByLabel(label) {
    const text = String(label || "").toLowerCase();
    if (text.includes("địa chỉ") || text.includes("quận")) return PlaceOutlinedIcon;
    if (text.includes("campus")) return SchoolOutlinedIcon;
    if (text.includes("nội trú") || text.includes("bán trú")) return WcIcon;
    if (text.includes("phương thức")) return SourceOutlinedIcon;
    if (text.includes("phỏng vấn")) return TimelineOutlinedIcon;
    if (text.includes("quy trình")) return StairsOutlinedIcon;
    if (text.includes("hồ sơ đặc biệt")) return DescriptionOutlinedIcon;
    if (text.includes("hồ sơ")) return ChecklistOutlinedIcon;
    if (text.includes("mốc tuyển sinh") || text.includes("deadline")) return TodayOutlinedIcon;
    if (text.includes("trạng thái")) return RouteOutlinedIcon;
    if (text.includes("loại chương trình")) return CastForEducationIcon;
    if (text.includes("số môn")) return ViewListOutlinedIcon;
    if (text.includes("phương pháp học")) return MenuBookOutlinedIcon;
    return DescriptionOutlinedIcon;
}

function campusBoardingSummary(campusList) {
    const set = new Set();
    (Array.isArray(campusList) ? campusList : []).forEach((campus) => {
        const text = String(campus?.boardingType || "").trim().toLowerCase();
        if (!text) return;
        if (text.includes("both")) {
            set.add("Nội trú");
            set.add("Bán trú");
            return;
        }
        if (text.includes("full_boarding") || text.includes("nội trú")) set.add("Nội trú");
        if (text.includes("day_boarding") || text.includes("bán trú")) set.add("Bán trú");
    });
    const list = Array.from(set);
    return list.length ? list.join(" / ") : "Đang cập nhật";
}

function haversineKm(a, b) {
    const lat1 = Number(a?.lat);
    const lon1 = Number(a?.lng);
    const lat2 = Number(b?.lat);
    const lon2 = Number(b?.lng);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const aa =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function getSchoolDistanceKm(detail, userLocation) {
    const campuses = Array.isArray(detail?.campusList) ? detail.campusList : [];
    let min = null;
    campuses.forEach((campus) => {
        const dist = haversineKm(
            {lat: userLocation?.lat, lng: userLocation?.lng},
            {lat: campus?.latitude, lng: campus?.longitude}
        );
        if (!Number.isFinite(dist)) return;
        if (min == null || dist < min) min = dist;
    });
    return min;
}

function collectCampaignTuitionStats(campaigns) {
    const values = [];
    const perCampus = new Map();
    (Array.isArray(campaigns) ? campaigns : []).forEach((campaign) => {
        const offerings = Array.isArray(campaign?.campusProgramOfferings) ? campaign.campusProgramOfferings : [];
        offerings.forEach((offering) => {
            const tuition = Number(offering?.tuitionFee);
            if (!Number.isFinite(tuition)) return;
            values.push(tuition);
            const campusName = toText(offering?.campusName, `Campus ${offering?.campusId ?? "?"}`);
            if (!perCampus.has(campusName)) perCampus.set(campusName, []);
            perCampus.get(campusName).push(tuition);
        });
    });
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const campusLines = Array.from(perCampus.entries())
        .slice(0, 3)
        .map(([name, list]) => {
            const cMin = Math.min(...list);
            const cMax = Math.max(...list);
            return `${name}: ${formatMoney(cMin)}${cMin !== cMax ? ` - ${formatMoney(cMax)}` : ""}`;
        });
    return {
        min,
        max,
        summary: min == null ? "Chưa có dữ liệu học phí final" : `${formatMoney(min)}${min !== max ? ` - ${formatMoney(max)}` : ""}`,
        campusLines
    };
}

function buildComparisonPayload(row, detail, campaigns, userLocation) {
    const campusList = Array.isArray(detail?.campusList) ? detail.campusList : [];
    const curriculumList = Array.isArray(detail?.curriculumList) ? detail.curriculumList : [];
    const tuitionStats = collectCampaignTuitionStats(campaigns);
    const distanceKm = getSchoolDistanceKm(detail, userLocation);
    const campusDistricts = Array.from(
        new Set(
            campusList
                .map((campus) => String(campus?.district || "").trim())
                .filter(Boolean)
        )
    );
    const curriculumTypes = Array.from(new Set(curriculumList.map((item) => mapCurriculumType(item?.curriculumType))));
    const methods = Array.from(
        new Set(
            curriculumList
                .flatMap((item) => (Array.isArray(item?.methodLearningList) ? item.methodLearningList : []))
                .map((item) => mapMethodLabel(item))
                .filter(Boolean)
        )
    );
    const subjects = Array.from(
        new Set(
            curriculumList.flatMap((item) =>
                (Array.isArray(item?.subjectsJsonb) ? item.subjectsJsonb : [])
                    .map((subject) => String(subject?.name || "").trim())
                    .filter(Boolean)
            )
        )
    );
    const methodsAdmission = Array.from(
        new Set(
            (Array.isArray(campaigns) ? campaigns : []).flatMap((campaign) =>
                (Array.isArray(campaign?.admissionMethodDetails) ? campaign.admissionMethodDetails : [])
                    .map((method) => toText(method?.displayName || method?.methodCode, ""))
                    .filter(Boolean)
            )
        )
    );
    const hasInterview = (Array.isArray(campaigns) ? campaigns : []).some((campaign) =>
        (Array.isArray(campaign?.admissionMethodDetails) ? campaign.admissionMethodDetails : []).some((method) => {
            const methodName = String(method?.displayName || method?.methodCode || "").toLowerCase();
            const methodDesc = String(method?.description || "").toLowerCase();
            const stepNames = (Array.isArray(method?.admissionProcessSteps) ? method.admissionProcessSteps : [])
                .map((step) => String(step?.stepName || step?.description || "").toLowerCase())
                .join(" ");
            const haystack = `${methodName} ${methodDesc} ${stepNames}`;
            return haystack.includes("phỏng vấn") || haystack.includes("phong van") || haystack.includes("interview");
        })
    );
    const processStepCount = (Array.isArray(campaigns) ? campaigns : []).reduce((sum, campaign) => {
        const count = (Array.isArray(campaign?.admissionMethodDetails) ? campaign.admissionMethodDetails : []).reduce(
            (n, method) => n + (Array.isArray(method?.admissionProcessSteps) ? method.admissionProcessSteps.length : 0),
            0
        );
        return Math.max(sum, count);
    }, 0);
    const methodStepMax = (Array.isArray(campaigns) ? campaigns : []).reduce((sum, campaign) => {
        const count = (Array.isArray(campaign?.admissionMethodDetails) ? campaign.admissionMethodDetails : []).reduce(
            (n, method) => Math.max(n, Array.isArray(method?.admissionProcessSteps) ? method.admissionProcessSteps.length : 0),
            0
        );
        return Math.max(sum, count);
    }, 0);
    const processStepsPreview = (() => {
        let bestSteps = [];
        (Array.isArray(campaigns) ? campaigns : []).forEach((campaign) => {
            (Array.isArray(campaign?.admissionMethodDetails) ? campaign.admissionMethodDetails : []).forEach((method) => {
                const steps = Array.isArray(method?.admissionProcessSteps) ? method.admissionProcessSteps : [];
                if (steps.length > bestSteps.length) {
                    bestSteps = steps;
                }
            });
        });
        return bestSteps
            .map((step, idx) => {
                const order = Number(step?.stepOrder);
                const stepNo = Number.isFinite(order) ? order : idx + 1;
                const stepName = String(step?.stepName || "").trim() || `Bước ${stepNo}`;
                return `${stepNo}. ${stepName}`;
            })
            .slice(0, 8);
    })();
    const documentsCount = (Array.isArray(campaigns) ? campaigns : []).reduce((sum, campaign) => {
        const allDocs = Array.isArray(campaign?.mandatoryAll) ? campaign.mandatoryAll.length : 0;
        return Math.max(sum, allDocs);
    }, 0);
    const specialDocumentsList = Array.from(
        new Set(
            (Array.isArray(campaigns) ? campaigns : []).flatMap((campaign) =>
                (Array.isArray(campaign?.mandatoryAll) ? campaign.mandatoryAll : [])
                    .map((doc) => String(doc?.name || doc?.code || "").trim())
                    .filter(Boolean)
            )
        )
    ).slice(0, 8);
    const documentsCountLines = (Array.isArray(campaigns) ? campaigns : [])
        .map((campaign) => {
            const count = Array.isArray(campaign?.mandatoryAll) ? campaign.mandatoryAll.length : 0;
            if (count <= 0) return "";
            return `${toText(campaign?.name, "Chiến dịch")}: ${count} loại hồ sơ`;
        })
        .filter(Boolean);
    const campaignStatuses = Array.from(
        new Set((Array.isArray(campaigns) ? campaigns : []).map((campaign) => toText(campaign?.status, "")).filter(Boolean))
    );
    const campaignTimeline = (Array.isArray(campaigns) ? campaigns : [])
        .map((campaign) => {
            const startMs = new Date(campaign?.startDate).getTime();
            const endMs = new Date(campaign?.endDate).getTime();
            return {
                name: toText(campaign?.name, "Chiến dịch"),
                startMs: Number.isFinite(startMs) ? startMs : null,
                endMs: Number.isFinite(endMs) ? endMs : null,
                startDate: campaign?.startDate,
                endDate: campaign?.endDate
            };
        })
        .filter((item) => item.startMs != null || item.endMs != null);
    const earliestStart = campaignTimeline.length
        ? campaignTimeline.reduce((min, item) => (min == null || (item.startMs != null && item.startMs < min) ? item.startMs : min), null)
        : null;
    const latestEnd = campaignTimeline.length
        ? campaignTimeline.reduce((max, item) => (max == null || (item.endMs != null && item.endMs > max) ? item.endMs : max), null)
        : null;
    const subjectCount = subjects.length;
    const programListFlat = curriculumList.flatMap((curriculum) =>
        Array.isArray(curriculum?.programList) ? curriculum.programList : []
    );
    const programNames = Array.from(
        new Set(
            programListFlat
                .map((program) => String(program?.name || "").trim())
                .filter(Boolean)
        )
    );
    const programBaseFees = programListFlat
        .map((program) => Number(program?.baseTuitionFee))
        .filter((n) => Number.isFinite(n));
    const programBaseFeeSummary = programBaseFees.length
        ? (() => {
              const minFee = Math.min(...programBaseFees);
              const maxFee = Math.max(...programBaseFees);
              return minFee === maxFee ? formatMoney(minFee) : `${formatMoney(minFee)} - ${formatMoney(maxFee)}`;
          })()
        : "Đang cập nhật";
    const programTargetStudentLines = Array.from(
        new Set(
            programListFlat
                .map((program) => stripHtml(program?.targetStudentDescription))
                .filter(Boolean)
        )
    )
        .slice(0, 4)
        .map((text) => `- ${text}`);
    const programGraduationStandardLines = Array.from(
        new Set(
            programListFlat
                .map((program) => stripHtml(program?.graduationStandard))
                .filter(Boolean)
        )
    )
        .slice(0, 4)
        .map((text) => `- ${text}`);
    const subjectCountLines = curriculumList
        .map((curriculum, idx) => {
            const cName = toText(curriculum?.name, `Khung ${idx + 1}`);
            const subjectNames = (Array.isArray(curriculum?.subjectsJsonb) ? curriculum.subjectsJsonb : [])
                .map((subject) => String(subject?.name || "").trim())
                .filter(Boolean);
            const cSubjects = subjectNames.length;
            if (!cSubjects) return [`${cName}: 0 môn`];
            return [`${cName}: ${cSubjects} môn`, ...subjectNames.map((name) => `- ${name}`)];
        })
        .filter((lines) => Array.isArray(lines) && lines.length > 0)
        .flat()
        .slice(0, 8);
    const nearestCampusAddress = campusList.length ? toText(campusList[0]?.address) : "Đang cập nhật";
    const now = new Date().getTime();
    const hasOpenCampaign = (Array.isArray(campaigns) ? campaigns : []).some((campaign) => {
        const start = new Date(campaign?.startDate).getTime();
        const end = new Date(campaign?.endDate).getTime();
        return Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
    });

    return {
        logoUrl: toText(detail?.logoUrl || row?.logoUrl, ""),
        schoolName: toText(detail?.name || row?.schoolName),
        campusCount: campusList.length,
        campusAddresses: campusList.slice(0, 3).map((campus) => toText(campus?.address)).join(" | ") || "Đang cập nhật",
        nearestCampusAddress,
        districts: campusDistricts.length ? campusDistricts.join(", ") : "Đang cập nhật",
        distanceLabel: distanceKm == null ? "Đang cập nhật" : formatDistanceKm(distanceKm),
        distanceKmNumber: Number.isFinite(distanceKm) ? distanceKm : null,
        distanceBadge: distanceKm == null ? "" : distanceKm <= NEARBY_MARK_KM ? "Gần nhà" : "Cần cân nhắc di chuyển",
        distanceFlag: distanceKm != null ? (distanceKm <= NEARBY_MARK_KM ? "Trong 10km" : "Ngoài 10km") : "Chưa xác định GPS",
        tuitionSummary: tuitionStats.summary,
        tuitionCampusLines: tuitionStats.campusLines,
        annualTuition:
            tuitionStats.min == null
                ? "—"
                : `${formatMoney(tuitionStats.min * 12)}${tuitionStats.max !== tuitionStats.min ? ` - ${formatMoney(tuitionStats.max * 12)}` : ""}`,
        curriculumTypes: curriculumTypes.length ? curriculumTypes.join(" | ") : "Đang cập nhật",
        learningMethods: methods.length ? methods.join(" | ") : "Đang cập nhật",
        subjectCountLabel: subjectCount > 0 ? `${subjectCount} môn (ước tính theo dữ liệu public)` : "Đang cập nhật",
        subjectCountLines: subjectCountLines.length ? subjectCountLines : ["Đang cập nhật"],
        subjectsPreview: subjects.slice(0, 6).join(", ") || "Đang cập nhật",
        boardingType: campusBoardingSummary(campusList),
        quotaInfo: "Chưa thể so sánh chính xác (API chưa có quota)",
        admissionMethods: methodsAdmission.length ? methodsAdmission.join(" | ") : "Đang cập nhật",
        hasInterviewLabel: hasInterview ? "Có phỏng vấn / tương tác" : "Chưa thấy yêu cầu phỏng vấn",
        methodStepMaxLabel: methodStepMax > 0 ? `${methodStepMax} bước` : "Đang cập nhật",
        processStepsPreview: processStepsPreview.length ? processStepsPreview : [],
        processDifficulty:
            processStepCount <= 0 ? "Đang cập nhật" : processStepCount <= 3 ? `${processStepCount} bước (gọn)` : `${processStepCount} bước (khá chi tiết)`,
        documentsInfo: documentsCount > 0 ? `${documentsCount} loại hồ sơ` : "Đang cập nhật",
        documentsCountLines: documentsCountLines.length ? documentsCountLines : [documentsCount > 0 ? `${documentsCount} loại hồ sơ` : "Đang cập nhật"],
        documentsCountNumber: documentsCount > 0 ? documentsCount : null,
        specialDocumentsInfo: specialDocumentsList.join(" | ") || "Không có yêu cầu đặc biệt nổi bật",
        specialDocumentsList: specialDocumentsList.length ? specialDocumentsList.map((name) => `- ${name}`) : ["Không có yêu cầu đặc biệt nổi bật"],
        campaignTime:
            (Array.isArray(campaigns) ? campaigns : [])
                .slice(0, 2)
                .map((campaign) => `${toText(campaign?.name, "Chiến dịch")}: ${toText(campaign?.startDate, "—")} -> ${toText(campaign?.endDate, "—")}`)
                .join(" | ") || "Đang cập nhật",
        campaignWindow:
            earliestStart != null || latestEnd != null
                ? `${formatDateDisplay(earliestStart)} - ${formatDateDisplay(latestEnd)}`
                : "Đang cập nhật",
        earliestStartMs: earliestStart,
        latestEndMs: latestEnd,
        deadlineDays:
            latestEnd != null && Number.isFinite(latestEnd) ? Math.floor((latestEnd - now) / (1000 * 60 * 60 * 24)) : null,
        campaignStatus: hasOpenCampaign ? "Đang mở nhận hồ sơ" : campaignStatuses.join(" | ") || "Đang cập nhật",
        foundingDate: toText(detail?.foundingDate),
        description: stripHtml(detail?.description) || "Đang cập nhật",
        rating: Number.isFinite(Number(detail?.averageRating)) ? `${Number(detail.averageRating).toFixed(1)}/5` : "Chưa có đánh giá",
        feeReliability: "Chưa thể so sánh chuẩn (thiếu finalTuitionFee theo campus/năm/hệ)",
        programDepth: curriculumList.length > 0 ? `${curriculumList.length} khung chương trình` : "Đang cập nhật"
        ,
        programNamesLines: programNames.length ? programNames.map((name) => `- ${name}`) : ["Đang cập nhật"],
        programBaseFeeSummary,
        programTargetStudentLines: programTargetStudentLines.length ? programTargetStudentLines : ["Đang cập nhật"],
        programGraduationStandardLines: programGraduationStandardLines.length ? programGraduationStandardLines : ["Đang cập nhật"]
    };
}

export default function CompareSchoolsPage() {
    const navigate = useNavigate();

    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let userInfo = null;
    try {
        userInfo = raw ? JSON.parse(raw) : null;
    } catch {
        userInfo = null;
    }

    const userIdentity = getUserIdentity(userInfo);
    const [rows, setRows] = React.useState(() => getCompareSchools(userInfo));
    const [menuAnchor, setMenuAnchor] = React.useState(null);
    const [menuSchoolKey, setMenuSchoolKey] = React.useState(null);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [detailError, setDetailError] = React.useState("");
    const [comparePayloadByKey, setComparePayloadByKey] = React.useState({});
    const [userLocation, setUserLocation] = React.useState(null);

    React.useEffect(() => {
        setRows(getCompareSchools(userInfo));
    }, [userIdentity]);

    React.useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: Number(position.coords.latitude),
                    lng: Number(position.coords.longitude)
                });
            },
            () => {
                setUserLocation(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000
            }
        );
    }, []);

    React.useEffect(() => {
        if (!rows.length) {
            setComparePayloadByKey({});
            setDetailError("");
            setLoadingDetail(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingDetail(true);
            setDetailError("");
            try {
                const entries = await Promise.all(
                    rows.map(async (row) => {
                        const schoolId = parseSchoolIdFromKey(row?.schoolKey);
                        if (!Number.isFinite(schoolId)) {
                            return [
                                row?.schoolKey,
                                buildComparisonPayload(row, null, [], userLocation)
                            ];
                        }
                        const [detailRaw, campaigns] = await Promise.all([
                            getPublicSchoolDetail(schoolId),
                            getPublicSchoolCampaignTemplates(schoolId, 0).catch(() => [])
                        ]);
                        const detail = mapPublicSchoolDetailToRow(detailRaw) || detailRaw || null;
                        return [
                            row?.schoolKey,
                            buildComparisonPayload(row, detail, campaigns, userLocation)
                        ];
                    })
                );
                if (cancelled) return;
                setComparePayloadByKey(Object.fromEntries(entries.filter(([k]) => Boolean(k))));
            } catch (error) {
                if (cancelled) return;
                const message = String(error?.response?.data?.message || error?.message || "").trim();
                setDetailError(message || "Không tải được dữ liệu so sánh chi tiết.");
            } finally {
                if (!cancelled) setLoadingDetail(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [rows, userLocation]);

    const onRemove = (schoolKey) => {
        const next = rows.filter((x) => x?.schoolKey !== schoolKey);
        setCompareSchools(userInfo, next);
        setRows(next);
        enqueueSnackbar("Đã gỡ trường khỏi danh sách so sánh.", {autoHideDuration: 2000});
        setMenuAnchor(null);
        setMenuSchoolKey(null);
    };

    const openMenu = (e, schoolKey) => {
        setMenuAnchor(e.currentTarget);
        setMenuSchoolKey(schoolKey);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuSchoolKey(null);
    };

    const cardSurface = {
        bgcolor: "#fff",
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        boxShadow: landingSectionShadow(2)
    };

    const remainingSlots = Math.max(0, MAX_COMPARE_SCHOOLS - rows.length);
    const activeAddCount = remainingSlots > 0 ? 1 : 0;
    const lockedAddCount = remainingSlots > 0 ? remainingSlots - 1 : 0;

    const renderSchoolCard = (row, index) => {
        const tint = SCHOOL_ICON_TINTS[index % SCHOOL_ICON_TINTS.length];
        const loc = formatLocation(row);
        const grade = row?.gradeLevel ? String(row.gradeLevel).trim() : "";
        const type = row?.schoolType ? String(row.schoolType).trim() : "";

        return (
            <Card
                key={row?.schoolKey}
                elevation={0}
                sx={{
                    ...cardSurface,
                    p: 1.5,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative"
                }}
            >
                <Box sx={{display: "flex", alignItems: "flex-start", gap: 1, pr: 3.5}}>
                    <Box sx={{flexShrink: 0, mt: 0.1, lineHeight: 0, display: "flex"}}>
                        <FaSchool size={20} color={tint}/>
                    </Box>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: 14,
                            lineHeight: 1.3,
                            color: "#1e293b",
                            wordBreak: "break-word"
                        }}
                    >
                        Trường {row?.schoolName || "—"}
                    </Typography>
                </Box>

                <IconButton
                    size="small"
                    onClick={(e) => openMenu(e, row?.schoolKey)}
                    sx={{
                        position: "absolute",
                        top: 4,
                        right: 2,
                        color: "#94a3b8",
                        "&:hover": {color: BRAND_NAVY, bgcolor: "rgba(59,130,246,0.08)"}
                    }}
                    aria-label="Tùy chọn trường"
                >
                    <MoreVertIcon fontSize="small"/>
                </IconButton>

                <Box sx={{mt: 1, display: "flex", flexDirection: "column", gap: 0.5}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", gap: 0.75}}>
                        <PlaceOutlinedIcon sx={{fontSize: 16, color: "#94a3b8", mt: 0.1, flexShrink: 0}}/>
                        <Typography sx={{fontSize: 12, color: "#64748b", lineHeight: 1.4}}>
                            {loc}
                        </Typography>
                    </Box>
                    {grade ? (
                        <Box sx={{display: "flex", alignItems: "flex-start", gap: 0.75}}>
                            <CastForEducationIcon
                                sx={{fontSize: 16, color: "#94a3b8", mt: 0.1, flexShrink: 0}}/>
                            <Typography sx={{fontSize: 12, color: "#64748b", lineHeight: 1.4}}>
                                {grade}
                            </Typography>
                        </Box>
                    ) : null}
                    {type ? (
                        <Box sx={{display: "flex", alignItems: "flex-start", gap: 0.75}}>
                            <WcIcon sx={{fontSize: 16, color: "#94a3b8", mt: 0.1, flexShrink: 0}}/>
                            <Typography sx={{fontSize: 12, color: "#64748b", lineHeight: 1.4}}>
                                {type}
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            </Card>
        );
    };

    const renderAddCard = (locked) => (
        <Card
            elevation={0}
            onClick={locked ? undefined : () => navigate("/search-schools")}
            sx={{
                ...cardSurface,
                minHeight: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1.5,
                cursor: locked ? "not-allowed" : "pointer",
                bgcolor: locked ? "#f1f5f9" : "#fff",
                borderColor: locked ? "#e2e8f0" : "#e5e7eb",
                opacity: locked ? 0.92 : 1,
                transition: "background-color 0.15s ease, border-color 0.15s ease",
                ...(!locked && {
                    "&:hover": {
                        borderColor: BRAND_NAVY,
                        bgcolor: "rgba(59,130,246,0.04)"
                    }
                })
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.75,
                    color: locked ? "#64748b" : "#64748b"
                }}
            >
                {locked ? (
                    <LockIcon sx={{fontSize: 22, color: "#475569"}}/>
                ) : (
                    <AddIcon sx={{fontSize: 26, color: "#64748b", fontWeight: 300}}/>
                )}
                <Typography sx={{fontSize: 13, fontWeight: locked ? 500 : 600, color: locked ? "#64748b" : "#475569"}}>
                    Thêm trường
                </Typography>
            </Box>
        </Card>
    );

    const richRows = React.useMemo(
        () =>
            rows.map((row) => ({
                raw: row,
                detail: comparePayloadByKey[row?.schoolKey] || buildComparisonPayload(row, null, [], userLocation)
            })),
        [rows, comparePayloadByKey, userLocation]
    );

    const sections = [
        {
            key: "location",
            title: "1. Vị trí",
            tone: "#2563eb",
            rows: [
                {label: "Địa chỉ", render: (d) => d.nearestCampusAddress},
                {label: "Quận/Huyện", render: (d) => d.districts},
                {label: "Số campus", render: (d) => `${d.campusCount} cơ sở`}
            ]
        },
        {
            key: "boarding",
            title: "2. Loại hình",
            tone: "#7c3aed",
            rows: [{label: "Nội trú/Bán trú", render: (d) => d.boardingType}]
        },
        {
            key: "admission",
            title: "3. Tuyển sinh",
            tone: "#ca8a04",
            rows: [
                {label: "Phương thức", render: (d) => d.admissionMethods},
                {label: "Phỏng vấn", render: (d) => d.hasInterviewLabel},
                {label: "Quy trình", render: (d) => d.methodStepMaxLabel}
            ]
        },
        {
            key: "documents",
            title: "4. Hồ sơ",
            tone: "#ea580c",
            rows: [
                {label: "Số lượng hồ sơ", render: (d) => d.documentsCountLines},
                {label: "Hồ sơ đặc biệt", render: (d) => d.specialDocumentsList}
            ]
        },
        {
            key: "timeline",
            title: "5. Thời gian",
            tone: "#dc2626",
            rows: [
                {label: "Mốc tuyển sinh", render: (d) => d.campaignWindow},
                {label: "Trạng thái", render: (d) => d.campaignStatus},
                {
                    label: "Deadline còn lại",
                    render: (d) =>
                        Number.isFinite(d.deadlineDays)
                            ? d.deadlineDays >= 0
                                ? `${d.deadlineDays} ngày`
                                : `Đã quá hạn ${Math.abs(d.deadlineDays)} ngày`
                            : "Đang cập nhật"
                }
            ]
        },
        {
            key: "curriculum",
            title: "6. Chương trình học",
            tone: "#6d28d9",
            rows: [
                {label: "Loại chương trình", render: (d) => d.curriculumTypes},
                {label: "Chương trình thành phần", render: (d) => d.programNamesLines},
                {label: "Học phí gốc (program)", render: (d) => d.programBaseFeeSummary},
                {label: "Đối tượng học sinh", render: (d) => d.programTargetStudentLines},
                {label: "Chuẩn đầu ra", render: (d) => d.programGraduationStandardLines},
                {label: "Số môn", render: (d) => d.subjectCountLines},
                {label: "Phương pháp học", render: (d) => d.learningMethods}
            ]
        }
    ];

    const sectionStripeBg = (index) => (index % 2 === 0 ? "#ffffff" : "#eff6ff");
    const leftCriteriaColBg = "#ffffff";

    const renderProcessTimeline = (detail) => {
        const steps = Array.isArray(detail?.processStepsPreview) ? detail.processStepsPreview : [];
        if (!steps.length) return null;
        return (
            <Stack spacing={0.35} sx={{mt: 0.45}}>
                {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    return (
                        <Box key={`${detail.schoolName}-step-${idx}`} sx={{display: "flex", alignItems: "center", gap: 0.55}}>
                            <Box sx={{position: "relative", flexShrink: 0}}>
                                <Box
                                    sx={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        bgcolor: "rgba(37,99,235,0.14)",
                                        border: "1px solid rgba(37,99,235,0.4)",
                                        color: "#1d4ed8",
                                        fontSize: "0.63rem",
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {idx + 1}
                                </Box>
                                {!isLast ? (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            left: "50%",
                                            top: 16,
                                            transform: "translateX(-50%)",
                                            width: 1.5,
                                            height: 13,
                                            bgcolor: "rgba(59,130,246,0.28)",
                                            borderRadius: 999
                                        }}
                                    />
                                ) : null}
                            </Box>
                            <Typography sx={{fontSize: "0.82rem", color: "#1e293b", lineHeight: 1.4, mt: 0.05}}>
                                {step.replace(/^\d+\.\s*/, "")}
                            </Typography>
                        </Box>
                    );
                })}
            </Stack>
        );
    };

    return (
        <Box
            sx={{
                pt: "90px",
                minHeight: "100vh",
                background: HOME_PAGE_SURFACE_GRADIENT
            }}
        >
            <Box sx={{maxWidth: 1200, mx: "auto", px: {xs: 2, md: 3}, pb: 5}}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                        flexWrap: "wrap",
                        gap: 1.5
                    }}
                >
                    <Typography sx={{fontWeight: 800, fontSize: 20, color: "#1e293b"}}>
                        So sánh trường
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => navigate("/search-schools")}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderColor: "rgba(59,130,246,0.35)",
                            color: BRAND_NAVY,
                            "&:hover": {borderColor: BRAND_NAVY, bgcolor: "rgba(59,130,246,0.06)"}
                        }}
                    >
                        Tìm thêm trường
                    </Button>
                </Box>

                <Typography sx={{color: "#64748b", fontSize: 14, mb: 2, maxWidth: 720}}>
                    Chọn tối đa {MAX_COMPARE_SCHOOLS} trường. Dùng nút &quot;+&quot; ở trang tìm trường hoặc ô bên dưới để thêm.
                </Typography>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                            lg: "repeat(4, minmax(0, 1fr))"
                        },
                        gap: 2
                    }}
                >
                    {rows.map((row, i) => renderSchoolCard(row, i))}
                    {activeAddCount > 0 ? renderAddCard(false) : null}
                    {Array.from({length: lockedAddCount}).map((_, i) => (
                        <React.Fragment key={`lock-${i}`}>{renderAddCard(true)}</React.Fragment>
                    ))}
                </Box>

                {rows.length > 0 ? (
                    <Box sx={{mt: 2}}>
                        {loadingDetail || detailError ? (
                            <Box sx={{p: {xs: 1.1, md: 1.35}, borderBottom: "1px solid rgba(148,163,184,0.25)", bgcolor: "#fff", borderRadius: 2}}>
                                {loadingDetail ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CircularProgress size={18}/>
                                        <Typography sx={{fontSize: "0.9rem", color: "#475569"}}>Đang tải dữ liệu chi tiết...</Typography>
                                    </Stack>
                                ) : null}
                                {!loadingDetail && detailError ? (
                                    <Alert severity="warning">
                                        {detailError}
                                    </Alert>
                                ) : null}
                            </Box>
                        ) : null}

                        <Box sx={{overflowX: "auto", overflowY: "hidden", bgcolor: "transparent", p: 0}}>
                            <Box sx={{minWidth: 240 + Math.max(1, richRows.length) * 270}}>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: `240px repeat(${Math.max(1, richRows.length)}, minmax(270px, 1fr))`,
                                        columnGap: "16px",
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 5,
                                        bgcolor: "transparent",
                                        borderBottom: "1px solid rgba(59,130,246,0.22)"
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 6,
                                            px: 1.4,
                                            py: 1.2,
                                            bgcolor: leftCriteriaColBg,
                                            borderRight: "1px solid rgba(59,130,246,0.25)",
                                            borderTopLeftRadius: 12,
                                            borderTopRightRadius: 12,
                                            position: "sticky"
                                        }}
                                    >
                                    </Box>
                                    {richRows.map((item) => (
                                        <Box
                                            key={`sticky-head-${item.raw?.schoolKey}`}
                                            sx={{
                                                px: 1.2,
                                                py: 1.1,
                                                borderLeft: "1px solid rgba(59,130,246,0.2)",
                                                bgcolor: "#2563eb",
                                                color: "#fff",
                                                borderTopLeftRadius: 14,
                                                borderTopRightRadius: 14,
                                                boxShadow: "0 10px 24px rgba(37,99,235,0.28)"
                                            }}
                                        >
                                            <Stack direction="row" spacing={0.9} alignItems="center">
                                                <Avatar src={item.detail.logoUrl || undefined} sx={{width: 34, height: 34, bgcolor: "#dbeafe"}}>
                                                    {String(item.detail.schoolName || "?").charAt(0)}
                                                </Avatar>
                                                <Box sx={{minWidth: 0}}>
                                                    <Typography sx={{fontWeight: 800, color: "#ffffff", fontSize: "0.92rem", lineHeight: 1.35}}>
                                                        {item.detail.schoolName}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => navigate("/search-schools")}
                                                        sx={{mt: 0.25, p: 0, minWidth: 0, textTransform: "none", fontSize: "0.72rem", fontWeight: 700, color: "#dbeafe"}}
                                                    >
                                                        Xem chi tiết
                                                    </Button>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Box>

                                {sections.map((section, sectionIdx) => (
                                    <Box key={section.key} sx={{bgcolor: sectionStripeBg(sectionIdx)}}>
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: `240px repeat(${Math.max(1, richRows.length)}, minmax(270px, 1fr))`,
                                                columnGap: "16px",
                                                borderTop: "1px solid rgba(59,130,246,0.16)"
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 3,
                                                    px: 1.4,
                                                    py: 1.15,
                                                    bgcolor: leftCriteriaColBg,
                                                    borderRight: "1px solid rgba(59,130,246,0.2)",
                                                    borderRadius: "10px",
                                                    boxShadow: "0 3px 10px rgba(37,99,235,0.14)",
                                                    "&::after": {
                                                        content: '""',
                                                        position: "absolute",
                                                        right: -16,
                                                        top: "50%",
                                                        width: 16,
                                                        borderTop: "2px solid rgba(29,78,216,0.45)",
                                                        transform: "translateY(-50%)",
                                                        zIndex: 2
                                                    }
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        right: -4,
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: "50%",
                                                        bgcolor: "#1d4ed8",
                                                        opacity: 0.88,
                                                        zIndex: 3
                                                    }}
                                                />
                                                <Typography sx={{fontSize: "0.9rem", color: "#1e3a8a", fontWeight: 800}}>
                                                    {section.title}
                                                </Typography>
                                            </Box>
                                            {richRows.map((item, colIdx) => {
                                                const isLastCol = colIdx === richRows.length - 1;
                                                return (
                                                    <Box
                                                        key={`sec-head-${section.key}-${item.raw?.schoolKey}`}
                                                        sx={{
                                                            position: "relative",
                                                            px: 1.2,
                                                            py: 1.1,
                                                            borderLeft: "1px solid rgba(59,130,246,0.14)",
                                                            bgcolor: "#ffffff",
                                                            borderRadius: "10px",
                                                            boxShadow: "0 3px 10px rgba(15,23,42,0.08)",
                                                            "&::after": !isLastCol
                                                                ? {
                                                                      content: '""',
                                                                      position: "absolute",
                                                                      right: -16,
                                                                      top: "50%",
                                                                      width: 16,
                                                                      borderTop: "2px solid rgba(29,78,216,0.45)",
                                                                      transform: "translateY(-50%)",
                                                                      zIndex: 1
                                                                  }
                                                                : undefined
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                left: -4,
                                                                top: "50%",
                                                                transform: "translateY(-50%)",
                                                                width: 7,
                                                                height: 7,
                                                                borderRadius: "50%",
                                                                bgcolor: "#1d4ed8",
                                                                opacity: 0.88,
                                                                zIndex: 2
                                                            }}
                                                        />
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                right: -4,
                                                                top: "50%",
                                                                transform: "translateY(-50%)",
                                                                width: 7,
                                                                height: 7,
                                                                borderRadius: "50%",
                                                                bgcolor: "#1d4ed8",
                                                                opacity: 0.88,
                                                                zIndex: 2
                                                            }}
                                                        />
                                                    </Box>
                                                );
                                            })}
                                        </Box>

                                        {section.rows.map((rowMeta) => (
                                            <Box
                                                key={`${section.key}-${rowMeta.label}`}
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: `240px repeat(${Math.max(1, richRows.length)}, minmax(270px, 1fr))`,
                                                    columnGap: "16px",
                                                    borderTop: "1px dashed rgba(59,130,246,0.22)"
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        position: "sticky",
                                                        left: 0,
                                                        zIndex: 2,
                                                        pl: 2.9,
                                                        pr: 1.4,
                                                        py: 1.05,
                                                        bgcolor: leftCriteriaColBg,
                                                        borderRight: "1px solid rgba(59,130,246,0.2)",
                                                        borderRadius: "10px",
                                                        boxShadow: "0 3px 10px rgba(15,23,42,0.08)",
                                                        "&::after": {
                                                            content: '""',
                                                            position: "absolute",
                                                            right: -16,
                                                            top: "50%",
                                                            width: 16,
                                                            borderTop: "2px solid rgba(29,78,216,0.45)",
                                                            transform: "translateY(-50%)",
                                                            zIndex: 2
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            position: "absolute",
                                                            right: -4,
                                                            top: "50%",
                                                            transform: "translateY(-50%)",
                                                            width: 7,
                                                            height: 7,
                                                            borderRadius: "50%",
                                                            bgcolor: "#1d4ed8",
                                                            opacity: 0.88,
                                                            zIndex: 3
                                                        }}
                                                    />
                                                    <Stack direction="row" spacing={0.7} alignItems="center">
                                                        {(() => {
                                                            const MetricIcon = metricIconByLabel(rowMeta.label);
                                                            return <MetricIcon sx={{fontSize: 16, color: "#1d4ed8", flexShrink: 0}}/>;
                                                        })()}
                                                        <Typography sx={{fontSize: "0.88rem", fontWeight: 700, color: "#1e3a8a"}}>
                                                            {rowMeta.label}
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                                {richRows.map((item, colIdx) => {
                                                    const cellText = rowMeta.render(item.detail);
                                                    const isLastCol = colIdx === richRows.length - 1;
                                                    return (
                                                        <Box
                                                            key={`${section.key}-${rowMeta.label}-${item.raw?.schoolKey}`}
                                                            sx={{
                                                                position: "relative",
                                                                pl: 2.4,
                                                                pr: 1.2,
                                                                py: 1.05,
                                                                borderLeft: "1px solid rgba(59,130,246,0.14)",
                                                                bgcolor: "#ffffff",
                                                                borderRadius: "10px",
                                                                boxShadow: "0 4px 12px rgba(15,23,42,0.09)",
                                                                "&::after": !isLastCol
                                                                    ? {
                                                                          content: '""',
                                                                          position: "absolute",
                                                                          right: -16,
                                                                          top: "50%",
                                                                          width: 16,
                                                                          borderTop: "2px solid rgba(29,78,216,0.45)",
                                                                          transform: "translateY(-50%)",
                                                                          zIndex: 1
                                                                      }
                                                                    : undefined
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    position: "absolute",
                                                                    left: -4,
                                                                    top: "50%",
                                                                    transform: "translateY(-50%)",
                                                                    width: 7,
                                                                    height: 7,
                                                                    borderRadius: "50%",
                                                                    bgcolor: "#1d4ed8",
                                                                    opacity: 0.88,
                                                                    zIndex: 2
                                                                }}
                                                            />
                                                            <Box
                                                                sx={{
                                                                    position: "absolute",
                                                                    right: -4,
                                                                    top: "50%",
                                                                    transform: "translateY(-50%)",
                                                                    width: 7,
                                                                    height: 7,
                                                                    borderRadius: "50%",
                                                                    bgcolor: "#1d4ed8",
                                                                    opacity: 0.88,
                                                                    zIndex: 2
                                                                }}
                                                            />
                                                            {section.key === "boarding" ? (
                                                                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.5}}>
                                                                    {String(cellText)
                                                                        .split("/")
                                                                        .map((x) => x.trim())
                                                                        .filter(Boolean)
                                                                        .map((label) => (
                                                                            <Chip
                                                                                key={`${item.raw?.schoolKey}-${label}`}
                                                                                size="small"
                                                                                label={label}
                                                                                sx={{
                                                                                    height: 22,
                                                                                    fontSize: "0.72rem",
                                                                                    fontWeight: 700,
                                                                                    bgcolor: label.includes("Nội trú")
                                                                                        ? "rgba(124,58,237,0.14)"
                                                                                        : "rgba(37,99,235,0.14)",
                                                                                    color: label.includes("Nội trú") ? "#6d28d9" : "#1d4ed8",
                                                                                    border: "1px solid rgba(148,163,184,0.35)"
                                                                                }}
                                                                            />
                                                                        ))}
                                                                </Stack>
                                                            ) : section.key === "curriculum" && rowMeta.label === "Phương pháp học" ? (
                                                                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{gap: 0.45}}>
                                                                    {String(cellText)
                                                                        .split("|")
                                                                        .map((x) => x.trim())
                                                                        .filter(Boolean)
                                                                        .map((tag) => (
                                                                            <Chip
                                                                                key={`${item.raw?.schoolKey}-${tag}`}
                                                                                size="small"
                                                                                label={tag}
                                                                                sx={{
                                                                                    height: 22,
                                                                                    fontSize: "0.72rem",
                                                                                    fontWeight: 700,
                                                                                    bgcolor: "rgba(59,130,246,0.1)",
                                                                                    color: "#1d4ed8",
                                                                                    border: "1px solid rgba(59,130,246,0.24)"
                                                                                }}
                                                                            />
                                                                        ))}
                                                                </Stack>
                                                            ) : (
                                                                <>
                                                                    {Array.isArray(cellText) ? (
                                                                        <Stack spacing={0.45}>
                                                                            {cellText.map((line, idx) => {
                                                                                const rawLine = String(line || "");
                                                                                const normalizedLine =
                                                                                    cellText.length === 1
                                                                                        ? rawLine.replace(/^\s*-\s*/, "")
                                                                                        : rawLine;
                                                                                const isBullet = normalizedLine.trim().startsWith("-");
                                                                                const bulletText = normalizedLine.replace(/^\s*-\s*/, "").trim();
                                                                                if (isBullet) {
                                                                                    return (
                                                                                        <Box
                                                                                            key={`${section.key}-${rowMeta.label}-${item.raw?.schoolKey}-${idx}`}
                                                                                            sx={{display: "flex", alignItems: "flex-start", gap: 0.7}}
                                                                                        >
                                                                                            <Box
                                                                                                sx={{
                                                                                                    width: 6,
                                                                                                    height: 6,
                                                                                                    borderRadius: "50%",
                                                                                                    bgcolor: "#2563eb",
                                                                                                    mt: 0.62,
                                                                                                    flexShrink: 0
                                                                                                }}
                                                                                            />
                                                                                            <Typography
                                                                                                sx={{
                                                                                                    fontSize: "0.92rem",
                                                                                                    color: "#1f2937",
                                                                                                    fontWeight: 600,
                                                                                                    lineHeight: 1.58
                                                                                                }}
                                                                                            >
                                                                                                {bulletText}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <Typography
                                                                                        key={`${section.key}-${rowMeta.label}-${item.raw?.schoolKey}-${idx}`}
                                                                                        sx={{
                                                                                            fontSize: idx === 0 ? "0.99rem" : "0.93rem",
                                                                                            color: idx === 0 ? "#0b3b91" : "#1e293b",
                                                                                            fontWeight: idx === 0 ? 800 : 650,
                                                                                            lineHeight: 1.58,
                                                                                            whiteSpace: "pre-line"
                                                                                        }}
                                                                                    >
                                                                                        {normalizedLine}
                                                                                    </Typography>
                                                                                );
                                                                            })}
                                                                        </Stack>
                                                                    ) : (
                                                                        <Typography sx={{fontSize: "1rem", color: "#0b3b91", fontWeight: 750, lineHeight: 1.6}}>
                                                                            {cellText}
                                                                        </Typography>
                                                                    )}
                                                                    {section.key === "admission" && rowMeta.label === "Quy trình"
                                                                        ? renderProcessTimeline(item.detail)
                                                                        : null}
                                                                </>
                                                            )}
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        ))}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                ) : null}

                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
                    <MenuItem
                        onClick={() => menuSchoolKey && onRemove(menuSchoolKey)}
                        sx={{fontSize: 14}}
                    >
                        Gỡ khỏi so sánh
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
}
