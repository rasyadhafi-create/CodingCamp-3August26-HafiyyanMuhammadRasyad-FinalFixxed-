# Implementation Plan: Spenchart

## Overview

Implement the Spenchart SPA as three files (`index.html`, `css/styles.css`, `js/script.js`) with no build tooling. All modules live in `js/script.js` as plain-object namespaces. Property-based tests run via Vitest with fast-check through a thin CommonJS shim.

## Tasks

- [ ] 1. Project scaffolding and file structure
  - Create `index.html` at repo root with HTML5 boilerplate, Chart.js CDN `<script>` tag, `<link>` to `css/styles.css`, and `<script>` to `js/script.js`
  - Create `css/styles.css` with reset, CSS custom property tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-accent`, `--color-income`, `--color-warning`, `--color-expense`) under `[data-theme="light"]` and `[data-theme="dark"]` selectors
  - Create `js/script.js` with module namespace stubs (`StorageModule`, `StateModule`, `RouterModule`, `ThemeModule`, `ValidatorModule`, `TransactionModule`, `FilterModule`, `SortModule`, `BudgetModule`, `ChartModule`, `ToastModule`, `DataManagerModule`, `ProfileModule`, `CurrencyModule`, `RenderModule`)
  - Create `tests/` directory with `package.json` (vitest + fast-check, pinned versions), `vitest.config.js`, and `tests/shim.js` test adapter that imports pure functions from `js/script.js`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. StorageModule and StateModule
  - [ ] 2.1 Implement `StorageModule` with `load(key)`, `save(key, value)`, `remove(key)`, and `clearAll()` — all keys namespaced under `spenchart_`, all writes wrapped in try/catch for `QuotaExceededError`
    - _Requirements: 1.4_
  - [ ] 2.2 Implement `StateModule` holding in-memory app state (transactions array, budgets object, categories array, profile object, currency string, theme string) with `init()` that hydrates from `StorageModule` and falls back to safe defaults
    - _Requirements: 1.4, 3.8, 3.9, 17.1_

- [ ] 3. SPA routing — RouterModule
  - [ ] 3.1 Implement `RouterModule.navigate(tabId)` that adds/removes `class="hidden"` (CSS `display:none`) on the four `#tab-*` section elements and sets `.active` on the matching bottom-nav item
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [ ] 3.2 Implement `RouterModule.init()` that calls `navigate("dashboard")` on page load, and wire up all four bottom-nav click handlers
    - _Requirements: 2.3, 2.6_

- [ ] 4. Theme system — ThemeModule and CSS variables
  - [ ] 4.1 Implement `ThemeModule.apply(theme)` setting `data-theme` attribute on `<html>`, persisting via `StorageModule`, and calling `ChartModule.rerenderAll()` stub
    - _Requirements: 3.1, 3.2, 3.7_
  - [ ] 4.2 Implement `ThemeModule.init()` loading stored theme, validating ("light"|"dark"), defaulting to "light"; implement `ThemeModule.toggle()`; wire Theme Switcher button in header
    - _Requirements: 3.8, 3.9_
  - [ ]* 4.3 Write unit tests for ThemeModule: toggle persists correct value, invalid stored value falls back to light, `data-theme` attribute is set on `<html>`
    - _Requirements: 3.7, 3.8, 3.9_

- [ ] 5. Data models, ValidatorModule, and TransactionModule
  - [ ] 5.1 Define Transaction, Category, Budget, and Profile data model shapes in `js/script.js`; implement `TransactionModule.add(fields)` (generates id via `crypto.randomUUID()`, sets date to today, saves to `StorageModule`) and `TransactionModule.getAll()`
    - _Requirements: 1.4, 5.9_
  - [ ] 5.2 Implement `TransactionModule.remove(id)` (returns removed transaction for undo) and `TransactionModule.restore(transaction)` (re-inserts at original index); implement `TransactionModule.getRecent(n)`
    - _Requirements: 10.1, 10.5, 7.1_
  - [ ]* 5.3 Write property test for Property 13: Undo restores deleted transaction to original list position
    - **Property 13: Undo restores a deleted transaction to its original list position**
    - **Validates: Requirements 10.5**
  - [ ] 5.4 Implement `ValidatorModule.validateTransaction(fields)` — item_name (non-empty, ≤100 chars), amount (numeric, [0.01, 999999999.99]), type, category non-empty, custom_category rules; returns `ValidationResult { valid, errors }`
    - _Requirements: 5.5, 5.6, 5.7_
  - [ ]* 5.5 Write property test for Property 3: Amount validation rejects out-of-range values
    - **Property 3: Transaction amount validation rejects out-of-range values**
    - **Validates: Requirements 5.7, 18.7**
  - [ ]* 5.6 Write property test for Property 4: Form submission with any empty required field is rejected
    - **Property 4: Form submission with any empty required field is rejected**
    - **Validates: Requirements 5.5, 5.6**
  - [ ] 5.7 Implement `ValidatorModule.validateBudget(value)`, `ValidatorModule.validateCategoryName(name, existingNames)`, and `ValidatorModule.validateProfileName(name)`
    - _Requirements: 18.7, 18.5, 18.6, 16.4_
  - [ ]* 5.8 Write property test for Property 15: Profile and category name validation rejects empty, overlength, and duplicate names
    - **Property 15: Profile and category name validation rejects empty and overlength names**
    - **Validates: Requirements 16.4, 18.5, 18.6**

- [ ] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. CurrencyModule
  - [ ] 7.1 Implement `CurrencyModule.format(amount, currencyCode)` — symbol prefix, thousand-separator formatting for IDR/USD/EUR/GBP, abbreviated notation (K/M/B) for values > 999,999,999.99
    - _Requirements: 17.1, 17.4, 4.3, 4.4_
  - [ ] 7.2 Implement `CurrencyModule.init()` (load from storage, default "IDR") and `CurrencyModule.set(code)` (persist + trigger re-render)
    - _Requirements: 17.2, 17.3, 17.5_
  - [ ]* 7.3 Write property test for Property 2: Large balance values are abbreviated consistently
    - **Property 2: Large balance values are abbreviated consistently**
    - **Validates: Requirements 4.4**

- [ ] 8. Dashboard — Hero Balance Card
  - [ ] 8.1 Implement `RenderModule.renderBalance()` — compute balance as sum of income minus sum of expense (rounded to 2 dp), render with active currency symbol, color in `--color-income` (≥0) or `--color-expense` (<0); display "0.00" when no transactions
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_
  - [ ]* 8.2 Write property test for Property 1: Balance computation is the difference of income and expense sums
    - **Property 1: Balance computation is the difference of income and expense sums**
    - **Validates: Requirements 4.1**
  - [ ]* 8.3 Write unit tests: zero balance shows "0.00" with currency symbol, negative balance renders in Crimson Red
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 9. Dashboard — Quick Add Transaction Form
  - [ ] 9.1 Build `Quick_Add_Form` DOM in `index.html` inside `#tab-dashboard`: item name input (maxlength=100), amount input, type toggle (Expense/Income), category dropdown; wire type-toggle change handler to repopulate category options per Requirement 5.2/5.3; show custom category text input when "Custom" is selected (5.4)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 9.2 Implement form submit handler: call `ValidatorModule.validateTransaction`, display inline errors on failure without saving (5.6), on success call `TransactionModule.add` then reset form and trigger `RenderModule.renderDashboard()` (5.8, 5.9); catch LocalStorage failure and preserve field values (5.10)
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [ ] 10. ChartModule and Dashboard Donut Chart
  - [ ] 10.1 Implement `ChartModule.buildCategoryData(transactions)` — aggregate expense transactions by category, assign deterministic color per category from a fixed palette; implement `ChartModule.renderDonut(canvasId, categoryData)` — destroy existing Chart.js instance if present, create Doughnut chart with 60% cutout, onClick slice selection/deselection with arc offset and detail label (name + amount formatted to 2 dp + %)
    - _Requirements: 6.1, 6.4, 6.5, 13.2, 13.3_
  - [ ] 10.2 Implement `ChartModule.rerenderAll()` — re-renders all active chart canvases with current theme colors read from `getComputedStyle`; handle `window.Chart` undefined by rendering fallback message in chart container
    - _Requirements: 1.3_
  - [ ] 10.3 Implement `RenderModule.renderDashboardDonut()` — call `ChartModule.renderDonut` on dashboard canvas; show placeholder message when no expense transactions exist; trigger update on transaction add/delete within 1 second
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  - [ ]* 10.4 Write property test for Property 5: Donut chart slice arcs are proportional to category spending
    - **Property 5: Donut chart slice arcs are proportional to category spending**
    - **Validates: Requirements 6.1, 13.1**

- [ ] 11. Dashboard — Recent Transactions Preview
  - [ ] 11.1 Implement `RenderModule.renderRecentTransactions()` — render up to 5 most recent transactions (item name, amount with currency symbol and sign prefix, category, date formatted as DD MMM YYYY); show empty-state message when no transactions; refresh within 1 second on add/delete; add "See All" link that calls `RouterModule.navigate("transactions")`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. BudgetModule and Dashboard Budget Summary Card
  - [ ] 12.1 Implement `BudgetModule.computeMonthlyExpense(transactions, year, month)`, `BudgetModule.computeProgress(spent, limit)` (capped at 100), and `BudgetModule.getProgressState(spent, limit)` ("under"/"warning"/"over" thresholds)
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  - [ ]* 12.2 Write property test for Property 14: Budget progress percentage is capped at 100 and correctly computed
    - **Property 14: Budget progress percentage is capped at 100 and correctly computed**
    - **Validates: Requirements 8.2**
  - [ ] 12.3 Implement `RenderModule.renderBudgetSummaryCard()` — render card only when global budget is configured and > 0; show spent amount, limit, remaining, and progress bar colored by progress state; show over-limit warning label when > 100%; display prompt when budget limit is zero; calculate spending for current calendar month only
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Transactions Tab — Transaction List
  - [ ] 14.1 Build `#tab-transactions` DOM in `index.html` with `.search-filter-bar` (text search input, category dropdown, month dropdown, sort dropdown) and `.transaction-list` container
    - _Requirements: 9.1, 11.1, 11.2, 11.3, 12.1_
  - [ ] 14.2 Implement `RenderModule.renderTransactionList(transactions)` — render all transactions in reverse chronological order by default; each row shows item name (max 100 chars), date (DD MMM YYYY), category as colored badge, amount with `+`/`-` prefix colored by type, and Delete button in `--color-expense`; show empty-state message when list is empty; enable vertical scrolling when overflow; skip records missing required display fields
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 15. FilterModule and SortModule
  - [ ] 15.1 Implement `FilterModule.applyFilters(transactions, filters)` — case-insensitive substring match for text, exact match for category, YYYY-MM match for month; AND logic when multiple filters active; `getDistinctCategories` and `getDistinctMonths` helpers
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [ ]* 15.2 Write property test for Property 6: Text search returns only transactions whose name contains the query
    - **Property 6: Text search returns only transactions whose name contains the query**
    - **Validates: Requirements 11.1**
  - [ ]* 15.3 Write property test for Property 7: Category filter returns only transactions matching the selected category
    - **Property 7: Category filter returns only transactions matching the selected category**
    - **Validates: Requirements 11.2**
  - [ ]* 15.4 Write property test for Property 8: Month filter returns only transactions within the selected month
    - **Property 8: Month filter returns only transactions within the selected month**
    - **Validates: Requirements 11.3**
  - [ ]* 15.5 Write property test for Property 9: Multiple active filters apply AND logic
    - **Property 9: Multiple active filters apply AND logic**
    - **Validates: Requirements 11.4**
  - [ ] 15.6 Implement `SortModule.apply(transactions, sortKey)` for keys: newest (date desc), oldest (date asc), highest (amount desc), lowest (amount asc), category (alpha asc)
    - _Requirements: 12.1, 12.2_
  - [ ]* 15.7 Write property test for Property 10: Sort produces a correctly ordered list for any sort key
    - **Property 10: Sort produces a correctly ordered list for any sort key**
    - **Validates: Requirements 12.2**
  - [ ] 15.8 Wire search input (debounced 300 ms), category dropdown, month dropdown, and sort dropdown to call `FilterModule.applyFilters` + `SortModule.apply` then `RenderModule.renderTransactionList`; populate category and month dropdowns with distinct values from stored transactions
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.3, 12.4_

- [ ] 16. ToastModule and Delete with Undo
  - [ ] 16.1 Implement `ToastModule.show(message, undoCallback)` — render toast DOM element at bottom of screen with item name and "Undo" button; start 5-second countdown with animated progress bar; on timeout call permanent delete and dismiss; only one toast active at a time (replace previous)
    - _Requirements: 10.2, 10.3, 10.4_
  - [ ] 16.2 Wire Delete button handler in `RenderModule.renderTransactionList`: call `TransactionModule.remove(id)`, re-render Transaction List and Dashboard within 300 ms, then call `ToastModule.show` with undo callback; on Undo click call `TransactionModule.restore` + re-render and dismiss toast immediately
    - _Requirements: 10.1, 10.5, 10.6, 10.7_
  - [ ]* 16.3 Write unit tests for ToastModule: auto-dismisses after 5 seconds (mock timers), Undo click dismisses immediately and calls callback
    - _Requirements: 10.3, 10.6_

- [ ] 17. Analytics Tab
  - [ ] 17.1 Build `#tab-analytics` DOM in `index.html` with `.analytics-donut` canvas (full content-area width), `.monthly-trend-chart` canvas, and `.mom-comparison` section
    - _Requirements: 13.1, 14.1, 15.1_
  - [ ] 17.2 Implement `RenderModule.renderAnalytics()` — call `ChartModule.renderDonut` on analytics canvas (full-width, with category name + amount + percentage on slice click); show empty-state when no expense transactions for active period
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ] 17.3 Implement `ChartModule.renderLine(canvasId, dataPoints)` — aggregate current-month expense transactions; use daily labels when ≤14 elapsed days, weekly otherwise; fill zero-expense gaps; update within 2 seconds on new expense transaction; show empty-state when no data
    - _Requirements: 14.1, 14.2, 14.3_
  - [ ] 17.4 Implement month-over-month comparison in `RenderModule.renderAnalytics()` — current vs previous month total expense cards, percentage change (1 dp), "no prior-month data" message when previous month is empty; top 3 expense categories for current month (name + total, only available categories shown)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 18. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Settings Tab — Profile Configuration
  - [ ] 19.1 Build `.profile-section` DOM in `#tab-settings`: display name text input (maxlength=50) and avatar icon selector (6–20 predefined icons); implement `ProfileModule` with `save(name, avatarKey)` persisting to `StorageModule` and `init()` loading stored profile
    - _Requirements: 16.1, 16.2, 16.6_
  - [ ] 19.2 Wire profile save button: call `ValidatorModule.validateProfileName`, show error on empty or >50 chars without modifying stored value; on success persist and update Profile Avatar in header within 1 second; handle LocalStorage failure with error message and retain existing display
    - _Requirements: 16.3, 16.4, 16.5_
  - [ ]* 19.3 Write unit tests for ProfileModule: avatar fallback renders first letter of display name when `<img>` fires error event
    - _Requirements: 22.6_

- [ ] 20. Settings Tab — Currency Selector
  - [ ] 20.1 Build `.currency-section` DOM in `#tab-settings` with currency selector dropdown listing IDR, USD, EUR, GBP (code + symbol); wire change handler to call `CurrencyModule.set(code)` which persists within 1 second and re-renders all monetary values app-wide without page reload; handle LocalStorage unavailability with error message
    - _Requirements: 17.2, 17.3, 17.4, 17.5_

- [ ] 21. Settings Tab — Budget and Category Manager
  - [ ] 21.1 Build `.budget-category-mgr` DOM in `#tab-settings`: global budget limit input, per-category budget limit inputs for each category; implement save handlers calling `ValidatorModule.validateBudget` — reject non-numeric or out-of-range [0.01, 999999999.99] with error message
    - _Requirements: 18.1, 18.2, 18.7_
  - [ ] 21.2 Implement custom category creation: category name input (max 50 chars) + emoji picker (emoji selector element); wire save button to call `ValidatorModule.validateCategoryName` (empty name rejected, duplicate rejected case-insensitively); on success add to `StateModule` categories array, persist to `StorageModule`, add to Quick_Add_Form category dropdown within 1 second
    - _Requirements: 18.3, 18.4, 18.5, 18.6_

- [ ] 22. DataManagerModule — Backup, Restore, CSV Export, Reset
  - [ ] 22.1 Implement `DataManagerModule.exportJSON()` — serialize all `spenchart_*` LocalStorage keys to a JSON object and trigger browser download as `backup-YYYY-MM-DD.json`
    - _Requirements: 19.1_
  - [ ] 22.2 Implement `DataManagerModule.importJSON(file)` — size check (≤10 MB), JSON parse (catch SyntaxError), schema validation; on all-pass overwrite LocalStorage keys and call `RenderModule.renderDashboard()` + re-render all tabs within 3 seconds; on any failure display error and leave LocalStorage unchanged; rollback partial writes on failure
    - _Requirements: 19.2, 19.3, 19.4_
  - [ ]* 22.3 Write property test for Property 11: Data backup/restore round-trip preserves all LocalStorage state
    - **Property 11: Data backup/restore round-trip preserves all LocalStorage state**
    - **Validates: Requirements 19.5**
  - [ ] 22.4 Implement `DataManagerModule.escapeCSVField(value)` (RFC 4180: enclose in double quotes if comma/quote/newline present, escape internal quotes as `""`); implement `DataManagerModule.exportCSV()` — build CSV with columns date, item_name, category, type, amount (2 dp); trigger download as `transactions.csv` with `text/csv` MIME type; header-only file when no transactions; display error if download fails
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  - [ ]* 22.5 Write property test for Property 12: CSV fields with special characters are RFC 4180 compliant
    - **Property 12: CSV fields with special characters are RFC 4180 compliant**
    - **Validates: Requirements 20.4**
  - [ ] 22.6 Build Reset App Data button in `.data-manager`; implement confirmation modal (description + explicit confirmation control); on confirm call `StorageModule.clearAll()` and re-render app to empty initial state; disable confirmation button while in progress; on failure display error and preserve data; on cancel close modal without touching data
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  - [ ]* 22.7 Write unit tests for DataManagerModule: CSV export with zero transactions produces header-only file; reset confirmation modal appears before deletion
    - _Requirements: 20.2, 21.1_

- [ ] 23. Header, bottom navigation, and responsive layout
  - [ ] 23.1 Build persistent `<header>` in `index.html` with app name "Spenchart", Theme Switcher toggle, and Profile Avatar `<img>` (with `onerror` fallback `<span>` showing first letter of display name, min 32×32 CSS px); build persistent `<nav class="bottom-nav">` with four tab items (icons + labels for Dashboard, Transactions, Analytics, Settings)
    - _Requirements: 22.1, 22.2, 22.6_
  - [ ] 23.2 Add responsive CSS in `css/styles.css`: mobile viewport (<768px) — touch-friendly tap targets ≥44×44 CSS px for all header and bottom-nav interactive elements; desktop viewport (≥768px) — header items in single non-wrapping row, bottom-nav full-width with equal-width tab items; verify no layout overflow at 360×640 and 1024×768 viewports
    - _Requirements: 22.3, 22.4, 1.6_
  - [ ] 23.3 Wire bottom-nav click handlers to `RouterModule.navigate`; apply active indicator (Primary Accent color) on the selected tab item without reloading header or nav
    - _Requirements: 22.5_

- [ ] 24. Final wiring — init sequence and cross-module integration
  - [ ] 24.1 Write the `DOMContentLoaded` init sequence in `js/script.js`: call `StorageModule` (implicit), `StateModule.init()`, `CurrencyModule.init()`, `ThemeModule.init()`, `ProfileModule.init()` (loads avatar + name, sets fallback handler), `RouterModule.init()`, then `RenderModule.renderDashboard()` — ensuring all modules are initialized before first render
    - _Requirements: 1.6, 2.3, 3.8, 17.1_
  - [ ]* 24.2 Write integration tests: add transaction → balance updates + donut chart updates within 1 second; tab switch completes within 100 ms (measured with `performance.now`); currency change re-renders all visible monetary values
    - _Requirements: 4.2, 2.2, 17.4_

- [ ] 25. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests require a minimum of 100 iterations per fast-check `fc.assert` call
- Each property test must include a comment tag: `// Feature: spenchart, Property N: <property_text>`
- The test shim (`tests/shim.js`) must export pure functions from `js/script.js` without executing DOM code — guard DOM-dependent code with `if (typeof document !== "undefined")`
- Tasks in items 15.2–15.7 cover all 5 filter/sort properties (P6–P10) and may be written in a single test file `tests/filter-sort.test.js`
- Checkpoints at tasks 6, 13, 18, and 25 ensure incremental validation across the build
- No build step, no bundler — the `tests/` directory is the only Node.js context; `js/script.js` must remain browser-loadable as a plain `<script>` tag

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "5.1", "7.1", "7.2", "23.1", "23.2", "23.3"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.7", "7.3"] },
    { "id": 5, "tasks": ["5.3", "5.5", "5.6", "5.8", "8.1", "12.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "9.1", "12.2", "14.1"] },
    { "id": 7, "tasks": ["9.2", "10.1", "12.3", "14.2"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "11.1", "15.1"] },
    { "id": 9, "tasks": ["15.2", "15.3", "15.4", "15.5", "15.6", "16.1", "17.1"] },
    { "id": 10, "tasks": ["15.7", "15.8", "16.2", "17.2", "17.3", "17.4"] },
    { "id": 11, "tasks": ["16.3", "19.1", "20.1", "21.1"] },
    { "id": 12, "tasks": ["19.2", "19.3", "21.2", "22.1"] },
    { "id": 13, "tasks": ["22.2", "22.4", "22.6"] },
    { "id": 14, "tasks": ["22.3", "22.5", "22.7"] },
    { "id": 15, "tasks": ["24.1"] },
    { "id": 16, "tasks": ["24.2"] }
  ]
}
```
