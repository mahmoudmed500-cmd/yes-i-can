import { useMemo, useState } from "react";

import { useI18n } from "../context/I18nContext.jsx";

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 48;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const TEACHER_COLORS = [
  "bg-brand-100 border-brand-400 text-brand-800",
  "bg-emerald-100 border-emerald-400 text-emerald-800",
  "bg-amber-100 border-amber-400 text-amber-800",
  "bg-purple-100 border-purple-400 text-purple-800",
  "bg-pink-100 border-pink-400 text-pink-800",
  "bg-cyan-100 border-cyan-400 text-cyan-800",
];

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function colorForTeacher(teacherId) {
  return TEACHER_COLORS[teacherId % TEACHER_COLORS.length];
}

export default function CalendarGrid({ schedules, onQuickAction }) {
  const { t, isArabic } = useI18n();
  const [openMenuId, setOpenMenuId] = useState(null);

  const DAYS = [t("monday"), t("tuesday"), t("wednesday"), t("thursday"), t("friday"), t("saturday"), t("sunday")];

  const byDay = useMemo(() => {
    const map = Array.from({ length: 7 }, () => []);
    for (const s of schedules) {
      if (s.day_of_week >= 0 && s.day_of_week <= 6) map[s.day_of_week].push(s);
    }
    return map;
  }, [schedules]);

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="card overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{t("weeklyTimetable")}</h2>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> {t("oneOffHint")}
          </span>
        </div>
      </div>

      <div className="flex min-w-[900px]">
        <div className="w-14 shrink-0 pt-6">
          {hourMarks.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative text-right text-xs text-slate-400">
              <span className="absolute -top-2 right-2">{h}:00</span>
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 gap-2">
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="min-w-[110px]">
              <div className="mb-1 rounded-md bg-slate-100 py-1 text-center text-xs font-semibold text-slate-600">
                {day}
              </div>
              <div className="relative border-l border-slate-100" style={{ height: TOTAL_HEIGHT }}>
                {hourMarks.slice(0, -1).map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {byDay[dayIdx].map((s) => {
                  const top = (toMinutes(s.start_time) - START_HOUR * 60) / 60 * HOUR_HEIGHT;
                  const height = Math.max(
                    ((toMinutes(s.end_time) - toMinutes(s.start_time)) / 60) * HOUR_HEIGHT,
                    28
                  );
                  const colorClass = colorForTeacher(s.teacher_id);
                  return (
                    <div
                      key={s.id}
                      className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-sm ${colorClass}`}
                      style={{ top, height }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold">
                          {!s.is_recurring && "✦ "}
                          {s.class_name}
                        </p>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                          className="rounded px-1 text-slate-500 hover:bg-white/60"
                          title="Quick actions"
                        >
                          ⋮
                        </button>
                      </div>
                      <p className="truncate">{s.teacher_name}</p>
                      <p className="truncate opacity-80">{s.group_name} · {s.classroom_name}</p>
                      <p className="opacity-80">{s.start_time}–{s.end_time}</p>

                      {openMenuId === s.id && (
                        <div className={`absolute top-full z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 text-slate-700 shadow-lg ${isArabic ? "right-0" : "left-0"}`}>
                          <button
                            onClick={() => { setOpenMenuId(null); onQuickAction("reschedule", s); }}
                            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-50"
                          >
                            📅 {t("reschedule")}
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onQuickAction("edit", s); }}
                            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-50"
                          >
                            ✏️ {t("editDetails")}
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onQuickAction("delete", s); }}
                            className="block w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
                          >
                            🗑️ {t("cancelClass")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
