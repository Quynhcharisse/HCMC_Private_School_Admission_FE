import axiosClient from "../configs/APIConfig.jsx";

export const OFFLINE_CONSULTATION_STATUSES = [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
];

export async function getCounsellorOfflineConsultations(
  { status, page = 0, pageSize = 10 } = {},
  axiosConfig = {}
) {
  return axiosClient.get("/parent/consultation/offline", {
    params: {
      status,
      page,
      pageSize,
    },
    ...axiosConfig,
  });
}

export function parseOfflineConsultationsResponse(response) {
  const payload = response?.data?.body?.body ?? response?.data?.body ?? response?.data ?? {};
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload)
        ? payload
        : [];

  const totalItemsRaw = payload?.totalItems ?? payload?.totalElements ?? items.length;
  const totalItems = Number.isFinite(Number(totalItemsRaw)) ? Number(totalItemsRaw) : items.length;

  const totalPagesRaw = payload?.totalPages;
  const totalPages = Number.isFinite(Number(totalPagesRaw))
    ? Number(totalPagesRaw)
    : Math.max(1, Math.ceil(totalItems / Math.max(1, Number(payload?.pageSize) || items.length || 1)));

  const pageRaw = payload?.page ?? payload?.pageNumber ?? 0;
  const page = Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 0;

  return {
    items,
    page,
    totalPages: Math.max(1, totalPages),
    totalItems: Math.max(0, totalItems),
  };
}
