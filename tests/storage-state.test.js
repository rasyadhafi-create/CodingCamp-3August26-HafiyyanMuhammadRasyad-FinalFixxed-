/**
 * Tests for Task 2.1 — StorageModule
 * Tests for Task 2.2 — StateModule
 *
 * Requirements covered: 1.4, 3.8, 3.9, 17.1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StorageModule, StateModule } from "./shim.js";

/* ============================================================
   Minimal localStorage stub for Node environment
   ============================================================ */
function makeLocalStorageStub() {
  const store = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
    _store: store,
    _clear() { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

beforeEach(() => {
  // Inject a fresh localStorage stub before every test
  const stub = makeLocalStorageStub();
  globalThis.localStorage = stub;
});

/* ============================================================
   StorageModule — Task 2.1
   ============================================================ */
describe("StorageModule", () => {
  describe("PREFIX", () => {
    it("uses the spenchart_ namespace prefix", () => {
      expect(StorageModule.PREFIX).toBe("spenchart_");
    });
  });

  describe("save() and load()", () => {
    it("round-trips a simple string value", () => {
      StorageModule.save("currency", "USD");
      expect(StorageModule.load("currency")).toBe("USD");
    });

    it("round-trips an array", () => {
      const arr = [{ id: "1", amount: 100 }, { id: "2", amount: 200 }];
      StorageModule.save("transactions", arr);
      expect(StorageModule.load("transactions")).toEqual(arr);
    });

    it("round-trips an object", () => {
      const obj = { global: 5000, categories: { Food: 1000 } };
      StorageModule.save("budgets", obj);
      expect(StorageModule.load("budgets")).toEqual(obj);
    });

    it("stores under the spenchart_ prefix, not the bare key", () => {
      StorageModule.save("theme", "dark");
      // Raw localStorage key must include the prefix
      expect(globalThis.localStorage.getItem("spenchart_theme")).toBe('"dark"');
      // Bare key must not exist
      expect(globalThis.localStorage.getItem("theme")).toBeNull();
    });

    it("returns null for a missing key", () => {
      expect(StorageModule.load("nonexistent")).toBeNull();
    });

    it("returns null when the stored value is invalid JSON", () => {
      // Write corrupt data directly bypassing save()
      globalThis.localStorage.setItem("spenchart_broken", "not-json{{{");
      expect(StorageModule.load("broken")).toBeNull();
    });

    it("overwrites an existing value on re-save", () => {
      StorageModule.save("currency", "IDR");
      StorageModule.save("currency", "EUR");
      expect(StorageModule.load("currency")).toBe("EUR");
    });

    it("save() re-throws on QuotaExceededError", () => {
      const quota = new Error("QuotaExceededError");
      globalThis.localStorage.setItem = () => { throw quota; };
      expect(() => StorageModule.save("currency", "IDR")).toThrow("QuotaExceededError");
    });
  });

  describe("remove()", () => {
    it("removes a previously saved key so load() returns null", () => {
      StorageModule.save("theme", "dark");
      StorageModule.remove("theme");
      expect(StorageModule.load("theme")).toBeNull();
    });

    it("is a no-op for a key that was never saved", () => {
      expect(() => StorageModule.remove("ghost")).not.toThrow();
    });
  });

  describe("clearAll()", () => {
    it("removes all spenchart_* keys", () => {
      StorageModule.save("transactions", []);
      StorageModule.save("currency", "IDR");
      StorageModule.save("theme", "light");
      StorageModule.clearAll();
      expect(StorageModule.load("transactions")).toBeNull();
      expect(StorageModule.load("currency")).toBeNull();
      expect(StorageModule.load("theme")).toBeNull();
    });

    it("does NOT remove keys that lack the spenchart_ prefix", () => {
      globalThis.localStorage.setItem("other_key", "keep-me");
      StorageModule.save("currency", "IDR");
      StorageModule.clearAll();
      expect(globalThis.localStorage.getItem("other_key")).toBe("keep-me");
    });

    it("leaves storage empty of spenchart_ keys after clear", () => {
      StorageModule.save("profile", { name: "Ali", avatar: "avatar_01" });
      StorageModule.clearAll();
      const keys = [];
      for (let i = 0; i < globalThis.localStorage.length; i++) {
        keys.push(globalThis.localStorage.key(i));
      }
      const spenchartKeys = keys.filter((k) => k && k.startsWith("spenchart_"));
      expect(spenchartKeys).toHaveLength(0);
    });
  });
});

/* ============================================================
   StateModule — Task 2.2
   ============================================================ */
describe("StateModule.init()", () => {
  it("falls back to empty transactions array when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.transactions).toEqual([]);
  });

  it("falls back to default budgets when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.budgets).toEqual({ global: null, categories: {} });
  });

  it("falls back to empty categories array when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.categories).toEqual([]);
  });

  it("falls back to default profile when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.profile).toEqual({ name: "", avatar: "avatar_01" });
  });

  it("falls back to IDR currency when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.currency).toBe("IDR");
  });

  it("falls back to light theme when nothing is stored", () => {
    StateModule.init();
    expect(StateModule.theme).toBe("light");
  });

  it("hydrates transactions from storage", () => {
    const txs = [{ id: "1", item_name: "Coffee", amount: 15000, type: "expense", category: "Food", date: "2024-01-10" }];
    StorageModule.save("transactions", txs);
    StateModule.init();
    expect(StateModule.transactions).toEqual(txs);
  });

  it("hydrates budgets from storage", () => {
    const budgets = { global: 2000000, categories: { Food: 500000 } };
    StorageModule.save("budgets", budgets);
    StateModule.init();
    expect(StateModule.budgets).toEqual(budgets);
  });

  it("hydrates categories from storage", () => {
    const cats = [{ name: "Gym", emoji: "🏋️", custom: true }];
    StorageModule.save("categories", cats);
    StateModule.init();
    expect(StateModule.categories).toEqual(cats);
  });

  it("hydrates profile from storage", () => {
    const profile = { name: "Hafiyyan", avatar: "avatar_03" };
    StorageModule.save("profile", profile);
    StateModule.init();
    expect(StateModule.profile).toEqual(profile);
  });

  it("hydrates currency from storage", () => {
    StorageModule.save("currency", "USD");
    StateModule.init();
    expect(StateModule.currency).toBe("USD");
  });

  it("hydrates dark theme from storage", () => {
    StorageModule.save("theme", "dark");
    StateModule.init();
    expect(StateModule.theme).toBe("dark");
  });

  it("accepts light as a valid stored theme", () => {
    StorageModule.save("theme", "light");
    StateModule.init();
    expect(StateModule.theme).toBe("light");
  });

  it("falls back to light when stored theme is an invalid value", () => {
    StorageModule.save("theme", "solarized");
    StateModule.init();
    expect(StateModule.theme).toBe("light");
  });

  it("falls back to empty array when stored transactions is not an array", () => {
    StorageModule.save("transactions", { bad: "data" });
    StateModule.init();
    expect(StateModule.transactions).toEqual([]);
  });

  it("falls back to default budgets when stored budgets is not an object", () => {
    StorageModule.save("budgets", "oops");
    StateModule.init();
    expect(StateModule.budgets).toEqual({ global: null, categories: {} });
  });

  it("falls back to empty categories when stored categories is not an array", () => {
    StorageModule.save("categories", 42);
    StateModule.init();
    expect(StateModule.categories).toEqual([]);
  });

  it("falls back to default profile when stored profile is not an object", () => {
    StorageModule.save("profile", "notanobject");
    StateModule.init();
    expect(StateModule.profile).toEqual({ name: "", avatar: "avatar_01" });
  });
});
