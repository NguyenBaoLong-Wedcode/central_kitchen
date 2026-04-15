import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";

const UnitsContext = createContext(null);

function groupUnitsByGroup(list) {
  const m = new Map();
  for (const u of list) {
    const g = (u.group && String(u.group).trim()) || "Khác";
    if (!m.has(g)) m.set(g, []);
    m.get(g).push(u);
  }
  return [...m.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "vi", { sensitivity: "base" }),
  );
}

/**
 * Master đơn vị tính: gọi GET /api/units một lần khi Provider mount.
 * — labelFor(code): hiển thị label, không in mã thô.
 * — baseGrouped / salesGrouped / allGrouped: optgroup cho &lt;select&gt;.
 */
export function UnitsProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getUnits();
        if (!cancelled) setUnits(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setUnits([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const labelMap = useMemo(() => {
    const map = new Map();
    for (const u of units) {
      const v = String(u.value ?? "").trim();
      if (!v) continue;
      const lbl = String(u.label ?? v).trim() || v;
      map.set(v, lbl);
      map.set(v.toUpperCase(), lbl);
    }
    return map;
  }, [units]);

  const labelFor = useCallback(
    (code) => {
      if (code == null) return "—";
      const s = String(code).trim();
      if (!s) return "—";
      return labelMap.get(s) ?? labelMap.get(s.toUpperCase()) ?? s;
    },
    [labelMap],
  );

  const baseUnits = useMemo(
    () => units.filter((u) => u.isBase === true),
    [units],
  );
  const salesUnits = useMemo(
    () => units.filter((u) => u.isSales === true),
    [units],
  );

  const baseGrouped = useMemo(
    () => groupUnitsByGroup(baseUnits),
    [baseUnits],
  );
  const salesGrouped = useMemo(
    () => groupUnitsByGroup(salesUnits),
    [salesUnits],
  );
  const allGrouped = useMemo(() => groupUnitsByGroup(units), [units]);

  const value = useMemo(
    () => ({
      units,
      loaded,
      labelFor,
      baseUnits,
      salesUnits,
      baseGrouped,
      salesGrouped,
      allGrouped,
      allUnits: units,
    }),
    [
      units,
      loaded,
      labelFor,
      baseUnits,
      salesUnits,
      baseGrouped,
      salesGrouped,
      allGrouped,
    ],
  );

  return (
    <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) {
    throw new Error("useUnits chỉ dùng bên trong UnitsProvider");
  }
  return ctx;
}
