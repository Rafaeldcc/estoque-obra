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
import { useParams } from "next/navigation";

export default function ControleSetor() {
  const params = useParams();

  const obraId = params.id as string;
  const setorId = params.setorId as string;

  const [materiais, setMateriais] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [quantidades, setQuantidades] = useState<any>({});
  const [obraDestino, setObraDestino] = useState("");

  useEffect(() => {
    carregarMateriais();
    carregarObras();
  }, []);

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

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setMateriais(lista);
  }

  async function carregarObras() {
    const snap = await getDocs(
      collection(db, "obras")
    );

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setObras(lista);
  }

  // =============================
  // TRANSFERÊNCIA PROFISSIONAL
  // =============================
  async function transferir(material: any) {
    const quantidade = quantidades[material.id];

    if (!quantidade || quantidade <= 0) return;
    if (!obraDestino) return;

    if (quantidade > material.saldo) {
      alert("Quantidade maior que o saldo.");
      return;
    }

    // ============================
    // 1️⃣ Buscar nome do setor origem
    // ============================

    const setorSnap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    const setorAtual = setorSnap.docs.find(
      (doc) => doc.id === setorId
    );

    const setorNome =
      setorAtual?.data().nome;

    // ============================
    // 2️⃣ Verificar / Criar setor no destino
    // ============================

    const setoresDestinoRef = collection(
      db,
      "obras",
      obraDestino,
      "setores"
    );

    const qSetor = query(
      setoresDestinoRef,
      where("nome", "==", setorNome)
    );

    const setorDestinoSnap =
      await getDocs(qSetor);

    let setorDestinoId;

    if (!setorDestinoSnap.empty) {
      setorDestinoId =
        setorDestinoSnap.docs[0].id;
    } else {
      const novoSetor = await addDoc(
        setoresDestinoRef,
        {
          nome: setorNome,
          criadoEm: new Date(),
        }
      );

      setorDestinoId = novoSetor.id;
    }

    // ============================
    // 3️⃣ Diminuir saldo origem
    // ============================

    await updateDoc(
      doc(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais",
        material.id
      ),
      {
        saldo: material.saldo - quantidade,
      }
    );

    // ============================
    // 4️⃣ Verificar material no destino
    // ============================

    const materiaisDestinoRef =
      collection(
        db,
        "obras",
        obraDestino,
        "setores",
        setorDestinoId,
        "materiais"
      );

    const qMaterial = query(
      materiaisDestinoRef,
      where("nome", "==", material.nome)
    );

    const materialDestinoSnap =
      await getDocs(qMaterial);

    if (!materialDestinoSnap.empty) {
      const saldoAtual =
        materialDestinoSnap.docs[0].data()
          .saldo || 0;

      await updateDoc(
        materialDestinoSnap.docs[0].ref,
        {
          saldo: saldoAtual + quantidade,
        }
      );
    } else {
      await addDoc(materiaisDestinoRef, {
        nome: material.nome,
        saldo: quantidade,
        unidade: material.unidade,
        criadoEm: new Date(),
      });
    }

    alert("Transferência realizada com sucesso.");

    carregarMateriais();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Controle de Estoque
      </h1>

      {materiais.map((material) => (
        <div
          key={material.id}
          className="border p-4 rounded-lg shadow"
        >
          <div className="flex justify-between">
            <strong>
              {material.nome}
            </strong>

            <span>
              Saldo: {material.saldo}{" "}
              {material.unidade}
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            <input
              type="number"
              placeholder="Qtd"
              className="border p-1 w-20"
              onChange={(e) =>
                setQuantidades({
                  ...quantidades,
                  [material.id]:
                    Number(
                      e.target.value
                    ),
                })
              }
            />

            <select
              onChange={(e) =>
                setObraDestino(
                  e.target.value
                )
              }
              className="border p-1"
            >
              <option value="">
                Selecionar obra destino
              </option>

              {obras
                .filter(
                  (o) =>
                    o.id !== obraId
                )
                .map((obra) => (
                  <option
                    key={obra.id}
                    value={obra.id}
                  >
                    {obra.nome}
                  </option>
                ))}
            </select>

            <button
              onClick={() =>
                transferir(material)
              }
              className="bg-purple-600 text-white px-3 py-1 rounded"
            >
              Transferir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}