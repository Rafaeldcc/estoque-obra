"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
};

export default function Controle() {
  const [obras, setObras] = useState<any[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [quantidades, setQuantidades] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    if (obraSelecionada) {
      carregarMateriais(obraSelecionada);
    }
  }, [obraSelecionada]);

  async function carregarObras() {
    const snap = await getDocs(collection(db, "obras"));
    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setObras(lista);
  }

  async function carregarMateriais(obraId: string) {
    const setoresSnap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    let todos: any[] = [];

    for (const setorDoc of setoresSnap.docs) {
      const materiaisSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setorDoc.id,
          "materiais"
        )
      );

      materiaisSnap.docs.forEach((doc) => {
        const data = doc.data();
        todos.push({
          id: doc.id,
          nome: data.nome,
          saldo: data.saldo || 0,
          unidade: data.unidade || "",
        });
      });
    }

    // Agrupar materiais iguais
    const agrupado: { [key: string]: Material } = {};

    todos.forEach((item) => {
      if (!agrupado[item.id]) {
        agrupado[item.id] = { ...item };
      } else {
        agrupado[item.id].saldo += item.saldo || 0;
      }
    });

    setMateriais(Object.values(agrupado));
  }

  async function entrada(material: Material) {
    const qtd = quantidades[material.id];
    if (!qtd || qtd <= 0) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const setoresSnap = await getDocs(
      collection(db, "obras", obraSelecionada, "setores")
    );

    for (const setorDoc of setoresSnap.docs) {
      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        setorDoc.id,
        "materiais",
        material.id
      );

      await updateDoc(materialRef, {
        saldo: increment(qtd),
        atualizadoEm: new Date(),
      }).catch(() => {});
    }

    await registrarMovimentacao({
      materialId: material.id,
      materialNome: material.nome || "",
      tipo: "entrada",
      quantidade: qtd,
      obraId: obraSelecionada,
      obraNome:
        obras.find((o) => o.id === obraSelecionada)?.nome || "",
      usuarioId: user.uid,
      usuarioNome: user.email || "",
    });

    carregarMateriais(obraSelecionada);
  }

  async function saida(material: Material) {
    const qtd = quantidades[material.id];
    if (!qtd || qtd <= 0) return;

    if (qtd > material.saldo) {
      alert("Quantidade maior que o saldo disponível.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const setoresSnap = await getDocs(
      collection(db, "obras", obraSelecionada, "setores")
    );

    for (const setorDoc of setoresSnap.docs) {
      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        setorDoc.id,
        "materiais",
        material.id
      );

      await updateDoc(materialRef, {
        saldo: increment(-qtd),
        atualizadoEm: new Date(),
      }).catch(() => {});
    }

    await registrarMovimentacao({
      materialId: material.id,
      materialNome: material.nome || "",
      tipo: "saida",
      quantidade: qtd,
      obraId: obraSelecionada,
      obraNome:
        obras.find((o) => o.id === obraSelecionada)?.nome || "",
      usuarioId: user.uid,
      usuarioNome: user.email || "",
    });

    carregarMateriais(obraSelecionada);
  }

  async function excluir(material: Material) {
    const setoresSnap = await getDocs(
      collection(db, "obras", obraSelecionada, "setores")
    );

    for (const setorDoc of setoresSnap.docs) {
      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        setorDoc.id,
        "materiais",
        material.id
      );

      await deleteDoc(materialRef).catch(() => {});
    }

    carregarMateriais(obraSelecionada);
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h2>Controle de Estoque</h2>

      <select
        style={{ width: "100%", padding: 10 }}
        onChange={(e) => setObraSelecionada(e.target.value)}
      >
        <option value="">Selecionar obra</option>
        {obras.map((obra) => (
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      {materiais.map((material) => (
        <div
          key={material.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginTop: 20,
            borderRadius: 8,
          }}
        >
          <b>{material.nome}</b>

          <span style={{ float: "right" }}>
            Saldo Total: {material.saldo} {material.unidade}
          </span>

          <div style={{ marginTop: 10 }}>
            <input
              type="number"
              placeholder="Qtd"
              onChange={(e) =>
                setQuantidades((prev) => ({
                  ...prev,
                  [material.id]: Number(e.target.value),
                }))
              }
              style={{ width: 80 }}
            />

            <button
              style={{ marginLeft: 10, background: "green", color: "white" }}
              onClick={() => entrada(material)}
            >
              Entrada
            </button>

            <button
              style={{ marginLeft: 10, background: "orange", color: "white" }}
              onClick={() => saida(material)}
            >
              Saída
            </button>

            <button
              style={{ marginLeft: 10, background: "red", color: "white" }}
              onClick={() => excluir(material)}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}