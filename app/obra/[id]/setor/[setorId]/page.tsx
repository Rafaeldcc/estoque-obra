"use client";

import { useEffect, useState } from "react";

import {
collection,
getDocs,
doc,
updateDoc,
addDoc,
deleteDoc,
getDoc
} from "firebase/firestore";

import {
ref,
uploadBytes,
getDownloadURL
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";

interface Material{
id:string
nome:string
saldo:number
unidade:string
foto?:string
estoqueMinimo?:number
}

export default function ControleEstoque(){

const router = useRouter()
const params = useParams()

const obraId = params.id as string
const setorId = params.setorId as string

const [materiais,setMateriais] = useState<Material[]>([])
const [materialSelecionado,setMaterialSelecionado] = useState<Material | null>(null)
const [busca,setBusca] = useState("")
const [mensagem,setMensagem] = useState("")

const [quantidade,setQuantidade] = useState(0)
const [tipoMov,setTipoMov] = useState("uso")

const [obras,setObras] = useState<any[]>([])
const [obraDestino,setObraDestino] = useState("")

useEffect(()=>{
carregarMateriais()
carregarObras()
},[])

// 🔥 BUSCAR OBRAS
async function carregarObras(){

const snap = await getDocs(collection(db,"obras"))

const lista:any[] = []

snap.forEach(docSnap=>{
const data = docSnap.data()

lista.push({
id:docSnap.id,
nome:data.nome
})
})

setObras(lista)

}

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
foto:data.foto ?? "",
estoqueMinimo:data.estoqueMinimo ?? 0
})

})

lista.sort((a,b)=>a.nome.localeCompare(b.nome))

setMateriais(lista)

}

function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

// 🔥 EXCLUIR
async function excluirMaterial(material:Material){

if(!confirm(`Excluir ${material.nome}?`)) return

await deleteDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id)
)

mostrarMensagem("Material excluído")

await carregarMateriais()

}

// 🔥 SAÍDA (TRANSFERÊNCIA CORRIGIDA)
async function registrarSaida(){

if(!materialSelecionado) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

if(quantidade > materialSelecionado.saldo){
return alert("Estoque insuficiente")
}

if(tipoMov === "transferencia" && !obraDestino){
return alert("Selecione a obra de destino")
}

const novoSaldo = materialSelecionado.saldo - quantidade

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{saldo: novoSaldo}
)

// 🔥 TRANSFERÊNCIA REAL
if(tipoMov === "transferencia"){

const obraDestinoId = obraDestino

// 🔥 BUSCAR SETOR ATUAL
const setorRef = doc(db,"obras",obraId,"setores",setorId)
const setorSnap = await getDoc(setorRef)

if(!setorSnap.exists()){
return alert("Setor não encontrado")
}

const setorNome = setorSnap.data().nome

// 🔥 CRIAR OU BUSCAR SETOR DESTINO
const setoresDestinoRef = collection(db,"obras",obraDestinoId,"setores")
const setoresSnap = await getDocs(setoresDestinoRef)

let setorDestinoId = ""

const setorExistente = setoresSnap.docs.find(
s => s.data().nome === setorNome
)

if(setorExistente){
setorDestinoId = setorExistente.id
}else{

const novoSetor = await addDoc(setoresDestinoRef,{
nome:setorNome,
criadoEm:new Date()
})

setorDestinoId = novoSetor.id
}

// 🔥 MATERIAL DESTINO
const materiaisDestinoRef = collection(
db,
"obras",
obraDestinoId,
"setores",
setorDestinoId,
"materiais"
)

const materiaisSnap = await getDocs(materiaisDestinoRef)

let materialExiste = false

for(const docMat of materiaisSnap.docs){

const data = docMat.data()

if(data.nome === materialSelecionado.nome){

await updateDoc(docMat.ref,{
saldo: (data.saldo || 0) + quantidade
})

materialExiste = true
break
}
}

if(!materialExiste){

await addDoc(materiaisDestinoRef,{
nome: materialSelecionado.nome,
saldo: quantidade,
unidade: materialSelecionado.unidade || "",
estoqueMinimo: materialSelecionado.estoqueMinimo || 0,
foto: materialSelecionado.foto || ""
})

}

}

// 🔥 LOG
await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"saida",
destino: tipoMov,
obraId,
obraDestinoId: obraDestino,
usuarioNome:"Sistema",
criadoEm:new Date()
})

mostrarMensagem("Movimentação realizada com sucesso")

setQuantidade(0)
setObraDestino("")

await carregarMateriais()

}

// 🔥 ENTRADA
async function registrarEntrada(){

if(!materialSelecionado) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

const novoSaldo = materialSelecionado.saldo + quantidade

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{saldo: novoSaldo}
)

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"entrada",
obraNome:"Obra atual",
usuarioNome:"Sistema",
criadoEm:new Date()
})

mostrarMensagem("Entrada registrada")

setQuantidade(0)
await carregarMateriais()

}

// 🔥 FOTO
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

await carregarMateriais()

setMaterialSelecionado({
...material,
foto:url
})

mostrarMensagem("Foto salva com sucesso")

}

async function removerFoto(material:Material){

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{foto:""}
)

await carregarMateriais()

setMaterialSelecionado({
...material,
foto:""
})

mostrarMensagem("Foto removida")

}

// 🔥 ESTOQUE MÍNIMO
async function salvarEstoqueMinimo(){

if(!materialSelecionado) return

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{estoqueMinimo: materialSelecionado.estoqueMinimo ?? 0}
)

mostrarMensagem("Estoque mínimo salvo")

await carregarMateriais()

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

<div className="border rounded-xl overflow-hidden shadow">
<div className="max-h-[600px] overflow-y-auto">

<table className="w-full">

<thead className="bg-gray-100 sticky top-0">
<tr>
<th className="p-3 text-left">Material</th>
<th className="p-3 text-center">Quantidade</th>
</tr>
</thead>

<tbody>

{filtrados.map(material=>(

<tr
key={material.id}
className="border-t hover:bg-gray-50 cursor-pointer"
onClick={()=>setMaterialSelecionado(material)}
>

<td className="p-3 flex items-center justify-between">

<div className="flex items-center gap-3">

{material.foto && (
<img src={material.foto} className="w-10 h-10 rounded"/>
)}

{material.nome}

</div>

<button
onClick={(e)=>{
e.stopPropagation()
excluirMaterial(material)
}}
className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded transition"
>
🗑️
</button>

</td>

<td className="p-3 text-center font-bold">
{material.saldo} {material.unidade}
</td>

</tr>

))}

</tbody>
</table>

</div>
</div>
</>
)}

{materialSelecionado && (

<div className="bg-white border rounded-xl p-8 shadow-md">

<button
onClick={()=>setMaterialSelecionado(null)}
className="mb-6 text-blue-600"
>
← Voltar
</button>

<h2 className="text-xl font-bold mb-2">
{materialSelecionado.nome}
</h2>

<p className="mb-2 text-lg">
Quantidade atual:
<strong> {materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

<div className="mt-6 flex gap-3 flex-wrap">

<input
type="number"
value={quantidade}
onChange={(e)=>setQuantidade(Number(e.target.value))}
className="border p-2 rounded w-28"
/>

<select
value={tipoMov}
onChange={(e)=>setTipoMov(e.target.value)}
className="border p-2 rounded"
>
<option value="uso">Uso na obra</option>
<option value="transferencia">Transferência</option>
<option value="descarte">Descarte</option>
</select>

{tipoMov === "transferencia" && (
<select
value={obraDestino}
onChange={(e)=>setObraDestino(e.target.value)}
className="border p-2 rounded"
>
<option value="">Selecionar obra destino</option>

{obras
.filter(o => o.id !== obraId)
.map((obra)=>(
<option key={obra.id} value={obra.id}>
{obra.nome}
</option>
))}

</select>
)}

<button onClick={registrarSaida} className="bg-red-600 text-white px-4 py-2 rounded">
Confirmar
</button>

<button onClick={registrarEntrada} className="bg-green-600 text-white px-4 py-2 rounded">
Entrada
</button>

</div>

<div className="mt-6">
<input
type="number"
value={materialSelecionado.estoqueMinimo ?? 0}
onChange={(e)=>setMaterialSelecionado({
...materialSelecionado,
estoqueMinimo:Number(e.target.value)
})}
className="border p-2 rounded w-32"
/>

<button onClick={salvarEstoqueMinimo} className="ml-3 bg-blue-600 text-white px-4 py-2 rounded">
Salvar mínimo
</button>
</div>

<div className="mt-6">
{materialSelecionado.foto ? (
<>
<img src={materialSelecionado.foto} className="w-48 mb-3"/>
<button onClick={()=>removerFoto(materialSelecionado)} className="bg-red-600 text-white px-4 py-2 rounded">
Remover foto
</button>
</>
) : (
<label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
Adicionar foto
<input type="file" className="hidden" onChange={(e)=>uploadFoto(e,materialSelecionado)} />
</label>
)}
</div>

</div>
)}

{mensagem && (
<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded">
{mensagem}
</div>
)}

</div>
)
}