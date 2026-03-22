import { useState, useMemo, useRef, useEffect } from "react";

/* ─── Master data ─────────────────────────────────────────────────── */
const STOCK = [
  { id:1,  bayan:"استمارة الرقم القومي فئة 50",  raseed:500,  qeema:50  },
  { id:2,  bayan:"استمارة الرقم القومي فئة 25",  raseed:50,   qeema:125 },
  { id:3,  bayan:"استمارة الرقم القومي فئة 85",  raseed:300,  qeema:185 },
  { id:5,  bayan:"شهادات ميلاد أول مرة",          raseed:200,  qeema:45  },
  { id:6,  bayan:"شهادات ميلاد",                  raseed:1500, qeema:25  },
  { id:7,  bayan:"شهادات وفاة",                   raseed:200,  qeema:25  },
  { id:8,  bayan:"وثيقة زواج",                    raseed:200,  qeema:40  },
  { id:9,  bayan:"وثيقة طلاق",                    raseed:100,  qeema:40  },
  { id:10, bayan:"قيد العائلي مميكن",              raseed:100,  qeema:35  },
  { id:11, bayan:"تعذر قيد عائلي",                raseed:100,  qeema:35  },
  { id:12, bayan:"قيد العائلي (مميز)",             raseed:50,   qeema:80  },
  { id:13, bayan:"تعذر قيد عائلي (مميز)",         raseed:50,   qeema:80  },
];

/* ─── Helpers ─────────────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().split("T")[0];
const addDays  = (d,n) => { const dt=new Date(d+"T00:00:00"); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
const fmtLong  = d => new Date(d+"T00:00:00").toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const fmtShort = d => new Date(d+"T00:00:00").toLocaleDateString("ar-EG",{month:"short",day:"numeric"});
const fmtPrint = d => new Date(d+"T00:00:00").toLocaleDateString("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit"});

function freshItems(coMap){
  return STOCK.map(s=>({ id:s.id, mabea:0, visa:0, tawreed:0,
    carryOver: coMap ? (coMap[s.id]??s.raseed) : s.raseed }));
}

const KEY  = "sales_v4";
const load = () => { try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch{ return {}; } };
const persist = h => localStorage.setItem(KEY, JSON.stringify(h));

/* ─── App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [history,  setHistory]  = useState(load);
  const [viewDate, setViewDate] = useState(todayStr());
  const [editing,  setEditing]  = useState(false);
  const [saved,    setSaved]    = useState(false);
  const navRef = useRef(null);

  const sortedDates = useMemo(()=>Object.keys(history).sort(),[history]);
  const allDates    = useMemo(()=>[...new Set([...sortedDates,todayStr()])].sort(),[sortedDates]);
  const viewIdx     = allDates.includes(viewDate) ? allDates.indexOf(viewDate) : allDates.length-1;
  const isPast      = viewDate < todayStr();
  const readOnly    = isPast && !editing;

  function coMap(date){
    const prev = sortedDates.filter(d=>d<date).pop();
    if(!prev) return null;
    const m={};
    history[prev].items.forEach(i=>{ m[i.id]=i.carryOver-i.mabea; });
    return m;
  }

  const currentDay = useMemo(()=>{
    return history[viewDate] ?? { items:freshItems(coMap(viewDate)), closed:false };
  },[viewDate,history]);

  function updateItem(id,field,raw){
    const val=Math.max(0,Number(raw)||0);
    setHistory(prev=>{
      const base=prev[viewDate]??{items:freshItems(coMap(viewDate)),closed:false};
      const items=base.items.map(item=>{
        if(item.id!==id) return item;
        let u={...item,[field]:val};
        if(field==="mabea")   u.mabea  =Math.min(val,item.carryOver);
        if(field==="visa")    u.visa   =Math.min(val,Math.max(0,u.mabea-u.tawreed));
        if(field==="tawreed") u.tawreed=Math.min(val,Math.max(0,u.mabea-u.visa));
        return u;
      });
      const updated={...prev,[viewDate]:{...base,items}};
      persist(updated); return updated;
    });
  }

  function handleSave(){
    setHistory(prev=>{
      const base=prev[viewDate]??{items:freshItems(coMap(viewDate)),closed:false};
      const updated={...prev,[viewDate]:{...base,closed:true}};
      persist(updated); return updated;
    });
    setSaved(true); setTimeout(()=>setSaved(false),2200);
  }

  function handleCloseNext(){
    setHistory(prev=>{
      const base=prev[viewDate]??{items:freshItems(coMap(viewDate)),closed:false};
      const updated={...prev,[viewDate]:{...base,closed:true}};
      persist(updated); return updated;
    });
    setViewDate(addDays(viewDate,1)); setEditing(false);
  }

  function goTo(d){ setViewDate(d); setEditing(false); }

  useEffect(()=>{
    const el=navRef.current?.querySelector(".np.act");
    el?.scrollIntoView({inline:"center",behavior:"smooth",block:"nearest"});
  },[viewDate,allDates.length]);

  /* enriched rows */
  const rows = currentDay.items.map(item=>{
    const s=STOCK.find(s=>s.id===item.id);
    const mablagh=item.mabea*s.qeema;
    const kash=(item.mabea-item.visa-item.tawreed)*s.qeema;
    const baqi=item.carryOver-item.mabea;
    return{...item,...s,mablagh,kash,baqi};
  });

  const totals=rows.reduce(
    (a,i)=>({mablagh:a.mablagh+i.mablagh,visa:a.visa+i.visa*i.qeema,tawreed:a.tawreed+i.tawreed*i.qeema,kash:a.kash+i.kash}),
    {mablagh:0,visa:0,tawreed:0,kash:0}
  );

  /* ── Print handler ── */
  function handlePrint(){
    // build a standalone HTML page and open print dialog
    const tableRows = rows.map((item,idx)=>`
      <tr>
        <td>${item.id}</td>
        <td class="bayan-cell">${item.bayan}</td>
        <td>${item.raseed}</td>
        <td class="carry">${item.carryOver}</td>
        <td>${item.qeema}</td>
        <td class="mabea-cell">${item.mabea||0}</td>
        <td>${item.mablagh>0?item.mablagh.toLocaleString("ar-EG"):"—"}</td>
        <td class="visa-cell">${item.visa||0}</td>
        <td class="tawreed-cell">${item.tawreed||0}</td>
        <td>${item.kash>0?item.kash.toLocaleString("ar-EG"):"—"}</td>
        <td class="${item.baqi>0?"pos":item.baqi===0?"zero":"neg"}">${item.baqi}</td>
      </tr>`).join("");

    const html=`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>سجل مدني الشروق – ${fmtPrint(viewDate)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;direction:rtl;background:#fff;color:#111;font-size:11pt}
  
  /* ── Official header ── */
  .official-header{text-align:center;padding:16px 20px 10px;border-bottom:3px double #1a3a6b}
  .official-header .ministry-logo{font-size:9pt;color:#555;letter-spacing:1px;margin-bottom:6px}
  .official-header h1{font-size:15pt;font-weight:900;color:#1a3a6b;line-height:1.6}
  .official-header h1 span{display:block}
  .official-header .doc-title{margin-top:10px;font-size:13pt;font-weight:700;color:#8b0000;
    border:2px solid #8b0000;display:inline-block;padding:4px 30px;border-radius:4px}

  /* ── Date bar ── */
  .date-bar{display:flex;justify-content:space-between;align-items:center;
    padding:8px 20px;background:#f5f5f5;border-bottom:1px solid #ccc;font-size:10pt}
  .date-bar .label{color:#555}
  .date-bar .value{font-weight:700;color:#1a3a6b}

  /* ── Table ── */
  table{width:100%;border-collapse:collapse;margin:0;font-size:9.5pt}
  th{background:#1a3a6b;color:#fff;padding:7px 6px;text-align:center;
     border:1px solid #0d2550;font-size:9pt;white-space:nowrap}
  td{padding:6px 6px;text-align:center;border:1px solid #ccc}
  tr:nth-child(even) td{background:#f9f9f9}
  .bayan-cell{text-align:right;font-weight:600;padding-right:10px}
  .carry{background:#e8f0ff;color:#1a3a6b;font-weight:700}
  .mabea-cell{background:#fffbe6;font-weight:700}
  .visa-cell{background:#e8f4ff;color:#0d47a1}
  .tawreed-cell{background:#e8fff2;color:#1b5e20}
  .pos{color:#1b5e20;font-weight:700}
  .zero{color:#888}
  .neg{color:#b71c1c;font-weight:700}

  /* ── Totals ── */
  .totals-row td{background:#1a3a6b!important;color:#fff;font-weight:800;border-color:#0d2550;font-size:10pt}
  .after-tawreed{background:#f0f4ff;border:1px solid #1a3a6b;margin:10px 20px;padding:8px 16px;
    display:flex;justify-content:space-between;font-size:10pt;border-radius:4px}
  .after-tawreed .lbl{color:#555}
  .after-tawreed .val{font-weight:900;color:#1a3a6b;font-size:12pt}

  /* ── Summary boxes ── */
  .summary{display:flex;gap:10px;padding:10px 20px;border-bottom:1px solid #ddd}
  .sbox{flex:1;border:1.5px solid #ccc;border-radius:6px;padding:8px 12px;text-align:center}
  .sbox .slbl{font-size:8.5pt;color:#666;margin-bottom:2px}
  .sbox .sval{font-size:13pt;font-weight:900}
  .sbox.total .sval{color:#1a3a6b}
  .sbox.visa  .sval{color:#0d47a1}
  .sbox.tawreed .sval{color:#1b5e20}
  .sbox.kash  .sval{color:#b45309}

  /* ── Footer ── */
  .print-footer{margin-top:20px;padding:12px 20px;border-top:2px solid #1a3a6b;
    display:flex;justify-content:space-between;font-size:9pt;color:#555}
  .sig-box{border-top:1px solid #888;margin-top:30px;width:140px;text-align:center;
    padding-top:4px;font-size:8.5pt;color:#444}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4 landscape;margin:12mm 10mm}
  }
</style>
</head>
<body>

<!-- OFFICIAL HEADER -->
<div class="official-header">
  <div class="ministry-logo">وزارة الداخلية – جمهورية مصر العربية</div>
  <h1>
    <span>قـــطـــاع الأحـــوال الـــمـــدنـــيـــة</span>
    <span>الإدارة الـعـامـة لـشـئـون الـمـنـاطـق</span>
    <span>إدارة شـرطـة الأحـوال الـمـدنـيـة بـالـقـاهـرة</span>
    <span>ســجـل مـدنـي الـشـروق</span>
  </h1>
  <div class="doc-title">سجل المبيعات اليومية</div>
</div>

<!-- DATE BAR -->
<div class="date-bar">
  <span><span class="label">التاريخ: </span><span class="value">${fmtPrint(viewDate)}</span></span>
  <span><span class="label">اليوم: </span><span class="value">${new Date(viewDate+"T00:00:00").toLocaleDateString("ar-EG",{weekday:"long"})}</span></span>
  <span><span class="label">إجمالي المبيعات: </span><span class="value">${totals.mablagh.toLocaleString("ar-EG")} جنيه</span></span>
</div>

<!-- SUMMARY BOXES -->
<div class="summary">
  <div class="sbox total"><div class="slbl">📊 إجمالي المبيعات</div><div class="sval">${totals.mablagh.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox visa"><div class="slbl">💳 فيزا</div><div class="sval">${totals.visa.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox tawreed"><div class="slbl">🏦 توريد</div><div class="sval">${totals.tawreed.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox kash"><div class="slbl">💵 كاش</div><div class="sval">${totals.kash.toLocaleString("ar-EG")} ج</div></div>
</div>

<!-- MAIN TABLE -->
<table>
  <thead>
    <tr>
      <th>م</th>
      <th>البيان</th>
      <th>الرصيد الأصلي</th>
      <th>الباقي من أمس</th>
      <th>القيمة</th>
      <th>المباع اليوم</th>
      <th>المبلغ</th>
      <th>فيزا</th>
      <th>توريد</th>
      <th>كاش</th>
      <th>الباقي لغد</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    <tr class="totals-row">
      <td colspan="6" style="text-align:right;padding-right:12px">الإجمالي</td>
      <td>${totals.mablagh.toLocaleString("ar-EG")} ج</td>
      <td>${totals.visa.toLocaleString("ar-EG")} ج</td>
      <td>${totals.tawreed.toLocaleString("ar-EG")} ج</td>
      <td>${totals.kash.toLocaleString("ar-EG")} ج</td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- AFTER TAWREED -->
<div class="after-tawreed">
  <span class="lbl">الإجمالي بعد خصم التوريد:</span>
  <span class="val">${(totals.mablagh-totals.tawreed).toLocaleString("ar-EG")} جنيه</span>
</div>

<!-- FOOTER / SIGNATURES -->
<div class="print-footer">
  <div>
    <div class="sig-box">مسئول السجل المدني</div>
  </div>
  <div style="text-align:center;font-size:8pt;color:#aaa">
    طُبع بتاريخ: ${new Date().toLocaleDateString("ar-EG")}
  </div>
  <div>
    <div class="sig-box">مدير الإدارة</div>
  </div>
</div>

<script>window.onload=()=>{ window.print(); }</script>
</body></html>`;

    const win=window.open("","_blank");
    win.document.write(html);
    win.document.close();
  }

  /* ── JSX ─────────────────────────────────────────────────────────── */
  return (
    <div style={{direction:"rtl",fontFamily:"'Cairo',sans-serif",minHeight:"100vh",background:"#0d0f18",color:"#e8e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#c8a84b44;border-radius:3px}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        .ci{width:100%;background:rgba(200,168,75,.1);border:1px solid rgba(200,168,75,.28);border-radius:6px;color:#f0e6c0;font-family:'Cairo',sans-serif;font-size:13px;padding:5px 8px;text-align:center;transition:all .18s;outline:none}
        .ci:focus{border-color:#c8a84b;background:rgba(200,168,75,.2);box-shadow:0 0 0 2px rgba(200,168,75,.14)}
        .ci-v{background:rgba(100,180,255,.1);border-color:rgba(100,180,255,.28);color:#aad4ff}
        .ci-v:focus{border-color:#64b4ff;background:rgba(100,180,255,.2)}
        .ci-t{background:rgba(80,208,144,.1);border-color:rgba(80,208,144,.28);color:#80e0b0}
        .ci-t:focus{border-color:#50d090;background:rgba(80,208,144,.2)}
        .ci:disabled{opacity:.38;cursor:not-allowed}
        td{padding:7px 9px;text-align:center;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}
        th{background:#181b28;color:#c8a84b;font-weight:700;font-size:11.5px;padding:10px 9px;text-align:center;border-bottom:2px solid rgba(200,168,75,.35);white-space:nowrap;position:sticky;top:0;z-index:10}
        tr.dr:hover td{background:rgba(200,168,75,.04)!important}
        .tot td{background:#131520!important;font-weight:800;border-top:2px solid rgba(200,168,75,.28)}
        .num{font-variant-numeric:tabular-nums}
        .np{flex-shrink:0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;color:#999;font-family:'Cairo',sans-serif;font-size:12px;padding:5px 14px;cursor:pointer;transition:all .18s;white-space:nowrap;user-select:none}
        .np:hover{background:rgba(200,168,75,.12);border-color:rgba(200,168,75,.35);color:#c8a84b}
        .np.act{background:rgba(200,168,75,.22);border-color:#c8a84b;color:#e8c86b;font-weight:700;box-shadow:0 0 0 2px rgba(200,168,75,.18)}
        .np.cp{border-style:dashed;opacity:.75}
        .arr{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(200,168,75,.3);background:rgba(200,168,75,.07);color:#c8a84b;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s;line-height:1}
        .arr:hover:not(:disabled){background:rgba(200,168,75,.2);border-color:#c8a84b}
        .arr:disabled{opacity:.22;cursor:not-allowed}
        .bmain{background:linear-gradient(135deg,#c8a84b,#e8c86b);color:#1a1400;font-weight:700;border:none;border-radius:10px;padding:9px 22px;font-family:'Cairo',sans-serif;font-size:13px;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(200,168,75,.3)}
        .bmain:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(200,168,75,.4)}
        .bsave{background:rgba(200,168,75,.1);color:#c8a84b;font-weight:700;border:1.5px solid rgba(200,168,75,.32);border-radius:10px;padding:9px 22px;font-family:'Cairo',sans-serif;font-size:13px;cursor:pointer;transition:all .2s}
        .bsave:hover{background:rgba(200,168,75,.2)}
        .bsave.ok{background:rgba(80,200,120,.13);border-color:#50c878;color:#50c878}
        .bprint{background:rgba(100,180,255,.1);color:#82c4ff;font-weight:700;border:1.5px solid rgba(100,180,255,.3);border-radius:10px;padding:9px 22px;font-family:'Cairo',sans-serif;font-size:13px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
        .bprint:hover{background:rgba(100,180,255,.2);border-color:#64b4ff}
        .bedit{background:rgba(255,180,50,.07);color:#ffb432;font-weight:600;border:1.5px solid rgba(255,180,50,.28);border-radius:8px;padding:6px 16px;font-family:'Cairo',sans-serif;font-size:13px;cursor:pointer;transition:all .18s}
        .bedit:hover{background:rgba(255,180,50,.17)}
        .tag{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:600}
        .tv{background:rgba(100,180,255,.13);color:#64b4ff;border:1px solid rgba(100,180,255,.22)}
        .tt{background:rgba(80,208,144,.13);color:#50d090;border:1px solid rgba(80,208,144,.22)}
        .tk{background:rgba(200,168,75,.13);color:#c8a84b;border:1px solid rgba(200,168,75,.22)}
        .tro{background:rgba(255,120,80,.1);color:#ff7850;border:1px solid rgba(255,120,80,.22)}
        .tcl{background:rgba(100,220,130,.1);color:#60d890;border:1px solid rgba(100,220,130,.22)}
        .scrollx{overflow-x:auto}
      `}</style>

      {/* ══ OFFICIAL HEADER BANNER ═══════════════════════════════════════ */}
      <div style={{background:"linear-gradient(160deg,#0e1a38,#162954)",borderBottom:"3px double rgba(200,168,75,.6)",padding:"18px 24px 14px",textAlign:"center",position:"relative"}}>
        {/* decorative lines */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:"linear-gradient(90deg,transparent,#c8a84b,transparent)"}}/>
        <div style={{fontSize:10,color:"#8a9fc0",letterSpacing:3,marginBottom:8,textTransform:"uppercase"}}>
          وزارة الداخلية — جمهورية مصر العربية
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          {[
            "قـــطـــاع الأحـــوال الـمـدنـيـة",
            "الإدارة الـعـامـة لـشـئـون الـمـنـاطـق",
            "إدارة شـرطـة الأحـوال الـمـدنـيـة بـالـقـاهـرة",
            "سـجـل مـدنـي الـشـروق",
          ].map((line,i)=>(
            <div key={i} style={{
              fontSize: i===3?20:i===0?17:15,
              fontWeight: i===3?900:700,
              color: i===3?"#e8c86b":"#c8d8f0",
              letterSpacing: i===3?3:1,
              lineHeight:1.5,
            }}>{line}</div>
          ))}
        </div>
        <div style={{marginTop:10,display:"inline-block",padding:"4px 28px",border:"1.5px solid rgba(200,168,75,.5)",borderRadius:6,fontSize:13,color:"#c8a84b",fontWeight:700,background:"rgba(200,168,75,.07)",letterSpacing:2}}>
          سـجـل الـمـبـيـعـات الـيـومـيـة
        </div>
      </div>

      {/* ══ ACTION BAR ═══════════════════════════════════════════════════ */}
      <div style={{background:"#13162a",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"11px 20px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:"#777",marginLeft:6}}>{fmtLong(viewDate)}</div>
          {currentDay.closed && <span className="tag tcl">✔ محفوظ</span>}
          {readOnly          && <span className="tag tro">🔒 عرض فقط</span>}
        </div>

        {isPast && (
          <button className="bedit" onClick={()=>setEditing(e=>!e)}>
            {editing?"🔒 إغلاق التعديل":"✏️ تعديل"}
          </button>
        )}

        {/* Print button — always available */}
        <button className="bprint" onClick={handlePrint}>
          🖨️ طباعة / PDF
        </button>

        {!readOnly && (
          <>
            <button className={`bsave${saved?" ok":""}`} onClick={handleSave}>
              {saved?"✔ تم الحفظ":"💾 حفظ"}
            </button>
            <button className="bmain" onClick={handleCloseNext}>
              📅 إغلاق ← اليوم التالي
            </button>
          </>
        )}
      </div>

      {/* ══ SUMMARY CARDS ════════════════════════════════════════════════ */}
      <div style={{background:"#10121e",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"12px 20px",display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          {label:"الإجمالي", val:totals.mablagh,                    color:"#c8a84b",icon:"📊"},
          {label:"فيزا",     val:totals.visa,                        color:"#64b4ff",icon:"💳"},
          {label:"توريد",    val:totals.tawreed,                     color:"#50d090",icon:"🏦"},
          {label:"كاش",      val:totals.kash,                        color:"#ffb347",icon:"💵"},
          {label:"بعد التوريد", val:totals.mablagh-totals.tawreed,   color:"#e8e0c0",icon:"🗓"},
        ].map(c=>(
          <div key={c.label} style={{flex:"1 1 120px",background:"rgba(255,255,255,.03)",border:`1px solid ${c.color}28`,borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:10.5,color:"#666",marginBottom:2}}>{c.icon} {c.label}</div>
            <div className="num" style={{fontSize:18,fontWeight:900,color:c.color}}>{c.val.toLocaleString("ar-EG")} ج</div>
          </div>
        ))}
      </div>

      {/* ══ DAY NAVIGATOR ════════════════════════════════════════════════ */}
      <div style={{background:"#0f1120",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"10px 14px",display:"flex",gap:8,alignItems:"center"}}>
        <button className="arr" disabled={viewIdx<=0} onClick={()=>goTo(allDates[viewIdx-1])}>‹</button>
        <div ref={navRef} style={{display:"flex",gap:6,overflowX:"auto",flex:1,padding:"2px 0",scrollbarWidth:"none"}}>
          {allDates.map(d=>{
            const cl=!!history[d]?.closed;
            const isT=d===todayStr();
            return(
              <button key={d} className={`np${d===viewDate?" act":""}${cl?" cp":""}`}
                onClick={()=>goTo(d)} title={fmtLong(d)}>
                {fmtShort(d)}{isT?" 🟢":cl?" ✔":""}
              </button>
            );
          })}
        </div>
        <button className="arr" disabled={viewIdx>=allDates.length-1} onClick={()=>goTo(allDates[viewIdx+1])}>›</button>
        <input type="date" value={viewDate} onChange={e=>goTo(e.target.value)}
          style={{background:"rgba(200,168,75,.07)",border:"1px solid rgba(200,168,75,.28)",borderRadius:8,color:"#e8c86b",fontFamily:"'Cairo',sans-serif",fontSize:12,padding:"5px 10px",outline:"none",flexShrink:0}}/>
      </div>

      {/* ══ TABLE ════════════════════════════════════════════════════════ */}
      <div className="scrollx" style={{padding:"16px 14px"}}>
        <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,minWidth:1040}}>
          <thead>
            <tr>
              <th style={{width:28}}>م</th>
              <th style={{textAlign:"right",minWidth:180}}>البيان</th>
              <th>الرصيد الأصلي</th>
              <th style={{background:"#191f30",color:"#9ac8ff"}}>الباقي من أمس</th>
              <th>القيمة</th>
              <th style={{background:"#1a2018"}}>المباع اليوم</th>
              <th>المبلغ</th>
              <th style={{background:"#181d2e",color:"#64b4ff"}}>فيزا</th>
              <th style={{background:"#182820",color:"#50d090"}}>توريد</th>
              <th>كاش</th>
              <th style={{color:"#80e0b0"}}>الباقي لغد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item=>(
              <tr key={item.id} className="dr">
                <td style={{color:"#444",fontSize:11}}>{item.id}</td>
                <td style={{textAlign:"right",color:"#e0d8c0",fontWeight:600}}>{item.bayan}</td>
                <td><span className="num" style={{color:"#505060"}}>{item.raseed}</span></td>
                <td style={{background:"rgba(100,180,255,.04)"}}>
                  <span className="num" style={{fontWeight:700,color:item.carryOver>0?"#9ac8ff":"#ff6060"}}>{item.carryOver}</span>
                </td>
                <td><span className="num" style={{color:"#c8a84b"}}>{item.qeema}</span></td>
                <td style={{background:"rgba(200,168,75,.03)"}}>
                  <input type="number" className="ci" min={0} max={item.carryOver}
                    value={item.mabea||""} placeholder="0" disabled={readOnly}
                    onChange={e=>updateItem(item.id,"mabea",e.target.value)}/>
                </td>
                <td><span className="num" style={{color:item.mablagh>0?"#e8c86b":"#2a2a35"}}>{item.mablagh>0?item.mablagh.toLocaleString("ar-EG"):"—"}</span></td>
                <td style={{background:"rgba(100,180,255,.03)"}}>
                  <input type="number" className="ci ci-v" min={0} max={item.mabea}
                    value={item.visa||""} placeholder="0" disabled={readOnly}
                    onChange={e=>updateItem(item.id,"visa",e.target.value)}/>
                </td>
                <td style={{background:"rgba(80,208,144,.03)"}}>
                  <input type="number" className="ci ci-t" min={0} max={item.mabea}
                    value={item.tawreed||""} placeholder="0" disabled={readOnly}
                    onChange={e=>updateItem(item.id,"tawreed",e.target.value)}/>
                </td>
                <td><span className="num" style={{color:item.kash>0?"#f0e6c0":"#2a2a35"}}>{item.kash>0?item.kash.toLocaleString("ar-EG"):"—"}</span></td>
                <td>
                  <span className="num" style={{fontWeight:700,
                    color:item.baqi>20?"#80e0b0":item.baqi>0?"#ffb347":"#ff6060"}}>
                    {item.baqi}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="tot">
              <td colSpan={6} style={{textAlign:"right",color:"#c8a84b",fontSize:13}}>الإجمالي</td>
              <td><span className="num" style={{color:"#e8c86b"}}>{totals.mablagh.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{color:"#64b4ff"}}>{totals.visa.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{color:"#50d090"}}>{totals.tawreed.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{color:"#ffb347"}}>{totals.kash.toLocaleString("ar-EG")} ج</span></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
      <div style={{padding:"10px 16px 30px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <span className="tag tv">💳 فيزا</span>
        <span className="tag tt">🏦 توريد</span>
        <span className="tag tk">💵 كاش</span>
        <span style={{marginRight:"auto",fontSize:11,color:"#383848"}}>
          💾 يُحفظ تلقائياً — {allDates.length} يوم مسجّل
        </span>
      </div>
    </div>
  );
}
