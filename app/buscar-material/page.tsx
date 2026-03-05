"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Material = {
  nome: string;
  obra: string;
  setor: string;
  saldo: number;
  unidade: string;
};

export default function BuscarMaterial() {

  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [sugestoes, setSugestoes] = useState<Material[]>([]);

  useEffect(() => {
    carregarMateriais();
  }, []);

  async function carregarMateriais() {

    const lista: Material[] = [];

    const obrasSnap = await getDocs(collection(db, "obras"));

    for (const obra of obrasSnap.docs) {

      const obraNome = obra.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obra.id, "setores")
      );

      for (const setor of setoresSnap.docs) {

        const setorNome = setor.data().nome;

        const materiaisSnap = await getDocs(
          collection(
            db,
            "obras",
            obra.id,
            "setores",
            setor.id,
            "materiais"
          )
        );

        materiaisSnap.docs.forEach((doc) => {

          const data = doc.data();

          lista.push({
            nome: data.nome,
            saldo: data.saldo ?? 0,
            unidade: data.unidade ?? "un",
            obra: obraNome,
            setor: setorNome,
          });

        });

      }

    }

    lista.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    setMateriais(lista);
  }

  function pesquisar(valor: string) {

    setBusca(valor);

    if (!valor.trim()) {
      setSugestoes([]);
      return;
    }

    const filtrados = materiais.filter((m) =>
      m.nome.toLowerCase().includes(valor.toLowerCase()) && m.saldo > 0
    );

    // remover duplicados pelo nome
    const unicos = Array.from(
      new Map(
        filtrados.map((item) => [item.nome.toLowerCase(), item])
      ).values()
    );

    unicos.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    setSugestoes(unicos.slice(0, 10));
  }

  function abrirMaterial(material: Material) {

    const listaMateriais = materiais
      .filter((m) => m.nome.toLowerCase() === material.nome.toLowerCase())
      .filter((m) => m.saldo > 0);

    const data = encodeURIComponent(JSON.stringify(listaMateriais));

    router.push(`/material?data=${data}`);
  }

  return (

    <div className="max-w-xl mx-auto p-8">

      <h1 className="text-2xl font-bold mb-6">
        🔎 Buscar Material
      </h1>

      <input
        placeholder="Digite o nome do material..."
        value={busca}
        onChange={(e) => pesquisar(e.target.value)}
        className="w-full p-3 border rounded"
      />

      <div className="mt-2 border rounded bg-white shadow">

        {sugestoes.map((mat, index) => (

          <div
            key={index}
            onClick={() => abrirMaterial(mat)}
            className="p-2 cursor-pointer hover:bg-gray-100 border-b text-sm"
          >
            {mat.nome}
          </div>

        ))}

      </div>

    </div>

  );
}