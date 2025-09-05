import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Toasts from '../components/Toasts';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'https://expence-tracker-backend-klge.onrender.com';
const socket = io(API);

const PAGE_SIZE = 8;

function formatCurrency(v) { return `₹${Number(v||0).toLocaleString()}`; }
function todayISO() { return new Date().toISOString().slice(0,10); }

function estimateRdMaturity(monthlyAmount, months) {
  const principal = Number(monthlyAmount || 0) * Number(months || 0);
  const annualRate = 0.05; // placeholder — replace with actual bank rate
  const avgBalance = principal / 2;
  const years = months/12;
  const interest = avgBalance * annualRate * years;
  return Math.round(principal + interest);
}


export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [savings, setSavings] = useState([]);
  const [totals, setTotals] = useState({ income:0, expense:0, balance:0 });
  const [form, setForm] = useState({ type:'expense', title:'', amount:'', date:'', category:'', notes:'' });
  const [budget, setBudget] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('budget_v1'))||{ monthly:0, auto:false } }catch{ return { monthly:0, auto:false } }});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saveForm, setSaveForm] = useState({ type:'saving', name:'', amount:'', expiresAt:'', rdMonthly:'', rdMonths:'', rdStart:'' });

  const [txPage, setTxPage] = useState(1);
  const [svPage, setSvPage] = useState(1);

  useEffect(()=>{ fetchAll(); const cleanup = setupSocket(); return cleanup; }, []);

  function setupSocket(){
    socket.on('transaction:created', ()=> fetchAll());
    socket.on('savings:expired', ()=> fetchAll());
    // return cleanup function
    return () => {
      socket.off('transaction:created');
      socket.off('savings:expired');
    };
  }

  async function fetchAll(){
    try{
      const [txRes, svRes] = await Promise.all([
        axios.get(`${API}/api/transactions`),
        axios.get(`${API}/api/savings`)
      ]);
      const tx = txRes.data || [];
      const sv = svRes.data || [];
      setItems(tx);
      setSavings(sv);
      calcTotals(tx);
      localStorage.setItem('last_tx_v1', JSON.stringify(tx));
      localStorage.setItem('last_sv_v1', JSON.stringify(sv));
    }catch(err){
      console.warn('API fetch failed, using cache:', err.message || err);
      const cachedTx = JSON.parse(localStorage.getItem('last_tx_v1')||'[]');
      const cachedSv = JSON.parse(localStorage.getItem('last_sv_v1')||'[]');
      setItems(cachedTx);
      setSavings(cachedSv);
      calcTotals(cachedTx);
    }
  }

  function calcTotals(list){
    const income = (list||[]).filter(i=>i.type==='income').reduce((s,n)=>s+Number(n.amount||0),0);
    const expense = (list||[]).filter(i=>i.type==='expense').reduce((s,n)=>s+Number(n.amount||0),0);
    const balance = income - expense;
    setTotals({ income, expense, balance });
    if(budget.auto){
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthIncome = (list||[]).filter(t=>t.type==='income' && new Date(t.date) >= start).reduce((s,n)=>s+Number(n.amount||0),0);
      const autoLimit = Math.round(monthIncome * 0.25);
      if(autoLimit !== Number(budget.monthly)) setBudget(prev=>({ ...prev, monthly: autoLimit }));
    }
  }

  // Transactions
  async function submit(e){
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount||0), date: form.date || new Date().toISOString() };
    try {
      await axios.post(`${API}/api/transactions`, payload);
    } catch(err) {
      console.warn('POST /api/transactions failed, caching locally', err.message || err);
      const txs = JSON.parse(localStorage.getItem('last_tx_v1')||'[]');
      const fake = { _id: 'local-'+Date.now(), ...payload };
      txs.unshift(fake);
      localStorage.setItem('last_tx_v1', JSON.stringify(txs));
    }
    setForm({ type:'expense', title:'', amount:'', date:'', category:'', notes:'' });
    fetchAll();
  }

  // Savings modal handlers
  function openNewSavingModal(){
    setEditing(null);
    setSaveForm({ type:'saving', name:'', amount:'', expiresAt:'', rdMonthly:'', rdMonths:'', rdStart: todayISO() });
    setModalOpen(true);
  }
  function openEditSaving(sv){
    setEditing(sv);
    setSaveForm({
      type: sv.type || 'saving',
      name: sv.name || '',
      amount: sv.amount || '',
      expiresAt: sv.expiresAt ? sv.expiresAt.slice(0,10) : '',
      rdMonthly: sv.rdMonthly || '',
      rdMonths: sv.rdMonths || '',
      rdStart: sv.rdStart ? sv.rdStart.slice(0,10) : todayISO()
    });
    setModalOpen(true);
  }

  async function saveSaving(e){
    e.preventDefault();
    const payload = {
      type: saveForm.type,
      name: saveForm.name,
      amount: Number(saveForm.amount||0),
      expiresAt: saveForm.expiresAt || null,
      rdMonthly: saveForm.type === 'rd' ? Number(saveForm.rdMonthly||0) : null,
      rdMonths: saveForm.type === 'rd' ? Number(saveForm.rdMonths||0) : null,
      rdStart: saveForm.type === 'rd' ? (saveForm.rdStart || new Date().toISOString()) : null,
      status: editing ? editing.status : 'active',
      entries: editing ? (editing.entries || []) : []
    };

    try {
      if(editing && editing._id) {
        // attempt PUT - backend must implement this for edit to persist
        await axios.put(`${API}/api/savings/${editing._id}`, payload);
      } else {
        await axios.post(`${API}/api/savings`, payload);
      }
    } catch(err){
      // If backend doesn't support PUT/DELETE/add-month yet, fall back to localStorage
      console.warn('Saving save failed, falling back to localStorage', err.message || err);
      const cached = JSON.parse(localStorage.getItem('last_sv_v1')||'[]');
      if(editing && editing._id){
        const updated = cached.map(s => s._id === editing._id ? { ...s, ...payload } : s);
        localStorage.setItem('last_sv_v1', JSON.stringify(updated));
      } else {
        const newSv = { _id: 'local-sv-'+Date.now(), ...payload, createdAt: new Date().toISOString() };
        cached.unshift(newSv);
        localStorage.setItem('last_sv_v1', JSON.stringify(cached));
      }
    }

    setModalOpen(false);
    fetchAll();
  }

  // Delete saving (tries backend DELETE, falls back to localStorage)
  async function deleteSaving(sv){
    if(!window.confirm('Delete this saving? This action cannot be undone.')) return;
    if(!sv || !sv._id) return;
    try {
      await axios.delete(`${API}/api/savings/${sv._id}`);
    } catch(err){
      console.warn('DELETE /api/savings/:id failed, falling back to localStorage', err.message || err);
      const cached = JSON.parse(localStorage.getItem('last_sv_v1')||'[]');
      const remain = cached.filter(s => s._id !== sv._id);
      localStorage.setItem('last_sv_v1', JSON.stringify(remain));
    }
    fetchAll();
  }

  // Add monthly deposit to RD (tries backend endpoint then falls back)
  async function addMonthlyDeposit(svId, amount, date){
    if(!svId) return;
    const payload = { amount: Number(amount||0), date: date || new Date().toISOString() };
    try {
      // optional endpoint; backend should implement POST /api/savings/:id/add-month
      await axios.post(`${API}/api/savings/${svId}/add-month`, payload);
    } catch(err){
      console.warn('POST add-month failed or not implemented; using local fallback', err.message || err);
      const cached = JSON.parse(localStorage.getItem('last_sv_v1')||'[]');
      const updated = cached.map(s=>{
        if(s._id === svId){
          const entries = s.entries ? [...s.entries, payload] : [payload];
          return { ...s, entries, amount: (Number(s.amount||0) + Number(amount||0)) };
        }
        return s;
      });
      localStorage.setItem('last_sv_v1', JSON.stringify(updated));
    }
    fetchAll();
  }

  // Close RD / saving: attempt PUT; fallback local
  async function closeSaving(sv){
    if(!sv || !sv._id) return;
    if(!window.confirm('Close this saving/RD? This will mark it as closed.')) return;
    const payload = { ...sv, status: 'closed', closedAt: new Date().toISOString() };
    try {
      // recommended backend: support PUT /api/savings/:id to modify
      await axios.put(`${API}/api/savings/${sv._id}`, payload);
    } catch(err){
      console.warn('PUT close failed; using local fallback', err.message || err);
      const cached = JSON.parse(localStorage.getItem('last_sv_v1')||'[]');
      const updated = cached.map(s => s._id === sv._id ? { ...s, ...payload } : s);
      localStorage.setItem('last_sv_v1', JSON.stringify(updated));
    }
    fetchAll();
  }

  function rdInfo(sv){
    if(!sv || sv.type !== 'rd') return null;
    const monthly = Number(sv.rdMonthly||0);
    const months = Number(sv.rdMonths||0);
    const start = sv.rdStart ? new Date(sv.rdStart) : new Date();
    const entries = sv.entries || [];
    const paidMonths = entries.length;
    const remaining = Math.max(0, months - paidMonths);
    const maturityEstimate = estimateRdMaturity(monthly, months);
    const nextDue = new Date(start); nextDue.setMonth(nextDue.getMonth() + paidMonths);
    return { monthly, months, start, entries, paidMonths, remaining, maturityEstimate, nextDue };
  }

  const txTotalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const svTotalPages = Math.max(1, Math.ceil(savings.length / PAGE_SIZE));
  const txPageItems = items.slice((txPage-1)*PAGE_SIZE, txPage*PAGE_SIZE);
  const svPageItems = savings.slice((svPage-1)*PAGE_SIZE, (svPage)*PAGE_SIZE);

  const Pagination = ({ page, total, onPage }) => (
    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
      <button className="btn small" onClick={()=>onPage(1)} disabled={page===1}>«</button>
      <button className="btn small" onClick={()=>onPage(Math.max(1,page-1))} disabled={page===1}>‹</button>
      <div className="small">Page {page}/{total}</div>
      <button className="btn small" onClick={()=>onPage(Math.min(total,page+1))} disabled={page===total}>›</button>
      <button className="btn small" onClick={()=>onPage(total)} disabled={page===total}>»</button>
    </div>
  );

  return (
    <div className="container">
      <Toasts />
      <div className="card header">
        <div>
          <h2>Expense Tracker </h2>
          <div className="small">Income: {formatCurrency(totals.income)} • Expense: {formatCurrency(totals.expense)} • Balance: {formatCurrency(totals.balance)}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={fetchAll}>Refresh</button>
          <Link to="/reports"  style={{textDecoration:"none"}} className="btn">Reports</Link>
           <Link to="/detailreport" style={{textDecoration:"none"}}  className="btn">Leaderboard</Link>
        </div>
        
      </div>

      <div className="grid">
        <div className="card">
          <h3>Add transaction</h3>
          <form onSubmit={submit} style={{ display:'grid', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              <select className="select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input className="input" placeholder="Amount" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
            </div>
            <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <input className="input" placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} />
            <textarea className="input" placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} />
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{ maxWidth:160 }} />
              <button className="btn" type="submit">Save</button>
            </div>
          </form>

          <h4 style={{ marginTop:14 }}>Transactions</h4>
          <div className="list">
            {txPageItems.map(it=>(
              <div key={it._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f0f3f4' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{it.title || '(no title)'}</div>
                  <div className="small">{new Date(it.date).toLocaleString()}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700 }}>{it.type === 'income' ? '+' : '-'} {formatCurrency(it.amount)}</div>
                  <div className="small">{it.category||''}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Pagination page={txPage} total={txTotalPages} onPage={setTxPage} />
            <div className="small">Total transactions: {items.length}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3>Savings & RD</h3>
            <div>
              <button className="btn" onClick={openNewSavingModal}>+ New saving / RD</button>
            </div>
          </div>

          <div style={{ marginTop:8, marginBottom:8 }}>
            {svPageItems.map(s=>(
              <div key={s._id} style={{ padding:8, borderBottom:'1px solid #f0f3f4', display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
                <div>
                  <div style={{ fontWeight:700 }}>{s.name} {s.type==='rd' ? '(RD)' : ''} {s.status==='closed' && <span className="small" style={{ color:'gray' }}> — closed</span>}</div>
                  <div className="small">{s.type==='rd' ? `Monthly: ${formatCurrency(s.rdMonthly)} · Tenure: ${s.rdMonths} months · Start: ${s.rdStart ? new Date(s.rdStart).toLocaleDateString() : '—'}` : `Amount: ${formatCurrency(s.amount)}`}</div>
                  <div className="small">Created: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</div>
                  {s.type === 'rd' && (() => {
                    const info = rdInfo(s);
                    return (
                      <div style={{ marginTop:6 }}>
                        <div className="small">Paid months: {info.paidMonths} / {info.months} • Remaining: {info.remaining}</div>
                        <div className="small">Est. maturity: {formatCurrency(info.maturityEstimate)}</div>
                        <div className="small">Next due: {info.nextDue.toLocaleDateString()}</div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    {s.type==='rd' && s.status!=='closed' && (
                      <button className="btn small" onClick={()=> {
                        const amt = s.rdMonthly || s.amount || 0;
                        addMonthlyDeposit(s._id, amt, new Date().toISOString());
                      }}>Add month</button>
                    )}
                    {s.status!=='closed' && <button className="btn small" onClick={()=>openEditSaving(s)}>Edit</button>}
                    <button className="btn small" onClick={()=>deleteSaving(s)}>Delete</button>
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    {s.type==='rd' && s.status!=='closed' && (
                      <button className="btn small" onClick={()=>closeSaving(s)}>Close RD</button>
                    )}
                    {s.status==='closed' && <div className="small">Closed: {s.closedAt ? new Date(s.closedAt).toLocaleDateString() : '—'}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Pagination page={svPage} total={svTotalPages} onPage={setSvPage} />
            <div className="small">Total savings: {savings.length}</div>
          </div>

          <h4 style={{ marginTop:12 }}>Monthly budget</h4>
          <form onSubmit={(e)=>{ e.preventDefault(); const v = Number(e.target.budget.value||0); setBudget(prev=>({ ...prev, monthly: v })); localStorage.setItem('budget_v1', JSON.stringify({ ...budget, monthly: v })); }} style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input name="budget" className="input" placeholder="0" defaultValue={budget.monthly||''} />
            <button className="btn" type="submit">Set</button>
          </form>
          <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
            <label className="small">Auto = 25% of this month's income</label>
            <button className="btn small" onClick={()=>{ setBudget(prev=>({ ...prev, auto: !prev.auto })); localStorage.setItem('budget_v1', JSON.stringify({ ...budget, auto: !budget.auto })); }}>{budget.auto ? 'Disable' : 'Enable'}</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div className="card" style={{ width:640, maxWidth:'95%', padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3>{editing ? 'Edit saving' : 'New saving / RD'}</h3>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn" onClick={()=>{ setModalOpen(false); setEditing(null); }}>Close</button>
              </div>
            </div>

            <form onSubmit={saveSaving} style={{ display:'grid', gap:8, marginTop:8 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <label className="small">Type</label>
                <select value={saveForm.type} onChange={e=>setSaveForm({...saveForm, type: e.target.value})}>
                  <option value="saving">Saving (one-time)</option>
                  <option value="rd">RD (recurring deposit)</option>
                </select>
              </div>

              <input className="input" placeholder="Name" value={saveForm.name} onChange={e=>setSaveForm({...saveForm, name: e.target.value})} required />

              {saveForm.type === 'saving' && (
                <>
                  <input className="input" placeholder="Amount" type="number" value={saveForm.amount} onChange={e=>setSaveForm({...saveForm, amount: e.target.value})} />
                  <input className="input" placeholder="Expiry (optional)" type="date" value={saveForm.expiresAt} onChange={e=>setSaveForm({...saveForm, expiresAt: e.target.value})} />
                </>
              )}

              {saveForm.type === 'rd' && (
                <>
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="input" placeholder="Monthly amount" type="number" value={saveForm.rdMonthly} onChange={e=>setSaveForm({...saveForm, rdMonthly: e.target.value})} />
                    <input className="input" placeholder="Months (tenure)" type="number" value={saveForm.rdMonths} onChange={e=>setSaveForm({...saveForm, rdMonths: e.target.value})} />
                    <input className="input" placeholder="Start date" type="date" value={saveForm.rdStart} onChange={e=>setSaveForm({...saveForm, rdStart: e.target.value})} />
                  </div>

                  <div className="small">Estimated maturity: {formatCurrency(estimateRdMaturity(saveForm.rdMonthly, saveForm.rdMonths))}</div>
                </>
              )}

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
                <button className="btn" type="button" onClick={()=>{ setModalOpen(false); setEditing(null); }}>Cancel</button>
                <button className="btn" type="submit">{editing ? 'Save changes' : 'Create saving'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
