import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { extractCampusListBody, listCampuses } from "../services/CampusService.jsx";

/**
 * isPrimaryBranch = true  → Campus chính (full quyền)
 * isPrimaryBranch = false → Campus phụ (chỉ: tạo/xem counsellor, xem campus bản thân, xem admission plan)
 */
const SchoolContext = createContext({
  isPrimaryBranch: true,
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
        } else {
          setIsPrimaryBranch(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsPrimaryBranch(true);
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
    () => ({ isPrimaryBranch, loading, error }),
    [isPrimaryBranch, loading, error]
  );

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
}
