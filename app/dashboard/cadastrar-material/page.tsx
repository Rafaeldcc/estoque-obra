"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
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

  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [mensagem, setMensagem] = useState("");

  /* NORMALIZAR TEXTO */

  function normalizarTexto(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

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

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
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

  /* CRIAR SETOR COM PROTEÇÃO TOTAL */

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

      const data = doc.data();

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

    const novo = {
      id: ref.id,
      nome: novoSetor.trim(),
      nomeNormalizado
    };

    setSetores((prev) => [...prev, novo]);

    setSetorId(ref.id);

    setNovoSetor("");

  }

  /* SALVAR MATERIAL */

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

        {mostrarSugestoes && sugestoes.length > 0 && (

          <div className="absolute left-0 right-0 bg-white border rounded shadow mt-1 max-h-40 overflow-y-auto z-10">

            {sugestoes.map((item, index) => (

              <div
                key={index}
                onClick={() => {
                  setNomeMaterial(item);
                  setMostrarSugestoes(false);
                }}
                className="p-2 cursor-pointer hover:bg-gray-100"
              >
                {item}
              </div>

            ))}

          </div>

        )}

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
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >

        Salvar Material

      </button>

    </div>

  );

}