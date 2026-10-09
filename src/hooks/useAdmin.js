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
    let checking = false; // prevents two overlapping admin checks

    const finishLoading = () => useAdminStore.setState({ isLoading: false });

    async function checkAdmin(session) {
      if (!session?.user) {
        clearSession();
        finishLoading();
        return;
      }
      if (checking) return;
      checking = true;

      try {
        const { data, error } = await supabase
          .from("admins")
          .select("id, email")
          .eq("id", session.user.id)
          .maybeSingle(); // non-admin => null, not an error

        if (!mounted) return;
        if (error) throw error; // network/server problem: handled below

        if (!data) {
          // Definitive: authenticated but not an admin.
          await supabase.auth.signOut();
          clearSession();
        } else {
          setSession(session);
          setAdminUser(data);
        }
      } catch (err) {
        if (!mounted) return;
        // Transient failure: do NOT sign out. Just stop the spinner;
        // ProtectedRoute will send the user to /login if there is no adminUser.
        console.error("Admin verification failed");
        useAdminStore.setState({ adminUser: null });
      } finally {
        checking = false;
        if (mounted) finishLoading();
      }
    }

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        bootstrapped = true;
        if (!mounted) return;
        await checkAdmin(session);
      } catch {
        bootstrapped = true;
        if (!mounted) return;
        clearSession();
        finishLoading();
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // NOT async. supabase-js awaits this callback while holding the auth
      // lock, so awaiting any Supabase call in here deadlocks. Anything that
      // needs the network is deferred with setTimeout so the lock is released first.

      // bootstrap() handles the initial session.
      if (!bootstrapped && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) return;

      if (event === "SIGNED_OUT" || !session) {
        clearSession();
        finishLoading();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Hourly refresh for an already-verified admin: just swap the session.
        const current = useAdminStore.getState().adminUser;
        if (event === "TOKEN_REFRESHED" && current?.id === session.user.id) {
          setSession(session);
          return;
        }
        setTimeout(() => {
          if (mounted) checkAdmin(session);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setAdminUser, clearSession]);

  return { logout: () => supabase.auth.signOut() };
}