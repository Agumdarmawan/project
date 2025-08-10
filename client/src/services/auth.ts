export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type User = { id: string; name: string; email: string; role: Role };

export function setAuth(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getAuth(): { token: string | null; user: User | null } {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  return { token, user: raw ? (JSON.parse(raw) as User) : null };
}

export function authHeader() {
  const { token } = getAuth();
  return token ? { Authorization: `Bearer ${token}` } : {};
}