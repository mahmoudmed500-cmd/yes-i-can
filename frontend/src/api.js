const BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://yes-i-can-production.up.railway.app");

function getToken() {
  return localStorage.getItem("yic_token");
}

async function request(path, { method = "GET", body, formBody, headers = {} } = {}) {
  const token = getToken();

  async function doFetch() {
    const opts = {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    if (formBody) {
      opts.body = new URLSearchParams(formBody);
      opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (body !== undefined) {
      opts.body = JSON.stringify(body);
      opts.headers["Content-Type"] = "application/json";
    }

    return fetch(`${BASE_URL}${path}`, opts);
  }

  let res;
  try {
    res = await doFetch();
  } catch (networkErr) {
    await new Promise((r) => setTimeout(r, 3000));
    res = await doFetch();
  }

  if (res.status === 401) {
    localStorage.removeItem("yic_token");
    localStorage.removeItem("yic_user");
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    let rawDetail = null;
    try {
      const data = await res.json();
      rawDetail = data.detail;
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      // ignore body-parse errors, keep default detail
    }
    const err = new Error(detail);
    err.status = res.status;
    err.rawDetail = rawDetail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", formBody: { username, password } }),

  // users
  listUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? `?${qs}` : ""}`);
  },
  createUser: (payload) => request("/users", { method: "POST", body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PUT", body: payload }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  // classrooms
  listClassrooms: () => request("/classrooms"),
  createClassroom: (payload) => request("/classrooms", { method: "POST", body: payload }),

  // groups
  listGroups: () => request("/groups"),
  createGroup: (payload) => request("/groups", { method: "POST", body: payload }),
  addGroupMember: (groupId, studentId) =>
    request(`/groups/${groupId}/members/${studentId}`, { method: "POST" }),
  removeGroupMember: (groupId, studentId) =>
    request(`/groups/${groupId}/members/${studentId}`, { method: "DELETE" }),

  // schedules
  listSchedules: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/schedules${qs ? `?${qs}` : ""}`);
  },
  createSchedule: (payload) => request("/schedules", { method: "POST", body: payload }),
  updateSchedule: (id, payload) => request(`/schedules/${id}`, { method: "PUT", body: payload }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: "DELETE" }),

  // invoices
  listInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ""}`);
  },
  createInvoice: (payload) => request("/invoices", { method: "POST", body: payload }),
  updateInvoiceStatus: (id, payload) =>
    request(`/invoices/${id}/status`, { method: "PUT", body: payload }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: "DELETE" }),

  // dashboard + search
  dashboardSummary: () => request("/dashboard/summary"),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // group chat
  listMessages: (groupId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/groups/${groupId}/messages${qs ? `?${qs}` : ""}`);
  },
  sendMessage: (groupId, text) =>
    request(`/groups/${groupId}/messages`, { method: "POST", body: { text } }),

  // admin cleanup
  resetAll: () => request("/admin/reset-all", { method: "POST" }),
  cleanupDemo: () => request("/admin/cleanup-demo", { method: "POST" }),
};

export { getToken };
