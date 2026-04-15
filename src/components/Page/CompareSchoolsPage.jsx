import React from "react";
import {
    Box,
    Button,
    Card,
    IconButton,
    Menu,
    MenuItem,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    CastForEducation as CastForEducationIcon,
    Lock as LockIcon,
    MoreVert as MoreVertIcon,
    PlaceOutlined as PlaceOutlinedIcon,
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

const SCHOOL_ICON_TINTS = ["#2563eb", "#3b82f6", "#0ea5e9", "#38bdf8"];

function formatLocation(row) {
    if (row?.locationLabel) return String(row.locationLabel);
    const w = row?.ward;
    const p = row?.province;
    if (w && p) return `${w}, ${p}`;
    return p || w || "—";
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

    React.useEffect(() => {
        setRows(getCompareSchools(userInfo));
    }, [userIdentity]);

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
