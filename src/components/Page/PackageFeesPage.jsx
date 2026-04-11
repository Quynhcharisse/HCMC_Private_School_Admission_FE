import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { BRAND_NAVY } from "../../constants/homeLandingTheme";
import { getAdminPackageFees } from "../../services/AdminService.jsx";
import { createSchoolSubscriptionPayment } from "../../services/SchoolSubscriptionService.jsx";
import { normalizeUserRole } from "../../utils/userRole.js";
import SchoolServicePackagesGrid from "../ui/SchoolServicePackagesGrid.jsx";

const LAYOUT_HEADER_TOP_PX = { xs: "calc(72px + 24px)", md: "calc(80px + 32px)" };

function readSchoolRoleFromStorage() {
    try {
        if (typeof window === "undefined") return false;
        const raw = localStorage.getItem("user");
        if (!raw) return false;
        const user = JSON.parse(raw);
        return normalizeUserRole(user.role ?? "") === "SCHOOL";
    } catch {
        return false;
    }
}

export default function PackageFeesPage() {
    const [isSchoolRole, setIsSchoolRole] = React.useState(() => readSchoolRoleFromStorage());
    const [schoolServicePackages, setSchoolServicePackages] = React.useState([]);
    const [servicePackagesLoading, setServicePackagesLoading] = React.useState(false);
    const [buyNowLoadingPackageId, setBuyNowLoadingPackageId] = React.useState(null);

    React.useEffect(() => {
        const sync = () => setIsSchoolRole(readSchoolRoleFromStorage());
        sync();
        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    React.useEffect(() => {
        if (!isSchoolRole) {
            setSchoolServicePackages([]);
            return;
        }

        let cancelled = false;
        (async () => {
            setServicePackagesLoading(true);
            try {
                const res = await getAdminPackageFees();
                const raw = Array.isArray(res?.data?.body) ? res.data.body : [];
                const activePackages = raw.filter(
                    (item) => String(item?.status || "").trim().toUpperCase() === "PACKAGE_ACTIVE"
                );
                if (!cancelled) setSchoolServicePackages(activePackages);
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setSchoolServicePackages([]);
                    enqueueSnackbar("Không thể tải danh sách gói dịch vụ.", { variant: "error" });
                }
            } finally {
                if (!cancelled) setServicePackagesLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isSchoolRole]);

    const handleSchoolPackageBuyNow = React.useCallback(async (pkg) => {
        const packageId = Number(pkg?.id);
        if (!Number.isFinite(packageId) || packageId <= 0) {
            enqueueSnackbar("Không xác định được gói dịch vụ.", { variant: "error" });
            return;
        }
        const description = pkg?.name?.trim() ? `Thanh toán gói ${pkg.name.trim()}` : "Thanh toán gói dịch vụ";
        setBuyNowLoadingPackageId(packageId);
        try {
            const res = await createSchoolSubscriptionPayment({ packageId, description });
            const paymentUrl = res?.data?.body;
            if (typeof paymentUrl === "string" && /^https?:\/\//i.test(paymentUrl.trim())) {
                const url = paymentUrl.trim();
                const w = window.open(url, "_blank");
                if (w) {
                    try {
                        w.opener = null;
                    } catch {
                    }
                } else {
                    enqueueSnackbar("Không mở được tab mới. Đang chuyển trong tab hiện tại.", { variant: "warning" });
                    window.location.assign(url);
                }
                return;
            }
            enqueueSnackbar(
                typeof res?.data?.message === "string" ? res.data.message : "Không nhận được liên kết thanh toán.",
                { variant: "warning" }
            );
        } catch (error) {
            const raw = error?.response?.data?.message ?? error?.response?.data?.body ?? error?.message;
            const msg = typeof raw === "string" ? raw : "Không thể tạo liên kết thanh toán.";
            enqueueSnackbar(msg, { variant: "error" });
        } finally {
            setBuyNowLoadingPackageId(null);
        }
    }, []);

    return (
        <Box
            sx={{
                position: "relative",
                zIndex: 1,
                minHeight: "60vh",
                pt: LAYOUT_HEADER_TOP_PX,
                pb: { xs: 5, md: 7 },
                background: "linear-gradient(180deg, #f8fafc 0%, #f0f9ff 100%)",
            }}
        >
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                <Typography
                    variant="h4"
                    sx={{
                        textAlign: "center",
                        fontWeight: 800,
                        color: BRAND_NAVY,
                        mb: 1,
                        fontSize: { xs: "1.6rem", md: "2rem" },
                    }}
                >
                    Các gói dịch vụ
                </Typography>
                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#64748b",
                        fontSize: { xs: "0.95rem", md: "1rem" },
                        mb: 4,
                    }}
                >
                    Lựa chọn gói phù hợp để tăng hiệu quả tuyển sinh cho trường của bạn.
                </Typography>

                {!isSchoolRole ? (
                    <Typography sx={{ textAlign: "center", color: "#64748b", py: 2, maxWidth: 520, mx: "auto" }}>
                        Vui lòng đăng nhập bằng tài khoản nhà trường để xem và mua gói dịch vụ.
                    </Typography>
                ) : (
                    <SchoolServicePackagesGrid
                        packages={schoolServicePackages}
                        loading={servicePackagesLoading}
                        buyNowLoadingPackageId={buyNowLoadingPackageId}
                        onBuyNow={handleSchoolPackageBuyNow}
                        cardsVisible
                    />
                )}
            </Container>
        </Box>
    );
}
