"use client";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

export default function Setores() {

  const params = useParams();
  const router = useRouter();

  const obraId = params.id as string;

  const { user, role } = useAuth();

  const [setores, setSetores] = useState<any[]>([]);
  const [novoSetor, setNovoSetor] = useState("");

  const [todosSetores, setTodosSetores] = useState<string[]>([]);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [carregando, setCarregando] = useState(false);

  // 🔥 EDITAR
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");

  /* 🔥 TEMPO REAL */
  useEffect(() => {

    if (!obraId) return;

    const setoresRef = collection(db, "obras", obraId, "setores");

    const unsubscribe = onSnapshot(setoresRef, (snapshot) => {

      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      lista.sort((a: any, b: any) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

      setSetores(lista);

    });

    return () => unsubscribe();

  }, [obraId]);

  /* 🔥 SUGESTÕES */
  useEffect(() => {
    carregarTodosSetores();
  }, []);

  async function carregarTodosSetores() {

    const obrasSnap = await getDocs(collection(db, "obras"));

    let lista: string[] = [];

    for (const obraDoc of obrasSnap.docs) {

      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      setoresSnap.forEach((doc) => {

        const nome = doc.data().nome;

        if (nome && !lista.includes(nome)) {
          lista.push(nome);
        }

      });

    }

    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));

    setTodosSetores(lista);
  }

  function normalizarTexto(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function filtrarSugestoes(valor: string) {

    setNovoSetor(valor);

    if (!valor.trim()) {
      setSugestoes([]);
      setMostrarSugestoes(false);
      return;
    }

    const filtradas = todosSetores.filter((s) =>
      normalizarTexto(s).includes(normalizarTexto(valor))
    );

    setSugestoes(filtradas);
    setMostrarSugestoes(true);
  }

  /* 🔥 CRIAR */
  async function criarSetor() {

    if (!novoSetor.trim()) {
      alert("Digite o nome do setor");
      return;
    }

    const nomeLimpo = novoSetor.trim();
    const nomeNormalizado = normalizarTexto(nomeLimpo);

    const existe = setores.some((s) => {
      const bancoNormalizado =
        s.nomeNormalizado || normalizarTexto(s.nome);
      return bancoNormalizado === nomeNormalizado;
    });

    if (existe) {
      alert("Este setor já existe.");
      return;
    }

    await addDoc(collection(db, "obras", obraId, "setores"), {
      nome: nomeLimpo,
      nomeNormalizado,
      criadoEm: new Date(),
    });

    setNovoSetor("");
    setSugestoes([]);
    setMostrarSugestoes(false);
  }

  /* 🔥 EXCLUIR */
  async function excluirSetor(id: string) {

    if (role !== "admin") {
      alert("Apenas administradores podem excluir.");
      return;
    }

    if (!confirm("Deseja excluir este setor?")) return;

    await deleteDoc(doc(db, "obras", obraId, "setores", id));
  }

  /* 🔥 EDITAR */
  async function salvarEdicao(id: string) {

    if (!novoNome.trim()) {
      alert("Digite um nome válido");
      return;
    }

    await updateDoc(
      doc(db, "obras", obraId, "setores", id),
      {
        nome: novoNome,
        nomeNormalizado: normalizarTexto(novoNome)
      }
    );

    setEditandoId(null);
    setNovoNome("");
  }

  function cancelarEdicao(){
    setEditandoId(null);
    setNovoNome("");
  }

  return (

    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <button
        onClick={() => router.push("/dashboard/obras")}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold">Setores</h1>

      {/* CRIAR */}
      <div className="relative flex gap-2">

        <input
          placeholder="Nome do setor"
          value={novoSetor}
          onChange={(e) => filtrarSugestoes(e.target.value)}
          className="flex-1 border p-2 rounded"
        />

        <button
          onClick={criarSetor}
          disabled={carregando}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Criar
        </button>

        {mostrarSugestoes && sugestoes.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white border rounded shadow max-h-40 overflow-y-auto z-10">
            {sugestoes.map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  setNovoSetor(item);
                  setMostrarSugestoes(false);
                }}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {item}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* LISTA */}
      {setores.map((setor) => (

        <div
          key={setor.id}
          className="flex justify-between items-center border p-4 rounded"
        >

          {/* EDITANDO */}
          {editandoId === setor.id ? (
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="border p-2 rounded w-full mr-4"
            />
          ) : (
            <Link
              href={`/obra/${obraId}/setor/${setor.id}`}
              className="font-medium"
            >
              {setor.nome}
            </Link>
          )}

          <div className="flex gap-2">

            {/* EDITAR */}
            {role === "admin" && (
              editandoId === setor.id ? (
                <>
                  <button
                    onClick={() => salvarEdicao(setor.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Salvar
                  </button>

                  <button
                    onClick={cancelarEdicao}
                    className="bg-gray-400 text-white px-3 py-1 rounded"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setEditandoId(setor.id);
                    setNovoNome(setor.nome);
                  }}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  ✏️
                </button>
              )
            )}

            {/* EXCLUIR */}
            {role === "admin" && (
              <button
                onClick={() => excluirSetor(setor.id)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Excluir
              </button>
            )}

          </div>

        </div>

      ))}

      {setores.length === 0 && (
        <div className="text-gray-500 text-center py-6">
          Nenhum setor cadastrado ainda.
        </div>
      )}

    </div>

  );

}