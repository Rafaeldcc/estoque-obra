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
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

export default function CadastrarMaterial() {

  const { user, loading } = useAuth();

  const [role, setRole] = useState<string | null>(null);

  const [obras, setObras] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [materiaisExistentes, setMateriaisExistentes] = useState<string[]>([]);

  const [obraId, setObraId] = useState("");
  const [setorId, setSetorId] = useState("");

  const [novoSetor, setNovoSetor] = useState("");

  const [nomeMaterial, setNomeMaterial] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [unidade, setUnidade] = useState("un");

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!user) return;

    carregarRole();
    carregarObras();
  }, [user]);

  useEffect(() => {
    if (obraId) carregarSetores();
  }, [obraId]);

  useEffect(() => {
    if (obraId && setorId) carregarMateriais();
  }, [obraId, setorId]);

  async function carregarRole() {

    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));

    if (snap.exists()) {
      setRole(snap.data().role);
    }
  }

  async function carregarObras() {

    const snap = await getDocs(collection(db, "obras"));

    setObras(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }

  async function carregarSetores() {

    if (!obraId) return;

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

    if (!obraId || !setorId) return;

    const snap = await getDocs(
      collection(db, "obras", obraId, "setores", setorId, "materiais")
    );

    const nomes = snap.docs.map((doc) => doc.data().nome);

    nomes.sort((a, b) => a.localeCompare(b, "pt-BR"));

    setMateriaisExistentes(nomes);
  }

  async function criarSetor() {

    if (!obraId) {
      alert("Selecione uma obra primeiro.");
      return;
    }

    if (!novoSetor.trim()) {
      alert("Digite o nome do setor.");
      return;
    }

    const ref = await addDoc(
      collection(db, "obras", obraId, "setores"),
      {
        nome: novoSetor.trim(),
        criadoEm: serverTimestamp(),
      }
    );

    const novo = {
      id: ref.id,
      nome: novoSetor.trim(),
    };

    setSetores((prev) => [...prev, novo]);

    setSetorId(ref.id);

    setNovoSetor("");
  }

  async function salvarMaterial() {

    if (!user) {
      alert("Sessão expirou. Faça login novamente.");
      return;
    }

    if (!nomeMaterial.trim() || quantidade <= 0 || !obraId || !setorId) {
      alert("Preencha todos os campos.");
      return;
    }

    if (role !== "admin" && role !== "almoxarifado") {
      alert("Você não tem permissão para cadastrar material.");
      return;
    }

    // 🔒 BLOQUEAR DUPLICIDADE
    const nomeLimpo = nomeMaterial.trim().toLowerCase();

    if (
      materiaisExistentes.some(
        (m) => m.toLowerCase() === nomeLimpo
      )
    ) {
      alert("Este material já está cadastrado neste setor.");
      return;
    }

    try {

      const materiaisRef = collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais"
      );

      const newDoc = await addDoc(materiaisRef, {
        nome: nomeMaterial.trim(),
        saldo: quantidade,
        unidade,
        criadoEm: serverTimestamp(),
      });

      const materialId = newDoc.id;

      await registrarMovimentacao({

        materialId,
        materialNome: nomeMaterial.trim(),
        tipo: "entrada",
        quantidade,
        obraId,
        obraNome:
          obras.find((o) => o.id === obraId)?.nome || "",
        usuarioId: user.uid,
        usuarioNome: user.email || "",
      });

      setMensagem("Material salvo com sucesso!");

      setTimeout(() => {
        setMensagem("");
      }, 3000);

      setNomeMaterial("");
      setQuantidade(0);

      carregarMateriais();

    } catch (error) {

      console.error(error);
      alert("Erro ao salvar material.");

    }
  }

  if (loading) return null;

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-4">

      <h2 className="text-center text-lg font-semibold">
        Cadastrar Material
      </h2>

      {mensagem && (
        <div className="bg-green-600 text-white p-2 rounded text-center">
          {mensagem}
        </div>
      )}

      {/* OBRA */}

      <select
        value={obraId}
        onChange={(e) => setObraId(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="">Selecionar obra</option>

        {obras.map((obra) => (
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      {/* SETOR */}

      <select
        value={setorId}
        onChange={(e) => setSetorId(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="">Selecionar setor</option>

        {setores.map((setor) => (
          <option key={setor.id} value={setor.id}>
            {setor.nome}
          </option>
        ))}
      </select>

      {/* CRIAR SETOR */}

      {obraId && (

        <div className="flex gap-2">

          <input
            placeholder="Novo setor"
            value={novoSetor}
            onChange={(e) => setNovoSetor(e.target.value)}
            className="flex-1 p-2 border rounded"
          />

          <button
            onClick={criarSetor}
            className="bg-gray-800 text-white px-4 rounded"
          >
            Criar
          </button>

        </div>

      )}

      {/* 📦 MATERIAIS JÁ CADASTRADOS */}

      {materiaisExistentes.length > 0 && (

        <div className="bg-gray-50 border rounded p-3 text-sm">

          <strong>Materiais já cadastrados neste setor:</strong>

          <ul className="mt-2 space-y-1">

            {materiaisExistentes.map((mat, index) => (

              <li key={index} className="text-gray-700">
                • {mat}
              </li>

            ))}

          </ul>

        </div>

      )}

      {/* MATERIAL */}

      <input
        placeholder="Nome do material"
        value={nomeMaterial}
        onChange={(e) => setNomeMaterial(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e) => setQuantidade(Number(e.target.value))}
        className="w-full p-2 border rounded"
      />

      <select
        value={unidade}
        onChange={(e) => setUnidade(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="un">Unidade</option>
        <option value="m">Metro</option>
        <option value="pc">Peça</option>
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