"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Material = {
  id: string;
  nome: string;
  nomePadrao: string;
  obra: string;
  setor: string;
  saldo: number;
  unidade: string;
  obraId: string;
  setorId: string;
};

type GrupoMaterial = {
  nome: string;
  itens: Material[];
};

export default function BuscarMaterial() {

  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [sugestoes, setSugestoes] = useState<GrupoMaterial[]>([]);

  useEffect(() => {
    carregarMateriais();
  }, []);

  // 🔥 NORMALIZAÇÃO FORTE
  function normalizar(texto: string) {
    return texto
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/mm/g, "")
      .trim();
  }

  // 🔥 DISTÂNCIA (ERRO DE DIGITAÇÃO)
  function similaridade(a: string, b: string) {
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }

  async function carregarMateriais() {

    const lista: Material[] = [];

    const obrasSnap = await getDocs(collection(db, "obras"));

    await Promise.all(
      obrasSnap.docs.map(async (obra) => {

        const obraNome = obra.data().nome;

        const setoresSnap = await getDocs(
          collection(db, "obras", obra.id, "setores")
        );

        await Promise.all(
          setoresSnap.docs.map(async (setor) => {

            const setorNome = setor.data().nome;

            const subcategoriasSnap = await getDocs(
              collection(db, "obras", obra.id, "setores", setor.id, "subcategorias")
            );

            await Promise.all(
              subcategoriasSnap.docs.map(async (sub) => {

                const materiaisSnap = await getDocs(
                  collection(
                    db,
                    "obras",
                    obra.id,
                    "setores",
                    setor.id,
                    "subcategorias",
                    sub.id,
                    "materiais"
                  )
                );

                materiaisSnap.forEach((docSnap) => {

                  const data = docSnap.data();

                  if (!data?.nome) return;

                  lista.push({
                    id: docSnap.id,
                    nome: data.nome,
                    nomePadrao: normalizar(data.nome),
                    saldo: data.saldo ?? 0,
                    unidade: data.unidade ?? "un",
                    obra: obraNome,
                    setor: setorNome,
                    obraId: obra.id,
                    setorId: setor.id
                  });

                });

              })
            );

          })
        );

      })
    );

    setMateriais(lista);
  }

  function pesquisar(valor: string) {

    setBusca(valor);

    if (!valor.trim()) {
      setSugestoes([]);
      return;
    }

    const termo = normalizar(valor);

    const resultados = materiais.map((m) => {

      const nome = m.nomePadrao;

      let score = 0;

      if (nome === termo) score += 100;
      if (nome.startsWith(termo)) score += 60;
      if (nome.includes(termo)) score += 40;

      // 🔥 tolerância erro digitação
      const sim = similaridade(nome, termo);
      if (sim > 0.6) score += sim * 50;

      return { ...m, score };

    });

    const filtrados = resultados
      .filter(r => r.score > 10 && r.saldo > 0)
      .sort((a, b) => b.score - a.score);

    // 🔥 AGRUPAMENTO PERFEITO
    const mapa = new Map<string, GrupoMaterial>();

    filtrados.forEach(item => {

      const chave = item.nomePadrao;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          nome: item.nome,
          itens: []
        });
      }

      mapa.get(chave)!.itens.push(item);

    });

    setSugestoes(Array.from(mapa.values()).slice(0, 10));
  }

  function abrirMaterial(material: Material) {
    router.push(`/material/${material.id}`); // 🔥 agora usa ID (nunca erra)
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

      {sugestoes.length > 0 && (

        <div className="mt-2 border rounded bg-white shadow max-h-[420px] overflow-y-auto">

          {sugestoes.map((grupo, index) => (

            <div key={index} className="border-b">

              <div className="p-3 font-bold bg-gray-50 flex justify-between">
                <span>{grupo.nome}</span>
                <span className="text-blue-600">
                  Total: {grupo.itens.reduce((acc, i) => acc + i.saldo, 0)}
                </span>
              </div>

              {grupo.itens.map((mat, i) => (

                <div
                  key={i}
                  onClick={() => abrirMaterial(mat)}
                  className="p-3 cursor-pointer hover:bg-gray-100 pl-6"
                >

                  <div className="text-sm text-gray-700">
                    {mat.setor} • {mat.obra}
                  </div>

                  <div className="text-xs text-gray-500">
                    Estoque: {mat.saldo} {mat.unidade}
                  </div>

                </div>

              ))}

            </div>

          ))}

        </div>

      )}

    </div>

  );

}