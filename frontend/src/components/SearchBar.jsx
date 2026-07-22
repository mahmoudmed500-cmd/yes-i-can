import { useEffect, useRef, useState } from "react";

import { api } from "../api.js";
import { useI18n } from "../context/I18nContext.jsx";

export default function SearchBar() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await api.search(q.trim());
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative w-full max-w-sm" ref={boxRef}>
      <input
        className="input-field"
        placeholder={t("search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{r.full_name}</p>
                <p className="text-xs text-slate-500">
                  {r.role === "teacher" ? r.specialty || t("teachers") : r.level || t("students")}
                </p>
              </div>
              <span
                className={`badge ${
                  r.role === "teacher" ? "bg-brand-100 text-brand-700" : "bg-purple-100 text-purple-700"
                }`}
              >
                {t(r.role === "teacher" ? "teachers" : "students")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
