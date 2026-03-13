"use client";

import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useEffect, useState } from "react";

import {
collection,
getDocs,
updateDoc,
doc,
getDoc,
setDoc,
increment
} from "firebase/firestore";

import {
ref,
uploadBytes,
getDownloadURL
} from "firebase/storage";

import { db, storage, auth } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";

interface Material {
id:string
nome:string
saldo:number
unidade:string
foto?:string
}

interface Obra{
id:string
nome:string
}

export default function ControleEstoque(){

const router = useRouter()
const params = useParams()

const obraId = params.id as string
const setorId = params.setorId as string

const [materiais,setMateriais] = useState<Material[]>([])
const [obras,setObras] = useState<Obra[]>([])
const [quantidades,setQuantidades] = useState<{[key:string]:number}>({})
const [destinos,setDestinos] = useState<{[key:string]:string}>({})
const [tipoMov,setTipoMov] = useState<{[key:string]:string}>({})
const [busca,setBusca] = useState("")
const [materialSelecionado,setMaterialSelecionado] = useState<Material | null>(null)
const [mensagem,setMensagem] = useState("")

useEffect(()=>{
carregarMateriais()
carregarObras()
},[])

async function carregarMateriais(){

const snapshot = await getDocs(
collection(db,"obras",obraId,"setores",setorId,"materiais")
)

const lista:Material[] = []

snapshot.forEach(docSnap=>{

const data = docSnap.data()

lista.push({
id:docSnap.id,
nome:data.nome,
saldo:data.saldo ?? 0,
unidade:data.unidade ?? "",
foto:data.foto ?? ""
})

})

lista.sort((a,b)=>a.nome.localeCompare(b.nome))

setMateriais(lista)

}

async function carregarObras(){

const snapshot = await getDocs(collection(db,"obras"))

const lista:Obra[] = []

snapshot.forEach(docSnap=>{
lista.push({
id:docSnap.id,
nome:docSnap.data().nome
})
})

setObras(lista.filter(o=>o.id!==obraId))

}

function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

async function uploadFoto(e:any,material:Material){

const file = e.target.files[0]
if(!file) return

const storageRef = ref(
storage,
`materiais/${obraId}/${material.id}-${Date.now()}`
)

await uploadBytes(storageRef,file)

const url = await getDownloadURL(storageRef)

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{foto:url}
)

mostrarMensagem("Foto salva")

}

async function entrada(material:Material){

const qtd = Number(quantidades[material.id] ?? 0)

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{saldo:increment(qtd)}
)

material.saldo += qtd
setMateriais([...materiais])

await registrarMovimentacao({

materialId:material.id,
materialNome:material.nome,

tipo:"entrada",
quantidade:qtd,

obraId:obraId,
obraNome:"",

setorId:setorId,
setorNome:"",

destino:"uso",
obraDestino:null,

usuarioId:auth.currentUser?.uid || "",
usuarioNome:auth.currentUser?.email || "",

empresaId:""

})

mostrarMensagem("Material adicionado")

}

async function usarNaObra(material:Material){

const qtd = Number(quantidades[material.id] ?? 0)

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{saldo:increment(-qtd)}
)

material.saldo -= qtd
setMateriais([...materiais])

await registrarMovimentacao({

materialId:material.id,
materialNome:material.nome,

tipo:"saida",
quantidade:qtd,

obraId:obraId,
obraNome:"",

setorId:setorId,
setorNome:"",

destino:"uso",
obraDestino:null,

usuarioId:auth.currentUser?.uid || "",
usuarioNome:auth.currentUser?.email || "",

empresaId:""

})

mostrarMensagem("Material usado na obra")

}

async function descartarMaterial(material:Material){

const qtd = Number(quantidades[material.id] ?? 0)

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{saldo:increment(-qtd)}
)

material.saldo -= qtd
setMateriais([...materiais])

await registrarMovimentacao({

materialId:material.id,
materialNome:material.nome,

tipo:"saida",
quantidade:qtd,

obraId:obraId,
obraNome:"",

setorId:setorId,
setorNome:"",

destino:"descarte",
obraDestino:null,

usuarioId:auth.currentUser?.uid || "",
usuarioNome:auth.currentUser?.email || "",

empresaId:""

})

mostrarMensagem("Material descartado")

}

async function transferir(material:Material){

const qtd = Number(quantidades[material.id] ?? 0)
const destinoObra = destinos[material.id]

if(!destinoObra){
alert("Selecione a obra destino")
return
}

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{saldo:increment(-qtd)}
)

material.saldo -= qtd
setMateriais([...materiais])

const setorDestinoRef = doc(
db,
"obras",
destinoObra,
"setores",
setorId
)

const setorSnap = await getDoc(setorDestinoRef)

if(!setorSnap.exists()){

const setorOrigem = await getDoc(
doc(db,"obras",obraId,"setores",setorId)
)

await setDoc(setorDestinoRef,{
nome:setorOrigem.data()?.nome || "Setor"
})

}

const materialDestinoRef = doc(
db,
"obras",
destinoObra,
"setores",
setorId,
"materiais",
material.id
)

await updateDoc(materialDestinoRef,{
nome:material.nome,
saldo:increment(qtd),
unidade:material.unidade
}).catch(async()=>{

await setDoc(materialDestinoRef,{
nome:material.nome,
saldo:qtd,
unidade:material.unidade
})

})

await registrarMovimentacao({

materialId:material.id,
materialNome:material.nome,

tipo:"transferencia",
quantidade:qtd,

obraId:obraId,
obraNome:"",

setorId:setorId,
setorNome:"",

destino:"transferencia",
obraDestino:destinoObra,

usuarioId:auth.currentUser?.uid || "",
usuarioNome:auth.currentUser?.email || "",

empresaId:""

})

mostrarMensagem("Transferência realizada")

}

function normalizar(texto:string){

return texto
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.toLowerCase()

}

const filtrados = materiais.filter(m =>
normalizar(m.nome).startsWith(normalizar(busca))
)

return(

<div className="max-w-6xl mx-auto p-8">

<button
onClick={()=>router.push(`/obra/${obraId}`)}
className="bg-gray-600 text-white px-4 py-2 rounded mb-6"
>
← Voltar
</button>

<h1 className="text-3xl font-bold mb-6">
Controle de Estoque
</h1>

{!materialSelecionado && (

<>

<input
placeholder="Buscar material..."
value={busca}
onChange={(e)=>setBusca(e.target.value)}
className="border p-3 rounded mb-6 w-full"
/>

<table className="w-full border">

<thead className="bg-gray-100">
<tr>
<th className="p-3 text-left">Material</th>
<th className="p-3 text-center">Saldo</th>
</tr>
</thead>

<tbody>

{filtrados.map(material=>(

<tr
key={material.id}
className="border-t hover:bg-gray-50 cursor-pointer"
onClick={()=>setMaterialSelecionado(material)}
>

<td className="p-3">{material.nome}</td>

<td className="p-3 text-center font-bold">
{material.saldo} {material.unidade}
</td>

</tr>

))}

</tbody>

</table>

</>

)}

{materialSelecionado && (

<div className="bg-gray-50 border rounded-xl p-8">

<button
onClick={()=>setMaterialSelecionado(null)}
className="mb-6 text-blue-600"
>
← Voltar
</button>

<h2 className="text-xl font-bold mb-2">
{materialSelecionado.nome}
</h2>

<p className="mb-4">
Saldo atual: <strong>{materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

<input
type="file"
accept="image/*"
onChange={(e)=>uploadFoto(e,materialSelecionado)}
className="mb-4"
/>

<div className="flex gap-3 flex-wrap items-center">

<input
type="number"
placeholder="Quantidade"
className="border p-2 w-28 rounded"
onChange={(e)=>
setQuantidades({
...quantidades,
[materialSelecionado.id]:Number(e.target.value)
})
}
/>

<select
value={tipoMov[materialSelecionado.id] || "uso"}
className="border p-2 rounded"
onChange={(e)=>
setTipoMov({
...tipoMov,
[materialSelecionado.id]:e.target.value
})
}
>

<option value="uso">Uso na obra</option>
<option value="transferencia">Transferência</option>
<option value="descarte">Descarte</option>

</select>

{tipoMov[materialSelecionado.id]==="transferencia" && (

<select
className="border p-2 rounded"
onChange={(e)=>
setDestinos({
...destinos,
[materialSelecionado.id]:e.target.value
})
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
onClick={()=>{

const tipo = tipoMov[materialSelecionado.id] || "uso"

if(tipo==="transferencia") transferir(materialSelecionado)
else if(tipo==="descarte") descartarMaterial(materialSelecionado)
else usarNaObra(materialSelecionado)

}}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Confirmar
</button>

<button
onClick={()=>entrada(materialSelecionado)}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Adicionar material
</button>

</div>

</div>

)}

{mensagem && (

<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl">
{mensagem}
</div>

)}

</div>

)

}