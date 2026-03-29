const AXIOS_STATUS_MESSAGE = /^Request failed with status code \d+$/i;

/**
 * Lấy nội dung lỗi từ body response API; tránh hiển thị message mặc định của Axios.
 */
export function getApiErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
    const data = error?.response?.data;

    if (data != null && typeof data === 'object') {
        const raw = data.message ?? data.error ?? data.detail;
        if (Array.isArray(raw)) {
            const joined = raw.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean).join(', ');
            if (joined) {
                return joined;
            }
        } else if (typeof raw === 'string' && raw.trim()) {
            return raw.trim();
        }
        if (typeof data.body === 'string' && data.body.trim()) {
            return data.body.trim();
        }
        if (data.body && typeof data.body.message === 'string' && data.body.message.trim()) {
            return data.body.message.trim();
        }
    }

    const msg = error?.message;
    if (typeof msg === 'string' && msg.trim() && !AXIOS_STATUS_MESSAGE.test(msg.trim())) {
        return msg.trim();
    }

    return fallback;
}
