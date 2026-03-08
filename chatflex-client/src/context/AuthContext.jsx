import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("chatflex_token"));
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await authApi.me();
        setUser(data.user);
        setWorkspace(data.workspace);
      } catch (_error) {
        localStorage.removeItem("chatflex_token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = (payload) => {
    localStorage.setItem("chatflex_token", payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setWorkspace(payload.workspace);
  };

  const logout = () => {
    localStorage.removeItem("chatflex_token");
    setToken(null);
    setUser(null);
    setWorkspace(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      workspace,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setWorkspace
    }),
    [token, user, workspace, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
