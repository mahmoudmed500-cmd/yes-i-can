import { useEffect, useRef, useState, useCallback } from "react";

import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

export default function GroupChat({ groups }) {
  const { user } = useAuth();
  const { t, isArabic } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const myGroups = user.role === "student"
    ? groups.filter((g) => (g.member_ids || []).includes(user.user_id))
    : groups;

  const loadMessages = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      setLoading(true);
      const msgs = await api.listMessages(groupId);
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedGroup, loadMessages]);

  useEffect(() => {
    if (!selectedGroup) return;
    pollRef.current = setInterval(() => loadMessages(selectedGroup.id), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedGroup, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(selectedGroup.id, text.trim());
      setText("");
      await loadMessages(selectedGroup.id);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  if (!selectedGroup) {
    return (
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">{t("groupChat")}</h2>
        {myGroups.length === 0 ? (
          <p className="text-sm text-slate-400">{t("noGroups")}</p>
        ) : (
          <div className="space-y-2">
            {myGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <div>
                  <p className="font-medium text-slate-800">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.level || ""}</p>
                </div>
                <span className="text-slate-300">{isArabic ? "‹" : "›"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card flex flex-col" style={{ height: "70vh" }}>
      <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setSelectedGroup(null)} className="text-sm text-brand-600 hover:underline">
          {isArabic ? "›" : "‹"} {t("back")}
        </button>
        <h2 className="font-semibold text-slate-800">{selectedGroup.name}</h2>
        <span className="text-xs text-slate-400">{isArabic ? "دردشة المجموعة" : "Group Chat"}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 px-1 mb-3">
        {loading && messages.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">{t("loading")}</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === user.user_id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
                isMe
                  ? "bg-brand-600 text-white"
                  : m.sender_role === "teacher"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-slate-100"
              }`}>
                {!isMe && (
                  <p className={`text-[10px] font-semibold mb-0.5 ${
                    m.sender_role === "teacher" ? "text-emerald-600" : "text-slate-500"
                  }`}>
                    {m.sender_name}
                    {m.sender_role === "teacher" ? " 👨‍🏫" : ""}
                  </p>
                )}
                <p className={`text-sm ${isMe ? "text-white" : "text-slate-800"}`}>{m.text}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? "text-brand-200" : "text-slate-400"}`}>
                  {new Date(m.created_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 pt-3">
        <input
          className="input-field flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("typeMessage")}
          autoFocus
        />
        <button type="submit" disabled={!text.trim() || sending} className="btn-primary">
          {isArabic ? "إرسال" : "Send"}
        </button>
      </form>
    </div>
  );
}
