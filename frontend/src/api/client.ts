import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

async function hashPassword(plain: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, plain);
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("access_token");
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const register = async (data: {
  name: string;
  userName: string;
  password: string;
  isShowName?: boolean;
  timezone?: string;
  linkedin?: string;
  email?: string;
}) => {
  const hashedPw = await hashPassword(data.password);
  return api.post("/auth/register", { ...data, password: hashedPw });
};

export const login = async (userName: string, password: string) => {
  const hashedPw = await hashPassword(password);
  return api.post("/auth/login", { userName, password: hashedPw });
};

export const getMe = () => api.get("/auth/me");
export const updateMe = (data: {
  name?: string;
  isShowName?: boolean;
  timezone?: string;
  linkedin?: string;
  email?: string;
  push_token?: string;
}) => api.put("/auth/me", data);

export const getUserProfile = (username: string) => api.get(`/auth/users/${username}`);
export const deleteAccount = () => api.delete("/auth/me");
export const changePassword = async (data: { current_password: string; new_password: string }) => {
  const [hashedCurrent, hashedNew] = await Promise.all([
    hashPassword(data.current_password),
    hashPassword(data.new_password),
  ]);
  return api.put("/auth/me/password", { current_password: hashedCurrent, new_password: hashedNew });
};

// ── Posts ─────────────────────────────────────────────────────────────────────

export const listPosts = (skip = 0, limit = 20) =>
  api.get(`/posts?skip=${skip}&limit=${limit}`);

export const getPost = (id: number) => api.get(`/posts/${id}`);

export const createPost = (data: {
  title: string;
  content: string;
  isAnonymous?: boolean;
  parent?: number;
}) => api.post("/posts", data);

export const likePost = (id: number) => api.post(`/posts/${id}/like`);

export const deletePost = (id: number) => api.delete(`/posts/${id}`);

// ── AI ────────────────────────────────────────────────────────────────────────

export const chatWithAI = (data: {
  message: string;
  history: { role: string; content: string }[];
  financials_mode?: boolean;
  active_tools?: string[];
  canvas_mode?: boolean;
  canvas_context?: {
    nodes: Array<{ id: string; type: string; title: string; content: string; rows?: Array<{ key: string; value: string }> }>;
    connections: Array<{ id: string; from_id: string; to_id: string }>;
  };
}) => api.post("/ai/chat", data);

// ── Canvas ────────────────────────────────────────────────────────────────────

export const getCanvas = () => api.get("/canvas");

export const saveCanvas = (data: { nodes_json: string; connections_json: string }) =>
  api.put("/canvas", data);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminStats = () => api.get("/admin/stats");
export const adminDeletePost = (id: number) => api.delete(`/admin/posts/${id}`);
export const adminDeleteUser = (username: string) =>
  api.delete(`/admin/users/${username}`);
export const adminListUsers = () => api.get("/admin/users");
export const adminListPosts = () => api.get("/admin/posts");
export const adminPromoteUser = (username: string) =>
  api.put(`/admin/users/${username}/promote`);

// ── Financials ────────────────────────────────────────────────────────────────

export const getCurrencies = () => api.get("/financials/currencies");

export const convertCurrency = (data: {
  amount: number;
  from_currency: string;
  to_currency: string;
}) => api.post("/financials/convert", data);

export const calcFundingGap = (data: {
  coa: number;
  guaranteed_aid?: number;
  likely_aid?: number;
  user_resources?: number;
  school_name?: string;
  program?: string;
}) => api.post("/financials/funding-gap", data);

export const searchScholarships = (data: {
  query: string;
  country_of_origin?: string;
  field_of_study?: string;
  degree_level?: string;
}) => api.post("/financials/scholarships", data);

export const checkScam = (data: {
  scholarship_name: string;
  description: string;
  source_url?: string;
}) => api.post("/financials/scam-check", data);

export const generateAppeal = (data: {
  school_name: string;
  current_aid: number;
  circumstances: string;
  aid_type?: string;
}) => api.post("/financials/appeal", data);

export const getEmergencyResources = (data: {
  emergency_type: string;
  urgency?: string;
  school_name?: string;
  context?: string;
}) => api.post("/financials/emergency", data);

export const proofOfFundsPlan = (data: {
  visa_type?: string;
  school_name?: string;
  annual_coa: number;
  duration_years?: number;
  current_funds?: number;
  country_of_origin?: string;
}) => api.post("/financials/proof-of-funds", data);

export default api;
