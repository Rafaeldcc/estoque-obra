"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams } from "next/navigation";

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

  const searchParams = useSearchParams();

  const obraParam = searchParams.get("obra");
  const setorParam = searchParams.get("setor");
  const subParam = searchParams.get("sub");

  const [role, setRole] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [obras, setObras] = useState<Obra[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [todosSetores, setTodosSetores] = useState<string[]>([]);

  const [materiaisExistentes, setMateriaisExistentes] = useState<string[]>([]);

  const [obraId, setObraId] = useState("");
  const [setorId, setSetorId] = useState("");

  const [novoSetor, setNovoSetor] = useState("");

  const [nomeMaterial, setNomeMaterial] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [unidade, setUnidade] = useState("un");
  const [novaUnidade, setNovaUnidade] = useState("");

  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [sugestoesSetor, setSugestoesSetor] = useState<string[]>([]);
  const [mostrarSugestoesSetor, setMostrarSugestoesSetor] = useState(false);

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
    carregarObras();
    carregarTodosSetores();
  }, []);

  useEffect(() => {
    if (obraParam) setObraId(obraParam);
    if (setorParam) setSetorId(setorParam);
  }, [obraParam, setorParam]);

  useEffect(() => {
    if (obraId) carregarSetores();
  }, [obraId]);

  useEffect(() => {
    carregarMateriais();
  }, []);

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
    const snap = await getDocs(collection(db, "obras"));

    const lista: Obra[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    setObras(lista);
  }

  async function carregarTodosSetores() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    let lista: string[] = [];

    for (const obra of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obra.id, "setores")
      );

      setoresSnap.forEach((setor) => {
        lista.push(setor.data().nome);
      });
    }

    lista = [...new Set(lista)];
    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));

    setTodosSetores(lista);
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
    const obrasSnap = await getDocs(collection(db, "obras"));

    let lista: string[] = [];

    for (const obra of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obra.id, "setores")
      );

      for (const setor of setoresSnap.docs) {
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
          if (data?.nome) lista.push(data.nome);
        });
      }
    }

    lista = [...new Set(lista)];
    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));

    setMateriaisExistentes(lista);
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
        normalizarTexto(m).startsWith(normalizarTexto(valor))
      )
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    setSugestoes(filtradas);
    setMostrarSugestoes(true);
  }

  function filtrarSetores(valor: string) {
    setNovoSetor(valor);

    if (!valor.trim()) {
      setSugestoesSetor([]);
      setMostrarSugestoesSetor(false);
      return;
    }

    const filtradas = todosSetores
      .filter((s) =>
        normalizarTexto(s).includes(normalizarTexto(valor))
      )
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    setSugestoesSetor(filtradas);
    setMostrarSugestoesSetor(true);
  }

  async function criarSetor() {
    if (!obraId) return alert("Selecione uma obra primeiro.");
    if (!novoSetor.trim()) return alert("Digite o nome do setor.");

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

    if (existe) return alert("Este setor já existe.");

    const ref = await addDoc(
      collection(db, "obras", obraId, "setores"),
      {
        nome: novoSetor.trim(),
        nomeNormalizado,
        criadoEm: serverTimestamp(),
      }
    );

    setSetores((prev) => [...prev, {
      id: ref.id,
      nome: novoSetor.trim(),
      nomeNormalizado
    }]);

    setSetorId(ref.id);
    setNovoSetor("");
  }

  async function salvarMaterial() {

    if (!user) return alert("Sessão expirou.");

    if (!nomeMaterial.trim() || quantidade <= 0 || !obraId || !setorId) {
      return alert("Preencha todos os campos.");
    }

    if (!role) return alert("Usuário sem permissão.");

    const nomeNormalizado = normalizarTexto(nomeMaterial);

    const materiaisRef = subParam
      ? collection(db, "obras", obraId, "setores", setorId, "subcategorias", subParam, "materiais")
      : collection(db, "obras", obraId, "setores", setorId, "materiais");

    const snap = await getDocs(materiaisRef);

    let existe = false;

    snap.forEach((doc) => {
      if (normalizarTexto(doc.data().nome) === nomeNormalizado) {
        existe = true;
      }
    });

    if (existe) return alert("Material já existe.");

    try {

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
        obraNome: obras.find((o) => o.id === obraId)?.nome || "",
        setorId,
        setorNome: setores.find((s) => s.id === setorId)?.nome || "",
        usuarioId: user.uid,
        usuarioNome: user.email || "",
        empresaId: empresaId!
      });

      // ✅ CORREÇÃO AQUI (DENTRO DO TRY)
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

      {!obraParam && (
        <select value={obraId} onChange={(e)=>setObraId(e.target.value)} className="w-full p-2 border rounded">
          <option value="">Selecionar obra</option>
          {obras.map(o=>(
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      )}

      {!setorParam && (
        <select value={setorId} onChange={(e)=>setSetorId(e.target.value)} className="w-full p-2 border rounded">
          <option value="">Selecionar setor</option>
          {setores.map(s=>(
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      )}

      <input
        placeholder="Nome do material"
        value={nomeMaterial}
        onChange={(e)=>filtrarSugestoes(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidade}
        onChange={(e)=>setQuantidade(Number(e.target.value))}
        className="w-full p-2 border rounded"
      />

      <select value={unidade} onChange={(e)=>setUnidade(e.target.value)} className="w-full p-2 border rounded">
        <option value="un">Unidade</option>
        <option value="m">Metro</option>
        <option value="pc">Peça</option>
        <option value="rolo">Rolo</option>
        <option value="cx">Caixa</option>
        <option value="barra">Barra</option>
        <option value="kg">Kg</option>
        <option value="l">Litro</option>
        <option value="pct">Pacote</option>
        <option value="nova">➕ Nova unidade</option>
      </select>

      {unidade === "nova" && (
        <input
          placeholder="Digite a nova unidade"
          value={novaUnidade}
          onChange={(e)=>{
            setNovaUnidade(e.target.value)
            setUnidade(e.target.value)
          }}
          className="w-full p-2 border rounded"
        />
      )}

      <button
        onClick={salvarMaterial}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        Salvar Material
      </button>

    </div>
  );
}