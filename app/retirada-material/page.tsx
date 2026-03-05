"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  setorId: string;
};

export default function RetiradaMaterial() {
  const { user, loading } = useAuth();

  const [obras, setObras] = useState<any[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [quantidades, setQuantidades] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!user) return;
    carregarObras();
  }, [user]);

  useEffect(() => {
    if (obraSelecionada) {
      carregarMateriais(obraSelecionada);
    }
  }, [obraSelecionada]);

  async function carregarObras() {
    try {
      const snap = await getDocs(collection(db, "obras"));

      setObras(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar obras:", error);
    }
  }

  async function carregarMateriais(obraId: string) {
    try {
      const setoresSnap = await getDocs(
        collection(db, "obras", obraId, "setores")
      );

      let lista: Material[] = [];

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

        materiaisSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();

          lista.push({
            id: docSnap.id,
            nome: data.nome,
            saldo: data.saldo || 0,
            unidade: data.unidade || "",
            setorId: setorDoc.id,
          });
        });
      }

      setMateriais(lista);

    } catch (error) {
      console.error("Erro ao carregar materiais:", error);
    }
  }

  async function retirar(material: Material) {

    const qtd = quantidades[material.id];

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    if (!qtd || qtd <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    if (qtd > material.saldo) {
      alert("Quantidade maior que o saldo disponível.");
      return;
    }

    try {

      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        material.setorId,
        "materiais",
        material.id
      );

      await updateDoc(materialRef, {
        saldo: increment(-qtd),
        atualizadoEm: serverTimestamp(),
      });

      await registrarMovimentacao({
        materialId: material.id,
        materialNome: material.nome,
        tipo: "saida",
        quantidade: qtd,
        obraId: obraSelecionada,
        obraNome:
          obras.find((o) => o.id === obraSelecionada)?.nome || "",
        usuarioId: user.uid,
        usuarioNome: user.email || "",
      });

      alert("Material retirado com sucesso!");

      setQuantidades((prev) => ({
        ...prev,
        [material.id]: 0,
      }));

      carregarMateriais(obraSelecionada);

    } catch (error) {
      console.error("Erro ao retirar material:", error);
      alert("Erro ao retirar material.");
    }
  }

  if (loading) return null;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h2>Retirada de Material</h2>

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
            Saldo: {material.saldo} {material.unidade}
          </span>

          <div style={{ marginTop: 10 }}>
            <input
              type="number"
              placeholder="Quantidade"
              value={quantidades[material.id] || ""}
              onChange={(e) =>
                setQuantidades((prev) => ({
                  ...prev,
                  [material.id]: Number(e.target.value),
                }))
              }
              style={{ width: 100 }}
            />

            <button
              onClick={() => retirar(material)}
              style={{
                marginLeft: 10,
                background: "#dc2626",
                color: "white",
                padding: "6px 12px",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Retirar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}