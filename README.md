# Spenchart

Financial Clarity, Visualized.

Spenchart is a mobile-first SPA for personal expense and budget visualization. Runs entirely in the browser - no backend, no accounts, no server. All data persists in LocalStorage.

## Features

- Dashboard: Balance card, Quick Add form, Donut chart, Recent transactions, Budget summary
- Transactions: Scrollable list, Search/filter, Sort, Undo deletion
- Analytics (optional): Full donut chart, Trend line chart, Month-over-month comparison
- Settings: Profile, Currency, Budget manager, Backup/restore, CSV export, Reset

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (no frameworks)
- Chart.js via CDN
- Browser LocalStorage (no backend)
- Tests: Vitest + fast-check

## Project Structure

index.html, css/styles.css, js/script.js, tests/, .kiro/specs/spenchart/

## Getting Started

Open index.html in Chrome, Safari, Edge, or Firefox.

## Running Tests

cd tests && npm install && npm test

## Spec

See .kiro/specs/spenchart/ for requirements.md, design.md, and tasks.md.

---

Revou Coding Camp Mini Project - Hafiyyan Muhammad Rasyad
