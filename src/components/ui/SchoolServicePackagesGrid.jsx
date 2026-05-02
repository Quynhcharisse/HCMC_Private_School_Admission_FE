import React from "react";
import { Box, Button, Card, Chip, CircularProgress, Typography } from "@mui/material";
import { CheckCircleOutline as CheckCircleOutlineIcon } from "@mui/icons-material";
import { BRAND_NAVY } from "../../constants/homeLandingTheme";
import {
    buildFeatureLines,
    formatVndPrice,
    getSupportLevelLabel,
    getSupportLevelRank,
    isSchoolPackageListable,
    normalizeSchoolServicePackageItem,
} from "../../utils/servicePackageDisplay";

export default function SchoolServicePackagesGrid({
    packages = [],
    loading = false,
    buyNowLoadingPackageId = null,
    onBuyNow,
    cardsVisible = true,
    showBuyButton = true,
}) {
    const getPackageTier = (supportLevel) => {
        const key = String(supportLevel || "").trim().toUpperCase();
        if (key === "BASIC" || key === "BASIC_SUPPORT") return "basic";
        if (key === "STANDARD" || key === "STANDARD_SUPPORT") return "standard";
        if (key === "ENTERPRISE" || key === "PREMIUM" || key === "PREMIUM_SUPPORT") return "enterprise";
        return "default";
    };

    const normalizedPackages = React.useMemo(
        () => (Array.isArray(packages) ? packages.map((p) => normalizeSchoolServicePackageItem(p)) : []),
        [packages]
    );

    const listablePackages = React.useMemo(
        () => normalizedPackages.filter((pkg) => isSchoolPackageListable(pkg)),
        [normalizedPackages]
    );

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!listablePackages.length) {
        return (
            <Typography sx={{ textAlign: "center", color: "#64748b", py: 3 }}>
                Chưa có gói dịch vụ đang hoạt động.
            </Typography>
        );
    }

    const sortedPackages = [...listablePackages].sort(
        (a, b) => getSupportLevelRank(a?.features?.supportLevel) - getSupportLevelRank(b?.features?.supportLevel)
    );
    const enterpriseIndex = sortedPackages.findIndex((pkg) => {
        const sl = String(pkg?.features?.supportLevel || "").toUpperCase();
        return sl === "ENTERPRISE" || sl === "PREMIUM";
    });
    const orderedPackages =
        enterpriseIndex > -1 && sortedPackages.length >= 3
            ? [
                  sortedPackages[(enterpriseIndex + 1) % sortedPackages.length],
                  sortedPackages[enterpriseIndex],
                  ...sortedPackages.filter(
                      (_, idx) => idx !== enterpriseIndex && idx !== (enterpriseIndex + 1) % sortedPackages.length
                  ),
              ]
            : sortedPackages;

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "minmax(0, 340px)",
                    sm: "repeat(auto-fit, minmax(300px, 340px))",
                },
                justifyContent: "center",
                gap: 3,
            }}
        >
            {orderedPackages.map((pkg, idx) => {
                const tier = getPackageTier(pkg?.features?.supportLevel);
                const isEnterprise = tier === "enterprise";
                const isStandard = tier === "standard";
                const isBasic = tier === "basic";
                const isHighlighted = isEnterprise || idx === 1;
                const tone = isEnterprise
                    ? {
                          border: "1px solid rgba(168,85,247,0.45)",
                          shadow: "0 24px 58px rgba(147,51,234,0.2)",
                          background: "linear-gradient(160deg, #f3e8ff 0%, #e9d5ff 55%, #ddd6fe 100%)",
                          color: "#7e22ce",
                          checkColor: "#db2777",
                      }
                    : isStandard
                      ? {
                            border: "1px solid rgba(59,130,246,0.4)",
                            shadow: "0 18px 42px rgba(37,99,235,0.14)",
                            background: "linear-gradient(165deg, #eff6ff 0%, #dbeafe 52%, #bfdbfe 100%)",
                            color: "#1d4ed8",
                            checkColor: "#0284c7",
                        }
                      : isBasic
                        ? {
                              border: "1px solid rgba(22,163,74,0.36)",
                              shadow: "0 16px 36px rgba(22,163,74,0.12)",
                              background: "linear-gradient(165deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
                              color: "#166534",
                              checkColor: "#15803d",
                          }
                        : {
                              border: "1px solid rgba(148,163,184,0.26)",
                              shadow: "0 16px 40px rgba(51,65,85,0.1)",
                              background: "#ffffff",
                              color: "#1e3a8a",
                              checkColor: "#16a34a",
                          };
                const featureLines = buildFeatureLines(pkg?.features || {}, pkg?.durationDays);
                return (
                    <Card
                        key={pkg?.id ?? `${pkg?.name}-${idx}`}
                        sx={{
                            borderRadius: 3,
                            border: tone.border,
                            boxShadow: tone.shadow,
                            background: tone.background,
                            color: "#0f172a",
                            p: 3,
                            minHeight: 470,
                            maxWidth: 340,
                            width: "100%",
                            mx: "auto",
                            display: "flex",
                            flexDirection: "column",
                            opacity: cardsVisible ? 1 : 0,
                            transform: cardsVisible ? "translateY(0px)" : "translateY(22px)",
                            transition: `opacity 0.65s ease ${idx * 120}ms, transform 0.65s ease ${idx * 120}ms`,
                            "&:hover": {
                                transform: "translateY(-8px)",
                                boxShadow: isHighlighted
                                    ? "0 30px 64px rgba(236,72,153,0.24)"
                                    : "0 24px 54px rgba(51,65,85,0.18)",
                            },
                        }}
                    >
                        <Box sx={{ textAlign: "center", mb: 2 }}>
                            <Typography sx={{ fontSize: { xs: "2rem", md: "2.2rem" }, fontWeight: 800, letterSpacing: 0.5 }}>
                                {formatVndPrice(pkg?.price)}
                            </Typography>
                            <Chip
                                label={getSupportLevelLabel(pkg?.features?.supportLevel)}
                                sx={{
                                    mt: 1.2,
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    bgcolor: "rgba(255,255,255,0.9)",
                                    color: tone.color,
                                }}
                            />
                        </Box>

                        <Box sx={{ mb: 2.25, textAlign: "center" }}>
                            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{pkg?.name || "Gói dịch vụ"}</Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.15, flex: 1 }}>
                            {featureLines.map((line) => (
                                <Box key={`${pkg?.id}-${line}`} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 18, mt: "2px", color: tone.checkColor }} />
                                    <Typography sx={{ fontSize: 14, lineHeight: 1.55 }}>{line}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {showBuyButton && typeof onBuyNow === "function" ? (
                            <Button
                                variant={isHighlighted ? "contained" : "outlined"}
                                disabled={buyNowLoadingPackageId != null}
                                onClick={() => onBuyNow(pkg)}
                                sx={{
                                    mt: 2.75,
                                    borderRadius: 999,
                                    textTransform: "none",
                                    fontWeight: 800,
                                    py: 1.1,
                                    borderColor: isHighlighted ? "rgba(126,34,206,0.35)" : "#cbd5e1",
                                    color: isHighlighted ? "#7e22ce" : BRAND_NAVY,
                                    bgcolor: "#ffffff",
                                    "&:hover": {
                                        bgcolor: "#f8fafc",
                                        borderColor: isHighlighted ? "#7e22ce" : BRAND_NAVY,
                                    },
                                }}
                            >
                                {buyNowLoadingPackageId === pkg?.id ? <CircularProgress size={22} color="inherit" /> : "Mua ngay"}
                            </Button>
                        ) : null}
                    </Card>
                );
            })}
        </Box>
    );
}
