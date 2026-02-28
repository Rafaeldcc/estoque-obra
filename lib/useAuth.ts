"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setUser(null);
        setLoading(false);
        router.replace("/login");
      } else {
        setUser(usuario);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return { user, loading };
}