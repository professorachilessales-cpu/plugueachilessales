const dbToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAwMTMzOTIsImlkIjoiMDFhMGM0Y2QtYmIwMS03NGQ5LTljMjMtMTg0MTM3MDgzNDgwIiwia2lkIjoidld3UURnb084dVBzcUVjSUw5WWhnOXFKblIyOWpVaVpJZ1BxbjVTcDFCTSIsInJpZCI6IjM4ZmQ4NGE0LTZmMjYtNDA5ZC04ZjZjLTczOWI5NmU2YzVlNSJ9.wCi0QI7ppdYtZt8dl-yErzSRenbBybO9spYWDtCv2l784WrHYqYAI5pjSq05MlvUB2kfyqVUM6UI3wB-ChUDDw';
const url = 'https://plugueachiles-achilessales.aws-us-west-2.turso.io/v2/pipeline';

const statements = [
  'CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, action_type TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, target_class_id TEXT, target_class_name TEXT, details TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_type)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_class ON activity_logs(target_class_id)',
  "CREATE TRIGGER IF NOT EXISTS trg_activity_logs_prevent_update BEFORE UPDATE ON activity_logs BEGIN SELECT RAISE(ABORT, 'Operacao proibida: tabela imutavel'); END",
  "CREATE TRIGGER IF NOT EXISTS trg_activity_logs_prevent_delete BEFORE DELETE ON activity_logs BEGIN SELECT RAISE(ABORT, 'Operacao proibida: tabela imutavel'); END"
];

async function run() {
  const requests = statements.map(sql => ({ type: 'execute', stmt: { sql, args: [] } }));
  requests.push({ type: 'close' });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + dbToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });

  const data = await res.json();
  const errors = (data.results || []).filter(r => r.type === 'error');
  if (errors.length) {
    console.error('Erros:', JSON.stringify(errors, null, 2));
  } else {
    console.log('activity_logs E TRIGGERS CRIADOS COM SUCESSO NO TURSO!');
  }
}

run().catch(console.error);
