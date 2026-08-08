/**
 * shim.js — Test adapter for Spenchart
 *
 * Imports pure functions from js/script.js via CommonJS require().
 * js/script.js guards all DOM-dependent code with:
 *   if (typeof document !== "undefined") { ... }
 * and exports all modules via:
 *   if (typeof module !== "undefined") { module.exports = { ... }; }
 *
 * This shim re-exports those modules as named ES module exports
 * so Vitest test files can import them cleanly.
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

// Load js/script.js from the repo root (one level up from tests/)
const scriptPath = path.resolve(__dirname, "../js/script.js");
const modules = require(scriptPath);

export const StorageModule     = modules.StorageModule;
export const StateModule       = modules.StateModule;
export const RouterModule      = modules.RouterModule;
export const ThemeModule       = modules.ThemeModule;
export const ValidatorModule   = modules.ValidatorModule;
export const TransactionModule = modules.TransactionModule;
export const FilterModule      = modules.FilterModule;
export const SortModule        = modules.SortModule;
export const BudgetModule      = modules.BudgetModule;
export const ChartModule       = modules.ChartModule;
export const ToastModule       = modules.ToastModule;
export const DataManagerModule = modules.DataManagerModule;
export const ProfileModule     = modules.ProfileModule;
export const CurrencyModule    = modules.CurrencyModule;
export const RenderModule      = modules.RenderModule;
