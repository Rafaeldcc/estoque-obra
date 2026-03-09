"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Material {
  id: string;
  nome: string;
  saldo: number;
  unidade: string;
  estoqueMinimo?: number;
}

interface Obra {
  id: string;
  nome: string;
}

export default function ControleEstoque() {

  const { role } = useAuth();

  const params = useParams();
  const obraId = params.id as string;
  const setorId = params.setorId as string;

  const [materiais,setMateriais] = useState<Material[]>([]);
  const [obras,setObras] = useState<Obra[]>([]);
  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [destinos,setDestinos] = useState<{[key:string]:string}>({});
  const [minimos,setMinimos] = useState<{[key:string]:number}>({});
  const [busca,setBusca] = useState("");

  const [materialSelecionado,setMaterialSelecionado] = useState<string | null>(null);

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
        unidade:data.unidade ?? "",
        estoqueMinimo:data.estoqueMinimo ?? 0
      });

    });

    lista.sort((a,b)=>a.nome.localeCompare(b.nome));

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

  function mostrarMensagem(texto:string){

    setMensagem(texto);
    setTimeout(()=>setMensagem(""),3000);

  }

  async function salvarMinimo(material:Material){

    const minimo = minimos[material.id];
    if(minimo === undefined) return;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { estoqueMinimo:minimo }
    );

    mostrarMensagem("Estoque mínimo atualizado");

    carregarMateriais();

  }

  async function entrada(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    if(!qtd) return;

    const novoSaldo = material.saldo + qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    const user = auth.currentUser;

    await registrarMovimentacao({

      materialId: material.id,
      materialNome: material.nome,

      tipo: "entrada",
      quantidade: qtd,

      obraId: obraId,
      obraNome: "",

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

    mostrarMensagem("Transferência realizada");

    setQuantidades({...quantidades,[material.id]:0});
    setDestinos({...destinos,[material.id]:""});

    carregarMateriais();

  }

  async function excluir(materialId:string){

    if(role !== "admin"){
      alert("Apenas administradores podem excluir materiais.");
      return;
    }

    if(!confirm("Excluir material?")) return;

    await deleteDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",materialId)
    );

    mostrarMensagem("Material excluído");

    carregarMateriais();

  }

  const filtrados = materiais.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return(

    <div className="max-w-6xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-6">
        Controle de Estoque
      </h1>

      <input
        placeholder="Buscar material..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
        className="border p-3 rounded mb-6 w-full"
      />

      {mensagem && (

        <div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl">
          {mensagem}
        </div>

      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100">

            <tr>
              <th className="p-3 text-left">Material</th>
              <th className="p-3 text-center">Saldo</th>
              <th className="p-3 text-center">Ação</th>
            </tr>

          </thead>

          <tbody>

            {filtrados.map(material=>(

              <>
              <tr
                key={material.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={()=>setMaterialSelecionado(
                  materialSelecionado === material.id ? null : material.id
                )}
              >

                <td className="p-3 font-medium">
                  {material.nome}
                </td>

                <td className={`p-3 text-center font-bold ${corSaldo(material.saldo)}`}>
                  {material.saldo} {material.unidade}
                </td>

                <td className="p-3 text-center">
                  Abrir
                </td>

              </tr>

              {materialSelecionado === material.id && (

                <tr className="bg-gray-50">

                  <td colSpan={3} className="p-4">

                    <div className="flex flex-wrap gap-3">

                      <input
                        type="number"
                        placeholder="Qtd"
                        className="border p-2 w-24 rounded"
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
                        className="bg-green-600 text-white px-4 py-2 rounded"
                      >
                        Entrada
                      </button>

                      <select
                        value={destinos[material.id] ?? ""}
                        onChange={(e)=>
                          setDestinos({
                            ...destinos,
                            [material.id]:e.target.value
                          })
                        }
                        className="border p-2 rounded"
                      >
                        <option value="">Obra destino</option>

                        {obras.map(obra=>(
                          <option key={obra.id} value={obra.id}>
                            {obra.nome}
                          </option>
                        ))}

                      </select>

                      <button
                        onClick={()=>transferir(material)}
                        className="bg-purple-600 text-white px-4 py-2 rounded"
                      >
                        Transferir
                      </button>

                      <input
                        type="number"
                        placeholder="Estoque mínimo"
                        value={minimos[material.id] ?? material.estoqueMinimo ?? ""}
                        onChange={(e)=>
                          setMinimos({
                            ...minimos,
                            [material.id]:Number(e.target.value)
                          })
                        }
                        className="border p-2 w-32 rounded"
                      />

                      <button
                        onClick={()=>salvarMinimo(material)}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Salvar mínimo
                      </button>

                      {role === "admin" && (

                        <button
                          onClick={()=>excluir(material.id)}
                          className="text-red-600 font-semibold"
                        >
                          Excluir
                        </button>

                      )}

                    </div>

                  </td>

                </tr>

              )}

              </>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}