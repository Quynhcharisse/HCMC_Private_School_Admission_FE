import React, {useState} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {enqueueSnackbar} from "notistack";

export default function SchoolCampus() {
    const [campuses, setCampuses] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCampus, setEditingCampus] = useState(null);
    const [formValues, setFormValues] = useState({
        name: "",
        address: "",
        phone: "",
    });
    const [formErrors, setFormErrors] = useState({});

    const addCampusToState = (campus) => {
        setCampuses((prev) => [...prev, {...campus, id: campus.id ?? Date.now()}]);
    };

    const updateCampusInState = (id, campus) => {
        setCampuses((prev) => prev.map((c) => (c.id === id ? {...c, ...campus} : c)));
    };

    const deleteCampusInState = (id) => {
        setCampuses((prev) => prev.filter((c) => c.id !== id));
    };

    const handleOpenCreate = () => {
        setEditingCampus(null);
        setFormValues({name: "", address: "", phone: ""});
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleOpenEdit = (campus) => {
        setEditingCampus(campus);
        setFormValues({
            name: campus.name || "",
            address: campus.address || "",
            phone: campus.phone || "",
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
    };

    const validate = () => {
        const errors = {};
        if (!formValues.name?.trim()) {
            errors.name = "Tên cơ sở là bắt buộc";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const payload = {
            name: formValues.name.trim(),
            address: formValues.address?.trim() || "",
            phone: formValues.phone?.trim() || "",
        };

        if (editingCampus?.id) {
            updateCampusInState(editingCampus.id, payload);
            enqueueSnackbar("Cập nhật cơ sở thành công (frontend)", {variant: "success"});
        } else {
            addCampusToState(payload);
            enqueueSnackbar("Tạo cơ sở mới thành công (frontend)", {variant: "success"});
        }

        setDialogOpen(false);
    };

    const handleDelete = async (campus) => {
        if (!window.confirm(`Bạn chắc chắn muốn xóa cơ sở "${campus.name}"?`)) return;
        deleteCampusInState(campus.id);
        enqueueSnackbar("Xóa cơ sở thành công (frontend)", {variant: "success"});
    };

    return (
        <Box>
            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3}}>
                <Typography variant="h4" sx={{fontWeight: 700, color: "#1e293b"}}>
                    Quản Lý Cơ Sở
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={handleOpenCreate}
                    sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                    }}
                >
                    Thêm Cơ Sở
                </Button>
            </Box>

            <Card
                elevation={2}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e0e7ff",
                }}
            >
                <CardContent>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{bgcolor: "#f8fafc"}}>
                                    <TableCell sx={{fontWeight: 700, color: "#1e293b"}}>STT</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: "#1e293b"}}>Tên cơ sở</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: "#1e293b"}}>Địa chỉ</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: "#1e293b"}}>Số điện thoại</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: "#1e293b"}} align="right">
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {campuses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{py: 4}}>
                                            <Typography sx={{color: "#64748b"}}>
                                                "Chưa có cơ sở nào"
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    campuses.map((campus, index) => (
                                        <TableRow key={campus.id || index} hover>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{campus.name}</TableCell>
                                            <TableCell>{campus.address}</TableCell>
                                            <TableCell>{campus.phone}</TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleOpenEdit(campus)}
                                                    >
                                                        <EditIcon fontSize="small"/>
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDelete(campus)}
                                                    >
                                                        <DeleteIcon fontSize="small"/>
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    {editingCampus ? "Chỉnh sửa cơ sở" : "Thêm cơ sở mới"}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{mt: 0.5}}>
                        <Grid item xs={12}>
                            <TextField
                                label="Tên cơ sở"
                                name="name"
                                fullWidth
                                value={formValues.name}
                                onChange={handleChange}
                                error={!!formErrors.name}
                                helperText={formErrors.name}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Địa chỉ"
                                name="address"
                                fullWidth
                                value={formValues.address}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Số điện thoại"
                                name="phone"
                                fullWidth
                                value={formValues.phone}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2}}>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} variant="contained">
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

