import fs from 'fs';
import path from 'path';

export function setupTestDatabase() {
  const workerId = process.env.VITEST_WORKER_ID || '0';
  // Use um state em memoria fake para evitar o erro do node:sqlite no JSDOM
  const state: any = {};
  
  return {
    prepare: (query: string) => ({
      run: (val: any) => { state.lastVal = val; },
      get: (val: any) => { return { id: 1, name: state.lastVal }; }
    }),
    exec: () => {}
  };
}

export function teardownTestDatabase() {
  // void
}
