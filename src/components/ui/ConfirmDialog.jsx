import React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {alpha} from "@mui/material/styles";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export function ConfirmHighlight({children}) {
    return (
        <Box component="span" sx={{fontWeight: 700}}>
            {children}
        </Box>
    );
}

const ConfirmDialog = ({
    open,
    title,
    description,
    extraDescription,
    children,
    cancelText = "Hủy",
    confirmText = "Xác nhận",
    loading = false,
    onCancel,
    onConfirm,
    dialogSx,
    paperSx,
    backdropSx,
    titleSx,
    titleTextSx,
    contentSx,
    confirmButtonSx,
    warningIconWrapSx,
    warningIconSx,
}) => {
    const titleAccent = "#f59e0b";

    const handleDialogClose = (event, reason) => {
        if (loading) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
            return;
        }
        onCancel?.(event, reason);
    };

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
            disableEscapeKeyDown
            aria-labelledby="confirm-dialog-title"
            maxWidth="sm"
            fullWidth
            sx={{
                ...dialogSx,
                "& .MuiDialog-container": {
                    alignItems: "center",
                    justifyContent: "center",
                },
                "& .MuiBackdrop-root": {
                    backgroundColor: alpha("#0f172a", 0.36),
                    ...backdropSx,
                },
                '& .MuiPaper-root': {
                    borderRadius: 4,
                    boxShadow: "0 14px 28px rgba(15,23,42,0.14)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "#ffffff",
                    ...paperSx,
                },
            }}
        >
            <DialogTitle
                id="confirm-dialog-title"
                sx={{
                    cursor: "default",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "center",
                    gap: 1.2,
                    pt: 4.4,
                    pb: 0.5,
                    px: 3.5,
                    ...titleSx,
                }}
            >
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(245,158,11,0.12)",
                        mx: "auto",
                        ...warningIconWrapSx,
                    }}
                >
                    <WarningAmberRoundedIcon sx={{fontSize: 31, color: titleAccent, ...warningIconSx}} />
                </Box>
                <Box
                    component="span"
                    sx={{fontSize: 35, lineHeight: 1.1, fontWeight: 700, color: "#1f2937", ...titleTextSx}}
                >
                    {title || "Warning"}
                </Box>
            </DialogTitle>
            {(description || extraDescription || children != null) && (
                <DialogContent sx={{pt: 0.4, px: 4.5, pb: 1.2, textAlign: "center", ...contentSx}}>
                    {description && (
                        <DialogContentText
                            component="div"
                            sx={{
                                fontSize: 16,
                                fontWeight: 500,
                                color: "#6b7280",
                                mt: 0,
                                mb: extraDescription || children != null ? 0.5 : 0,
                                textAlign: "center",
                            }}
                        >
                            {description}
                        </DialogContentText>
                    )}
                    {extraDescription && (
                        <DialogContentText
                            component="div"
                            sx={{
                                fontSize: 16,
                                color: "#64748b",
                                mb: children != null ? 1.5 : 0,
                                textAlign: "center",
                            }}
                        >
                            {extraDescription}
                        </DialogContentText>
                    )}
                    {children != null && (
                        <Box
                            sx={{
                                mt: !description && !extraDescription ? (title ? 0.5 : 0) : 0,
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            {children}
                        </Box>
                    )}
                </DialogContent>
            )}
            <DialogActions
                sx={{
                    px: 3.6,
                    pb: 2.2,
                    pt: 1.4,
                    gap: 1.3,
                    justifyContent: "center",
                    borderTop: "none",
                    background: "#ffffff",
                }}
            >
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        borderRadius: 999,
                        px: 3.25,
                        minWidth: 162,
                        height: 46,
                        fontSize: 17,
                        fontWeight: 600,
                        color: "#1f2937",
                        border: "1px solid rgba(15,23,42,0.12)",
                        backgroundColor: "#f3f4f6",
                        "&:hover": {
                            backgroundColor: "#e5e7eb",
                            borderColor: "rgba(15,23,42,0.24)",
                        },
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={loading}
                    variant="contained"
                    color="primary"
                    sx={{
                        textTransform: "none",
                        px: 3.25,
                        minWidth: 162,
                        height: 46,
                        borderRadius: 999,
                        fontSize: 17,
                        fontWeight: 700,
                        boxShadow: "0 8px 18px rgba(245,158,11,0.36)",
                        background: "linear-gradient(135deg, #f7b14d 0%, #f59e0b 55%, #ea580c 100%)",
                        "&:hover": {
                            background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #c2410c 100%)",
                            boxShadow: "0 10px 20px rgba(234,88,12,0.45)",
                        },
                        ...confirmButtonSx,
                    }}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
