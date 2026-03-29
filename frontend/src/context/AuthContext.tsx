import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login as apiLogin, register as apiRegister, getMe } from "../api/client";

interface Student {
  id: number;
  name: string;
  userName: string;
  pfp: string | null;
  isShowName: boolean;
  isAdmin: boolean;
  timezone: string;
}

interface AuthContextType {
  student: Student | null;
  token: string | null;
  loading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    userName: string;
    password: string;
    isShowName?: boolean;
    timezone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const res = await getMe();
      setStudent(res.data);
    } catch {
      setStudent(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem("access_token");
      if (stored) {
        setToken(stored);
        try {
          const res = await getMe();
          setStudent(res.data);
        } catch {
          await AsyncStorage.removeItem("access_token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (userName: string, password: string) => {
    const res = await apiLogin(userName, password);
    const { access_token } = res.data;
    await AsyncStorage.setItem("access_token", access_token);
    setToken(access_token);
    const me = await getMe();
    setStudent(me.data);
  };

  const register = async (data: {
    name: string;
    userName: string;
    password: string;
    isShowName?: boolean;
    timezone?: string;
  }) => {
    await apiRegister(data);
    await login(data.userName, data.password);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("access_token");
    setToken(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ student, token, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
