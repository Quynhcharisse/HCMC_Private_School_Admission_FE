import axiosClient from "../configs/APIConfig.jsx";

const parseJsonSafely = (value) => {
	if (value == null) return null;
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
};

const pickResponseBody = (response) => {
	const data = response?.data;
	if (data == null) return null;

	let body = data?.body ?? data;
	body = parseJsonSafely(body) ?? body;

	if (body && typeof body === "object" && !Array.isArray(body) && body.body != null) {
		const inner = parseJsonSafely(body.body) ?? body.body;
		if (inner != null) {
			body = inner;
		}
	}

	return body ?? null;
};

/**
 * GET /school/parents
 * Danh sách phụ huynh đã thêm trường vào yêu thích (dành cho SCHOOL campus chính).
 */
export async function getSchoolFavouriteParents() {
	const response = await axiosClient.get("/school/parents");
	const body = pickResponseBody(response);
	return Array.isArray(body) ? body : [];
}

/**
 * GET /parent/student/{id}
 * Chi tiết hồ sơ học sinh (student profile + academic profile).
 */
export async function getParentStudentDetailById(studentId) {
	const id = studentId != null ? String(studentId).trim() : "";
	if (!id) {
		throw new Error("studentId is required");
	}

	const response = await axiosClient.get(`/parent/student/${encodeURIComponent(id)}`);
	const body = pickResponseBody(response);
	return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

