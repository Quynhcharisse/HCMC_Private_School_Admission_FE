import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Paper,
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
    Tooltip,
    Typography,
    alpha,
} from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import AddIcon from "@mui/icons-material/Add";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import { enqueueSnackbar } from "notistack";
import {
    ADMIN_SUBJECT_TYPE,
    getAdminSubjects,
    postAdminSubject,
} from "../../../services/AdminService.jsx";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    adminDataCardBorderSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";

const TAB_CONFIG = [
    { type: "regular", postSubjectType: ADMIN_SUBJECT_TYPE.REGULAR_SUBJECT, label: "Môn học chính" },
    { type: "foreign_language", postSubjectType: ADMIN_SUBJECT_TYPE.FOREIGN_LANGUAGE_SUBJECT, label: "Ngoại ngữ" },
];

const SUBJECT_GROUP_TYPE_KEYS = {
    regular: "regular",
    foreign_language: "foreign_language",
    REGULAR_SUBJECT: "regular",
    FOREIGN_LANGUAGE_SUBJECT: "foreign_language",
};

function normalizeSubjectGroupType(type) {
    if (type == null || type === "") return null;
    return SUBJECT_GROUP_TYPE_KEYS[String(type)] ?? null;
}

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (d == null || typeof d !== "object") return fallback;
    const m = d.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m) && m.length) return m.filter((x) => x != null && String(x).trim()).join(" ");
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    return fallback;
}

function buildGroupsMap(body) {
    const map = new Map();
    if (!Array.isArray(body)) return map;
    for (const entry of body) {
        const key = normalizeSubjectGroupType(entry?.type);
        if (!key) continue;
        map.set(key, {
            apiLabel: entry.label,
            subjects: Array.isArray(entry.subjects) ? entry.subjects : [],
        });
    }
    return map;
}

export default function AdminSubjectsManagement() {
    const [groupsMap, setGroupsMap] = useState(() => new Map());
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [nameSortDir, setNameSortDir] = useState("asc");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminSubjects();
            setGroupsMap(buildGroupsMap(res?.data?.body));
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách môn học.", { variant: "error" });
            setGroupsMap(new Map());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const activeType = TAB_CONFIG[tab]?.type;
    const activeGroup = activeType ? groupsMap.get(activeType) : null;
    const rawSubjects = activeGroup?.subjects ?? [];

    const filteredSubjects = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rawSubjects;
        return rawSubjects.filter((s) => String(s?.name || "").toLowerCase().includes(q));
    }, [rawSubjects, search]);

    const sortedSubjects = useMemo(() => {
        const list = [...filteredSubjects];
        const factor = nameSortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            const na = String(a?.name ?? "");
            const nb = String(b?.name ?? "");
            return factor * na.localeCompare(nb, "vi", { sensitivity: "base" });
        });
        return list;
    }, [filteredSubjects, nameSortDir]);

    useEffect(() => {
        setSearch("");
    }, [tab]);

    const handleOpenCreate = () => {
        setCreateName("");
        setCreateOpen(true);
    };

    const handleCloseCreate = () => {
        if (createSubmitting) return;
        setCreateOpen(false);
        setCreateName("");
    };

    const handleCreateSubmit = async () => {
        const trimmedSubjectName = String(createName ?? "").trim();
        if (!trimmedSubjectName) {
            enqueueSnackbar("Vui lòng nhập tên môn học.", { variant: "warning" });
            return;
        }
        const subjectType = TAB_CONFIG[tab]?.postSubjectType;
        if (!subjectType) return;
        setCreateSubmitting(true);
        try {
            await postAdminSubject({ name: trimmedSubjectName, subjectType });
            enqueueSnackbar("Đã tạo môn học.", { variant: "success" });
            setCreateOpen(false);
            setCreateName("");
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể tạo môn học. Thử lại sau."), { variant: "error" });
        } finally {
            setCreateSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 1, md: 2 },
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
            }}
        >
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, "&:last-child": { pb: { xs: 2.2, md: 2.8 } } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.2),
                                    color: "white",
                                    width: 42,
                                    height: 42,
                                }}
                            >
                                <MenuBookOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    Quản lý môn học
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
                                    Danh mục môn học chính và ngoại ngữ trên nền tảng
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            mb: 2,
                            minHeight: 44,
                            borderBottom: "1px solid #bfdbfe",
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                minHeight: 44,
                                color: "#64748b",
                            },
                            "& .Mui-selected": { color: APP_PRIMARY_MAIN },
                            "& .MuiTabs-indicator": {
                                height: 3,
                                borderRadius: "3px 3px 0 0",
                                bgcolor: APP_PRIMARY_MAIN,
                            },
                        }}
                    >
                        {TAB_CONFIG.map((cfg, i) => (
                            <Tab key={cfg.type} label={cfg.label} value={i} />
                        ))}
                    </Tabs>

                    <Stack
                        direction="row"
                        flexWrap="wrap"
                        alignItems="center"
                        spacing={1.5}
                        useFlexGap
                        sx={{ mb: 2, width: "100%" }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên môn học..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{
                                flex: "1 1 280px",
                                minWidth: 0,
                                maxWidth: "none",
                                "& .MuiOutlinedInput-root": {
                                    height: 40,
                                    boxSizing: "border-box",
                                },
                                "& .MuiOutlinedInput-input": {
                                    py: 0,
                                    height: 40,
                                    boxSizing: "border-box",
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Tooltip
                            title={
                                nameSortDir === "asc"
                                    ? "Đang sắp xếp A → Z — bấm để đổi sang Z → A"
                                    : "Đang sắp xếp Z → A — bấm để đổi sang A → Z"
                            }
                        >
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ImportExportIcon />}
                                onClick={() => setNameSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                                aria-label="Sắp xếp"
                                sx={{
                                    flexShrink: 0,
                                    height: 40,
                                    minHeight: 40,
                                    px: 2,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderColor: "#cbd5e1",
                                    color: "#334155",
                                    bgcolor: "#ffffff",
                                    "&:hover": {
                                        borderColor: APP_PRIMARY_MAIN,
                                        bgcolor: "#f8fafc",
                                    },
                                }}
                            >
                                Sắp xếp
                            </Button>
                        </Tooltip>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreate}
                            sx={{
                                flexShrink: 0,
                                height: 40,
                                minHeight: 40,
                                px: 2,
                                textTransform: "none",
                                fontWeight: 700,
                                boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                                ml: { xs: 0, md: "auto" },
                            }}
                        >
                            Tạo môn học
                        </Button>
                    </Stack>

                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table size="small" sx={{ minWidth: 360 }}>
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell width={72} sx={adminTableHeadCellSx}>
                                        STT
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            ...adminTableHeadCellSx,
                                            textAlign: "left",
                                        }}
                                    >
                                        Tên môn học
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={36} sx={{ color: APP_PRIMARY_MAIN }} />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSubjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center" sx={{ py: 4, color: "#64748b" }}>
                                            {rawSubjects.length === 0
                                                ? "Chưa có dữ liệu cho nhóm này."
                                                : "Không có môn học phù hợp bộ lọc."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedSubjects.map((row, idx) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{
                                                "& td": {
                                                    ...adminTableBodyRowSx["& td"],
                                                    verticalAlign: "middle",
                                                },
                                                "&:hover": adminTableBodyRowSx["&:hover"],
                                            }}
                                        >
                                            <TableCell align="center">{idx + 1}</TableCell>
                                            <TableCell align="left">
                                                <Typography fontWeight={600} color="#1e293b">
                                                    {row.name}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog open={createOpen} onClose={handleCloseCreate} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>Tạo môn học</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
                        Môn mới thuộc nhóm: <strong>{TAB_CONFIG[tab]?.label ?? "—"}</strong>
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="Tên môn học"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        disabled={createSubmitting}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !createSubmitting) {
                                e.preventDefault();
                                handleCreateSubmit();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseCreate} disabled={createSubmitting} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateSubmit}
                        disabled={createSubmitting}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                        {createSubmitting ? <CircularProgress size={22} color="inherit" /> : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
