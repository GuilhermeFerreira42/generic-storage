// server/src/db/init.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbInstance: Database.Database | null = null;

/**
 * Inicializa o banco de dados SQLite
 * Usa WAL mode para melhor concorrência
 */
export function initDB(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const finalPath = dbPath ?? process.env.DB_PATH ?? path.join(process.cwd(), 'greenforge.db');

  console.error(`[DB] Inicializando banco em: ${finalPath}`);

  dbInstance = new Database(finalPath);

  // Ativa WAL mode para melhor concorrência
  dbInstance.pragma('journal_mode = WAL');

  // Ativa foreign keys
  dbInstance.pragma('foreign_keys = ON');

  // Lê e executa o schema SQL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSQL = readFileSync(schemaPath, 'utf-8');

  dbInstance.exec(schemaSQL);

  console.error('[DB] Banco inicializado com sucesso');

  return dbInstance;
}

/**
 * Obtém a instância do banco de dados
 */
export function getDB(): Database.Database {
  if (!dbInstance) {
    throw new Error('Banco de dados não inicializado. Chame initDB() primeiro.');
  }
  return dbInstance;
}

/**
 * Fecha a conexão com o banco
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.error('[DB] Conexão encerrada');
  }
}
