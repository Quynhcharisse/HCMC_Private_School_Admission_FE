import React, {useRef} from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
} from "@mui/material";
import Draggable from "react-draggable";

const PaperComponent = (props) => {
    const nodeRef = useRef(null);

    return (
        <Draggable
            nodeRef={nodeRef}
            handle="#draggable-dialog-title"
            cancel={'[class*="MuiDialogContent-root"]'}
        >
            <Paper ref={nodeRef} {...props} />
        </Draggable>
    );
};

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
}) => {
    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onCancel}
            PaperComponent={PaperComponent}
            aria-labelledby="draggable-dialog-title"
            maxWidth="sm"
            fullWidth
            sx={{
                '& .MuiPaper-root': {
                    borderRadius: 3,
                    boxShadow:
                        '0 18px 45px rgba(15,23,42,0.28)',
                    border: '1px solid rgba(148,163,184,0.25)',
                    background:
                        'radial-gradient(circle at top left, #eff6ff 0, #ffffff 45%, #f9fafb 100%)',
                },
            }}
        >
            {title && (
                <DialogTitle
                    id="draggable-dialog-title"
                    sx={{
                        cursor: "move",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontSize: 18,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        pb: 1.5,
                    }}
                >
                    {title}
                </DialogTitle>
            )}
            {(description || extraDescription) && (
                <DialogContent sx={{pt: title ? 0 : 2}}>
                    {description && (
                        <DialogContentText sx={{fontSize: 14, color: "#0f172a", mb: extraDescription ? 0.5 : 0}}>
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
                    pb: 2.5,
                    pt: 1.5,
                    gap: 1.5,
                    justifyContent: "flex-end",
                    borderTop: "1px solid rgba(148,163,184,0.35)",
                    background:
                        "linear-gradient(to top, rgba(248,250,252,0.9), rgba(248,250,252,0.4))",
                }}
            >
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        borderRadius: 999,
                        px: 2.5,
                        color: "#0f172a",
                        "&:hover": {
                            backgroundColor: "rgba(148,163,184,0.18)",
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
                        borderRadius: 999,
                        boxShadow: "0 12px 22px rgba(37,99,235,0.35)",
                        background:
                            "linear-gradient(135deg, #2563eb, #4f46e5)",
                        "&:hover": {
                            background:
                                "linear-gradient(135deg, #1d4ed8, #4338ca)",
                            boxShadow: "0 16px 32px rgba(30,64,175,0.5)",
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

