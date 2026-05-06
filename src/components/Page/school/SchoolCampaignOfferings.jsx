import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import AddIcon from "@mui/icons-material/Add";
import { enqueueSnackbar } from "notistack";
import { getCampaignTemplatesByYear } from "../../../services/CampaignService.jsx";
import CampaignOfferingsSection from "./CampaignOfferingsSection.jsx";

function normalizeCampaignStatus(rawStatus) {
    const s = String(rawStatus || "").trim().toUpperCase();
    if (!s) return "DRAFT";
    if (s === "OPEN" || s === "OPEN_ADMISSION_CAMPAIGN") return "OPEN";
    if (s === "CANCELLED" || s === "CANCELLED_ADMISSION_CAMPAIGN") return "CANCELLED";
    if (s === "DRAFT" || s === "DRAFT_ADMISSION_CAMPAIGN") return "DRAFT";
    return s;
}

function mapTemplate(row) {
    if (!row) return null;
    const id = Number(row.admissionCampaignTemplateId ?? row.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
        id,
        name: String(row.name ?? "").trim() || `Chiến dịch #${id}`,
        year: Number(row.year) || new Date().getFullYear(),
        status: normalizeCampaignStatus(row.status),
        admissionMethodTimelines: Array.isArray(row.admissionMethodTimelines) ? row.admissionMethodTimelines : [],
    };
}

export default function SchoolCampaignOfferings() {
    const { campaignId: campaignIdFromPath } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreateSignal, setOpenCreateSignal] = useState(0);
    const currentYear = new Date().getFullYear();

    const selectedCampaignIdRaw = searchParams.get("campaignId") ?? campaignIdFromPath ?? "";
    const selectedCampaignId = Number(selectedCampaignIdRaw);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([getCampaignTemplatesByYear(currentYear), getCampaignTemplatesByYear(currentYear - 1)])
            .then((responses) => {
                if (cancelled) return;
                const all = [];
                for (const res of responses) {
                    const raw = res?.data?.body ?? res?.data;
                    const rows = Array.isArray(raw)
                        ? raw
                        : Array.isArray(raw?.campaigns)
                          ? raw.campaigns
                          : raw
                            ? [raw]
                            : [];
                    for (const r of rows) all.push(r);
                }
                const mapped = all.map(mapTemplate).filter(Boolean);
                const byId = new Map();
                for (const c of mapped) if (!byId.has(c.id)) byId.set(c.id, c);
                const sorted = [...byId.values()].sort((a, b) => b.year - a.year || b.id - a.id);
                setCampaigns(sorted);
            })
            .catch((err) => {
                if (cancelled) return;
                enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", { variant: "error" });
                setCampaigns([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [currentYear]);

    useEffect(() => {
        if (campaigns.length === 0) return;
        if (Number.isFinite(selectedCampaignId) && selectedCampaignId > 0 && campaigns.some((c) => c.id === selectedCampaignId)) {
            return;
        }
        const first = campaigns[0];
        setSearchParams({ campaignId: String(first.id) }, { replace: true });
    }, [campaigns, selectedCampaignId, setSearchParams]);

    const selectedCampaign = useMemo(
        () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
        [campaigns, selectedCampaignId]
    );

    const canMutateOfferings =
        selectedCampaign != null && selectedCampaign.status === "OPEN";

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                width: "100%",
                pb: 4,
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
            }}
        >
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <CampaignIcon sx={{ fontSize: 30, opacity: 0.95 }} />
                        <Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                    fontSize: { xs: "1.5rem", sm: "2rem" },
                                }}
                            >
                                Chỉ tiêu tuyển sinh
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                                Quản lý chỉ tiêu theo từng chiến dịch và cơ sở.
                            </Typography>
                        </Box>
                    </Stack>
                    {canMutateOfferings && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenCreateSignal((n) => n + 1)}
                            sx={{
                                bgcolor: "rgba(255,255,255,0.95)",
                                color: "#0D64DE",
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 2.5,
                                py: 1.1,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                alignSelf: { xs: "stretch", sm: "auto" },
                                "&:hover": {
                                    bgcolor: "white",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                },
                            }}
                        >
                            Thêm chỉ tiêu
                        </Button>
                    )}
                </Box>
            </Box>

            {selectedCampaign ? (
                <CampaignOfferingsSection
                    campaignId={selectedCampaign.id}
                    campaignPaused={selectedCampaign.status !== "OPEN"}
                    canMutate={canMutateOfferings}
                    selectedCampaign={selectedCampaign}
                    campaignOptions={campaigns}
                    selectedCampaignId={selectedCampaign.id}
                    onCampaignChange={(id) => setSearchParams({ campaignId: id })}
                    campaignOptionsLoading={loading || campaigns.length === 0}
                    openCreateSignal={openCreateSignal}
                />
            ) : (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                    }}
                >
                    <CardContent>
                        <Typography color="text.secondary">Chưa có chiến dịch để hiển thị chỉ tiêu.</Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
