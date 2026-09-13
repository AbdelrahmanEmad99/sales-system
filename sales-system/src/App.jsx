import { useState, useMemo, useRef, useEffect } from "react";

/* ─── Master data ─────────────────────────────────────────────────── */
const INITIAL_STOCK = [
  { id: 1, bayan: "استمارة الرقم القومي فئة 50", raseed: 500, qeema: 50 },
  { id: 2, bayan: "استمارة الرقم القومي فئة 125", raseed: 50, qeema: 125 },
  { id: 3, bayan: "استمارة الرقم القومي فئة 185", raseed: 300, qeema: 185 },
  { id: 5, bayan: "شهادات ميلاد أول مرة", raseed: 200, qeema: 45 },
  { id: 6, bayan: "شهادات ميلاد", raseed: 1500, qeema: 25 },
  { id: 7, bayan: "شهادات وفاة", raseed: 200, qeema: 25 },
  { id: 8, bayan: "وثيقة زواج", raseed: 200, qeema: 40 },
  { id: 9, bayan: "وثيقة طلاق", raseed: 100, qeema: 40 },
  { id: 10, bayan: "قيد العائلي مميكن", raseed: 100, qeema: 35 },
  { id: 11, bayan: "تعذر قيد عائلي", raseed: 100, qeema: 35 },
  { id: 12, bayan: "قيد العائلي (مميز)", raseed: 50, qeema: 80 },
  { id: 13, bayan: "تعذر قيد عائلي (مميز)", raseed: 50, qeema: 80 },
];

/* ─── Helpers ─────────────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => { const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; };
const fmtLong = d => new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const fmtShort = d => new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
const fmtPrint = d => new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });

function freshItems(coMap, stockList) {
  return stockList.map(s => ({
    id: s.id, mabea: 0, visa: 0, tawreed: 0, raseed: s.raseed,
    carryOver: coMap ? (coMap[s.id] ?? s.raseed) : s.raseed
  }));
}

const KEY = "sales_v4";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const persist = h => localStorage.setItem(KEY, JSON.stringify(h));
const getNextStockId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

const USERS_KEY = "sales_auth_users";
const SESSION_KEY = "sales_auth_session";
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
const loadUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; } };
const saveUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; } };
const saveSession = user => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
const clearSession = () => localStorage.removeItem(SESSION_KEY);
const getUserDataKey = user => `sales_user_data_${encodeURIComponent((user || "").toLowerCase())}`;
const loadUserData = user => {
  if (!user) return { stock: INITIAL_STOCK, history: {}, supplies: [] };
  try {
    const raw = localStorage.getItem(getUserDataKey(user));
    if (!raw) return { stock: INITIAL_STOCK, history: {}, supplies: [] };
    const parsed = JSON.parse(raw);
    return {
      stock: Array.isArray(parsed.stock) && parsed.stock.length ? parsed.stock : INITIAL_STOCK,
      history: parsed.history || {},
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : [],
    };
  } catch {
    return { stock: INITIAL_STOCK, history: {}, supplies: [] };
  }
};
const saveUserData = (user, data) => {
  if (!user) return;
  localStorage.setItem(getUserDataKey(user), JSON.stringify({
    stock: data.stock || INITIAL_STOCK,
    history: data.history || {},
    supplies: data.supplies || [],
  }));
};

function AuthScreen({ mode, setMode, form, setForm, onSubmit, message }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "radial-gradient(circle at top,#15213d,#0b0f1c 45%)", color: "#f1ead3", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "rgba(11,15,28,0.95)", border: "1px solid rgba(200,168,75,.34)", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,.45)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#132545,#1c315f)", padding: "22px 24px", borderBottom: "1px solid rgba(200,168,75,.25)", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#9db3d7", textTransform: "uppercase" }}>Sales System</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#e8c86b", marginTop: 8 }}>{mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}</div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: 5, marginBottom: 20 }}>
            <button type="button" onClick={() => setMode("signin")} style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 14, fontFamily: "'Cairo',sans-serif", cursor: "pointer", background: mode === "signin" ? "rgba(200,168,75,.18)" : "transparent", color: mode === "signin" ? "#f5d885" : "#b7bfd6" }}>
              تسجيل الدخول
            </button>
            <button type="button" onClick={() => setMode("signup")} style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 14, fontFamily: "'Cairo',sans-serif", cursor: "pointer", background: mode === "signup" ? "rgba(200,168,75,.18)" : "transparent", color: mode === "signup" ? "#f5d885" : "#b7bfd6" }}>
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, color: "#d9d0bf", fontSize: 14 }}>اسم المستخدم</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="اكتب اسم المستخدم" style={{ width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#f4edd8", padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo',sans-serif", outline: "none" }} />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, color: "#d9d0bf", fontSize: 14 }}>كلمة المرور</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#f4edd8", padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo',sans-serif", outline: "none" }} />
            </div>

            {mode === "signup" && (
              <div>
                <label style={{ display: "block", marginBottom: 8, color: "#d9d0bf", fontSize: 14 }}>تأكيد كلمة المرور</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="أعد كتابة كلمة المرور" style={{ width: "100%", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#f4edd8", padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo',sans-serif", outline: "none" }} />
              </div>
            )}

            {message && <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,107,107,.08)", border: "1px solid rgba(255,107,107,.2)", color: "#ffb0b0", fontSize: 13 }}>{message}</div>}

            <button type="submit" style={{ background: "linear-gradient(135deg,#c8a84b,#e8c86b)", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 16, fontWeight: 800, color: "#1a1400", cursor: "pointer", boxShadow: "0 8px 24px rgba(200,168,75,.35)" }}>
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(() => loadSession());

  const logoutUser = () => {
    setCurrentUser(null);
    clearSession();
    setMessage("");
    setForm({ username: "", password: "", confirmPassword: "" });
  };

  useEffect(() => {
    if (!currentUser) return;

    let timerId = null;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        logoutUser();
      }, SESSION_TIMEOUT_MS);
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];

    activityEvents.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  const submitAuth = e => {
    e.preventDefault();
    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setMessage("برجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    const users = loadUsers();

    if (mode === "signup") {
      if (password.length < 4) {
        setMessage("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
        return;
      }
      if (form.confirmPassword !== password) {
        setMessage("تأكيد كلمة المرور غير متطابق");
        return;
      }
      if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
        setMessage("اسم المستخدم موجود بالفعل");
        return;
      }
      const nextUsers = [...users, { username, password }];
      saveUsers(nextUsers);
      setCurrentUser(username);
      saveSession(username);
      setMessage("");
      return;
    }

    const found = users.find(user => user.username.toLowerCase() === username.toLowerCase() && user.password === password);
    if (!found) {
      setMessage("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }

    setCurrentUser(username);
    saveSession(username);
    setMessage("");
  };

  if (!currentUser) {
    return <AuthScreen mode={mode} setMode={setMode} form={form} setForm={setForm} onSubmit={submitAuth} message={message} />;
  }

  return <SalesApp currentUser={currentUser} onLogout={logoutUser} />;
}

function SalesApp({ currentUser, onLogout }) {
  const initialUserData = useMemo(() => loadUserData(currentUser), [currentUser]);
  const [stock, setStock] = useState(initialUserData.stock);
  const [history, setHistory] = useState(initialUserData.history);
  const [supplies, setSupplies] = useState(initialUserData.supplies);
  const [viewDate, setViewDate] = useState(todayStr());
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [raseedInputs, setRaseedInputs] = useState({});
  const [stockForm, setStockForm] = useState({ bayan: "", qeema: "", raseed: "" });
  const [supplyInput, setSupplyInput] = useState("");
  const [supplyWarning, setSupplyWarning] = useState("");
  const navRef = useRef(null);

  const sortedDates = useMemo(() => Object.keys(history).sort(), [history]);
  const allDates = useMemo(() => [...new Set([...sortedDates, todayStr()])].sort(), [sortedDates]);
  const viewIdx = allDates.includes(viewDate) ? allDates.indexOf(viewDate) : allDates.length - 1;
  const isPast = viewDate < todayStr();
  const readOnly = isPast && !editing;

  function coMap(date) {
    const prev = sortedDates.filter(d => d < date).pop();
    if (!prev) return null;
    const m = {};
    history[prev].items.forEach(i => { m[i.id] = i.carryOver - i.mabea; });
    return m;
  }

  const currentDay = useMemo(() => {
    return history[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
  }, [viewDate, history, stock]);

  useEffect(() => {
    if (!currentUser) return;
    saveUserData(currentUser, { stock, history, supplies });
  }, [currentUser, stock, history, supplies]);

  function addSupply() {
    const amount = Math.max(0, Number(supplyInput) || 0);
    if (amount === 0) return;
    setSupplies(prev => [...prev, { id: Date.now(), date: viewDate, amount }]);
    setSupplyInput("");
  }

  function updateItem(id, field, raw) {
    const val = Math.max(0, Number(raw) || 0);
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const items = base.items.map(item => {
        if (item.id !== id) return item;
        let u = { ...item, [field]: val };
        if (field === "mabea") u.mabea = Math.min(val, item.carryOver);
        if (field === "visa") u.visa = Math.min(val, Math.max(0, u.mabea - u.tawreed));
        if (field === "tawreed") {
          const dates = [...new Set([...Object.keys(prev).filter(date => date <= viewDate), viewDate])];
          const soldAcrossDays = dates.reduce((total, date) => {
            const day = date === viewDate ? base : prev[date];
            const dayItem = day?.items?.find(dayRow => dayRow.id === id);
            return total + (dayItem?.mabea || 0);
          }, 0);
          const suppliedBeforeThisEntry = dates.reduce((total, date) => {
            const day = date === viewDate ? base : prev[date];
            const dayItem = day?.items?.find(dayRow => dayRow.id === id);
            return total + (date === viewDate ? 0 : (dayItem?.tawreed || 0));
          }, 0);
          const maxAvailable = Math.max(0, soldAcrossDays - suppliedBeforeThisEntry);
          u.tawreed = Math.min(val, maxAvailable);
          setSupplyWarning(val > maxAvailable ? `أقصى توريد متاح لهذا الصنف هو ${maxAvailable} حسب إجمالي المباع` : "");
        }
        return u;
      });
      const updated = { ...prev, [viewDate]: { ...base, items } };
      persist(updated); return updated;
    });
  }

  function updateOriginalBalance(id, raw) {
    const nextValue = Math.max(0, Number(raw) || 0);
    setStock(prev => prev.map(item => item.id === id ? { ...item, raseed: nextValue } : item));
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const items = base.items.map(item => {
        if (item.id !== id) return item;
        const diff = nextValue - item.raseed;
        return { ...item, raseed: nextValue, carryOver: item.carryOver + diff };
      });
      const updated = { ...prev, [viewDate]: { ...base, items } };
      persist(updated); return updated;
    });
  }

  function updateItemValue(id, raw) {
    const nextValue = Math.max(0, Number(raw) || 0);
    setStock(prev => prev.map(item => item.id === id ? { ...item, qeema: nextValue } : item));
  }

  function addRaseed(id, addAmount) {
    const amount = Math.max(0, Number(addAmount) || 0);
    if (amount === 0) return;
    setStock(prev => prev.map(item => item.id === id ? { ...item, raseed: item.raseed + amount } : item));
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const items = base.items.map(item => {
        if (item.id !== id) return item;
        const newRaseed = item.raseed + amount;
        const newCarry = item.carryOver + amount;
        return { ...item, raseed: newRaseed, carryOver: newCarry };
      });
      const updated = { ...prev, [viewDate]: { ...base, items } };
      persist(updated); return updated;
    });
  }

  function addStockRecord() {
    const bayan = stockForm.bayan.trim();
    const qeema = Math.max(0, Number(stockForm.qeema) || 0);
    const raseed = Math.max(0, Number(stockForm.raseed) || 0);
    if (!bayan || !qeema) return;

    const newId = getNextStockId(stock);
    const inserted = { id: newId, bayan, qeema, raseed };

    setStock(prev => [...prev, inserted]);
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const items = [...base.items, {
        id: newId,
        mabea: 0,
        visa: 0,
        tawreed: 0,
        raseed,
        carryOver: coMap(viewDate) ? (coMap(viewDate)[newId] ?? raseed) : raseed,
      }];
      const updated = { ...prev, [viewDate]: { ...base, items } };
      persist(updated); return updated;
    });
    setStockForm({ bayan: "", qeema: "", raseed: "" });
  }

  function deleteStockRecord(id) {
    setStock(prev => prev.filter(item => item.id !== id));
    setHistory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        if (!updated[date] || !Array.isArray(updated[date].items)) return;
        updated[date] = { ...updated[date], items: updated[date].items.filter(item => item.id !== id) };
      });
      persist(updated);
      return updated;
    });
  }

  function handleSave() {
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const updated = { ...prev, [viewDate]: { ...base, closed: true } };
      persist(updated); return updated;
    });
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  }

  function handleCloseNext() {
    setHistory(prev => {
      const base = prev[viewDate] ?? { items: freshItems(coMap(viewDate), stock), closed: false };
      const updated = { ...prev, [viewDate]: { ...base, closed: true } };
      persist(updated); return updated;
    });
    setViewDate(addDays(viewDate, 1)); setEditing(false);
  }

  function goTo(d) { setViewDate(d); setEditing(false); }

  useEffect(() => {
    const el = navRef.current?.querySelector(".np.act");
    el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [viewDate, allDates.length]);

  /* enriched rows */
  const rows = currentDay.items.map(item => {
    const s = stock.find(s => s.id === item.id);
    const mablagh = item.mabea * s.qeema;
    const kash = (item.mabea - item.visa - item.tawreed) * s.qeema;
    const baqi = item.carryOver - item.mabea;
    return { ...item, ...s, mablagh, kash, baqi };
  });

  const totals = rows.reduce(
    (a, i) => ({ mablagh: a.mablagh + i.mablagh, visa: a.visa + i.visa * i.qeema, tawreed: a.tawreed + i.tawreed * i.qeema, kash: a.kash + i.kash }),
    { mablagh: 0, visa: 0, tawreed: 0, kash: 0 }
  );

  const accumulatedCash = useMemo(() => {
    const dates = [...new Set([...sortedDates.filter(date => date <= viewDate), viewDate])].sort();
    const grossCash = dates.reduce((balance, date) => {
      const day = date === viewDate ? currentDay : history[date];
      const dayCash = (day?.items || []).reduce((total, item) => {
        const stockItem = stock.find(stockRecord => stockRecord.id === item.id);
        if (!stockItem) return total;
        return total + (item.mabea - item.visa - item.tawreed) * stockItem.qeema;
      }, 0);
      return balance + dayCash;
    }, 0);
    const recordedSupplies = supplies
      .filter(supply => supply.date <= viewDate)
      .reduce((total, supply) => total + supply.amount, 0);
    return Math.max(0, grossCash - recordedSupplies);
  }, [currentDay, history, sortedDates, stock, supplies, viewDate]);

  const displayTotals = { ...totals, kash: accumulatedCash };
  

  /* ── Print handler ── */
  function handlePrint() {
    // build a standalone HTML page and open print dialog
    const tableRows = rows.map((item, idx) => `
      <tr>
        <td>${item.id}</td>
        <td class="bayan-cell">${item.bayan}</td>
        <td>${item.raseed}</td>
        <td class="carry">${item.carryOver}</td>
        <td>${item.qeema}</td>
        <td class="mabea-cell">${item.mabea || 0}</td>
        <td>${item.mablagh > 0 ? item.mablagh.toLocaleString("ar-EG") : "—"}</td>
        <td class="visa-cell">${item.visa || 0}</td>
        <td class="tawreed-cell">${item.tawreed || 0}</td>
        <td>${item.kash > 0 ? item.kash.toLocaleString("ar-EG") : "—"}</td>
        <td class="${item.baqi > 0 ? "pos" : item.baqi === 0 ? "zero" : "neg"}">${item.baqi}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
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
  <span><span class="label">اليوم: </span><span class="value">${new Date(viewDate + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long" })}</span></span>
  <span><span class="label">إجمالي المبيعات: </span><span class="value">${totals.mablagh.toLocaleString("ar-EG")} جنيه</span></span>
</div>

<!-- SUMMARY BOXES -->
<div class="summary">
  <div class="sbox total"><div class="slbl">📊 إجمالي المبيعات</div><div class="sval">${totals.mablagh.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox visa"><div class="slbl">💳 فيزا</div><div class="sval">${totals.visa.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox tawreed"><div class="slbl">🏦 توريد</div><div class="sval">${totals.tawreed.toLocaleString("ar-EG")} ج</div></div>
  <div class="sbox kash"><div class="slbl">💵 الكاش المتراكم</div><div class="sval">${displayTotals.kash.toLocaleString("ar-EG")} ج</div></div>
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
      <td>${displayTotals.kash.toLocaleString("ar-EG")} ج</td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- AFTER TAWREED -->
<div class="after-tawreed">
  <span class="lbl">الإجمالي بعد خصم التوريد:</span>
  <span class="val">${displayTotals.kash.toLocaleString("ar-EG")} جنيه</span>
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

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  }

  /* ── JSX ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ direction: "rtl", fontFamily: "'Cairo',sans-serif", minHeight: "100vh", background: "#0d0f18", color: "#e8e8f0" }}>
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
      <div style={{ background: "linear-gradient(160deg,#0e1a38,#162954)", borderBottom: "3px double rgba(200,168,75,.6)", padding: "18px 24px 14px", textAlign: "center", position: "relative" }}>
        {/* decorative lines */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,transparent,#c8a84b,transparent)" }} />
        <div style={{ fontSize: 10, color: "#8a9fc0", letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
          وزارة الداخلية — جمهورية مصر العربية
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          {[
            "قـــطـــاع الأحـــوال الـمـدنـيـة",
            "الإدارة الـعـامـة لـشـئـون الـمـنـاطـق",
            "إدارة شـرطـة الأحـوال الـمـدنـيـة بـالـقـاهـرة",
            "سـجـل مـدنـي الـشـروق",
          ].map((line, i) => (
            <div key={i} style={{
              fontSize: i === 3 ? 20 : i === 0 ? 17 : 15,
              fontWeight: i === 3 ? 900 : 700,
              color: i === 3 ? "#e8c86b" : "#c8d8f0",
              letterSpacing: i === 3 ? 3 : 1,
              lineHeight: 1.5,
            }}>{line}</div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "inline-block", padding: "4px 28px", border: "1.5px solid rgba(200,168,75,.5)", borderRadius: 6, fontSize: 13, color: "#c8a84b", fontWeight: 700, background: "rgba(200,168,75,.07)", letterSpacing: 2 }}>
          سـجـل الـمـبـيـعـات الـيـومـيـة
        </div>
      </div>

      {/* ══ ACTION BAR ═══════════════════════════════════════════════════ */}
      <div style={{ background: "#13162a", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "11px 20px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#777", marginLeft: 6 }}>{fmtLong(viewDate)}</div>
          {currentDay.closed && <span className="tag tcl">✔ محفوظ</span>}
          {readOnly && <span className="tag tro">🔒 عرض فقط</span>}
          <span className="tag tv">⏱️ خروج تلقائي بعد 20 دقيقة</span>
          {supplyWarning && <span className="tag tro">⚠️ {supplyWarning}</span>}
        </div>

        {isPast && (
          <button className="bedit" onClick={() => setEditing(e => !e)}>
            {editing ? "🔒 إغلاق التعديل" : "✏️ تعديل"}
          </button>
        )}

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            min={0}
            value={supplyInput}
            onChange={e => setSupplyInput(e.target.value)}
            placeholder="قيمة التوريد"
            style={{ width: 125, background: "rgba(80,208,144,.08)", border: "1px solid rgba(80,208,144,.35)", borderRadius: 8, color: "#9af0b8", padding: "8px 10px", fontFamily: "'Cairo',sans-serif", fontSize: 12, outline: "none" }}
          />
          <button
            className="bsave"
            onClick={addSupply}
            disabled={!Number(supplyInput)}
            style={{ padding: "9px 14px", opacity: Number(supplyInput) ? 1 : 0.5, cursor: Number(supplyInput) ? "pointer" : "not-allowed" }}
          >
            🏦 تسجيل توريد
          </button>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: "rgba(255,95,95,.1)",
            border: "1px solid rgba(255,95,95,.3)",
            color: "#ff8d8d",
            borderRadius: 10,
            padding: "9px 16px",
            fontWeight: 700,
            fontFamily: "'Cairo',sans-serif",
            cursor: "pointer",
            transition: "all .18s"
          }}
        >
          🚪 تسجيل الخروج
        </button>

        {/* Print button — always available */}
        <button className="bprint" onClick={handlePrint}>
          🖨️ طباعة / PDF
        </button>

        {!readOnly && (
          <>
            <button className={`bsave${saved ? " ok" : ""}`} onClick={handleSave}>
              {saved ? "✔ تم الحفظ" : "💾 حفظ"}
            </button>
            <button className="bmain" onClick={handleCloseNext}>
              📅 إغلاق ← اليوم التالي
            </button>
          </>
        )}
      </div>

      {/* ══ SUMMARY CARDS ════════════════════════════════════════════════ */}
      <div style={{ background: "#10121e", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "12px 20px", display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "الإجمالي", val: totals.mablagh, color: "#c8a84b", icon: "📊" },
          { label: "فيزا", val: totals.visa, color: "#64b4ff", icon: "💳" },
          { label: "توريد", val: totals.tawreed, color: "#50d090", icon: "🏦" },
          { label: "الكاش المتراكم", val: displayTotals.kash, color: "#ffb347", icon: "💵" },
          { label: "بعد التوريد", val: displayTotals.kash, color: "#e8e0c0", icon: "🗓" },
        ].map(c => (
          <div key={c.label} style={{ flex: "1 1 120px", background: "rgba(255,255,255,.03)", border: `1px solid ${c.color}28`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 10.5, color: "#666", marginBottom: 2 }}>{c.icon} {c.label}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 900, color: c.color }}>{c.val.toLocaleString("ar-EG")} ج</div>
          </div>
        ))}
      </div>

      {/* ══ ADD STOCK RECORD ═══════════════════════════════════════════ */}
      <div style={{ background: "#121722", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "12px 20px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="text" value={stockForm.bayan} onChange={e => setStockForm(p => ({ ...p, bayan: e.target.value }))}
          placeholder="اسم البيان" style={{ flex: "2 1 260px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, color: "#f0e6c0", padding: "8px 12px", fontFamily: "'Cairo',sans-serif", fontSize: 13 }} />
        <input type="number" value={stockForm.qeema} onChange={e => setStockForm(p => ({ ...p, qeema: e.target.value }))}
          placeholder="القيمة" style={{ flex: "1 1 120px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, color: "#f0e6c0", padding: "8px 12px", fontFamily: "'Cairo',sans-serif", fontSize: 13 }} />
        <input type="number" value={stockForm.raseed} onChange={e => setStockForm(p => ({ ...p, raseed: e.target.value }))}
          placeholder="الرصيد الأصلي" style={{ flex: "1 1 120px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, color: "#f0e6c0", padding: "8px 12px", fontFamily: "'Cairo',sans-serif", fontSize: 13 }} />
        <button onClick={addStockRecord} disabled={!stockForm.bayan.trim() || !Number(stockForm.qeema)} style={{ background: "rgba(80,208,144,.15)", border: "1px solid rgba(80,208,144,.28)", color: "#7de7a8", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontFamily: "'Cairo',sans-serif", cursor: "pointer" }}>
          + إضافة بيان
        </button>
      </div>

      {/* ══ DAY NAVIGATOR ════════════════════════════════════════════════ */}
      <div style={{ background: "#0f1120", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
        <button className="arr" disabled={viewIdx <= 0} onClick={() => goTo(allDates[viewIdx - 1])}>‹</button>
        <div ref={navRef} style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, padding: "2px 0", scrollbarWidth: "none" }}>
          {allDates.map(d => {
            const cl = !!history[d]?.closed;
            const isT = d === todayStr();
            return (
              <button key={d} className={`np${d === viewDate ? " act" : ""}${cl ? " cp" : ""}`}
                onClick={() => goTo(d)} title={fmtLong(d)}>
                {fmtShort(d)}{isT ? " 🟢" : cl ? " ✔" : ""}
              </button>
            );
          })}
        </div>
        <button className="arr" disabled={viewIdx >= allDates.length - 1} onClick={() => goTo(allDates[viewIdx + 1])}>›</button>
        <input type="date" value={viewDate} onChange={e => goTo(e.target.value)}
          style={{ background: "rgba(200,168,75,.07)", border: "1px solid rgba(200,168,75,.28)", borderRadius: 8, color: "#e8c86b", fontFamily: "'Cairo',sans-serif", fontSize: 12, padding: "5px 10px", outline: "none", flexShrink: 0 }} />
      </div>

      {/* ══ TABLE ════════════════════════════════════════════════════════ */}
      <div className="scrollx" style={{ padding: "16px 14px" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1040 }}>
          <thead>
            <tr>
              <th style={{ width: 28 }}>م</th>
              <th style={{ textAlign: "right", minWidth: 180 }}>البيان</th>
              <th>الرصيد الأصلي</th>
              <th style={{ background: "#1a2018", color: "#80e0b0" }}>إضافة عهده </th>
              <th style={{ background: "#191f30", color: "#9ac8ff" }}>الباقي من أمس</th>
              <th>القيمة</th>
              <th style={{ background: "#1a2018" }}>المباع اليوم</th>
              <th>المبلغ</th>
              <th style={{ background: "#181d2e", color: "#64b4ff" }}>فيزا</th>
              <th style={{ background: "#182820", color: "#50d090" }}>توريد</th>
              <th>كاش</th>
              <th style={{ color: "#80e0b0" }}>الباقي لغد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, rowIndex) => (
              <tr key={item.id} className="dr">
                <td style={{ color: "#444", fontSize: 11, textAlign: "center", verticalAlign: "middle", padding: "7px 6px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span>{rowIndex + 1}</span>
                    <button type="button" onClick={() => deleteStockRecord(item.id)} disabled={readOnly}
                      style={{ background: "rgba(255,95,95,.14)", border: "1px solid rgba(255,95,95,.35)", color: "#ff8d8d", borderRadius: 6, padding: "2px 7px", fontSize: 11, cursor: readOnly ? "not-allowed" : "pointer", opacity: readOnly ? 0.5 : 1 }}>
                      حذف
                    </button>
                  </div>
                </td>
                <td style={{ textAlign: "right", color: "#e0d8c0", fontWeight: 600 }}>{item.bayan}</td>
                <td style={{ background: "rgba(255,255,255,.02)" }}>
                  <input type="number" className="ci" min={0} value={item.raseed || 0} disabled={readOnly}
                    onChange={e => updateOriginalBalance(item.id, e.target.value)} />
                </td>
                <td style={{ background: "rgba(80,208,144,.03)" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input type="number" className="ci ci-t" min={0} placeholder="0"
                      disabled={readOnly}
                      value={raseedInputs[item.id] || ""} style={{ flex: 1 }}
                      onChange={e => setRaseedInputs({ ...raseedInputs, [item.id]: e.target.value })} />
                    <button onClick={() => { addRaseed(item.id, raseedInputs[item.id]); setRaseedInputs({ ...raseedInputs, [item.id]: "" }); }}
                      disabled={readOnly || !raseedInputs[item.id]}
                      style={{ padding: "5px 8px", background: "rgba(80,208,144,.2)", border: "1px solid #50d090", borderRadius: 4, color: "#50d090", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .18s" }}
                      onMouseEnter={e => { e.target.style.background = "rgba(80,208,144,.35)"; }}
                      onMouseLeave={e => { e.target.style.background = "rgba(80,208,144,.2)"; }}
                    >➕</button>
                  </div>
                </td>
                <td style={{ background: "rgba(100,180,255,.04)" }}>
                  <span className="num" style={{ fontWeight: 700, color: item.carryOver > 0 ? "#9ac8ff" : "#ff6060" }}>{item.carryOver}</span>
                </td>
                <td>
                  <input type="number" className="ci" min={0} value={item.qeema || 0}
                    disabled={readOnly}
                    onChange={e => updateItemValue(item.id, e.target.value)} />
                </td>
                <td style={{ background: "rgba(200,168,75,.03)" }}>
                  <input type="number" className="ci" min={0} max={item.carryOver}
                    value={item.mabea || ""} placeholder="0" disabled={readOnly}
                    onChange={e => updateItem(item.id, "mabea", e.target.value)} />
                </td>
                <td><span className="num" style={{ color: item.mablagh > 0 ? "#e8c86b" : "#2a2a35" }}>{item.mablagh > 0 ? item.mablagh.toLocaleString("ar-EG") : "—"}</span></td>
                <td style={{ background: "rgba(100,180,255,.03)" }}>
                  <input type="number" className="ci ci-v" min={0} max={item.mabea}
                    value={item.visa || ""} placeholder="0" disabled={readOnly}
                    onChange={e => updateItem(item.id, "visa", e.target.value)} />
                </td>
                <td style={{ background: "rgba(80,208,144,.03)" }}>
                  <input type="number" className="ci ci-t" min={0} max={item.mabea}
                    value={item.tawreed || ""} placeholder="0" disabled={readOnly}
                    onChange={e => updateItem(item.id, "tawreed", e.target.value)} />
                </td>
                <td><span className="num" style={{ color: item.kash > 0 ? "#f0e6c0" : "#2a2a35" }}>{item.kash > 0 ? item.kash.toLocaleString("ar-EG") : "—"}</span></td>
                <td>
                  <span className="num" style={{
                    fontWeight: 700,
                    color: item.baqi > 20 ? "#80e0b0" : item.baqi > 0 ? "#ffb347" : "#ff6060"
                  }}>
                    {item.baqi}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="tot">
              <td colSpan={7} style={{ textAlign: "right", color: "#c8a84b", fontSize: 13 }}>الإجمالي</td>
              <td><span className="num" style={{ color: "#e8c86b" }}>{totals.mablagh.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{ color: "#64b4ff" }}>{totals.visa.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{ color: "#50d090" }}>{totals.tawreed.toLocaleString("ar-EG")} ج</span></td>
              <td><span className="num" style={{ color: "#ffb347" }}>{displayTotals.kash.toLocaleString("ar-EG")} ج</span></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
      <div style={{ padding: "10px 16px 30px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <span className="tag tv">💳 فيزا</span>
        <span className="tag tt">🏦 توريد</span>
        <span className="tag tk">💵 كاش</span>
        <span style={{ marginRight: "auto", fontSize: 11, color: "#383848" }}>
          💾 يُحفظ تلقائياً — {allDates.length} يوم مسجّل
        </span>
      </div>
    </div>
  );
}
