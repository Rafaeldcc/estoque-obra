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
  subId: string; // 🔥 NOVO
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

  function normalizar(texto: string) {
    return texto
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/mm/g, "")
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

        const subSnap = await getDocs(
          collection(db, "obras", obra.id, "setores", setor.id, "subcategorias")
        );

        for (const sub of subSnap.docs) {

          const matSnap = await getDocs(
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

          matSnap.forEach(docSnap => {

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
              setorId: setor.id,
              subId: sub.id // 🔥 IMPORTANTE
            });

          });

        }
      }
    }

    setMateriais(lista);
  }

  function pesquisar(valor: string) {

    setBusca(valor);

    if (!valor.trim()) {
      setSugestoes([]);
      return;
    }

    const termo = normalizar(valor);

    const filtrados = materiais
      .filter(m =>
        m.nomePadrao.includes(termo) && m.saldo > 0
      );

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
    router.push(
      `/obra/${material.obraId}/setor/${material.setorId}?sub=${material.subId}&material=${material.id}`
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

            <div key={index} className="border-b">

              <div className="p-3 font-bold bg-gray-50">
                {grupo.nome}
              </div>

              {grupo.itens.map((mat, i) => (

                <div
                  key={i}
                  onClick={() => abrirMaterial(mat)}
                  className="p-3 cursor-pointer hover:bg-gray-100 pl-6"
                >

                  <div className="text-sm">
                    {mat.setor} • {mat.obra}
                  </div>

                  <div className="text-xs text-gray-500">
                    {mat.saldo} {mat.unidade}
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