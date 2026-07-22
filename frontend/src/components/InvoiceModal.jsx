import { useState } from "react";

import { useI18n } from "../context/I18nContext.jsx";

export default function InvoiceModal({ students, onClose, onSave }) {
  const { t, isArabic } = useI18n();
  const [form, setForm] = useState({
    student_id: students[0]?.id || "",
    amount: "",
    due_date: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        student_id: Number(form.student_id),
        amount: Number(form.amount),
        due_date: form.due_date,
        note: form.note || undefined,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full max-w-md rounded-xl bg-white p-6 shadow-xl ${isArabic ? "text-right" : ""}`}>
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{t("newInvoice").replace("+ ", "")}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? "الطالب" : "Student"}</label>
            <select className="input-field" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
              {students.map((s) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("tuitionAmount")}</label>
            <input type="number" step="0.01" min="0" className="input-field" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("dueDate")}</label>
            <input type="date" className="input-field" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("note")}</label>
            <input className="input-field" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder={isArabic ? "مثال: شهر يوليو" : "e.g. July tuition"} />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? t("saving") : t("createInvoice")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
