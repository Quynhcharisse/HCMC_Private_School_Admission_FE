import React from "react";
import {
    Box,
    Button,
    Card,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import {DeleteOutline as DeleteOutlineIcon} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

import {getUserIdentity} from "../../utils/savedSchoolsStorage";
import {
    getCompareSchools,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import {
    BRAND_NAVY,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";

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

    React.useEffect(() => {
        setRows(getCompareSchools(userInfo));
    }, [userIdentity]);

    const onRemove = (schoolKey) => {
        const next = rows.filter((x) => x?.schoolKey !== schoolKey);
        setCompareSchools(userInfo, next);
        setRows(next);
        enqueueSnackbar("Đã gỡ trường khỏi danh sách so sánh.", {autoHideDuration: 2000});
    };

    const cardSurface = {
        bgcolor: "#fff",
        borderRadius: 3,
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: landingSectionShadow(2)
    };

    return (
        <Box
            sx={{
                pt: "90px",
                minHeight: "100vh",
                background: HOME_PAGE_SURFACE_GRADIENT
            }}
        >
            <Box sx={{maxWidth: 1100, mx: "auto", px: {xs: 2, md: 3}, pb: 5}}>
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
                    <Typography sx={{fontWeight: 800, fontSize: 20, color: "#0f172a"}}>
                        So sánh trường
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => navigate("/search-schools")}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderColor: "rgba(45,95,115,0.35)",
                            color: BRAND_NAVY,
                            "&:hover": {borderColor: BRAND_NAVY, bgcolor: "rgba(45,95,115,0.06)"}
                        }}
                    >
                        Tìm thêm trường
                    </Button>
                </Box>

                {rows.length === 0 ? (
                    <Card sx={{p: 3, ...cardSurface}}>
                        <Typography sx={{color: "#64748b", mb: 2}}>
                            Chưa có trường nào trong danh sách so sánh. Dùng nút &quot;+&quot; ở trang tìm trường để thêm (tối đa 4
                            trường).
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate("/search-schools")}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                bgcolor: BRAND_NAVY,
                                "&:hover": {bgcolor: "#265a6b"}
                            }}
                        >
                            Đến tìm trường
                        </Button>
                    </Card>
                ) : (
                    <Card sx={{...cardSurface, overflow: "hidden"}}>
                        <TableContainer>
                            <Table size="small" sx={{minWidth: 520}}>
                                <TableHead>
                                    <TableRow sx={{bgcolor: "rgba(45,95,115,0.06)"}}>
                                        <TableCell sx={{fontWeight: 800, color: BRAND_NAVY}}>Tên trường</TableCell>
                                        <TableCell sx={{fontWeight: 800, color: BRAND_NAVY}}>Tỉnh / TP</TableCell>
                                        <TableCell sx={{fontWeight: 800, color: BRAND_NAVY}}>Phường / Xã</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 800, color: BRAND_NAVY, width: 72}}>
                                            &nbsp;
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row?.schoolKey} hover>
                                            <TableCell sx={{fontWeight: 700, color: "#0f172a"}}>
                                                {row?.schoolName}
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>{row?.province}</TableCell>
                                            <TableCell sx={{color: "#64748b"}}>{row?.ward}</TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onRemove(row?.schoolKey)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: BRAND_NAVY, bgcolor: "rgba(45,95,115,0.08)"}
                                                    }}
                                                    title="Gỡ khỏi so sánh"
                                                >
                                                    <DeleteOutlineIcon fontSize="small"/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                )}
            </Box>
        </Box>
    );
}
