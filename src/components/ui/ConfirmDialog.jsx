import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {alpha} from "@mui/material/styles";

const ConfirmDialog = ({
    open,
    title,
    description,
    extraDescription,
    cancelText = "Hủy",
    confirmText = "Xác nhận",
    loading = false,
    onCancel,
    onConfirm,
    dialogSx,
    paperSx,
    backdropSx,
    titleSx,
}) => {
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
                "& .MuiBackdrop-root": {
                    backgroundColor: alpha("#0f172a", 0.45),
                    ...backdropSx,
                },
                '& .MuiPaper-root': {
                    borderRadius: 3,
                    boxShadow:
                        '0 18px 45px rgba(15,23,42,0.28)',
                    border: '1px solid rgba(148,163,184,0.25)',
                    background:
                        'radial-gradient(circle at top left, #eff6ff 0, #ffffff 45%, #f9fafb 100%)',
                    ...paperSx,
                },
            }}
        >
            {title && (
                <DialogTitle
                    id="confirm-dialog-title"
                    sx={{
                        cursor: "default",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontSize: 18,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        pt: 2,
                        pb: 2.1,
                        background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(79,70,229,0.08))",
                        borderBottom: "none",
                        ...titleSx,
                    }}
                >
                    {title}
                </DialogTitle>
            )}
            {(description || extraDescription) && (
                <DialogContent sx={{pt: title ? 3.4 : 2}}>
                    {description && (
                        <DialogContentText
                            sx={{
                                fontSize: 14,
                                color: "#0f172a",
                                mt: title ? 0.6 : 0,
                                mb: extraDescription ? 0.5 : 0,
                            }}
                        >
                            {description}
                        </DialogContentText>
                    )}
                    {extraDescription && (
                        <DialogContentText sx={{fontSize: 13, color: "#64748b"}}>
                            {extraDescription}
                        </DialogContentText>
                    )}
                </DialogContent>
            )}
            <DialogActions
                sx={{
                    px: 3,
                    pb: 2.2,
                    pt: 1.25,
                    gap: 1,
                    justifyContent: "flex-end",
                    borderTop: "none",
                    background:
                        "linear-gradient(to top, rgba(248,250,252,0.9), rgba(248,250,252,0.4))",
                }}
            >
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        borderRadius: 3,
                        px: 3,
                        minWidth: 120,
                        height: 40,
                        fontWeight: 500,
                        color: "#111827",
                        border: "1px solid rgba(17,24,39,0.45)",
                        backgroundColor: "#f8fafc",
                        "&:hover": {
                            backgroundColor: "#f1f5f9",
                            borderColor: "rgba(17,24,39,0.65)",
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
                        px: 3,
                        minWidth: 120,
                        height: 40,
                        borderRadius: 3,
                        fontWeight: 600,
                        boxShadow: "0 6px 14px rgba(37,99,235,0.32)",
                        background: "#3b82f6",
                        "&:hover": {
                            background: "#2563eb",
                            boxShadow: "0 8px 16px rgba(37,99,235,0.38)",
                        },
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
