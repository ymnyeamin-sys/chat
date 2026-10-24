export function getDb(env) {
  return env.DB;
}

export function randomId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function nowISO() {
  return new Date().toISOString();
}
