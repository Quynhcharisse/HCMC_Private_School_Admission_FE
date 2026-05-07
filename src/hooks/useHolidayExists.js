import {useEffect, useState} from "react";
import {extractHolidayListBody, getHolidayList} from "../services/SchoolHolidayService.jsx";

/**
 * Hook kiểm tra trường đã cấu hình ít nhất một ngày nghỉ lễ chưa.
 * Dùng cho trang gán tư vấn viên để disable nút khi chưa có holiday.
 *
 * @returns {{ hasHoliday: boolean, loading: boolean }}
 */
export function useHolidayExists() {
    const [hasHoliday, setHasHoliday] = useState(true); // optimistic default — không block UI khi chưa load xong
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getHolidayList();
                if (cancelled) return;
                const rows = extractHolidayListBody(res);
                setHasHoliday(Array.isArray(rows) && rows.length > 0);
            } catch {
                if (!cancelled) setHasHoliday(true); // fail-open: không chặn nếu lỗi mạng
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return {hasHoliday, loading};
}
