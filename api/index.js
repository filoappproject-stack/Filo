export default async function handler(req, res) {
  try {
    const { app } = await import('../backend/src/app.js');
    return app(req, res);
  } catch (err) {
    console.error('[API bootstrap error]', err);
    res.status(500).json({
      error: 'API bootstrap failed',
      message: err?.message || 'Errore avvio serverless API',
      hint: 'Controlla i log Vercel e le variabili ambiente del progetto'
    });
  }
}
