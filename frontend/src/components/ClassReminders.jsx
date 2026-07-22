import { useEffect, useState, useRef } from "react";

import { useI18n } from "../context/I18nContext.jsx";

function getMinutesUntil(startTime, dayOfWeek) {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);

  const currentDay = (now.getDay() + 6) % 7;
  let daysAhead = dayOfWeek - currentDay;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && target <= now) daysAhead = 7;

  target.setDate(target.getDate() + daysAhead);
  return Math.round((target - now) / 60000);
}

export default function ClassReminders({ schedules }) {
  const { t, isArabic } = useI18n();
  const [alerts, setAlerts] = useState([]);
  const shownRef = useRef(new Set());

  useEffect(() => {
    if (!schedules || schedules.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newAlerts = [];

      for (const s of schedules) {
        const mins = getMinutesUntil(s.start_time, s.day_of_week);
        const key30 = `${s.id}-30`;
        const key5 = `${s.id}-5`;

        if (mins <= 30 && mins > 25 && !shownRef.current.has(key30)) {
          shownRef.current.add(key30);
          newAlerts.push({
            id: key30,
            type: "warning",
            message: isArabic
              ? `⏰ ${s.class_name} يبدأ خلال 30 دقيقة (${s.start_time})`
              : `⏰ ${s.class_name} starts in 30 minutes (${s.start_time})`,
            teacher: s.teacher_name,
            group: s.group_name,
            room: s.classroom_name,
          });
        }

        if (mins <= 5 && mins > 0 && !shownRef.current.has(key5)) {
          shownRef.current.add(key5);
          newAlerts.push({
            id: key5,
            type: "urgent",
            message: isArabic
              ? `🔔 ${s.class_name} يبدأ خلال 5 دقائق! (${s.start_time})`
              : `🔔 ${s.class_name} starts in 5 minutes! (${s.start_time})`,
            teacher: s.teacher_name,
            group: s.group_name,
            room: s.classroom_name,
          });
        }
      }

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...prev, ...newAlerts]);

        if ("Notification" in window && Notification.permission === "granted") {
          for (const a of newAlerts) {
            new Notification("Yes I Can", { body: a.message, icon: "/icon-192.png" });
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [schedules, isArabic]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function dismiss(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex w-80 flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`class-alert rounded-xl border p-4 shadow-lg backdrop-blur ${
            alert.type === "urgent"
              ? "border-red-300 bg-red-50/95 text-red-800"
              : "border-amber-300 bg-amber-50/95 text-amber-800"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold">{alert.message}</p>
              <p className="mt-1 text-xs opacity-80">
                {alert.teacher} · {alert.group} · {alert.room}
              </p>
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              className={`shrink-0 rounded p-1 text-xs hover:bg-white/60 ${
                alert.type === "urgent" ? "text-red-600" : "text-amber-600"
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
