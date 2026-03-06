"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Obra = {
  id: string;
  nome: string;
};

type LinhaEstoque = {
  material: string;
  setor: string;
  total: number;
  obras: { [key: string]: number };
};

export default function EstoqueGeral() {

  const [obras, setObras] = useState<Obra[]>([]);
  const [tabela, setTabela] = useState<LinhaEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);

  useEffect(() => {
    carregarEstoque();
  }, []);

  async function carregarEstoque() {

    const obrasSnap = await getDocs(collection(db, "obras"));

    const listaObras: Obra[] = obrasSnap.docs.map((doc) => ({
      id: doc.id,
      nome: doc.data().nome
    }));

    setObras(listaObras);

    const mapa: any = {};

    for (const obra of listaObras) {

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

        materiaisSnap.forEach(mat => {

          const data = mat.data();
          const materialNome = data.nome;
          const saldo = data.saldo ?? 0;

          const chave = materialNome + "_" + setorNome;

          if (!mapa[chave]) {

            mapa[chave] = {
              material: materialNome,
              setor: setorNome,
              total: 0,
              obras: {}
            };

          }

          mapa[chave].obras[obra.nome] = saldo;
          mapa[chave].total += saldo;

        });

      }

    }

    setTabela(Object.values(mapa));
    setLoading(false);

  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Carregando estoque geral...
      </div>
    );
  }

  const setores = Array.from(new Set(tabela.map(l => l.setor)));

  if (!setorSelecionado) {

    const dadosSetores = setores.map(setor => {

      const total = tabela
        .filter(l => l.setor === setor)
        .reduce((acc, l) => acc + l.total, 0);

      return { setor, total };

    });

    return (

      <div className="max-w-6xl mx-auto p-8">

        <h1 className="text-3xl font-bold mb-8">
          Estoque por Setor
        </h1>

        <table className="w-full border">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">Setor</th>
              <th className="p-3 border">Total</th>
            </tr>
          </thead>

          <tbody>

            {dadosSetores.map((s, i) => (

              <tr
                key={i}
                className="border cursor-pointer hover:bg-gray-100"
                onClick={() => setSetorSelecionado(s.setor)}
              >

                <td className="p-3 border font-semibold text-blue-600">
                  {s.setor}
                </td>

                <td className="p-3 border text-center font-bold">
                  {s.total}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    );

  }

  const materiais = tabela.filter(l => l.setor === setorSelecionado);

  return (

    <div className="max-w-7xl mx-auto p-8">

      <button
        onClick={() => setSetorSelecionado(null)}
        className="mb-6 bg-gray-200 px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h1 className="text-3xl font-bold mb-8">
        {setorSelecionado}
      </h1>

      <table className="w-full border">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 border text-left">
              Material
            </th>

            {obras.map((obra) => (
              <th key={obra.id} className="p-3 border">
                {obra.nome}
              </th>
            ))}

            <th className="p-3 border">
              Total
            </th>

          </tr>

        </thead>

        <tbody>

          {materiais.map((linha, index) => (

            <tr key={index} className="border">

              <td className="p-3 border font-semibold">
                {linha.material}
              </td>

              {obras.map((obra) => (

                <td key={obra.id} className="p-3 border text-center">
                  {linha.obras[obra.nome] ?? 0}
                </td>

              ))}

              <td className="p-3 border font-bold text-center">
                {linha.total}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}