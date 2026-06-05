const budgetTableBody = document.querySelector('#budget-table tbody');
const totalAllocatedLabel = document.querySelector('#total-allocated');
const totalAllocatedFooter = document.querySelector('#total-allocated-footer');
const totalSpentLabel = document.querySelector('#total-spent');
const totalRemainingLabel = document.querySelector('#total-remaining');
const transactionList = document.querySelector('#transaction-list');
const transactionCount = document.querySelector('#transaction-count');
const form = document.querySelector('#transaction-form');
const resetButton = document.querySelector('#reset-button');
const amountInput = document.querySelector('#amount');
const categoryInput = document.querySelector('#category');
const descriptionInput = document.querySelector('#description');
const errorMessage = document.querySelector('#form-error');

async function fetchTransactions() {
  const response = await fetch('/transactions');
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Unable to load transactions.');
  }
  return result;
}

function formatPeso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderBudget(budget) {
  if (!budget || !Array.isArray(budget.categories)) {
    return;
  }

  budgetTableBody.innerHTML = '';
  budget.categories.forEach((category) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category.category}</td>
      <td>${formatPeso(category.allocated)}</td>
      <td>${formatPeso(category.spent)}</td>
      <td class="${category.remaining < 0 ? 'negative' : ''}">${formatPeso(category.remaining)}</td>
    `;
    budgetTableBody.appendChild(row);
  });

  totalAllocatedLabel.textContent = formatPeso(budget.totals.allocated);
  totalAllocatedFooter.textContent = formatPeso(budget.totals.allocated);
  totalSpentLabel.textContent = formatPeso(budget.totals.spent);
  totalRemainingLabel.textContent = formatPeso(budget.totals.remaining);
  totalRemainingLabel.classList.toggle('negative', budget.totals.remaining < 0);
}

function renderTransactions(transactions) {
  transactionList.innerHTML = '';
  const entries = Array.isArray(transactions) ? transactions : [];
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  transactionCount.textContent = `${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`;

  if (!sorted.length) {
    transactionList.innerHTML = '<p>No transactions yet. Add one to start tracking.</p>';
    return;
  }

  sorted.forEach((transaction, index) => {
    const row = document.createElement('div');
    row.className = 'transaction-row';
    row.innerHTML = `
      <span>${sorted.length - index}</span>
      <div class="transaction-details">
        <span class="category">${transaction.category}</span>
        <span class="description">${transaction.description || 'No description'}</span>
      </div>
      <div class="transaction-date">${formatDate(transaction.date)}</div>
      <div class="transaction-amount">${formatPeso(transaction.amount)}</div>
    `;
    transactionList.appendChild(row);
  });
}

async function loadData() {
  errorMessage.textContent = '';

  try {
    const result = await fetchTransactions();
    renderBudget(result.budget);
    renderTransactions(result.transactions);
  } catch (error) {
    console.error(error);
    errorMessage.textContent = error.message || 'Unable to load your budget data.';
  }
}

async function resetTransactions() {
  try {
    const response = await fetch('/transactions/reset', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to reset transactions.');
    }

    renderBudget(result.budget);
    renderTransactions(result.transactions);
    errorMessage.textContent = '';
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

resetButton.addEventListener('click', () => {
  if (window.confirm('Reset all transactions and restore budget balances?')) {
    resetTransactions();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const payload = {
    amount: amountInput.value,
    category: categoryInput.value,
    description: descriptionInput.value,
  };

  try {
    const response = await fetch('/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to save transaction.');
    }

    amountInput.value = '';
    descriptionInput.value = '';
    amountInput.focus();

    renderBudget(result.budget);
    const transactions = await fetchTransactions();
    renderTransactions(transactions.transactions);
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});

loadData();
