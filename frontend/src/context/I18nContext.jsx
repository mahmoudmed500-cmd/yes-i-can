import { createContext, useContext, useState, useCallback } from "react";

const translations = {
  en: {
    // App
    appName: "Yes I Can",
    appTagline: "English Center Management",

    // Auth
    loginTitle: "Yes I Can",
    loginSubtitle: "English Center Management",
    username: "Username",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",

    loginFailed: "Login failed",
    sessionExpired: "Session expired",

    // Navigation
    schedule: "Schedule",
    payments: "Payments",
    directory: "Directory",
    logOut: "Log out",

    // Dashboard
    students: "Students",
    teachers: "Teachers",
    classesScheduled: "Classes scheduled",
    overdueAmount: "Overdue amount",
    failedToLoad: "Failed to load data",
    retry: "Retry",

    // Schedule
    weeklyTimetable: "Weekly Timetable",
    scheduleClass: "+ Schedule a class",
    newClass: "New Class",
    editClass: "Edit Class",
    rescheduleClass: "Reschedule Class",
    className: "Class name",
    teacher: "Teacher",
    classroom: "Classroom",
    studentGroup: "Student group",
    recurringWeekly: "Recurring weekly",
    oneOffSession: "One-off session",
    dayOfWeek: "Day of week",
    date: "Date",
    startTime: "Start time",
    endTime: "End time",
    saveClass: "Save class",
    saving: "Saving...",
    cancel: "Cancel",
    reschedule: "Reschedule",
    editDetails: "Edit details",
    cancelClass: "Cancel class",
    classCancelled: "Class cancelled",
    classUpdated: "Class updated",
    classScheduled: "Class scheduled",
    oneOffHint: "One-off session shown as ✦",

    // Payments
    billingLedger: "Billing Ledger",
    allStatuses: "All statuses",
    paid: "paid",
    pending: "pending",
    overdue: "overdue",
    newInvoice: "+ New Invoice",
    tuitionAmount: "Tuition amount (MRU)",
    dueDate: "Due date",
    note: "Note (optional)",
    createInvoice: "Create invoice",
    invoiceCreated: "Invoice created",
    markAs: "Mark as",
    deleteInvoice: "Delete invoice",
    noInvoices: "No invoices match this filter.",

    // Status Alerts
    noOverdue: "No overdue payments right now — all accounts are on track.",
    paymentsOverdue: "payment(s) overdue",
    viewBillingLedger: "View billing ledger",
    wasDue: "was due",
    morePayments: "+ {count} more...",

    // Directory
    teachersAndStudents: "Teachers & Students Directory",
    all: "All",
    teachersFilter: "Teachers",
    studentsFilter: "Students",
    addPerson: "+ Add person",
    close: "Close",
    fullName: "Full name",
    email: "Email (optional)",
    phone: "Phone (optional)",
    specialty: "Specialty (e.g. IELTS, Kids English)",
    level: "Level (e.g. Beginner)",
    active: "active",
    inactive: "inactive",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    save: "Save",
    noPeople: "No people found.",

    // Calendar
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",

    // Install PWA
    installTitle: "Install Yes I Can",
    installSubtitle: "Add to your home screen for quick access",
    later: "Later",
    install: "Install",

    // Common
    loading: "Loading...",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    search: "Search students or teachers...",
    cancelAction: "Cancel",
  },
  ar: {
    // App
    appName: "Yes I Can",
    appTagline: "إدارة مركز اللغة الإنجليزية",

    // Auth
    loginTitle: "Yes I Can",
    loginSubtitle: "إدارة مركز اللغة الإنجليزية",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جاري تسجيل الدخول...",

    loginFailed: "فشل تسجيل الدخول",
    sessionExpired: "انتهت الجلسة",

    // Navigation
    schedule: "الجدول",
    payments: "المدفوعات",
    directory: "الدليل",
    logOut: "تسجيل الخروج",

    // Dashboard
    students: "الطلاب",
    teachers: "المعلمون",
    classesScheduled: "الفصول المجدولة",
    overdueAmount: "المبلغ المتأخر",
    failedToLoad: "فشل تحميل البيانات",
    retry: "إعادة المحاولة",

    // Schedule
    weeklyTimetable: "الجدول الأسبوعي",
    scheduleClass: "+ جدولة فصل",
    newClass: "فصل جديد",
    editClass: "تعديل الفصل",
    rescheduleClass: "إعادة جدولة الفصل",
    className: "اسم الفصل",
    teacher: "المعلم",
    classroom: "الفصل الدراسي",
    studentGroup: "مجموعة الطلاب",
    recurringWeekly: "أسبوعي متكرر",
    oneOffSession: "حصة لمرة واحدة",
    dayOfWeek: "يوم الأسبوع",
    date: "التاريخ",
    startTime: "وقت البدء",
    endTime: "وقت الانتهاء",
    saveClass: "حفظ الفصل",
    saving: "جاري الحفظ...",
    cancel: "إلغاء",
    reschedule: "إعادة جدولة",
    editDetails: "تعديل التفاصيل",
    cancelClass: "إلغاء الفصل",
    classCancelled: "تم إلغاء الفصل",
    classUpdated: "تم تحديث الفصل",
    classScheduled: "تم جدولة الفصل",
    oneOffHint: "حصة لمرة واحدة تظهر بعلامة ✦",

    // Payments
    billingLedger: "سجل الفواتير",
    allStatuses: "جميع الحالات",
    paid: "مدفوع",
    pending: "معلق",
    overdue: "متأخر",
    newInvoice: "+ فاتورة جديدة",
    tuitionAmount: "مبلغ الدراسة (أوقيا)",
    dueDate: "تاريخ الاستحقاق",
    note: "ملاحظة (اختياري)",
    createInvoice: "إنشاء فاتورة",
    invoiceCreated: "تم إنشاء الفاتورة",
    markAs: "تحديد كـ",
    deleteInvoice: "حذف الفاتورة",
    noInvoices: "لا توجد فواتير تطابق هذا الفلتر.",

    // Status Alerts
    noOverdue: "لا توجد مدفوعات متأخرة الآن — جميع الحسابات في وضع جيد.",
    paymentsOverdue: "مدفوعات متأخرة",
    viewBillingLedger: "عرض سجل الفواتير",
    wasDue: "كان مستحقاً في",
    morePayments: "+ {count} المزيد...",

    // Directory
    teachersAndStudents: "دليل المعلمين والطلاب",
    all: "الكل",
    teachersFilter: "المعلمون",
    studentsFilter: "الطلاب",
    addPerson: "+ إضافة شخص",
    close: "إغلاق",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني (اختياري)",
    phone: "الهاتف (اختياري)",
    specialty: "التخصص (مثال: IELTS)",
    level: "المستوى (مثال: مبتدئ)",
    active: "نشط",
    inactive: "غير نشط",
    deactivate: "تعطيل",
    reactivate: "تفعيل",
    save: "حفظ",
    noPeople: "لم يتم العثور على أشخاص.",

    // Calendar
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    sunday: "الأحد",

    // Install PWA
    installTitle: "تثبيت Yes I Can",
    installSubtitle: "أضف إلى شاشة 홈 للوصول السريع",
    later: "لاحقاً",
    install: "تثبيت",

    // Common
    loading: "جاري التحميل...",
    confirm: "تأكيد",
    delete: "حذف",
    edit: "تعديل",
    search: "البحث عن طلاب أو معلمين...",
    cancelAction: "إلغاء",
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("yic_lang") || "en");

  const t = useCallback(
    (key, replacements) => {
      let text = translations[lang]?.[key] || translations.en[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [lang]
  );

  const toggleLang = useCallback(() => {
    const next = lang === "en" ? "ar" : "en";
    setLang(next);
    localStorage.setItem("yic_lang", next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, isArabic: lang === "ar" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
