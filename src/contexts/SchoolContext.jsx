import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { extractCampusListBody, listCampuses } from "../services/CampusService.jsx";

/**
 * isPrimaryBranch = true  → Campus chính (full quyền)
 * isPrimaryBranch = false → Campus phụ (chỉ: tạo/xem counsellor, xem campus bản thân, xem admission plan)
 */
const SchoolContext = createContext({
  isPrimaryBranch: true,
  /** Campus đang đăng nhập (campus phụ: 1 campus trong list) — dùng cho API /campus/{id}/… */
  currentCampusId: null,
  loading: true,
  error: null,
});

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error("useSchool must be used within SchoolProvider");
  }
  return ctx;
}

export function SchoolProvider({ children }) {
  const [isPrimaryBranch, setIsPrimaryBranch] = useState(true);
  const [currentCampusId, setCurrentCampusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCampuses()
      .then((res) => {
        if (cancelled) return;
        const list = extractCampusListBody(res);
        if (res && res.status === 200 && Array.isArray(list)) {
          // Campus phụ: backend chỉ trả về 1 campus và isPrimaryBranch = false
          const singleCampus = list.length === 1 ? list[0] : null;
          const primary =
            singleCampus && singleCampus.isPrimaryBranch === false ? false : true;
          setIsPrimaryBranch(primary);
          if (!primary && singleCampus) {
            const rawId = singleCampus.id ?? singleCampus.campusId ?? singleCampus.campusID;
            const n = Number(rawId);
            setCurrentCampusId(Number.isFinite(n) ? n : rawId != null ? rawId : null);
          } else {
            setCurrentCampusId(null);
          }
        } else {
          setIsPrimaryBranch(true);
          setCurrentCampusId(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsPrimaryBranch(true);
          setCurrentCampusId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ isPrimaryBranch, currentCampusId, loading, error }),
    [isPrimaryBranch, currentCampusId, loading, error]
  );

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
}
