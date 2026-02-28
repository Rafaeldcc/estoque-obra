"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

interface MaterialTotal {
  nome: string;
  unidade: string;
  total: number;
}

export default function EstoqueTotal() {
  const { user, loading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [setores, setSetores] = useState<string[]>([]);
  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);
  const [materiais, setMateriais] = useState<MaterialTotal[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!user) return;

    carregarRole();
  }, [user]);

  useEffect(() => {
    if (role === "admin" || role === "almoxarifado") {
      carregarSetores();
    }
  }, [role]);

  async function carregarRole() {
    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      setRole(snap.data().role);
    }
  }

  async function carregarSetores() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    const setoresSet = new Set<string>();

    for (const obraDoc of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      setoresSnap.forEach((setorDoc) => {
        setoresSet.add(setorDoc.data().nome);
      });
    }

    setSetores(Array.from(setoresSet).sort());
  }

  async function carregarMateriaisPorSetor(nomeSetor: string) {
    setCarregando(true);
    setSetorSelecionado(nomeSetor);

    const obrasSnap = await getDocs(collection(db, "obras"));
    const mapaMateriais: { [key: string]: MaterialTotal } = {};

    for (const obraDoc of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      for (const setorDoc of setoresSnap.docs) {
        if (
          setorDoc.data().nome.toLowerCase() === nomeSetor.toLowerCase()
        ) {
          const materiaisSnap = await getDocs(
            collection(
              db,
              "obras",
              obraDoc.id,
              "setores",
              setorDoc.id,
              "materiais"
            )
          );

          materiaisSnap.forEach((matDoc) => {
            const data = matDoc.data();
            const nomeMaterial = data.nome;
            const saldo = data.saldo ?? 0;

            if (!mapaMateriais[nomeMaterial]) {
              mapaMateriais[nomeMaterial] = {
                nome: nomeMaterial,
                unidade: data.unidade ?? "",
                total: saldo,
              };
            } else {
              mapaMateriais[nomeMaterial].total += saldo;
            }
          });
        }
      }
    }

    setMateriais(
      Object.values(mapaMateriais).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      )
    );

    setCarregando(false);
  }

  if (loading) return null;

  if (role !== "admin" && role !== "almoxarifado") {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Estoque Total</h1>

      {!setorSelecionado && (
        <div className="grid md:grid-cols-3 gap-4">
          {setores.map((setor) => (
            <button
              key={setor}
              onClick={() => carregarMateriaisPorSetor(setor)}
              className="bg-white shadow-md hover:shadow-xl transition p-6 rounded-xl text-lg font-semibold"
            >
              {setor}
            </button>
          ))}
        </div>
      )}

      {setorSelecionado && (
        <div>
          <button
            onClick={() => {
              setSetorSelecionado(null);
              setMateriais([]);
            }}
            className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            ← Voltar para setores
          </button>

          <h2 className="text-2xl font-semibold mb-6">
            Setor: {setorSelecionado}
          </h2>

          {carregando && <p>Carregando...</p>}

          {!carregando && (
            <div className="grid md:grid-cols-2 gap-6">
              {materiais.map((material) => (
                <div
                  key={material.nome}
                  className="bg-white rounded-xl shadow-md p-6 flex justify-between items-center"
                >
                  <span className="font-semibold text-lg">
                    {material.nome}
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {material.total} {material.unidade}
                  </span>
                </div>
              ))}

              {materiais.length === 0 && (
                <p className="text-gray-500">
                  Nenhum material encontrado.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}