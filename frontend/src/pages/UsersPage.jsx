import { useEffect, useState } from "react";

import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

const LEVELS = [
  { value: "A1", label_en: "A1 - Beginner", label_ar: "A1 - مبتدئ" },
  { value: "A2", label_en: "A2 - Elementary", label_ar: "A2 - أدنى مبتدئ" },
  { value: "B1", label_en: "B1 - Intermediate", label_ar: "B1 - متوسط" },
  { value: "B2", label_en: "B2 - Upper-Intermediate", label_ar: "B2 - فوق المتوسط" },
  { value: "C1", label_en: "C1 - Advanced", label_ar: "C1 - متقدم" },
  { value: "C2", label_en: "C2 - Proficiency", label_ar: "C2 - إتقان" },
];

const emptyForm = {
  username: "", password: "", role: "student", full_name: "", email: "", phone: "", specialty: "", level: "",
};

function validatePassword(pw) {
  if (pw.length < 8) return "8+ chars";
  if (!/[A-Z]/.test(pw)) return "needs uppercase";
  if (!/[a-z]/.test(pw)) return "needs lowercase";
  if (!/[0-9]/.test(pw)) return "needs a number";
  return "";
}

export default function UsersPage({ onCreated }) {
  const { user } = useAuth();
  const { t, isArabic } = useI18n();
  const isAdmin = user.role === "admin";
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [groupForm, setGroupForm] = useState({ name: "", level: "" });
  const [error, setError] = useState("");
  const [memberModal, setMemberModal] = useState(null);

  async function load() {
    const data = await api.listUsers(roleFilter === "all" ? {} : { role: roleFilter });
    setUsers(data.filter((u) => u.role !== "admin"));
    const grp = await api.listGroups();
    setGroups(grp);
    const au = await api.listUsers();
    setAllUsers(au.filter((u) => u.role !== "admin"));
  }

  useEffect(() => { load(); }, [roleFilter]);

  async function loadMembers(groupId) {
    try {
      const g = await api.listGroups();
      const grp = g.find((x) => x.id === groupId);
      setMembers((m) => ({ ...m, [groupId]: grp?.member_ids || [] }));
    } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }
    try {
      await api.createUser(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
      onCreated?.();
    } catch (err) { setError(err.message); }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setError("");
    if (!groupForm.name.trim()) { setError(isArabic ? "اسم المجموعة مطلوب" : "Group name required"); return; }
    try {
      await api.createGroup(groupForm);
      setGroupForm({ name: "", level: "" });
      setShowGroupForm(false);
      load();
      onCreated?.();
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteGroup(id) {
    if (!confirm(isArabic ? "حذف هذه المجموعة؟" : "Delete this group?")) return;
    try {
      await api.request(`/groups/${id}`, { method: "DELETE" });
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleToggleMember(groupId, userId) {
    const current = members[groupId] || [];
    const has = current.includes(userId);
    try {
      if (has) {
        await api.request(`/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      } else {
        await api.request(`/groups/${groupId}/members/${userId}`, { method: "POST" });
      }
      await loadMembers(groupId);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDeactivate(u) {
    const action = u.is_active
      ? (isArabic ? `إزالة "${u.full_name}" من المركز؟ لن يتمكن من تسجيل الدخول.` : `Remove "${u.full_name}" from the center? They won't be able to log in.`)
      : (isArabic ? `إعادة "${u.full_name}" إلى المركز؟` : `Restore "${u.full_name}" to the center?`);
    if (!confirm(action)) return;
    await api.updateUser(u.id, { is_active: !u.is_active });
    load();
  }

  async function handleResetAll() {
    if (!confirm(isArabic ? "هل تريد حذف كل البيانات التجريبية؟" : "Delete ALL demo data? This removes all users, classes, groups, invoices, and messages. Your admin account stays.")) return;
    try {
      await api.resetAll();
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-6">
      {/* Groups Section */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">{isArabic ? "المجموعات" : "Groups"}</h2>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowGroupForm((s) => !s)}>
              {showGroupForm ? t("close") : isArabic ? "+ إنشاء مجموعة" : "+ New Group"}
            </button>
          )}
        </div>

        {showGroupForm && (
          <form onSubmit={handleCreateGroup} className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? "اسم المجموعة" : "Group Name"}</label>
              <input className="input-field" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="w-52">
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("level")}</label>
              <select className="input-field" value={groupForm.level} onChange={(e) => setGroupForm((f) => ({ ...f, level: e.target.value }))}>
                <option value="">{isArabic ? "اختر المستوى" : "Select level"}</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{isArabic ? l.label_ar : l.label_en}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">{t("save")}</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">{isArabic ? "الاسم" : "Name"}</th>
                <th className="py-2 pr-4">{t("level")}</th>
                <th className="py-2 pr-4">{isArabic ? "الأعضاء" : "Members"}</th>
                {isAdmin && <th className="py-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-medium text-slate-800">{g.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{g.level || "—"}</td>
                  <td className="py-2 pr-4 text-slate-500">{(g.member_ids || []).length}</td>
                  {isAdmin && (
                    <td className="py-2 pr-2 text-right space-x-2">
                      <button className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => { setMemberModal(g.id); loadMembers(g.id); }}>
                        {isArabic ? "إدارة الأعضاء" : "Members"}
                      </button>
                      <button className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => handleDeleteGroup(g.id)}>
                        {t("delete")}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {groups.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-400">{isArabic ? "لا توجد مجموعات" : "No groups yet"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Members Modal */}
      {memberModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className={`max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl ${isArabic ? "text-right" : ""}`}>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {isArabic ? "إدارة الأعضاء" : "Manage Members"} — {groups.find((g) => g.id === memberModal)?.name}
            </h3>
            <div className="space-y-2">
              {allUsers.filter((u) => u.role === "student").map((u) => {
                const inGroup = (members[memberModal] || []).includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={inGroup} onChange={() => handleToggleMember(memberModal, u.id)} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium text-slate-700">{u.full_name}</span>
                    <span className="ml-auto text-xs text-slate-400">{u.level || "—"}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-secondary" onClick={() => setMemberModal(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* People Section */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">{t("teachersAndStudents")}</h2>
          <div className="flex items-center gap-2">
            <select className="input-field !w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">{t("all")}</option>
              <option value="teacher">{t("teachersFilter")}</option>
              <option value="student">{t("studentsFilter")}</option>
            </select>
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? t("close") : t("addPerson")}
            </button>
            <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              onClick={handleResetAll}>
              {isArabic ? "🗑️ مسح كل البيانات" : "🗑️ Reset Demo Data"}
            </button>
          </div>
        </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4">
          <input className="input-field" placeholder={t("fullName")} required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <select className="input-field" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="student">{t("studentsFilter")}</option>
            <option value="teacher">{t("teachersFilter")}</option>
          </select>
          <input className="input-field" placeholder={t("username")} required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          <input className="input-field" type="password" placeholder={isArabic ? "كلمة مرور قوية (8+ حروف)" : "Strong password (8+ chars, A-Z, a-z, 0-9)"} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <input className="input-field" placeholder={t("email")} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="input-field" placeholder={t("phone")} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          {form.role === "teacher" ? (
            <input className="input-field col-span-2" placeholder={t("specialty")} value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} />
          ) : (
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("level")}</label>
              <select className="input-field" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                <option value="">{isArabic ? "اختر المستوى" : "Select level"}</option>
                <option value="A1">A1 – {isArabic ? "المبتدئ" : "Beginner"}</option>
                <option value="A2">A2 – {isArabic ? "أعلى مبتدئ" : "Elementary"}</option>
                <option value="B1">B1 – {isArabic ? "متوسط" : "Intermediate"}</option>
                <option value="B2">B2 – {isArabic ? "أعلى متوسط" : "Upper-Intermediate"}</option>
                <option value="C1">C1 – {isArabic ? "متقدم" : "Advanced"}</option>
                <option value="C2">C2 – {isArabic ? "إتقان" : "Proficiency"}</option>
              </select>
            </div>
          )}
          {error && <p className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="btn-primary">{t("save")}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">{isArabic ? "الاسم" : "Name"}</th>
              <th className="py-2 pr-4">{isArabic ? "الدور" : "Role"}</th>
              <th className="py-2 pr-4">{isArabic ? "التفاصيل" : "Detail"}</th>
              {isAdmin && <th className="py-2 pr-4">{isArabic ? "جهة الاتصال" : "Contact"}</th>}
              <th className="py-2 pr-4">{isArabic ? "الحالة" : "Status"}</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium text-slate-800">{u.full_name}</td>
                <td className="py-2 pr-4 capitalize">{t(u.role === "teacher" ? "teachers" : "students")}</td>
                <td className="py-2 pr-4 text-slate-500">{u.role === "teacher" ? u.specialty : u.level}</td>
                {isAdmin && <td className="py-2 pr-4 text-slate-500">{u.email || u.phone || "—"}</td>}
                <td className="py-2 pr-4">
                  <span className={`badge ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    {u.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="py-2 pr-2 text-right">
                  <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => handleDeactivate(u)}>
                    {u.is_active ? (isArabic ? "إزالة" : "Remove") : (isArabic ? "إعادة" : "Restore")}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} className="py-6 text-center text-slate-400">{t("noPeople")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
