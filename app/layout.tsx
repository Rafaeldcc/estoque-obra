"use client";

import "./globals.css";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) return null;

  if (!user && pathname !== "/login") {
    router.push("/login");
    return null;
  }

  if (pathname === "/login") {
    return (
      <html lang="pt-br">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="pt-br">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <div style={layout}>
          
          <aside style={sidebar}>
            <h2 style={{ color: "white", marginBottom: 20 }}>
              Estoque F.Vieira
            </h2>

            <nav style={{ marginTop: 10 }}>

              <MenuLink href="/dashboard">
                Dashboard
              </MenuLink>

              <MenuLink href="/dashboard/obras">
                Obras
              </MenuLink>

              <MenuLink href="/dashboard/cadastrar-material">
                Cadastrar Material
              </MenuLink>

              <MenuLink href="/estoque-geral">
                Estoque Geral
              </MenuLink>

              <MenuLink href="/buscar-material">
                Buscar Material
              </MenuLink>

              <MenuLink href="/movimentacoes">
                Movimentações
              </MenuLink>

              <MenuLink href="/retirada-material">
                Retirada Material
              </MenuLink>

              {/* NOVA ABA */}
              <MenuLink href="/relatorios">
                Relatórios PDF
              </MenuLink>

            </nav>

            <div style={{ marginTop: "auto", paddingTop: 30 }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Sair
              </button>
            </div>

          </aside>

          <main style={main}>
            <header style={header}>
              <h3 style={{ margin: 0 }}>
                Sistema Profissional de Controle de Estoque
              </h3>
            </header>

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

const layout = {
  display: "flex",
  height: "100vh",
};

const sidebar = {
  width: 250,
  backgroundColor: "#111827",
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
};

const main = {
  flex: 1,
  backgroundColor: "#f3f4f6",
  display: "flex",
  flexDirection: "column" as const,
};

const header = {
  backgroundColor: "white",
  padding: 20,
  borderBottom: "1px solid #e5e7eb",
};