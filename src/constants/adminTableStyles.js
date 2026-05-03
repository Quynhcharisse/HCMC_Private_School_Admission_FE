import { APP_PRIMARY_MAIN } from "./homeLandingTheme.js";

export const adminSttChipSx = {
    height: 28,
    minWidth: 28,
    width: "fit-content",
    maxWidth: 52,
    boxSizing: "border-box",
    borderRadius: "14px",
    fontWeight: 700,
    bgcolor: "rgba(37,99,235,0.18)",
    color: APP_PRIMARY_MAIN,
    border: "1px solid rgba(96,165,250,0.35)",
    "& .MuiChip-label": {
        px: 0.5,
        fontWeight: 700,
        fontSize: 12,
        lineHeight: 1.15,
    },
};

export const adminTableContainerSx = {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    bgcolor: "#ffffff",
    border: "1px solid #bfdbfe",
    borderRadius: 3,
    boxShadow: "0 4px 18px rgba(37, 99, 235, 0.07)",
};

export const adminTableHeadRowSx = {
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
};

export const adminTableHeadCellSx = {
    fontWeight: 700,
    color: "#1e40af",
    borderBottom: "2px solid #93c5fd",
    textAlign: "center",
};

export const adminTableBodyRowSx = {
    "& td": { borderBottomColor: "#dbeafe", color: "#334155" },
    "&:hover": { bgcolor: "#f0f9ff" },
};

export const adminDataCardBorderSx = {
    border: "1px solid #bfdbfe",
};
