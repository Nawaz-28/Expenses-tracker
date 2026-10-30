"use strict";

const STORAGE_KEY = "expense-tracker-transactions";

const form = document.getElementById("form");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const filterMonth = document.getElementById("filter-month");
const filterCategory = document.getElementById("filter-category");
const exportBtn = document.getElementById("export");
const breakdownEl = document.getElementById("breakdown");
const breakdownEmpty = document.getElementById("breakdown-empty");

let transactions = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function money(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function getFiltered() {
  return transactions.filter((t) => {
    const monthOk = !filterMonth.value || t.date.startsWith(filterMonth.value);
    const catOk = filterCategory.value === "all" || t.category === filterCategory.value;
    return monthOk && catOk;
  });
}

function render() {
  const items = getFiltered().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  // Summary
  const income = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  incomeEl.textContent = money(income);
  expenseEl.textContent = money(expense);
  balanceEl.textContent = money(income - expense);

  // List
  listEl.innerHTML = "";
  items.forEach((t) => {
    const li = document.createElement("li");

    const main = document.createElement("div");
    main.className = "tx-main";
    const title = document.createElement("span");
    title.className = "tx-title";
    title.textContent = t.title; // textContent avoids HTML injection
    const meta = document.createElement("span");
    meta.className = "tx-meta";
    meta.textContent = `${t.category} · ${t.date}`;
    main.append(title, meta);

    const right = document.createElement("div");
    right.className = "tx-right";
    const amount = document.createElement("span");
    amount.className = `tx-amount ${t.type}`;
    amount.textContent = `${t.type === "income" ? "+" : "-"}${money(t.amount)}`;
    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => removeTransaction(t.id));
    right.append(amount, del);

    li.append(main, right);
    listEl.appendChild(li);
  });
  emptyEl.style.display = items.length ? "none" : "block";

  renderBreakdown(items);
}

function renderBreakdown(items) {
  const totals = {};
  items
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 0;

  breakdownEl.innerHTML = "";
  entries.forEach(([cat, total]) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const top = document.createElement("div");
    top.className = "bar-top";
    const name = document.createElement("span");
    name.textContent = cat;
    const val = document.createElement("span");
    val.textContent = money(total);
    top.append(name, val);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(total / max) * 100}%`;
    track.appendChild(fill);

    row.append(top, track);
    breakdownEl.appendChild(row);
  });
  breakdownEmpty.style.display = entries.length ? "none" : "block";
}

function addTransaction(e) {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  const title = titleInput.value.trim();
  if (!title || !(amount > 0)) return;

  transactions.push({
    id: Date.now(),
    title,
    amount,
    type: typeInput.value,
    category: categoryInput.value,
    date: dateInput.value,
  });
  save();
  form.reset();
  dateInput.value = todayISO();
  render();
}

function removeTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  save();
  render();
}

function exportCSV() {
  const items = getFiltered();
  if (!items.length) return;
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Date", "Description", "Type", "Category", "Amount"]].concat(
    items.map((t) => [t.date, t.title, t.type, t.category, t.amount.toFixed(2)])
  );
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Fill the category filter from the form's category list
Array.from(categoryInput.options).forEach((o) => {
  const opt = document.createElement("option");
  opt.value = o.value;
  opt.textContent = o.textContent;
  filterCategory.appendChild(opt);
});

dateInput.value = todayISO();
form.addEventListener("submit", addTransaction);
filterMonth.addEventListener("change", render);
filterCategory.addEventListener("change", render);
exportBtn.addEventListener("click", exportCSV);

render();
