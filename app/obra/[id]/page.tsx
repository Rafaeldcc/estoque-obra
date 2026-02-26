"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function Setores() {
  const params = useParams();
  const obraId = params.id as string;

  const [setores, setSetores] = useState<any[]>([]);
  const [novoSetor, setNovoSetor] = useState("");

  useEffect(() => {
    if (!obraId) return;

    const setoresRef = collection(
      db,
      "obras",
      obraId,
      "setores"
    );

    // 🔥 TEMPO REAL
    const unsubscribe = onSnapshot(
      setoresRef,
      (snapshot) => {
        const lista = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

        setSetores(lista);
      }
    );

    return () => unsubscribe();
  }, [obraId]);

  async function criarSetor() {
    if (!novoSetor.trim()) return;

    await addDoc(
      collection(
        db,
        "obras",
        obraId,
        "setores"
      ),
      {
        nome: novoSetor.trim(),
        criadoEm: new Date(),
      }
    );

    setNovoSetor("");
  }

  async function excluirSetor(id: string) {
    await deleteDoc(
      doc(
        db,
        "obras",
        obraId,
        "setores",
        id
      )
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Setores
      </h1>

      <div className="flex gap-2">
        <input
          placeholder="Nome do setor"
          value={novoSetor}
          onChange={(e) =>
            setNovoSetor(e.target.value)
          }
          className="flex-1 border p-2 rounded"
        />

        <button
          onClick={criarSetor}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Criar
        </button>
      </div>

      {setores.map((setor) => (
        <div
          key={setor.id}
          className="flex justify-between items-center border p-4 rounded"
        >
          <Link
            href={`/obra/${obraId}/setor/${setor.id}`}
            className="font-medium"
          >
            {setor.nome}
          </Link>

          <button
            onClick={() =>
              excluirSetor(setor.id)
            }
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}