import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Role {
  id: string;
  name: string;
}

interface Profile {
  names: string;
  lastNames: string;
  phone?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  profile: Profile;
  roles: Role[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  
  // Getters
  getUserId: () => string | null;
  getProfile: () => Profile | null;
  getUsername: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      getUserId: () => {
        const state = get();
        return state.user?.id ?? null;
      },

      getProfile: () => {
        const state = get();
        return state.user?.profile ?? null;
      },

      getUsername: () => {
        const state = get();
        return state.user?.username ?? null;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
