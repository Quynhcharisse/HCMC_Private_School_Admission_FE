import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET facility template by schoolId
 * @param {{ schoolId: number | string }}
 */
export const getFacilityTemplate = async ({ schoolId }) => {
  try {
    const response = await axiosClient.get("/school/config/facility/template", {
      params: { schoolId: Number(schoolId) || schoolId },
    });
    return response || null;
  } catch (error) {
    // Khi BE trả 404 (chưa có cấu hình), FE coi như "chưa có data"
    // để không hiển thị lỗi cho người dùng.
    if (error?.response?.status === 404) {
      return { status: 404, data: { body: null } };
    }
    throw error;
  }
};

/**
 * POST upsert facility template by schoolId
 * - If `id` is provided -> update
 * - Otherwise -> create
 * @param {{
 *   schoolId: number | string,
 *   id?: number | string | null,
 *   overview: string,
 *   itemList: Array<{
 *     facilityCode: string,
 *     name: string,
 *     value: string | number,
 *     unit: string,
 *     category: string
 *   }>,
 *   imageJsonData: {
 *     coverUrl: string,
 *     itemList: Array<{
 *       url: string,
 *       name: string,
 *       altName: string,
 *       uploadDate: string,
 *       isUsage: boolean
 *     }>
 *   }
 * }}
 */
export const upsertFacilityTemplate = async ({ schoolId, id, overview, itemList, imageJsonData }) => {
  const payload = {
    ...(id != null && id !== "" ? { id: Number(id) || id } : {}),
    overview: overview ?? "",
    itemList: Array.isArray(itemList) ? itemList : [],
    imageJsonData: imageJsonData ?? { coverUrl: "", itemList: [] },
  };

  const response = await axiosClient.post("/school/config/facility/template", payload, {
    params: { schoolId: Number(schoolId) || schoolId },
  });

  return response || null;
};

