INSERT INTO users (id, email, full_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo@filo.app', 'Demo User')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tasks (user_id, title, description, priority, due_date, energy_cost, stress_impact)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Pianifica sprint settimanale', 'Definisci obiettivi e dipendenze del team.', 'high', NOW() + INTERVAL '1 day', 4, 3),
  ('11111111-1111-1111-1111-111111111111', 'Rivedi inbox prioritaria', 'Rispondi alle email bloccanti prima delle 11.', 'urgent', NOW() + INTERVAL '4 hour', 2, 4)
ON CONFLICT DO NOTHING;
