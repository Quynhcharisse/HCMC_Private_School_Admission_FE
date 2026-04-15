import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { sendWelcomeEmail } from "../services/emailService.jsx";
import { showErrorSnackbar, showSuccessSnackbar } from "./ui/AppSnackbar.jsx";

const SendWelcomeEmail = () => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await sendWelcomeEmail(form);
            showSuccessSnackbar("Gửi email thành công.");
            setForm({
                name: "",
                email: "",
            });
        } catch (err) {
            const msg =
                err?.message?.includes("Thiếu cấu hình EmailJS") ? err.message : "Gửi email thất bại.";
            showErrorSnackbar(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSend} sx={{ maxWidth: 400 }}>
            <Typography variant="h6" component="h2" gutterBottom>
                Gửi email chào mừng
            </Typography>
            <Stack spacing={2}>
                <TextField
                    name="name"
                    label="Tên"
                    value={form.name}
                    onChange={handleChange}
                    required
                    fullWidth
                    autoComplete="name"
                />
                <TextField
                    type="email"
                    name="email"
                    label="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    fullWidth
                    autoComplete="email"
                />
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? "Đang gửi..." : "Gửi email"}
                </Button>
            </Stack>
        </Box>
    );
};

export default SendWelcomeEmail;
