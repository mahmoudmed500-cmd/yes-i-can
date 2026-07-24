import { useI18n } from "../context/I18nContext.jsx";

const APP_URL = "https://yes-i-can-kappa.vercel.app";

export default function ShareQR({ onClose }) {
  const { t, isArabic } = useI18n();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(APP_URL)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      alert(isArabic ? "تم النسخ!" : "Copied!");
    } catch {
      prompt("Copy this link:", APP_URL);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: "Yes I Can", url: APP_URL });
    } else {
      handleCopy();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ${isArabic ? "text-right" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold text-slate-800">
          {isArabic ? "شارك الرابط" : "Share the App"}
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          {isArabic
            ? "امسح الرمز أو شارك الرابط مع المعلمين والطلاب"
            : "Scan the code or share the link with teachers & students"}
        </p>

        <div className="flex justify-center mb-4">
          <img src={qrUrl} alt="QR Code" className="h-48 w-48 rounded-lg border border-slate-200" />
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-center">
          <p className="break-all text-xs text-slate-600">{APP_URL}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleCopy} className="btn-primary flex-1">
            {isArabic ? "نسخ الرابط" : "Copy Link"}
          </button>
          <button onClick={handleShare} className="btn-secondary flex-1">
            {isArabic ? "مشاركة" : "Share"}
          </button>
        </div>

        <button onClick={onClose} className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600">
          {t("close")}
        </button>
      </div>
    </div>
  );
}
