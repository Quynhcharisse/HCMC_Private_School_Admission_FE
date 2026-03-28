/** Google CDN thường chặn ảnh nếu gửi Referer; bắt buộc cho `<img src>` hiển thị đúng. */
export const GOOGLE_AVATAR_IMG_PROPS = {referrerPolicy: 'no-referrer'};

/** URL ảnh đại diện từ Google (JWT `picture`), lưu sau đăng nhập trong `localStorage.user`. */
export function getStoredGooglePictureUrl() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const u = JSON.parse(raw);
        const url = u?.picture;
        return typeof url === 'string' && url.trim() ? url.trim() : null;
    } catch {
        return null;
    }
}
