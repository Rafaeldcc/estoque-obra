"use client";

import { useAuth } from "@/lib/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return null; // 🔒 BLOQUEIA TOTALMENTE

  return <>{children}</>;
}