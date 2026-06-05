// server/src/db/init.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: any;

export function initDB(): any {
  if (db) return db;

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'greenforge.db');
  db = new Database(dbPath);

  // Habilita WAL mode para melhor performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Lê e executa o schema
  try {
    const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    if (schema && typeof schema === 'string') {
      db.exec(schema);
    }
  } catch (err) {
    console.error(`[DB Init] Aviso: não foi possível ler ou executar o schema:`, err);
  }

  console.error(`[DB] Banco inicializado em: ${dbPath}`);
  return db;
}

export function getDB(): any {
  if (!db) throw new Error('DB não inicializado. Chame initDB() primeiro.');
  return db;
}
