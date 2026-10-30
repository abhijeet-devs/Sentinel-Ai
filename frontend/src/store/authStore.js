import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem('sentinel_token', token);
        localStorage.setItem('sentinel_user', JSON.stringify(user));
        set({ token, user, isAuthenticated: Boolean(token) });
      },

      logout: () => {
        localStorage.removeItem('sentinel_token');
        localStorage.removeItem('sentinel_user');
        localStorage.removeItem('sentinel-auth');
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: Boolean(state.token),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.token) {
          state.isAuthenticated = false;
          state.user = null;
        }
      },
    }
  )
);
