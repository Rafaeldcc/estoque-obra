"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

interface Obra {
  id: string;
  nome: string;
}

export default function ObrasPage() {
  const { user, loading } = useAuth();

  const [obras, setObras] = useState<Obra[]>([]);
  const [nomeObra, setNomeObra] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    carregarRole();
    carregarObras();
  }, [user]);

  async function carregarRole() {
    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      setRole(snap.data().role);
    }
  }

  async function carregarObras() {
    const q = query(
      collection(db, "obras"),
      orderBy("criadoEm", "desc")
    );

    const snapshot = await getDocs(q);

    const lista: Obra[] = [];
    snapshot.forEach((docSnap) => {
      lista.push({
        id: docSnap.id,
        nome: docSnap.data().nome,
      });
    });

    setObras(lista);
  }

  async function criarObra() {
    if (!nomeObra.trim()) return;
    if (role !== "admin") {
      alert("Apenas administrador pode criar obras.");
      return;
    }

    try {
      await addDoc(collection(db, "obras"), {
        nome: nomeObra.trim(),
        criadoEm: serverTimestamp(),
      });

      setNomeObra("");
      carregarObras();
    } catch (error) {
      console.error("Erro ao criar obra:", error);
      alert("Erro ao criar obra.");
    }
  }

  async function excluirObra(id: string) {
    if (role !== "admin") {
      alert("Apenas administrador pode excluir obras.");
      return;
    }

    if (!confirm("Deseja realmente excluir esta obra?")) return;

    try {
      await deleteDoc(doc(db, "obras", id));
      carregarObras();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir obra.");
    }
  }

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Gestão de Obras</h1>

      {/* Criar Obra */}
      {role === "admin" && (
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
      )}

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

            {role === "admin" && (
              <button
                onClick={() => excluirObra(obra.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Excluir
              </button>
            )}
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