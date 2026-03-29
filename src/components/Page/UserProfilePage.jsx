import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Grid,
    TextField,
    Typography
} from "@mui/material";
import {enqueueSnackbar} from "notistack";
import {getProfile, updateProfile} from "../../services/AccountService.jsx";

export default function UserProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileBody, setProfileBody] = useState({
        name: "",
        email: "",
        phone: "",
        currentAddress: ""
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                if (res && res.status === 200) {
                    const body = res.data?.body
                        ? (typeof res.data.body === "string" ? JSON.parse(res.data.body) : res.data.body)
                        : {};
                    setProfileBody({
                        name: body.name || "",
                        email: body.email || "",
                        phone: body.phone || "",
                        currentAddress: body.currentAddress || ""
                    });
                }
            } catch (e) {
                console.error("Error loading profile", e);
                enqueueSnackbar("Không thể tải thông tin hồ sơ", {variant: "error"});
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (field) => (event) => {
        setProfileBody(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: profileBody.name?.trim(),
                phone: profileBody.phone?.trim(),
                currentAddress: profileBody.currentAddress?.trim()
            };

            const res = await updateProfile(payload);
            if (res && res.status === 200) {
                enqueueSnackbar("Cập nhật hồ sơ thành công!", {variant: "success"});
            }
        } catch (e) {
            console.error("Error updating profile", e);
            const message = e?.response?.data?.message || "Cập nhật hồ sơ thất bại, vui lòng thử lại.";
            enqueueSnackbar(message, {variant: "error"});
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{pt: 10, display: "flex", justifyContent: "center"}}>
                <CircularProgress/>
            </Box>
        );
    }

    return (
        <Box sx={{pt: 10, pb: 6, bgcolor: "#F3F4F6", minHeight: "100vh"}}>
            <Container maxWidth="md">
                <Typography variant="h4" sx={{fontWeight: 700, mb: 3}}>
                    Hồ sơ cá nhân
                </Typography>
                <Card sx={{borderRadius: 3, boxShadow: "0 8px 24px rgba(51,65,85,0.08)"}}>
                    <CardContent sx={{p: 4}}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Họ và tên"
                                    fullWidth
                                    value={profileBody.name}
                                    onChange={handleChange("name")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Email"
                                    fullWidth
                                    value={profileBody.email}
                                    disabled
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Số điện thoại"
                                    fullWidth
                                    value={profileBody.phone}
                                    onChange={handleChange("phone")}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Địa chỉ hiện tại"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={profileBody.currentAddress}
                                    onChange={handleChange("currentAddress")}
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{mt: 4, display: "flex", justifyContent: "flex-end"}}>
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={saving}
                                sx={{textTransform: "none", fontWeight: 600}}
                            >
                                {saving ? <CircularProgress size={20} color="inherit"/> : "Lưu thay đổi"}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}

