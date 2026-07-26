import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle, BarChart3, Boxes, BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronRight, Download,
  CircleDollarSign, Copy, FileClock, FileSpreadsheet, FileText, History, LayoutDashboard, LoaderCircle, LogOut,
  Mail, MessageCircle, Package, Pencil, Plus, Printer, Search, Settings, ShoppingCart, Smartphone, Store,
  Tag, Trash2, Truck, UploadCloud, Users, Wifi, XCircle, Zap
} from "lucide-react";
import "./style.css";

const API=import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const ORDER_STATUSES=["INVIATO","IN_ATTESA","IN_LAVORAZIONE","RICEVUTO","EVASO"];
const SIM_STATUSES=["IN_MAGAZZINO","ASSEGNATA","ATTIVATA","DISABILITATA","SOSPESA"];

type Page="dashboard"|"customers"|"imports"|"windtrepanel"|"consumeractivations"|"postactivationconfig"|"incentives"|"tariffs"|"terminals"|"terminalinventory"|"products"|"orders"|"inventory"|"simreport"|"ddt"|"letterhead"|"settings";
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
type OperatorBrand={
  id:string; operator:string; display_name:string; logo_url:string|null; is_active:boolean; updated_at:string;
};

const OperatorBrandContext=createContext<Record<string,OperatorBrand>>({});

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
  const [store,setStore]=useState<any>(null);
  const [operatorBrands,setOperatorBrands]=useState<Record<string,OperatorBrand>>({});
  const [inventoryFilter,setInventoryFilter]=useState<any>({});
  useEffect(()=>{fetch(API+"/settings/store").then(r=>r.json()).then(setStore)},[]);
  useEffect(()=>{
    fetch(API+"/settings/operator-brands")
      .then(r=>r.json())
      .then((items:OperatorBrand[])=>setOperatorBrands(Object.fromEntries(items.map(item=>[item.operator,item]))))
      .catch(()=>setOperatorBrands({}));
  },[]);
  function openInventory(filter:any={}){setInventoryFilter(filter);setPage("inventory")}
  return <OperatorBrandContext.Provider value={operatorBrands}>
  <div className="shell">
    <aside>
      <div className="brand">{store?.logo_url?<img className="storelogo" src={assetUrl(store.logo_url)} alt="Logo punto vendita"/>:<div className="logo small">C</div>}<div><b>{store?.store_name||"Cornet ERP"}</b><small>Business Suite</small></div></div>
      <nav>
        <Nav active={page==="dashboard"} icon={<LayoutDashboard/>} onClick={()=>setPage("dashboard")}>Dashboard</Nav>
        <Nav active={page==="customers"} icon={<Users/>} onClick={()=>setPage("customers")}>Clienti</Nav>
        <Nav active={page==="imports"} icon={<FileSpreadsheet/>} onClick={()=>setPage("imports")}>Importazioni Business</Nav>
        <Nav active={page==="windtrepanel"} icon={<Mail/>} onClick={()=>setPage("windtrepanel")}>WindTre Pannello</Nav>
        <div className="navgroup">COMMERCIALE</div>
        <Nav active={page==="consumeractivations"} icon={<Smartphone/>} onClick={()=>setPage("consumeractivations")}>Attivazioni Consumer</Nav>
        <Nav active={page==="postactivationconfig"} icon={<FileClock/>} onClick={()=>setPage("postactivationconfig")}>Post-attivazione</Nav>
        <Nav active={page==="incentives"} icon={<CircleDollarSign/>} onClick={()=>setPage("incentives")}>Gare e commissioning</Nav>
        <Nav active={page==="tariffs"} icon={<Tag/>} onClick={()=>setPage("tariffs")}>Piani tariffari</Nav>
        <Nav active={page==="terminals"} icon={<Smartphone/>} onClick={()=>setPage("terminals")}>Terminali GA e CB</Nav>
        <div className="navgroup">SIM E MAGAZZINO</div>
        <Nav active={page==="terminalinventory"} icon={<Smartphone/>} onClick={()=>setPage("terminalinventory")}>Giacenze terminali</Nav>
        <Nav active={page==="products"} icon={<Package/>} onClick={()=>setPage("products")}>Prodotti</Nav>
        <Nav active={page==="orders"} icon={<ShoppingCart/>} onClick={()=>setPage("orders")}>Ordini SIM</Nav>
        <Nav active={page==="inventory"} icon={<Boxes/>} onClick={()=>openInventory()}>Magazzino SIM</Nav>
        <Nav active={page==="simreport"} icon={<BarChart3/>} onClick={()=>setPage("simreport")}>Report SIM</Nav>
        <div className="navgroup">SPEDIZIONI</div>
        <Nav active={page==="ddt"} icon={<Truck/>} onClick={()=>setPage("ddt")}>Spedizioni e DDT</Nav>
        <div className="navgroup">DOCUMENTI</div>
        <Nav active={page==="letterhead"} icon={<FileText/>} onClick={()=>setPage("letterhead")}>Carta e buste</Nav>
        <Nav active={page==="settings"} icon={<Settings/>} onClick={()=>setPage("settings")}>Configurazione</Nav>
      </nav>
      <div className="navfoot"><span>VERSIONE</span><b>0.2 · WINDTRE SME</b></div>
    </aside>
    <section className="content">
      <header><div className="search"><Search size={17}/>Cerca clienti, codici, linee e campagne...</div><button className="icon" onClick={logout} title="Esci"><LogOut size={18}/></button></header>
      {page==="dashboard"&&<Dashboard openImports={()=>setPage("imports")}/>}
      {page==="customers"&&<Customers/>}
      {page==="imports"&&<Imports/>}
      {page==="windtrepanel"&&<WindTrePanel/>}
      {page==="consumeractivations"&&<ConsumerActivationsDashboard openPdcImport={()=>setPage("incentives")}/>}
      {page==="postactivationconfig"&&<PostActivationConfiguration/>}
      {page==="incentives"&&<IncentiveCompetitions/>}
      {page==="tariffs"&&<TariffPlans/>}
      {page==="terminals"&&<TerminalCatalog/>}
      {page==="terminalinventory"&&<TerminalInventory/>}
      {page==="products"&&<Products/>}
      {page==="orders"&&<SimOrders/>}
      {page==="inventory"&&<SimInventory initialFilter={inventoryFilter}/>}
      {page==="simreport"&&<SimReport openInventory={openInventory}/>}
      {page==="ddt"&&<DdtShipments/>}
      {page==="letterhead"&&<LetterheadDesigner/>}
      {page==="settings"&&<StoreConfiguration value={store} saved={setStore} operatorBrands={operatorBrands} setOperatorBrands={setOperatorBrands}/>}
    </section>
  </div>
  </OperatorBrandContext.Provider>;
}

function Nav({active,icon,onClick,children}:{active:boolean;icon:React.ReactNode;onClick:()=>void;children:React.ReactNode}){
  return <button className={active?"active":""} onClick={onClick}>{icon}<span>{children}</span></button>;
}

function OperatorLogo({operator="WINDTRE",compact=false}:{operator?:string;compact?:boolean}){
  const brands=useContext(OperatorBrandContext);
  const raw=(operator||"ALTRO").trim();
  const key=raw.toUpperCase().replace(/[^A-Z0-9]/g,"");
  const upperRaw=raw.toUpperCase();
  const aliases:Record<string,{label:string,short:string}>={
    WINDTRE:{label:"WINDTRE",short:"W3"},W3:{label:"WINDTRE",short:"W3"},
    VERY:{label:"very mobile",short:"very"},VERYMOBILE:{label:"very mobile",short:"very"},
    VODAFONE:{label:"vodafone",short:"VF"},TIM:{label:"TIM",short:"TIM"},
    FASTWEB:{label:"FASTWEB",short:"FW"},ILIAD:{label:"iliad",short:"iliad"},
    EOLO:{label:"EOLO",short:"EOLO"},SKYWIFI:{label:"Sky Wifi",short:"Sky"},
  };
  const brandConfig=brands[key]||brands[upperRaw]||null;
  const brand=aliases[key]||{label:brandConfig?.display_name||raw.toUpperCase(),short:raw.slice(0,4).toUpperCase()};
  return <span className={`operatorLogo operator-${key.toLowerCase()} ${compact?"compact":""}`} title={`Operatore ${brand.label}`} aria-label={`Operatore ${brand.label}`}>
    {brandConfig?.logo_url
      ? <img className="operatorBrandImage" src={assetUrl(brandConfig.logo_url)} alt={brand.label}/>
      : <span className="operatorMark">{brand.short}</span>}
    {!compact&&<span className="operatorName">{brand.label}</span>}
  </span>;
}

function Dashboard({openImports}:{openImports:()=>void}){
  const [s,setS]=useState<any>(null);
  const [portfolio,setPortfolio]=useState<any>(null);
  const [segment,setSegment]=useState("BUSINESS_SME");
  useEffect(()=>{fetch(API+"/dashboard/summary").then(r=>r.json()).then(setS)},[]);
  useEffect(()=>{setPortfolio(null);fetch(API+"/dashboard/portfolio?segment="+segment).then(r=>r.json()).then(setPortfolio)},[segment]);
  const last=s?.last_import;
  const segments=[
    ["BUSINESS_SME","Business SME"],
    ["CONSUMER","Consumer"],
    ["MICROBUSINESS","Microbusiness"],
    ["ENERGY","Energia"],
  ];
  return <main className="page">
    <div className="title"><div><small>CENTRO OPERATIVO</small><h1>Dashboard portafoglio</h1><p>Una vista distinta per ciascun mercato e linea di servizio.</p></div><div className="dashboardBrand"><OperatorLogo operator={segment==="BUSINESS_SME"?"WINDTRE":"MULTIOPERATORE"}/>{segment==="BUSINESS_SME"&&<button className="new" onClick={openImports}><UploadCloud size={18}/>Importa estrazione</button>}</div></div>
    <div className="segmenttabs">{segments.map(([value,label])=><button className={segment===value?"active":""} key={value} onClick={()=>setSegment(value)}>{label}</button>)}</div>
    <div className="status"><span></span><div><b>{last?"Ultima estrazione acquisita":"Pronto per la prima estrazione"}</b><p>{last?`${monthLabel(last.competence_month)} · ${last.customer_count} clienti · ${last.row_count} righe`:"Carica il file Excel mensile del DB Tool WINDTRE"}</p></div></div>
    <div className="portfolioKpis">
      <PortfolioCard tone="blue" icon={<Users/>} label="Clienti selezionati" value={portfolio?.customers??0}/>
      <PortfolioCard
        tone="green"
        icon={<Smartphone/>}
        label="Mobile"
        value={portfolio?.mobile?.count??0}
        amount={portfolio?.mobile?.mrr}
        details={[
          ["Fonia",portfolio?.mobile?.breakdown?.voice?.count??0],
          ["Dati",portfolio?.mobile?.breakdown?.data?.count??0],
          ["M2M",portfolio?.mobile?.breakdown?.m2m?.count??0],
          ["Altro",portfolio?.mobile?.breakdown?.other?.count??0],
        ]}
      />
      <PortfolioCard tone="purple" icon={<Wifi/>} label="Fisso / Dati" value={portfolio?.fixed_data?.count??0} amount={portfolio?.fixed_data?.mrr}/>
      <PortfolioCard tone="cyan" icon={<BriefcaseBusiness/>} label="ICT / Marketplace" value={portfolio?.ict?.count??0} amount={portfolio?.ict?.mrr}/>
      <PortfolioCard tone="blue" icon={<Zap/>} label="Altri servizi" value={portfolio?.other_services?.count??0} amount={portfolio?.other_services?.mrr}/>
      <PortfolioCard tone="gold" icon={<CircleDollarSign/>} label="Totale Canone (MRR)" value={formatCurrency(portfolio?.total_mrr??0)}/>
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

function PortfolioCard({label,value,amount,icon,tone,details}:{label:string;value:any;amount?:number;icon:React.ReactNode;tone:string;details?:Array<[string,number]>}){
  return <article className={"portfolioCard "+tone}><div><span>{label}</span><div className="portfolioValue"><strong>{value}</strong>{amount!==undefined&&<b>{formatCurrency(amount)}</b>}</div>{details&&<div className="portfolioBreakdown">{details.map(([name,count])=><small key={name}>{name} <b>{count}</b></small>)}</div>}</div><div className="portfolioIcon">{icon}</div></article>
}

function Customers(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [search,setSearch]=useState("");
  const [segment,setSegment]=useState<"CONSUMER"|"MICROBUSINESS"|"BUSINESS_SME">("BUSINESS_SME");
  const [newOpen,setNewOpen]=useState(false);
  const [form,setForm]=useState<any>({segment:"CONSUMER",business_name:"",first_name:"",last_name:"",fiscal_code:"",tax_id:"",email:"",phone:"",address:"",postal_code:"",city:"",province:"",birth_date:"",birth_place:"",birth_province:"",gender:"",document_type:"Carta d'identità",document_number:"",document_issue_date:"",document_expiry_date:"",document_issuer:""});
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const segmentLabels:any={CONSUMER:"Consumer",MICROBUSINESS:"Microbusiness",BUSINESS_SME:"Business SME"};
  useEffect(()=>{
    setLoading(true);
    const timer=setTimeout(()=>fetch(API+"/customers?segment="+segment+"&search="+encodeURIComponent(search)).then(r=>r.json()).then(setItems).finally(()=>setLoading(false)),250);
    return()=>clearTimeout(timer);
  },[search,segment]);
  async function openCustomer(id:string){
    const response=await fetch(API+"/customers/"+id);
    if(response.ok)setSelected(await response.json());
  }
  function startCustomer(){
    setMessage("");setForm({segment,business_name:"",first_name:"",last_name:"",fiscal_code:"",tax_id:"",email:"",phone:"",address:"",postal_code:"",city:"",province:"",birth_date:"",birth_place:"",birth_province:"",gender:"",document_type:"Carta d'identità",document_number:"",document_issue_date:"",document_expiry_date:"",document_issuer:""});setNewOpen(true)
  }
  async function saveCustomer(event:React.FormEvent){
    event.preventDefault();setMessage("");
    const business_name=form.segment==="CONSUMER"?`${form.first_name} ${form.last_name}`.trim():form.business_name;
    const payload={...form,business_name,...Object.fromEntries(["birth_date","document_issue_date","document_expiry_date"].map(key=>[key,form[key]||null]))};
    const response=await fetch(API+"/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Salvataggio non riuscito");return}
    setNewOpen(false);setSegment(form.segment);setSearch("");setLoading(true);const list=await fetch(API+"/customers?segment="+form.segment).then(r=>r.json());setItems(list);setLoading(false);openCustomer(result.id);
  }
  return <main className="page">
    <div className="title"><div><small>CRM CLIENTI</small><h1>Portafoglio clienti</h1><p>Aree separate per privati, piccole attività e aziende SME.</p></div><button className="new" onClick={startCustomer}><Plus/>Nuovo cliente</button></div>
    <div className="segmenttabs customerSegments">{(["CONSUMER","MICROBUSINESS","BUSINESS_SME"] as const).map(value=><button key={value} className={segment===value?"active":""} onClick={()=>setSegment(value)}>{segmentLabels[value]}</button>)}</div>
    <div className="toolbar"><div className="inputsearch"><Search size={17}/><input placeholder="Ragione sociale, P.IVA, codice cliente..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{items.length} clienti</span></div>
    <article className="tablecard">{loading?<div className="loading">Caricamento…</div>:items.length?<table><thead><tr><th>Cliente</th><th>{segment==="BUSINESS_SME"?"Codice WINDTRE SME":"Recapiti"}</th><th>P.IVA / C.F.</th><th>Spesa mensile</th><th>Ultima presenza</th><th>Stato</th><th></th></tr></thead><tbody>{items.map(c=>{const marketCode=c.account_codes?.find((code:any)=>code.operator==="WINDTRE"&&code.market===segment&&code.is_primary)||c.account_codes?.find((code:any)=>code.operator==="WINDTRE"&&code.market===segment);return <tr key={c.id} className="customerrow" onClick={()=>openCustomer(c.id)}><td><b>{c.business_name}</b><small>{segmentLabels[c.segment]}</small></td><td>{segment==="BUSINESS_SME"?(marketCode?.customer_code||c.windtre_customer_code||"—"):<>{c.phone||"—"}<small>{c.email}</small></>}</td><td>{c.tax_id||c.fiscal_code||"—"}</td><td><b className="money">{formatCurrency(c.monthly_spend)}</b></td><td>{c.last_seen_month?monthLabel(c.last_seen_month):"—"}</td><td><Status value={c.portfolio_status}/></td><td><button className="linkbtn" onClick={event=>{event.stopPropagation();openCustomer(c.id)}}>Scheda</button></td></tr>})}</tbody></table>:<Empty icon={<Users/>} text={`Nessun cliente ${segmentLabels[segment]}`}/>}</article>
    {selected&&<CustomerDetail item={selected} close={()=>setSelected(null)}/>}
    {newOpen&&<div className="overlay" onMouseDown={event=>{if(event.currentTarget===event.target)setNewOpen(false)}}><form className="drawer customerForm" onSubmit={saveCustomer}><button type="button" className="close" onClick={()=>setNewOpen(false)}>×</button><small>NUOVA ANAGRAFICA</small><h2>{segmentLabels[form.segment]}</h2><label>Segmento<select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})}><option value="CONSUMER">Consumer</option><option value="MICROBUSINESS">Microbusiness</option><option value="BUSINESS_SME">Business SME</option></select></label>{form.segment==="CONSUMER"?<div className="fieldgrid"><label>Nome<input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Cognome<input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label><label>Codice fiscale<input required value={form.fiscal_code} onChange={e=>setForm({...form,fiscal_code:e.target.value.toUpperCase()})}/></label><label>Sesso<select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">—</option><option value="F">F</option><option value="M">M</option><option value="ALTRO">Altro</option></select></label><label>Data di nascita<input type="date" value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})}/></label><label>Luogo di nascita<input value={form.birth_place} onChange={e=>setForm({...form,birth_place:e.target.value})}/></label></div>:<div className="fieldgrid"><label>Ragione sociale<input required value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})}/></label><label>Partita IVA<input value={form.tax_id} onChange={e=>setForm({...form,tax_id:e.target.value})}/></label><label>Codice fiscale<input value={form.fiscal_code} onChange={e=>setForm({...form,fiscal_code:e.target.value})}/></label></div>}<h3>Recapiti e residenza</h3><div className="fieldgrid"><label>Telefono<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Indirizzo<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>CAP<input value={form.postal_code} onChange={e=>setForm({...form,postal_code:e.target.value})}/></label><label>Comune<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Provincia<input maxLength={2} value={form.province} onChange={e=>setForm({...form,province:e.target.value.toUpperCase()})}/></label></div>{form.segment==="CONSUMER"&&<><h3>Documento d’identità</h3><div className="fieldgrid"><label>Tipo documento<input value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}/></label><label>Numero<input value={form.document_number} onChange={e=>setForm({...form,document_number:e.target.value})}/></label><label>Data rilascio<input type="date" value={form.document_issue_date} onChange={e=>setForm({...form,document_issue_date:e.target.value})}/></label><label>Data scadenza<input type="date" value={form.document_expiry_date} onChange={e=>setForm({...form,document_expiry_date:e.target.value})}/></label><label>Ente rilascio<input value={form.document_issuer} onChange={e=>setForm({...form,document_issuer:e.target.value})}/></label></div></>}{message&&<div className="notice error"><XCircle/>{message}</div>}<div className="formactions"><button className="new">Salva cliente</button></div></form></div>}
  </main>;
}

function CustomerDetail({item,close}:{item:any;close:()=>void}){
  const campaigns=Array.from(new Set((item.assets||[]).flatMap((asset:any)=>Object.keys(asset.campaigns||{}))));
  const activeAssets=(item.assets||[]).filter((asset:any)=>!asset.status||["ATT","ACTIVE","ATTIVO","ATTIVA"].includes(String(asset.status).toUpperCase()));
  const [selectedAssets,setSelectedAssets]=useState<string[]>([]);
  const [quotes,setQuotes]=useState<any[]>([]);
  const [configBusy,setConfigBusy]=useState(false);
  const [configMessage,setConfigMessage]=useState("");
  const [accountCodes,setAccountCodes]=useState<any[]>(item.account_codes||[]);
  const [codeForm,setCodeForm]=useState({operator:"WINDTRE",market:item.segment||"CONSUMER",customer_code:""});
  const [codeMessage,setCodeMessage]=useState("");
  const loadQuotes=()=>fetch(`${API}/customers/${item.id}/quotes`).then(r=>r.json()).then(setQuotes);
  useEffect(()=>{loadQuotes()},[item.id]);
  async function addAccountCode(event:React.FormEvent){
    event.preventDefault();setCodeMessage("");
    const response=await fetch(`${API}/customers/${item.id}/account-codes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...codeForm,is_primary:true})});
    const result=await response.json();
    if(!response.ok){setCodeMessage(result.detail||"Salvataggio non riuscito");return}
    const fresh=await fetch(`${API}/customers/${item.id}/account-codes`).then(r=>r.json());setAccountCodes(fresh);setCodeForm({...codeForm,customer_code:""});setCodeMessage("Codice cliente salvato");
  }
  async function removeAccountCode(id:string){
    if(!confirm("Rimuovere questo codice cliente?"))return;
    const response=await fetch(`${API}/customers/${item.id}/account-codes/${id}`,{method:"DELETE"});
    if(response.ok)setAccountCodes(current=>current.filter(code=>code.id!==id));
  }
  function toggleAsset(key:string){setSelectedAssets(current=>current.includes(key)?current.filter(value=>value!==key):[...current,key])}
  function toggleAll(){setSelectedAssets(selectedAssets.length===activeAssets.length?[]:activeAssets.map((asset:any)=>asset.asset_key))}
  async function generateConfigurator(){
    if(!selectedAssets.length)return;setConfigBusy(true);setConfigMessage("");
    try{
      const response=await fetch(`${API}/customers/${item.id}/configurator.xlsx`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({asset_keys:selectedAssets})});
      if(!response.ok){const error=await response.json();throw new Error(error.detail||"Generazione non riuscita")}
      const blob=await response.blob();const disposition=response.headers.get("content-disposition")||"";
      const filename=disposition.match(/filename="?([^"]+)"?/)?.[1]||`Configuratore_${item.business_name}.xlsx`;
      const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
      setConfigMessage(`Configuratore generato per ${selectedAssets.length} linee.`);setSelectedAssets([]);loadQuotes();
    }catch(error:any){setConfigMessage(error.message||"Generazione non riuscita")}
    finally{setConfigBusy(false)}
  }
  return <div className="overlay" onMouseDown={event=>{if(event.currentTarget===event.target)close()}}>
    <section className="drawer customerdrawer"><button className="close" onClick={close}>×</button>
      <small>CLIENTE {item.segment==="CONSUMER"?"CONSUMER":item.segment==="MICROBUSINESS"?"MICROBUSINESS":"BUSINESS SME"}</small><h2>{item.business_name}</h2>
      <div className="customerfacts">
        <div><span>Codici cliente</span><b>{accountCodes.length}</b></div>
        <div><span>P.IVA / C.F.</span><b>{item.tax_id||item.fiscal_code||"—"}</b></div>
        <div><span>Fotografia portafoglio</span><b>{item.snapshot_month?monthLabel(item.snapshot_month):"—"}</b></div>
        <div className="spendfact"><span>Spesa mensile complessiva</span><b>{formatCurrency(item.monthly_spend)}</b></div>
      </div>
      <div className="accountCodes">
        <div className="sectiontitle"><div><Tag/><h2>Codici cliente per mercato</h2></div><span>{accountCodes.length} codici</span></div>
        {accountCodes.length>0&&<div className="codeList">{accountCodes.map(code=><article key={code.id}><div><small>{code.operator}</small><b>{code.customer_code}</b></div><span>{code.market==="BUSINESS_SME"?"Business SME":code.market==="MICROBUSINESS"?"Microbusiness":"Consumer"}</span>{code.is_primary&&<em>Principale</em>}<button className="icon danger" onClick={()=>removeAccountCode(code.id)} title="Rimuovi codice"><Trash2 size={15}/></button></article>)}</div>}
        <form className="codeForm" onSubmit={addAccountCode}><label>Operatore<input value={codeForm.operator} onChange={e=>setCodeForm({...codeForm,operator:e.target.value.toUpperCase()})} required/></label><label>Mercato<select value={codeForm.market} onChange={e=>setCodeForm({...codeForm,market:e.target.value})}><option value="CONSUMER">Consumer</option><option value="MICROBUSINESS">Microbusiness</option><option value="BUSINESS_SME">Business SME</option></select></label><label>Codice cliente<input value={codeForm.customer_code} onChange={e=>setCodeForm({...codeForm,customer_code:e.target.value.toUpperCase()})} required/></label><button className="new"><Plus/>Aggiungi</button></form>
        {codeMessage&&<p className="formmessage">{codeMessage}</p>}
      </div>
      {item.segment==="CONSUMER"&&<div className="consumerProfile"><div><span>Nascita</span><b>{formatDate(item.birth_date)} · {[item.birth_place,item.birth_province].filter(Boolean).join(" ")||"Luogo non indicato"}</b></div><div><span>Residenza</span><b>{[item.address,item.postal_code,item.city,item.province].filter(Boolean).join(", ")||"—"}</b></div><div><span>Documento</span><b>{[item.document_type,item.document_number].filter(Boolean).join(" · ")||"—"}</b><small>{item.document_expiry_date?`Scadenza ${formatDate(item.document_expiry_date)}`:"Scadenza non indicata"}</small></div><div><span>Contatti</span><b>{item.phone||"—"}</b><small>{item.email}</small></div></div>}
      <div className="sectiontitle configuratorTitle"><div><FileSpreadsheet/><h2>Linee attive</h2></div><div>{item.segment==="BUSINESS_SME"&&selectedAssets.length>0&&<button className="new" disabled={configBusy} onClick={generateConfigurator}>{configBusy?<LoaderCircle/>:<FileSpreadsheet/>}{configBusy?"Generazione…":`Genera configuratore (${selectedAssets.length})`}</button>}<span>{activeAssets.length} linee</span></div></div>
      {activeAssets.length>0&&<div className="activeLinesTable"><table><thead><tr><th><input type="checkbox" aria-label="Seleziona tutte le linee" checked={selectedAssets.length===activeAssets.length} onChange={toggleAll}/></th><th>MSISDN / ID</th><th>Tipo linea</th><th>Terminale / Hardware</th><th>Stato</th><th>Costo attuale</th></tr></thead><tbody>{activeAssets.map((asset:any)=><tr key={asset.asset_key} className={selectedAssets.includes(asset.asset_key)?"selected":""} onClick={()=>toggleAsset(asset.asset_key)}><td><input type="checkbox" checked={selectedAssets.includes(asset.asset_key)} onChange={()=>toggleAsset(asset.asset_key)} onClick={event=>event.stopPropagation()}/></td><td><b>{asset.asset_number||asset.asset_key}</b></td><td>{asset.asset_type||"Utenza"}</td><td>{asset.details?.find((detail:any)=>/TERMINALE|DEVICE/i.test(detail.label))?.value||"—"}</td><td><Status value={asset.status==="ACTIVE"?"ACTIVE":item.portfolio_status}/></td><td><b className="money">{asset.monthly_fee?formatCurrency(asset.monthly_fee):"—"}</b></td></tr>)}</tbody></table></div>}
      {configMessage&&<div className={"notice "+(configMessage.startsWith("Configuratore")?"ok":"error")}>{configMessage.startsWith("Configuratore")?<CheckCircle2/>:<XCircle/>}{configMessage}</div>}
      <div className="sectiontitle"><div><BriefcaseBusiness/><h2>Dettaglio utenze e servizi</h2></div><span>{item.assets?.length||0} elementi</span></div>
      <div className="exportactions">
        <a className="exportbtn excel" href={`${API}/customers/${item.id}/services-pivot.xlsx`}><FileSpreadsheet/>Pivot Excel</a>
        <a className="exportbtn pdf" href={`${API}/customers/${item.id}/services-pivot.pdf`}><FileText/>Pivot PDF</a>
      </div>
      {item.assets?.length?<div className="assetlist">{item.assets.map((asset:any)=><article className="assetcard" key={asset.asset_key}>
        <div className="assethead"><div className="asseticon"><BriefcaseBusiness/></div><div><small>{asset.asset_type||"UTENZA WINDTRE"}</small><h3>{asset.asset_number||asset.asset_key}</h3></div><Status value={asset.status==="ACTIVE"?"ACTIVE":item.portfolio_status}/></div>
        <div className="assetdata"><div><span>Piano / offerta</span><b>{asset.plan||"Non indicato"}</b></div><div><span>Canone</span><b>{asset.monthly_fee?formatCurrency(asset.monthly_fee):"—"}</b></div><div><span>Data attivazione</span><b>{formatDate(asset.activation_date)}</b></div><div><span>Stato DB Tool</span><b>{asset.status||"—"}</b></div></div>
        {asset.details?.length>0&&<div className="assetdetails">{asset.details.map((detail:any)=><div key={detail.key}><span>{detail.label}</span><b>{detail.value}</b></div>)}</div>}
        {Object.keys(asset.campaigns||{}).length>0&&<div className="campaignchips">{Object.entries(asset.campaigns).map(([name,value]:any)=><span key={name}><b>{name}</b> {value}</span>)}</div>}
      </article>)}</div>:<Empty icon={<FileSpreadsheet/>} text="Nessuna utenza nell’ultima estrazione"/>}
      {campaigns.length>0&&<p className="previewnote">{campaigns.length} campagne distinte rilevate sulle utenze del cliente.</p>}
      <div className="sectiontitle quoteHistoryTitle"><div><History/><h2>Preventivi salvati</h2></div><span>{quotes.length}</span></div>
      {quotes.length?<div className="quoteHistory">{quotes.map(quote=><article key={quote.id}><FileSpreadsheet/><div><b>{quote.file_name}</b><small>{new Date(quote.created_at).toLocaleString("it-IT")} · {quote.line_count} linee</small></div><div><span>MRR attuale <b>{formatCurrency(quote.current_mrr)}</b></span><span>Proposto <b>{formatCurrency(quote.proposed_mrr)}</b></span></div></article>)}</div>:<Empty icon={<History/>} text="Nessun configuratore generato"/>}
    </section>
  </div>
}

function ConsumerActivationsDashboard({openPdcImport}:{openPdcImport:()=>void}){
  const [data,setData]=useState<any>(null);
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [loading,setLoading]=useState(false);
  async function load(){
    setLoading(true);
    const query=new URLSearchParams();
    if(dateFrom)query.set("date_from",dateFrom);
    if(dateTo)query.set("date_to",dateTo);
    const response=await fetch(`${API}/consumer-activations/dashboard?${query}`);
    setData(await response.json());setLoading(false);
  }
  async function updatePostActivationTask(id:string,payload:any){
    const response=await fetch(`${API}/post-activation-tasks/${id}`,{
      method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
    });
    if(response.ok)load();
  }
  useEffect(()=>{load()},[]);
  const summary=data?.summary||{};
  const maxDaily=Math.max(1,...(data?.daily||[]).map((item:any)=>item.events));
  return <main className="page consumerActivationPage">
    <div className="title"><div><small>MONITORAGGIO CONSUMER</small><h1>Dashboard attivazioni Consumer</h1><p>PDC, utenze, quote gara e commissioning in un’unica vista operativa.</p></div><div className="dashboardBrand"><OperatorLogo operator="WINDTRE"/><button className="new" onClick={openPdcImport}><UploadCloud/>Importa PDC</button></div></div>
    <section className="consumerFilters">
      <label>Dal<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
      <label>Al<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
      <button className="new" onClick={load} disabled={loading}>{loading?"Aggiornamento…":"Aggiorna dashboard"}</button>
      {(dateFrom||dateTo)&&<button className="secondary" onClick={async()=>{setDateFrom("");setDateTo("");setLoading(true);setData(await fetch(`${API}/consumer-activations/dashboard`).then(r=>r.json()));setLoading(false)}}>Azzera periodo</button>}
    </section>
    <div className="consumerActivationKpis">
      <article><span>PDC importate</span><strong>{summary.pdc_imported||0}</strong><small>{summary.customers||0} clienti</small></article>
      <article><span>Eventi conteggiati</span><strong>{summary.events||0}</strong><small>{summary.valid_events||0} validi · {summary.to_verify||0} da verificare</small></article>
      <article><span>Mobile / Fisso</span><strong>{summary.mobile||0} / {summary.fixed||0}</strong><small>nuove attivazioni</small></article>
      <article><span>Device / Reload</span><strong>{summary.customer_base||0} / {summary.reload||0}</strong><small>operazioni commerciali</small></article>
      <article><span>Canone mensile</span><strong>{formatCurrency(summary.monthly_revenue||0)}</strong><small>MRR importato</small></article>
      <article className={summary.post_activation_pending?"attention":""}><span>Operazioni da effettuare</span><strong>{summary.post_activation_pending||0}</strong><small>{summary.post_activation_overdue||0} scadute · {summary.post_activation_review||0} da valutare</small></article>
      <article className="highlight"><span>Commissioning stimato</span><strong>{formatCurrency(summary.commissioning||0)}</strong><small>soglie correnti</small></article>
    </div>
    <div className="consumerDashboardGrid">
      <section className="modulecard">
        <div className="sectiontitle"><div><BarChart3/><h2>Andamento attivazioni</h2></div></div>
        {(data?.daily||[]).length?<div className="activationBars">{data.daily.map((item:any)=><div key={item.date}><span>{formatDate(item.date)}</span><div><i style={{width:`${Math.max(8,item.events/maxDaily*100)}%`}}></i></div><b>{item.events}</b><em>{formatCurrency(item.commission)}</em></div>)}</div>:<p className="muted">Nessuna attivazione nel periodo selezionato.</p>}
      </section>
      <section className="modulecard">
        <div className="sectiontitle"><div><CheckCircle2/><h2>Stato lavorazione</h2></div></div>
        <div className="consumerBreakdown">{(data?.statuses||[]).map((item:any)=><article key={item.status}><span>{item.status==="VALID"?"Valide":item.status==="TO_VERIFY"?"Da verificare":item.status}</span><strong>{item.events}</strong></article>)}</div>
        <div className="sectiontitle smalltitle"><div><CircleDollarSign/><h2>Quote per pista</h2></div></div>
        <div className="consumerBreakdown">{(data?.tracks||[]).map((item:any)=><article key={item.track}><span>{item.track}</span><strong>{item.events}</strong></article>)}</div>
      </section>
    </div>
    <section className="postActivationPanel">
      <div className="sectiontitle"><div><AlertTriangle/><h2>Verifiche post-attivazione</h2></div><span>Segnalate ogni giorno fino alla gestione</span></div>
      <p>Seleziona “Da disattivare” sulle offerte o opzioni interessate. La scadenza viene impostata automaticamente al primo giorno lavorativo del mese successivo.</p>
      <div className="postActivationList">{(data?.post_activation_tasks||[]).map((item:any)=><article className={`postActivationItem ${item.alert_state.toLowerCase()}`} key={item.id}>
        <div><div className="operatorLine"><OperatorLogo operator="WINDTRE" compact/><b>{item.item_name}</b></div><small>{item.item_type==="OFFER"?"Offerta":"Opzione aggiuntiva"} · {item.customer_name}</small><small>Contratto {item.contract_code} · attivazione {formatDate(item.activation_date)}</small></div>
        <label className={`deactivationFlag ${!item.can_deactivate?"disabled":""}`} title={!item.can_deactivate?"Abilita la disattivazione nella pagina Post-attivazione":""}><input type="checkbox" checked={item.action_required} disabled={item.status==="DONE"||!item.can_deactivate} onChange={e=>updatePostActivationTask(item.id,{action_required:e.target.checked})}/><span>{item.can_deactivate?"Da disattivare":"Non configurata"}</span></label>
        <div className="postActivationDue"><span>{item.status==="DONE"?"Disattivata il":item.action_required?"Da gestire dal":"Da valutare"}</span><b>{item.status==="DONE"?formatDate(item.completed_date):item.due_date?formatDate(item.due_date):"—"}</b></div>
        {item.action_required&&item.status!=="DONE"?<button className="new" onClick={()=>updatePostActivationTask(item.id,{mark_completed:true})}><CheckCircle2/>Segna gestita</button>:<span className={`postActivationBadge ${item.alert_state.toLowerCase()}`}>{item.status==="DONE"?"Gestita":item.action_required?"Programmato":"Verifica"}</span>}
      </article>)}</div>
    </section>
    <article className="tablecard consumerActivationTable">
      <div className="sectiontitle"><div><History/><h2>Ultime attivazioni Consumer</h2></div><span>{data?.activations?.length||0} record</span></div>
      <table><thead><tr><th>Operatore</th><th>Data</th><th>Cliente</th><th>Codice cliente</th><th>Codice contratto</th><th>Utenza</th><th>Pista / Offerta</th><th>Stato</th><th>Commissione</th></tr></thead>
      <tbody>{(data?.activations||[]).map((item:any)=><tr key={item.id}><td><OperatorLogo operator={item.operator||"WINDTRE"} compact/></td><td>{formatDate(item.activation_date)}</td><td><b>{item.customer_name}</b></td><td><code>{item.customer_code||"—"}</code></td><td><code>{item.contract_code||"—"}</code></td><td>{item.asset_number||"—"}</td><td><b>{item.track}</b><small>{item.offer||"—"}</small></td><td><span className={`activationStatus ${item.status.toLowerCase()}`}>{item.status==="VALID"?"Valida":"Da verificare"}</span></td><td><b className="money">{formatCurrency(item.commission||0)}</b></td></tr>)}</tbody></table>
    </article>
  </main>
}

function PostActivationConfiguration(){
  const empty={operator:"WINDTRE",item_type:"OPTION",item_name:"",can_deactivate:true,default_action_required:false,is_active:true,notes:""};
  const [items,setItems]=useState<any[]>([]);
  const [form,setForm]=useState<any>(empty);
  const [operator,setOperator]=useState("");
  const [itemType,setItemType]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const load=async()=>{
    setLoading(true);
    const query=new URLSearchParams();
    if(operator)query.set("operator",operator);
    if(itemType)query.set("item_type",itemType);
    const response=await fetch(`${API}/post-activation-rules?${query}`);
    setItems(response.ok?await response.json():[]);
    setLoading(false);
  };
  useEffect(()=>{load()},[operator,itemType]);
  async function createRule(event:React.FormEvent){
    event.preventDefault();setMessage("");
    const response=await fetch(API+"/post-activation-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const result=await response.json();
    if(!response.ok){setMessage(result.detail||"Configurazione non salvata");return}
    setForm(empty);setMessage("Elemento aggiunto alla configurazione post-attivazione.");load();
  }
  async function updateRule(id:string,payload:any){
    setMessage("");
    const response=await fetch(`${API}/post-activation-rules/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok){setMessage(result.detail||"Aggiornamento non riuscito");return}
    setItems(current=>current.map(item=>item.id===id?result:item));
  }
  const configured=items.filter(item=>item.can_deactivate&&item.is_active).length;
  const automatic=items.filter(item=>item.default_action_required&&item.is_active).length;
  return <main className="page postActivationConfigPage">
    <div className="title"><div><small>CONFIGURAZIONE COMMERCIALE</small><h1>Gestione post-attivazione</h1><p>Definisci quali offerte, servizi e opzioni possono richiedere una disattivazione dopo la vendita.</p></div><OperatorLogo operator={operator||"MULTIOPERATORE"}/></div>
    <div className="postConfigKpis">
      <article><span>Elementi rilevati</span><strong>{items.length}</strong><small>Dalle PDC e dalla configurazione manuale</small></article>
      <article><span>Disattivabili</span><strong>{configured}</strong><small>Flag disponibile in dashboard</small></article>
      <article><span>Preselezionati</span><strong>{automatic}</strong><small>Scadenza creata automaticamente</small></article>
    </div>
    <section className="postConfigToolbar">
      <label>Operatore<select value={operator} onChange={e=>setOperator(e.target.value)}><option value="">Tutti</option><option>WINDTRE</option><option>VERY MOBILE</option><option>VODAFONE</option><option>TIM</option><option>FASTWEB</option><option>ILIAD</option></select></label>
      <label>Tipologia<select value={itemType} onChange={e=>setItemType(e.target.value)}><option value="">Tutte</option><option value="OFFER">Offerta</option><option value="SERVICE">Servizio</option><option value="OPTION">Opzione</option></select></label>
    </section>
    <section className="postConfigLayout">
      <article className="tablecard postConfigTable">
        <div className="sectiontitle"><div><FileClock/><h2>Regole configurate</h2></div><span>{loading?"Caricamento…":`${items.length} elementi`}</span></div>
        <table><thead><tr><th>Operatore</th><th>Elemento</th><th>Tipologia</th><th>Può essere disattivato</th><th>Da disattivare predefinito</th><th>Attivo</th></tr></thead>
        <tbody>{items.map(item=><tr key={item.id}><td><OperatorLogo operator={item.operator} compact/></td><td><b>{item.item_name}</b>{item.notes&&<small>{item.notes}</small>}</td><td><span className={`postType ${item.item_type.toLowerCase()}`}>{item.item_type==="OFFER"?"Offerta":item.item_type==="SERVICE"?"Servizio":"Opzione"}</span></td><td><label className="switchField"><input type="checkbox" checked={item.can_deactivate} onChange={e=>updateRule(item.id,{can_deactivate:e.target.checked})}/><span></span></label></td><td><label className="switchField"><input type="checkbox" checked={item.default_action_required} disabled={!item.can_deactivate} onChange={e=>updateRule(item.id,{default_action_required:e.target.checked})}/><span></span></label></td><td><label className="switchField"><input type="checkbox" checked={item.is_active} onChange={e=>updateRule(item.id,{is_active:e.target.checked})}/><span></span></label></td></tr>)}</tbody></table>
        {!loading&&!items.length&&<Empty icon={<FileClock/>} text="Nessun elemento trovato. Apri la Dashboard Consumer per acquisire quelli presenti nelle PDC oppure aggiungine uno manualmente."/>}
      </article>
      <form className="postConfigForm" onSubmit={createRule}>
        <small>NUOVA REGOLA</small><h2>Aggiungi elemento</h2>
        <label>Operatore<input required value={form.operator} onChange={e=>setForm({...form,operator:e.target.value.toUpperCase()})}/></label>
        <label>Tipologia<select value={form.item_type} onChange={e=>setForm({...form,item_type:e.target.value})}><option value="OFFER">Offerta</option><option value="SERVICE">Servizio</option><option value="OPTION">Opzione</option></select></label>
        <label>Nome offerta, servizio o opzione<input required value={form.item_name} onChange={e=>setForm({...form,item_name:e.target.value})}/></label>
        <label>Note<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <label className="checkLine"><input type="checkbox" checked={form.can_deactivate} onChange={e=>setForm({...form,can_deactivate:e.target.checked,default_action_required:e.target.checked?form.default_action_required:false})}/>Può prevedere disattivazione post-vendita</label>
        <label className="checkLine"><input type="checkbox" disabled={!form.can_deactivate} checked={form.default_action_required} onChange={e=>setForm({...form,default_action_required:e.target.checked})}/>Seleziona automaticamente “Da disattivare”</label>
        <button className="new">Salva configurazione</button>
        {message&&<div className="notice">{message}</div>}
      </form>
    </section>
  </main>
}

function IncentiveCompetitions(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [report,setReport]=useState<any>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [showActivation,setShowActivation]=useState(false);
  const [pdcFile,setPdcFile]=useState<File|null>(null);
  const [pdcPreview,setPdcPreview]=useState<any>(null);
  const [pdcHistory,setPdcHistory]=useState<any[]>([]);
  const [includeMobile,setIncludeMobile]=useState(false);
  const [pdcSeller,setPdcSeller]=useState("");
  const emptyActivation={activation_date:"2026-03-01",track:"MOBILE",customer_id:"",seller_name:"",asset_number:"",customer_code:"",contract_code:"",offer:"",monthly_fee:0,direct_bonus:0,status:"VALID",attributes:{mnp:false,tied:false,piva:false,convergent:false,ftth:false,fwa:false,first_line:true,very_mobile:false,secure_option:false,phone_included:false,premium_tied_offer:false}};
  const [activation,setActivation]=useState<any>(emptyActivation);
  const load=async()=>{
    const list=await fetch(API+"/incentives").then(r=>r.json());setItems(list);
    if(list.length&&!selected)setSelected(list[0]);
    else if(selected){const fresh=list.find((item:any)=>item.id===selected.id);if(fresh)setSelected(fresh)}
  };
  const loadReport=async(id:string)=>setReport(await fetch(`${API}/incentives/${id}/report`).then(r=>r.json()));
  const loadPdcHistory=async(id:string)=>setPdcHistory(await fetch(`${API}/incentives/${id}/pdc-imports`).then(r=>r.json()));
  useEffect(()=>{load()},[]);
  useEffect(()=>{if(selected?.id){setReport(null);setPdcPreview(null);setPdcFile(null);loadReport(selected.id);loadPdcHistory(selected.id);setActivation({...emptyActivation,activation_date:selected.start_date})}},[selected?.id]);
  async function createMarch(){
    setBusy(true);setMessage("");
    const response=await fetch(API+"/incentives/templates/windtre-march-2026",{method:"POST"});const result=await response.json();
    setBusy(false);if(!response.ok){setMessage(result.detail||"Creazione non riuscita");return}await load();setSelected(result);setMessage("Modello Marzo 2026 creato dalla lettera WINDTRE.");
  }
  function updateThreshold(track:string,index:number,key:string,value:string){
    const configuration=structuredClone(selected.configuration);configuration.tracks[track].thresholds[index][key]=Number(value);
    setSelected({...selected,configuration});
  }
  async function saveCompetition(){
    setBusy(true);setMessage("");
    const response=await fetch(`${API}/incentives/${selected.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(selected)});
    const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"Salvataggio non riuscito");return}
    setSelected(result);setMessage("Configurazione gara salvata.");loadReport(result.id);load();
  }
  async function duplicateCompetition(){
    const name=prompt("Nome della nuova gara",selected.name.replace("Marzo","Aprile"));if(!name)return;
    const start=prompt("Data iniziale (AAAA-MM-GG)","2026-04-01");if(!start)return;
    const end=prompt("Data finale (AAAA-MM-GG)","2026-04-30");if(!end)return;
    const response=await fetch(API+"/incentives",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...selected,id:undefined,name,start_date:start,end_date:end,status:"DRAFT"})});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Duplicazione non riuscita");return}await load();setSelected(result);setMessage("Nuova gara creata: puoi modificare soglie e regole.");
  }
  async function syncActivations(){
    setBusy(true);setMessage("");
    const response=await fetch(`${API}/incentives/${selected.id}/sync-windtre`,{method:"POST"});const result=await response.json();setBusy(false);
    setMessage(response.ok?`Acquisite ${result.added} attivazioni. ${result.skipped_without_activation_date} utenze senza data sono state ignorate.`:(result.detail||"Acquisizione non riuscita"));
    if(response.ok)loadReport(selected.id);
  }
  async function previewPdc(file:File|null){
    if(!file||!selected)return;setPdcFile(file);setPdcPreview(null);setMessage("");setBusy(true);
    const body=new FormData();body.append("file",file);
    const response=await fetch(`${API}/incentives/${selected.id}/pdc/preview`,{method:"POST",body});const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"PDC non riconosciuta");return}
    setPdcPreview(result);setIncludeMobile(!!result.classification?.new_mobile_activation&&!result.proposed_entries?.some((item:any)=>item.track==="MOBILE"));
  }
  async function importPdc(){
    if(!pdcFile||!selected)return;setBusy(true);setMessage("");
    const body=new FormData();body.append("file",pdcFile);body.append("seller_name",pdcSeller);body.append("include_mobile",String(includeMobile));
    const response=await fetch(`${API}/incentives/${selected.id}/pdc/import`,{method:"POST",body});const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"Importazione PDC non riuscita");return}
    setPdcPreview(null);setPdcFile(null);setPdcSeller("");setMessage(`PDC importata: cliente ${result.customer_name}, ${result.entries_created} quote gara generate.`);loadReport(selected.id);loadPdcHistory(selected.id);
  }
  async function addActivation(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    const response=await fetch(`${API}/incentives/${selected.id}/activations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...activation,customer_id:activation.customer_id||null})});
    const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"Attivazione non salvata");return}
    setShowActivation(false);setActivation({...emptyActivation,activation_date:selected.start_date});setMessage("Attivazione aggiunta e conteggiata.");loadReport(selected.id);
  }
  async function removeActivation(id:string){
    if(!confirm("Rimuovere questa attivazione dal conteggio della gara?"))return;
    await fetch(`${API}/incentives/${selected.id}/activations/${id}`,{method:"DELETE"});loadReport(selected.id);
  }
  const tracks=selected?Object.entries(selected.configuration?.tracks||{}):[];
  return <main className="page incentivePage">
    <div className="title"><div><small>CONTROLLO REMUNERAZIONI</small><h1>Gare e commissioning</h1><p>Configura le lettere incentivo, conteggia le attivazioni e controlla soglie e compensi.</p></div>{selected&&<div className="dashboardBrand"><OperatorLogo operator={selected.operator}/><div className="titleactions"><button className="secondary" onClick={duplicateCompetition}><Copy/>Duplica gara</button><button className="new" onClick={()=>setShowActivation(true)}><Plus/>Aggiungi attivazione</button></div></div>}</div>
    {!items.length?<article className="competitionEmpty"><CircleDollarSign/><h2>Configura la prima gara</h2><p>Il modello riprende soglie e regole principali della lettera WINDTRE di marzo 2026. Potrai duplicarlo per i mesi successivi.</p><button className="new" disabled={busy} onClick={createMarch}>{busy?"Creazione…":"Crea modello Marzo 2026"}</button></article>:<>
      <div className="competitionSelector"><label>Gara<select value={selected?.id||""} onChange={e=>setSelected(items.find(item=>item.id===e.target.value))}>{items.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><Status value={selected?.status==="ACTIVE"?"ACTIVE":"DRAFT"}/><span>{formatDate(selected?.start_date)} - {formatDate(selected?.end_date)}</span></div>
      {selected&&<div className="competitionLayout">
        <section className="competitionConfig">
          <div className="sectiontitle"><div><Settings/><h2>Configurazione gara</h2></div><button className="new" disabled={busy} onClick={saveCompetition}>Salva configurazione</button></div>
          <div className="fieldgrid"><label>Nome<input value={selected.name} onChange={e=>setSelected({...selected,name:e.target.value})}/></label><label>Codice dealer<input value={selected.dealer_code||""} onChange={e=>setSelected({...selected,dealer_code:e.target.value})}/></label><label>Data iniziale<input type="date" value={selected.start_date} onChange={e=>setSelected({...selected,start_date:e.target.value})}/></label><label>Data finale<input type="date" value={selected.end_date} onChange={e=>setSelected({...selected,end_date:e.target.value})}/></label></div>
          <div className="trackConfigList">{tracks.map(([track,config]:any)=><article key={track}><div className="trackTitle"><div><b>{config.label}</b><small>{track}</small></div><label>Soglia accesso<input type="number" step=".01" value={config.access_threshold||0} onChange={e=>{const configuration=structuredClone(selected.configuration);configuration.tracks[track].access_threshold=Number(e.target.value);setSelected({...selected,configuration})}}/></label></div>
            {config.thresholds?.length>0&&<div className="thresholdEditor">{config.thresholds.map((threshold:any,index:number)=><div key={index}><input value={threshold.label} readOnly/><label>Target<input type="number" step=".01" value={threshold.target} onChange={e=>updateThreshold(track,index,"target",e.target.value)}/></label>{track==="MOBILE"&&<><label>Mult. MNP<input type="number" step=".01" value={threshold.mnp_multiplier} onChange={e=>updateThreshold(track,index,"mnp_multiplier",e.target.value)}/></label><label>Mult. NO MNP<input type="number" step=".01" value={threshold.no_mnp_multiplier} onChange={e=>updateThreshold(track,index,"no_mnp_multiplier",e.target.value)}/></label></>}{track==="FIXED"&&<><label>Mult. convergente<input type="number" step=".01" value={threshold.convergent_multiplier} onChange={e=>updateThreshold(track,index,"convergent_multiplier",e.target.value)}/></label><label>Mult. standard<input type="number" step=".01" value={threshold.standard_multiplier} onChange={e=>updateThreshold(track,index,"standard_multiplier",e.target.value)}/></label></>}{track==="RELOAD"&&<label>Moltiplicatore<input type="number" step=".01" value={threshold.bonus_multiplier} onChange={e=>updateThreshold(track,index,"bonus_multiplier",e.target.value)}/></label>}</div>)}</div>}
            <div className="ruleChips">{config.rules?.map((rule:any)=><span key={rule.code}><b>{rule.code}</b>{rule.label}</span>)}</div>
          </article>)}</div>
        </section>
        <section className="competitionResults">
          <div className="sectiontitle"><div><BarChart3/><h2>Avanzamento</h2></div><button className="secondary" disabled={busy} onClick={syncActivations}><Download/>Acquisisci attivazioni</button></div>
          <div className="commissionTotal"><span>Commissioning stimato</span><strong>{formatCurrency(report?.commissioning_total||0)}</strong><small>{report?.valid_events||0} eventi validi su {report?.total_events||0}</small></div>
          <div className="trackProgress">{report?.tracks?.map((track:any)=><article key={track.track}><div><b>{track.label}</b><span>{track.reached}</span></div><strong>{track.points}</strong><small>punti · {track.remaining?`${track.remaining} alla prossima soglia`:"soglia massima"}</small><progress max={track.next_target||Math.max(track.points,1)} value={track.points}/><em>{formatCurrency(track.commission)}</em></article>)}</div>
          <div className="reportButtons"><a className="exportbtn excel" href={`${API}/incentives/${selected.id}/report.xlsx`}><FileSpreadsheet/>Report Excel</a><a className="exportbtn pdf" href={`${API}/incentives/${selected.id}/report.pdf`} target="_blank"><FileText/>Report PDF</a></div>
          <label className="pdcUpload"><UploadCloud/><div><b>Importa attivazione da PDC</b><small>Carica il PDF, controlla i dati e conferma le quote gara.</small></div><input type="file" accept=".pdf,application/pdf" onChange={e=>previewPdc(e.target.files?.[0]||null)}/></label>
        </section>
      </div>}
      {pdcPreview&&<section className="pdcPreview">
        <div className="sectiontitle"><div><FileText/><h2>Anteprima PDC · {pdcPreview.file_name}</h2></div><button className="icon" onClick={()=>{setPdcPreview(null);setPdcFile(null)}}><XCircle/></button></div>
        <div className="pdcSummary"><article><span>Cliente</span><b>{pdcPreview.customer.business_name}</b><small>{pdcPreview.customer.fiscal_code}</small></article><article><span>Contratto</span><b>{pdcPreview.contract.contract_code}</b><small>Codice cliente {pdcPreview.contract.customer_code}</small></article><article><span>Linea</span><b>{pdcPreview.contract.phone||"Nuova linea"}</b><small>{pdcPreview.contract.iccid?`ICCID ${pdcPreview.contract.iccid}`:pdcPreview.document_type==="WINDTRE_PDC_GA_FIXED"?"Numerazione da assegnare":"ICCID non rilevato"}</small></article><article><span>Data</span><b>{formatDate(pdcPreview.contract.activation_date)}</b><small>Dealer {pdcPreview.contract.dealer_code}</small></article><article><span>{pdcPreview.document_type==="WINDTRE_PDC_GA_FIXED"?"Offerta":"Terminale"}</span><b>{pdcPreview.document_type==="WINDTRE_PDC_GA_FIXED"?pdcPreview.contract.plan:(pdcPreview.device.model||"Nessun terminale rilevato")}</b><small>{pdcPreview.device.imei?`IMEI ${pdcPreview.device.imei} · ${formatCurrency(pdcPreview.device.price)}`:pdcPreview.contract.options}</small></article><article><span>Pagamento</span><b>{pdcPreview.contract.payment_method}</b><small>{pdcPreview.device.installments?`${pdcPreview.device.installments} rate da ${formatCurrency(pdcPreview.device.installment_amount)}`:pdcPreview.classification.reason}</small></article></div>
        <div className="pdcQuota"><h3>Quote gara proposte</h3>{pdcPreview.proposed_entries.map((entry:any,index:number)=><article key={index}><CircleDollarSign/><div><b>{entry.label}</b><small>{entry.track} · {entry.offer}</small></div><strong>{formatCurrency(entry.direct_bonus)}</strong></article>)}</div>
        {pdcPreview.warnings?.length>0&&<div className="pdcWarnings">{pdcPreview.warnings.map((warning:string)=><span key={warning}><AlertTriangle/>{warning}</span>)}</div>}
        <div className="pdcConfirm"><label>Venditore<input value={pdcSeller} placeholder="Nome venditore" onChange={e=>setPdcSeller(e.target.value)}/></label>{!pdcPreview.proposed_entries?.some((item:any)=>item.track==="MOBILE")&&pdcPreview.document_type!=="WINDTRE_PDC_GA_FIXED"&&<label className="mobileVerify"><input type="checkbox" checked={includeMobile} onChange={e=>setIncludeMobile(e.target.checked)}/><span><b>Conteggia anche come nuova attivazione Mobile</b><small>Attivare solo dopo verifica quando la PDC non espone un’offerta mobile remunerabile.</small></span></label>}<button className="new" disabled={busy||pdcPreview.duplicate} onClick={importPdc}>{busy?"Importazione…":pdcPreview.duplicate?"PDC già importata":"Conferma importazione"}</button></div>
      </section>}
      {message&&<div className="notice ok"><CheckCircle2/>{message}</div>}
      {report?.activations?.length>0&&<article className="tablecard incentiveTable"><table><thead><tr><th>Operatore</th><th>Data</th><th>Cliente / Utenza</th><th>Pista</th><th>Offerta</th><th>Punti</th><th>Soglia</th><th>Commissione</th><th></th></tr></thead><tbody>{report.activations.map((item:any)=><tr key={item.id}><td><OperatorLogo operator={selected?.operator||"WINDTRE"} compact/></td><td>{formatDate(item.activation_date)}</td><td><b>{item.customer_name||"Inserimento manuale"}</b><small>{item.asset_number}</small></td><td>{item.track}</td><td>{item.offer||"—"}</td><td>{item.points}</td><td>{item.threshold}</td><td><b className="money">{formatCurrency(item.commission)}</b></td><td><button className="icon danger" onClick={()=>removeActivation(item.id)}><Trash2/></button></td></tr>)}</tbody></table></article>}
      {pdcHistory.length>0&&<section className="pdcHistory"><div className="sectiontitle"><div><History/><h2>PDC importate</h2></div><span>{pdcHistory.length} documenti</span></div>{pdcHistory.map(item=><article key={item.id}><FileText/><div><b>{item.customer_name}</b><small>{item.file_name} · {new Date(item.imported_at).toLocaleString("it-IT")}</small></div><span>{item.activation_ids.length} quote</span><a className="secondary" href={API.replace(/\/api\/v1$/,"")+item.report_url} target="_blank"><Printer/>Report attivazione</a></article>)}</section>}
    </>}
    {showActivation&&<div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setShowActivation(false)}}><form className="drawer activationForm" onSubmit={addActivation}><button type="button" className="close" onClick={()=>setShowActivation(false)}>×</button><small>CONTEGGIO GARA</small><h2>Nuova attivazione</h2><div className="fieldgrid"><label>Data attivazione<input type="date" required value={activation.activation_date} onChange={e=>setActivation({...activation,activation_date:e.target.value})}/></label><label>Pista<select value={activation.track} onChange={e=>setActivation({...activation,track:e.target.value})}>{tracks.map(([code,config]:any)=><option value={code} key={code}>{config.label}</option>)}</select></label><label>Numero / identificativo<input value={activation.asset_number} onChange={e=>setActivation({...activation,asset_number:e.target.value})}/></label><label>Codice cliente<input value={activation.customer_code} onChange={e=>setActivation({...activation,customer_code:e.target.value})}/></label><label>Codice contratto<input value={activation.contract_code} onChange={e=>setActivation({...activation,contract_code:e.target.value})}/></label><label>Offerta<input value={activation.offer} onChange={e=>setActivation({...activation,offer:e.target.value})}/></label><label>Canone mensile (€)<input type="number" step=".01" value={activation.monthly_fee} onChange={e=>setActivation({...activation,monthly_fee:Number(e.target.value)})}/></label><label>Gettone diretto (€)<input type="number" step=".01" value={activation.direct_bonus} onChange={e=>setActivation({...activation,direct_bonus:Number(e.target.value)})}/></label><label>Venditore<input value={activation.seller_name} onChange={e=>setActivation({...activation,seller_name:e.target.value})}/></label></div><h3>Caratteristiche che modificano punteggio e compenso</h3><div className="attributeChecks">{Object.entries({mnp:"MNP",tied:"Tied / Easy Pay",piva:"Partita IVA",convergent:"Convergente",ftth:"FTTH",fwa:"FWA",very_mobile:"Very Mobile",secure_option:"Più Sicuri",phone_included:"Telefono Incluso",premium_tied_offer:"Offerta Tied premium"}).map(([key,label])=><label key={key}><input type="checkbox" checked={!!activation.attributes[key]} onChange={e=>setActivation({...activation,attributes:{...activation.attributes,[key]:e.target.checked}})}/>{label}</label>)}</div><div className="formactions"><button className="new" disabled={busy}>Salva e conteggia</button></div></form></div>}
  </main>
}

function Products(){
  const [data,setData]=useState<any>({items:[],total:0,average_cost:0});
  const [search,setSearch]=useState(""),[form,setForm]=useState<any>({sku:"",name:"",unit_cost:""});
  const [editing,setEditing]=useState<string|null>(null),[file,setFile]=useState<File|null>(null),[message,setMessage]=useState("");
  const load=()=>fetch(API+"/products?search="+encodeURIComponent(search)).then(r=>r.json()).then(setData);
  useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer)},[search]);
  async function save(e:React.FormEvent){
    e.preventDefault();setMessage("");
    const response=await fetch(API+(editing?"/products/"+editing:"/products"),{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,unit_cost:form.unit_cost===""?null:Number(form.unit_cost)})});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Salvataggio non riuscito");return}
    setForm({sku:"",name:"",unit_cost:""});setEditing(null);setMessage("Prodotto salvato");load();
  }
  async function remove(id:string){if(!confirm("Rimuovere il prodotto dal catalogo? Gli ordini storici resteranno invariati."))return;await fetch(API+"/products/"+id,{method:"DELETE"});load()}
  async function importFile(){
    if(!file)return;const body=new FormData();body.append("file",file);const response=await fetch(API+"/products/import",{method:"POST",body});const result=await response.json();
    setMessage(response.ok?`Importati ${result.added}, aggiornati ${result.updated}, scartati ${result.rejected}`:(result.detail||"Importazione non riuscita"));if(response.ok){setFile(null);load()}
  }
  return <main className="page">
    <div className="title"><div><small>MASTER DATA CATALOG</small><h1>Anagrafica prodotti</h1><p>Catalogo unico per ordini, magazzino e reportistica SIM.</p></div></div>
    <div className="kpis compactkpis"><Card label="Prodotti attivi" value={data.total}/><Card label="Costo medio" value={formatCurrency(data.average_cost)}/></div>
    <div className="modulegrid">
      <form className="modulecard" onSubmit={save}><h2>{editing?"Modifica prodotto":"Nuovo prodotto"}</h2><div className="modulefields"><label>Codice articolo / SKU<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} required/></label><label>Nome prodotto<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Costo unitario (€)<input type="number" step="0.01" min="0" value={form.unit_cost} onChange={e=>setForm({...form,unit_cost:e.target.value})}/></label></div><div className="rowactions">{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm({sku:"",name:"",unit_cost:""})}}>Annulla</button>}<button className="new">{editing?"Aggiorna":"Crea prodotto"}</button></div>{message&&<p className="formmessage">{message}</p>}</form>
      <section className="modulecard"><h2>Importazione massiva</h2><p className="muted">CSV o Excel con colonne Codice/SKU, Nome/Descrizione e Costo.</p><label className="drop compactdrop"><UploadCloud/><span>{file?.name||"Seleziona CSV o Excel"}</span><input type="file" accept=".csv,.xlsx,.xlsm" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="new" disabled={!file} onClick={importFile}>Importa catalogo</button></section>
    </div>
    <div className="toolbar"><div className="inputsearch"><Search/><input placeholder="Cerca codice o prodotto..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <article className="tablecard"><table><thead><tr><th>SKU</th><th>Prodotto</th><th>Costo unitario</th><th></th></tr></thead><tbody>{data.items.map((item:any)=><tr key={item.id}><td><b>{item.sku}</b></td><td>{item.name}</td><td>{item.unit_cost==null?"—":formatCurrency(item.unit_cost)}</td><td><div className="tableactions"><button className="linkbtn" onClick={()=>{setEditing(item.id);setForm({sku:item.sku,name:item.name,unit_cost:item.unit_cost??""});scrollTo({top:0,behavior:"smooth"})}}>Modifica</button><button className="dangerbtn" onClick={()=>remove(item.id)}><Trash2/></button></div></td></tr>)}</tbody></table></article>
  </main>;
}

function SimOrders(){
  const [products,setProducts]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[message,setMessage]=useState("");
  const blank=()=>({order_number:"",order_date:new Date().toISOString().slice(0,10),supplier:"WindTre",notes:"",status:"INVIATO",lines:[{product_id:"",quantity:1,description:""}]});
  const [form,setForm]=useState<any>(blank());
  const load=()=>Promise.all([fetch(API+"/products").then(r=>r.json()).then(d=>setProducts(d.items)),fetch(API+"/sim-orders").then(r=>r.json()).then(setOrders)]);
  useEffect(()=>{load()},[]);
  function updateLine(index:number,field:string,value:any){setForm({...form,lines:form.lines.map((line:any,i:number)=>i===index?{...line,[field]:value}:line)})}
  async function quickProduct(){
    const sku=prompt("Codice articolo / SKU");if(!sku)return;const name=prompt("Nome prodotto");if(!name)return;
    const response=await fetch(API+"/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku,name,unit_cost:null})});
    if(response.ok){const item=await response.json();await load();updateLine(form.lines.length-1,"product_id",item.id)}
  }
  async function create(e:React.FormEvent){
    e.preventDefault();setMessage("");
    const response=await fetch(API+"/sim-orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,lines:form.lines.map((line:any)=>({...line,quantity:Number(line.quantity)}))})});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Creazione non riuscita");return}setForm(blank());setMessage(`Ordine ${result.order_number} creato`);load();
  }
  async function changeStatus(id:string,status:string){await fetch(API+"/sim-orders/"+id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});load()}
  async function share(order:any,channel:"whatsapp"|"email"|"copy"){
    const result=await fetch(API+"/sim-orders/"+order.id+"/share").then(r=>r.json());
    if(channel==="copy"){await navigator.clipboard.writeText(result.text);setMessage("Testo ordine copiato")}
    if(channel==="whatsapp")window.open("https://wa.me/?text="+encodeURIComponent(result.text),"_blank");
    if(channel==="email")window.location.href="mailto:?subject="+encodeURIComponent(result.subject)+"&body="+encodeURIComponent(result.text);
  }
  return <main className="page">
    <div className="title"><div><small>PROCUREMENT</small><h1>Ordini SIM</h1><p>Pianifica e monitora gli approvvigionamenti fino alla ricezione.</p></div></div>
    <form className="modulecard orderform" onSubmit={create}><h2>Nuovo ordine</h2><div className="modulefields three"><label>ID ordine (facoltativo)<input placeholder="Automatico: ORD-2026-001" value={form.order_number} onChange={e=>setForm({...form,order_number:e.target.value})}/></label><label>Data<input type="date" value={form.order_date} onChange={e=>setForm({...form,order_date:e.target.value})}/></label><label>Fornitore<input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></label></div>
      <div className="orderlines"><div className="linehead"><b>Righe ordine</b><button type="button" className="secondary" onClick={()=>setForm({...form,lines:[...form.lines,{product_id:"",quantity:1,description:""}]})}><Plus/>Aggiungi riga</button></div>{form.lines.map((line:any,index:number)=><div className="orderline" key={index}><select value={line.product_id} onChange={e=>updateLine(index,"product_id",e.target.value)} required><option value="">Seleziona prodotto</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select><input type="number" min="1" value={line.quantity} onChange={e=>updateLine(index,"quantity",e.target.value)}/><input placeholder="Note riga" value={line.description} onChange={e=>updateLine(index,"description",e.target.value)}/><button type="button" className="dangerbtn" disabled={form.lines.length===1} onClick={()=>setForm({...form,lines:form.lines.filter((_:any,i:number)=>i!==index)})}><Trash2/></button></div>)}</div>
      <button type="button" className="textbtn" onClick={quickProduct}><Plus/>Crea rapidamente un prodotto</button><label className="widefield">Note ordine<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="rowactions"><button className="new"><ShoppingCart/>Crea ordine</button></div>{message&&<p className="formmessage">{message}</p>}
    </form>
    <div className="ordercards">{orders.map(order=><article className="ordercard" key={order.id}><div className="orderhead"><div><small>{formatDate(order.order_date)}</small><h3>{order.order_number}</h3><p>{order.supplier||"Fornitore non indicato"} · {order.total_quantity} SIM</p></div><select value={order.status} onChange={e=>changeStatus(order.id,e.target.value)}>{ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div><div className="orderitems">{order.lines.map((line:any)=><div key={line.id}><span>{line.sku} · {line.product_name}</span><b>{line.quantity}</b></div>)}</div><div className="shareactions"><button onClick={()=>share(order,"whatsapp")}><MessageCircle/>WhatsApp</button><button onClick={()=>share(order,"email")}><Mail/>Email</button><button onClick={()=>share(order,"copy")}><Copy/>Copia testo</button></div></article>)}</div>
  </main>;
}

function SimInventory({initialFilter}:{initialFilter:any}){
  const [products,setProducts]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]);
  const [items,setItems]=useState<any[]>([]),[message,setMessage]=useState("");
  const [filters,setFilters]=useState<any>({search:"",status:"",product_id:"",order_id:"",...initialFilter});
  const [form,setForm]=useState<any>({iccid:"",product_id:"",order_id:"",status:"IN_MAGAZZINO",customer_id:null,msisdn:""});
  const [importForm,setImportForm]=useState<any>({file:null,product_sku:"",order_number:"",default_status:"IN_MAGAZZINO"});
  const loadDependencies=()=>Promise.all([fetch(API+"/products").then(r=>r.json()).then(d=>setProducts(d.items)),fetch(API+"/sim-orders").then(r=>r.json()).then(setOrders),fetch(API+"/customers?limit=500").then(r=>r.json()).then(setCustomers)]);
  const load=()=>{const query=new URLSearchParams(Object.entries(filters).filter(([,v])=>v) as any);return fetch(API+"/sim-inventory?"+query).then(r=>r.json()).then(setItems)};
  useEffect(()=>{loadDependencies()},[]);
  useEffect(()=>{setFilters((current:any)=>({...current,...initialFilter}))},[JSON.stringify(initialFilter)]);
  useEffect(()=>{const timer=setTimeout(load,180);return()=>clearTimeout(timer)},[JSON.stringify(filters)]);
  async function create(e:React.FormEvent){
    e.preventDefault();const response=await fetch(API+"/sim-inventory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,order_id:form.order_id||null,customer_id:form.customer_id||null})});
    const result=await response.json();setMessage(response.ok?"SIM inserita":result.detail||"Inserimento non riuscito");if(response.ok){setForm({...form,iccid:"",msisdn:""});load()}
  }
  async function update(item:any,patch:any){const response=await fetch(API+"/sim-inventory/"+item.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:item.status,customer_id:item.customer_id,msisdn:item.msisdn,...patch})});if(response.ok)load()}
  async function importFile(){
    if(!importForm.file)return;const body=new FormData();body.append("file",importForm.file);body.append("product_sku",importForm.product_sku);body.append("order_number",importForm.order_number);body.append("default_status",importForm.default_status);
    const response=await fetch(API+"/sim-inventory/import",{method:"POST",body});const result=await response.json();setMessage(response.ok?`Carico completato: ${result.added} nuove, ${result.updated} aggiornate, ${result.rejected} scartate`:result.detail);if(response.ok)load();
  }
  async function quickCustomer(){
    const business_name=prompt("Ragione sociale / Nome cliente");if(!business_name)return;const tax_id=prompt("Partita IVA o codice fiscale (facoltativo)")||"";const address=prompt("Indirizzo (facoltativo)")||"";
    const response=await fetch(API+"/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_name,tax_id,address})});if(response.ok){setMessage("Cliente creato");loadDependencies()}else setMessage((await response.json()).detail);
  }
  return <main className="page">
    <div className="title"><div><small>STOCK & SERIAL LIFECYCLE</small><h1>Magazzino SIM</h1><p>Traccia ogni ICCID dall’ordine fino all’assegnazione e attivazione.</p></div><button className="secondary" onClick={quickCustomer}><Plus/>Nuovo cliente rapido</button></div>
    <div className="modulegrid">
      <form className="modulecard" onSubmit={create}><h2>Inserisci singola SIM</h2><div className="modulefields"><label>ICCID<input inputMode="numeric" value={form.iccid} onChange={e=>setForm({...form,iccid:e.target.value})} required/></label><label>Prodotto<select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})} required><option value="">Seleziona</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>Ordine<select value={form.order_id} onChange={e=>setForm({...form,order_id:e.target.value})}><option value="">Nessun ordine</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_number}</option>)}</select></label><label>Stato<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{SIM_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label></div><button className="new">Registra SIM</button></form>
      <section className="modulecard"><h2>Carico massivo seriali</h2><label className="drop compactdrop"><UploadCloud/><span>{importForm.file?.name||"CSV o Excel con ICCID"}</span><input type="file" accept=".csv,.xlsx,.xlsm" onChange={e=>setImportForm({...importForm,file:e.target.files?.[0]||null})}/></label><div className="modulefields"><label>Prodotto predefinito<select value={importForm.product_sku} onChange={e=>setImportForm({...importForm,product_sku:e.target.value})}><option value="">Dal file</option>{products.map(p=><option key={p.id} value={p.sku}>{p.sku}</option>)}</select></label><label>Ordine predefinito<select value={importForm.order_number} onChange={e=>setImportForm({...importForm,order_number:e.target.value})}><option value="">Dal file / nessuno</option>{orders.map(o=><option key={o.id} value={o.order_number}>{o.order_number}</option>)}</select></label></div><button className="new" disabled={!importForm.file} onClick={importFile}>Carica lotto</button></section>
    </div>
    {message&&<div className="notice ok">{message}</div>}
    <div className="filterbar"><div className="inputsearch"><Search/><input placeholder="ICCID, MSISDN, cliente, ordine o prodotto..." value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></div><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Tutti gli stati</option>{SIM_STATUSES.map(s=><option key={s}>{s}</option>)}</select><select value={filters.product_id} onChange={e=>setFilters({...filters,product_id:e.target.value})}><option value="">Tutti i prodotti</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku}</option>)}</select><button className="secondary" onClick={()=>setFilters({search:"",status:"",product_id:"",order_id:""})}>Azzera</button></div>
    <article className="tablecard"><table><thead><tr><th>ICCID / MSISDN</th><th>Prodotto</th><th>Ordine</th><th>Stato</th><th>Cliente assegnato</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><b className="mono">{item.iccid}</b><small>{item.msisdn||"Nessun numero"}</small></td><td>{item.sku}<small>{item.product_name}</small></td><td>{item.order_number||"—"}</td><td><select className="statusselect" value={item.status} onChange={e=>update(item,{status:e.target.value})}>{SIM_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td><select value={item.customer_id||""} onChange={e=>update(item,{customer_id:e.target.value||null,status:e.target.value?"ASSEGNATA":item.status})}><option value="">Non assegnata</option>{customers.map(c=><option key={c.id} value={c.id}>{c.business_name}</option>)}</select></td></tr>)}</tbody></table></article>
  </main>;
}

function SimReport({openInventory}:{openInventory:(filter:any)=>void}){
  const [report,setReport]=useState<any>(null),[open,setOpen]=useState<Record<string,boolean>>({});
  useEffect(()=>{fetch(API+"/sim-report").then(r=>r.json()).then(setReport)},[]);
  if(!report)return <main className="page"><div className="loading">Caricamento report…</div></main>;
  return <main className="page">
    <div className="title"><div><small>STOCK ANALYTICS</small><h1>Report SIM</h1><p>Giacenze consolidate per ordine e articolo.</p></div></div>
    <div className="kpis"><Card label="SIM censite" value={report.total}/><Card label="Disponibili" value={report.available}/><Card label="Assegnate / utilizzate" value={report.assigned}/><Card label="Tasso assegnazione" value={report.assignment_rate+"%"}/></div>
    <div className="reporttree">{report.orders.map((order:any)=><article key={order.order_id||"none"} className="reportorder"><button className="reportorderhead" onClick={()=>setOpen({...open,[order.order_number]:!open[order.order_number]})}>{open[order.order_number]?<ChevronDown/>:<ChevronRight/>}<div><b>{order.order_number}</b><small>{order.order_date?formatDate(order.order_date):"Seriali senza ordine"} · {order.status||""}</small></div><span>{order.products.reduce((sum:number,p:any)=>sum+p.total,0)} SIM caricate</span></button>{open[order.order_number]&&<div className="reportproducts">{order.products.map((product:any)=><button key={product.product_id} onClick={()=>openInventory({order_id:order.order_id||"",product_id:product.product_id})}><div><b>{product.sku}</b><small>{product.product_name}</small></div><div className="stocknumbers"><span>Ordinate <b>{product.ordered}</b></span><span>Caricate <b>{product.total}</b></span><span>Disponibili <b>{product.available}</b></span><span>Assegnate <b>{product.total-product.available}</b></span></div></button>)}</div>}</article>)}</div>
  </main>;
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

function LetterheadDesigner(){
  const [template,setTemplate]=useState<any>(null),[customers,setCustomers]=useState<any[]>([]),[mode,setMode]=useState<"A4"|"DL">("A4");
  const [customerId,setCustomerId]=useState(""),[recipient,setRecipient]=useState({name:"",address:""}),[body,setBody]=useState(""),[message,setMessage]=useState("");
  useEffect(()=>{fetch(API+"/letterhead-template").then(r=>r.json()).then(setTemplate);fetch(API+"/customers?limit=500").then(r=>r.json()).then(setCustomers)},[]);
  function chooseCustomer(id:string){setCustomerId(id);const c=customers.find(x=>x.id===id);setRecipient({name:c?.business_name||"",address:c?.address||""})}
  async function syncStore(){const r=await fetch(API+"/letterhead-template/sync-store",{method:"POST"});setTemplate(await r.json());setMessage("Dati copiati dalla configurazione del punto vendita.")}
  async function save(){const r=await fetch(API+"/letterhead-template",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(template)});const d=await r.json();if(!r.ok){setMessage(d.detail||"Salvataggio non riuscito");return}setTemplate(d);setMessage("Template salvato correttamente.")}
  async function generate(print=false){const r=await fetch(API+"/letterhead-template/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,customer_id:customerId||null,recipient_name:recipient.name,recipient_address:recipient.address,body_text:body})});if(!r.ok){const d=await r.json();setMessage(d.detail||"Generazione non riuscita");return}const url=URL.createObjectURL(await r.blob());const w=window.open(url,"_blank");if(print&&w)setTimeout(()=>w.print(),800)}
  if(!template)return <main className="page"><Empty icon={<FileText/>} text="Caricamento template…"/></main>;
  const logoAlign={justifyContent:template.logo_horizontal==="left"?"flex-start":template.logo_horizontal==="right"?"flex-end":"center",alignItems:template.logo_vertical==="top"?"flex-start":template.logo_vertical==="bottom"?"flex-end":"center"};
  return <main className="page"><div className="title"><div><small>IMMAGINE COORDINATA</small><h1>Carta e buste intestate</h1><p>Configura, calibra e stampa in scala reale A4 o busta DL.</p></div><div className="titleactions"><button className="secondary" onClick={()=>generate(false)}><Download/>Scarica PDF</button><button className="secondary" onClick={()=>generate(true)}><Printer/>Stampa</button><button className="new" onClick={save}>Salva template</button></div></div>
    <div className="letterheadTabs"><button className={mode==="A4"?"active":""} onClick={()=>setMode("A4")}>Carta A4</button><button className={mode==="DL"?"active":""} onClick={()=>setMode("DL")}>Busta DL</button></div>
    <div className="letterheadWorkspace"><aside className="letterheadControls"><button className="secondary full" onClick={syncStore}><Store/>Copia da configurazione agenzia</button><h3>Mittente</h3>{[["company_name","Azienda"],["company_address","Indirizzo completo"],["tax_id","Partita IVA / CF"],["phone","Telefono"],["email","Email"],["pec","PEC"],["website","Sito web"],["logo_url","URL logo"]].map(([key,label])=><label key={key}>{label}<input value={template[key]||""} onChange={e=>setTemplate({...template,[key]:e.target.value})}/></label>)}<label>Colore primario<input type="color" value={template.primary_color} onChange={e=>setTemplate({...template,primary_color:e.target.value})}/></label><label>Dimensione logo: {template.logo_size}px<input type="range" min="32" max="160" value={template.logo_size} onChange={e=>setTemplate({...template,logo_size:Number(e.target.value)})}/></label><label>Allineamento orizzontale<select value={template.logo_horizontal} onChange={e=>setTemplate({...template,logo_horizontal:e.target.value})}><option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option></select></label><label>Allineamento verticale<select value={template.logo_vertical} onChange={e=>setTemplate({...template,logo_vertical:e.target.value})}><option value="top">Alto</option><option value="center">Centro</option><option value="bottom">Basso</option></select></label><h3>Destinatario</h3><label>Cliente CRM<select value={customerId} onChange={e=>chooseCustomer(e.target.value)}><option value="">Destinatario manuale</option>{customers.map(c=><option key={c.id} value={c.id}>{c.business_name}</option>)}</select></label><label>Nome / Ragione sociale<input value={recipient.name} onChange={e=>setRecipient({...recipient,name:e.target.value})}/></label><label>Indirizzo<textarea rows={3} value={recipient.address} onChange={e=>setRecipient({...recipient,address:e.target.value})}/></label><label>Sposta a sinistra: {template.recipient_offset_mm} mm<input type="range" min="0" max="100" value={template.recipient_offset_mm} onChange={e=>setTemplate({...template,recipient_offset_mm:Number(e.target.value)})}/></label>{mode==="A4"&&<label>Corpo della lettera<textarea rows={7} value={body} onChange={e=>setBody(e.target.value)} placeholder="Scrivi qui la comunicazione…"/></label>}{message&&<div className="formmessage">{message}</div>}</aside>
      <section className="previewStage"><div className={"paperPreview "+mode.toLowerCase()} style={{"--primary":template.primary_color} as any}>{mode==="A4"?<><header className="paperHeader" style={logoAlign}>{template.logo_url?<img src={template.logo_url.startsWith("/")?assetUrl(template.logo_url):template.logo_url} style={{height:template.logo_size}}/>:null}<b>{template.company_name}</b></header><div className="paperLine"/><address className="paperRecipient" style={{right:`${20+template.recipient_offset_mm}mm`}}><b>{recipient.name||"Spett.le Destinatario"}</b><span>{recipient.address||"Indirizzo completo"}</span></address><div className="paperBody">{body||"Spazio riservato al contenuto della comunicazione."}</div><footer>{[template.company_name,template.company_address,template.tax_id&&`P.IVA/CF ${template.tax_id}`,template.phone,template.email,template.pec,template.website].filter(Boolean).join(" · ")}</footer></>:<><div className="envelopeSender">{template.logo_url?<img src={template.logo_url.startsWith("/")?assetUrl(template.logo_url):template.logo_url} style={{height:Math.min(template.logo_size,70)}}/>:null}<b>{template.company_name}</b><span>{template.company_address}</span></div><address className="envelopeRecipient" style={{right:`${10+template.recipient_offset_mm}mm`}}><b>{recipient.name||"Spett.le Destinatario"}</b><span>{recipient.address||"Indirizzo completo"}</span></address></>}</div></section>
    </div>
  </main>
}

const PANEL_DOCS=["Carta d'Identità / Patente","Codice Fiscale / Tessera Sanitaria","Visura Camerale aggiornata","Coordinate bancarie (IBAN)","Copia ultima bolletta"];
const EMPTY_PANEL_FORM={customer_id:"",customer_name:"",email:"",tax_id:"",customer_code:"",otp_phone:"",gender:"M",legal_representative:"",birth_place:"",birth_date:"",residence:"",legal_address:"",numbers:"",shipping_address:"",new_company:"",business_number:"",consumer_number:"",sim_serial:"",consumer_holder:"",consumer_tax_id:"",store:"",custom_document:"",documents:[] as string[],sims:[{msisdn:"",iccid:""}]};

function WindTrePanel(){
  const [templates,setTemplates]=useState<any[]>([]),[templateKey,setTemplateKey]=useState("DOCUMENTI");
  const [form,setForm]=useState<any>(EMPTY_PANEL_FORM),[suggestions,setSuggestions]=useState<any[]>([]);
  const [records,setRecords]=useState<any[]>([]),[recordSearch,setRecordSearch]=useState(""),[recordStatus,setRecordStatus]=useState("");
  const [storeInfo,setStoreInfo]=useState<any>({});
  const [signature,setSignature]=useState(localStorage.getItem("miaFirma")||"Cordiali saluti\nCornet Solutions"),[message,setMessage]=useState("");
  const template=templates.find(item=>item.key===templateKey);
  async function loadRecords(){const p=new URLSearchParams();if(recordSearch)p.set("search",recordSearch);if(recordStatus)p.set("status",recordStatus);const response=await fetch(API+"/windtre-panel/requests?"+p);setRecords(await response.json())}
  useEffect(()=>{fetch(API+"/windtre-panel/templates").then(r=>r.json()).then(setTemplates);fetch(API+"/settings/store").then(r=>r.json()).then(setStoreInfo);loadRecords()},[]);
  useEffect(()=>{const timer=setTimeout(loadRecords,180);return()=>clearTimeout(timer)},[recordSearch,recordStatus]);
  useEffect(()=>{const timer=setTimeout(async()=>{if(form.customer_name.trim().length<3){setSuggestions([]);return}const response=await fetch(API+"/customers?search="+encodeURIComponent(form.customer_name)+"&limit=5");setSuggestions(await response.json())},220);return()=>clearTimeout(timer)},[form.customer_name]);
  async function selectCustomer(item:any){const response=await fetch(API+"/customers/"+item.id);const customer=await response.json();setForm({...form,customer_id:customer.id,customer_name:customer.business_name,tax_id:customer.tax_id||customer.fiscal_code||"",customer_code:customer.windtre_customer_code||"",email:customer.email||"",otp_phone:customer.phone||"",residence:customer.address||"",legal_address:customer.address||"",shipping_address:customer.address||""});setSuggestions([])}
  function changeTemplate(key:string){setTemplateKey(key);setMessage("");setForm({...EMPTY_PANEL_FORM})}
  function setField(key:string,value:any){setForm({...form,[key]:value})}
  function toggleDocument(value:string){setField("documents",form.documents.includes(value)?form.documents.filter((item:string)=>item!==value):[...form.documents,value])}
  function changeSim(index:number,key:string,value:string){setField("sims",form.sims.map((item:any,i:number)=>i===index?{...item,[key]:value}:item))}
  function addSim(){setField("sims",[...form.sims,{msisdn:"",iccid:""}])}
  function grammar(){return form.gender==="F"?{subject:"La sottoscritta",born:"nata"}:{subject:"Il sottoscritto",born:"nato"}}
  function buildBody(){
    const g=grammar(), company=form.customer_name||"Cliente", tax=`P.IVA/CF: ${form.tax_id||"—"}`, code=`Codice cliente: ${form.customer_code||"—"}`;
    const intro=`${g.subject} ${form.legal_representative||""}, ${g.born} a ${form.birth_place||"—"}${form.birth_date?` il ${formatDate(form.birth_date)}`:""}, residente in ${form.residence||"—"}, in qualità di Legale Rappresentante di ${company}, ${tax}.`;
    const numbers=(form.numbers||"").split(/[,\\n;]/).map((x:string)=>x.trim()).filter(Boolean).map((x:string)=>`- ${x}`).join("\n");
    const simList=form.sims.filter((x:any)=>x.msisdn||x.iccid).map((x:any)=>`- Numero ${x.msisdn||"—"} · ICCID ${x.iccid||"—"}`).join("\n");
    const docs=[...form.documents,...(form.custom_document?form.custom_document.split("\n").filter(Boolean):[])].map((x:string)=>`- ${x}`).join("\n");
    const bodies:Record<string,string>={
      DOCUMENTI:`Gentile ${company},\n\nper procedere con la lavorazione chiediamo di inviare i seguenti documenti:\n${docs||"- Documentazione necessaria alla pratica"}\n\n${tax}\nTelefono per OTP: ${form.otp_phone||"—"}`,
      DISDETTA_1928:`${intro}\n\nrichiede la cessazione delle seguenti numerazioni Business SME:\n${numbers||"- Nessun numero indicato"}\n\n${code}\nSede legale: ${form.legal_address||"—"}\n\nSi richiede conferma della presa in carico.`,
      CESSAZIONE_159:`${intro}\n\nrichiede la cessazione delle seguenti utenze Consumer/Micro:\n${numbers||"- Nessun numero indicato"}\n\n${code}\n\nSi richiede conferma della presa in carico.`,
      SOSTITUZIONE_SIM:`${intro}\n\nrichiede la sostituzione per furto/smarrimento delle seguenti SIM:\n${simList||"- Nessuna SIM indicata"}\n\nIndirizzo di spedizione: ${form.shipping_address||"—"}\n${code}`,
      CAMBIO_AGENZIA:`${intro}\n\nrichiede che la gestione del cliente venga trasferita alla nostra agenzia.\n\nCodice Partner Agente: ${storeInfo.dealer_code||"da configurare"}`,
      BUSINESS_CONSUMER:`${intro}\n\nrichiede il passaggio Business -> Consumer.\nNumero Business: ${form.business_number||"—"}\nNumero Consumer: ${form.consumer_number||"—"}\nSeriale SIM: ${form.sim_serial||"—"}\nIntestatario Consumer: ${form.consumer_holder||"—"}\nCF intestatario: ${form.consumer_tax_id||"—"}\nNegozio: ${form.store||"—"}`,
      SPEDIZIONE_TERMINALI:`${intro}\n\nautorizza la spedizione dei terminali al seguente indirizzo, differente dalla sede legale:\n${form.shipping_address||"—"}.`,
      SUBENTRO:`Gentili,\n\nper il subentro delle utenze:\n${numbers||"- Nessun numero indicato"}\n\ndalla società ${company} alla società ${form.new_company||"—"}, occorrono la Visura Camerale aggiornata e i documenti dei rispettivi Legali Rappresentanti.`,
      BENVENUTO:`Gentile ${company},\n\nconfermiamo che il suo ordine è stato correttamente caricato nei sistemi WindTre. La terremo aggiornata sui prossimi passaggi.`,
      SOLLECITO:`Gentili,\n\ncon la presente sollecitiamo un aggiornamento sulla pratica relativa al cliente ${company}.\n\nChiediamo cortesemente riscontro sullo stato di lavorazione.`,
    };
    return `${bodies[templateKey]||""}\n\n${signature}`;
  }
  function validate(){
    if(!form.customer_name.trim())return "Seleziona o inserisci il cliente";
    const taxRequired=!["BENVENUTO","SOLLECITO","SUBENTRO"].includes(templateKey);
    if(taxRequired&&!/^\\d{11}$/.test((form.tax_id||"").replace(/\\D/g,"")))return "La Partita IVA deve contenere esattamente 11 cifre";
    if(templateKey==="DOCUMENTI"&&!/^\\d{9,10}$/.test((form.otp_phone||"").replace(/\\D/g,"")))return "Il telefono OTP deve contenere 9 o 10 cifre";
    return "";
  }
  function recipient(){return template?.recipient||form.email||""}
  async function generate(){
    const error=validate();if(error){setMessage(error);return}
    const title=template?.title||"Comunicazione WindTre",subject=`${title} - ${form.customer_name}`,body=buildBody(),to=recipient();
    const popup=window.open("about:blank","_blank");const response=await fetch(API+"/windtre-panel/requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_id:form.customer_id||null,customer_name:form.customer_name,template_key:templateKey,recipient:to,subject,body,form_data:{...form,partner_code:storeInfo.dealer_code||""},operator_uid:"admin@cornet.local"})});
    const result=await response.json();if(!response.ok){popup?.close();setMessage(result.detail||"Pratica non registrata");return}
    const gmail=`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;if(popup)popup.location.href=gmail;else window.open(gmail,"_blank");setMessage("Pratica registrata e comunicazione preparata in Gmail.");loadRecords();
  }
  function printModule(){const subject=`${template?.title||"Modulo"} - ${form.customer_name}`,body=buildBody(),escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]||char));const popup=window.open("","_blank");popup?.document.write(`<html><head><title>${escape(subject)}</title><style>body{font-family:Arial;padding:45px;line-height:1.55}h1{font-size:20px}pre{white-space:pre-wrap;font:14px Arial}footer{margin-top:60px}</style></head><body><h1>${escape(subject)}</h1><pre>${escape(body)}</pre><footer>Data ____________ &nbsp;&nbsp;&nbsp; Firma ______________________________</footer><script>window.print()</script></body></html>`);popup?.document.close()}
  async function updateResponse(item:any,value:string){await fetch(API+"/windtre-panel/requests/"+item.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({response_date:value||null})});loadRecords()}
  async function removeRecord(item:any){if(!confirm("Eliminare questa pratica dal registro?"))return;await fetch(API+"/windtre-panel/requests/"+item.id,{method:"DELETE"});loadRecords()}
  const commonFields=<><div className="customerLookup"><label>Ragione sociale / Cliente<input value={form.customer_name} onChange={e=>setField("customer_name",e.target.value)} placeholder="Digita almeno 3 caratteri…"/></label>{suggestions.length>0&&<div>{suggestions.map(item=><button type="button" onClick={()=>selectCustomer(item)} key={item.id}><b>{item.business_name}</b><span>{item.tax_id||item.fiscal_code||"Codice fiscale non presente"}</span></button>)}</div>}</div><label>Email cliente<input type="email" value={form.email} onChange={e=>setField("email",e.target.value)}/></label>{!["BENVENUTO","SOLLECITO","SUBENTRO"].includes(templateKey)&&<><label>Partita IVA<input value={form.tax_id} onChange={e=>setField("tax_id",e.target.value)} maxLength={16}/></label><label>Codice cliente WindTre<input value={form.customer_code} onChange={e=>setField("customer_code",e.target.value)}/></label></>}</>;
  const legalFields=<>{["DISDETTA_1928","CESSAZIONE_159","SOSTITUZIONE_SIM","CAMBIO_AGENZIA","BUSINESS_CONSUMER","SPEDIZIONE_TERMINALI"].includes(templateKey)&&<><label>Genere<select value={form.gender} onChange={e=>setField("gender",e.target.value)}><option value="M">Maschile</option><option value="F">Femminile</option></select></label><label>Legale rappresentante<input value={form.legal_representative} onChange={e=>setField("legal_representative",e.target.value)}/></label></>}{["DISDETTA_1928","CESSAZIONE_159","SOSTITUZIONE_SIM","BUSINESS_CONSUMER"].includes(templateKey)&&<><label>Luogo di nascita<input value={form.birth_place} onChange={e=>setField("birth_place",e.target.value)}/></label><label>Data di nascita<input type="date" value={form.birth_date} onChange={e=>setField("birth_date",e.target.value)}/></label><label>Residenza<input value={form.residence} onChange={e=>setField("residence",e.target.value)}/></label></>}</>;
  return <main className="page">
    <div className="title"><div><small>COMUNICAZIONI OPERATIVE</small><h1>WindTre Pannello</h1><p>Prepara richieste, PEC e comunicazioni usando automaticamente i dati del CRM.</p></div><label className="panelSignature">Firma agente<textarea rows={2} value={signature} onChange={e=>{setSignature(e.target.value);localStorage.setItem("miaFirma",e.target.value)}}/></label></div>
    <div className="panelWorkspace"><aside className="templateRail"><small>MODELLI OPERATIVI</small>{templates.map(item=><button className={templateKey===item.key?"active":""} onClick={()=>changeTemplate(item.key)} key={item.key}><Mail/><span>{item.title}</span><ChevronRight/></button>)}</aside><section className="panelComposer"><div className="panelComposerHead"><div><small>{template?.category}</small><h2>{template?.title}</h2></div><span>A: {recipient()||"da indicare"}</span></div><div className="fieldgrid">{commonFields}{legalFields}{templateKey==="DOCUMENTI"&&<label>Telefono OTP<input value={form.otp_phone} onChange={e=>setField("otp_phone",e.target.value)}/></label>}{["DISDETTA_1928","CESSAZIONE_159","SUBENTRO"].includes(templateKey)&&<label>Numeri interessati<textarea rows={3} value={form.numbers} onChange={e=>setField("numbers",e.target.value)} placeholder="Un numero per riga"/></label>}{templateKey==="DISDETTA_1928"&&<label>Sede legale<input value={form.legal_address} onChange={e=>setField("legal_address",e.target.value)}/></label>}{["SOSTITUZIONE_SIM","SPEDIZIONE_TERMINALI"].includes(templateKey)&&<label>Indirizzo di spedizione<input value={form.shipping_address} onChange={e=>setField("shipping_address",e.target.value)}/></label>}{templateKey==="SUBENTRO"&&<label>Nuova ragione sociale<input value={form.new_company} onChange={e=>setField("new_company",e.target.value)}/></label>}{templateKey==="BUSINESS_CONSUMER"&&<>{[["business_number","Numero Business"],["consumer_number","Numero Consumer"],["sim_serial","Seriale SIM"],["consumer_holder","Intestatario Consumer"],["consumer_tax_id","CF intestatario"],["store","Negozio"]].map(([key,label])=><label key={key}>{label}<input value={form[key]} onChange={e=>setField(key,e.target.value)}/></label>)}</>}</div>
      {templateKey==="DOCUMENTI"&&<section className="documentChecklist"><h3>Documenti richiesti</h3>{PANEL_DOCS.map(item=><label key={item}><input type="checkbox" checked={form.documents.includes(item)} onChange={()=>toggleDocument(item)}/>{item}</label>)}<textarea rows={2} placeholder="Altri documenti, uno per riga…" value={form.custom_document} onChange={e=>setField("custom_document",e.target.value)}/></section>}
      {templateKey==="SOSTITUZIONE_SIM"&&<section className="multiSims"><div><h3>SIM da sostituire</h3><button type="button" className="secondary" onClick={addSim}><Plus/>Aggiungi SIM</button></div>{form.sims.map((item:any,index:number)=><div key={index}><input placeholder="Numero MSISDN" value={item.msisdn} onChange={e=>changeSim(index,"msisdn",e.target.value)}/><input placeholder="Seriale ICCID" value={item.iccid} onChange={e=>changeSim(index,"iccid",e.target.value)}/>{form.sims.length>1&&<button className="dangerbtn" onClick={()=>setField("sims",form.sims.filter((_:any,i:number)=>i!==index))}><Trash2/></button>}</div>)}</section>}
      <section className="mailPreview"><small>ANTEPRIMA TESTO</small><pre>{buildBody()}</pre></section>{message&&<div className={"notice "+(message.startsWith("Pratica")?"ok":"error")}>{message.startsWith("Pratica")?<CheckCircle2/>:<XCircle/>}{message}</div>}<div className="formactions">{template?.printable&&<button className="secondary" onClick={printModule}><Printer/>Anteprima e stampa</button>}<button className="new" onClick={generate}><Mail/>Registra e apri Gmail</button></div></section></div>
    <section className="panelRegister"><div className="sectiontitle"><div><h2>Registro pratiche</h2><p>Le ultime 50 comunicazioni generate dal pannello.</p></div><div className="toolbar"><label className="searchbox"><Search/><input placeholder="Cerca cliente…" value={recordSearch} onChange={e=>setRecordSearch(e.target.value)}/></label><select value={recordStatus} onChange={e=>setRecordStatus(e.target.value)}><option value="">Tutti gli stati</option><option value="ATTESA">In attesa</option><option value="GESTITA">Gestita</option></select></div></div><div className="tablewrap"><table><thead><tr><th>Cliente</th><th>Pratica</th><th>Invio</th><th>Data risposta</th><th>Stato</th><th></th></tr></thead><tbody>{records.map(item=><tr key={item.id}><td><b>{item.customer_name}</b></td><td>{item.template_title}</td><td>{new Date(item.sent_at).toLocaleString("it-IT")}</td><td><input type="date" value={item.response_date||""} onChange={e=>updateResponse(item,e.target.value)}/></td><td><span className={"panelStatus "+item.status.toLowerCase()}>{item.status==="GESTITA"?"Gestita":"Attesa"}</span></td><td><button className="icon danger" onClick={()=>removeRecord(item)}><Trash2/></button></td></tr>)}</tbody></table>{!records.length&&<Empty icon={<FileClock/>} text="Nessuna pratica registrata"/>}</div></section>
  </main>
}

const TERMINAL_BANDS=["START","SMERALDO","RUBINO","ZAFFIRO"];
const TERMINAL_TYPES=["SMARTPHONE","TABLET","ROUTER","ACCESSORIO"];
const EMPTY_TERMINAL={brand:"",model:"",memory:"",gsi_code:"",product_type:"SMARTPHONE",customer_band:"START",list_price:0,upfront:0,monthly_installment:0,final_installment:0};

function TerminalInventory(){
  const [channel,setChannel]=useState<"GA"|"CB">("GA");
  const [data,setData]=useState<any>({items:[],kpi:{models:0,pieces:0},metadata:null});
  const [search,setSearch]=useState("");
  const [file,setFile]=useState<File|null>(null),[sheets,setSheets]=useState<string[]>([]),[sheet,setSheet]=useState("");
  const [busy,setBusy]=useState(false),[toast,setToast]=useState<{kind:"ok"|"error";text:string}|null>(null);
  async function load(){
    const params=new URLSearchParams({channel});if(search)params.set("search",search);
    const response=await fetch(API+"/terminal-inventory?"+params);
    if(response.ok)setData(await response.json());
  }
  useEffect(()=>{const timer=setTimeout(load,150);return()=>clearTimeout(timer)},[channel,search]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(timer)},[toast]);
  function errorText(detail:any){
    if(typeof detail==="string")return detail;
    if(detail?.missing_columns?.length)return `${detail.message}. Mancano: ${detail.missing_columns.join(", ")}. Colonne rilevate: ${(detail.detected_columns||[]).join(", ")||"nessuna"}.`;
    return detail?.message||"Operazione non riuscita";
  }
  async function inspectExcel(selected:File|null){
    if(!selected)return;setBusy(true);setToast(null);setFile(selected);
    try{
      const body=new FormData();body.append("file",selected);
      const response=await fetch(API+"/terminal-inventory/sheets",{method:"POST",body});const result=await response.json();
      if(!response.ok)throw new Error(errorText(result.detail));
      setSheets(result.sheets||[]);setSheet(result.sheets?.[0]||"");
    }catch(error:any){setFile(null);setToast({kind:"error",text:error.message||"File non leggibile"})}
    finally{setBusy(false)}
  }
  async function importExcel(){
    if(!file||!sheet)return;setBusy(true);setToast(null);
    try{
      const body=new FormData();body.append("file",file);body.append("sheet_name",sheet);body.append("channel",channel);
      const response=await fetch(API+"/terminal-inventory/import",{method:"POST",body});const result=await response.json();
      if(!response.ok)throw new Error(errorText(result.detail));
      setToast({kind:"ok",text:`Giacenza ${channel} aggiornata: ${result.imported} modelli importati${result.skipped.length?`, ${result.skipped.length} righe ignorate`:""}.`});
      setSheets([]);setFile(null);await load();
    }catch(error:any){setToast({kind:"error",text:error.message||"Importazione non riuscita"})}
    finally{setBusy(false)}
  }
  return <main className="page">
    <div className="title"><div><small>MAGAZZINO TERMINALI</small><h1>Giacenze GA e CB</h1><p>Disponibilità fisica separata per nuove attivazioni e Customer Base.</p></div><label className={"secondary uploadbutton "+(busy?"disabled":"")}><UploadCloud/>{busy?"Elaborazione…":`Importa Excel ${channel}`}<input disabled={busy} type="file" accept=".xlsx,.xls" onChange={e=>inspectExcel(e.target.files?.[0]||null)}/></label></div>
    <div className="segmenttabs"><button className={channel==="GA"?"active":""} onClick={()=>{setChannel("GA");setSheets([]);setFile(null)}}>GA · Acquisition</button><button className={channel==="CB"?"active":""} onClick={()=>{setChannel("CB");setSheets([]);setFile(null)}}>CB · Customer Base</button></div>
    {busy&&<div className="inventoryLoading"><LoaderCircle/>Elaborazione del file in corso…</div>}
    {sheets.length>0&&<div className="overlay inventorySheetOverlay"><section className="sheetModal"><button className="close" onClick={()=>{setSheets([]);setFile(null)}}>×</button><small>SELEZIONA FOGLIO</small><h2>Quale foglio vuoi importare?</h2><p>{file?.name} · il caricamento sostituirà soltanto la giacenza {channel}.</p><label>Foglio di lavoro<select value={sheet} onChange={e=>setSheet(e.target.value)}>{sheets.map(value=><option key={value}>{value}</option>)}</select></label><button className="new" disabled={busy||!sheet} onClick={importExcel}>{busy?<><LoaderCircle/>Importazione…</>:<>Conferma importazione {channel}</>}</button></section></div>}
    {toast&&<div className={"inventoryToast "+toast.kind}>{toast.kind==="ok"?<CheckCircle2/>:<XCircle/>}<span>{toast.text}</span><button onClick={()=>setToast(null)}>×</button></div>}
    <section className="inventoryKpis"><article><span>Modelli totali</span><strong>{data.kpi.models||0}</strong><Smartphone/></article><article><span>Pezzi totali</span><strong>{data.kpi.pieces||0}</strong><Boxes/></article><article><span>Ultimo aggiornamento</span><strong>{data.metadata?new Date(data.metadata.updated_at).toLocaleDateString("it-IT"):"—"}</strong><small>{data.metadata?new Date(data.metadata.updated_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):"Nessuna importazione"}</small><History/></article></section>
    <div className="toolbar inventoryToolbar"><label className="searchbox"><Search/><input placeholder="Cerca modello, Codice GSI o note…" value={search} onChange={e=>setSearch(e.target.value)}/></label>{data.metadata&&<span className="catalogMeta">{data.metadata.file_name} · foglio {data.metadata.sheet_name}</span>}</div>
    <div className="tablewrap inventoryTerminalTable"><table><thead><tr><th>Modello</th><th>Codice GSI</th><th>Pezzi</th><th>Note</th><th>Skip disponibilità</th><th>Stato</th></tr></thead><tbody>{data.items.map((item:any)=><tr key={item.id}><td><b>{item.model}</b></td><td><code>{item.gsi_code}</code></td><td><span className={"pieceBadge "+(item.pieces>0?"positive":"empty")}>{item.pieces}</span></td><td><em>{item.notes||"—"}</em></td><td>{item.skip_availability?<span className="skipIcon yes" title="Attivo"><CheckCircle2/></span>:<span className="skipIcon no" title="Disattivo"><XCircle/></span>}</td><td><span className={"availability "+(item.available?"available":"unavailable")}>{item.availability_label}</span></td></tr>)}</tbody></table>{!data.items.length&&<Empty icon={<Smartphone/>} text={`Nessuna giacenza ${channel} importata`}/>}</div>
  </main>
}

function TerminalCatalog(){
  const [channel,setChannel]=useState<"GA"|"CB">("GA"),[data,setData]=useState<any>({items:[],metadata:null});
  const [search,setSearch]=useState(""),[productType,setProductType]=useState(""),[brand,setBrand]=useState(""),[band,setBand]=useState("START");
  const [file,setFile]=useState<File|null>(null),[sheets,setSheets]=useState<string[]>([]),[sheet,setSheet]=useState("");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [form,setForm]=useState<any>(EMPTY_TERMINAL),[editing,setEditing]=useState<any>(null),[open,setOpen]=useState(false);
  async function load(){
    const params=new URLSearchParams({channel});if(search)params.set("search",search);if(productType)params.set("product_type",productType);
    const response=await fetch(API+"/terminals?"+params);setData(await response.json());
  }
  useEffect(()=>{const timer=setTimeout(load,150);const refresh=setInterval(load,30000);return()=>{clearTimeout(timer);clearInterval(refresh)}},[channel,search,productType]);
  const counts=useMemo(()=>Object.fromEntries(TERMINAL_BANDS.map(value=>[value,data.items.filter((item:any)=>item.customer_band===value).length])),[data.items]);
  const brands=useMemo(()=>Array.from(new Set(data.items.map((item:any)=>item.brand).filter(Boolean))).sort() as string[],[data.items]);
  const visible=data.items.filter((item:any)=>(channel!=="CB"||item.customer_band===band)&&(!brand||item.brand===brand));
  async function inspectExcel(selected:File|null){
    if(!selected)return;setBusy(true);setMessage("");setFile(selected);
    const body=new FormData();body.append("file",selected);
    const response=await fetch(API+"/terminals-ga/sheets",{method:"POST",body});const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"File non leggibile");return}
    setSheets(result.sheets);setSheet(result.sheets[0]||"");
  }
  async function importExcel(){
    if(!file||!sheet)return;setBusy(true);const body=new FormData();body.append("file",file);body.append("sheet_name",sheet);
    const response=await fetch(API+"/terminals-ga/import",{method:"POST",body});const result=await response.json();setBusy(false);
    if(!response.ok){setMessage(result.detail||"Importazione non riuscita");return}
    setMessage(`Importati ${result.imported} terminali${result.skipped.length?` · ${result.skipped.length} righe scartate`:""}.`);setSheets([]);setFile(null);load();
  }
  function startNew(){setEditing(null);setForm({...EMPTY_TERMINAL,customer_band:band});setOpen(true);setMessage("")}
  function startEdit(item:any){setEditing(item);setForm({...item});setOpen(true);setMessage("")}
  async function save(event:React.FormEvent){
    event.preventDefault();const response=await fetch(editing?API+"/terminals-cb/"+editing.id:API+"/terminals-cb",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Salvataggio non riuscito");return}setOpen(false);load();
  }
  async function remove(item:any){if(!confirm(`Eliminare ${item.brand} ${item.model}?`))return;await fetch(API+"/terminals-cb/"+item.id,{method:"DELETE"});load()}
  async function clearBand(){if(!confirm(`Eliminare tutti i terminali della fascia ${band}?`))return;await fetch(API+"/terminals-cb?customer_band="+band,{method:"DELETE"});load()}
  async function resetDefaults(){if(!confirm("Ripristinare la matrice predefinita? Tutto il listino CB attuale sarà sostituito."))return;await fetch(API+"/terminals-cb/reset",{method:"POST"});load()}
  const money=(value:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(value||0);
  return <main className="page">
    <div className="title"><div><small>CATALOGO COMMERCIALE</small><h1>Terminali GA e CB</h1><p>Condizioni terminali per nuove attivazioni e clienti in base alla fascia commerciale.</p></div><div className="titleactions">{channel==="GA"?<><a className="secondary" href={API+"/terminals-ga.pdf?search="+encodeURIComponent(search)} target="_blank"><FileText/>Esporta PDF</a><label className="secondary uploadbutton"><UploadCloud/>{busy?"Lettura…":"Importa Excel"}<input type="file" accept=".xlsx,.xlsm,.xls" onChange={e=>inspectExcel(e.target.files?.[0]||null)}/></label></>:<><button className="secondary" onClick={resetDefaults}><History/>Ripristina matrice</button><button className="new" onClick={startNew}><Plus/>Nuovo terminale</button></>}</div></div>
    <div className="segmenttabs"><button className={channel==="GA"?"active":""} onClick={()=>setChannel("GA")}>GA · Nuove attivazioni</button><button className={channel==="CB"?"active":""} onClick={()=>setChannel("CB")}>CB · Clienti</button></div>
    {sheets.length>0&&<section className="importSheet"><div><b>{file?.name}</b><span>Scegli il foglio che contiene il listino terminali.</span></div><select value={sheet} onChange={e=>setSheet(e.target.value)}>{sheets.map(value=><option key={value}>{value}</option>)}</select><button className="new" disabled={busy} onClick={importExcel}>{busy?"Importazione…":"Conferma importazione"}</button><button className="icon" onClick={()=>setSheets([])}>×</button></section>}
    {message&&<div className="notice ok"><CheckCircle2/>{message}</div>}
    {channel==="CB"&&<div className="bandtabs">{TERMINAL_BANDS.map(value=><button className={band===value?"active":""} onClick={()=>setBand(value)} key={value}><span>{value}</span><b>{counts[value]||0}</b></button>)}</div>}
    <div className="toolbar"><label className="searchbox"><Search/><input placeholder="Cerca modello, marca, GSI o offerta…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={productType} onChange={e=>setProductType(e.target.value)}><option value="">Tutte le tipologie</option>{TERMINAL_TYPES.map(value=><option key={value}>{value}</option>)}</select>{channel==="CB"&&<select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Tutte le marche</option>{brands.map(value=><option key={value}>{value}</option>)}</select>}{channel==="GA"&&<span className="catalogMeta">{data.metadata?`${data.metadata.row_count} righe · ${new Date(data.metadata.updated_at).toLocaleString("it-IT")}`:"Nessun listino importato"}</span>}{channel==="CB"&&<button className="dangerbtn clearBand" onClick={clearBand}><Trash2/>Svuota {band}</button>}</div>
    <div className="tablewrap terminalTable"><table><thead><tr><th>Terminale</th><th>GSI</th>{channel==="GA"?<><th>Offerta / Promozione</th><th>Listino</th><th>Anticipo</th><th>Rata mensile</th><th>Rata finale</th><th>Kasko</th><th>Sconto</th></>:<><th>Tipologia</th><th>Fascia</th><th>Prezzo</th><th>Anticipo</th><th>Rata</th><th>Finale</th><th></th></>}</tr></thead><tbody>{visible.map((item:any)=><tr key={item.id}><td><b>{item.brand&&`${item.brand} `}{item.model}</b><small>{item.memory}</small></td><td><code>{item.gsi_code}</code></td>{channel==="GA"?<><td><b>{item.offer_name||"—"}</b><small>{item.promotion_name||item.promotion_id}</small></td><td>{money(item.list_price)}</td><td>{money(item.upfront)}</td><td><b>{money(item.monthly_installment)}</b><small>standard {money(item.standard_installment)}</small></td><td>{money(item.final_installment)}</td><td>{money(item.kasko)}<small>Premium {money(item.kasko_premium)}</small></td><td>{item.discount_percent}%</td></>:<><td>{item.product_type}</td><td><span className="bandBadge">{item.customer_band}</span></td><td>{money(item.list_price)}</td><td>{money(item.upfront)}</td><td><b>{money(item.monthly_installment)}</b></td><td>{money(item.final_installment)}</td><td><button className="icon" onClick={()=>startEdit(item)}><Pencil/></button><button className="icon danger" onClick={()=>remove(item)}><Trash2/></button></td></>}</tr>)}</tbody></table>{!visible.length&&<Empty icon={<Smartphone/>} text={channel==="GA"?"Importa il listino Excel GA":"Nessun terminale per questa fascia"}/>}</div>
    {open&&<div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}><form className="drawer terminalForm" onSubmit={save}><button type="button" className="close" onClick={()=>setOpen(false)}>×</button><small>LISTINO CLIENTI CB</small><h2>{editing?"Modifica terminale":"Nuovo terminale"}</h2><div className="fieldgrid"><label>Marca<input required value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label><label>Modello<input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></label><label>Memoria<input value={form.memory||""} onChange={e=>setForm({...form,memory:e.target.value})}/></label><label>Codice GSI<input required value={form.gsi_code} onChange={e=>setForm({...form,gsi_code:e.target.value})}/></label><label>Tipologia<select value={form.product_type} onChange={e=>setForm({...form,product_type:e.target.value})}>{TERMINAL_TYPES.map(value=><option key={value}>{value}</option>)}</select></label><label>Fascia cliente<select value={form.customer_band} onChange={e=>setForm({...form,customer_band:e.target.value})}>{TERMINAL_BANDS.map(value=><option key={value}>{value}</option>)}</select></label></div><h3>Condizioni economiche</h3><div className="fieldgrid">{[["list_price","Prezzo di riferimento"],["upfront","Anticipo"],["monthly_installment","Rata mensile"],["final_installment","Rata finale"]].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step=".01" value={form[key]} onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/></label>)}</div>{message&&<div className="notice error"><XCircle/>{message}</div>}<div className="formactions"><button className="new">Salva terminale</button></div></form></div>}
  </main>
}

const PLAN_TYPES=["VOCE","DATI","FISSO","DATI_M2M"];
const EMPTY_TARIFF={name:"",plan_type:"VOCE",ga_list_code:"",cb_list_code:"",valid_from:"",valid_to:"",subscribable:true,monthly_fee:0,secure_web:0,activation_cost:0,sim_cost:0,national_gb:"",national_minutes:"",national_sms:"",eu_limited:false,eu_gb:"",eu_minutes:"",eu_sms:"",eu_international_calls:"",roaming_countries:"",international_included:false,international_countries:"",custom_discounts:[] as any[]};

function TariffPlans(){
  const [items,setItems]=useState<any[]>([]),[search,setSearch]=useState(""),[type,setType]=useState(""),[active,setActive]=useState("true");
  const [form,setForm]=useState<any>(EMPTY_TARIFF),[editing,setEditing]=useState<any>(null),[open,setOpen]=useState(false),[message,setMessage]=useState("");
  const [scenarios,setScenarios]=useState<Record<string,string>>({});
  async function load(){const p=new URLSearchParams();if(search)p.set("search",search);if(type)p.set("plan_type",type);if(active)p.set("subscribable",active);const r=await fetch(API+"/tariff-plans?"+p);setItems(await r.json())}
  useEffect(()=>{const timer=setTimeout(load,150);return()=>clearTimeout(timer)},[search,type,active]);
  function create(){setEditing(null);setForm({...EMPTY_TARIFF,custom_discounts:[]});setMessage("");setOpen(true)}
  function edit(item:any){setEditing(item);setForm({...item,custom_discounts:(item.custom_discounts||[]).map((x:any)=>({...x}))});setMessage("");setOpen(true)}
  function addDiscount(){setForm({...form,custom_discounts:[...form.custom_discounts,{cod:"",desc:"",prz:0,sw:0,ga:true,cb:false}]})}
  function changeDiscount(index:number,key:string,value:any){setForm({...form,custom_discounts:form.custom_discounts.map((row:any,i:number)=>i===index?{...row,[key]:value}:row)})}
  async function save(e:React.FormEvent){e.preventDefault();setMessage("");const r=await fetch(editing?API+"/tariff-plans/"+editing.id:API+"/tariff-plans",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,valid_from:form.valid_from||null,valid_to:form.valid_to||null})});const result=await r.json();if(!r.ok){setMessage(result.detail||"Salvataggio non riuscito");return}setOpen(false);load()}
  async function remove(item:any){if(!confirm(`Eliminare definitivamente il piano “${item.name}”?`))return;const r=await fetch(API+"/tariff-plans/"+item.id,{method:"DELETE"});if(!r.ok)alert("Eliminazione non riuscita");else load()}
  async function uploadPdf(item:any,file:File|null){if(!file)return;const fd=new FormData();fd.append("file",file);const r=await fetch(API+"/tariff-plans/"+item.id+"/pdf",{method:"POST",body:fd});if(!r.ok)alert("PDF non caricato");else load()}
  async function share(item:any,channel:"wa"|"mail"){const code=scenarios[item.id]||"";const r=await fetch(API+"/tariff-plans/"+item.id+"/share"+(code?"?discount_code="+encodeURIComponent(code):""));const d=await r.json();const url=channel==="wa"?"https://wa.me/?text="+encodeURIComponent(d.text):"mailto:?subject="+encodeURIComponent(d.subject)+"&body="+encodeURIComponent(d.text);window.open(url,"_blank")}
  async function importCsv(file:File|null){if(!file)return;const fd=new FormData();fd.append("file",file);const r=await fetch(API+"/tariff-plans-import",{method:"POST",body:fd});const d=await r.json();alert(`Importati: ${d.imported} · Già presenti: ${d.skipped} · Errori: ${d.errors.length}`);load()}
  return <main className="page"><div className="title"><div><small>CATALOGO OFFERTE B2B</small><h1>Piani tariffari</h1><p>Listini Mobile, Dati, Fisso e M2M con scenari promozionali condivisibili.</p></div><div className="titleactions"><a className="secondary" href={API+"/tariff-plans-export.csv"}><Download/>Esporta CSV</a><label className="secondary uploadbutton"><UploadCloud/>Importa<input type="file" accept=".csv,.xlsx,.xlsm" onChange={e=>importCsv(e.target.files?.[0]||null)}/></label><button className="new" onClick={create}><Plus/>Nuovo piano</button></div></div>
    <div className="toolbar"><label className="searchbox"><Search/><input placeholder="Nome piano o codice listino…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={type} onChange={e=>setType(e.target.value)}><option value="">Tutte le tipologie</option>{PLAN_TYPES.map(x=><option key={x}>{x}</option>)}</select><select value={active} onChange={e=>setActive(e.target.value)}><option value="">Tutti</option><option value="true">Sottoscrivibili</option><option value="false">Fuori listino</option></select></div>
    <div className="tariffGrid">{items.length?items.map(item=><article className={"tariffCard "+(!item.subscribable?"archived":"")} key={item.id}><div className="tariffHead"><div><span className={"planType "+item.plan_type.toLowerCase()}>{item.plan_type.replace("_"," ")}</span><small>{item.plan_code}</small></div><span className={item.subscribable?"sellable":"notSellable"}>{item.subscribable?"Vendibile":"Fuori listino"}</span></div><h2>{item.name}</h2><div className="tariffPrice"><strong>{formatCurrency(item.total_monthly)}</strong><span>al mese<br/>Secure Web incluso</span></div><div className="bundle"><span><b>{item.national_gb||"—"}</b>Giga</span><span><b>{item.national_minutes||"—"}</b>Minuti</span><span><b>{item.national_sms||"—"}</b>SMS</span></div><div className="listcodes"><span>GA <b>{item.ga_list_code||"—"}</b></span><span>CB <b>{item.cb_list_code||"—"}</b></span></div>{item.custom_discounts?.length>0&&<select value={scenarios[item.id]||""} onChange={e=>setScenarios({...scenarios,[item.id]:e.target.value})}><option value="">Prezzo base</option>{item.custom_discounts.map((d:any)=><option value={d.cod} key={d.cod}>{d.desc||d.cod} · {formatCurrency(Number(d.prz)+Number(d.sw))}</option>)}</select>}<div className="tariffActions"><button onClick={()=>share(item,"wa")}><MessageCircle/>WhatsApp</button><button onClick={()=>share(item,"mail")}><Mail/>Email</button><button onClick={()=>edit(item)}><Pencil/></button><button className="dangerbtn" onClick={()=>remove(item)}><Trash2/></button></div><div className="attachment">{item.technical_pdf_url?<a href={assetUrl(item.technical_pdf_url)} target="_blank">Apri scheda tecnica PDF</a>:<label>Allega scheda tecnica<input type="file" accept=".pdf" onChange={e=>uploadPdf(item,e.target.files?.[0]||null)}/></label>}</div></article>):<Empty icon={<Tag/>} text="Nessun piano tariffario"/>}</div>
    {open&&<div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}><form className="drawer tariffForm" onSubmit={save}><button type="button" className="close" onClick={()=>setOpen(false)}>×</button><small>ANAGRAFICA OFFERTA</small><h2>{editing?"Modifica piano":"Nuovo piano tariffario"}</h2><div className="fieldgrid"><label>Nome piano<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Tipologia<select value={form.plan_type} onChange={e=>setForm({...form,plan_type:e.target.value})}>{PLAN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label>Listino GA<input value={form.ga_list_code||""} onChange={e=>setForm({...form,ga_list_code:e.target.value})}/></label><label>Listino CB<input value={form.cb_list_code||""} onChange={e=>setForm({...form,cb_list_code:e.target.value})}/></label><label>Valido dal<input type="date" value={form.valid_from||""} onChange={e=>setForm({...form,valid_from:e.target.value})}/></label><label>Valido fino al<input type="date" value={form.valid_to||""} onChange={e=>setForm({...form,valid_to:e.target.value})}/></label></div><h3>Condizioni economiche</h3><div className="fieldgrid four">{[["monthly_fee","Canone mensile"],["secure_web","Secure Web"],["activation_cost","Costo attivazione"],["sim_cost","Costo SIM"]].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step=".01" value={form[key]} onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/></label>)}</div><h3>Bundle nazionale</h3><div className="fieldgrid three">{[["national_gb","Giga"],["national_minutes","Minuti"],["national_sms","SMS"]].map(([key,label])=><label key={key}>{label}<input value={form[key]||""} placeholder="Illimitati" onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><h3>Roaming e internazionale</h3><div className="fieldgrid three">{[["eu_gb","Giga UE"],["eu_minutes","Minuti UE"],["eu_sms","SMS UE"],["eu_international_calls","Chiamate UE verso estero"],["roaming_countries","Paesi roaming inclusi"],["international_countries","Paesi internazionali"]].map(([key,label])=><label key={key}>{label}<input value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><div className="checks"><label><input type="checkbox" checked={form.subscribable} onChange={e=>setForm({...form,subscribable:e.target.checked})}/>Sottoscrivibile</label><label><input type="checkbox" checked={form.eu_limited} onChange={e=>setForm({...form,eu_limited:e.target.checked})}/>Limitazioni UE</label><label><input type="checkbox" checked={form.international_included} onChange={e=>setForm({...form,international_included:e.target.checked})}/>Internazionale incluso</label></div><div className="discountTitle"><h3>Sconti custom</h3><button type="button" className="secondary" onClick={addDiscount}><Plus/>Aggiungi sconto</button></div><div className="discounts">{form.custom_discounts.map((d:any,i:number)=><div className="discountRow" key={i}><input placeholder="Codice" value={d.cod} onChange={e=>changeDiscount(i,"cod",e.target.value)}/><input placeholder="Descrizione" value={d.desc} onChange={e=>changeDiscount(i,"desc",e.target.value)}/><input type="number" step=".01" placeholder="Canone" value={d.prz} onChange={e=>changeDiscount(i,"prz",Number(e.target.value))}/><input type="number" step=".01" placeholder="Secure Web" value={d.sw} onChange={e=>changeDiscount(i,"sw",Number(e.target.value))}/><label><input type="checkbox" checked={d.ga} onChange={e=>changeDiscount(i,"ga",e.target.checked)}/>GA</label><label><input type="checkbox" checked={d.cb} onChange={e=>changeDiscount(i,"cb",e.target.checked)}/>CB</label><button type="button" className="dangerbtn" onClick={()=>setForm({...form,custom_discounts:form.custom_discounts.filter((_:any,x:number)=>x!==i)})}><Trash2/></button></div>)}</div>{message&&<div className="notice error"><XCircle/>{message}</div>}<div className="formactions"><button className="new">Salva piano</button></div></form></div>}
  </main>
}

const DDT_STATUSES=[
  ["IN_PREPARAZIONE","In preparazione"],
  ["SPEDITO","Spedito"],
  ["CONSEGNATO","Consegnato"],
  ["ANNULLATO","Annullato"],
] as const;
const EMPTY_DDT={document_date:new Date().toISOString().slice(0,10),customer_id:"",recipient_name:"",recipient_address:"",goods_description:"",carrier:"",tracking_number:"",status:"IN_PREPARAZIONE",sim_ids:[] as string[]};

function DdtShipments(){
  const [data,setData]=useState<any>({items:[],counts:{}});
  const [customers,setCustomers]=useState<any[]>([]);
  const [customerSims,setCustomerSims]=useState<any[]>([]);
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("");
  const [form,setForm]=useState<any>(EMPTY_DDT);
  const [editing,setEditing]=useState<any>(null);
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  async function load(){
    const params=new URLSearchParams();if(search)params.set("search",search);if(status)params.set("status",status);
    const response=await fetch(API+"/ddt?"+params);setData(await response.json());
  }
  useEffect(()=>{const timer=setTimeout(load,180);return()=>clearTimeout(timer)},[search,status]);
  useEffect(()=>{fetch(API+"/customers?limit=500").then(r=>r.json()).then(r=>setCustomers(r.items||r||[]))},[]);
  async function loadCustomerSims(id:string){
    if(!id){setCustomerSims([]);return}
    const response=await fetch(API+"/sim-inventory?customer_id="+id+"&limit=2000");setCustomerSims(await response.json());
  }
  function chooseCustomer(id:string){
    const customer=customers.find(item=>item.id===id);
    setForm({...form,customer_id:id,recipient_name:customer?.business_name||"",recipient_address:customer?.address||"",sim_ids:[]});
    loadCustomerSims(id);
  }
  function startNew(){setEditing(null);setCustomerSims([]);setForm({...EMPTY_DDT,document_date:new Date().toISOString().slice(0,10),sim_ids:[]});setMessage("");setOpen(true)}
  function startEdit(item:any){setEditing(item);setForm({...item,sim_ids:item.sim_ids||[]});setMessage("");setOpen(true);loadCustomerSims(item.customer_id)}
  function toggleSim(id:string){setForm({...form,sim_ids:(form.sim_ids||[]).includes(id)?form.sim_ids.filter((value:string)=>value!==id):[...(form.sim_ids||[]),id]})}
  async function save(event:React.FormEvent){
    event.preventDefault();setMessage("");
    const url=editing?API+"/ddt/"+editing.id:API+"/ddt";
    const response=await fetch(url,{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,customer_id:form.customer_id||null})});
    const result=await response.json();if(!response.ok){setMessage(result.detail||"Salvataggio non riuscito");return}
    setOpen(false);await load();
  }
  async function changeStatus(item:any,next:string){
    let tracking=item.tracking_number||"";
    if(next==="SPEDITO"&&!tracking){tracking=prompt("Inserisci il codice tracking")||"";if(!tracking)return}
    if(next==="ANNULLATO"&&!confirm("Confermi l'annullamento del DDT? Rimarrà nello storico."))return;
    const response=await fetch(API+"/ddt/"+item.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next,tracking_number:tracking})});
    if(!response.ok){const result=await response.json();alert(result.detail||"Aggiornamento non riuscito")}else load();
  }
  async function remove(item:any){
    if(!confirm("Eliminare definitivamente questo DDT in preparazione?"))return;
    const response=await fetch(API+"/ddt/"+item.id,{method:"DELETE"});
    if(!response.ok){const result=await response.json();alert(result.detail||"Eliminazione non riuscita")}else load();
  }
  function printPdf(item:any){window.open(API+"/ddt/"+item.id+"/pdf","_blank","noopener,noreferrer")}
  return <main className="page">
    <div className="title"><div><small>LOGISTICA E DOCUMENTI</small><h1>Spedizioni e DDT</h1><p>Crea, traccia e stampa i documenti di trasporto con numerazione automatica.</p></div><button className="new" onClick={startNew}><Plus/>Nuovo DDT</button></div>
    <div className="cards ddtKpis">{DDT_STATUSES.map(([key,label])=><Card key={key} label={label} value={data.counts?.[key]||0}/>)}</div>
    <div className="toolbar"><label className="searchbox"><Search/><input placeholder="Numero, cliente, corriere, tracking o contenuto…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tutti gli stati</option>{DDT_STATUSES.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></div>
    <div className="ddtList">{data.items?.length?data.items.map((item:any)=><article className="ddtCard" key={item.id}>
      <div className="ddtHead"><div><small>{formatDate(item.document_date)}</small><h2>{item.ddt_number}</h2></div><span className={"ddtBadge "+item.status.toLowerCase()}>{DDT_STATUSES.find(([key])=>key===item.status)?.[1]||item.status}</span></div>
      <div className="ddtBody"><div><b>{item.recipient_name}</b><span>{item.recipient_address}</span></div><div><b>{item.carrier||"Vettore da definire"}</b><span>{item.tracking_number||"Tracking non presente"}</span></div><p>{item.goods_description}{item.sims?.length?`\n${item.sims.length} SIM selezionate per la spedizione`:""}</p></div>
      <div className="ddtActions"><button className="secondary" onClick={()=>printPdf(item)}><Printer/>Stampa PDF</button>{item.status!=="ANNULLATO"&&<select value={item.status} onChange={e=>changeStatus(item,e.target.value)}>{DDT_STATUSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}{item.status!=="ANNULLATO"&&<button className="icon" title="Modifica" onClick={()=>startEdit(item)}><Pencil/></button>}{item.status==="IN_PREPARAZIONE"&&<button className="icon danger" title="Elimina" onClick={()=>remove(item)}><Trash2/></button>}</div>
    </article>):<Empty icon={<Truck/>} text="Nessun documento di trasporto"/>}</div>
    {open&&<div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}><form className="drawer ddtForm" onSubmit={save}><button type="button" className="close" onClick={()=>setOpen(false)}>×</button><small>{editing?"MODIFICA DOCUMENTO":"NUOVO DOCUMENTO"}</small><h2>{editing?editing.ddt_number:"Crea DDT"}</h2>
      <div className="fieldgrid"><label>Data documento<input type="date" value={form.document_date} onChange={e=>setForm({...form,document_date:e.target.value})}/></label><label>Cliente CRM<select value={form.customer_id||""} onChange={e=>chooseCustomer(e.target.value)}><option value="">Destinatario esterno</option>{customers.map(item=><option value={item.id} key={item.id}>{item.business_name}</option>)}</select></label><label>Destinatario<input required value={form.recipient_name} onChange={e=>setForm({...form,recipient_name:e.target.value})}/></label><label>Indirizzo di consegna<input required value={form.recipient_address} onChange={e=>setForm({...form,recipient_address:e.target.value})}/></label><label>Vettore / Corriere<input placeholder="DHL, BRT, GLS, consegna diretta…" value={form.carrier||""} onChange={e=>setForm({...form,carrier:e.target.value})}/></label><label>Codice tracking<input value={form.tracking_number||""} onChange={e=>setForm({...form,tracking_number:e.target.value})}/></label></div>
      {form.customer_id&&<section className="ddtSimPicker"><div><h3>SIM associate al cliente</h3><span>{(form.sim_ids||[]).length} selezionate su {customerSims.length}</span></div>{customerSims.length?<div className="ddtSimList">{customerSims.map(sim=><label className={(form.sim_ids||[]).includes(sim.id)?"selected":""} key={sim.id}><input type="checkbox" checked={(form.sim_ids||[]).includes(sim.id)} onChange={()=>toggleSim(sim.id)}/><div><b>{sim.product_name}</b><code>{sim.iccid}</code></div><div><span>{sim.msisdn||"Numero non assegnato"}</span><small>{sim.status.replaceAll("_"," ")}</small></div></label>)}</div>:<p className="muted">Non risultano SIM di magazzino associate a questo cliente.</p>}</section>}
      <label>Descrizione aggiuntiva dei beni<textarea required={!(form.sim_ids||[]).length} rows={7} placeholder={(form.sim_ids||[]).length?"Le SIM selezionate saranno inserite automaticamente nel DDT. Aggiungi qui eventuali note o altri beni.":"N. 2 SIM WindTre Business\nICCID: 8939…"} value={form.goods_description} onChange={e=>setForm({...form,goods_description:e.target.value})}/></label>
      <label>Stato<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{DDT_STATUSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      {message&&<div className="notice error"><XCircle/>{message}</div>}<div className="formactions"><button className="new">{editing?"Salva modifiche":"Genera DDT"}</button></div>
    </form></div>}
  </main>
}

const STORE_FIELDS=[
  ["store_name","Nome punto vendita","Cornet Solutions"],
  ["legal_name","Ragione sociale","Ragione sociale completa"],
  ["tax_id","Partita IVA",""],
  ["fiscal_code","Codice fiscale",""],
  ["dealer_code","Codice rivenditore",""],
  ["address","Indirizzo","Via e numero civico"],
  ["city","Comune",""],
  ["postal_code","CAP",""],
  ["province","Provincia","MI"],
  ["phone","Telefono",""],
  ["whatsapp","WhatsApp",""],
  ["email","Email",""],
  ["website","Sito internet","https://"],
] as const;

function StoreConfiguration({value,saved,operatorBrands,setOperatorBrands}:{value:any;saved:(value:any)=>void;operatorBrands:Record<string,OperatorBrand>;setOperatorBrands:(value:Record<string,OperatorBrand>)=>void}){
  const [form,setForm]=useState<any>(value||{store_name:"Cornet Solutions"});
  const [message,setMessage]=useState<{kind:"ok"|"error";text:string}|null>(null);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(value)setForm(value)},[value]);
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage(null);
    try{
      const response=await fetch(API+"/settings/store",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(STORE_FIELDS.map(([key])=>[key,form[key]||""])))});
      const result=await response.json();if(!response.ok)throw new Error(result.detail||"Salvataggio non riuscito");
      setForm(result);saved(result);setMessage({kind:"ok",text:"Configurazione del punto vendita salvata."});
    }catch(error:any){setMessage({kind:"error",text:error.message})}finally{setBusy(false)}
  }
  async function uploadLogo(file:File|null,partner=false){
    if(!file)return;setBusy(true);setMessage(null);
    const data=new FormData();data.append("file",file);
    try{
      const response=await fetch(API+"/settings/store/"+(partner?"partner-logo":"logo"),{method:"POST",body:data});
      const result=await response.json();if(!response.ok)throw new Error(result.detail||"Logo non caricato");
      setForm(result);saved(result);setMessage({kind:"ok",text:partner?"Logo partner aggiornato correttamente.":"Logo aggiornato correttamente."});
    }catch(error:any){setMessage({kind:"error",text:error.message})}finally{setBusy(false)}
  }
  async function uploadOperatorLogo(operator:string,file:File|null){
    if(!file)return;
    setBusy(true);setMessage(null);
    const data=new FormData();data.append("file",file);
    try{
      const response=await fetch(API+`/settings/operator-brands/${encodeURIComponent(operator)}/logo`,{method:"POST",body:data});
      const result=await response.json();if(!response.ok)throw new Error(result.detail||"Logo operatore non caricato");
      const next={...operatorBrands,[result.operator]:result};
      setOperatorBrands(next);
      setMessage({kind:"ok",text:`Logo ${result.display_name} aggiornato correttamente.`});
    }catch(error:any){setMessage({kind:"error",text:error.message})}finally{setBusy(false)}
  }
  return <main className="page">
    <div className="title"><div><small>IMPOSTAZIONI AZIENDALI</small><h1>Configurazione punto vendita</h1><p>Questi dati saranno utilizzati per documenti, preventivi, DDT e comunicazioni.</p></div></div>
    <div className="settingsgrid">
      <div className="logoStack">
        <article className="logocard"><div className="logopreview">{form.logo_url?<img src={assetUrl(form.logo_url)} alt="Logo punto vendita"/>:<Store/>}</div><h2>Logo del mittente</h2><p>Appare a sinistra nei DDT.</p><label className="secondary uploadbutton">Scegli logo<input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event=>uploadLogo(event.target.files?.[0]||null)}/></label></article>
        <article className="logocard"><div className="logopreview">{form.partner_logo_url?<img src={assetUrl(form.partner_logo_url)} alt="Logo partner"/>:<BriefcaseBusiness/>}</div><h2>Logo partner</h2><p>WindTre o altro brand, a destra nei DDT.</p><label className="secondary uploadbutton">Scegli logo partner<input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event=>uploadLogo(event.target.files?.[0]||null,true)}/></label></article>
      </div>
      <form className="settingsform" onSubmit={submit}>
        <div className="formsection"><h2>Dati del punto vendita</h2><div className="fieldgrid">{STORE_FIELDS.map(([key,label,placeholder])=><label key={key}>{label}<input value={form[key]||""} placeholder={placeholder} onChange={event=>setForm({...form,[key]:event.target.value})} required={key==="store_name"}/></label>)}</div></div>
        <div className="formsection">
          <h2>Loghi operatori per reportistica</h2>
          <p className="helptext">Scegli il logo che vuoi mostrare nelle dashboard e nei report delle attivazioni.</p>
          <div className="operatorBrandGrid">
            {Object.values(operatorBrands).map(brand=><article className="operatorBrandCard" key={brand.operator}>
              <div className="operatorBrandPreview">
                {brand.logo_url?<img src={assetUrl(brand.logo_url)} alt={brand.display_name}/>:<OperatorLogo operator={brand.operator} compact/>}
              </div>
              <div className="operatorBrandMeta">
                <b>{brand.display_name}</b>
                <small>{brand.operator}</small>
              </div>
              <label className="secondary uploadbutton">Scegli logo report<input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={event=>uploadOperatorLogo(brand.operator,event.target.files?.[0]||null)}/></label>
            </article>)}
          </div>
        </div>
        {message&&<div className={"notice "+message.kind}>{message.kind==="ok"?<CheckCircle2/>:<XCircle/>}{message.text}</div>}
        <div className="formactions"><button className="new" disabled={busy}>{busy?"Salvataggio…":"Salva configurazione"}</button></div>
      </form>
    </div>
  </main>
}

function Metric({label,value,tone}:{label:string;value:number;tone:string}){return <div className="metric"><span className={tone}></span><b>{label}</b><strong>{value}</strong></div>}
function Card({label,value}:{label:string;value:any}){return <article className="card"><span>{label}</span><strong>{value}</strong></article>}
function Empty({icon,text}:{icon:React.ReactNode;text:string}){return <div className="empty">{icon}<b>{text}</b><span>Il contenuto sarà aggiornato automaticamente.</span></div>}
function Status({value}:{value:string}){return <span className={"badge "+(value==="ACTIVE"?"active":"missing")}>{value==="ACTIVE"?"Presente":"Da verificare"}</span>}
function monthLabel(value:string){if(!value)return"—";const [y,m]=value.split("-");return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date(Number(y),Number(m)-1,1))}
function changeLabel(value:string){return({NEW_CUSTOMER:"Nuovi clienti",MISSING_CUSTOMER:"Clienti non più presenti",NEW_ASSET:"Nuovi asset",REMOVED_ASSET:"Asset non più presenti",FIELD_CHANGED:"Variazioni servizi",CAMPAIGN_ENTERED:"Ingresso campagne",CAMPAIGN_EXITED:"Uscita campagne",CAMPAIGN_CHANGED:"Variazione campagne"} as any)[value]||value}
function formatCurrency(value:any){let normalized=String(value??"").replace("€","").replace(/\s/g,"");if(normalized.includes(",")&&normalized.includes("."))normalized=normalized.replace(/\./g,"").replace(",",".");else normalized=normalized.replace(",",".");const numeric=typeof value==="number"?value:Number(normalized);return Number.isFinite(numeric)?new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(numeric):"—"}
function formatDate(value:any){if(!value)return"—";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat("it-IT").format(parsed)}
function assetUrl(path:string){return API.replace(/\/api\/v1$/,"")+path}

ReactDOM.createRoot(document.getElementById("root")!).render(<App/>);
