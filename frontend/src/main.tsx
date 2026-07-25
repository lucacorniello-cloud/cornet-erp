import React, {useEffect, useMemo, useState} from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle, ArrowLeftRight, BriefcaseBusiness, Building2, CheckCircle2,
  FileClock, FileSpreadsheet, History, LayoutDashboard, LogOut, Search,
  UploadCloud, Users, XCircle
} from "lucide-react";
import "./style.css";

const API=import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

type Page="dashboard"|"customers"|"imports";
type ImportSummary={
  id:string; competence_month:string; file_name:string; status:string; row_count:number;
  customer_count:number; new_customers:number; missing_customers:number; new_assets:number;
  removed_assets:number; field_changes:number; campaign_changes:number; uploaded_at:string;
};
type ImportPreview={
  file_name:string; file_sha256:string; row_count:number; customer_count:number; asset_count:number;
  campaign_count:number; campaign_names:string[];
  quality:{duplicate_asset_rows:number;rows_without_tax_id:number;rows_without_customer_code:number};
  sample_rows:Array<{
    row_number:number;business_name:string;customer_code:string;tax_id:string;asset_type:string;
    asset_number:string;plan:string;status:string;monthly_fee:string;campaigns:Record<string,string>;
  }>;
};

function App(){
  const [logged,setLogged]=useState(!!localStorage.getItem("token"));
  return logged
    ? <Workspace logout={()=>{localStorage.clear();setLogged(false)}}/>
    : <Login done={(t)=>{localStorage.setItem("token",t);setLogged(true)}}/>;
}

function Login({done}:{done:(t:string)=>void}){
  const [email,setEmail]=useState("admin@cornet.local");
  const [password,setPassword]=useState("Cornet123!");
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault(); setError("");
    try{
      const r=await fetch(API+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      if(!r.ok){setError("Credenziali non valide");return;}
      const d=await r.json(); done(d.access_token);
    }catch{setError("Il server non è raggiungibile");}
  }
  return <main className="login">
    <section className="hero"><div className="logo">C</div><div><small>CORNET SOLUTIONS</small><h1>Il centro operativo del tuo negozio.</h1><p>Clienti, contratti, portafoglio Business e attività in un unico ambiente.</p></div></section>
    <section className="formwrap"><form onSubmit={submit}><small>CORNET ERP 0.2</small><h2>Accedi al gestionale</h2><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button>Accedi</button></form></section>
  </main>;
}

function Workspace({logout}:{logout:()=>void}){
  const [page,setPage]=useState<Page>("dashboard");
  return <div className="shell">
    <aside>
      <div className="brand"><div className="logo small">C</div><div><b>Cornet ERP</b><small>Business Suite</small></div></div>
      <nav>
        <Nav active={page==="dashboard"} icon={<LayoutDashboard/>} onClick={()=>setPage("dashboard")}>Dashboard</Nav>
        <Nav active={page==="customers"} icon={<Users/>} onClick={()=>setPage("customers")}>Clienti</Nav>
        <Nav active={page==="imports"} icon={<FileSpreadsheet/>} onClick={()=>setPage("imports")}>Importazioni Business</Nav>
      </nav>
      <div className="navfoot"><span>VERSIONE</span><b>0.2 · WINDTRE SME</b></div>
    </aside>
    <section className="content">
      <header><div className="search"><Search size={17}/>Cerca clienti, codici, linee e campagne...</div><button className="icon" onClick={logout} title="Esci"><LogOut size={18}/></button></header>
      {page==="dashboard"&&<Dashboard openImports={()=>setPage("imports")}/>}
      {page==="customers"&&<Customers/>}
      {page==="imports"&&<Imports/>}
    </section>
  </div>;
}

function Nav({active,icon,onClick,children}:{active:boolean;icon:React.ReactNode;onClick:()=>void;children:React.ReactNode}){
  return <button className={active?"active":""} onClick={onClick}>{icon}<span>{children}</span></button>;
}

function Dashboard({openImports}:{openImports:()=>void}){
  const [s,setS]=useState<any>(null);
  useEffect(()=>{fetch(API+"/dashboard/summary").then(r=>r.json()).then(setS)},[]);
  const last=s?.last_import;
  return <main className="page">
    <div className="title"><div><small>CENTRO OPERATIVO</small><h1>Buongiorno, Luca.</h1><p>Portafoglio clienti e variazioni WINDTRE Business.</p></div><button className="new" onClick={openImports}><UploadCloud size={18}/>Importa estrazione</button></div>
    <div className="status"><span></span><div><b>{last?"Ultima estrazione acquisita":"Pronto per la prima estrazione"}</b><p>{last?`${monthLabel(last.competence_month)} · ${last.customer_count} clienti · ${last.row_count} righe`:"Carica il file Excel mensile del DB Tool WINDTRE"}</p></div></div>
    <div className="kpis">
      <Card icon={<Users/>} label="Clienti CRM" value={s?.customers}/>
      <Card icon={<Building2/>} label="Clienti SME importati" value={last?.customer_count??0}/>
      <Card icon={<ArrowLeftRight/>} label="Variazioni rilevate" value={last?(last.field_changes+last.campaign_changes):0}/>
      <Card icon={<AlertTriangle/>} label="Non più presenti" value={last?.missing_customers??0}/>
    </div>
    <div className="grid">
      <article><h2>Monitoraggio mensile</h2>{last?<div className="metriclist">
        <Metric label="Nuovi clienti" value={last.new_customers} tone="positive"/>
        <Metric label="Nuovi asset" value={last.new_assets} tone="positive"/>
        <Metric label="Asset non più presenti" value={last.removed_assets} tone="warning"/>
        <Metric label="Cambi campagne" value={last.campaign_changes} tone="brand"/>
      </div>:<Empty icon={<FileSpreadsheet/>} text="Nessuna estrazione caricata"/>}</article>
      <article><h2>Controlli consigliati</h2><p>Clienti assenti dall’ultima estrazione</p><p>Variazioni piano e canone</p><p>Ingressi e uscite dalle campagne</p></article>
    </div>
  </main>;
}

function Customers(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setLoading(true);
    const timer=setTimeout(()=>fetch(API+"/customers?segment=BUSINESS_SME&search="+encodeURIComponent(search)).then(r=>r.json()).then(setItems).finally(()=>setLoading(false)),250);
    return()=>clearTimeout(timer);
  },[search]);
  async function openCustomer(id:string){
    const response=await fetch(API+"/customers/"+id);
    if(response.ok)setSelected(await response.json());
  }
  return <main className="page">
    <div className="title"><div><small>CRM · BUSINESS SME</small><h1>Portafoglio clienti</h1><p>Clienti consolidati dalle estrazioni mensili WINDTRE.</p></div></div>
    <div className="toolbar"><div className="inputsearch"><Search size={17}/><input placeholder="Ragione sociale, P.IVA, codice cliente..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{items.length} clienti</span></div>
    <article className="tablecard">{loading?<div className="loading">Caricamento…</div>:items.length?<table><thead><tr><th>Cliente</th><th>Codice WINDTRE</th><th>P.IVA / C.F.</th><th>Spesa mensile</th><th>Ultima presenza</th><th>Stato</th><th></th></tr></thead><tbody>{items.map(c=><tr key={c.id} className="customerrow" onClick={()=>openCustomer(c.id)}><td><b>{c.business_name}</b><small>Business SME</small></td><td>{c.windtre_customer_code||"—"}</td><td>{c.tax_id||c.fiscal_code||"—"}</td><td><b className="money">{formatCurrency(c.monthly_spend)}</b></td><td>{c.last_seen_month?monthLabel(c.last_seen_month):"—"}</td><td><Status value={c.portfolio_status}/></td><td><button className="linkbtn" onClick={event=>{event.stopPropagation();openCustomer(c.id)}}>Utenze</button></td></tr>)}</tbody></table>:<Empty icon={<Users/>} text="I clienti compariranno dopo la prima importazione"/>}</article>
    {selected&&<CustomerDetail item={selected} close={()=>setSelected(null)}/>}
  </main>;
}

function CustomerDetail({item,close}:{item:any;close:()=>void}){
  const campaigns=Array.from(new Set((item.assets||[]).flatMap((asset:any)=>Object.keys(asset.campaigns||{}))));
  return <div className="overlay" onMouseDown={event=>{if(event.currentTarget===event.target)close()}}>
    <section className="drawer customerdrawer"><button className="close" onClick={close}>×</button>
      <small>CLIENTE BUSINESS SME</small><h2>{item.business_name}</h2>
      <div className="customerfacts">
        <div><span>Codice WINDTRE</span><b>{item.windtre_customer_code||"—"}</b></div>
        <div><span>P.IVA / C.F.</span><b>{item.tax_id||item.fiscal_code||"—"}</b></div>
        <div><span>Fotografia portafoglio</span><b>{item.snapshot_month?monthLabel(item.snapshot_month):"—"}</b></div>
        <div className="spendfact"><span>Spesa mensile complessiva</span><b>{formatCurrency(item.monthly_spend)}</b></div>
      </div>
      <div className="sectiontitle"><div><FileSpreadsheet/><h2>Utenze e servizi</h2></div><span>{item.assets?.length||0} elementi</span></div>
      {item.assets?.length?<div className="assetlist">{item.assets.map((asset:any)=><article className="assetcard" key={asset.asset_key}>
        <div className="assethead"><div className="asseticon"><BriefcaseBusiness/></div><div><small>{asset.asset_type||"UTENZA WINDTRE"}</small><h3>{asset.asset_number||asset.asset_key}</h3></div><Status value={asset.status==="ACTIVE"?"ACTIVE":item.portfolio_status}/></div>
        <div className="assetdata"><div><span>Piano / offerta</span><b>{asset.plan||"Non indicato"}</b></div><div><span>Canone</span><b>{asset.monthly_fee?formatCurrency(asset.monthly_fee):"—"}</b></div><div><span>Data attivazione</span><b>{formatDate(asset.activation_date)}</b></div><div><span>Stato DB Tool</span><b>{asset.status||"—"}</b></div></div>
        {asset.details?.length>0&&<div className="assetdetails">{asset.details.map((detail:any)=><div key={detail.key}><span>{detail.label}</span><b>{detail.value}</b></div>)}</div>}
        {Object.keys(asset.campaigns||{}).length>0&&<div className="campaignchips">{Object.entries(asset.campaigns).map(([name,value]:any)=><span key={name}><b>{name}</b> {value}</span>)}</div>}
      </article>)}</div>:<Empty icon={<FileSpreadsheet/>} text="Nessuna utenza nell’ultima estrazione"/>}
      {campaigns.length>0&&<p className="previewnote">{campaigns.length} campagne distinte rilevate sulle utenze del cliente.</p>}
    </section>
  </div>
}

function Imports(){
  const [history,setHistory]=useState<ImportSummary[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [preview,setPreview]=useState<ImportPreview|null>(null);
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<{kind:"ok"|"error";text:string}|null>(null);
  const load=()=>fetch(API+"/windtre-imports").then(r=>r.json()).then(setHistory);
  useEffect(()=>{load()},[]);
  async function analyze(e:React.FormEvent){
    e.preventDefault(); if(!file)return; setBusy(true);setMessage(null);
    const data=new FormData();data.append("file",file);
    try{
      const r=await fetch(API+"/windtre-imports/preview",{method:"POST",body:data});
      const result=await r.json();
      if(!r.ok)throw new Error(result.detail||"Analisi non riuscita");
      setPreview(result);
      setMessage({kind:"ok",text:"Analisi completata. Controlla l’anteprima prima di confermare."});
    }catch(err:any){setMessage({kind:"error",text:err.message});}
    finally{setBusy(false);}
  }
  async function confirmImport(){
    if(!file||!preview)return; setBusy(true);setMessage(null);
    const data=new FormData();data.append("competence_month",month);data.append("file",file);
    try{
      const r=await fetch(API+"/windtre-imports",{method:"POST",body:data});
      const result=await r.json();
      if(!r.ok)throw new Error(result.detail||"Importazione non riuscita");
      setMessage({kind:"ok",text:`Importazione salvata: ${result.customer_count} clienti e ${result.row_count} righe.`});
      setFile(null);setPreview(null);await load();await showDetail(result.id);
    }catch(err:any){setMessage({kind:"error",text:err.message});}
    finally{setBusy(false);}
  }
  function chooseFile(next:File|null){setFile(next);setPreview(null);setMessage(null)}
  async function showDetail(id:string){const r=await fetch(API+"/windtre-imports/"+id);setSelected(await r.json())}
  return <main className="page">
    <div className="title"><div><small>WINDTRE BUSINESS SME</small><h1>Importazioni mensili</h1><p>Conserva ogni fotografia del portafoglio e confronta automaticamente i mesi.</p></div></div>
    <div className="importgrid">
      <form className="uploadcard" onSubmit={analyze}>
        <div className="uploadicon"><UploadCloud/></div><div><h2>Carica estrazione DB Tool</h2><p>File Excel .xlsx o .xlsm, massimo 40 MB.</p></div>
        <label>Mese di competenza<input type="month" value={month} onChange={e=>setMonth(e.target.value)} required/></label>
        <label className="drop"><FileSpreadsheet/><span>{file?file.name:"Seleziona il file Excel"}</span><input type="file" accept=".xlsx,.xlsm" onChange={e=>chooseFile(e.target.files?.[0]||null)}/></label>
        {message&&<div className={"notice "+message.kind}>{message.kind==="ok"?<CheckCircle2/>:<XCircle/>}{message.text}</div>}
        {!preview&&<button className="new" disabled={!file||busy}>{busy?"Analisi in corso…":"Analizza il file"}</button>}
        {preview&&<div className="previewactions"><button type="button" className="secondary" onClick={()=>{setPreview(null);setMessage(null)}}>Modifica selezione</button><button type="button" className="new" onClick={confirmImport} disabled={busy}>{busy?"Salvataggio…":"Conferma e importa"}</button></div>}
      </form>
      <article className="explain"><h2>Cosa viene controllato</h2><ul><li>Nuovi clienti e clienti non più presenti</li><li>Nuove linee, SIM e asset rimossi</li><li>Cambi di piano, stato, canone e servizi</li><li>Ingressi, uscite e livelli delle campagne V_, C_ e I_</li></ul><div className="privacy">Il file originale non viene salvato: conserviamo dati strutturati, impronta del file e storico delle differenze.</div></article>
    </div>
    {preview&&<PreviewPanel item={preview}/>}
    <div className="sectiontitle"><div><History/><h2>Storico importazioni</h2></div><span>{history.length} estrazioni</span></div>
    <article className="tablecard">{history.length?<table><thead><tr><th>Mese</th><th>File</th><th>Clienti</th><th>Nuovi</th><th>Assenti</th><th>Variazioni</th><th></th></tr></thead><tbody>{history.map(i=><tr key={i.id}><td><b>{monthLabel(i.competence_month)}</b></td><td>{i.file_name}<small>{i.row_count} righe</small></td><td>{i.customer_count}</td><td className="positive">{i.new_customers}</td><td className="warning">{i.missing_customers}</td><td>{i.field_changes+i.campaign_changes}</td><td><button className="linkbtn" onClick={()=>showDetail(i.id)}>Dettagli</button></td></tr>)}</tbody></table>:<Empty icon={<History/>} text="Nessuna importazione nello storico"/>}</article>
    {selected&&<ImportDetail item={selected} close={()=>setSelected(null)}/>}
  </main>;
}

function PreviewPanel({item}:{item:ImportPreview}){
  const warnings=item.quality.duplicate_asset_rows+item.quality.rows_without_tax_id+item.quality.rows_without_customer_code;
  return <section className="previewpanel">
    <div className="sectiontitle"><div><FileClock/><h2>Anteprima da confermare</h2></div><span>{warnings?warnings+" segnalazioni":"Dati coerenti"}</span></div>
    <div className="miniKpis previewkpis">
      <b>{item.customer_count}<span>Clienti</span></b><b>{item.asset_count}<span>Asset</span></b>
      <b>{item.row_count}<span>Righe</span></b><b>{item.campaign_count}<span>Campagne</span></b>
    </div>
    {warnings>0&&<div className="quality">
      <AlertTriangle/><div><b>Controlli qualità</b><p>{item.quality.duplicate_asset_rows} righe asset duplicate · {item.quality.rows_without_tax_id} senza P.IVA/C.F. · {item.quality.rows_without_customer_code} senza codice cliente</p></div>
    </div>}
    <div className="sampletable"><table><thead><tr><th>Riga</th><th>Cliente</th><th>Codice</th><th>Asset</th><th>Piano</th><th>Campagne</th></tr></thead><tbody>
      {item.sample_rows.map(row=><tr key={row.row_number}><td>{row.row_number}</td><td><b>{row.business_name}</b><small>{row.tax_id||"P.IVA/C.F. non disponibile"}</small></td><td>{row.customer_code||"—"}</td><td>{row.asset_number||row.asset_type||"—"}</td><td>{row.plan||"—"}</td><td>{Object.keys(row.campaigns).length}</td></tr>)}
    </tbody></table></div>
    {item.row_count>item.sample_rows.length&&<p className="previewnote">Mostrate le prime {item.sample_rows.length} righe su {item.row_count}. Il salvataggio avverrà solo dopo la conferma.</p>}
  </section>
}

function ImportDetail({item,close}:{item:any;close:()=>void}){
  const grouped=useMemo(()=>Object.entries((item.changes||[]).reduce((acc:any,c:any)=>{(acc[c.change_type]??=[]).push(c);return acc},{})),[item]);
  return <div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><section className="drawer"><button className="close" onClick={close}>×</button><small>ESTRAZIONE {item.competence_month}</small><h2>{item.file_name}</h2><div className="miniKpis"><b>{item.customer_count}<span>Clienti</span></b><b>{item.new_customers}<span>Nuovi</span></b><b>{item.missing_customers}<span>Assenti</span></b><b>{item.campaign_changes}<span>Campagne</span></b></div>{grouped.length?grouped.map(([name,changes]:any)=><div className="changegroup" key={name}><h3>{changeLabel(name)} <span>{changes.length}</span></h3>{changes.slice(0,100).map((c:any)=><div className="change" key={c.id}><div><b>{c.customer_key}</b><small>{c.asset_key||"Cliente"}</small></div><div><strong>{c.field_name||changeLabel(c.change_type)}</strong><small>{c.old_value||"—"} → {c.new_value||"—"}</small></div></div>)}</div>):<Empty icon={<CheckCircle2/>} text="Prima fotografia acquisita: nessun mese precedente da confrontare"/>}</section></div>;
}

function Card({label,value,icon}:{label:string;value:any;icon?:React.ReactNode}){return <article className="card">{icon}<span>{label}</span><strong>{value??"—"}</strong><small>Aggiornato ora</small></article>}
function Metric({label,value,tone}:{label:string;value:number;tone:string}){return <div className="metric"><span className={tone}></span><b>{label}</b><strong>{value}</strong></div>}
function Empty({icon,text}:{icon:React.ReactNode;text:string}){return <div className="empty">{icon}<b>{text}</b><span>Il contenuto sarà aggiornato automaticamente.</span></div>}
function Status({value}:{value:string}){return <span className={"badge "+(value==="ACTIVE"?"active":"missing")}>{value==="ACTIVE"?"Presente":"Da verificare"}</span>}
function monthLabel(value:string){if(!value)return"—";const [y,m]=value.split("-");return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date(Number(y),Number(m)-1,1))}
function changeLabel(value:string){return({NEW_CUSTOMER:"Nuovi clienti",MISSING_CUSTOMER:"Clienti non più presenti",NEW_ASSET:"Nuovi asset",REMOVED_ASSET:"Asset non più presenti",FIELD_CHANGED:"Variazioni servizi",CAMPAIGN_ENTERED:"Ingresso campagne",CAMPAIGN_EXITED:"Uscita campagne",CAMPAIGN_CHANGED:"Variazione campagne"} as any)[value]||value}
function formatCurrency(value:any){let normalized=String(value??"").replace("€","").replace(/\s/g,"");if(normalized.includes(",")&&normalized.includes("."))normalized=normalized.replace(/\./g,"").replace(",",".");else normalized=normalized.replace(",",".");const numeric=typeof value==="number"?value:Number(normalized);return Number.isFinite(numeric)?new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(numeric):"—"}
function formatDate(value:any){if(!value)return"—";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat("it-IT").format(parsed)}

ReactDOM.createRoot(document.getElementById("root")!).render(<App/>);
