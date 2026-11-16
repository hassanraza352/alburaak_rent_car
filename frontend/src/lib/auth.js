import { api, clearToken, getToken, setToken } from './api.js';
export const ADMIN_USER = 'Admin';
export const isLoggedIn = () => Boolean(getToken());
export async function login(user, pass) { const result=await api.login(user,pass);setToken(result.token);return result.admin; }
export function logout() { clearToken(); }
