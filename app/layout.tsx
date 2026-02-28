"use client";

import "./globals.css";
import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function logout() {
    await signOut(auth);
    window.localStorage.clear();
    window.sessionStorage.clear();
    router.replace("/login");
    window.location.reload();
  }

  if (loading) return null;

  return (
    <html lang="pt-br">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", height: "100vh" }}>
          
          {/* 🔒 MENU SÓ SE ESTIVER LOGADO */}
          {user && (
            <aside
              style={{
                width: 250,
                backgroundColor: "#111827",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                color: "white",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Estoque Obra v2</h2>

              <nav>
                <MenuLink href="/dashboard">Dashboard</MenuLink>
                <MenuLink href="/dashboard/obras">Obras</MenuLink>
                <MenuLink href="/dashboard/cadastrar-material">
                  Cadastrar Material
                </MenuLink>
                <MenuLink href="/dashboard/estoque-total">
                  Estoque Total
                </MenuLink>
                <MenuLink href="/movimentacoes">
                  Movimentações
                </MenuLink>
              </nav>

              <div style={{ marginTop: "auto" }}>
                <button
                  onClick={logout}
                  style={{
                    padding: 10,
                    width: "100%",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginTop: 20,
                  }}
                >
                  Sair
                </button>
              </div>
            </aside>
          )}

          <main
            style={{
              flex: 1,
              backgroundColor: "#f3f4f6",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {user && (
              <header
                style={{
                  backgroundColor: "white",
                  padding: 20,
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  Sistema Profissional de Controle de Estoque
                </h3>
              </header>
            )}

            <div style={{ padding: 30 }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function MenuLink({ href, children }: any) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "12px 15px",
        color: "white",
        textDecoration: "none",
        borderRadius: 6,
        marginBottom: 8,
        background: "rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </Link>
  );
}