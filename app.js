const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'transactions.json');

const CATEGORIES = {
  Rent: 3000,
  Meals: 4500,
  Installment: 2000,
  Expenses: 1500,
  Savings: 1000,
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readTransactions() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function writeTransactions(transactions) {
  await fs.writeFile(DATA_FILE, JSON.stringify(transactions, null, 2), 'utf8');
}

function buildBudgetSummary(transactions) {
  const categoryData = Object.keys(CATEGORIES).map((name) => ({
    category: name,
    allocated: CATEGORIES[name],
    spent: 0,
    remaining: CATEGORIES[name],
  }));

  const summaryByCategory = categoryData.reduce((acc, item) => {
    acc[item.category] = item;
    return acc;
  }, {});

  transactions.forEach((transaction) => {
    const item = summaryByCategory[transaction.category];
    if (item) {
      item.spent += transaction.amount;
      item.remaining = item.allocated - item.spent;
    }
  });

  const totals = categoryData.reduce(
    (acc, item) => {
      acc.allocated += item.allocated;
      acc.spent += item.spent;
      acc.remaining += item.remaining;
      return acc;
    },
    { allocated: 0, spent: 0, remaining: 0 }
  );

  return {
    categories: categoryData,
    totals,
  };
}

app.get('/transactions', async (req, res) => {
  try {
    const transactions = await readTransactions();
    const budget = buildBudgetSummary(transactions);
    res.json({ transactions, budget });
  } catch (error) {
    console.error('GET /transactions error', error);
    res.status(500).json({ error: 'Unable to load transactions.' });
  }
});

app.post('/transactions', async (req, res) => {
  try {
    const { amount, category, description } = req.body;
    const parsedAmount = Number(amount);

    if (!category || !CATEGORIES.hasOwnProperty(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const transaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      category,
      amount: parsedAmount,
      description: description ? String(description).trim() : '',
    };

    const transactions = await readTransactions();
    transactions.push(transaction);
    await writeTransactions(transactions);

    const budget = buildBudgetSummary(transactions);
    res.json({ transaction, budget });
  } catch (error) {
    console.error('POST /transactions error', error);
    res.status(500).json({ error: 'Unable to save transaction.' });
  }
});

app.post('/transactions/reset', async (req, res) => {
  try {
    await writeTransactions([]);
    const budget = buildBudgetSummary([]);
    res.json({ transactions: [], budget });
  } catch (error) {
    console.error('POST /transactions/reset error', error);
    res.status(500).json({ error: 'Unable to reset transactions.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Budget tracker app listening at http://localhost:${PORT}`);
});
