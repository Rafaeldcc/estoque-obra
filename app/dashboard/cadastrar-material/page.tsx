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
import { db, auth } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace("mm", "")
    .replace(/\./g, "");
}

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
    setObras(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  async function carregarSetores() {
    const snap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );
    setSetores(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  async function carregarMateriais() {
    const snap = await getDocs(
      collection(db, "obras", obraId, "setores", setorId, "materiais")
    );

    const nomes = snap.docs.map((doc) => doc.data().nome);
    nomes.sort((a, b) => a.localeCompare(b, "pt-BR"));
    setMateriaisExistentes(nomes);
  }

  async function criarSetor() {
    if (role !== "admin") {
      alert("Apenas administrador pode criar setor.");
      return;
    }

    if (!novoSetor.trim()) return;

    await addDoc(collection(db, "obras", obraId, "setores"), {
      nome: novoSetor.trim(),
      criadoEm: serverTimestamp(),
    });

    setNovoSetor("");
    carregarSetores();
  }

  async function salvarMaterial() {
    if (!nomeMaterial.trim() || quantidade <= 0 || !obraId || !setorId)
      return;

    if (!user) return;

    if (role !== "admin" && role !== "almoxarifado") {
      alert("Você não tem permissão para cadastrar material.");
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

      const q = query(
        materiaisRef,
        where("nome", "==", nomeMaterial.trim())
      );

      const snap = await getDocs(q);

      let materialId = "";

      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        materialId = snap.docs[0].id;

        await updateDoc(docRef, {
          saldo: increment(quantidade),
          atualizadoEm: serverTimestamp(),
        });
      } else {
        const newDoc = await addDoc(materiaisRef, {
          nome: nomeMaterial.trim(),
          saldo: quantidade,
          unidade,
          criadoEm: serverTimestamp(),
        });

        materialId = newDoc.id;
      }

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
      setTimeout(() => setMensagem(""), 3000);

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