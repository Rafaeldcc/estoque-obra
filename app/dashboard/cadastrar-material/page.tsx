"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  where
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

/* TIPOS */

type Obra = {
  id: string
  nome: string
}

type Setor = {
  id: string
  nome: string
  nomeNormalizado?: string
}

export default function CadastrarMaterial() {

  const { user, loading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [obras, setObras] = useState<Obra[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [materiaisExistentes, setMateriaisExistentes] = useState<string[]>([]);

  const [obraId, setObraId] = useState("");
  const [setorId, setSetorId] = useState("");

  const [novoSetor, setNovoSetor] = useState("");

  const [nomeMaterial, setNomeMaterial] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [unidade, setUnidade] = useState("un");

  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [mensagem, setMensagem] = useState("");

  function normalizarTexto(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  useEffect(() => {

    if (!user) return;

    carregarUsuario();

  }, [user]);

  useEffect(() => {
    if (empresaId) carregarObras();
  }, [empresaId]);

  useEffect(() => {
    if (obraId) carregarSetores();
  }, [obraId]);

  useEffect(() => {
    if (obraId && setorId) carregarMateriais();
  }, [obraId, setorId]);

  async function carregarUsuario() {

    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));

    if (snap.exists()) {

      const data = snap.data();

      setRole(data.role);
      setEmpresaId(data.empresaId);

    }

  }

  async function carregarObras() {

    if (!empresaId) return;

    const q = query(
      collection(db, "obras"),
      where("empresaId", "==", empresaId)
    );

    const snap = await getDocs(q);

    const lista: Obra[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    setObras(lista);

  }

  async function carregarSetores() {

    if (!obraId) return;

    const snap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    const lista: Setor[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    setSetores(lista);

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

  function filtrarSugestoes(valor: string) {

    setNomeMaterial(valor);

    if (!valor.trim()) {
      setSugestoes([]);
      setMostrarSugestoes(false);
      return;
    }

    const filtradas = materiaisExistentes
      .filter((m) =>
        normalizarTexto(m).includes(normalizarTexto(valor))
      )
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    setSugestoes(filtradas);
    setMostrarSugestoes(true);

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

    const nomeNormalizado = normalizarTexto(novoSetor);

    const snap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    const existe = snap.docs.some((doc) => {

      const data = doc.data() as any;

      const bancoNormalizado =
        data.nomeNormalizado || normalizarTexto(data.nome);

      return bancoNormalizado === nomeNormalizado;

    });

    if (existe) {
      alert("Este setor já existe.");
      return;
    }

    const ref = await addDoc(
      collection(db, "obras", obraId, "setores"),
      {
        nome: novoSetor.trim(),
        nomeNormalizado,
        criadoEm: serverTimestamp(),
      }
    );

    const novo: Setor = {
      id: ref.id,
      nome: novoSetor.trim(),
      nomeNormalizado,
    };

    setSetores((prev) => [...prev, novo]);

    setSetorId(ref.id);

    setNovoSetor("");

  }

  async function salvarMaterial() {

    if (!user) {
      alert("Sessão expirou.");
      return;
    }

    if (!nomeMaterial.trim() || quantidade <= 0 || !obraId || !setorId) {
      alert("Preencha todos os campos.");
      return;
    }

    if (role !== "admin" && role !== "almoxarifado") {
      alert("Sem permissão.");
      return;
    }

    const nomeNormalizado = normalizarTexto(nomeMaterial);

    const existe = materiaisExistentes.some(
      (m) => normalizarTexto(m) === nomeNormalizado
    );

    if (existe) {
      alert("Este material já existe neste setor.");
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
        nomeNormalizado,
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
        empresaId: empresaId ?? undefined

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

      <div className="relative">

        <input
          placeholder="Nome do material"
          value={nomeMaterial}
          onChange={(e) => filtrarSugestoes(e.target.value)}
          className="w-full p-2 border rounded"
        />

      </div>

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
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Salvar Material
      </button>

    </div>

  );

}