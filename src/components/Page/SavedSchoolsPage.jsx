import React from "react";
import {Box, Button, Card, CardMedia, Divider, IconButton, Typography} from "@mui/material";
import {Bookmark as BookmarkIcon} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

import {showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getSavedSchools,
    setSavedSchools
} from "../../utils/savedSchoolsStorage";

export default function SavedSchoolsPage() {
    const navigate = useNavigate();

    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let userInfo = null;
    try {
        userInfo = raw ? JSON.parse(raw) : null;
    } catch {
        userInfo = null;
    }

    const isParent = userInfo?.role === "PARENT";
    const savedSchools = React.useMemo(() => (isParent ? getSavedSchools(userInfo) : []), [isParent, userInfo]);

    React.useEffect(() => {
        if (!isParent) {
            navigate("/login", {replace: true});
        }
    }, [isParent, navigate]);

    const onRemove = (schoolRecord) => {
        if (!isParent) {
            showWarningSnackbar("Bạn phải đăng nhập với vai trò Phụ huynh để lưu trường.");
            return;
        }
        const next = savedSchools.filter((x) => x?.schoolKey !== schoolRecord?.schoolKey);
        setSavedSchools(userInfo, next);
        enqueueSnackbar("Đã xóa khỏi trường đã lưu.", {autoHideDuration: 2000});
    };

    return (
        <Box sx={{pt: "90px", minHeight: "100vh", bgcolor: "#f7fbff"}}>
            <Box sx={{maxWidth: 1200, mx: "auto", px: {xs: 2, md: 3}, pb: 5}}>
                <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2}}>
                    <Typography sx={{fontWeight: 800, fontSize: 20, color: "#0f172a"}}>
                        Trường đã lưu
                    </Typography>
                    {!isParent && (
                        <Button
                            variant="contained"
                            onClick={() => navigate("/login")}
                            sx={{textTransform: "none"}}
                        >
                            Đăng nhập
                        </Button>
                    )}
                </Box>

                {!isParent ? (
                    <Card sx={{p: 3, borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(15,23,42,0.05)"}}>
                        <Typography sx={{color: "#334155", fontWeight: 600}}>
                            Bạn cần đăng nhập với vai trò Phụ huynh để xem và lưu danh sách trường.
                        </Typography>
                    </Card>
                ) : (
                    <>
                        <Divider sx={{mb: 2}}/>
                        {savedSchools.length === 0 ? (
                            <Card sx={{p: 3, borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(15,23,42,0.05)"}}>
                                <Typography sx={{color: "#64748b"}}>
                                    Chưa có trường nào được lưu.
                                </Typography>
                            </Card>
                        ) : (
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"}, gap: 2}}>
                                {savedSchools.map((item) => (
                                    <Card
                                        key={item?.schoolKey}
                                        sx={{
                                            position: "relative",
                                            display: "grid",
                                            gridTemplateColumns: {xs: "1fr", sm: "280px 1fr"},
                                            gap: 2,
                                            p: 2,
                                            borderRadius: 3,
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 2px 10px rgba(15,23,42,0.05)"
                                        }}
                                    >
                                        <CardMedia
                                            component="img"
                                            image={"https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80"}
                                            alt={item?.schoolName}
                                            sx={{height: {xs: 180, sm: 170}, borderRadius: 2}}
                                        />
                                        <Box>
                                            <Typography sx={{fontWeight: 800, fontSize: 18, color: "#0f172a"}}>
                                                {item?.schoolName}
                                            </Typography>
                                            <Typography sx={{mt: 0.5, color: "#475569"}}>
                                                {item?.province} - {item?.ward}
                                            </Typography>

                                            <Box sx={{display: "flex", justifyContent: "flex-end", mt: 1}}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onRemove(item)}
                                                    sx={{color: "#f59e0b"}}
                                                >
                                                    <BookmarkIcon fontSize="small"/>
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}

