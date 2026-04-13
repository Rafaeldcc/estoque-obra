"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

type Movimentacao = {
  id: string;
  materialNome: string;
  tipo: "entrada" | "saida" | "transferencia";
  quantidade: number;

  obraNome?: string;
  obraOrigem?: string;
  obraDestino?: string;

  usuarioNome: string;
  createdAt: any;
};

export default function Historico() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarMovimentacoes();
  }, []);

  async function carregarMovimentacoes() {
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
    setLoading(false);
  }

  function formatarData(timestamp: any) {
    if (!timestamp) return "";
    const data = timestamp.toDate();
    return data.toLocaleString("pt-BR");
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Carregando histórico...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto" }}>
      <h2>Histórico de Movimentações</h2>

      <div style={{ marginTop: 30 }}>
        {movimentacoes.length === 0 && (
          <p>Nenhuma movimentação encontrada.</p>
        )}

        {movimentacoes.map((mov) => (
          <div
            key={mov.id}
            style={{
              border: "1px solid #ddd",
              padding: 15,
              marginBottom: 15,
              borderRadius: 8,
              backgroundColor:
                mov.tipo === "entrada"
                  ? "#ecfdf5"
                  : mov.tipo === "saida"
                  ? "#fef2f2"
                  : "#eff6ff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{mov.materialNome}</strong>

              <span>
                {mov.tipo === "entrada" && "🟢 Entrada"}
                {mov.tipo === "saida" && "🔴 Saída"}
                {mov.tipo === "transferencia" && "🔵 Transferência"}
              </span>
            </div>

            <div style={{ marginTop: 8 }}>
              Quantidade: <b>{mov.quantidade}</b>
            </div>

            {mov.tipo === "transferencia" ? (
              <>
                <div>
                  Obra origem: <b>{mov.obraOrigem}</b>
                </div>

                <div>
                  Obra destino: <b>{mov.obraDestino}</b>
                </div>

                <div style={{ marginTop: 5 }}>
                  <b>
                    {mov.obraOrigem} → {mov.obraDestino}
                  </b>
                </div>
              </>
            ) : (
              <div>
                Obra: <b>{mov.obraNome}</b>
              </div>
            )}

            <div>
              Usuário: <b>{mov.usuarioNome}</b>
            </div>

            <div style={{ marginTop: 5, fontSize: 12, color: "#666" }}>
              {formatarData(mov.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}