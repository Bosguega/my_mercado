import sqlite3pkg from "sqlite3";
import path from "path";

const sqlite3 = sqlite3pkg.verbose();

const DB_PATH = path.join(process.cwd(), "data.db");

export const db = new sqlite3.Database(DB_PATH);

export function initDb() {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        establishment TEXT,
        date TEXT,
        items_json TEXT
      )`,
    );
  });
}

export function getAllReceipts() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, establishment, date, items_json FROM receipts ORDER BY rowid DESC",
      [],
      (err, rows) => {
        if (err) return reject(err);
        const mapped = rows.map((row) => ({
          id: row.id,
          establishment: row.establishment,
          date: row.date,
          items: JSON.parse(row.items_json || "[]"),
        }));
        resolve(mapped);
      },
    );
  });
}

export function insertReceipt(receipt) {
  const { id, establishment, date, items } = receipt;
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR REPLACE INTO receipts (id, establishment, date, items_json) VALUES (?, ?, ?, ?)",
      [id, establishment, date, JSON.stringify(items || [])],
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
}

export function deleteReceiptById(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM receipts WHERE id = ?", [id], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function restoreAllReceipts(receipts) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM receipts", [], (err) => {
        if (err) return reject(err);
        const stmt = db.prepare(
          "INSERT INTO receipts (id, establishment, date, items_json) VALUES (?, ?, ?, ?)",
        );
        for (const receipt of receipts) {
          stmt.run([
            receipt.id,
            receipt.establishment,
            receipt.date,
            JSON.stringify(receipt.items || []),
          ]);
        }
        stmt.finalize((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  });
}
