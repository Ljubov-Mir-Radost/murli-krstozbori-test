/* Download new dates without changing an open puzzle or its saved progress. */
const REMOTE_LIBRARY_KEY="murli-preview-remote-library-v1";
const syncBtn=document.getElementById("syncBtn");
const catalogueNotice=document.getElementById("catalogueNotice");
let syncInFlight=null,lastSyncAttempt=0;

function validateCatalogue(data){
  if(!data||data.schemaVersion!==1||!Array.isArray(data.crosswords)||data.crosswords.length>1000)
    throw new Error("Невалиден каталог.");
  const ids=new Set();
  return data.crosswords.map(item=>{
    if(!item||!/^\d{4}-\d{2}-\d{2}$/.test(item.id)||ids.has(item.id)||
      item.file!==`crosswords/${item.id}.json`||!/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error("Невалиден запис во каталогот.");
    const [y,m,d]=item.id.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));
    if(y<2000||y>2100||date.getUTCFullYear()!==y||date.getUTCMonth()+1!==m||date.getUTCDate()!==d)
      throw new Error("Невалиден датум во каталогот.");
    ids.add(item.id);return {id:item.id,file:item.file,sha256:item.sha256};
  });
}
async function fetchCatalogueFile(path,limit){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    // Same-origin paths only; bypass HTTP cache. Catalogue is deliberately not SW cached.
    const response=await fetch(new URL(path,document.baseURI),{cache:"no-store",signal:controller.signal,credentials:"omit",redirect:"error"});
    if(!response.ok)throw new Error("Датотеката не е достапна.");
    if(Number(response.headers.get("content-length"))>limit)throw new Error("Преголема датотека.");
    const reader=response.body.getReader();let length=0;const chunks=[];
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;
      if(length>limit){await reader.cancel();throw new Error("Преголема датотека.");}chunks.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return bytes;
  }finally{clearTimeout(timer);}
}
async function downloadCatalogue(){
  // Never overwrite an unreadable stored library with an empty one.
  const raw=localStorage.getItem(REMOTE_LIBRARY_KEY);
  const library=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(library))throw new Error("Оштетена локална архива.");
  const normalized=library.map(normalizePuzzle);
  const entries=validateCatalogue(JSON.parse(new TextDecoder().decode(await fetchCatalogueFile("./catalogue.json",256*1024))));
  let added=0,failed=0;
  for(const item of entries){
    // Local imports and previously published dates are preserved. Corrections use explicit JSON import.
    if(getPuzzle(item.id))continue;
    try{
      const bytes=await fetchCatalogueFile(item.file,512*1024);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
      if(digest!==item.sha256)throw new Error("Несовпаѓање на датотеката.");
      const puzzle=normalizePuzzle(JSON.parse(new TextDecoder().decode(bytes)));
      if(puzzle.id!==item.id)throw new Error("Несовпаѓање на датумот.");
      // Re-check after awaiting network: an import may have happened meanwhile.
      if(getPuzzle(item.id))continue;
      normalized.push(puzzle);added++;
    }catch(e){failed++;console.warn("Крстозборот не е преземен:",item.id,e);}
  }
  if(added)localStorage.setItem(REMOTE_LIBRARY_KEY,JSON.stringify(normalized));
  if(homeScreen.classList.contains("show"))renderArchive();
  return {added,failed};
}
function syncCatalogue(manual=false){
  if(syncInFlight)return syncInFlight;
  lastSyncAttempt=Date.now();syncBtn.disabled=true;
  catalogueNotice.textContent="Проверувам за нови крстозбори…";
  syncInFlight=downloadCatalogue().then(({added,failed})=>{
    catalogueNotice.textContent=failed
      ? `Преземени: ${added}. Некои крстозбори не се преземени; пробај повторно.`
      : added?`Додадени се ${added} нови крстозбори. Достапни се и офлајн.`:"Сите достапни крстозбори се зачувани на овој уред.";
    return {added,failed};
  }).catch(e=>{
    console.warn("Проверка на каталогот:",e);
    catalogueNotice.textContent=manual?"Не може да се провери сега. Зачуваните крстозбори остануваат достапни; пробај повторно со интернет."
      :"Зачуваните крстозбори се достапни. За нови крстозбори е потребен интернет.";
    return {added:0,failed:true};
  }).finally(()=>{syncBtn.disabled=false;syncInFlight=null;});
  return syncInFlight;
}
syncBtn.onclick=()=>syncCatalogue(true);
window.addEventListener("online",()=>syncCatalogue());
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&Date.now()-lastSyncAttempt>30*60*1000)syncCatalogue();
});
syncCatalogue();
