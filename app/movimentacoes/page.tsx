"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

type Movimentacao = {
  id: string;
  materialNome: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  obraNome: string;
  usuarioNome: string;
  createdAt: any;
};

export default function MovimentacoesPage() {
  const { user, loading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;

    carregarRole();
  }, [user]);

  useEffect(() => {
    if (role === "admin" || role === "almoxarifado") {
      carregarMovimentacoes();
    }
  }, [role]);

  async function carregarRole() {
    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      setRole(snap.data().role);
    }
  }

  async function carregarMovimentacoes() {
    setCarregando(true);

    const q = query(
      collection(db, "movimentacoes"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Movimentacao[];

    setMovimentacoes(lista);
    setCarregando(false);
  }

  function formatarData(timestamp: any) {
    if (!timestamp) return "";
    try {
      return timestamp.toDate().toLocaleString("pt-BR");
    } catch {
      return "";
    }
  }

  if (loading) return null;

  if (role !== "admin" && role !== "almoxarifado") {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Histórico de Movimentações
      </h1>

      {carregando && <p>Carregando...</p>}

      {!carregando && movimentacoes.length === 0 && (
        <p className="text-gray-500">
          Nenhuma movimentação encontrada.
        </p>
      )}

      <div className="space-y-4">
        {movimentacoes.map((mov) => (
          <div
            key={mov.id}
            className={`p-5 rounded-xl shadow ${
              mov.tipo === "entrada"
                ? "bg-green-50"
                : "bg-red-50"
            }`}
          >
            <div className="flex justify-between">
              <strong>{mov.materialNome}</strong>

              <span
                className={`font-semibold ${
                  mov.tipo === "entrada"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {mov.tipo === "entrada"
                  ? "🟢 Entrada"
                  : "🔴 Saída"}
              </span>
            </div>

            <div className="mt-2">
              Quantidade:{" "}
              <b>
                {mov.quantidade}
              </b>
            </div>

            <div>
              Obra: <b>{mov.obraNome}</b>
            </div>

            <div>
              Usuário: <b>{mov.usuarioNome}</b>
            </div>

            <div className="text-sm text-gray-500 mt-2">
              {formatarData(mov.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}