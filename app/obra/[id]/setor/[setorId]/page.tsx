"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useParams } from "next/navigation";

interface Material {
  id: string;
  nome: string;
  saldo: number;
  unidade: string;
}

interface Obra {
  id: string;
  nome: string;
}

export default function ControleEstoque() {

  const params = useParams();
  const obraId = params.id as string;
  const setorId = params.setorId as string;

  const [materiais,setMateriais] = useState<Material[]>([]);
  const [obras,setObras] = useState<Obra[]>([]);
  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [destinos,setDestinos] = useState<{[key:string]:string}>({});
  const [mensagem,setMensagem] = useState("");

  const [empresaId,setEmpresaId] = useState<string>("");

  useEffect(()=>{

    carregarMateriais();
    carregarObras();
    carregarEmpresa();

  },[]);


  async function carregarEmpresa(){

    const user = auth.currentUser;
    if(!user) return;

    const snap = await getDoc(doc(db,"usuarios",user.uid));

    if(snap.exists()){

      setEmpresaId(snap.data().empresaId);

    }

  }


  async function carregarMateriais(){

    const snapshot = await getDocs(
      collection(db,"obras",obraId,"setores",setorId,"materiais")
    );

    const lista:Material[] = [];

    snapshot.forEach((docSnap)=>{

      const data = docSnap.data();

      lista.push({
        id:docSnap.id,
        nome:data.nome,
        saldo:data.saldo ?? 0,
        unidade:data.unidade ?? ""
      });

    });

    setMateriais(lista);

  }


  async function carregarObras(){

    const snapshot = await getDocs(collection(db,"obras"));

    const lista:Obra[] = [];

    snapshot.forEach((docSnap)=>{

      lista.push({
        id:docSnap.id,
        nome:docSnap.data().nome
      });

    });

    setObras(lista.filter((o)=>o.id !== obraId));

  }


  function corSaldo(saldo:number){

    if(saldo <= 10) return "text-red-600";
    if(saldo <= 50) return "text-yellow-600";
    return "text-green-600";

  }


  async function entrada(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    if(!qtd) return;

    const novoSaldo = material.saldo + qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    await addDoc(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais",
        material.id,
        "historico"
      ),
      {
        tipo:"ENTRADA",
        quantidade:qtd,
        unidade:material.unidade,
        data:new Date()
      }
    );

    const user = auth.currentUser;

    await registrarMovimentacao({

      materialId: material.id,
      materialNome: material.nome,

      tipo: "entrada",
      quantidade: qtd,

      obraId: obraId,
      obraNome: obras.find(o=>o.id === obraId)?.nome || "",

      destino: "uso",

      usuarioId: user?.uid || "",
      usuarioNome: user?.email || "",

      empresaId: empresaId

    });

    mostrarMensagem("Entrada realizada com sucesso");

    setQuantidades({...quantidades,[material.id]:0});

    carregarMateriais();

  }


  async function transferir(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    const destinoObra = destinos[material.id];

    if(!qtd || !destinoObra) return alert("Preencha os campos");
    if(qtd > material.saldo) return alert("Saldo insuficiente");

    const novoSaldo = material.saldo - qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    const user = auth.currentUser;

    await registrarMovimentacao({

      materialId: material.id,
      materialNome: material.nome,

      tipo: "transferencia",
      quantidade: qtd,

      obraId: obraId,
      obraNome: obras.find(o=>o.id === obraId)?.nome || "",

      destino: "transferencia",
      obraDestino: obras.find(o=>o.id === destinoObra)?.nome || "",

      usuarioId: user?.uid || "",
      usuarioNome: user?.email || "",

      empresaId: empresaId

    });

    mostrarMensagem("Transferência realizada com sucesso");

    setQuantidades({...quantidades,[material.id]:0});
    setDestinos({...destinos,[material.id]:""});

    carregarMateriais();

  }


  async function excluir(materialId:string){

    if(!confirm("Excluir material?")) return;

    await deleteDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",materialId)
    );

    mostrarMensagem("Material excluído");

    carregarMateriais();

  }


  function mostrarMensagem(texto:string){

    setMensagem(texto);

    setTimeout(()=>setMensagem(""),3000);

  }


  return(

    <div className="max-w-6xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-8">
        Controle de Estoque
      </h1>

      {mensagem && (

        <div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl">
          {mensagem}
        </div>

      )}

      <div className="grid md:grid-cols-2 gap-6">

        {materiais.map((material)=>(

          <div
            key={material.id}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6"
          >

            <div className="flex justify-between items-center mb-4">

              <h2 className="text-xl font-semibold">
                {material.nome}
              </h2>

              <span className={`text-2xl font-bold ${corSaldo(material.saldo)}`}>
                {material.saldo} {material.unidade}
              </span>

            </div>

            <div className="flex gap-2 mb-3">

              <input
                type="number"
                placeholder="Qtd"
                className="border rounded px-2 py-1 w-20"
                value={quantidades[material.id] ?? ""}
                onChange={(e)=>
                  setQuantidades({
                    ...quantidades,
                    [material.id]:Number(e.target.value)
                  })
                }
              />

              <button
                onClick={()=>entrada(material)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg"
              >
                ➕ Entrada
              </button>

            </div>

            <div className="flex gap-2 mb-3">

              <select
                value={destinos[material.id] ?? ""}
                onChange={(e)=>
                  setDestinos({
                    ...destinos,
                    [material.id]:e.target.value
                  })
                }
                className="border rounded px-2 py-1 flex-1"
              >

                <option value="">Obra destino</option>

                {obras.map((obra)=>(
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}

              </select>

              <button
                onClick={()=>transferir(material)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg"
              >
                🔄 Transferir
              </button>

            </div>

            <div className="flex justify-between mt-4">

              <button
                onClick={()=>excluir(material.id)}
                className="text-red-600 hover:underline text-sm"
              >
                Excluir
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}