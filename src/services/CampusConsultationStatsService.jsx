import axiosClient from "../configs/APIConfig.jsx";

export const getCampusConsultationStats = async ({ period, from, to } = {}) => {
    const params = {};
    if (period) params.period = period;
    if (from) params.from = from;
    if (to) params.to = to;
    return axiosClient.get("/campus/consultation/stats", { params });
};
