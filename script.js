// Global variables
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let budget = parseFloat(localStorage.getItem('budget')) || 0;
let isRecording = false;
let recognition = null;

// DOM elements
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const notesInput = document.getElementById('notes');
const budgetInput = document.getElementById('budgetInput');
const setBudgetBtn = document.getElementById('setBudgetBtn');
const totalSpentEl = document.getElementById('totalSpent');
const remainingBalanceEl = document.getElementById('remainingBalance');
const currentBudgetEl = document.getElementById('currentBudget');
const budgetWarning = document.getElementById('budgetWarning');
const expensesList = document.getElementById('expensesList');
const expensesCount = document.getElementById('expensesCount');
const filterCategory = document.getElementById('filterCategory');
const clearAllBtn = document.getElementById('clearAllBtn');
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const darkModeToggle = document.getElementById('darkModeToggle');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Load saved data
    budgetInput.value = budget;
    updateBudgetDisplay();
    renderExpenses();
    
    // Set current month for date input (prevent future dates)
    dateInput.max = today;
    
    // Event listeners
    initializeEventListeners();
    initializeVoiceRecognition();
    initializeDarkMode();
});

// Event Listeners
function initializeEventListeners() {
    expenseForm.addEventListener('submit', handleAddExpense);
    setBudgetBtn.addEventListener('click', handleSetBudget);
    budgetInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSetBudget();
    });
    clearAllBtn.addEventListener('click', handleClearAll);
    filterCategory.addEventListener('change', renderExpenses);
}

// 1. Add Expense Handler
function handleAddExpense(e) {
    e.preventDefault();
    
    const expense = {
        id: Date.now().toString(),
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        date: dateInput.value,
        notes: notesInput.value.trim()
    };
    
    expenses.unshift(expense); // Add to beginning for newest first
    saveExpenses();
    updateBudgetDisplay();
    renderExpenses();
    
    // Reset form
    expenseForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Show success animation
    amountInput.style.borderColor = '#27ae60';
    setTimeout(() => {
        amountInput.style.borderColor = '';
    }, 1000);
}

// 2. Budget Handler (FIXED)
function handleSetBudget() {
    const newBudget = parseFloat(budgetInput.value) || 0;
    budget = newBudget;
    localStorage.setItem('budget', budget);
    updateBudgetDisplay();
    
    // Visual feedback
    budgetInput.style.borderColor = '#27ae60';
    setTimeout(() => {
        budgetInput.style.borderColor = '';
    }, 1000);
    
    // Show confirmation
    budgetInput.placeholder = `Budget set to $${budget.toFixed(2)}`;
    setTimeout(() => {
        budgetInput.placeholder = 'Enter budget';
    }, 2000);
}

// 3. Update Budget Display
function updateBudgetDisplay() {
    const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    totalSpentEl.textContent = `$${totalSpent.toFixed(2)}`;
    currentBudgetEl.textContent = `$${budget.toFixed(2)}`;
    
    const remaining = budget - totalSpent;
    remainingBalanceEl.textContent = `$${Math.max(0, remaining).toFixed(2)}`;
    remainingBalanceEl.style.color = remaining >= 0 ? '#27ae60' : '#e74c3c';
    
    // Budget warning
    if (budget > 0 && totalSpent > budget) {
        budgetWarning.textContent = `Budget exceeded by $${(totalSpent - budget).toFixed(2)}!`;
        budgetWarning.classList.remove('hidden');
    } else {
        budgetWarning.classList.add('hidden');
    }
}

// 4. Render Expenses
function renderExpenses() {
    const filter = filterCategory.value;
    const filteredExpenses = filter === 'all' ?
        expenses :
        expenses.filter(exp => exp.category === filter);
    
    expensesCount.textContent = filteredExpenses.length;
    
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No expenses yet. Add one above! 🎉</p>';
        return;
    }
    
    expensesList.innerHTML = filteredExpenses.map(expense => `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-header">
                <div>
                    <div class="expense-amount">$${parseFloat(expense.amount).toFixed(2)}</div>
                    <span class="expense-category">${expense.category}</span>
                </div>
                <div style="text-align: right;">
                    <div class="expense-date">${formatDate(expense.date)}</div>
                    <button class="delete-btn" onclick="deleteExpense('${expense.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            ${expense.notes ? `<div class="expense-notes">${expense.notes}</div>` : ''}
        </div>
    `).join('');
}

// 5. Delete Expense
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveExpenses();
        updateBudgetDisplay();
        renderExpenses();
    }
}

// 6. Clear All Expenses
function handleClearAll() {
    if (confirm('Delete ALL expenses? This cannot be undone!')) {
        expenses = [];
        saveExpenses();
        updateBudgetDisplay();
        renderExpenses();
    }
}

// 7. Save to LocalStorage
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// 8. Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// 9. Voice Recognition
function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        voiceBtn.style.display = 'none';
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceStatus.textContent = 'Listening... Speak your expense (e.g., "Spent 25 on food")';
        voiceStatus.classList.remove('hidden');
        voiceStatus.classList.add('listening');
    };
    
    recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        const liveText = finalTranscript || interimTranscript;
        voiceStatus.textContent = liveText || 'Listening...';
        
        if (finalTranscript) {
            parseVoiceCommand(finalTranscript);
        }
    };
    
    recognition.onend = function() {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceStatus.classList.add('hidden');
    };
    
    voiceBtn.addEventListener('click', function() {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

// 10. Parse Voice Command
function parseVoiceCommand(text) {
    text = text.toLowerCase();
    
    // Extract amount (numbers)
    const amountMatch = text.match(/(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    
    // Extract category
    const categories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'other'];
    let category = 'Other';
    
    for (let cat of categories) {
        if (text.includes(cat)) {
            category = cat.charAt(0).toUpperCase() + cat.slice(1);
            break;
        }
    }
    
    if (amount > 0) {
        amountInput.value = amount;
        categorySelect.value = category;
        amountInput.focus();
    }
}

// 11. Dark Mode
function initializeDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        darkModeToggle.innerHTML = isDark ?
            '<i class="fas fa-sun"></i>' :
            '<i class="fas fa-moon"></i>';
    });
}
// ======================
// 12. PWA SERVICE WORKER
// ======================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/Expense-Treacker/service-worker.js")
            .then((registration) => {
                console.log("✅ Service Worker Registered:", registration);

                // Optional: Detect updates
                registration.onupdatefound = () => {
                    console.log("🔄 New update found");
                };
            })
            .catch((error) => {
                console.log("❌ Service Worker Registration Failed:", error);
            });
    });
}