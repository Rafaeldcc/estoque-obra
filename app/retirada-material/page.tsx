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
  query,
  where,
} from "firebase/firestore";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  setorId: string;
};

export default function RetiradaMaterial() {

  const [empresaId,setEmpresaId] = useState<string | null>(null);

  const [obras,setObras] = useState<any[]>([]);
  const [obraSelecionada,setObraSelecionada] = useState("");

  const [materiais,setMateriais] = useState<Material[]>([]);

  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [tipoMov,setTipoMov] = useState<{[key:string]:string}>({});
  const [obraDestino,setObraDestino] = useState<{[key:string]:string}>({});



  useEffect(()=>{

    const user = auth.currentUser;
    if(!user) return;

    carregarUsuario(user.uid);

  },[]);



  useEffect(()=>{

    if(empresaId){
      carregarObras();
    }

  },[empresaId]);



  useEffect(()=>{

    if(obraSelecionada){
      carregarMateriais(obraSelecionada);
    }

  },[obraSelecionada]);



  async function carregarUsuario(uid:string){

    const snap = await getDoc(doc(db,"usuarios",uid));

    if(snap.exists()){

      const data = snap.data();
      setEmpresaId(data.empresaId);

    }

  }



  async function carregarObras(){

    const q = query(
      collection(db,"obras"),
      where("empresaId","==",empresaId)
    );

    const snap = await getDocs(q);

    setObras(
      snap.docs.map(doc=>({
        id:doc.id,
        ...doc.data()
      }))
    );

  }



  async function carregarMateriais(obraId:string){

    const setoresSnap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    let lista:Material[] = [];

    for(const setorDoc of setoresSnap.docs){

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

      materiaisSnap.docs.forEach(docSnap=>{

        const data = docSnap.data();

        lista.push({
          id:docSnap.id,
          nome:data.nome,
          saldo:data.saldo || 0,
          unidade:data.unidade || "",
          setorId:setorDoc.id
        });

      });

    }

    setMateriais(lista);

  }



  async function retirar(material:Material){

    const qtd = quantidades[material.id];
    const tipo = tipoMov[material.id] || "uso";

    if(!qtd || qtd <= 0){
      alert("Quantidade inválida");
      return;
    }

    if(qtd > material.saldo){
      alert("Saldo insuficiente");
      return;
    }

    const materialRef = doc(
      db,
      "obras",
      obraSelecionada,
      "setores",
      material.setorId,
      "materiais",
      material.id
    );



    await updateDoc(materialRef,{
      saldo: increment(-qtd)
    });



    if(tipo === "transferencia"){

      const destinoId = obraDestino[material.id];

      if(!destinoId){
        alert("Selecione obra destino");
        return;
      }

      const materiaisDestinoRef = collection(
        db,
        "obras",
        destinoId,
        "setores",
        material.setorId,
        "materiais"
      );

      const snap = await getDocs(materiaisDestinoRef);

      let existe = false;

      for(const docSnap of snap.docs){

        if(docSnap.data().nome === material.nome){

          await updateDoc(docSnap.ref,{
            saldo: increment(qtd)
          });

          existe = true;

        }

      }

      if(!existe){

        await addDoc(materiaisDestinoRef,{
          nome:material.nome,
          saldo:qtd,
          unidade:material.unidade
        });

      }

    }



    const obraNome =
      obras.find((o) => o.id === obraSelecionada)?.nome || "";

    const obraDestinoNome =
      obras.find((o) => o.id === obraDestino[material.id])?.nome || "";



    await registrarMovimentacao({

      materialId: material.id,
      materialNome: material.nome,

      tipo: tipo === "transferencia" ? "transferencia" : "saida",

      quantidade: qtd,

      obraId: obraSelecionada,
      obraNome: obraNome,

      destino:
        tipo === "transferencia" ? "transferencia" : "uso",

      obraDestino:
        tipo === "transferencia"
          ? obraDestinoNome
          : "",

      usuarioId: auth.currentUser?.uid || "",
      usuarioNome: auth.currentUser?.email || "",

      empresaId: empresaId || ""

    });



    carregarMateriais(obraSelecionada);

  }



  return(

    <div style={{maxWidth:900,margin:"40px auto"}}>

      <h2>Retirada de Material</h2>



      <select
        style={{width:"100%",padding:10}}
        onChange={(e)=>setObraSelecionada(e.target.value)}
      >

        <option value="">Selecionar obra</option>

        {obras.map(obra=>(
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}

      </select>



      {materiais.map(material=>{

        const tipo = tipoMov[material.id] || "uso";

        return(

        <div
          key={material.id}
          style={{
            border:"1px solid #ccc",
            padding:15,
            marginTop:20,
            borderRadius:8
          }}
        >

          <b>{material.nome}</b>

          <span style={{float:"right"}}>
            Saldo: {material.saldo} {material.unidade}
          </span>



          <div style={{marginTop:10}}>

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidades[material.id] || ""}
              onChange={(e)=>
                setQuantidades(prev=>({
                  ...prev,
                  [material.id]: Number(e.target.value)
                }))
              }
              style={{width:100}}
            />



            <select
              value={tipo}
              onChange={(e)=>
                setTipoMov(prev=>({
                  ...prev,
                  [material.id]: e.target.value
                }))
              }
              style={{marginLeft:10}}
            >

              <option value="uso">Uso na obra</option>
              <option value="transferencia">Transferência</option>
              <option value="descarte">Descarte</option>

            </select>



            {tipo === "transferencia" && (

              <select
                style={{marginLeft:10}}
                onChange={(e)=>
                  setObraDestino(prev=>({
                    ...prev,
                    [material.id]: e.target.value
                  }))
                }
              >

                <option value="">Obra destino</option>

                {obras.map(o=>(
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}

              </select>

            )}



            <button
              onClick={()=>retirar(material)}
              style={{
                marginLeft:10,
                background:"#dc2626",
                color:"white",
                padding:"6px 12px",
                border:"none",
                borderRadius:4
              }}
            >
              Confirmar
            </button>

          </div>

        </div>

        )

      })}

    </div>

  );

}