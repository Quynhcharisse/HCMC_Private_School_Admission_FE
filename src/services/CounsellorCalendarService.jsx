import axiosClient from "../configs/APIConfig.jsx";

export const getCounsellorCalendar = async ({ startDate, endDate }) => {
  const response = await axiosClient.get("/counsellor/calendar", {
    params: {
      startDate,
      endDate,
    },
  });
  return response || null;
};

export const parseCounsellorCalendarBody = (response) => {
  const payload = response?.data?.body ?? response?.data ?? {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.body)) return payload.body;
  return [];
};
