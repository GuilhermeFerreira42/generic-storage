// server/src/db/init.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function initDB(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'greenforge.db');
  db = new Database(dbPath);

  // Habilita WAL mode para melhor performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Lê e executa o schema
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  console.error(`[DB] Banco inicializado em: ${dbPath}`);
  return db;
}

export function getDB(): Database.Database {
  if (!db) throw new Error('DB não inicializado. Chame initDB() primeiro.');
  return db;
}
