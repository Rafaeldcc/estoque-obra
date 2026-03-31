"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

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
const { user } = useAuth()

const searchParams = useSearchParams();
const materialUrl = searchParams.get("material");

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

const [editandoNome, setEditandoNome] = useState(false)
const [novoNome, setNovoNome] = useState("")

const [subcategorias, setSubcategorias] = useState<any[]>([])
const [subSelecionada, setSubSelecionada] = useState<any>(null)
const [nomeSub, setNomeSub] = useState("")

const [editandoSub, setEditandoSub] = useState<any>(null)
const [novoNomeSub, setNovoNomeSub] = useState("")

// 🔥 INIT

useEffect(()=>{
carregarObras()
},[])

useEffect(()=>{
carregarSubcategorias()
},[])

// 🔥 CARREGA MATERIAIS AO SELECIONAR SUB
useEffect(()=>{
if(subSelecionada){
carregarMateriais()
}
},[subSelecionada])

// 🔥 SELEÇÃO VIA URL
useEffect(() => {

if (!materialUrl || materiais.length === 0) return;

const encontrado = materiais.find(m =>
m.nome.toLowerCase().trim() === materialUrl.toLowerCase().trim()
);

if (encontrado) {
setMaterialSelecionado(encontrado);
}

}, [materialUrl, materiais]);

// 🔥 EXCLUIR MATERIAL
async function excluirMaterial(material: Material){

if(!subSelecionada) return

const confirmar = confirm(`Excluir ${material.nome}?`)
if (!confirmar) return

await deleteDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
material.id
)
)

mostrarMensagem("Material excluído")
carregarMateriais()
}

// 🔥 EDITAR NOME MATERIAL
async function salvarNomeMaterial(){

if(!materialSelecionado || !novoNome.trim() || !subSelecionada) return

await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
materialSelecionado.id
),
{ nome: novoNome }
)

setMaterialSelecionado({
...materialSelecionado,
nome: novoNome
})

setEditandoNome(false)
mostrarMensagem("Nome atualizado")
carregarMateriais()
}

// 🔥 SUBCATEGORIAS
async function carregarSubcategorias(){

const subRef = collection(db,"obras",obraId,"setores",setorId,"subcategorias")
const snap = await getDocs(subRef)

let lista:any[] = []

snap.forEach(docSnap=>{
lista.push({
id:docSnap.id,
...docSnap.data()
})
})

/* 🔥 SE NÃO EXISTE SUB → CRIA E MIGRA */
if(lista.length === 0){

// cria subcategoria padrão
const novaSub = await addDoc(subRef,{
nome:"Geral"
})

// pega materiais antigos
const materiaisAntigosRef = collection(
db,"obras",obraId,"setores",setorId,"materiais"
)

const materiaisSnap = await getDocs(materiaisAntigosRef)

for(const docMat of materiaisSnap.docs){

const data = docMat.data()

await addDoc(
collection(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
novaSub.id,
"materiais"
),
data
)

// remove antigo
await deleteDoc(docMat.ref)
}

// adiciona na lista
lista.push({
id:novaSub.id,
nome:"Geral"
})
}

/* 🔥 ORDENAÇÃO */
lista.sort((a,b)=>{
const numA = parseFloat(a.nome.replace(",", ".").match(/\d+(\.\d+)?/)?.[0] || "0")
const numB = parseFloat(b.nome.replace(",", ".").match(/\d+(\.\d+)?/)?.[0] || "0")
return numA - numB
})

setSubcategorias(lista)
}

// 🔥 OBRAS (ADICIONAR AQUI 👇)
async function carregarObras(){

const snap = await getDocs(collection(db,"obras"))

const lista:any[] = []

snap.forEach(docSnap=>{
lista.push({
id:docSnap.id,
...docSnap.data()
})
})

setObras(lista)
}

async function criarSubcategoria(){

if(!nomeSub.trim()) return

await addDoc(
collection(db,"obras",obraId,"setores",setorId,"subcategorias"),
{ nome: nomeSub }
)

setNomeSub("")
carregarSubcategorias()
}

async function salvarEdicaoSub(){

if(!novoNomeSub.trim()) return

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"subcategorias",editandoSub.id),
{ nome: novoNomeSub }
)

setEditandoSub(null)
carregarSubcategorias()
}

async function excluirSubcategoria(id:string){

if(!confirm("Excluir subcategoria?")) return

await deleteDoc(
doc(db,"obras",obraId,"setores",setorId,"subcategorias",id)
)

carregarSubcategorias()
}

// 🔥 MATERIAIS
async function carregarMateriais(){

if(!subSelecionada) return

const snapshot = await getDocs(
collection(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais"
)
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

// 🔥 MENSAGEM
function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

// 🔥 SAÍDA + TRANSFERÊNCIA
async function registrarSaida(){

if(!user){
alert("Usuário não autenticado")
return
}

if(!materialSelecionado || !subSelecionada) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

if(quantidade > materialSelecionado.saldo){
return alert("Estoque insuficiente")
}

if(tipoMov === "transferencia" && !obraDestino){
return alert("Selecione a obra destino")
}

const userSnap = await getDoc(doc(db,"usuarios",user.uid))
const empresaId = userSnap.data()?.empresaId || null

const obraSnap = await getDoc(doc(db,"obras",obraId))
const obraNome = obraSnap.data()?.nome || `Obra ${obraId}`

// 🔻 REMOVE DA ORIGEM
await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
materialSelecionado.id
),
{saldo: materialSelecionado.saldo - quantidade}
)

// 🔁 TRANSFERÊNCIA
if(tipoMov === "transferencia"){

const setorRef = doc(db,"obras",obraId,"setores",setorId)
const setorSnap = await getDoc(setorRef)
const setorNome = setorSnap.data()?.nome

const setoresDestinoRef = collection(db,"obras",obraDestino,"setores")
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
criadoEm: serverTimestamp()
})
setorDestinoId = novoSetor.id
}

// 🔥 AGORA COM SUBCATEGORIA
const subRef = collection(
db,
"obras",
obraDestino,
"setores",
setorDestinoId,
"subcategorias"
)

const subSnap = await getDocs(subRef)

let subDestinoId = ""

const subExistente = subSnap.docs.find(
s => s.data().nome === subSelecionada.nome
)

if(subExistente){
subDestinoId = subExistente.id
}else{
const novaSub = await addDoc(subRef,{
nome: subSelecionada.nome
})
subDestinoId = novaSub.id
}

// 🔥 MATERIAIS DENTRO DA SUB
const materiaisDestinoRef = collection(
db,
"obras",
obraDestino,
"setores",
setorDestinoId,
"subcategorias",
subDestinoId,
"materiais"
)

const materiaisSnap = await getDocs(materiaisDestinoRef)

let encontrou = false

for(const docMat of materiaisSnap.docs){
const data = docMat.data()

if(data.nome === materialSelecionado.nome){
await updateDoc(docMat.ref,{
saldo:(data.saldo || 0) + quantidade
})
encontrou = true
break
}
}

if(!encontrou){
await addDoc(materiaisDestinoRef,{
nome: materialSelecionado.nome,
saldo: quantidade,
unidade: materialSelecionado.unidade || "",
estoqueMinimo: materialSelecionado.estoqueMinimo || 0,
foto: materialSelecionado.foto || ""
})
}

const obraDestinoSnap = await getDoc(doc(db,"obras",obraDestino))
const obraDestinoNome = obraDestinoSnap.data()?.nome || `Obra ${obraDestino}`

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"entrada",
obraId: obraDestino,
obraNome: obraDestinoNome,
obraOrigemId: obraId,
obraDestinoId: obraDestino,
destino:"transferencia",
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})
}

// 🔴 SAÍDA
await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"saida",
obraId: obraId,
obraNome: obraNome,
obraOrigemId: obraId,
obraDestinoId: tipoMov === "transferencia" ? obraDestino : null,
destino: tipoMov,
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})

mostrarMensagem("Movimentação realizada com sucesso")

setQuantidade(0)
setObraDestino("")
carregarMateriais()
}

// 🔥 ENTRADA
async function registrarEntrada(){

if(!user){
alert("Usuário não autenticado")
return
}

if(!materialSelecionado || !subSelecionada) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

const userSnap = await getDoc(doc(db,"usuarios",user.uid))
const empresaId = userSnap.data()?.empresaId || null

const obraSnap = await getDoc(doc(db,"obras",obraId))
const obraNome = obraSnap.data()?.nome || `Obra ${obraId}`

await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
materialSelecionado.id
),
{saldo: materialSelecionado.saldo + quantidade}
)

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"entrada",
obraId,
obraNome,
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})

mostrarMensagem("Entrada registrada")

setQuantidade(0)
carregarMateriais()
}

// 🔥 FOTO
async function uploadFoto(e:any,material:Material){

if(!subSelecionada) return

const file = e.target.files[0]
if(!file) return

const storageRef = ref(
storage,
`materiais/${obraId}/${material.id}-${Date.now()}`
)

await uploadBytes(storageRef,file)
const url = await getDownloadURL(storageRef)

await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
material.id // ✅ CORRIGIDO
),
{foto:url}
)

carregarMateriais()

setMaterialSelecionado({...material,foto:url})

mostrarMensagem("Foto salva")
}

// 🔥 REMOVER FOTO
async function removerFoto(material:Material){

if(!subSelecionada) return

await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
material.id // ✅ CORRIGIDO
),
{foto:""}
)

carregarMateriais()

setMaterialSelecionado({...material,foto:""})

mostrarMensagem("Foto removida")
}

// 🔥 ESTOQUE MÍNIMO
async function salvarEstoqueMinimo(){

if(!materialSelecionado || !subSelecionada) return

await updateDoc(
doc(
db,
"obras",
obraId,
"setores",
setorId,
"subcategorias",
subSelecionada.id,
"materiais",
materialSelecionado.id
),
{estoqueMinimo: materialSelecionado.estoqueMinimo ?? 0}
)

mostrarMensagem("Estoque mínimo salvo")
carregarMateriais()
}

// 🔥 UTIL
function normalizar(texto:string){
return texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
}

const filtrados = materiais.filter(m =>
normalizar(m.nome).startsWith(normalizar(busca))
)

return(
<div className="max-w-6xl mx-auto p-8">

{/* 🔥 CRIAR SUBCATEGORIA */}
<div className="flex gap-2 mb-4">

<input
placeholder="Nome da subcategoria"
value={nomeSub}
onChange={(e)=>setNomeSub(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={criarSubcategoria}
className="bg-green-600 text-white px-4 rounded"
>
+ Subcategoria
</button>

</div>

{/* 🔥 LISTAR SUBCATEGORIAS */}
<div className="flex gap-2 flex-wrap mb-6">

{subcategorias.map(sub => (

<div
key={sub.id}
className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer ${
subSelecionada?.id === sub.id
? "bg-blue-600 text-white"
: "bg-gray-200"
}`}
>

{editandoSub?.id === sub.id ? (
<>
<input
value={novoNomeSub}
onChange={(e)=>setNovoNomeSub(e.target.value)}
className="text-black px-1 border rounded"
/>

<button onClick={salvarEdicaoSub}>💾</button>
</>
) : (
<span onClick={()=>setSubSelecionada(sub)}>
{sub.nome}
</span>
)}

<button
onClick={(e)=>{
e.stopPropagation()
setEditandoSub(sub)
setNovoNomeSub(sub.nome)
}}
>
✏️
</button>

<button
onClick={(e)=>{
e.stopPropagation()
excluirSubcategoria(sub.id)
}}
>
🗑
</button>

</div>

))}

</div>

{/* 🔥 BOTÃO CADASTRAR MATERIAL */}
{subSelecionada?.id && (
<button
onClick={()=>router.push(`/dashboard/cadastrar-material?obra=${obraId}&setor=${setorId}&sub=${subSelecionada.id}`)}
className="bg-green-700 text-white px-4 py-2 rounded mb-6"
>
+ Cadastrar Material
</button>
)}

{/* 🔥 LISTA DE MATERIAIS */}
{subSelecionada?.id && !materialSelecionado && (
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

{/* 🔥 DETALHE DO MATERIAL */}
{materialSelecionado && (
<div className="bg-white border rounded-xl p-8 shadow-md">

<button
onClick={()=>setMaterialSelecionado(null)}
className="mb-6 text-blue-600"
>
← Voltar
</button>

<h2 className="text-xl font-bold mb-4">
{materialSelecionado.nome}
</h2>

<p className="mb-4">
Quantidade: <strong>{materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

<div className="flex gap-3 flex-wrap items-center">

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

<button
onClick={registrarSaida}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Confirmar
</button>

<button
onClick={registrarEntrada}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Entrada
</button>

</div>

</div>
)}

{/* 🔥 MENSAGEM */}
{mensagem && (
<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded">
{mensagem}
</div>
)}

</div>
)
}