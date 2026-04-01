export function healthCheck(req, res) {
  res.json({
    status: 'ok',
    service: 'filo-backend',
    timestamp: new Date().toISOString()
  });
}
