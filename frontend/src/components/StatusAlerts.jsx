import { useI18n } from "../context/I18nContext.jsx";

export default function StatusAlerts({ overdueStudents, onJumpToPayments }) {
  const { t, isArabic } = useI18n();

  if (!overdueStudents || overdueStudents.length === 0) {
    return (
      <div className="card flex items-center gap-3 border-l-4 border-emerald-500 bg-emerald-50">
        <span className="text-xl">✅</span>
        <p className="text-sm font-medium text-emerald-800">{t("noOverdue")}</p>
      </div>
    );
  }

  return (
    <div className="card border-l-4 border-red-500 bg-red-50">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚩</span>
          <h3 className="font-semibold text-red-800">
            {overdueStudents.length} {t("paymentsOverdue")}
          </h3>
        </div>
        <button onClick={onJumpToPayments} className="text-sm font-medium text-red-700 underline">
          {t("viewBillingLedger")}
        </button>
      </div>
      <ul className="space-y-1">
        {overdueStudents.slice(0, 5).map((s, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-red-700">
            <span>{s.student_name}</span>
            <span>{s.amount.toFixed(2)} MRU · {t("wasDue")} {s.due_date}</span>
          </li>
        ))}
        {overdueStudents.length > 5 && (
          <li className="text-xs text-red-500">+ {overdueStudents.length - 5} {isArabic ? "المزيد..." : "more..."}</li>
        )}
      </ul>
    </div>
  );
}
