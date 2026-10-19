import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async (u: User | null) => {
      setUser(u);
      if (u) {
        const { data } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
        setIsAdmin(!!data);
      } else setIsAdmin(false);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => check(s?.user ?? null), 0);
    });
    supabase.auth.getUser().then(({ data }) => check(data.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, isAdmin, loading };
}
