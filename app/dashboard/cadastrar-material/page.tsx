"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace("mm", "")
    .replace(/\./g, "");
}

export default function CadastrarMaterial() {
  const [obras, setObras] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [materiaisExistentes, setMateriaisExistentes] =
    useState<string[]>([]);

  const [obraId, setObraId] = useState("");
  const [setorId, setSetorId] = useState("");
  const [novoSetor, setNovoSetor] = useState("");

  const [nomeMaterial, setNomeMaterial] =
    useState("");
  const [quantidade, setQuantidade] =
    useState(0);
  const [unidade, setUnidade] =
    useState("un");

  const [mostrarLista, setMostrarLista] =
    useState(false);

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    if (obraId) carregarSetores();
  }, [obraId]);

  useEffect(() => {
    if (obraId && setorId)
      carregarMateriais();
  }, [obraId, setorId]);

  async function carregarObras() {
    const snap = await getDocs(
      collection(db, "obras")
    );
    setObras(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }

  async function carregarSetores() {
    const snap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );
    setSetores(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }

  async function carregarMateriais() {
    const snap = await getDocs(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais"
      )
    );

    const nomes = snap.docs.map(
      (doc) => doc.data().nome
    );

    nomes.sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    setMateriaisExistentes(nomes);
  }

  async function criarSetor() {
    if (!novoSetor.trim()) return;

    await addDoc(
      collection(db, "obras", obraId, "setores"),
      {
        nome: novoSetor.trim(),
        criadoEm: new Date(),
      }
    );

    setNovoSetor("");
    carregarSetores();
  }

  async function salvarMaterial() {
    if (
      !nomeMaterial.trim() ||
      quantidade <= 0 ||
      !obraId ||
      !setorId
    )
      return;

    const materiaisRef = collection(
      db,
      "obras",
      obraId,
      "setores",
      setorId,
      "materiais"
    );

    const q = query(
      materiaisRef,
      where("nome", "==", nomeMaterial.trim())
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      const saldoAtual =
        snap.docs[0].data().saldo || 0;

      await updateDoc(docRef, {
        saldo: saldoAtual + quantidade,
      });
    } else {
      await addDoc(materiaisRef, {
        nome: nomeMaterial.trim(),
        saldo: quantidade,
        unidade,
        criadoEm: new Date(),
      });
    }

    setNomeMaterial("");
    setQuantidade(0);
    carregarMateriais();
  }

  const materiaisFiltrados =
    materiaisExistentes.filter((m) => {
      const busca =
        normalizarTexto(nomeMaterial);
      const material =
        normalizarTexto(m);

      return material.includes(busca);
    });

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-center text-lg font-semibold">
        Cadastrar Material
      </h2>

      {/* OBRA */}
      <select
        onChange={(e) =>
          setObraId(e.target.value)
        }
        className="w-full p-2 border rounded"
      >
        <option value="">
          Selecionar obra
        </option>
        {obras.map((obra) => (
          <option
            key={obra.id}
            value={obra.id}
          >
            {obra.nome}
          </option>
        ))}
      </select>

      {/* SETOR */}
      <select
        onChange={(e) =>
          setSetorId(e.target.value)
        }
        className="w-full p-2 border rounded"
      >
        <option value="">
          Selecionar setor
        </option>
        {setores.map((setor) => (
          <option
            key={setor.id}
            value={setor.id}
          >
            {setor.nome}
          </option>
        ))}
      </select>

      {/* CRIAR SETOR */}
      <div className="flex gap-2">
        <input
          placeholder="Novo setor"
          value={novoSetor}
          onChange={(e) =>
            setNovoSetor(e.target.value)
          }
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={criarSetor}
          className="bg-green-600 text-white px-4 rounded"
        >
          Criar
        </button>
      </div>

      {/* NOME MATERIAL INTELIGENTE */}
      <div className="relative">
        <input
          placeholder="Nome do material"
          value={nomeMaterial}
          onChange={(e) =>
            setNomeMaterial(e.target.value)
          }
          onFocus={() =>
            setMostrarLista(true)
          }
          className="w-full p-2 border rounded"
        />

        {mostrarLista &&
          nomeMaterial &&
          materiaisFiltrados.length >
            0 && (
            <div className="absolute bg-white border w-full mt-1 rounded shadow max-h-40 overflow-auto z-50">
              {materiaisFiltrados.map(
                (item, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setNomeMaterial(
                        item
                      );
                      setMostrarLista(
                        false
                      );
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          )}
      </div>

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e) =>
          setQuantidade(
            Number(e.target.value)
          )
        }
        className="w-full p-2 border rounded"
      />

      <select
        value={unidade}
        onChange={(e) =>
          setUnidade(e.target.value)
        }
        className="w-full p-2 border rounded"
      >
        <option value="un">
          Unidade
        </option>
        <option value="m">
          Metro
        </option>
        <option value="pc">
          Peça
        </option>
      </select>

      <button
        onClick={salvarMaterial}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Salvar Material
      </button>
    </div>
  );
}