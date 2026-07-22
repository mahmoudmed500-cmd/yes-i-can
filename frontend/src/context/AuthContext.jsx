import { createContext, useContext, useEffect, useState } from "react";

import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("yic_user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(username, password) {
    const data = await api.login(username, password);
    const sessionUser = {
      id: data.user_id,
      role: data.role,
      full_name: data.full_name,
    };
    localStorage.setItem("yic_token", data.access_token);
    localStorage.setItem("yic_user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  }

  function logout() {
    localStorage.removeItem("yic_token");
    localStorage.removeItem("yic_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
