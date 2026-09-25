import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAdminStore } from "../store/adminStore";

export function useAdmin() {
  const setSession = useAdminStore((state) => state.setSession);
  const setAdminUser = useAdminStore((state) => state.setAdminUser);
  const clearSession = useAdminStore((state) => state.clearSession);

  useEffect(() => {
    let mounted = true;
    let bootstrapped = false;

    async function checkAdmin(session) {
      if (!session?.user) {
        clearSession();
        return;
      }
      try {
        const { data, error } = await supabase
          .from("admins")
          .select("id, email")
          .eq("id", session.user.id)
          .single();

        if (!mounted) return;

        if (error || !data) {
          await supabase.auth.signOut();
          clearSession();
        } else {
          setSession(session);
          setAdminUser(data);
        }
      } catch {
        if (!mounted) return;
        await supabase.auth.signOut().catch(() => { });
        clearSession();
      } finally {
        useAdminStore.setState({ isLoading: false });
      }
    }

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      bootstrapped = true;
      await checkAdmin(session);
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial SIGNED_IN fired on mount — bootstrap handles it
      if (!bootstrapped && event === "SIGNED_IN") return;

      if (event === "SIGNED_OUT" || !session) {
        clearSession();
        useAdminStore.setState({ isLoading: false });
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await checkAdmin(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setAdminUser, clearSession]);

  return { logout: () => supabase.auth.signOut() };
}
