import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET facility template by schoolId
 * @param {{ schoolId: number | string }}
 */
export const getFacilityTemplate = async ({ schoolId }) => {
  const response = await axiosClient.get("/school/config/facility/template", {
    params: { schoolId: Number(schoolId) || schoolId },
  });
  return response || null;
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

