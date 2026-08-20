// ------ State ------
let currentMonth = new Date();
let expenses = [];
let allExpenses = [];
let budgetItems = [];
let nextBudgetItems = [];
let incomeEntries = [];
let tags = []; // All user tags
let currentFilter = "";
let currentTagFilter = "";
let searchQuery = "";
let userSettings = { month_start_day: 1, month_end_day: 0, currency: "Rs" };
let selectedExpenseTags = []; // Tags selected for new expense
let editSelectedExpenseTags = []; // Tags selected for editing expense
let inHandAmount = 0; // Actual in-hand cash amount (base)
let inHandBaseSpent = 0; // Total spent at the time in-hand was saved

