"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
};

export default function Controle() {
  const { user, loading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [obras, setObras] = useState<any[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [quantidades, setQuantidades] = useState<{ [key: string]: number }>({});
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!user) return;

    carregarRole();
    carregarObras();
  }, [user]);

  useEffect(() => {
    if (obraSelecionada) {
      carregarMateriais(obraSelecionada);
    }
  }, [obraSelecionada]);

  async function carregarRole() {
    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      setRole(snap.data().role);
    }
  }

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

  function mostrarMensagem(texto: string) {
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 3000);
  }

  async function entrada(material: Material) {
    if (role !== "admin" && role !== "almoxarifado") {
      alert("Você não tem permissão.");
      return;
    }

    const qtd = quantidades[material.id];
    if (!qtd || qtd <= 0) return;

    if (!user) return;

    try {
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
          atualizadoEm: serverTimestamp(),
        }).catch(() => {});
      }

      await registrarMovimentacao({
        materialId: material.id,
        materialNome: material.nome,
        tipo: "entrada",
        quantidade: qtd,
        obraId: obraSelecionada,
        obraNome:
          obras.find((o) => o.id === obraSelecionada)?.nome || "",
        usuarioId: user.uid,
        usuarioNome: user.email || "",
      });

      mostrarMensagem("Entrada registrada com sucesso!");
      setQuantidades((prev) => ({ ...prev, [material.id]: 0 }));
      carregarMateriais(obraSelecionada);

    } catch (error) {
      console.error(error);
      alert("Erro na entrada.");
    }
  }

  async function saida(material: Material) {
    if (role !== "admin" && role !== "almoxarifado") {
      alert("Você não tem permissão.");
      return;
    }

    const qtd = quantidades[material.id];
    if (!qtd || qtd <= 0) return;

    if (qtd > material.saldo) {
      alert("Quantidade maior que o saldo disponível.");
      return;
    }

    if (!user) return;

    try {
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
          atualizadoEm: serverTimestamp(),
        }).catch(() => {});
      }

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

      mostrarMensagem("Saída registrada com sucesso!");
      setQuantidades((prev) => ({ ...prev, [material.id]: 0 }));
      carregarMateriais(obraSelecionada);

    } catch (error) {
      console.error(error);
      alert("Erro na saída.");
    }
  }

  async function excluir(material: Material) {
    if (role !== "admin") {
      alert("Apenas administrador pode excluir.");
      return;
    }

    if (!confirm("Deseja excluir este material?")) return;

    try {
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

      mostrarMensagem("Material excluído com sucesso!");
      carregarMateriais(obraSelecionada);

    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    }
  }

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Controle de Estoque</h2>

      {mensagem && (
        <div className="mb-4 bg-green-600 text-white p-3 rounded">
          {mensagem}
        </div>
      )}

      <select
        className="w-full p-3 border rounded mb-6"
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
          className="bg-white p-5 rounded-xl shadow mb-4"
        >
          <div className="flex justify-between mb-3">
            <b>{material.nome}</b>
            <span>
              Saldo: {material.saldo} {material.unidade}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Qtd"
              value={quantidades[material.id] || ""}
              onChange={(e) =>
                setQuantidades((prev) => ({
                  ...prev,
                  [material.id]: Number(e.target.value),
                }))
              }
              className="border p-2 w-24 rounded"
            />

            <button
              onClick={() => entrada(material)}
              className="bg-green-600 text-white px-4 rounded"
            >
              Entrada
            </button>

            <button
              onClick={() => saida(material)}
              className="bg-orange-500 text-white px-4 rounded"
            >
              Saída
            </button>

            {role === "admin" && (
              <button
                onClick={() => excluir(material)}
                className="bg-red-600 text-white px-4 rounded"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}