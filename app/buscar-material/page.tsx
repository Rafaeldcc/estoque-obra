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

  function normalizarTexto(texto: string) {
    return texto
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

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

        materiaisSnap.forEach((doc) => {

          const data = doc.data();

          if (!data?.nome) return;

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

    const buscaNormalizada = normalizarTexto(valor);

    const filtrados = materiais.filter((m) => {

      const nomeNormalizado = normalizarTexto(m.nome);

      const palavras = nomeNormalizado.split(" ");

      const encontrou = palavras.some((p) =>
        p.startsWith(buscaNormalizada)
      );

      return encontrou && m.saldo > 0;

    });

    const mapa = new Map<string, Material>();

    filtrados.forEach((item) => {

      const chave = normalizarTexto(item.nome);

      if (!mapa.has(chave)) {
        mapa.set(chave, item);
      }

    });

    const unicos = Array.from(mapa.values());

    unicos.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    setSugestoes(unicos.slice(0, 12));

  }

  function abrirMaterial(material: Material) {

    const listaMateriais = materiais
      .filter((m) =>
        normalizarTexto(m.nome) === normalizarTexto(material.nome)
      )
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
        placeholder="Digite nome, número ou tipo..."
        value={busca}
        onChange={(e) => pesquisar(e.target.value)}
        className="w-full p-3 border rounded"
      />

      {sugestoes.length > 0 && (

        <div className="mt-2 border rounded bg-white shadow max-h-[420px] overflow-y-auto">

          {sugestoes.map((mat, index) => (

            <div
              key={index}
              onClick={() => abrirMaterial(mat)}
              className="p-3 cursor-pointer hover:bg-gray-100 border-b"
            >

              <div className="font-medium">
                {mat.nome}
              </div>

              <div className="text-xs text-gray-500">

                {mat.setor} • {mat.obra}  
                • Estoque: {mat.saldo} {mat.unidade}

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}