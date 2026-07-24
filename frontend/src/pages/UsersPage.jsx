import { useEffect, useState } from "react";

import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

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

export default function UsersPage() {
  const { user } = useAuth();
  const { t, isArabic } = useI18n();
  const isAdmin = user.role === "admin";
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    const data = await api.listUsers(roleFilter === "all" ? {} : { role: roleFilter });
    setUsers(data.filter((u) => u.role !== "admin"));
  }

  useEffect(() => { load(); }, [roleFilter]);

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
    } catch (err) { setError(err.message); }
  }

  async function handleDeactivate(u) {
    await api.updateUser(u.id, { is_active: !u.is_active });
    load();
  }

  return (
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
            <input className="input-field col-span-2" placeholder={t("level")} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
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
                    {u.is_active ? t("deactivate") : t("reactivate")}
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
  );
}
