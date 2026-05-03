import axiosClient from "../configs/APIConfig.jsx";

export const OFFLINE_CONSULTATION_STATUSES = [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
];

export async function getParentOfflineConsultations(
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
  const payload = response?.data?.body ?? response?.data ?? {};
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload)
        ? payload
        : [];

  const totalItemsRaw = payload?.totalItems ?? payload?.totalElements ?? items.length;
  const totalItems = Number.isFinite(Number(totalItemsRaw)) ? Number(totalItemsRaw) : items.length;

  const pageSizeNum = Number(payload?.pageSize);
  const safePageSize = Number.isFinite(pageSizeNum) && pageSizeNum > 0 ? pageSizeNum : 10;

  const totalPagesRaw = payload?.totalPages;
  const totalPages = Number.isFinite(Number(totalPagesRaw))
    ? Number(totalPagesRaw)
    : Math.max(0, Math.ceil(totalItems / safePageSize));

  const pageRaw = payload?.currentPage ?? payload?.page ?? payload?.pageNumber ?? 0;
  const page = Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 0;

  return {
    items,
    page,
    totalPages: totalPages > 0 ? totalPages : totalItems > 0 ? 1 : 0,
    totalItems: Math.max(0, totalItems),
  };
}
