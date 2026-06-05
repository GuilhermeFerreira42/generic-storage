// server/src/db/init.ts
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: DatabaseSync;

export function initDB(): DatabaseSync {
  if (db) return db;

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'greenforge.db');
  db = new DatabaseSync(dbPath);

  // Habilita WAL mode para melhor performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Lê e executa o schema
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  console.error(`[DB] Banco inicializado em: ${dbPath}`);
  return db;
}

export function getDB(): DatabaseSync {
  if (!db) throw new Error('DB não inicializado. Chame initDB() primeiro.');
  return db;
}
