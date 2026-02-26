"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Obra {
  id: string;
  nome: string;
}

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [nomeObra, setNomeObra] = useState("");

  async function carregarObras() {
    const snapshot = await getDocs(collection(db, "obras"));

    const lista: Obra[] = [];
    snapshot.forEach((docSnap) => {
      lista.push({
        id: docSnap.id,
        nome: docSnap.data().nome,
      });
    });

    setObras(lista);
  }

  useEffect(() => {
    carregarObras();
  }, []);

  async function criarObra() {
    if (!nomeObra.trim()) return;

    await addDoc(collection(db, "obras"), {
      nome: nomeObra.trim(),
      criadoEm: new Date(),
    });

    setNomeObra("");
    carregarObras();
  }

  async function excluirObra(id: string) {
    if (!confirm("Deseja realmente excluir esta obra?")) return;

    await deleteDoc(doc(db, "obras", id));
    carregarObras();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Gestão de Obras</h1>

      {/* Criar Obra */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">Criar Nova Obra</h2>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Nome da obra"
            value={nomeObra}
            onChange={(e) => setNomeObra(e.target.value)}
            className="flex-1 p-3 border rounded-lg"
          />

          <button
            onClick={criarObra}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg"
          >
            Criar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Obras Cadastradas</h2>

        {obras.map((obra) => (
          <div
            key={obra.id}
            className="flex justify-between items-center bg-white p-5 rounded-xl shadow"
          >
            <Link
              href={`/obra/${obra.id}`}
              className="font-medium text-lg hover:text-blue-600"
            >
              {obra.nome}
            </Link>

            <button
              onClick={() => excluirObra(obra.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Excluir
            </button>
          </div>
        ))}

        {obras.length === 0 && (
          <div className="text-gray-500 text-center py-10">
            Nenhuma obra cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}