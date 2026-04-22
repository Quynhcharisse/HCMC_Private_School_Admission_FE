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
    IconButton,
} from "@mui/material";
import {alpha} from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

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
    descriptionSx,
    confirmButtonSx,
    variant = "classic",
}) => {
    const isModern = variant === "modern";
    const titleFontSize = isModern ? 34 : 16;
    const bodyFontSize = isModern ? 16 : 15;

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
                    borderRadius: isModern ? 3 : 3,
                    boxShadow: isModern ? "0 20px 44px rgba(15,23,42,0.22)" : "0 16px 34px rgba(15,23,42,0.16)",
                    border: "1px solid #dbe5f3",
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
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: isModern ? "flex-start" : "space-between",
                    textAlign: "left",
                    gap: 1,
                    pt: isModern ? 1.7 : 1.25,
                    pb: isModern ? 1.55 : 1.15,
                    px: isModern ? 3.2 : 2.2,
                    bgcolor: isModern ? "#eef4ff" : "#dbeafe",
                    borderBottom: "1px solid #93c5fd",
                    ...titleSx,
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontSize: isModern ? 32 : 22,
                        lineHeight: 1.25,
                        fontWeight: 700,
                        color: "#1f2937",
                        ...(isModern ? {} : { letterSpacing: 0, fontSize: titleFontSize, lineHeight: 1.3 }),
                        ...titleTextSx
                    }}
                >
                    {title || "Warning"}
                </Box>
                {!isModern && (
                    <IconButton
                        onClick={onCancel}
                        disabled={loading}
                        size="small"
                        aria-label="Đóng"
                        sx={{
                            color: "#9ca3af",
                            p: 0.25,
                            "&:hover": { bgcolor: "transparent", color: "#6b7280" },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                )}
            </DialogTitle>
            {(description || extraDescription || children != null) && (
                <DialogContent
                    sx={{
                        pt: isModern ? 1.5 : 3.6,
                        px: 3.2,
                        pb: isModern ? 1.5 : 1.9,
                        textAlign: "left",
                        ...contentSx
                    }}
                >
                    {description && (
                        <DialogContentText
                            component="div"
                            sx={{
                                fontSize: bodyFontSize,
                                fontWeight: 500,
                                color: "#6b7280",
                                mt: isModern ? 0 : 0.35,
                                mb: extraDescription || children != null ? (isModern ? 0.6 : 1.05) : 0,
                                textAlign: "left",
                                ...descriptionSx,
                            }}
                        >
                            {description}
                        </DialogContentText>
                    )}
                    {extraDescription && (
                        <DialogContentText
                            component="div"
                            sx={{
                                fontSize: isModern ? 14 : 14,
                                color: "#6b7280",
                                mb: children != null ? 1.5 : 0,
                                textAlign: "left",
                                lineHeight: 1.55,
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
                    px: 3.2,
                    pb: 2.2,
                    pt: 0.7,
                    gap: 1.1,
                    justifyContent: "flex-end",
                    borderTop: "none",
                    background: "#ffffff",
                }}
            >
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        borderRadius: 1.9,
                        px: isModern ? 3.8 : 3.3,
                        minWidth: isModern ? 118 : 110,
                        height: isModern ? 48 : 42,
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#0f172a",
                        border: "1px solid rgba(15,23,42,0.12)",
                        backgroundColor: "#ffffff",
                        "&:hover": {
                            backgroundColor: "#f8fafc",
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
                        px: isModern ? 4.1 : 3.6,
                        minWidth: isModern ? 142 : 128,
                        height: isModern ? 48 : 42,
                        borderRadius: 1.9,
                        fontSize: 15,
                        fontWeight: 700,
                        boxShadow: "0 6px 16px rgba(37,99,235,0.42)",
                        background: "#3b82f6",
                        "&:hover": {
                            background: "#2563eb",
                            boxShadow: "0 8px 18px rgba(37,99,235,0.48)",
                        },
                        "&.Mui-disabled": {
                            color: "#e2e8f0",
                            background: "#93c5fd",
                            boxShadow: "none",
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
