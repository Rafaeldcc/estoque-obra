"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";

type Resultado = {
  nome: string;
  saldo: number;
  unidade: string;
  obra: string;
  setor: string;
};

export default function BuscarMaterial() {

  const [busca, setBusca] = useState("");
  const [materiais, setMateriais] = useState<Resultado[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);

  useEffect(() => {
    carregarMateriais();
  }, []);

  async function carregarMateriais() {

    const lista: Resultado[] = [];

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
            saldo: data.saldo || 0,
            unidade: data.unidade || "",
            obra: obraNome,
            setor: setorNome,
          });

        });

      }

    }

    setMateriais(lista);
  }

  function pesquisar(valor: string) {

    setBusca(valor);

    if (!valor.trim()) {
      setResultados([]);
      return;
    }

    const filtrados = materiais.filter((m) =>
      m.nome.toLowerCase().includes(valor.toLowerCase())
    );

    filtrados.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    setResultados(filtrados);
  }

  return (

    <div className="max-w-4xl mx-auto p-8">

      <h1 className="text-2xl font-bold mb-6">
        🔎 Busca Global de Materiais
      </h1>

      <input
        placeholder="Digite o nome do material..."
        value={busca}
        onChange={(e) => pesquisar(e.target.value)}
        className="w-full p-3 border rounded mb-6"
      />

      {resultados.length === 0 && busca && (
        <p className="text-gray-500">
          Nenhum material encontrado.
        </p>
      )}

      <div className="space-y-4">

        {resultados.map((mat, index) => (

          <div
            key={index}
            className="border p-4 rounded shadow-sm bg-white"
          >

            <div className="flex justify-between">

              <strong>{mat.nome}</strong>

              <span className="font-semibold">
                {mat.saldo} {mat.unidade}
              </span>

            </div>

            <div className="text-sm text-gray-600 mt-1">
              Obra: <b>{mat.obra}</b>
            </div>

            <div className="text-sm text-gray-600">
              Setor: <b>{mat.setor}</b>
            </div>

          </div>

        ))}

      </div>

    </div>

  );

}