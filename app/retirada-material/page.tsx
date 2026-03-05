"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  getDoc,
} from "firebase/firestore";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  setorId: string;
};

export default function RetiradaMaterial() {
  const [obras, setObras] = useState<any[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [quantidades, setQuantidades] = useState<{ [key: string]: number }>({});
  const [destinos, setDestinos] = useState<{ [key: string]: string }>({});
  const [obraDestino, setObraDestino] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    if (obraSelecionada) {
      carregarMateriais(obraSelecionada);
    }
  }, [obraSelecionada]);

  async function carregarObras() {
    const snap = await getDocs(collection(db, "obras"));

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setObras(lista);
  }

  async function carregarMateriais(obraId: string) {
    const setoresSnap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    let lista: Material[] = [];

    for (const setorDoc of setoresSnap.docs) {
      const materiaisSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setorDoc.id,
          "materiais"
        )
      );

      materiaisSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();

        lista.push({
          id: docSnap.id,
          nome: data.nome,
          saldo: data.saldo || 0,
          unidade: data.unidade || "",
          setorId: setorDoc.id,
        });
      });
    }

    setMateriais(lista);
  }

  async function retirar(material: Material) {
    const qtd = quantidades[material.id];
    const destino = destinos[material.id] || "uso";
    const destinoObra = obraDestino[material.id];

    if (!qtd || qtd <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    if (qtd > material.saldo) {
      alert("Quantidade maior que o saldo.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    try {

      // 🔻 Remove da obra origem
      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        material.setorId,
        "materiais",
        material.id
      );

      await updateDoc(materialRef, {
        saldo: increment(-qtd),
      });

      // 🔁 TRANSFERÊNCIA ENTRE OBRAS
      if (destino === "transferencia" && destinoObra) {

        // pegar nome do setor da obra origem
        const setorOrigemRef = doc(
          db,
          "obras",
          obraSelecionada,
          "setores",
          material.setorId
        );

        const setorOrigemSnap = await getDoc(setorOrigemRef);
        const nomeSetor = setorOrigemSnap.data()?.nome || "Sem nome";

        // procurar setor na obra destino
        const setoresDestinoSnap = await getDocs(
          collection(db, "obras", destinoObra, "setores")
        );

        let setorDestinoId: string | null = null;

        setoresDestinoSnap.forEach((setor) => {
          if (setor.data().nome === nomeSetor) {
            setorDestinoId = setor.id;
          }
        });

        // se não existir cria setor
        if (!setorDestinoId) {
          const novoSetor = await addDoc(
            collection(db, "obras", destinoObra, "setores"),
            {
              nome: nomeSetor,
            }
          );

          setorDestinoId = novoSetor.id;
        }

        const materiaisDestinoRef = collection(
          db,
          "obras",
          destinoObra,
          "setores",
          setorDestinoId,
          "materiais"
        );

        const materiaisDestinoSnap = await getDocs(materiaisDestinoRef);

        let materialExiste = false;

        for (const docSnap of materiaisDestinoSnap.docs) {
          if (docSnap.data().nome === material.nome) {

            await updateDoc(docSnap.ref, {
              saldo: increment(qtd),
            });

            materialExiste = true;
          }
        }

        if (!materialExiste) {
          await addDoc(materiaisDestinoRef, {
            nome: material.nome,
            saldo: qtd,
            unidade: material.unidade || "",
          });
        }
      }

      await registrarMovimentacao({
        materialId: material.id,
        materialNome: material.nome,
        tipo: destino === "transferencia" ? "transferencia" : "saida",
        quantidade: qtd,
        obraId: obraSelecionada,
        obraNome:
          obras.find((o) => o.id === obraSelecionada)?.nome || "",
        obraDestino: destinoObra || null,
        usuarioId: user.uid,
        usuarioNome: user.email || "",
      });

      alert("Movimentação registrada!");

      setQuantidades((prev) => ({
        ...prev,
        [material.id]: 0,
      }));

      carregarMateriais(obraSelecionada);

    } catch (error) {
      console.error(error);
      alert("Erro ao retirar material.");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h2>Retirada de Material</h2>

      <select
        style={{ width: "100%", padding: 10 }}
        onChange={(e) => setObraSelecionada(e.target.value)}
      >
        <option value="">Selecionar obra</option>

        {obras.map((obra) => (
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      {materiais.map((material) => (
        <div
          key={material.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginTop: 20,
            borderRadius: 8,
          }}
        >
          <b>{material.nome}</b>

          <span style={{ float: "right" }}>
            Saldo: {material.saldo} {material.unidade}
          </span>

          <div style={{ marginTop: 10 }}>
            <input
              type="number"
              placeholder="Quantidade"
              value={quantidades[material.id] || ""}
              onChange={(e) =>
                setQuantidades((prev) => ({
                  ...prev,
                  [material.id]: Number(e.target.value),
                }))
              }
              style={{ width: 100 }}
            />

            <select
              style={{ marginLeft: 10 }}
              value={destinos[material.id] || "uso"}
              onChange={(e) =>
                setDestinos((prev) => ({
                  ...prev,
                  [material.id]: e.target.value,
                }))
              }
            >
              <option value="uso">Usado na obra</option>
              <option value="transferencia">
                Transferir para outra obra
              </option>
            </select>

            {destinos[material.id] === "transferencia" && (
              <select
                style={{ marginLeft: 10 }}
                onChange={(e) =>
                  setObraDestino((prev) => ({
                    ...prev,
                    [material.id]: e.target.value,
                  }))
                }
              >
                <option value="">Selecionar obra destino</option>

                {obras
                  .filter((o) => o.id !== obraSelecionada)
                  .map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.nome}
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={() => retirar(material)}
              style={{
                marginLeft: 10,
                background: "#dc2626",
                color: "white",
                padding: "6px 12px",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Retirar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}