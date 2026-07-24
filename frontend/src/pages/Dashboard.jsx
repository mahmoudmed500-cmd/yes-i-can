import { useEffect, useState } from "react";

import { api } from "../api.js";
import CalendarGrid from "../components/CalendarGrid.jsx";
import ClassReminders from "../components/ClassReminders.jsx";
import GroupChat from "../components/GroupChat.jsx";
import InvoiceModal from "../components/InvoiceModal.jsx";
import PaymentTracker from "../components/PaymentTracker.jsx";
import ScheduleModal from "../components/ScheduleModal.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ShareQR from "../components/ShareQR.jsx";
import StatusAlerts from "../components/StatusAlerts.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import UsersPage from "./UsersPage.jsx";

const TABS = [
  { id: "calendar", key: "schedule", icon: "🗓️" },
  { id: "chat", key: "groupChat", icon: "💬" },
  { id: "payments", key: "payments", icon: "💳" },
  { id: "directory", key: "directory", icon: "👥" },
];

function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setDeferred(e);
      setShowBanner(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShowBanner(false);
  }

  return { showBanner, install, dismiss: () => setShowBanner(false) };
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang, isArabic } = useI18n();
  const isAdmin = user.role === "admin";
  const { showBanner, install, dismiss } = useInstallPrompt();

  const [tab, setTab] = useState("calendar");
  const [summary, setSummary] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState([]);

  const [scheduleModal, setScheduleModal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showShareQR, setShowShareQR] = useState(false);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    try {
      setLoadError("");
      const [sched, inv, allUsers, rooms, grps] = await Promise.all([
        api.listSchedules(),
        isAdmin || user.role === "student" ? api.listInvoices() : Promise.resolve([]),
        api.listUsers(),
        api.listClassrooms(),
        api.listGroups(),
      ]);
      setSchedules(sched);
      setInvoices(inv);
      setTeachers(allUsers.filter((u) => u.role === "teacher"));
      setStudents(allUsers.filter((u) => u.role === "student"));
      setClassrooms(rooms);
      setGroups(grps);
      if (isAdmin) setSummary(await api.dashboardSummary());
    } catch (err) {
      setLoadError(err.message || t("failedToLoad"));
    }
  }

  useEffect(() => { loadAll(); }, []);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleQuickAction(action, schedule) {
    if (action === "delete") {
      if (confirm(`${t("cancelClass")} "${schedule.class_name}"?`)) {
        await api.deleteSchedule(schedule.id);
        flash(t("classCancelled"));
        loadAll();
      }
      return;
    }
    setScheduleModal({ mode: action, initial: schedule });
  }

  async function handleScheduleSave(payload) {
    if (scheduleModal.initial) {
      await api.updateSchedule(scheduleModal.initial.id, payload);
      flash(t("classUpdated"));
    } else {
      await api.createSchedule(payload);
      flash(t("classScheduled"));
    }
    setScheduleModal(null);
    loadAll();
  }

  async function handleInvoiceStatusChange(id, status) {
    await api.updateInvoiceStatus(id, { status });
    flash(`${t("markAs")} ${t(status)}`);
    loadAll();
  }

  async function handleInvoiceDelete(id) {
    if (confirm(t("deleteInvoice") + "?")) {
      await api.deleteInvoice(id);
      loadAll();
    }
  }

  return (
    <div className={`min-h-screen bg-slate-100 ${isArabic ? "font-arabic" : ""}`}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
              YIC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{t("appName")}</p>
              <p className="text-xs text-slate-400">{t("appTagline")}</p>
            </div>
          </div>

          {isAdmin && <SearchBar />}

          <div className="flex items-center gap-3">
            <button onClick={toggleLang}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              {lang === "en" ? "عربي" : "EN"}
            </button>
            {isAdmin && (
              <button onClick={() => setShowShareQR(true)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                title={isArabic ? "مشاركة" : "Share"}>
                {isArabic ? "مشاركة" : "📲"}
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
              <p className="text-xs capitalize text-slate-400">{user.role}</p>
            </div>
            <button className="btn-secondary" onClick={logout}>{t("logOut")}</button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
          {TABS.filter((tabItem) => tabItem.id !== "directory" || isAdmin)
            .filter((tabItem) => tabItem.id !== "payments" || isAdmin || user.role === "student")
            .map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === tabItem.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tabItem.icon} {t(tabItem.key)}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {showBanner && (
          <div className="card flex items-center justify-between border-l-4 border-brand-600 bg-brand-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-sm font-semibold text-brand-800">{t("installTitle")}</p>
                <p className="text-xs text-brand-600">{t("installSubtitle")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={dismiss} className="btn-secondary text-xs">{t("later")}</button>
              <button onClick={install} className="btn-primary text-xs">{t("install")}</button>
            </div>
          </div>
        )}

        {toast && (
          <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
        )}

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">{t("failedToLoad")}</p>
            <p className="mt-1">{loadError}</p>
            <button onClick={loadAll} className="mt-2 text-xs font-medium text-red-800 underline">{t("retry")}</button>
          </div>
        )}

        {isAdmin && summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label={t("students")} value={summary.total_students} />
            <SummaryCard label={t("teachers")} value={summary.total_teachers} />
            <SummaryCard label={t("classesScheduled")} value={summary.total_classes} />
            <SummaryCard label={t("overdueAmount")} value={`${summary.overdue_amount.toFixed(2)} MRU`} accent="red" />
          </div>
        )}

        {isAdmin && (
          <StatusAlerts overdueStudents={summary?.overdue_students} onJumpToPayments={() => setTab("payments")} />
        )}

        {tab === "calendar" && (
          <>
            {isAdmin && (
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => setScheduleModal({ mode: "create", initial: null })}>
                  {t("scheduleClass")}
                </button>
              </div>
            )}
            <CalendarGrid schedules={schedules} onQuickAction={isAdmin ? handleQuickAction : () => {}} />
          </>
        )}

        {tab === "payments" && (isAdmin || user.role === "student") && (
          <PaymentTracker
            invoices={invoices}
            onStatusChange={isAdmin ? handleInvoiceStatusChange : () => {}}
            onNewInvoice={() => isAdmin && setShowInvoiceModal(true)}
            onDelete={isAdmin ? handleInvoiceDelete : () => {}}
          />
        )}

        {tab === "directory" && isAdmin && <UsersPage />}

        {tab === "chat" && <GroupChat groups={groups} />}
      </main>

      {scheduleModal && (
        <ScheduleModal
          mode={scheduleModal.mode}
          initial={scheduleModal.initial}
          teachers={teachers}
          classrooms={classrooms}
          groups={groups}
          onClose={() => setScheduleModal(null)}
          onSave={handleScheduleSave}
        />
      )}

      {showInvoiceModal && (
        <InvoiceModal
          students={students}
          onClose={() => setShowInvoiceModal(false)}
          onSave={async (payload) => {
            await api.createInvoice(payload);
            setShowInvoiceModal(false);
            flash(t("invoiceCreated"));
            loadAll();
          }}
        />
      )}

      <ClassReminders schedules={schedules} />
      {showShareQR && <ShareQR onClose={() => setShowShareQR(false)} />}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === "red" ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
