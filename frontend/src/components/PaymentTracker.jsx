import { useState } from "react";

import { useI18n } from "../context/I18nContext.jsx";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["paid", "pending", "overdue"];

export default function PaymentTracker({ invoices, onStatusChange, onNewInvoice, onDelete }) {
  const { t, isArabic } = useI18n();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">{t("billingLedger")}</h2>
        <div className="flex items-center gap-2">
          <select
            className="input-field !w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="paid">{t("paid")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="overdue">{t("overdue")}</option>
          </select>
          <button className="btn-primary" onClick={onNewInvoice}>
            {t("newInvoice")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">{isArabic ? "الطالب" : "Student"}</th>
              <th className="py-2 pr-4">{t("tuitionAmount").replace(" (MRU)", "")}</th>
              <th className="py-2 pr-4">{t("dueDate")}</th>
              <th className="py-2 pr-4">{isArabic ? "الحالة" : "Status"}</th>
              <th className="py-2 pr-4">{isArabic ? "تاريخ الاستلام" : "Date received"}</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium text-slate-800">
                  {inv.status === "overdue" && <span className="mr-1" title="Overdue">🚩</span>}
                  {inv.student_name}
                </td>
                <td className="py-2 pr-4">{inv.amount.toFixed(2)} MRU</td>
                <td className="py-2 pr-4">{inv.due_date}</td>
                <td className="py-2 pr-4">
                  <span className={`badge ${STATUS_STYLES[inv.status]}`}>{t(inv.status)}</span>
                </td>
                <td className="py-2 pr-4 text-slate-500">{inv.date_received || "—"}</td>
                <td className="relative py-2 pr-2 text-right">
                  <button
                    className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                  >
                    ⋮
                  </button>
                  {openMenuId === inv.id && (
                    <div className={`absolute top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-lg ${isArabic ? "right-2" : "left-auto right-2"}`}>
                      <p className="px-2 py-1 text-xs font-semibold text-slate-400">{t("markAs")}</p>
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setOpenMenuId(null); onStatusChange(inv.id, s); }}
                          disabled={s === inv.status}
                          className="block w-full rounded px-2 py-1 text-left text-sm capitalize hover:bg-slate-50 disabled:text-slate-300"
                        >
                          {t(s)}
                        </button>
                      ))}
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setOpenMenuId(null); onDelete(inv.id); }}
                        className="block w-full rounded px-2 py-1 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        {t("deleteInvoice")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  {t("noInvoices")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
