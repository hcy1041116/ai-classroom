import { create } from "zustand";

interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    school?: string;
    experience_years?: string;
}

interface AuthState {
    user: User | null;
    isLoggedIn: boolean;
    sessionUuid: string | null;
    setUser: (user: User | null) => void;
    setSessionUuid: (uuid: string | null) => void;
    clearUser: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoggedIn: false,
    sessionUuid: null,
    setUser: (user) => set({ user, isLoggedIn: !!user }),
    setSessionUuid: (uuid) => set({ sessionUuid: uuid }),
    clearUser: () => set({ user: null, isLoggedIn: false, sessionUuid: null }),
    logout: () => set({ user: null, isLoggedIn: false, sessionUuid: null }),
}));