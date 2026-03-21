import React from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";

/**
 * Route cũ: chỉ tiêu được quản lý tại trang chi tiết chiến dịch (chuyển hướng tự động).
 */
export default function SchoolCampaignOfferings() {
    const { campaignId } = useParams();
    const location = useLocation();
    if (!campaignId) {
        return <Navigate to="/school/campaigns" replace />;
    }
    return (
        <Navigate
            to={`/school/campaigns/detail/${campaignId}`}
            replace
            state={location.state}
        />
    );
}
