import React, {useEffect, useMemo, useState} from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle, BarChart3, Boxes, BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronRight,
  CircleDollarSign, Copy, FileClock, FileSpreadsheet, FileText, History, LayoutDashboard, LogOut,
  Mail, MessageCircle, Package, Pencil, Plus, Printer, Search, Settings, ShoppingCart, Smartphone, Store,
  Trash2, Truck, UploadCloud, Users, Wifi, XCircle, Zap
} from "lucide-react";
import "./style.css";

const API=import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const ORDER_STATUSES=["INVIATO","IN_ATTESA","IN_LAVORAZIONE","RICEVUTO","EVASO"];
const SIM_STATUSES=["IN_MAGAZZINO","ASSEGNATA","ATTIVATA","DISABILITATA","SOSPESA"];

type Page="dashboard"|"customers"|"imports"|"products"|"orders"|"inventory"|"simreport"|"ddt"|"settings";
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
  const [store,setStore]=useState<any>(null);
  const [inventoryFilter,setInventoryFilter]=useState<any>({});
  useEffect(()=>{fetch(API+"/settings/store").then(r=>r.json()).then(setStore)},[]);
  function openInventory(filter:any={}){setInventoryFilter(filter);setPage("inventory")}
  return <div className="shell">
    <aside>
      <div className="brand">{store?.logo_url?<img className="storelogo" src={assetUrl(store.logo_url)} alt="Logo punto vendita"/>:<div className="logo small">C</div>}<div><b>{store?.store_name||"Cornet ERP"}</b><small>Business Suite</small></div></div>
      <nav>
        <Nav active={page==="dashboard"} icon={<LayoutDashboard/>} onClick={()=>setPage("dashboard")}>Dashboard</Nav>
        <Nav active={page==="customers"} icon={<Users/>} onClick={()=>setPage("customers")}>Clienti</Nav>
        <Nav active={page==="imports"} icon={<FileSpreadsheet/>} onClick={()=>setPage("imports")}>Importazioni Business</Nav>
        <div className="navgroup">SIM E MAGAZZINO</div>
        <Nav active={page==="products"} icon={<Package/>} onClick={()=>setPage("products")}>Prodotti</Nav>
        <Nav active={page==="orders"} icon={<ShoppingCart/>} onClick={()=>setPage("orders")}>Ordini SIM</Nav>
        <Nav active={page==="inventory"} icon={<Boxes/>} onClick={()=>openInventory()}>Magazzino SIM</Nav>
        <Nav active={page==="simreport"} icon={<BarChart3/>} onClick={()=>setPage("simreport")}>Report SIM</Nav>
        <div className="navgroup">SPEDIZIONI</div>
        <Nav active={page==="ddt"} icon={<Truck/>} onClick={()=>setPage("ddt")}>Spedizioni e DDT</Nav>
        <Nav active={page==="settings"} icon={<Settings/>} onClick={()=>setPage("settings")}>Configurazione</Nav>
      </nav>
      <div className="navfoot"><span>VERSIONE</span><b>0.2 · WINDTRE SME</b></div>
    </aside>
    <section className="content">
      <header><div className="search"><Search size={17}/>Cerca clienti, codici, linee e campagne...</div><button className="icon" onClick={logout} title="Esci"><LogOut size={18}/></button></header>
      {page==="dashboard"&&<Dashboard openImports={()=>setPage("imports")}/>}
      {page==="customers"&&<Customers/>}
      {page==="imports"&&<Imports/>}
      {page==="products"&&<Products/>}
      {page==="orders"&&<SimOrders/>}
      {page==="inventory"&&<SimInventory initialFilter={inventoryFilter}/>}
      {page==="simreport"&&<SimReport openInventory={openInventory}/>}
      {page==="ddt"&&<DdtShipments/>}
      {page==="settings"&&<StoreConfiguration value={store} saved={setStore}/>}
    </section>
  </div>;
}

function Nav({active,icon,onClick,children}:{active:boolean;icon:React.ReactNode;onClick:()=>void;children:React.ReactNode}){
  return <button className={active?"active":""} onClick={onClick}>{icon}<span>{children}</span></button>;
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
    <div className="title"><div><small>CENTRO OPERATIVO</small><h1>Dashboard portafoglio</h1><p>Una vista distinta per ciascun mercato e linea di servizio.</p></div>{segment==="BUSINESS_SME"&&<button className="new" onClick={openImports}><UploadCloud size={18}/>Importa estrazione</button>}</div>
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
    </section>
  </div>
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

function StoreConfiguration({value,saved}:{value:any;saved:(value:any)=>void}){
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
  return <main className="page">
    <div className="title"><div><small>IMPOSTAZIONI AZIENDALI</small><h1>Configurazione punto vendita</h1><p>Questi dati saranno utilizzati per documenti, preventivi, DDT e comunicazioni.</p></div></div>
    <div className="settingsgrid">
      <div className="logoStack"><article className="logocard"><div className="logopreview">{form.logo_url?<img src={assetUrl(form.logo_url)} alt="Logo punto vendita"/>:<Store/>}</div><h2>Logo del mittente</h2><p>Appare a sinistra nei DDT.</p><label className="secondary uploadbutton">Scegli logo<input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event=>uploadLogo(event.target.files?.[0]||null)}/></label></article><article className="logocard"><div className="logopreview">{form.partner_logo_url?<img src={assetUrl(form.partner_logo_url)} alt="Logo partner"/>:<BriefcaseBusiness/>}</div><h2>Logo partner</h2><p>WindTre o altro brand, a destra nei DDT.</p><label className="secondary uploadbutton">Scegli logo partner<input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event=>uploadLogo(event.target.files?.[0]||null,true)}/></label></article></div>
      <form className="settingsform" onSubmit={submit}>
        <div className="formsection"><h2>Dati del punto vendita</h2><div className="fieldgrid">{STORE_FIELDS.map(([key,label,placeholder])=><label key={key}>{label}<input value={form[key]||""} placeholder={placeholder} onChange={event=>setForm({...form,[key]:event.target.value})} required={key==="store_name"}/></label>)}</div></div>
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
