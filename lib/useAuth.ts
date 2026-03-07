"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export function useAuth() {

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {

      if (!usuario) {

        setUser(null);
        setRole(null);
        setLoading(false);

        router.replace("/login");

      } else {

        setUser(usuario);

        try {

          const snap = await getDoc(doc(db, "usuarios", usuario.uid));

          if (snap.exists()) {

            const data = snap.data();
            setRole(data.role || "usuario");

          } else {

            setRole("usuario");

          }

        } catch (error) {

          console.error("Erro ao buscar role:", error);
          setRole("usuario");

        }

        setLoading(false);

      }

    });

    return () => unsubscribe();

  }, [router]);

  return { user, role, loading };

}