import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/types/database";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  role: Role | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`loadProfile error for user ${userId}:`, error.message, error);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    // IMPORTANT: do NOT await Supabase calls inside onAuthStateChange — the
    // auth client holds an internal lock for the duration of the callback,
    // and any supabase.from(...)/auth.* call from inside will need that same
    // lock to read/refresh the access token, causing a deadlock that makes
    // the UI hang on login. Defer the work to the next tick instead.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const userId = newSession.user.id;
        setTimeout(() => {
          if (mounted) void loadProfile(userId);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      role: profile?.role ?? null,
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Supabase signIn error: ${error.message} (status: ${(error as any).status ?? "unknown"})`
          );
          // eslint-disable-next-line no-console
          console.error("Full error details:", { message: error.message, status: (error as any).status, code: (error as any).code, email });
          throw error;
        }
        if (data.user) {
          await loadProfile(data.user.id);
        }
        // eslint-disable-next-line no-console
        console.log("Supabase signIn success:", { user: data.user?.email, session: !!data.session, profileLoaded: !!profile });
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("signOut error", error);
        setProfile(null);
      },
      async refreshProfile() {
        if (session?.user) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
