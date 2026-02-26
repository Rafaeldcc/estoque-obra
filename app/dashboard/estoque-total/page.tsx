"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MaterialTotal {
  nome: string;
  unidade: string;
  total: number;
}

export default function EstoqueTotal() {
  const [setores, setSetores] = useState<string[]>([]);
  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);
  const [materiais, setMateriais] = useState<MaterialTotal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarSetores();
  }, []);

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
    setLoading(true);
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

    setMateriais(Object.values(mapaMateriais).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    ));

    setLoading(false);
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Estoque Total </h1>

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
            className="mb-6 bg-gray-200 px-4 py-2 rounded"
          >
            ← Voltar para setores
          </button>

          <h2 className="text-2xl font-semibold mb-6">
            Setor: {setorSelecionado}
          </h2>

          {loading && <p>Carregando...</p>}

          {!loading && (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}