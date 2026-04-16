"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Material = {
  id: string;
  nome: string;
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

      const subcategoriasSnap = await getDocs(
        collection(db, "obras", obra.id, "setores", setor.id, "subcategorias")
      );

      for (const sub of subcategoriasSnap.docs) {

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
            saldo: data.saldo ?? 0,
            unidade: data.unidade ?? "un",
            obra: obraNome,
            setor: setorNome,
            obraId: obra.id,
            setorId: setor.id
          });

        });

      }
    }
  }

  // ✅ AGORA SIM fora de todos os loops
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

  if (materiais.length === 0) {
    return;
  }

  const termo = normalizarTexto(valor);
  const palavras = termo.split(" ").filter(Boolean);

  const resultados = materiais.map((m) => {

    const nome = normalizarTexto(m.nome);

    let score = 0;

    // 🔥 match exato
    if (nome === termo) score += 100;

    // 🔥 começa com termo
    if (nome.startsWith(termo)) score += 50;

    // 🔥 contém termo
    if (nome.includes(termo)) score += 30;

    // 🔥 palavras separadas
    palavras.forEach(p => {
      if (nome.startsWith(p)) score += 20;
      else if (nome.includes(p)) score += 10;
    });

    return { ...m, score };

  });

  const filtrados = resultados
  .filter(r => r.score > 0 && r.saldo > 0)
  .sort((a, b) => b.score - a.score);

// 🔥 AGRUPAR POR MATERIAL
const mapa = new Map<string, any>();

filtrados.forEach(item => {

  const chave = normalizarTexto(item.nome);

  if (!mapa.has(chave)) {
    mapa.set(chave, {
      nome: item.nome,
      itens: []
    });
  }

  mapa.get(chave).itens.push(item);

});

setSugestoes(Array.from(mapa.values()).slice(0, 10));
}

  function abrirMaterial(material: Material) {

    router.push(
      `/resultado-busca?material=${encodeURIComponent(material.nome)}`
    );

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

            <div
              key={index}
              className="border-b"
            >

              <div className="p-3 font-bold bg-gray-50">
                {grupo.nome}
              </div>

              {grupo.itens.map((mat: Material, i: number) => (

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