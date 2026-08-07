# Requirements Document

## Introduction

Spenchart is a mobile-first Single Page Application (SPA) for personal expense and budget visualization. It provides users with a simple, secure, and highly visual way to track daily cash flow entirely on the client side — no backend, no accounts, no server. All data persists in the browser's LocalStorage. The app is structured as a 4-tab SPA (Dashboard, Transactions, Analytics, Settings) and supports a Light and Dark visual theme.

---

## Glossary

- **App**: The Spenchart SPA running in the user's browser.
- **Transaction**: A single financial record with an item name, amount, type (Income or Expense), category, and date.
- **Balance**: The computed value of Total Income minus Total Expense across all stored Transactions.
- **Category**: A label classifying a Transaction (e.g., Food, Transport, Salary). Categories are either predefined or user-created.
- **Budget**: A user-configured monthly spending limit, either global or per-category.
- **LocalStorage**: The browser's built-in key-value storage API used as the sole persistence layer.
- **Theme**: The active visual mode of the App — either Light Mode or Dark Mode.
- **Tab**: One of four primary navigation sections of the SPA: Dashboard, Transactions, Analytics, Settings.
- **Toast**: A temporary, non-blocking notification shown at the bottom of the screen.
- **Profile**: A locally stored user display name and avatar icon with no authentication.
- **Currency**: The symbol and formatting applied to all monetary values displayed in the App.
- **CSV**: A comma-separated values plain-text file format used for exporting transaction history.
- **Donut_Chart**: A circular chart rendered via Chart.js or native Canvas/SVG showing spending breakdown by category.
- **Line_Chart**: A time-series chart rendered via Chart.js or native Canvas/SVG showing spending trends over time.
- **Quick_Add_Form**: The transaction input form displayed on the Dashboard tab.
- **Transaction_List**: The scrollable list of all Transactions rendered in the Transactions tab.
- **Data_Manager**: The component in the Settings tab responsible for export, import, and reset of app data.
- **Category_Manager**: The component in the Settings tab for managing global and per-category budget limits and custom categories.
- **Validator**: The client-side logic that checks form inputs before a Transaction is saved.
- **Router**: The client-side navigation component that switches visible Tab sections using CSS `display` toggling.

---

## Requirements

### Requirement 1: Project Structure & Technology Constraints

**User Story:** As a developer, I want the project to use a strictly defined file structure and technology stack, so that the app remains simple, portable, and free of build tooling.

#### Acceptance Criteria

1. THE App SHALL be implemented using exactly one HTML file at the repository root, exactly one CSS file at `css/styles.css`, and exactly one JavaScript file at `js/script.js` — no additional `.html`, `.css`, or `.js` files SHALL exist outside the `.kiro` folder.
2. THE App SHALL use only HTML5, CSS3, and Vanilla JavaScript — no JavaScript frameworks (React, Vue, Angular, etc.) and no CSS frameworks (Bootstrap, Tailwind, etc.) SHALL be used, verified by the absence of any `<script src>` or `<link rel="stylesheet">` references to framework URLs or local framework files.
3. THE App SHALL use either Chart.js loaded via a CDN `<script>` tag or native SVG/Canvas APIs for all chart rendering — no other charting libraries SHALL be referenced.
4. THE App SHALL store all persistent data exclusively in the browser's `localStorage` API — no cookies, `sessionStorage`, `IndexedDB`, server-side storage, or external API calls SHALL be used for data persistence.
5. THE App SHALL include the `.kiro` folder in the repository, committed and present at the repository root.
6. WHEN the App is opened in the most recent stable release of Chrome, Safari, Edge, or Firefox on a desktop viewport of at least 1024×768 pixels or a mobile viewport of at least 360×640 pixels, THE App SHALL render all UI elements without layout overflow, JavaScript console errors, or broken functionality.

---

### Requirement 2: Client-Side SPA Navigation

**User Story:** As a user, I want to switch between the four tabs of the app without page reloads, so that navigation feels instant and my data is not lost.

#### Acceptance Criteria

1. THE Router SHALL implement tab navigation by toggling CSS `display: block` and `display: none` on Tab section elements.
2. WHEN a user taps or clicks a tab, THE Router SHALL display the selected Tab section and hide all other Tab sections within 100 milliseconds.
3. THE Router SHALL display the Dashboard tab by default on initial page load.
4. WHILE a tab is active, THE Router SHALL apply a visual active indicator to the corresponding bottom navigation item using the Primary Accent color.
5. IF a user taps or clicks a tab that is already active, THEN THE Router SHALL keep the current Tab section displayed and preserve all unsaved data in that Tab section unchanged.
6. IF the Router cannot resolve the current navigation state on initial page load, THEN THE Router SHALL fall back to displaying the Dashboard tab.

---

### Requirement 3: Dual-Theme Design System

**User Story:** As a user, I want to switch between Light and Dark themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL implement a Light Mode theme with background color `#F8FAFC`, surface card color `#FFFFFF`, primary text color `#0F172A`, muted label color `#64748B`, and primary accent color `#2563EB`.
2. THE App SHALL implement a Dark Mode theme with primary background color `#0F172A`, surface card color `#1E293B`, primary text color `#F1F5F9`, muted label color `#94A3B8`, and primary accent color `#22D3EE`.
3. THE App SHALL use Emerald Green (`#10B981`) exclusively to indicate Income amounts, positive Balance, and under-budget progress states.
4. THE App SHALL use Amber Orange (`#F59E0B`) exclusively to indicate near-limit budget warning states.
5. THE App SHALL use Crimson Red (`#EF4444`) exclusively to indicate Expense amounts, over-budget states, and Delete action buttons.
6. THE App SHALL apply the Primary Accent color to no more than 15% of the visible screen area, strictly limited to Main CTA buttons, the active Tab indicator, and the selected Donut Chart slice.
7. WHEN the user activates the Theme Switcher, THE App SHALL toggle between Light Mode and Dark Mode and persist the selected Theme in LocalStorage.
8. WHEN the App initializes, THE App SHALL load and apply the Theme stored in LocalStorage, defaulting to Light Mode if no Theme has been stored.
9. IF the Theme stored in LocalStorage is not a recognized value, THEN THE App SHALL discard the stored value and apply Light Mode as the default Theme.

---

### Requirement 4: Dashboard — Hero Balance Card

**User Story:** As a user, I want to see my current net balance at a glance on the Dashboard, so that I immediately understand my financial position.

#### Acceptance Criteria

1. THE App SHALL compute and display the Balance as the sum of all Income Transaction amounts minus the sum of all Expense Transaction amounts, where the Balance value is represented as a decimal number with exactly 2 decimal places.
2. WHEN a Transaction is added or deleted, THE App SHALL recompute and re-render the Balance within 1 second without requiring a page reload.
3. THE App SHALL display the Balance value prefixed with the active Currency symbol, with the Currency symbol appearing immediately before the numeric value with no space between them.
4. IF the Balance value is greater than 999,999,999.99 or less than -999,999,999.99, THEN THE App SHALL display the Balance using abbreviated notation (e.g., "1.0B") with the active Currency symbol prefix.
5. WHILE the Balance is zero or positive, THE App SHALL render the Balance value using Emerald Green (`#10B981`).
6. WHILE the Balance is negative, THE App SHALL render the Balance value using Crimson Red (`#EF4444`).
7. WHEN the Transaction list is empty, THE App SHALL display a Balance of 0.00 with the active Currency symbol prefix.

---

### Requirement 5: Dashboard — Quick Add Transaction Form

**User Story:** As a user, I want to quickly add income or expense transactions from the Dashboard, so that I can log spending without navigating away.

#### Acceptance Criteria

1. THE Quick_Add_Form SHALL include an Item Name text input with a maximum length of 100 characters, an Amount numeric input, a Type toggle (Expense / Income), and a Category dropdown.
2. WHEN the user selects the Expense type, THE Quick_Add_Form SHALL populate the Category dropdown with exactly the following options: Food, Transport, Fun, and Custom.
3. WHEN the user selects the Income type, THE Quick_Add_Form SHALL populate the Category dropdown with exactly the following options: Salary, Freelance, and Other.
4. WHEN the user selects the Custom category option for Expense type, THE Quick_Add_Form SHALL display a text input field accepting a custom category name of 1 to 50 characters.
5. WHEN the user submits the Quick_Add_Form, THE Validator SHALL verify that Item Name, Amount, Type, and Category fields are all non-empty, and that the custom category name field is non-empty when the Custom category is selected.
6. IF the user submits the Quick_Add_Form with one or more empty required fields, THEN THE Validator SHALL display an inline error message adjacent to each empty required field without saving the Transaction.
7. IF the user submits the Quick_Add_Form with an Amount value that is not a positive number in the range 0.01 to 999,999,999.99, THEN THE Validator SHALL display an inline error message adjacent to the Amount field and prevent the Transaction from being saved.
8. WHEN the Validator confirms all fields are valid, THE App SHALL save the Transaction to LocalStorage and reset all Quick_Add_Form fields to their default empty or placeholder state.
9. WHEN the App saves a new Transaction, THE App SHALL set the Transaction's date to the current local date at the time of submission.
10. IF saving the Transaction to LocalStorage fails, THEN THE App SHALL display an error message indicating the Transaction could not be saved and preserve the entered form field values.

---

### Requirement 6: Dashboard — Quick Spending Donut Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category on the Dashboard, so that I can identify where my money is going at a glance.

#### Acceptance Criteria

1. THE Donut_Chart on the Dashboard SHALL render one slice per expense Category that has at least one Expense Transaction recorded in the currently active time period, where each slice's arc length is proportional to that Category's percentage of total spending across all displayed Categories.
2. WHEN a new Expense Transaction is saved, THE Donut_Chart SHALL update to reflect the new category spending totals within 1 second without requiring a page reload.
3. WHEN an Expense Transaction is deleted, THE Donut_Chart SHALL update to reflect the revised category spending totals within 1 second without requiring a page reload.
4. WHEN the user taps or clicks a Donut_Chart slice, THE App SHALL highlight the selected slice by visually distinguishing it from unselected slices and display the category name (up to 50 characters) and total amount formatted to 2 decimal places for that slice.
5. IF the user taps or clicks a slice that is already selected, THEN THE App SHALL deselect it and return all slices to their default visual state and hide the category detail display.
6. WHILE no Expense Transactions exist for the currently active time period, THE Donut_Chart SHALL display a placeholder message indicating no spending data is available, replacing the chart area entirely.

---

### Requirement 7: Dashboard — Recent Transactions Preview

**User Story:** As a user, I want to see my most recent transactions on the Dashboard, so that I can quickly review recent activity without navigating to the Transactions tab.

#### Acceptance Criteria

1. THE App SHALL display up to five of the most recently added Transactions on the Dashboard in reverse chronological order, showing for each: item name, amount with currency symbol and sign prefix, category, and formatted date (DD MMM YYYY).
2. IF fewer than five Transactions have been recorded, THE App SHALL display all available Transactions without showing placeholder rows.
3. WHILE no Transactions exist, THE App SHALL display an empty-state message in the Recent Transactions Preview indicating that no transactions have been recorded yet.
4. WHEN a new Transaction is saved, THE App SHALL refresh the Recent Transactions Preview within 1 second to reflect the updated list without requiring a page reload.
5. THE App SHALL display a "See All" navigation link on the Dashboard that, when tapped or clicked, navigates the user to the Transactions tab.

---

### Requirement 8: Dashboard — Budget Summary Card (Optional Feature)

**User Story:** As a user, I want to see my monthly spending progress against a set budget on the Dashboard, so that I can monitor whether I am staying within my limits.

#### Acceptance Criteria

1. WHERE a global monthly Budget has been configured, THE App SHALL display the Budget Summary Card on the Dashboard showing the total monthly Expense spending amount, the Budget limit amount, and the remaining Budget amount for the current calendar month.
2. WHERE a global monthly Budget has been configured, THE App SHALL render a progress bar indicating the percentage of the Budget spent, calculated as (total monthly Expense spending ÷ Budget limit) × 100, capped at 100% visual fill.
3. WHILE total monthly Expense spending is less than 80% of the Budget limit, THE App SHALL render the Budget progress bar in Emerald Green (`#10B981`).
4. WHILE total monthly Expense spending is greater than or equal to 80% and less than or equal to 100% of the Budget limit, THE App SHALL render the Budget progress bar in Amber Orange (`#F59E0B`).
5. WHILE total monthly Expense spending exceeds 100% of the Budget limit, THE App SHALL render the Budget progress bar in Crimson Red (`#EF4444`) and display an over-limit warning label indicating that the Budget has been exceeded.
6. WHERE a global monthly Budget has been configured, IF the Budget limit value is zero, THEN THE App SHALL NOT display the Budget Summary Card and SHALL display a prompt indicating that a valid Budget must be set.
7. WHERE a global monthly Budget has been configured, WHEN the user views the Dashboard, THE App SHALL calculate total monthly Expense spending using only Expense transactions recorded within the current calendar month.

---

### Requirement 9: Transactions Tab — Transaction List

**User Story:** As a user, I want to view all my transactions in a scrollable list, so that I can review my full transaction history.

#### Acceptance Criteria

1. THE Transaction_List SHALL render all stored Transactions in reverse chronological order by default.
2. THE Transaction_List SHALL display for each Transaction: the item name (maximum 100 characters), the formatted date (DD MMM YYYY), the category as a colored badge, the amount with a `+` prefix for Income and `-` prefix for Expense, and a Delete button.
3. THE App SHALL render Income Transaction amounts using Emerald Green (`#10B981`) and Expense Transaction amounts using Crimson Red (`#EF4444`).
4. THE App SHALL render Delete buttons using Crimson Red (`#EF4444`).
5. WHEN the Transaction_List contains no Transactions, THE App SHALL display an empty-state message indicating no transactions have been recorded.
6. WHILE the Transaction_List contains more Transactions than fit within the visible viewport, THE App SHALL enable vertical scrolling to allow access to all Transactions.
7. IF a Transaction record is missing a required display field (item name, date, category, or amount), THEN THE App SHALL skip rendering that Transaction and continue rendering the remaining Transactions.

---

### Requirement 10: Transactions Tab — Delete with Undo

**User Story:** As a user, I want to be able to delete a transaction and have the option to undo that deletion, so that I can correct accidental deletions quickly.

#### Acceptance Criteria

1. WHEN the user taps or clicks the Delete button for a Transaction, THE App SHALL remove that Transaction from LocalStorage and re-render the Transaction_List and Dashboard data within 300 milliseconds.
2. WHEN a Transaction is deleted, THE App SHALL display a Toast notification containing the deleted Transaction's item name and an "Undo" action button.
3. THE App SHALL keep the Toast visible for exactly 5 seconds after it appears before automatically dismissing it.
4. WHILE the Toast is visible, THE App SHALL display a countdown or progress indicator showing the remaining dismissal time.
5. WHEN the user taps or clicks the "Undo" button in the Toast before it is dismissed, THE App SHALL restore the deleted Transaction to LocalStorage in its original position in the Transaction_List and re-render the Transaction_List and Dashboard data within 300 milliseconds.
6. IF the user taps or clicks the "Undo" button in the Toast before it is dismissed, THEN THE App SHALL dismiss the Toast immediately upon restoration.
7. WHEN the Toast is dismissed without the user activating the "Undo" button, THE App SHALL permanently discard the deleted Transaction from LocalStorage with no means of recovery.

---

### Requirement 11: Transactions Tab — Search and Filter

**User Story:** As a user, I want to search and filter my transactions by name, category, and month, so that I can quickly locate specific records.

#### Acceptance Criteria

1. THE App SHALL provide a text search input on the Transactions tab that filters the Transaction_List to show only Transactions whose item name contains the entered text (case-insensitive), with the filter applied within 300 milliseconds of the user stopping input.
2. THE App SHALL provide a Category filter dropdown on the Transactions tab populated with all distinct categories present in the stored Transactions plus an "All Categories" default option, where selecting a specific category filters the Transaction_List to show only Transactions matching that category exactly.
3. THE App SHALL provide a Month filter dropdown on the Transactions tab populated with all distinct month-year combinations present in the stored Transactions plus an "All Months" default option, where selecting a specific month-year filters the Transaction_List to show only Transactions whose recorded date falls within that calendar month and year.
4. WHEN multiple filters are active simultaneously, THE App SHALL apply all active filters together using AND logic, showing only Transactions that satisfy every active filter condition.
5. WHEN all filter inputs are cleared, THE App SHALL restore the Transaction_List to show all stored Transactions within 300 milliseconds of the last filter being cleared.
6. IF the Transaction_List contains no Transactions matching the active filter conditions, THEN THE App SHALL display a message indicating no results were found and show zero Transaction entries.

---

### Requirement 12: Transactions Tab — Sort Controls (Optional Feature)

**User Story:** As a user, I want to sort my transaction list by different criteria, so that I can organize my history in a way that suits my current need.

#### Acceptance Criteria

1. WHERE Sort Controls are enabled, THE App SHALL provide sort options: Newest, Oldest, Highest Amount, Lowest Amount, and Category.
2. WHEN the user selects a sort option, THE App SHALL re-render the Transaction_List in the order defined by the selected sort option, where Newest sorts by date descending, Oldest by date ascending, Highest Amount by amount descending, Lowest Amount by amount ascending, and Category alphabetically ascending by category name.
3. WHEN Sort Controls are combined with active Search or Filter inputs, THE App SHALL apply sorting to the already-filtered result set.
4. WHEN the Transactions tab is first displayed or all sort controls are cleared, THE App SHALL default to the Newest sort order.

---

### Requirement 13: Analytics Tab — Spending Breakdown Donut Chart (Optional Feature)

**User Story:** As a user, I want to see a larger, interactive version of the spending donut chart in the Analytics tab, so that I can explore category breakdowns in more detail.

#### Acceptance Criteria

1. WHERE the Analytics tab is implemented, THE Donut_Chart on the Analytics tab SHALL render a chart spanning the full width of the screen content area, with one slice per expense Category that has at least one Expense Transaction recorded in the currently active time period filter, where each slice's arc length is proportional to that Category's share of total spending.
2. WHEN the user taps or clicks a slice on the Analytics Donut_Chart, THE App SHALL display the category name, total amount formatted to 2 decimal places, and percentage of total spending rounded to 1 decimal place for that slice.
3. IF the user taps or clicks a slice that is already selected, THEN THE App SHALL deselect it and hide the category detail display.
4. WHERE the Analytics tab is implemented, IF no Expense Transactions exist for the currently active time period filter, THEN THE Donut_Chart SHALL display an empty-state message indicating no spending data is available for the selected period.

---

### Requirement 14: Analytics Tab — Monthly Spending Trend Chart (Optional Feature)

**User Story:** As a user, I want to see a line chart of my spending over time, so that I can identify patterns and trends in my financial behavior.

#### Acceptance Criteria

1. WHERE the Analytics tab is implemented, THE Line_Chart SHALL render total Expense spending as data points over the current calendar month (from the 1st of the month to the current date), with one data point per day when the month contains 14 or fewer elapsed days, and one data point per week otherwise, where days or weeks with zero spending are rendered as a data point with a value of 0.
2. WHEN a new Expense Transaction is added, THE Line_Chart SHALL update to reflect the new data within 2 seconds without requiring a page reload.
3. WHERE the Analytics tab is implemented, IF no Expense Transactions exist for the current calendar month, THEN THE Line_Chart SHALL display an empty-state message indicating that no spending data is available for the current month.

---

### Requirement 15: Analytics Tab — Month-over-Month Comparison (Optional Feature)

**User Story:** As a user, I want to compare this month's spending to last month's, so that I can track whether my financial habits are improving.

#### Acceptance Criteria

1. WHERE the Analytics tab is implemented, THE App SHALL display comparison cards showing total Expense spending for the current calendar month and the previous calendar month side by side.
2. WHERE the Analytics tab is implemented, THE App SHALL display the percentage change in total Expense spending from the previous month to the current month, rounded to 1 decimal place, indicating whether spending increased or decreased.
3. WHERE the Analytics tab is implemented, IF the previous calendar month contains no Expense Transactions, THEN THE App SHALL display a message indicating that no prior-month data is available rather than showing a percentage change.
4. WHERE the Analytics tab is implemented, THE App SHALL display the top 3 expense Categories for the current calendar month ordered from highest to lowest total amount, showing the category name and total amount for each.
5. WHERE the Analytics tab is implemented, IF fewer than 3 expense Categories have transactions in the current calendar month, THEN THE App SHALL display only the available Categories without placeholder rows.

---

### Requirement 16: Settings Tab — Profile Configuration

**User Story:** As a user, I want to set a local display name and avatar, so that the app feels personalized without requiring a real account.

#### Acceptance Criteria

1. THE App SHALL provide a text input on the Settings tab for the user to enter a display name of 1 to 50 characters, stored in LocalStorage.
2. THE App SHALL provide an avatar icon selector on the Settings tab offering between 6 and 20 predefined icons, with the selected icon stored in LocalStorage.
3. WHEN the user saves Profile changes, THE App SHALL persist the updated display name and avatar to LocalStorage and update the Profile Avatar displayed in the Dashboard header within 1 second.
4. IF the user submits a display name that is empty or exceeds 50 characters, THEN THE App SHALL reject the submission and display an error message indicating the valid length constraint without modifying the stored display name.
5. IF LocalStorage is unavailable or the save operation fails, THEN THE App SHALL display an error message indicating that the profile could not be saved and retain the previously displayed display name and avatar.
6. THE App SHALL not implement any authentication, server-side accounts, or network requests for Profile data.

---

### Requirement 17: Settings Tab — Currency Selector

**User Story:** As a user, I want to choose my currency symbol and formatting, so that all monetary values in the app match my local currency.

#### Acceptance Criteria

1. WHEN the App launches for the first time and no Currency has been stored in LocalStorage, THE App SHALL set IDR (Indonesian Rupiah) as the active Currency, applying the IDR symbol ("Rp") and thousand-separator formatting (e.g., Rp 1.000).
2. THE App SHALL provide a Currency selector on the Settings tab listing at least IDR, USD, EUR, and GBP as selectable options, each displaying its currency code and symbol.
3. WHEN the user selects a Currency from the Currency selector, THE App SHALL persist the selected Currency code to LocalStorage within 1 second of the selection.
4. WHEN the user selects a Currency from the Currency selector, THE App SHALL re-render all monetary values throughout the App using the symbol and formatting rules of the newly selected Currency without requiring a page reload.
5. IF LocalStorage is unavailable when the App attempts to read or write the Currency setting, THEN THE App SHALL display an error message indicating that the Currency preference cannot be saved, and shall continue using the currently active Currency for the session.

---

### Requirement 18: Settings Tab — Budget & Category Manager

**User Story:** As a user, I want to set global and per-category monthly budget limits and create custom categories, so that I can tailor the app to my personal financial structure.

#### Acceptance Criteria

1. THE Category_Manager SHALL allow the user to set a global monthly Budget limit as a numeric value between 0.01 and 999,999,999.99, stored in LocalStorage.
2. THE Category_Manager SHALL allow the user to set a per-category monthly Budget limit as a numeric value between 0.01 and 999,999,999.99 for each Category, stored in LocalStorage.
3. THE Category_Manager SHALL allow the user to create a custom expense Category by entering a Category name of 1 to 50 characters and selecting exactly one emoji from an Emoji Picker.
4. WHEN the user saves a custom Category, THE App SHALL add it to the Category dropdown options in the Quick_Add_Form and persist it in LocalStorage within 1 second.
5. IF the user attempts to save a custom Category with an empty name, THEN THE Validator SHALL display an error message indicating the name is required and prevent the Category from being saved.
6. IF the user attempts to save a custom Category with a name that already exists in the Category list, THEN THE Validator SHALL display an error message indicating the name is already in use and prevent the duplicate Category from being saved.
7. IF the user enters a non-numeric value or a value outside the range 0.01 to 999,999,999.99 in a Budget limit field, THEN THE Validator SHALL display an error message indicating the valid range and prevent the value from being saved.

---

### Requirement 19: Settings Tab — Data Backup and Restore

**User Story:** As a user, I want to export and import my app data as a JSON file, so that I can back up my records and restore them on another device or browser.

#### Acceptance Criteria

1. WHEN the user activates the Backup Data action, THE Data_Manager SHALL serialize all LocalStorage app data into a JSON structure and trigger a browser file download with a filename in the format `backup-YYYY-MM-DD.json` where the date is the current local date.
2. WHEN the user activates the Restore Data action and selects a valid `.json` backup file up to 10 MB in size, THE Data_Manager SHALL parse the file, overwrite all corresponding keys in LocalStorage, and re-render the App with the restored data within 3 seconds.
3. IF the user selects a file that is not valid JSON, does not match the expected backup schema, or exceeds 10 MB during a Restore Data action, THEN THE Data_Manager SHALL display an error message indicating the reason for rejection and leave the existing LocalStorage data unchanged.
4. IF a LocalStorage write operation fails during a Restore Data action, THEN THE Data_Manager SHALL roll back any partial writes, display an error message, and preserve the original LocalStorage data unchanged.
5. FOR ALL valid app state snapshots containing up to 10,000 Transaction records, serializing to JSON via the Backup Data action and then restoring from that JSON file via the Restore Data action SHALL produce an app state with identical LocalStorage keys and values to the original state (round-trip property).

---

### Requirement 20: Settings Tab — Export CSV

**User Story:** As a user, I want to download my transaction history as a CSV file, so that I can analyze it in spreadsheet tools like Excel or Google Sheets.

#### Acceptance Criteria

1. WHEN the user activates the Export CSV action, THE Data_Manager SHALL generate a CSV file containing all stored Transactions with columns in this order: date, item name, category, type (Income/Expense), and amount, where date is formatted as YYYY-MM-DD and amount is formatted as a plain decimal number with exactly 2 decimal places.
2. WHEN the user activates the Export CSV action and no Transactions are stored, THE Data_Manager SHALL generate a CSV file containing only the header row with no data rows.
3. WHEN the CSV file is generated, THE Data_Manager SHALL trigger a browser file download with the filename `transactions.csv` and a `text/csv` MIME type.
4. THE Data_Manager SHALL format CSV field values by enclosing in double quotes any value that contains a comma, double quote, or newline character, and by escaping any double quote character within a field value as two consecutive double quote characters, producing a valid RFC 4180-compliant CSV file.
5. IF the Export CSV action is activated but the CSV file cannot be generated or downloaded due to a browser or storage error, THEN THE Data_Manager SHALL display an error message indicating the export failed and no file download shall be initiated.

---

### Requirement 21: Settings Tab — Reset App Data

**User Story:** As a user, I want to reset all app data, so that I can start fresh or clear test data without manually clearing browser storage.

#### Acceptance Criteria

1. WHEN the user activates the Reset App Data action, THE App SHALL display a confirmation modal containing a description stating that all data will be permanently deleted and an explicit confirmation control that must be activated before the reset proceeds.
2. WHEN the user confirms the reset in the confirmation modal, THE Data_Manager SHALL remove all App-related keys from LocalStorage such that no App-related keys remain, then THE App SHALL re-render to its initial empty state with no previously stored data visible in any view.
3. WHEN the user cancels or dismisses the confirmation modal, THE App SHALL close the modal without modifying any data in LocalStorage.
4. IF the LocalStorage clear operation fails during a reset, THEN THE App SHALL display an error message indicating that the reset did not complete, and preserve all existing data unchanged.
5. WHILE the reset operation is in progress, THE App SHALL disable the confirmation control to prevent duplicate reset attempts until the operation resolves.

---

### Requirement 22: Header & Global UI

**User Story:** As a user, I want a consistent header and bottom navigation bar on all tabs, so that I can identify the app and navigate freely at any time.

#### Acceptance Criteria

1. THE App SHALL display a persistent header containing the App name "Spenchart", a Theme Switcher toggle, and the Profile Avatar on all tabs.
2. THE App SHALL display a persistent bottom navigation bar containing icons and labels for all four tabs: Dashboard, Transactions, Analytics, and Settings.
3. WHILE the App is rendering on a mobile viewport (screen width below 768px), THE App SHALL apply a mobile-optimized layout with touch-friendly tap targets of at least 44×44 CSS pixels for all header and bottom navigation interactive elements.
4. WHILE the App is rendering on a desktop viewport (screen width of 768px or above), THE App SHALL display the header items in a single non-wrapping horizontal row and the bottom navigation bar spanning full width with equal-width tab items.
5. WHEN the user activates a tab in the bottom navigation bar, THE App SHALL apply the active indicator style to the selected tab item and remove the active indicator style from the previously active tab item without reloading the header or bottom navigation bar.
6. IF the Profile Avatar image fails to load, THEN THE App SHALL display a fallback placeholder of at least 32×32 CSS pixels showing the first letter of the user's display name.
