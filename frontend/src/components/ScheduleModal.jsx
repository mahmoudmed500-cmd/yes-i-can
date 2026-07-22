import { useEffect, useState } from "react";

import { useI18n } from "../context/I18nContext.jsx";

const DAY_OPTIONS_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function ScheduleModal({ mode, initial, teachers, classrooms, groups, onClose, onSave }) {
  const { t, isArabic } = useI18n();
  const isReschedule = mode === "reschedule";
  const [form, setForm] = useState({
    class_name: initial?.class_name || "",
    teacher_id: initial?.teacher_id || teachers[0]?.id || "",
    classroom_id: initial?.classroom_id || classrooms[0]?.id || "",
    group_id: initial?.group_id || groups[0]?.id || "",
    is_recurring: initial?.is_recurring ?? true,
    day_of_week: initial?.day_of_week ?? 0,
    specific_date: initial?.specific_date || "",
    start_time: initial?.start_time || "09:00",
    end_time: initial?.end_time || "10:00",
  });
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setError(""); setConflicts([]); }, [form]);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setConflicts([]);
    try {
      const payload = {
        class_name: form.class_name,
        teacher_id: Number(form.teacher_id),
        classroom_id: Number(form.classroom_id),
        group_id: Number(form.group_id),
        is_recurring: form.is_recurring,
        day_of_week: form.is_recurring ? Number(form.day_of_week) : undefined,
        specific_date: !form.is_recurring ? form.specific_date : undefined,
        start_time: form.start_time,
        end_time: form.end_time,
      };
      await onSave(payload);
    } catch (err) {
      if (err.status === 409) {
        const raw = err.rawDetail;
        if (raw && typeof raw === "object") {
          setConflicts(raw.conflicts || []);
          setError(raw.message || "Scheduling conflict");
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl ${isArabic ? "text-right" : ""}`}>
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          {isReschedule ? t("rescheduleClass") : mode === "edit" ? t("editClass") : t("newClass")}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("className")}</label>
            <input className="input-field" value={form.class_name} onChange={(e) => update("class_name", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("teacher")}</label>
              <select className="input-field" value={form.teacher_id} onChange={(e) => update("teacher_id", e.target.value)}>
                {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("classroom")}</label>
              <select className="input-field" value={form.classroom_id} onChange={(e) => update("classroom_id", e.target.value)}>
                {classrooms.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("studentGroup")}</label>
            <select className="input-field" value={form.group_id} onChange={(e) => update("group_id", e.target.value)}>
              {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" checked={form.is_recurring} onChange={() => update("is_recurring", true)} />
              {t("recurringWeekly")}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" checked={!form.is_recurring} onChange={() => update("is_recurring", false)} />
              {t("oneOffSession")}
            </label>
          </div>

          {form.is_recurring ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("dayOfWeek")}</label>
              <select className="input-field" value={form.day_of_week} onChange={(e) => update("day_of_week", e.target.value)}>
                {DAY_OPTIONS_KEYS.map((key, i) => (<option key={i} value={i}>{t(key)}</option>))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("date")}</label>
              <input type="date" className="input-field" value={form.specific_date} onChange={(e) => update("specific_date", e.target.value)} required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("startTime")}</label>
              <input type="time" className="input-field" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("endTime")}</label>
              <input type="time" className="input-field" value={form.end_time} onChange={(e) => update("end_time", e.target.value)} required />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">{error}</p>
              {conflicts.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {conflicts.map((c, i) => (<li key={i}>{c}</li>))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? t("saving") : t("saveClass")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
