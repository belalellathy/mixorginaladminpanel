import { create } from "zustand";

export const useAdminStore = create((set) => ({
  session: null,
  adminUser: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setAdminUser: (adminUser) => set({ adminUser, isLoading: false }),
  clearSession: () => set({ session: null, adminUser: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));