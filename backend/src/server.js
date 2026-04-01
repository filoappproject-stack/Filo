import { app } from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  await pool.query('SELECT 1');
  app.listen(env.PORT, () => {
    console.log(`Filo backend in ascolto su http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Errore bootstrap applicazione:', error);
  process.exit(1);
});
