/**
 * User Session Management & Profile State
 * Provides default session profiles and immediate pass-through state for one-click entry.
 */

export interface UserSession {
  username: string
  name: string
  email: string
  role: string
  department: string
  status: "active" | "guest"
  loginTime: string
}

export const DEFAULT_USER_SESSION: UserSession = {
  username: "staff_operator",
  name: "เจ้าหน้าที่ปฏิบัติการ",
  email: "support@processclaim.internal",
  role: "เจ้าหน้าที่บริหารงานเคลม",
  department: "ฝ่ายสนับสนุนโครงข่ายวิทยุสื่อสาร SHF",
  status: "active",
  loginTime: "2026-09-29T14:00:00.000Z",
}

export const SESSION_STORAGE_KEY = "caim_user_session"

/**
 * Initialize default user profile session in client storage
 */
export function initDefaultSession(customProfile?: Partial<UserSession>): UserSession {
  const session: UserSession = {
    ...DEFAULT_USER_SESSION,
    ...customProfile,
    loginTime: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } catch {
      // In case localStorage is disabled or restricted
    }
  }

  return session
}

/**
 * Retrieve the active session or return the default session profile
 */
export function getCurrentSession(): UserSession {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as UserSession
      }
    } catch {
      // Fallback to default
    }
  }
  return DEFAULT_USER_SESSION
}

/**
 * Clear the current session on logout
 */
export function clearSession(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // Ignore
    }
  }
}
