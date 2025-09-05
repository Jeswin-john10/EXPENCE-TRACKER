import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Toasts from "../components/Toasts";

const API = import.meta.env.VITE_API_URL || "https://expence-tracker-backend-klge.onrender.com";

function showToast(message, type = "info") {
  window.dispatchEvent(
    new CustomEvent("toast", { detail: { message, type } })
  );
}

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ q: "", from: "", to: "", type: "all" });

  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ date: "", text: "" });
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchNotes();
  }, []);

  // 🔹 Fetch transactions
  async function fetchItems() {
    try {
      const res = await axios.get(API + "/api/transactions");
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err.message);
    }
  }

  // 🔹 Fetch notes
  async function fetchNotes() {
    try {
      const res = await axios.get(API + "/api/notes");
      setNotes(res.data || []);
      checkReminders(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err.message);
    }
  }

  // 🔹 Filter transactions
  function filtered() {
    const { q, from, to, type } = filter;
    const fq = (q || "").toLowerCase();
    const fFrom = from ? new Date(from) : null;
    const fTo = to ? new Date(to) : null;
    return items.filter((it) => {
      if (type !== "all" && it.type !== type) return false;
      if (fFrom && new Date(it.date) < fFrom) return false;
      if (fTo && new Date(it.date) > fTo) return false;
      if (!fq) return true;
      return (
        (it.title || "").toLowerCase().includes(fq) ||
        (it.notes || "").toLowerCase().includes(fq)
      );
    });
  }

  // 🔹 Export PDF
  function exportPDF(list) {
    const doc = new jsPDF({ unit: "pt" });
    doc.setFontSize(14);
    doc.text("JESWIN JOHN EXPENCE REPORT", 40, 40);
    const cols = ["Date", "Type", "Title", "Category", "Notes", "Amount"];
    const rows = (list || []).map((it) => [
      new Date(it.date).toLocaleString(),
      it.type,
      it.title || "",
      it.category || "",
      (it.notes || "").replace(/\n/g, " "),
      Number(it.amount || 0).toFixed(2),
    ]);
    doc.autoTable({
      startY: 60,
      head: [cols],
      body: rows,
      styles: { fontSize: 10 },
    });

    // Add totals
    const totals = calculateTotals(list);
    const finalY = doc.lastAutoTable
      ? doc.lastAutoTable.finalY
      : 60 + rows.length * 20;
    doc.text(`Income: ₹${totals.income.toFixed(2)}`, 40, finalY + 20);
    doc.text(`Expense: ₹${totals.expense.toFixed(2)}`, 40, finalY + 40);
    doc.text(`Balance: ₹${totals.balance.toFixed(2)}`, 40, finalY + 60);

    doc.save("EXPENCE_JESWIN.pdf");
  }

  // 🔹 Notes CRUD
  async function addOrUpdateNote(e) {
    e.preventDefault();
    if (!noteForm.date || !noteForm.text.trim()) {
      showToast("⚠️ Please select a date and enter note text", "warning");
      return;
    }

    try {
      if (editingNote) {
        const res = await axios.put(API + `/api/notes/${editingNote}`, noteForm);
        setNotes(notes.map((n) => (n._id === editingNote ? res.data : n)));
        showToast("✅ Note updated", "success");
        setEditingNote(null);
      } else {
        const res = await axios.post(API + "/api/notes", noteForm);
        setNotes([...notes, res.data]);
        showToast("📝 Note added", "success");
      }
      setNoteForm({ date: "", text: "" });
    } catch (err) {
      console.error("Failed to save note:", err.message);
      showToast("❌ Failed to save note", "error");
    }
  }

  function editNote(note) {
    setNoteForm({ date: note.date, text: note.text });
    setEditingNote(note._id);
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await axios.delete(API + `/api/notes/${id}`);
      setNotes(notes.filter((n) => n._id !== id));
      showToast("🗑️ Note deleted", "info");
    } catch (err) {
      console.error("Failed to delete note:", err.message);
      showToast("❌ Failed to delete note", "error");
    }
  }

  function checkReminders(list = notes) {
    const todayISO = new Date().toISOString().slice(0, 10);
    list.forEach((n) => {
      if (n.date === todayISO) {
        showToast(`🔔 Reminder Note: ${n.text}`, "info");
      }
    });
  }

  // 🔹 Calculate monthly and year-wise totals
  function calculateTotals(list = filtered()) {
    let income = 0,
      expense = 0;
    list.forEach((it) => {
      if (it.type === "income") income += Number(it.amount || 0);
      else if (it.type === "expense") expense += Number(it.amount || 0);
    });
    return { income, expense, balance: income - expense };
  }

  function monthlySummary() {
    const summary = {};
    items.forEach((it) => {
      const d = new Date(it.date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      if (!summary[key]) summary[key] = { income: 0, expense: 0 };
      if (it.type === "income") summary[key].income += Number(it.amount || 0);
      else if (it.type === "expense") summary[key].expense += Number(it.amount || 0);
    });
    return summary;
  }

  function yearlySummary() {
    const summary = {};
    items.forEach((it) => {
      const year = new Date(it.date).getFullYear();
      if (!summary[year]) summary[year] = { income: 0, expense: 0 };
      if (it.type === "income") summary[year].income += Number(it.amount || 0);
      else if (it.type === "expense") summary[year].expense += Number(it.amount || 0);
    });
    return summary;
  }

  const monthly = monthlySummary();
  const yearly = yearlySummary();
  const totals = calculateTotals();

  return (
    <div className="container">
      <Toasts />

      <div
        className="card header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h2 style={{ margin: 0 }}> Reports & Reminders</h2>
        <Link to="/Dashboard" className="btn">← Back</Link>
      </div>

      {/* Filter + Report */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Filter Transactions</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input className="input" placeholder="Search by title or notes" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          <input className="input" type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
          <input className="input" type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
          <select className="select" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <button className="btn" onClick={() => exportPDF(filtered())}>📑 Export PDF</button>
        </div>

        <div className="list" style={{ marginTop: 12 }}>
          {filtered().map((it) => (
            <div key={it._id} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: 8,
              background: it.type === "income" ? "#e8f8f5" : "#fdecea",
              marginBottom: 8
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{it.title || "(no title)"}</div>
                <div className="small">{new Date(it.date).toLocaleString()}</div>
                {it.notes && <div className="small">{it.notes}</div>}
              </div>
              <div style={{ textAlign: "right", fontWeight: 600, fontSize: 15 }}>
                {it.type === "income" ? "+" : "-"} ₹{it.amount}
              </div>
            </div>
          ))}
          {filtered().length === 0 && (
            <div style={{ textAlign: "center", color: "#888", padding: 20 }}>No transactions found.</div>
          )}
        </div>

        {/* Totals */}
        <div style={{ marginTop: 16, fontWeight: 600 }}>
          <div>Income: ₹{totals.income.toFixed(2)}</div>
          <div>Expense: ₹{totals.expense.toFixed(2)}</div>
          <div>Balance: ₹{totals.balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>📅 Monthly Summary</h3>
        {Object.keys(monthly).length === 0 && <div>No data</div>}
        {Object.entries(monthly).map(([month, data]) => (
          <div key={month} style={{ padding: 6 }}>
            <strong>{month}:</strong> Income: ₹{data.income.toFixed(2)}, Expense: ₹{data.expense.toFixed(2)}, Balance: ₹{(data.income - data.expense).toFixed(2)}
          </div>
        ))}
      </div>

      {/* Yearly Summary */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>📆 Yearly Summary</h3>
        {Object.keys(yearly).length === 0 && <div>No data</div>}
        {Object.entries(yearly).map(([year, data]) => (
          <div key={year} style={{ padding: 6 }}>
            <strong>{year}:</strong> Income: ₹{data.income.toFixed(2)}, Expense: ₹{data.expense.toFixed(2)}, Balance: ₹{(data.income - data.expense).toFixed(2)}
          </div>
        ))}
      </div>

      {/* Reminder Notes */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>📝 Reminder Notes</h3>
        <form onSubmit={addOrUpdateNote} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input type="date" className="input" value={noteForm.date} onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })} />
          <input className="input" placeholder="Enter note text" value={noteForm.text} onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })} />
          <button type="submit" className="btn">{editingNote ? "Update" : "Add"}</button>
        </form>

        <div className="list">
          {notes.map((n) => (
            <div key={n._id} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 14px",
              border: "1px solid #eee",
              borderRadius: 6,
              marginBottom: 8,
              background: n.date === new Date().toISOString().slice(0, 10) ? "#fff3cd" : "#f8f9fa"
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{n.text} <span style={{ color: "#888" }}>({n.date})</span></div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" onClick={() => editNote(n)}>✏️</button>
                <button className="btn" onClick={() => deleteNote(n._id)}>❌</button>
              </div>
            </div>
          ))}
          {notes.length === 0 && <div style={{ textAlign: "center", color: "#888", padding: 20 }}>No reminder notes.</div>}
        </div>
      </div>
    </div>
  );
}
