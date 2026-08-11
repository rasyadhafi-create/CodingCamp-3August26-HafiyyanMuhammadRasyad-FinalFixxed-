/* ============================================================
   Spenchart — js/script.js
   Single-file SPA: all modules live here as plain-object namespaces.
   DOM-dependent code is guarded with typeof document !== "undefined"
   so this file can be required() in Node.js for property-based tests.
   ============================================================ */

"use strict";

/* ============================================================
   StorageModule — namespaced localStorage read/write/clear
   ============================================================ */
const StorageModule = {
  PREFIX: "spenchart_",

  load(key) {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  },

  save(key, value) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // QuotaExceededError or other write failure — caller handles UI feedback
      throw e;
    }
  },

  remove(key) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (_e) { /* ignore */ }
  },

  clearAll() {
    if (typeof localStorage === "undefined") return;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};

/* ============================================================
   StateModule — in-memory app state, hydrated from StorageModule
   ============================================================ */
const StateModule = {
  transactions: [],
  budgets: { global: null, categories: {} },
  categories: [],  // custom categories
  profile: { name: "", avatar: "avatar_01" },
  currency: "IDR",
  theme: "light",

  init() {
    const storedTx = StorageModule.load("transactions");
    this.transactions = Array.isArray(storedTx) ? storedTx : [];

    const storedBudgets = StorageModule.load("budgets");
    this.budgets = storedBudgets && typeof storedBudgets === "object"
      ? storedBudgets
      : { global: null, categories: {} };

    const storedCats = StorageModule.load("categories");
    this.categories = Array.isArray(storedCats) ? storedCats : [];

    const storedProfile = StorageModule.load("profile");
    this.profile = storedProfile && typeof storedProfile === "object"
      ? storedProfile
      : { name: "", avatar: "avatar_01" };

    const storedCurrency = StorageModule.load("currency");
    this.currency = typeof storedCurrency === "string" ? storedCurrency : "IDR";

    const storedTheme = StorageModule.load("theme");
    this.theme = storedTheme === "dark" ? "dark" : "light";
  },
};

/* ============================================================
   RouterModule — SPA tab switching via CSS display toggling
   ============================================================ */
const RouterModule = {
  currentTab: "dashboard",

  navigate(tabId) {
    if (typeof document === "undefined") return;
    // No-op if already on the requested tab (Requirement 2.5)
    if (tabId === this.currentTab && document.getElementById("tab-" + tabId)) return;
    const tabs = document.querySelectorAll(".tab-section");
    tabs.forEach((section) => section.classList.add("hidden"));

    const target = document.getElementById("tab-" + tabId);
    if (target) {
      target.classList.remove("hidden");
    } else {
      // Fallback to dashboard
      const dashboard = document.getElementById("tab-dashboard");
      if (dashboard) dashboard.classList.remove("hidden");
      tabId = "dashboard";
    }

    // Update bottom-nav active indicator
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => item.classList.remove("active"));
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add("active");

    this.currentTab = tabId;
    if (tabId === "transactions") RenderModule.renderTransactionList(TransactionModule.getAll());
    if (tabId === "analytics") RenderModule.renderAnalytics();
    if (tabId === "settings") RenderModule.renderSettings();
  },

  init() {
    if (typeof document === "undefined") return;
    // Wire bottom-nav click handlers
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const tab = item.getAttribute("data-tab");
        if (tab) this.navigate(tab);
      });
    });
    this.navigate("dashboard");
  },
};

/* ============================================================
   ThemeModule — light/dark theme application and persistence
   ============================================================ */
const ThemeModule = {
  apply(theme) {
    const validTheme = (theme === "dark") ? "dark" : "light";
    StateModule.theme = validTheme;
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", validTheme);
      // Update theme toggle button icon (use Lucide icons)
      const btn = document.getElementById("theme-switcher");
      if (btn) {
        btn.innerHTML = validTheme === "dark" ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
    StorageModule.save("theme", validTheme);
    // Re-render charts with new theme colors
    ChartModule.rerenderAll();
  },

  init() {
    const stored = StorageModule.load("theme");
    const theme = (stored === "light" || stored === "dark") ? stored : "light";
    this.apply(theme);
  },

  toggle() {
    const next = StateModule.theme === "dark" ? "light" : "dark";
    this.apply(next);
  },
};

/* ============================================================
   ValidatorModule — form input validation rules
   ============================================================ */
const ValidatorModule = {
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999999.99,
  NAME_MAX: 100,
  CATEGORY_MAX: 50,
  PROFILE_NAME_MAX: 50,

  // Task #12: Capitalize first letter of each word for consistency
  capitalizeWords(str) {
    return String(str || "")
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  validateTransaction(fields) {
    const errors = {};
    const name = (fields.item_name || "").trim();
    if (!name) {
      errors.item_name = "Item name is required.";
    } else if (name.length > this.NAME_MAX) {
      errors.item_name = `Item name must be ${this.NAME_MAX} characters or fewer.`;
    }

    const amount = parseFloat(fields.amount);
    if (fields.amount === "" || fields.amount === null || fields.amount === undefined) {
      errors.amount = "Amount is required.";
    } else if (isNaN(amount) || amount < this.AMOUNT_MIN || amount > this.AMOUNT_MAX) {
      errors.amount = `Amount must be a number between ${this.AMOUNT_MIN} and ${this.AMOUNT_MAX}.`;
    }

    const type = fields.type;
    if (!type || (type !== "income" && type !== "expense")) {
      errors.type = "Transaction type is required.";
    }

    const category = (fields.category || "").trim();
    if (!category) {
      errors.category = "Category is required.";
    }

    if (category.toLowerCase() === "custom") {
      const custom = (fields.custom_category || "").trim();
      if (!custom) {
        errors.custom_category = "Custom category name is required.";
      } else if (custom.length > this.CATEGORY_MAX) {
        errors.custom_category = `Custom category name must be ${this.CATEGORY_MAX} characters or fewer.`;
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },

  validateBudget(value) {
    const errors = {};
    const num = parseFloat(value);
    if (value === "" || value === null || value === undefined) {
      errors.budget = "Budget value is required.";
    } else if (isNaN(num) || num < this.AMOUNT_MIN || num > this.AMOUNT_MAX) {
      errors.budget = `Budget must be a number between ${this.AMOUNT_MIN} and ${this.AMOUNT_MAX}.`;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },

  validateCategoryName(name, existingNames) {
    const errors = {};
    const trimmed = (name || "").trim();
    if (!trimmed) {
      errors.name = "Category name is required.";
    } else if (trimmed.length > this.CATEGORY_MAX) {
      errors.name = `Category name must be ${this.CATEGORY_MAX} characters or fewer.`;
    } else {
      const lower = trimmed.toLowerCase();
      const existing = Array.isArray(existingNames) ? existingNames : [];
      const duplicate = existing.some((n) => n.toLowerCase() === lower);
      if (duplicate) {
        errors.name = "A category with this name already exists.";
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },

  validateProfileName(name) {
    const errors = {};
    const trimmed = (name || "").trim();
    if (!trimmed) {
      errors.name = "Display name is required.";
    } else if (trimmed.length > this.PROFILE_NAME_MAX) {
      errors.name = `Display name must be ${this.PROFILE_NAME_MAX} characters or fewer.`;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },
};

/* ============================================================
   TransactionModule — CRUD operations on transactions
   ============================================================ */
const TransactionModule = {
  getAll() {
    return StateModule.transactions.slice();
  },

  add(fields) {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString();
    // Task #5: Use provided date or default to today
    const date = fields.date || new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    
    // Task #12: Capitalize category names for consistency
    let categoryName = fields.category === "Custom"
      ? (fields.custom_category || "").trim()
      : fields.category;
    categoryName = ValidatorModule.capitalizeWords(categoryName);
    
    const transaction = {
      id,
      item_name: (fields.item_name || "").trim(),
      amount: parseFloat(fields.amount),
      type: fields.type,
      category: categoryName,
      date,
    };
    StateModule.transactions.push(transaction);
    StorageModule.save("transactions", StateModule.transactions);
    return transaction;
  },

  remove(id) {
    const index = StateModule.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const [removed] = StateModule.transactions.splice(index, 1);
    removed._originalIndex = index; // stash for restore
    StorageModule.save("transactions", StateModule.transactions);
    return removed;
  },

  restore(transaction) {
    const idx = typeof transaction._originalIndex === "number"
      ? transaction._originalIndex
      : StateModule.transactions.length;
    const clone = Object.assign({}, transaction);
    delete clone._originalIndex;
    StateModule.transactions.splice(idx, 0, clone);
    StorageModule.save("transactions", StateModule.transactions);
  },

  getRecent(n) {
    return StateModule.transactions
      .slice()
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .slice(0, n);
  },
};

/* ============================================================
   FilterModule — search, category, month filter logic
   ============================================================ */
const FilterModule = {
  applyFilters(transactions, filters) {
    let result = transactions.slice();
    const f = filters || {};

    if (f.text && f.text.trim()) {
      const query = f.text.trim().toLowerCase();
      result = result.filter((t) =>
        (t.item_name || "").toLowerCase().includes(query)
      );
    }

    if (f.category && f.category !== "All Categories") {
      result = result.filter((t) => t.category === f.category);
    }

    if (f.month && f.month !== "All Months") {
      // f.month is "YYYY-MM"
      result = result.filter((t) => (t.date || "").slice(0, 7) === f.month);
    }

    return result;
  },

  getDistinctCategories(transactions) {
    const seen = new Set();
    (transactions || []).forEach((t) => {
      if (t.category) seen.add(t.category);
    });
    return Array.from(seen).sort();
  },

  getDistinctMonths(transactions) {
    const seen = new Set();
    (transactions || []).forEach((t) => {
      if (t.date) seen.add(t.date.slice(0, 7));
    });
    return Array.from(seen).sort().reverse(); // descending
  },
};

/* ============================================================
   DateFilterModule — date range filtering (Task #7 & #8)
   ============================================================ */
const DateFilterModule = {
  filterByDateRange(transactions, rangeType, customStart, customEnd) {
    if (!transactions || !transactions.length) return [];
    
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    let startDate, endDate;
    
    switch (rangeType) {
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        endDate = today;
        break;
      
      case "last-month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().slice(0, 10);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate = lastMonthEnd.toISOString().slice(0, 10);
        break;
      
      case "last-3-months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().slice(0, 10);
        endDate = today;
        break;
      
      case "last-7-days":
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toISOString().slice(0, 10);
        endDate = today;
        break;
      
      case "custom":
        if (!customStart || !customEnd) return transactions;
        startDate = customStart;
        endDate = customEnd;
        break;
      
      case "all":
      default:
        return transactions;
    }
    
    return transactions.filter(t => {
      const tDate = t.date || "";
      return tDate >= startDate && tDate <= endDate;
    });
  },
};

/* ============================================================
   SortModule — sort order application
   ============================================================ */
const SortModule = {
  apply(transactions, sortKey) {
    const arr = (transactions || []).slice();
    switch (sortKey) {
      case "oldest":
        return arr.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
      case "highest":
        return arr.sort((a, b) => b.amount - a.amount);
      case "lowest":
        return arr.sort((a, b) => a.amount - b.amount);
      case "category":
        return arr.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      case "newest":
      default:
        return arr.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    }
  },
};

/* ============================================================
   DateRangeFilterManager — Reusable date range filter handler
   Prevents code duplication across dashboard, transactions, analytics
   ============================================================ */
const DateRangeFilterManager = {
  /**
   * Setup date range filter UI and return a handler to get filtered transactions
   * @param {string} selectId - ID of the date range select element
   * @param {string} customRangeId - ID of the custom date range container
   * @param {string} startDateId - ID of the start date input
   * @param {string} endDateId - ID of the end date input
   * @param {Function} onChangeCallback - Called when filter changes with filtered transactions
   */
  setup(selectId, customRangeId, startDateId, endDateId, onChangeCallback) {
    if (typeof document === "undefined") return null;
    
    const select = document.getElementById(selectId);
    const customRange = document.getElementById(customRangeId);
    const startDate = document.getElementById(startDateId);
    const endDate = document.getElementById(endDateId);
    
    if (!select) return null;
    
    const state = {
      rangeType: select.value || "all",
      customStart: null,
      customEnd: null,
    };
    
    const applyFilter = () => {
      const filtered = DateFilterModule.filterByDateRange(
        StateModule.transactions,
        state.rangeType,
        state.customStart,
        state.customEnd
      );
      if (onChangeCallback) onChangeCallback(filtered);
    };
    
    // Show/hide custom date range inputs
    select.addEventListener("change", () => {
      state.rangeType = select.value;
      if (customRange) {
        if (state.rangeType === "custom") {
          customRange.classList.remove("hidden");
        } else {
          customRange.classList.add("hidden");
          applyFilter();
        }
      } else {
        applyFilter();
      }
    });
    
    // Handle custom date range changes
    if (startDate && endDate && customRange) {
      startDate.addEventListener("change", () => {
        state.customStart = startDate.value;
        if (state.rangeType === "custom" && state.customEnd) {
          applyFilter();
        }
      });
      
      endDate.addEventListener("change", () => {
        state.customEnd = endDate.value;
        if (state.rangeType === "custom" && state.customStart) {
          applyFilter();
        }
      });
    }
    
    // Return interface to manually trigger filter
    return {
      applyFilter,
      getState: () => ({ ...state }),
    };
  },
};

/* ============================================================
   CategoryIconModule — Icon mapping for categories using Lucide
   ============================================================ */
const CategoryIconModule = {
  // Expense category icons
  EXPENSE_ICONS: {
    "Food": "utensils",
    "Transport": "car",
    "Fun": "smile",
    "Shopping": "shopping-bag",
    "Health": "heart-pulse",
    "Education": "graduation-cap",
    "Entertainment": "tv",
    "Bills": "receipt",
  },
  
  // Income category icons
  INCOME_ICONS: {
    "Salary": "briefcase",
    "Bonus": "gift",
    "Investment": "trending-up",
    "Freelance": "laptop",
    "Gift": "heart",
    "Other": "plus-circle",
  },
  
  /**
   * Get icon name for a category
   * @param {string} category - Category name
   * @param {string} type - Transaction type ("income" or "expense")
   * @returns {string} Lucide icon name
   */
  getIcon(category, type) {
    if (!category) return "circle";
    
    // Custom categories - use folder icon
    if (category.toLowerCase() === "custom") {
      return "folder-plus";
    }
    
    // Check direct match first
    const iconMap = type === "income" ? this.INCOME_ICONS : this.EXPENSE_ICONS;
    if (iconMap[category]) {
      return iconMap[category];
    }
    
    // Fallback: fuzzy match by keyword
    const catLower = category.toLowerCase();
    
    // Expense keywords
    if (catLower.includes("food") || catLower.includes("meal") || catLower.includes("restaurant")) return "utensils";
    if (catLower.includes("transport") || catLower.includes("travel") || catLower.includes("commute")) return "car";
    if (catLower.includes("fun") || catLower.includes("hobby")) return "smile";
    if (catLower.includes("shop") || catLower.includes("retail")) return "shopping-bag";
    if (catLower.includes("health") || catLower.includes("medical") || catLower.includes("fitness")) return "heart-pulse";
    if (catLower.includes("education") || catLower.includes("school") || catLower.includes("course")) return "graduation-cap";
    if (catLower.includes("entertainment") || catLower.includes("movie") || catLower.includes("game")) return "tv";
    if (catLower.includes("bill") || catLower.includes("utility") || catLower.includes("rent")) return "receipt";
    
    // Income keywords
    if (catLower.includes("salary") || catLower.includes("wage")) return "briefcase";
    if (catLower.includes("bonus") || catLower.includes("commission")) return "gift";
    if (catLower.includes("investment") || catLower.includes("dividend") || catLower.includes("stock")) return "trending-up";
    if (catLower.includes("freelance") || catLower.includes("gig") || catLower.includes("project")) return "laptop";
    if (catLower.includes("gift") || catLower.includes("donation")) return "heart";
    
    // Default fallback
    return type === "income" ? "arrow-down-left" : "tag";
  },
  
  /**
   * Build HTML for icon + text category option/badge
   * @param {string} category - Category name
   * @param {string} type - Transaction type
   * @param {boolean} includeText - Whether to include text label
   * @returns {string} HTML string
   */
  buildIconLabel(category, type, includeText = true) {
    const icon = this.getIcon(category, type);
    const iconHTML = `<i data-lucide="${icon}"></i>`;
    return includeText ? `${iconHTML} ${category}` : iconHTML;
  },
};

/* ============================================================
   BudgetModule — budget limit computation and progress
   ============================================================ */
const BudgetModule = {
  computeMonthlyExpense(transactions, year, month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return (transactions || [])
      .filter((t) => t.type === "expense" && (t.date || "").startsWith(prefix))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  },

  computeProgress(spent, limit) {
    if (!limit || limit <= 0) return 0;
    return Math.min((spent / limit) * 100, 100);
  },

  getProgressState(spent, limit) {
    if (!limit || limit <= 0) return "under";
    const ratio = spent / limit;
    if (ratio > 1) return "over";
    if (ratio >= 0.8) return "warning";
    return "under";
  },
};

/* ============================================================
   ChartModule — Chart.js integration (donut + line charts)
   ============================================================ */
const ChartModule = {
  _instances: {}, // canvasId → Chart instance
  _PALETTE: [
    "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
  ],

  buildCategoryData(transactions) {
    const map = {};
    (transactions || []).forEach((t) => {
      if (t.type !== "expense") return;
      if (!map[t.category]) map[t.category] = 0;
      map[t.category] += t.amount || 0;
    });
    return Object.entries(map).map(([label, amount], i) => ({
      label,
      amount,
      color: this._PALETTE[i % this._PALETTE.length],
    }));
  },

  renderDonut(canvasId, categoryData) {
    if (typeof document === "undefined") return;
    if (typeof window === "undefined" || !window.Chart) {
      const container = document.getElementById(canvasId);
      if (container && container.parentElement) {
        container.parentElement.insertAdjacentHTML(
          "beforeend",
          '<p class="chart-empty-state">Chart unavailable — please check your internet connection.</p>'
        );
      }
      return;
    }

    if (this._instances[canvasId]) {
      this._instances[canvasId].destroy();
      delete this._instances[canvasId];
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const labels = categoryData.map((d) => d.label);
    const data = categoryData.map((d) => d.amount);
    const colors = categoryData.map((d) => d.color);
    const total = data.reduce((s, v) => s + v, 0);

    let selectedIndex = null;

    this._instances[canvasId] = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 16,
        }],
      },
      options: {
        cutout: 0,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        onClick: (_evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          if (selectedIndex === idx) {
            selectedIndex = null;
            // hide detail
            const detailEl = document.getElementById(canvasId.replace("-canvas", "-detail"));
            if (detailEl) detailEl.classList.add("hidden");
          } else {
            selectedIndex = idx;
            const pct = total > 0 ? ((data[idx] / total) * 100).toFixed(1) : "0.0";
            const detailEl = document.getElementById(canvasId.replace("-canvas", "-detail"));
            if (detailEl) {
              detailEl.textContent = `${labels[idx]}: ${CurrencyModule.format(data[idx], StateModule.currency)} (${pct}%)`;
              detailEl.classList.remove("hidden");
            }
          }
        },
      },
    });
  },

  renderLine(canvasId, dataPoints) {
    if (typeof document === "undefined") return;
    if (typeof window === "undefined" || !window.Chart) return;

    if (this._instances[canvasId]) {
      this._instances[canvasId].destroy();
      delete this._instances[canvasId];
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const style = (typeof getComputedStyle !== "undefined")
      ? getComputedStyle(document.documentElement)
      : null;
    const textColor = style ? style.getPropertyValue("--color-text").trim() : "#0F172A";
    const mutedColor = style ? style.getPropertyValue("--color-muted").trim() : "#64748B";
    const accentColor = style ? style.getPropertyValue("--color-accent").trim() : "#2563EB";

    this._instances[canvasId] = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: dataPoints.map((d) => d.label),
        datasets: [{
          data: dataPoints.map((d) => d.value),
          borderColor: accentColor,
          backgroundColor: accentColor + "33",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: mutedColor },
            grid: { color: mutedColor + "33" },
          },
          y: {
            ticks: { color: mutedColor },
            grid: { color: mutedColor + "33" },
            beginAtZero: true,
          },
        },
      },
    });
  },

  renderLegend(legendId, categoryData) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(legendId);
    if (!el) return;
    if (!categoryData || !categoryData.length) {
      el.innerHTML = "";
      return;
    }
    // Filter out categories with 0 amount (Task #2)
    const filteredData = categoryData.filter((d) => d.amount > 0);
    el.innerHTML = filteredData.map((d) => {
      // Determine transaction type from context (assume expense for charts)
      const icon = CategoryIconModule.getIcon(d.label, "expense");
      return `<span class="chart-legend-item">` +
        `<span class="chart-legend-dot" style="background-color:${d.color};"></span>` +
        `<i data-lucide="${icon}" class="chart-legend-icon"></i>` +
        `<span class="chart-legend-name">${RenderModule._escapeHTML ? RenderModule._escapeHTML(d.label) : d.label}</span>` +
      `</span>`;
    }).join("");
    
    // Re-initialize Lucide icons for dynamically added legend
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  rerenderAll() {
    // Stub: will be fully implemented when RenderModule is wired up
  },
};

/* ============================================================
   ToastModule — toast notification display and undo queue
   ============================================================ */
const ToastModule = {
  _timerId: null,
  _undoCallback: null,

  show(message, undoCallback) {
    if (typeof document === "undefined") return;

    // Dismiss any existing toast immediately
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }

    this._undoCallback = undoCallback || null;

    const container = document.getElementById("toast-container");
    const msgEl = document.getElementById("toast-message");
    const progressEl = document.getElementById("toast-progress");

    if (!container || !msgEl) return;

    msgEl.textContent = message;

    // Reset and restart progress animation
    if (progressEl) {
      progressEl.style.animation = "none";
      // Force reflow to restart animation
      void progressEl.offsetWidth;
      progressEl.style.animation = "";
    }

    container.classList.remove("hidden");

    this._timerId = setTimeout(() => {
      this._permanentDelete();
    }, 5000);
  },

  _permanentDelete() {
    this._undoCallback = null;
    this._timerId = null;
    this._dismiss();
  },

  _dismiss() {
    if (typeof document === "undefined") return;
    const container = document.getElementById("toast-container");
    if (container) container.classList.add("hidden");
  },

  undo() {
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
    if (this._undoCallback) {
      this._undoCallback();
      this._undoCallback = null;
    }
    this._dismiss();
  },
};

/* ============================================================
   DataManagerModule — JSON backup/restore and CSV export
   ============================================================ */
const DataManagerModule = {
  exportJSON() {
    if (typeof localStorage === "undefined") return;
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(StorageModule.PREFIX)) {
        backup[k] = localStorage.getItem(k);
      }
    }
    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    this._triggerDownload(json, `backup-${date}.json`, "application/json");
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error("File exceeds the 10 MB size limit."));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        let parsed;
        try {
          parsed = JSON.parse(e.target.result);
        } catch (_err) {
          reject(new Error("Invalid JSON format."));
          return;
        }
        // Schema validation: must be an object with at least one spenchart_ key
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("Invalid backup schema."));
          return;
        }
        // Snapshot current state for rollback
        const snapshot = {};
        for (const k of Object.keys(parsed)) {
          if (k.startsWith(StorageModule.PREFIX)) {
            snapshot[k] = localStorage.getItem(k);
          }
        }
        try {
          for (const [k, v] of Object.entries(parsed)) {
            if (k.startsWith(StorageModule.PREFIX)) {
              localStorage.setItem(k, v);
            }
          }
        } catch (writeErr) {
          // Rollback
          for (const [k, v] of Object.entries(snapshot)) {
            if (v === null) localStorage.removeItem(k);
            else localStorage.setItem(k, v);
          }
          reject(new Error("Write failed; original data preserved."));
          return;
        }
        resolve();
      };
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsText(file);
    });
  },

  escapeCSVField(value) {
    const str = String(value === null || value === undefined ? "" : value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  },

  exportCSV() {
    const transactions = StateModule.transactions;
    const header = ["date", "item_name", "category", "type", "amount"].join(",");
    const rows = transactions.map((t) => [
      this.escapeCSVField(t.date || ""),
      this.escapeCSVField(t.item_name || ""),
      this.escapeCSVField(t.category || ""),
      this.escapeCSVField(t.type || ""),
      this.escapeCSVField(typeof t.amount === "number" ? t.amount.toFixed(2) : "0.00"),
    ].join(","));
    const csv = [header, ...rows].join("\r\n");
    try {
      this._triggerDownload(csv, "transactions.csv", "text/csv");
    } catch (e) {
      if (typeof document !== "undefined") {
        alert("Export failed: " + e.message);
      }
    }
  },

  _triggerDownload(content, filename, mimeType) {
    if (typeof document === "undefined") return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

/* ============================================================
   ProfileModule — display name and avatar persistence
   ============================================================ */
const ProfileModule = {
  AVATAR_OPTIONS: [
    { key: "avatar_01", emoji: "😊" },
    { key: "avatar_02", emoji: "🦊" },
    { key: "avatar_03", emoji: "🐼" },
    { key: "avatar_04", emoji: "🦁" },
    { key: "avatar_05", emoji: "🐸" },
    { key: "avatar_06", emoji: "🐨" },
    { key: "avatar_07", emoji: "🦋" },
    { key: "avatar_08", emoji: "🐙" },
    { key: "avatar_09", emoji: "🦄" },
    { key: "avatar_10", emoji: "🐺" },
  ],

  save(name, avatarKey) {
    const profile = { name: name.trim(), avatar: avatarKey };
    StateModule.profile = profile;
    StorageModule.save("profile", profile);
    this._updateHeaderAvatar();
  },

  init() {
    const stored = StorageModule.load("profile");
    if (stored && typeof stored === "object") {
      StateModule.profile = stored;
    }
    this._updateHeaderAvatar();
    this._setupAvatarFallback();
  },

  _updateHeaderAvatar() {
    if (typeof document === "undefined") return;
    const profile = StateModule.profile;
    const fallback = document.getElementById("avatar-fallback");
    const img = document.getElementById("avatar-img");

    if (fallback) {
      fallback.textContent = (profile.name || "S").charAt(0).toUpperCase();
    }

    // Find emoji for avatar key
    const option = this.AVATAR_OPTIONS.find((o) => o.key === profile.avatar);
    if (img) {
      if (option) {
        img.style.display = "none";
        if (fallback) {
          fallback.style.display = "flex";
          fallback.textContent = option.emoji;
        }
      }
    }
  },

  _setupAvatarFallback() {
    if (typeof document === "undefined") return;
    const img = document.getElementById("avatar-img");
    if (img) {
      img.addEventListener("error", () => {
        img.style.display = "none";
        const fallback = document.getElementById("avatar-fallback");
        if (fallback) {
          fallback.style.display = "flex";
          fallback.textContent = (StateModule.profile.name || "S").charAt(0).toUpperCase();
        }
      });
    }
  },
};

/* ============================================================
   CurrencyModule — symbol selection and value formatting
   ============================================================ */
const CurrencyModule = {
  _CONFIGS: {
    IDR: { symbol: "Rp", thousandSep: ".", decimalSep: "," },
    USD: { symbol: "$",  thousandSep: ",", decimalSep: "." },
    EUR: { symbol: "€",  thousandSep: ",", decimalSep: "." },
    GBP: { symbol: "£",  thousandSep: ",", decimalSep: "." },
  },

  format(amount, currencyCode) {
    const code = currencyCode || StateModule.currency || "IDR";
    const cfg = this._CONFIGS[code] || this._CONFIGS["IDR"];
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    // Abbreviation for very large numbers
    if (abs > 999999999.99) {
      const abbreviated = this._abbreviate(abs);
      return `${sign}${cfg.symbol} ${abbreviated}`;
    }

    // Format with thousand separators
    const parts = abs.toFixed(2).split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandSep);
    
    // Only show decimal part if it's not "00"
    if (parts[1] === "00") {
      return `${sign}${cfg.symbol} ${intPart}`;
    } else {
      return `${sign}${cfg.symbol} ${intPart}${cfg.decimalSep}${parts[1]}`;
    }
  },

  _abbreviate(abs) {
    if (abs >= 1e9) return (abs / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (abs / 1e6).toFixed(1) + "M";
    return (abs / 1e3).toFixed(1) + "K";
  },

  init() {
    const stored = StorageModule.load("currency");
    const valid = ["IDR", "USD", "EUR", "GBP"];
    StateModule.currency = valid.includes(stored) ? stored : "IDR";
    if (typeof document !== "undefined") {
      const sel = document.getElementById("currency-select");
      if (sel) sel.value = StateModule.currency;
    }
  },

  set(code) {
    const valid = ["IDR", "USD", "EUR", "GBP"];
    if (!valid.includes(code)) return;
    StateModule.currency = code;
    try {
      StorageModule.save("currency", code);
    } catch (_e) {
      if (typeof document !== "undefined") {
        alert("Currency preference could not be saved.");
      }
    }
    RenderModule.renderDashboard();
  },
};

/* ============================================================
   RenderModule — DOM render functions for each tab section
   ============================================================ */
const RenderModule = {
  renderDashboard() {
    if (typeof document === "undefined") return;
    this.renderBalance();
    this.renderRecentTransactions();
    this.renderBudgetSummaryCard();
    this.renderDashboardDonut();
  },

  renderBalance() {
    if (typeof document === "undefined") return;
    const transactions = StateModule.transactions;
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const balance = parseFloat((income - expense).toFixed(2));
    const formatted = CurrencyModule.format(balance, StateModule.currency);
    const el = document.getElementById("balance-amount");
    if (el) {
      el.textContent = formatted;
      el.classList.toggle("negative", balance < 0);
    }
    // Task #3: Update income and expense breakdown
    const incomeEl = document.getElementById("balance-income");
    const expenseEl = document.getElementById("balance-expense");
    if (incomeEl) {
      incomeEl.textContent = CurrencyModule.format(income, StateModule.currency);
    }
    if (expenseEl) {
      expenseEl.textContent = CurrencyModule.format(expense, StateModule.currency);
    }
  },

  // Task #8: Render recent transactions with date filter support
  renderRecentTransactions(dateFilter) {
    if (typeof document === "undefined") return;
    const list = document.getElementById("recent-list");
    const empty = document.getElementById("recent-empty");
    if (!list) return;
    
    // Apply date filter if provided
    let transactions = StateModule.transactions.slice();
    if (dateFilter && dateFilter !== "all") {
      transactions = DateFilterModule.filterByDateRange(transactions, dateFilter);
    }
    
    // Sort by date and get recent
    const recent = transactions
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .slice(0, 5);
    
    list.innerHTML = "";
    if (!recent.length) {
      if (empty) {
        empty.classList.remove("hidden");
        list.appendChild(empty);
      }
      return;
    }
    recent.forEach((t) => {
      const li = this._buildTransactionItem(t, true);
      list.appendChild(li);
    });
    // initialize lucide icons for any injected icon markup
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  renderBudgetSummaryCard() {
    if (typeof document === "undefined") return;
    const card = document.getElementById("budget-summary-card");
    const content = document.getElementById("budget-summary-content");
    if (!card || !content) return;
    const budget = StateModule.budgets;
    if (!budget.global || budget.global <= 0) {
      card.classList.add("hidden");
      return;
    }
    card.classList.remove("hidden");
    const now = new Date();
    const spent = BudgetModule.computeMonthlyExpense(
      StateModule.transactions, now.getFullYear(), now.getMonth() + 1
    );
    const progress = BudgetModule.computeProgress(spent, budget.global);
    const state = BudgetModule.getProgressState(spent, budget.global);
    const colorMap = { under: "var(--color-income)", warning: "var(--color-warning)", over: "var(--color-expense)" };
    const remaining = Math.max(budget.global - spent, 0);
    content.innerHTML = `
      <p>Spent: <strong>${CurrencyModule.format(spent, StateModule.currency)}</strong></p>
      <p>Limit: <strong>${CurrencyModule.format(budget.global, StateModule.currency)}</strong></p>
      <p>Remaining: <strong>${CurrencyModule.format(remaining, StateModule.currency)}</strong></p>
      <div class="budget-progress-bar-track">
        <div class="budget-progress-bar-fill" style="width:${progress}%;background-color:${colorMap[state]};"></div>
      </div>
      ${state === "over" ? '<p class="budget-over-label">⚠ Budget exceeded!</p>' : ""}
    `;
  },

  // Task #7: Render dashboard donut with date filter support
  renderDashboardDonut(dateFilter, customStart, customEnd) {
    if (typeof document === "undefined") return;
    
    // Apply date filter if provided
    let transactions = StateModule.transactions.slice();
    if (dateFilter && dateFilter !== "all") {
      transactions = DateFilterModule.filterByDateRange(transactions, dateFilter, customStart, customEnd);
    }
    
    const categoryData = ChartModule.buildCategoryData(transactions);
    const canvas = document.getElementById("dashboard-donut-canvas");
    const empty = document.getElementById("dashboard-donut-empty");
    if (!canvas) return;
    if (!categoryData.length) {
      canvas.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
    } else {
      canvas.classList.remove("hidden");
      if (empty) empty.classList.add("hidden");
      ChartModule.renderDonut("dashboard-donut-canvas", categoryData);
      ChartModule.renderLegend("dashboard-donut-legend", categoryData);
    }
  },

  renderTransactionList(transactions) {
    if (typeof document === "undefined") return;
    const list = document.getElementById("transaction-list");
    if (!list) return;
    list.innerHTML = "";
    if (!transactions || !transactions.length) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "No transactions found.";
      list.appendChild(li);
      return;
    }
    transactions.forEach((t) => {
      if (!t.item_name || !t.date || !t.category || t.amount === undefined) return;
      const li = this._buildTransactionItem(t, true);
      list.appendChild(li);
    });
    // initialize lucide icons for dynamically injected transaction buttons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  _buildTransactionItem(t, showDelete) {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.setAttribute("data-id", t.id);

    const sign = t.type === "income" ? "+" : "-";
    const amountClass = t.type === "income" ? "income" : "expense";
    const formattedDate = this._formatDate(t.date);
    const catSlug = String(t.category || "").toLowerCase().replace(/[^a-z0-9]/g, "-");

    // Use CategoryIconModule for consistent icon mapping
    const catIcon = CategoryIconModule.getIcon(t.category, t.type);

    li.innerHTML = `
      <div class="col-item">
        <div class="item-icon-bg"><i data-lucide="${catIcon}"></i></div>
        <span class="item-name">${this._escapeHTML(t.item_name)}</span>
      </div>
      <div class="col-category">
        <span class="category-badge cat-${catSlug}">
          <i data-lucide="${catIcon}"></i>
          ${this._escapeHTML(t.category)}
        </span>
      </div>
      <div class="col-date numeric-tabular">${formattedDate}</div>
      <div class="col-amount numeric-tabular ${amountClass}">${sign}${CurrencyModule.format(t.amount, StateModule.currency)}</div>
      <div class="col-action">
        ${showDelete ? `<button class="delete-btn" data-id="${t.id}" aria-label="Delete ${this._escapeHTML(t.item_name)}"><i data-lucide="trash-2"></i></button>` : ""}
      </div>
    `;
    return li;
  },

  _formatDate(dateStr) {
    if (!dateStr) return "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  },

  _escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  renderAnalytics(filteredTransactions) {
    if (typeof document === "undefined") return;
    // Use filtered transactions if provided, otherwise use all
    const transactions = filteredTransactions || StateModule.transactions;
    this._renderAnalyticsDonut(transactions);
    this._renderAnalyticsTrend(transactions);
    this._renderAnalyticsMoM(transactions);
  },

  _renderAnalyticsDonut(transactions) {
    const categoryData = ChartModule.buildCategoryData(transactions || StateModule.transactions);
    const canvas = document.getElementById("analytics-donut-canvas");
    const empty  = document.getElementById("analytics-donut-empty");
    if (!canvas) return;
    if (!categoryData.length) {
      canvas.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
    } else {
      canvas.classList.remove("hidden");
      if (empty) empty.classList.add("hidden");
      ChartModule.renderDonut("analytics-donut-canvas", categoryData);
      ChartModule.renderLegend("analytics-donut-legend", categoryData);
    }
  },

  _renderAnalyticsTrend(transactions) {
    const tx = transactions || StateModule.transactions;
    const canvas = document.getElementById("monthly-trend-canvas");
    const empty  = document.getElementById("monthly-trend-empty");
    if (!canvas) return;

    const now       = new Date();
    const year      = now.getFullYear();
    const month     = now.getMonth() + 1; // 1-based
    const today     = now.getDate();
    const prefix    = `${year}-${String(month).padStart(2, "0")}`;

    // Aggregate expenses by day-of-month for the current month
    const byDay = {};
    tx.forEach((t) => {
      if (t.type !== "expense") return;
      if (!(t.date || "").startsWith(prefix)) return;
      const day = parseInt(t.date.slice(8, 10), 10);
      byDay[day] = (byDay[day] || 0) + (t.amount || 0);
    });

    const hasData = Object.keys(byDay).length > 0;
    if (!hasData) {
      canvas.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
      return;
    }

    canvas.classList.remove("hidden");
    if (empty) empty.classList.add("hidden");

    // Build one data point per day from day 1 up to today
    const dataPoints = [];
    for (let d = 1; d <= today; d++) {
      dataPoints.push({ label: String(d), value: byDay[d] || 0 });
    }

    ChartModule.renderLine("monthly-trend-canvas", dataPoints);
  },

  _renderAnalyticsMoM(transactions) {
    const tx = transactions || StateModule.transactions;
    const container = document.getElementById("mom-content");
    if (!container) return;

    const now          = new Date();
    const curYear      = now.getFullYear();
    const curMonth     = now.getMonth() + 1;

    // Previous month (handle January → December of previous year)
    let prevYear  = curYear;
    let prevMonth = curMonth - 1;
    if (prevMonth === 0) { prevMonth = 12; prevYear = curYear - 1; }

    const curTotal  = BudgetModule.computeMonthlyExpense(tx, curYear,  curMonth);
    const prevTotal = BudgetModule.computeMonthlyExpense(tx, prevYear, prevMonth);

    // Month name helper
    const MONTHS = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
    const curLabel  = `${MONTHS[curMonth  - 1]} ${curYear}`;
    const prevLabel = `${MONTHS[prevMonth - 1]} ${prevYear}`;

    // Percentage change
    let changeHTML;
    if (prevTotal === 0) {
      changeHTML = `<p class="mom-no-prior">No prior month data</p>`;
    } else {
      const pct    = (((curTotal - prevTotal) / prevTotal) * 100).toFixed(1);
      const isUp   = curTotal >= prevTotal;
      const arrow  = isUp ? "▲" : "▼";
      const cls    = isUp ? "mom-up" : "mom-down";
      changeHTML   = `<p class="mom-change ${cls}">${arrow} ${Math.abs(pct)}% vs ${prevLabel}</p>`;
    }

    // Top 3 categories for current month
    const curPrefix = `${curYear}-${String(curMonth).padStart(2, "0")}`;
    const catMap = {};
    tx.forEach((t) => {
      if (t.type !== "expense") return;
      if (!(t.date || "").startsWith(curPrefix)) return;
      catMap[t.category] = (catMap[t.category] || 0) + (t.amount || 0);
    });
    const topCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topCatsHTML = topCats.length
      ? `<ol class="mom-top-cats">${topCats.map(([cat, amt]) => {
          const icon = CategoryIconModule.getIcon(cat, "expense");
          return `<li>
               <span class="mom-cat-name">
                 <i data-lucide="${icon}"></i>
                 ${this._escapeHTML(cat)}
               </span>
               <span class="mom-cat-amt">${CurrencyModule.format(amt, StateModule.currency)}</span>
             </li>`;
        }).join("")}</ol>`
      : `<p class="mom-no-prior">No expense categories this month.</p>`;

    container.innerHTML = `
      <div class="mom-totals">
        <div class="mom-month-block">
          <span class="mom-month-label">${curLabel}</span>
          <span class="mom-month-total">${CurrencyModule.format(curTotal, StateModule.currency)}</span>
        </div>
        <div class="mom-month-block">
          <span class="mom-month-label">${prevLabel}</span>
          <span class="mom-month-total">${CurrencyModule.format(prevTotal, StateModule.currency)}</span>
        </div>
      </div>
      ${changeHTML}
      <h3 class="mom-top-title">Top 3 Categories</h3>
      ${topCatsHTML}
    `;
    
    // Re-initialize Lucide icons for MoM category icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  renderSettings() {
    if (typeof document === "undefined") return;

    // Sync currency dropdown to current state
    const currencySel = document.getElementById("currency-select");
    if (currencySel) currencySel.value = StateModule.currency;

    // Sync global budget input to current state
    const budgetInput = document.getElementById("global-budget");
    if (budgetInput) {
      budgetInput.value = (StateModule.budgets.global != null && StateModule.budgets.global > 0)
        ? StateModule.budgets.global
        : "";
    }

    // Clear any stale inline error from a previous visit
    const budgetErr = document.getElementById("error-global-budget");
    if (budgetErr) budgetErr.textContent = "";
  },
};

/* ============================================================
   App Initialization (DOM-dependent — guarded)
   ============================================================ */
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    StateModule.init();
    CurrencyModule.init();
    ThemeModule.init();
    ProfileModule.init();
    RouterModule.init();
    RenderModule.renderDashboard();

    // Theme switcher
    const themeBtn = document.getElementById("theme-switcher");
    if (themeBtn) themeBtn.addEventListener("click", () => ThemeModule.toggle());

    // Toast undo button
    const undoBtn = document.getElementById("toast-undo-btn");
    if (undoBtn) undoBtn.addEventListener("click", () => ToastModule.undo());

    // Quick Add Form submit (task 9.2)
    let _selectedType = "expense";

    // Task #4: Dynamic category dropdown based on transaction type
    // Task #12: Consistent capitalization for categories
    const EXPENSE_CATEGORIES = ["Food", "Transport", "Fun", "Shopping", "Health", "Education", "Entertainment", "Bills", "Custom"];
    const INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Freelance", "Gift", "Other", "Custom"];

    function updateCategoryDropdown(type) {
      const categorySelect = document.getElementById("category");
      if (!categorySelect) return;
      
      const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      
      // Build options with icon indicators (using Unicode symbols for compatibility)
      const iconMap = {
        // Expense icons
        "Food": "🍽️",
        "Transport": "🚗",
        "Fun": "😊",
        "Shopping": "🛍️",
        "Health": "💊",
        "Education": "🎓",
        "Entertainment": "📺",
        "Bills": "📄",
        // Income icons
        "Salary": "💼",
        "Bonus": "🎁",
        "Investment": "📈",
        "Freelance": "💻",
        "Gift": "❤️",
        "Other": "➕",
        "Custom": "📁",
      };
      
      categorySelect.innerHTML = '<option value="">Select category</option>' +
        categories.map(cat => {
          const icon = iconMap[cat] || "•";
          return `<option value="${cat}">${icon} ${cat}</option>`;
        }).join("");
    }

    // Initialize with expense categories
    updateCategoryDropdown("expense");

    // Task #5: Set default date to today
    const dateInput = document.getElementById("transaction-date");
    if (dateInput) {
      const today = new Date().toISOString().slice(0, 10);
      dateInput.value = today;
    }

    // Task #6: Amount input formatting with thousand separators
    const amountInput = document.getElementById("amount");
    let rawAmountValue = "";
    
    if (amountInput) {
      // FIX #1: Convert type="number" to type="text" to allow formatted values
      if (amountInput.type === "number") {
        amountInput.type = "text";
        amountInput.setAttribute("inputmode", "decimal");
      }
      
      amountInput.addEventListener("input", (e) => {
        // FIX #2: Get currency config dynamically (inside listener)
        const cfg = CurrencyModule._CONFIGS[StateModule.currency] || CurrencyModule._CONFIGS.IDR;
        
        const cursorPos = e.target.selectionStart;
        const valueBefore = e.target.value;
        
        // Filter input: only allow digits and the correct decimal separator
        let filtered = "";
        let decimalCount = 0;
        for (let i = 0; i < valueBefore.length; i++) {
          const char = valueBefore[i];
          if (/\d/.test(char)) {
            filtered += char;
          } else if (char === cfg.decimalSep && decimalCount === 0) {
            filtered += char;
            decimalCount++;
          }
          // Skip any other characters (including thousand separators)
        }
        
        // Don't format while typing if empty or just a decimal separator
        if (!filtered || filtered === cfg.decimalSep) {
          e.target.value = filtered;
          return;
        }
        
        // Split by decimal separator
        const parts = filtered.split(cfg.decimalSep);
        const intPart = parts[0];
        const decimalPart = parts.length > 1 ? parts[1] : "";
        
        // Format integer part with thousand separators
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandSep);
        
        // Combine with decimal part if present
        const formatted = decimalPart
          ? formattedInt + cfg.decimalSep + decimalPart
          : formattedInt;
        
        // Only update if different to avoid cursor issues
        if (formatted !== valueBefore) {
          e.target.value = formatted;
          // Try to maintain cursor position
          const diff = formatted.length - valueBefore.length;
          e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
        }
      });
      
      // Remove formatting before form submission
      amountInput.addEventListener("blur", () => {
        if (amountInput.value) {
          // FIX #2: Normalize using currency-specific separators
          const cfg = CurrencyModule._CONFIGS[StateModule.currency] || CurrencyModule._CONFIGS.IDR;
          const normalized = amountInput.value
            .split(cfg.thousandSep).join("")
            .split(cfg.decimalSep).join(".");
          amountInput.setAttribute("data-raw", normalized);
        }
      });
    }

    // Type toggle buttons with dynamic category update
    const typeExpenseBtn = document.getElementById("type-expense");
    const typeIncomeBtn  = document.getElementById("type-income");
    if (typeExpenseBtn && typeIncomeBtn) {
      typeExpenseBtn.addEventListener("click", () => {
        _selectedType = "expense";
        typeExpenseBtn.classList.add("active");
        typeIncomeBtn.classList.remove("active");
        updateCategoryDropdown("expense"); // Task #4
      });
      typeIncomeBtn.addEventListener("click", () => {
        _selectedType = "income";
        typeIncomeBtn.classList.add("active");
        typeExpenseBtn.classList.remove("active");
        updateCategoryDropdown("income"); // Task #4
      });
    }

    // Show/hide custom category input
    const categorySelect = document.getElementById("category");
    const customCategoryGroup = document.getElementById("custom-category-group");
    if (categorySelect && customCategoryGroup) {
      categorySelect.addEventListener("change", () => {
        if (categorySelect.value === "Custom") {
          customCategoryGroup.classList.remove("hidden");
        } else {
          customCategoryGroup.classList.add("hidden");
        }
      });
    }

    // Form submit
    const transactionForm = document.getElementById("transaction-form");
    if (transactionForm) {
      transactionForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Clear previous errors
        ["item-name", "amount", "date", "type", "category", "custom-category"].forEach((id) => {
          const el = document.getElementById("error-" + id);
          if (el) el.textContent = "";
        });

        // Get clean amount value (remove thousand separators)
        // FIX #3: Use currency-specific separators for normalization
        const cfg = CurrencyModule._CONFIGS[StateModule.currency] || CurrencyModule._CONFIGS.IDR;
        const cleanAmount = amountInput
          ? amountInput.value.split(cfg.thousandSep).join("").split(cfg.decimalSep).join(".")
          : "";
        
        const fields = {
          item_name: document.getElementById("item-name").value,
          amount: cleanAmount,
          type: _selectedType,
          category: categorySelect ? categorySelect.value : "",
          custom_category: document.getElementById("custom-category")
            ? document.getElementById("custom-category").value
            : "",
          date: dateInput ? dateInput.value : "", // Task #5
        };

        const { valid, errors } = ValidatorModule.validateTransaction(fields);

        if (!valid) {
          if (errors.item_name) {
            const el = document.getElementById("error-item-name");
            if (el) el.textContent = errors.item_name;
          }
          if (errors.amount) {
            const el = document.getElementById("error-amount");
            if (el) el.textContent = errors.amount;
          }
          if (errors.type) {
            const el = document.getElementById("error-type");
            if (el) el.textContent = errors.type;
          }
          if (errors.category) {
            const el = document.getElementById("error-category");
            if (el) el.textContent = errors.category;
          }
          if (errors.custom_category) {
            const el = document.getElementById("error-custom-category");
            if (el) el.textContent = errors.custom_category;
          }
          return;
        }

        try {
          TransactionModule.add(fields);
        } catch (saveErr) {
          const errEl = document.getElementById("form-save-error");
          if (errEl) {
            errEl.textContent = "Could not save transaction: storage quota exceeded.";
            errEl.classList.remove("hidden");
          }
          return;
        }

        // Reset form
        transactionForm.reset();
        _selectedType = "expense";
        if (typeExpenseBtn) typeExpenseBtn.classList.add("active");
        if (typeIncomeBtn)  typeIncomeBtn.classList.remove("active");
        if (customCategoryGroup) customCategoryGroup.classList.add("hidden");
        updateCategoryDropdown("expense"); // Reset to expense categories
        
        // Reset date to today
        if (dateInput) {
          const today = new Date().toISOString().slice(0, 10);
          dateInput.value = today;
        }

        // Re-render dashboard and transaction list
        RenderModule.renderDashboard();
        RenderModule.renderTransactionList(TransactionModule.getAll().reverse());
        if (RouterModule.currentTab === "analytics") RenderModule.renderAnalytics();
      });
    }

    // Task #9: Delete confirmation modal
    let pendingDeleteId = null;
    const deleteModal = document.getElementById("delete-modal");
    const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
    const deleteCancelBtn = document.getElementById("delete-cancel-btn");

    function showDeleteModal(id) {
      pendingDeleteId = id;
      if (deleteModal) {
        deleteModal.classList.remove("hidden");
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }

    function hideDeleteModal() {
      pendingDeleteId = null;
      if (deleteModal) deleteModal.classList.add("hidden");
    }

    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener("click", () => {
        if (pendingDeleteId) {
          TransactionModule.remove(pendingDeleteId);
          RenderModule.renderTransactionList(TransactionModule.getAll().reverse());
          RenderModule.renderDashboard();
          if (RouterModule.currentTab === "analytics") RenderModule.renderAnalytics();
          ToastModule.show("Transaction deleted");
        }
        hideDeleteModal();
      });
    }

    if (deleteCancelBtn) {
      deleteCancelBtn.addEventListener("click", hideDeleteModal);
    }

    // Close modal on backdrop click
    if (deleteModal) {
      deleteModal.addEventListener("click", (e) => {
        if (e.target === deleteModal) hideDeleteModal();
      });
    }

    // Delete button — delegated listener shared by recent & full lists
    const handleTransactionDelete = (e) => {
      const btn = e.target.closest(".delete-btn");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;
      showDeleteModal(id); // Show confirmation instead of immediate delete
    };

    const transactionList = document.getElementById("transaction-list");
    if (transactionList) {
      transactionList.addEventListener("click", handleTransactionDelete);
    }

    const recentList = document.getElementById("recent-list");
    if (recentList) {
      recentList.addEventListener("click", handleTransactionDelete);
    }

    // "See All" button — navigate to transactions tab
    const seeAllBtn = document.getElementById("see-all-btn");
    if (seeAllBtn) {
      seeAllBtn.addEventListener("click", () => RouterModule.navigate("transactions"));
    }

    // Task #10: Enhanced search functionality
    const searchInput = document.getElementById("search-input");
    const filterCategory = document.getElementById("filter-category");
    const filterMonth = document.getElementById("filter-month");
    const sortSelect = document.getElementById("sort-select");
    const transactionsDateFilter = document.getElementById("transactions-date-filter");

    // Store the current date range state for transactions tab
    let transactionsDateRange = {
      rangeType: "all",
      customStart: null,
      customEnd: null,
    };

    function applyFiltersAndSort() {
      let filtered = StateModule.transactions.slice();
      
      // Apply date range filter FIRST
      if (transactionsDateRange.rangeType !== "all") {
        filtered = DateFilterModule.filterByDateRange(
          filtered,
          transactionsDateRange.rangeType,
          transactionsDateRange.customStart,
          transactionsDateRange.customEnd
        );
      }
      
      // Search by item name, category, or amount
      if (searchInput && searchInput.value.trim()) {
        const query = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(t => 
          (t.item_name || "").toLowerCase().includes(query) ||
          (t.category || "").toLowerCase().includes(query) ||
          String(t.amount || "").includes(query)
        );
      }
      
      // Filter by category
      if (filterCategory && filterCategory.value && filterCategory.value !== "") {
        filtered = filtered.filter(t => t.category === filterCategory.value);
      }
      
      // Filter by month
      if (filterMonth && filterMonth.value && filterMonth.value !== "") {
        filtered = filtered.filter(t => (t.date || "").startsWith(filterMonth.value));
      }
      
      // Sort
      if (sortSelect && sortSelect.value) {
        filtered = SortModule.apply(filtered, sortSelect.value);
      }
      
      RenderModule.renderTransactionList(filtered);
    }

    // Setup Transactions Tab Date Range Filter
    const transactionsDateFilterManager = DateRangeFilterManager.setup(
      "transactions-date-filter",
      "transactions-custom-range",
      "transactions-start-date",
      "transactions-end-date",
      (filtered) => {
        // Update the state
        transactionsDateRange = transactionsDateFilterManager.getState();
        // Re-apply all other filters on top of date filter
        applyFiltersAndSort();
      }
    );

    // Wire up filter/search/sort listeners
    if (searchInput) {
      searchInput.addEventListener("input", applyFiltersAndSort);
    }
    if (filterCategory) {
      // Populate category filter from existing transactions
      const categories = FilterModule.getDistinctCategories(StateModule.transactions);
      filterCategory.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
      filterCategory.addEventListener("change", applyFiltersAndSort);
    }
    if (filterMonth) {
      // Populate month filter from existing transactions
      const months = FilterModule.getDistinctMonths(StateModule.transactions);
      filterMonth.innerHTML = '<option value="">All Months</option>' +
        months.map(m => `<option value="${m}">${m}</option>`).join("");
      filterMonth.addEventListener("change", applyFiltersAndSort);
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", applyFiltersAndSort);
    }

    // Setup Analytics Tab Date Range Filter
    DateRangeFilterManager.setup(
      "analytics-date-filter",
      "analytics-custom-range",
      "analytics-start-date",
      "analytics-end-date",
      (filtered) => {
        RenderModule.renderAnalytics(filtered);
      }
    );

    // ── Currency Selector ──────────────────────────────────────────────────
    const currencySelect = document.getElementById("currency-select");
    if (currencySelect) {
      currencySelect.addEventListener("change", () => {
        const code = currencySelect.value;
        CurrencyModule.set(code); // persists + calls renderDashboard()
        // Also re-render the full transaction list if it's currently visible
        if (RouterModule.currentTab === "transactions") {
          RenderModule.renderTransactionList(TransactionModule.getAll());
        }
        // Re-render analytics MoM/trend amounts if visible
        if (RouterModule.currentTab === "analytics") {
          RenderModule.renderAnalytics();
        }
      });
    }

    // ── Budget Manager ────────────────────────────────────────────────────
    const saveBudgetBtn  = document.getElementById("save-budget-btn");
    const globalBudgetIn = document.getElementById("global-budget");
    const budgetErrEl    = document.getElementById("error-global-budget");

    if (saveBudgetBtn && globalBudgetIn) {
      saveBudgetBtn.addEventListener("click", () => {
        // Clear previous inline error
        if (budgetErrEl) budgetErrEl.textContent = "";

        const raw = globalBudgetIn.value.trim();
        const { valid, errors } = ValidatorModule.validateBudget(raw);

        if (!valid) {
          if (budgetErrEl) budgetErrEl.textContent = errors.budget || "Invalid budget value.";
          return;
        }

        const budgetValue = parseFloat(raw);
        StateModule.budgets.global = budgetValue;
        try {
          StorageModule.save("budgets", StateModule.budgets);
        } catch (_e) {
          if (budgetErrEl) budgetErrEl.textContent = "Could not save budget: storage quota exceeded.";
          return;
        }

        // Re-render the Budget Summary Card on the Dashboard
        RenderModule.renderBudgetSummaryCard();
        // Also refresh the full dashboard so balance + donut stay in sync
        RenderModule.renderDashboard();
        ToastModule.show("Budget saved.");
      });
    }

    // Task #11: PDF Export (using window.print for simplicity)
    const exportPdfBtn = document.getElementById("export-pdf-btn");
    if (!exportPdfBtn) {
      // Create PDF export button if it doesn't exist in Settings > Data Management
      const dataActions = document.querySelector(".data-actions");
      if (dataActions) {
        const pdfBtn = document.createElement("button");
        pdfBtn.className = "btn-secondary";
        pdfBtn.id = "export-pdf-btn";
        pdfBtn.innerHTML = '<i data-lucide="file-text"></i> Export PDF';
        dataActions.insertBefore(pdfBtn, dataActions.children[2]);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        pdfBtn.addEventListener("click", () => {
          // Simple PDF export using browser print
          const printWindow = window.open("", "_blank");
          const transactions = StateModule.transactions;
          
          let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Spenchart Transactions Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #00685f; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #00685f; color: white; }
    .income { color: #00685f; }
    .expense { color: #ba1a1a; }
  </style>
</head>
<body>
  <h1>Spenchart Transaction Report</h1>
  <p>Generated: ${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Item</th>
        <th>Category</th>
        <th>Type</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>`;
          
          transactions.forEach(t => {
            const typeClass = t.type === "income" ? "income" : "expense";
            const sign = t.type === "income" ? "+" : "-";
            html += `
      <tr>
        <td>${t.date || ""}</td>
        <td>${t.item_name || ""}</td>
        <td>${t.category || ""}</td>
        <td>${t.type || ""}</td>
        <td class="${typeClass}">${sign}${CurrencyModule.format(t.amount || 0, StateModule.currency)}</td>
      </tr>`;
          });
          
          html += `
    </tbody>
  </table>
</body>
</html>`;
          
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        });
      }
    }

    // Task #7: Donut chart date filter
    const donutDateFilter = document.getElementById("donut-date-filter");
    const donutCustomRange = document.getElementById("donut-custom-range");
    const donutStartDate = document.getElementById("donut-start-date");
    const donutEndDate = document.getElementById("donut-end-date");

    if (donutDateFilter) {
      donutDateFilter.addEventListener("change", () => {
        const value = donutDateFilter.value;
        
        // Show/hide custom date inputs
        if (donutCustomRange) {
          if (value === "custom") {
            donutCustomRange.classList.remove("hidden");
          } else {
            donutCustomRange.classList.add("hidden");
            RenderModule.renderDashboardDonut(value);
          }
        } else {
          RenderModule.renderDashboardDonut(value);
        }
      });
    }

    // Handle custom date range for donut
    if (donutStartDate && donutEndDate) {
      const updateDonutCustomRange = () => {
        if (donutDateFilter && donutDateFilter.value === "custom") {
          RenderModule.renderDashboardDonut("custom", donutStartDate.value, donutEndDate.value);
        }
      };
      donutStartDate.addEventListener("change", updateDonutCustomRange);
      donutEndDate.addEventListener("change", updateDonutCustomRange);
    }

    // Task #8: Recent transactions date filter
    const recentDateFilter = document.getElementById("recent-date-filter");
    if (recentDateFilter) {
      recentDateFilter.addEventListener("change", () => {
        const value = recentDateFilter.value;
        RenderModule.renderRecentTransactions(value);
      });
    }
  });
}

/* ============================================================
   CommonJS export for Node.js test environment
   ============================================================ */
if (typeof module !== "undefined") {
  module.exports = {
    StorageModule,
    StateModule,
    RouterModule,
    ThemeModule,
    ValidatorModule,
    TransactionModule,
    FilterModule,
    DateFilterModule,
    SortModule,
    BudgetModule,
    ChartModule,
    ToastModule,
    DataManagerModule,
    ProfileModule,
    CurrencyModule,
    RenderModule,
  };
}

window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 500);
    }
  }, 1000); // splash muncul 1 detik, terus fade out 0.5 detik
});

document.addEventListener('DOMContentLoaded', () => {
  // Render semua lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ============================================================
  // Collapsible Sidebar Logic (desktop only)
  // ============================================================
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose  = document.getElementById('sidebar-close');

  // Persistent flag
  let sidebarOpen = false;
  // Guard flag to prevent re-entrance
  let applyingSidebar = false;

  function applySidebar() {
    if (applyingSidebar) return;
    applyingSidebar = true;
    if (sidebarOpen && isDesktop()) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    applyingSidebar = false;
  }

  function openSidebar() {
    sidebarOpen = true;
    applySidebar();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeSidebar() {
    sidebarOpen = false;
    applySidebar();
  }

  // MutationObserver: if anything removes sidebar-open while flag is true, re-add it
  const observer = new MutationObserver(() => {
    if (sidebarOpen && isDesktop() && !document.body.classList.contains('sidebar-open')) {
      applySidebar();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Click logo → open
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', (e) => {
      if (!isDesktop()) return;
      if (e.target.closest('#sidebar-close')) return;
      if (!sidebarOpen) openSidebar();
    });
  }

  // Click close chevron → close (manual only)
  if (sidebarClose) {
    sidebarClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSidebar();
    });
  }

  // On resize
  window.addEventListener('resize', () => {
    if (!isDesktop()) {
      document.body.classList.remove('sidebar-open');
    } else {
      applySidebar();
    }
  });
});