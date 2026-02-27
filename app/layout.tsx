import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <div style={layout}>
          
          {/* MENU LATERAL */}
          <aside style={sidebar}>
            <h2 style={{ color: "white" }}>Estoque Obra v2</h2>

            <nav style={{ marginTop: 30 }}>
              <MenuLink href="/dashboard">Dashboard</MenuLink>

              <MenuLink href="/dashboard/obras">
                Obras
              </MenuLink>

              <MenuLink href="/dashboard/cadastrar-material">
                Cadastrar Material
              </MenuLink>

              <MenuLink href="/dashboard/estoque-total">
                Estoque Total
              </MenuLink>

              {/* ✅ BOTÃO CORRETO */}
              <MenuLink href="/historico">
                Movimentações
              </MenuLink>
            </nav>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <main style={main}>
            <header style={header}>
              <h3>Sistema de Controle de Estoque</h3>
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