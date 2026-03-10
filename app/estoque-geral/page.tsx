"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

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

  const { user } = useAuth();

  const [obras, setObras] = useState<Obra[]>([]);
  const [tabela, setTabela] = useState<LinhaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);

  useEffect(() => {

    if (!user) return;

    carregarUsuario();

  }, [user]);



  async function carregarUsuario() {

    try {

      if (!user) return;

      const snap = await getDoc(doc(db, "usuarios", user.uid));

      if (!snap.exists()) {
        console.error("Usuário não encontrado");
        setLoading(false);
        return;
      }

      const data = snap.data();

      if (!data.empresaId) {
        console.error("empresaId não encontrado");
        setLoading(false);
        return;
      }

      await carregarEstoque(data.empresaId);

    } catch (error) {

      console.error("Erro ao carregar usuário:", error);
      setLoading(false);

    }

  }



  async function carregarEstoque(empresaId: string) {

    try {

      const q = query(
        collection(db, "obras"),
        where("empresaId", "==", empresaId)
      );

      const obrasSnap = await getDocs(q);

      const listaObras: Obra[] = obrasSnap.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome
      }));

      setObras(listaObras);

      const mapa: Record<string, LinhaEstoque> = {};

      for (const obra of listaObras) {

        const setoresSnap = await getDocs(
          collection(db, "obras", obra.id, "setores")
        );

        for (const setor of setoresSnap.docs) {

          const setorData = setor.data();

          // 🔧 CORREÇÃO PRINCIPAL
          const setorNome = setorData.nome || setor.id;

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

          for (const mat of materiaisSnap.docs) {

            const data = mat.data();

            const materialNome = data.nome || "Material";
            const saldo = Number(data.saldo || 0);

            if (saldo === 0) continue;

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

          }

        }

      }

      setTabela(Object.values(mapa));
      setLoading(false);

    } catch (error) {

      console.error("Erro ao carregar estoque:", error);
      setLoading(false);

    }

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

      <div className="max-w-7xl mx-auto p-8">

        <h1 className="text-3xl font-bold mb-8">
          Estoque por Setor
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {dadosSetores.map((s, i) => (

            <div
              key={i}
              onClick={() => setSetorSelecionado(s.setor)}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg cursor-pointer transition"
            >

              <p className="text-gray-500">
                Setor
              </p>

              <h2 className="text-xl font-bold mt-2">
                {s.setor}
              </h2>

              <p className="text-3xl font-bold text-blue-600 mt-4">
                {s.total}
              </p>

            </div>

          ))}

        </div>

      </div>

    );

  }



  const materiais = tabela.filter(l => l.setor === setorSelecionado);



  return (

    <div className="max-w-7xl mx-auto p-8">

      <button
        onClick={() => setSetorSelecionado(null)}
        className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        ← Voltar
      </button>

      <h1 className="text-3xl font-bold mb-8">
        {setorSelecionado}
      </h1>

      <div className="max-h-[70vh] overflow-auto border rounded-lg">

        <table className="w-full">

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

              <tr key={index} className="border hover:bg-gray-50">

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

    </div>

  );

}