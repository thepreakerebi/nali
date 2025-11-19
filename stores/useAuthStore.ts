import { create } from "zustand";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface AuthState {
  userId: Id<"users"> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUserId: (userId: Id<"users"> | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  isAuthenticated: false,
  isLoading: true,
  setUserId: (userId) =>
    set({ userId, isAuthenticated: userId !== null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

/**
 * Hook to sync Convex auth state with Zustand store
 */
export function useAuthSync() {
  const userId = useQuery(api.functions.utils.auth.getCurrentUserId);
  const { setUserId, setLoading } = useAuthStore();

  useEffect(() => {
    if (userId === undefined) {
      setLoading(true);
    } else {
      setUserId(userId);
    }
  }, [userId, setUserId, setLoading]);
}

