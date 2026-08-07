# Design Document: Spenchart

## Overview

Spenchart is a mobile-first Single Page Application (SPA) for personal expense and budget visualization. It runs entirely in the browser with no backend — all state persists in `localStorage`. The entire app ships as three files: `index.html`, `css/styles.css`, and `js/script.js`. Navigation between the four tabs (Dashboard, Transactions, Analytics, Settings) is implemented by toggling CSS `display` on section elements rather than loading new pages. Chart.js is loaded from a CDN and used for all chart rendering.

The design prioritizes simplicity: no build step, no framework, no module bundler. All application logic lives in a single JavaScript file organized into clearly separated functional modules. UI state is held in memory (JavaScript variables/objects); persistent state is serialized to `localStorage` on every mutation.

---

## Architecture

### Module Breakdown

All code lives in `js/script.js`. The file is organized into the following logical modules, each implemented as a plain-object namespace or a set of named functions:

```
js/script.js
├── StorageModule      — read/write/clear localStorage keys
├── StateModule        — in-memory app state (transactions, budgets, categories, profile, settings)
├── RouterModule       — tab switching via CSS display toggling
├── ThemeModule        — light/dark theme application and persistence
├── ValidatorModule    — form input validation rules
├── TransactionModule  — CRUD operations on transactions
├── FilterModule       — search, category, month filter logic
├── SortModule         — sort order application
├── BudgetModule       — budget limit computation and progress
├── ChartModule        — Chart.js integration (donut + line charts)
├── ToastModule        — toast notification display and undo queue
├── DataManagerModule  — JSON backup/restore and CSV export
├── ProfileModule      — display name and avatar persistence
├── CurrencyModule     — symbol selection and value formatting
└── RenderModule       — DOM render functions for each tab section
```

### Component Tree

```
index.html
├── <header>                        — App name, ThemeSwitcher, ProfileAvatar
├── <main>
│   ├── #tab-dashboard              — Dashboard tab section
│   │   ├── .hero-balance-card      — Balance display
│   │   ├── .quick-add-form         — Quick Add Transaction form
│   │   ├── .donut-chart-container  — Spending breakdown donut chart
│   │   ├── .budget-summary-card    — Monthly budget progress (optional)
│   │   └── .recent-transactions    — Last 5 transactions preview
│   ├── #tab-transactions           — Transactions tab section
│   │   ├── .search-filter-bar      — Text search + category/month dropdowns + sort
│   │   └── .transaction-list       — Scrollable full transaction list
│   ├── #tab-analytics              — Analytics tab section
│   │   ├── .analytics-donut        — Full-width donut chart
│   │   ├── .monthly-trend-chart    — Line chart (current month)
│   │   └── .mom-comparison         — Month-over-month cards + top 3 categories
│   └── #tab-settings               — Settings tab section
│       ├── .profile-section        — Display name + avatar picker
│       ├── .currency-section       — Currency selector
│       ├── .budget-category-mgr    — Global/per-category budgets + custom categories
│       └── .data-manager           — Backup, restore, CSV export, reset
└── <nav class="bottom-nav">        — 4 tab icons + labels
```

### SPA Routing Mechanism

The Router works by maintaining a `currentTab` string in memory and toggling CSS classes on tab section elements.

```
RouterModule
  currentTab: string              — active tab id, default "dashboard"

  navigate(tabId):
    1. Add class "hidden" (display:none) to all tab sections
    2. Remove class "hidden" from section matching tabId
    3. Update bottom-nav active indicator: remove .active from all items,
       add .active to item matching tabId
    4. Set currentTab = tabId
    5. If tabId === currentTab (already active): no-op, preserve state

  init():
    1. Read no persisted tab state (tabs are not persisted across sessions)
    2. Call navigate("dashboard")
```

Tab switching completes within a single synchronous DOM call, well within the 100 ms budget.

---

## Components and Interfaces

### StorageModule

Central wrapper around `localStorage` that namespaces all keys under the prefix `spenchart_`.

```
Keys:
  spenchart_transactions   — JSON array of Transaction objects
  spenchart_budgets        — JSON object { global: number, categories: { [name]: number } }
  spenchart_categories     — JSON array of Category objects
  spenchart_profile        — JSON object { name: string, avatar: string }
  spenchart_currency       — string currency code (e.g. "IDR")
  spenchart_theme          — string "light" | "dark"

Interface:
  load(key): any | null
  save(key, value): void     — JSON.stringify, catch QuotaExceededError
  remove(key): void
  clearAll(): void           — removes only spenchart_* keys
```

### RouterModule

Described above. No persistence; always resets to Dashboard on page load.

### ThemeModule

```
Interface:
  apply(theme: "light" | "dark"): void
    — sets data-theme attribute on <html> element
    — persists via StorageModule

  init(): void
    — loads stored theme, validates ("light"|"dark"), defaults to "light"
    — calls apply()

  toggle(): void
    — flips between "light" and "dark", calls apply()
```

CSS variables are defined in `css/styles.css` under `[data-theme="light"]` and `[data-theme="dark"]` selectors. All color references in the stylesheet use `var(--color-*)` tokens.

### ValidatorModule

```
Interface:
  validateTransaction(fields): ValidationResult
    — item_name: non-empty after trim, max 100 chars
    — amount: numeric, in range [0.01, 999999999.99]
    — type: "income" | "expense"
    — category: non-empty
    — custom_category: non-empty and max 50 chars when category === "custom"

  validateBudget(value): ValidationResult
    — numeric, in range [0.01, 999999999.99]

  validateCategoryName(name, existingNames): ValidationResult
    — non-empty after trim
    — max 50 chars
    — not already in existingNames (case-insensitive)

  validateProfileName(name): ValidationResult
    — non-empty after trim
    — max 50 chars

  ValidationResult: { valid: boolean, errors: { [field]: string } }
```

### TransactionModule

```
Interface:
  getAll(): Transaction[]
  add(fields): Transaction        — generates id, sets date to today, saves
  remove(id): Transaction | null  — returns removed transaction for undo
  restore(transaction): void      — re-inserts at original index position
  getRecent(n): Transaction[]     — top n by date descending
```

### FilterModule

```
Interface:
  applyFilters(transactions, filters): Transaction[]
    filters: {
      text?: string          — case-insensitive substring match on item_name
      category?: string      — exact match (null/"All Categories" = no filter)
      month?: string         — "YYYY-MM" format (null/"All Months" = no filter)
    }
    — applies all non-null filters with AND logic
    — text filter applied within 300ms of last keyup (debounced in RenderModule)

  getDistinctCategories(transactions): string[]
  getDistinctMonths(transactions): string[]   — sorted descending by date
```

### SortModule

```
Interface:
  apply(transactions, sortKey): Transaction[]
    sortKey: "newest" | "oldest" | "highest" | "lowest" | "category"
```

### BudgetModule

```
Interface:
  computeMonthlyExpense(transactions, year, month): number
    — sums amounts of Expense transactions in the given calendar month

  computeProgress(spent, limit): number
    — (spent / limit) * 100, capped at 100

  getProgressState(spent, limit): "under" | "warning" | "over"
    — "under"   if spent < limit * 0.80
    — "warning" if 0.80 ≤ spent / limit ≤ 1.00
    — "over"    if spent > limit
```

### ChartModule

```
Interface:
  renderDonut(canvasId, categoryData): void
    categoryData: Array<{ label: string, amount: number, color: string }>
    — destroys existing Chart instance on that canvas if present
    — creates new Chart.js Doughnut chart
    — on slice click: highlights selected slice (offset), shows detail label

  renderLine(canvasId, dataPoints): void
    dataPoints: Array<{ label: string, value: number }>
    — destroys existing Chart instance if present
    — creates new Chart.js Line chart

  buildCategoryData(transactions): categoryData[]
    — aggregates expense transactions by category
    — assigns a deterministic color per category from a fixed palette
```

Chart.js is loaded via CDN `<script>` in `index.html`. `ChartModule` checks `window.Chart` exists before calling; renders a fallback message if Chart.js fails to load.

### ToastModule

```
Interface:
  show(message, undoCallback): void
    — renders toast DOM element at bottom of screen
    — starts 5-second countdown (animated progress bar)
    — on timeout: calls permanentDelete(), removes toast
    — on "Undo" click: calls undoCallback(), removes toast immediately

  activeToast: { timerId, undoCallback } | null
    — only one toast active at a time; showing a new one replaces the previous
```

### DataManagerModule

```
Interface:
  exportJSON(): void
    — serializes all spenchart_* localStorage keys to a JSON object
    — triggers download as backup-YYYY-MM-DD.json

  importJSON(file): Promise<void>
    — reads file (max 10 MB), validates JSON structure and schema
    — on success: overwrites localStorage keys, re-renders app
    — on failure: displays error, leaves localStorage unchanged

  exportCSV(): void
    — reads all transactions
    — builds RFC 4180-compliant CSV (header + rows)
    — columns: date (YYYY-MM-DD), item_name, category, type, amount (2dp)
    — triggers download as transactions.csv

  escapeCSVField(value): string
    — encloses value in double quotes if it contains comma, double quote, or newline
    — escapes internal double quotes as ""
```

### CurrencyModule

```
Interface:
  format(amount, currencyCode): string
    — applies symbol prefix and locale-appropriate thousand separators
    — IDR: "Rp" prefix, period as thousand separator (e.g. "Rp 1.000")
    — USD: "$" prefix, comma as thousand separator
    — EUR: "€" prefix, comma as thousand separator
    — GBP: "£" prefix, comma as thousand separator
    — amounts > 999,999,999.99: abbreviated notation (e.g. "Rp 1,0M")

  init(): void
    — loads currency code from localStorage, defaults to "IDR"

  set(code): void
    — persists code, triggers re-render of all monetary values
```

### RenderModule

One render function per tab section and per major sub-component:

```
Interface:
  renderDashboard(): void
  renderBalance(): void
  renderRecentTransactions(): void
  renderBudgetSummaryCard(): void
  renderDashboardDonut(): void
  renderTransactionList(transactions): void
  renderFilterBar(): void
  renderAnalytics(): void
  renderSettings(): void
```

All render functions clear and rebuild the relevant DOM subtree. They pull from `StateModule` (in-memory) rather than re-reading `localStorage` on every call.

---

## Data Models

### Transaction

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  item_name: string,   // 1–100 chars
  amount: number,      // 0.01–999999999.99
  type: "income" | "expense",
  category: string,    // predefined or custom name, max 50 chars
  date: string         // "YYYY-MM-DD", set at creation time
}
```

### Category

```js
{
  name: string,   // 1–50 chars, unique (case-insensitive)
  emoji: string,  // single emoji character
  custom: boolean
}
```

Predefined expense categories: `Food`, `Transport`, `Fun`.
Predefined income categories: `Salary`, `Freelance`, `Other`.
`Custom` is a special UI-only option that triggers the custom name input field; it is not stored as a category record.

### Budget

```js
{
  global: number | null,           // 0.01–999999999.99 or null (not set)
  categories: {
    [categoryName: string]: number // per-category limits
  }
}
```

### Profile

```js
{
  name: string,   // 1–50 chars display name
  avatar: string  // key into predefined avatar icon set (e.g. "avatar_01")
}
```

### Settings (Currency + Theme)

Stored as separate top-level `localStorage` keys:

```
spenchart_currency: "IDR" | "USD" | "EUR" | "GBP"
spenchart_theme:    "light" | "dark"
```

---

## LocalStorage Schema

| Key | Type | Description |
|-----|------|-------------|
| `spenchart_transactions` | `Transaction[]` | All transaction records, stored in insertion order |
| `spenchart_budgets` | `Budget` | Global and per-category budget limits |
| `spenchart_categories` | `Category[]` | Custom categories (predefined categories are hardcoded) |
| `spenchart_profile` | `Profile` | Display name and avatar |
| `spenchart_currency` | `string` | Active currency code |
| `spenchart_theme` | `string` | Active theme name |

All values are JSON-serialized strings. On read, the app JSON-parses and validates type; invalid or missing keys fall back to safe defaults. No migration logic is needed for v1 — the schema is fixed at launch.

---

## Theme System Implementation

CSS custom properties are defined at the `[data-theme]` attribute level on `<html>`:

```css
[data-theme="light"] {
  --color-bg:        #F8FAFC;
  --color-surface:   #FFFFFF;
  --color-text:      #0F172A;
  --color-muted:     #64748B;
  --color-accent:    #2563EB;
  --color-income:    #10B981;
  --color-warning:   #F59E0B;
  --color-expense:   #EF4444;
}

[data-theme="dark"] {
  --color-bg:        #0F172A;
  --color-surface:   #1E293B;
  --color-text:      #F1F5F9;
  --color-muted:     #94A3B8;
  --color-accent:    #22D3EE;
  --color-income:    #10B981;
  --color-warning:   #F59E0B;
  --color-expense:   #EF4444;
}
```

All component styles reference `var(--color-*)` tokens. Switching themes is a single `document.documentElement.setAttribute("data-theme", theme)` call — no class toggling, no inline style overrides.

Chart.js charts must be re-initialized after a theme switch to pick up the new text/grid colors, as Chart.js does not read CSS variables dynamically. `ThemeModule.apply()` calls `ChartModule.rerenderAll()` after updating the attribute.

---

## Chart Rendering Approach

### Donut Chart

Used in two locations: Dashboard quick-view and Analytics full-width view.

```
ChartModule.renderDonut(canvasId, categoryData):
  1. If Chart.js instance exists on canvasId: destroy it
  2. Build datasets from categoryData (amounts → data, colors → backgroundColor)
  3. new Chart(ctx, { type: "doughnut", ... })
  4. Configure onClick callback:
     - Identify clicked slice index
     - If same index as currently selected: deselect (reset offsets, hide label)
     - Else: set offset on clicked arc, show detail label (name + amount + %)
  5. Set cutout to "60%" for donut shape
```

### Line Chart (Analytics)

```
ChartModule.renderLine(canvasId, dataPoints):
  1. Aggregate expense transactions for current calendar month
  2. Build daily or weekly labels based on elapsed days (≤14 days → daily, else weekly)
  3. Fill gaps (days/weeks with 0 expense) with 0 values
  4. new Chart(ctx, { type: "line", ... })
```

Both chart types use `var(--color-text)` and `var(--color-muted)` passed in as config options at render time (read from `getComputedStyle(document.documentElement)`).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Balance computation is the difference of income and expense sums

*For any* non-empty list of transactions where each transaction has a valid amount and type, the computed Balance must equal the sum of all Income amounts minus the sum of all Expense amounts, rounded to exactly 2 decimal places.

**Validates: Requirements 4.1**

---

### Property 2: Large balance values are abbreviated consistently

*For any* numeric balance value whose absolute magnitude exceeds 999,999,999.99, the formatted display string must begin with the active currency symbol and use abbreviated notation (K, M, B suffix), and the raw numeric value of the abbreviation must round-trip to within 0.1% of the original value.

**Validates: Requirements 4.4**

---

### Property 3: Transaction amount validation rejects out-of-range values

*For any* amount value that is not a positive number strictly within the range [0.01, 999,999,999.99] (including negative numbers, zero, non-numeric strings, and values outside the bounds), the Validator must reject the submission and produce a non-empty error message for the amount field.

**Validates: Requirements 5.7, 18.7**

---

### Property 4: Form submission with any empty required field is rejected

*For any* Quick Add Form submission where at least one required field (item name, amount, type, category, or custom category name when applicable) is empty or whitespace-only after trimming, the Validator must reject the submission, display an inline error for every empty field, and leave LocalStorage unchanged.

**Validates: Requirements 5.5, 5.6**

---

### Property 5: Donut chart slice arcs are proportional to category spending

*For any* set of expense transactions grouped by category, each rendered slice's arc length as a fraction of the full circle must equal that category's total amount divided by the grand total of all displayed categories, within a tolerance of 0.001.

**Validates: Requirements 6.1, 13.1**

---

### Property 6: Text search returns only transactions whose name contains the query

*For any* non-empty search string and any list of transactions, every transaction returned by `FilterModule.applyFilters` with that text filter must have an item name that contains the search string (case-insensitive), and no transaction whose item name does not contain the string may appear in the results.

**Validates: Requirements 11.1**

---

### Property 7: Category filter returns only transactions matching the selected category

*For any* specific category selection (not "All Categories") and any list of transactions, every transaction in the filtered result must have a category that exactly matches the selected category, and no transaction with a different category may appear.

**Validates: Requirements 11.2**

---

### Property 8: Month filter returns only transactions within the selected month

*For any* specific month-year selection (not "All Months") and any list of transactions, every transaction in the filtered result must have a date that falls within that calendar month and year, and no transaction outside that month may appear.

**Validates: Requirements 11.3**

---

### Property 9: Multiple active filters apply AND logic

*For any* combination of simultaneously active filters (text, category, month), every transaction in the filtered result must satisfy all active filter conditions simultaneously. Equivalently, `applyFilters(T, {f1, f2, f3})` ⊆ `applyFilters(T, {f1})` ∩ `applyFilters(T, {f2})` ∩ `applyFilters(T, {f3})`.

**Validates: Requirements 11.4**

---

### Property 10: Sort produces a correctly ordered list for any sort key

*For any* list of transactions and any valid sort key (newest, oldest, highest, lowest, category), the result of `SortModule.apply` must be a permutation of the input list that satisfies the ordering predicate for that key — and the result must contain exactly the same transactions as the input (no additions or removals).

**Validates: Requirements 12.2**

---

### Property 11: Data backup/restore round-trip preserves all LocalStorage state

*For any* valid app state containing up to 10,000 transactions, serializing to JSON via `DataManagerModule.exportJSON` and then restoring via `DataManagerModule.importJSON` must produce a state with identical values for all `spenchart_*` LocalStorage keys.

**Validates: Requirements 19.5**

---

### Property 12: CSV fields with special characters are RFC 4180 compliant

*For any* transaction field value that contains a comma, a double quote character, or a newline character, `DataManagerModule.escapeCSVField` must enclose the value in double quotes and escape every internal double quote as two consecutive double quote characters (`""`), producing a string parseable by any RFC 4180-compliant CSV parser as the original value.

**Validates: Requirements 20.4**

---

### Property 13: Undo restores a deleted transaction to its original list position

*For any* transaction list and any transaction within it, deleting that transaction and then invoking undo must produce a transaction list that is identical to the original list (same transactions, same order).

**Validates: Requirements 10.5**

---

### Property 14: Budget progress percentage is capped at 100 and correctly computed

*For any* total monthly expense amount and any positive budget limit, `BudgetModule.computeProgress(spent, limit)` must return `min((spent / limit) * 100, 100)`, and the returned value must be in the range [0, 100] regardless of how large `spent` is.

**Validates: Requirements 8.2**

---

### Property 15: Profile and category name validation rejects empty and overlength names

*For any* string that is empty after trimming or whose length after trimming exceeds the applicable maximum (50 characters for display names; 50 characters for category names), the Validator must reject the value and produce a non-empty error message. *For any* category name that duplicates an existing category name (case-insensitive), the Validator must also reject it.

**Validates: Requirements 16.4, 18.5, 18.6**

---

## Error Handling

### LocalStorage Errors

All `localStorage` writes are wrapped in try/catch. On `QuotaExceededError` or any other write failure:
- The in-memory state is **not** updated (state remains consistent with what was last successfully persisted).
- A toast error message is displayed to the user describing what could not be saved.
- The form fields retain their entered values so the user does not lose input.

Reads are similarly wrapped. Missing or unparseable keys fall back to module defaults (empty arrays, null, "light", "IDR", etc.).

### File Import Errors

`DataManagerModule.importJSON` validates the file in three stages before touching LocalStorage:
1. Size check: reject files > 10 MB immediately.
2. JSON parse: catch `SyntaxError`, display "Invalid JSON format" error.
3. Schema validation: check required top-level keys and transaction array structure; reject with a descriptive message if invalid.

Only after all three pass does the restore write begin. Writes are batched; if any write fails, the original keys are restored from a pre-captured snapshot (rollback).

### Chart.js Load Failure

If `window.Chart` is undefined when `ChartModule.renderDonut` or `ChartModule.renderLine` is called, the chart container displays a static fallback message ("Chart unavailable — please check your internet connection"). This prevents a JavaScript `TypeError` from propagating.

### Profile Avatar Load Failure

If the avatar `<img>` element fires an `error` event, a fallback `<span>` containing the first letter of the display name is rendered at the same dimensions (minimum 32×32 CSS pixels).

### Reset Failure

If `StorageModule.clearAll()` throws, the confirmation modal remains open, all data is preserved, and an error toast is displayed. The reset button is re-enabled so the user can retry.

---

## Testing Strategy

Spenchart's logic is highly amenable to property-based testing because most of the core functions are pure transformations over well-defined data structures: balance computation, filtering, sorting, formatting, CSV escaping, and validation all take inputs and return outputs with no side effects.

### Property-Based Testing Library

Use **fast-check** (npm package, MIT license) as the property-based testing library. It generates arbitrary typed values (strings, numbers, arrays, objects) and shrinks failing cases to minimal counterexamples.

Since Spenchart has no build step, tests run in a Node.js test harness (e.g. Vitest with `--run` flag) that imports the pure logic functions extracted from `js/script.js` via CommonJS exports or a thin test adapter shim.

Minimum **100 iterations** per property test.

Each property test must include a comment tag referencing its design property:
```
// Feature: spenchart, Property N: <property_text>
```

### Property Tests (one per Correctness Property)

Each property listed in the Correctness Properties section maps to exactly one property-based test:

| Property | Test focus |
|----------|-----------|
| P1 | Generate arbitrary transaction arrays; verify balance formula |
| P2 | Generate amounts > 999,999,999.99; verify abbreviation format |
| P3 | Generate out-of-range and non-numeric amounts; verify rejection |
| P4 | Generate form objects with one or more empty fields; verify rejection and error presence |
| P5 | Generate random category→amount maps; verify slice arc fractions |
| P6 | Generate random transaction arrays and search strings; verify text filter invariant |
| P7 | Generate random transaction arrays and category names; verify category filter invariant |
| P8 | Generate random transaction arrays and month strings; verify month filter invariant |
| P9 | Generate random transaction arrays with multiple filters; verify AND subset invariant |
| P10 | Generate random transaction arrays; apply each sort key; verify ordering and completeness |
| P11 | Generate random app state objects; serialize then restore; verify key/value identity |
| P12 | Generate strings with commas, quotes, and newlines; verify RFC 4180 escaping |
| P13 | Generate random transaction lists; delete random item; undo; verify list identity |
| P14 | Generate arbitrary (spent, limit) pairs; verify progress clamping |
| P15 | Generate empty, whitespace-only, overlength, and duplicate names; verify rejection |

### Unit Tests (example-based)

Unit tests cover specific examples and edge cases that property generators would be unlikely to produce first or that depend on UI integration:

- Rendering an empty transaction list shows empty-state message
- Balance of zero displays as "0.00" with currency symbol
- Negative balance renders in Crimson Red (`#EF4444`)
- Theme toggle persists and applies correct `data-theme` attribute
- Tab switch within 100 ms (measured with `performance.now`)
- Toast auto-dismisses after 5 seconds (mock timers)
- CSV export with zero transactions produces header-only file
- Reset confirmation modal appears before deletion
- Currency change re-renders all visible monetary values

### Integration Points

The following behaviors require integration tests (manual or browser-based) because they depend on the full DOM, `localStorage` API, Chart.js rendering, or file download APIs:

- End-to-end add transaction → balance updates → donut chart updates
- JSON backup file downloads with correct filename and date
- CSV file downloads with correct MIME type
- Profile avatar fallback on image load failure
- App initializes to Dashboard tab on page load
- Mobile layout at 360×640 viewport has tap targets ≥ 44×44 CSS pixels
