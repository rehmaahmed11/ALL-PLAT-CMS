/**
 * A tiny D1 look-alike over node:sqlite, so `npm run local` serves the exact
 * same Worker code without wrangler or a Cloudflare account.
 *
 * Supported surface (all the panel uses):
 *   db.prepare(sql).bind(...).all() | .first() | .run()
 *   db.batch([prepared, ...])
 */

import { DatabaseSync } from 'node:sqlite';

const D1_ERRORS = /D1_ERROR|SQLITE/i;

function normaliseValue(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  return v;
}

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    // D1 accepts undefined as NULL; keep that behaviour.
    const clean = params.map((p) => (p === undefined ? null : p));
    return new Statement(this.db, this.sql, clean);
  }

  _run() {
    const stmt = this.db.prepare(this.sql);
    const isSelect = /^\s*(select|with|pragma)/i.test(this.sql);
    if (isSelect) {
      const rows = stmt.all(...this.params).map((r) => ({ ...r }));
      return { results: rows, success: true, meta: { rows_read: rows.length } };
    }
    const info = stmt.run(...this.params);
    return {
      results: [],
      success: true,
      meta: { changes: Number(info.changes ?? 0), last_row_id: Number(info.lastInsertRowid ?? 0) },
    };
  }

  async all() {
    return this._run();
  }

  async first(column) {
    const { results } = this._run();
    const row = results[0] ?? null;
    if (row && column) return row[column] ?? null;
    return row;
  }

  async run() {
    return this._run();
  }

  async raw() {
    const { results } = this._run();
    if (!results.length) return [];
    const keys = Object.keys(results[0]);
    return results.map((r) => keys.map((k) => r[k]));
  }
}

export class LocalD1 {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  prepare(sql) {
    return new Statement(this.db, sql, []);
  }

  async batch(statements) {
    const out = [];
    this.db.exec('BEGIN');
    try {
      for (const stmt of statements) out.push(stmt._run());
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return out;
  }

  async exec(sql) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

export { D1_ERRORS };
