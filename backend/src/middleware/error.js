export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route non trovata: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: err.message ?? 'Errore non gestito'
  });
}
