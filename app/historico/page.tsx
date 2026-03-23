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
  tipo: "entrada" | "saida";
  quantidade: number;
  obraNome: string;
  usuarioNome: string;
  createdAt: any;
};

export default function Historico() {

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 NOVO: mês selecionado
  const [mesSelecionado, setMesSelecionado] = useState(
    new Date().getMonth() + 1
  );

  useEffect(() => {
    carregarMovimentacoes();
  }, [mesSelecionado]); // 🔥 atualiza ao trocar mês


  async function carregarMovimentacoes() {

    setLoading(true);

    const q = query(
      collection(db, "movimentacoes"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const lista = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((mov: any) => {

        if (!mov.createdAt) return false;

        try {

          const data = mov.createdAt.toDate();
          const mes = data.getMonth() + 1;

          return mes === mesSelecionado;

        } catch {

          return false;

        }

      }) as Movimentacao[];

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

      {/* 🔥 HEADER COM FILTRO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Histórico de Movimentações</h2>

        <select
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 6 }}
        >
          <option value={1}>Janeiro</option>
          <option value={2}>Fevereiro</option>
          <option value={3}>Março</option>
          <option value={4}>Abril</option>
          <option value={5}>Maio</option>
          <option value={6}>Junho</option>
          <option value={7}>Julho</option>
          <option value={8}>Agosto</option>
          <option value={9}>Setembro</option>
          <option value={10}>Outubro</option>
          <option value={11}>Novembro</option>
          <option value={12}>Dezembro</option>
        </select>
      </div>


      {/* 🔥 TOTAL DO MÊS */}
      <div style={{ marginTop: 15, fontWeight: "bold" }}>
        Total movimentado no mês:{" "}
        {movimentacoes.reduce((acc, mov) => acc + mov.quantidade, 0)}
      </div>


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
                mov.tipo === "entrada" ? "#ecfdf5" : "#fef2f2",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{mov.materialNome}</strong>

              <span>
                {mov.tipo === "entrada" ? "🟢 Entrada" : "🔴 Saída"}
              </span>
            </div>

            <div style={{ marginTop: 8 }}>
              Quantidade: <b>{mov.quantidade}</b>
            </div>

            <div>
              Obra: <b>{mov.obraNome}</b>
            </div>

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