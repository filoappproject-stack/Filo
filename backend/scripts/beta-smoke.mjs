const baseUrl = (process.env.BETA_SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const timeoutMs = Number(process.env.BETA_SMOKE_TIMEOUT_MS || 10000);

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promise(controller.signal)
    .catch((err) => {
      if (err?.name === 'AbortError') {
        throw new Error(`${label}: timeout dopo ${timeoutMs}ms`);
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

function pass(name, detail) {
  console.log(`✅ PASS - ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, detail) {
  console.log(`❌ FAIL - ${name}${detail ? ` (${detail})` : ''}`);
}

async function testHealth() {
  const name = 'GET /api/v1/health';
  const started = Date.now();
  const response = await withTimeout(
    (signal) => fetch(`${baseUrl}/api/v1/health`, { signal }),
    name
  );

  if (!response.ok) {
    throw new Error(`status ${response.status}`);
  }

  const body = await response.json();
  if (body?.status !== 'ok') {
    throw new Error(`status applicativo inatteso: ${JSON.stringify(body)}`);
  }

  const elapsed = Date.now() - started;
  pass(name, `${elapsed}ms`);
}

async function testDayAnalysis() {
  const name = 'POST /api/v1/assistant/day-analysis';
  const started = Date.now();
  const payload = {
    agenda: 'call cliente 11:00',
    pending: 'chiudere preventivo'
  };

  const response = await withTimeout(
    (signal) => fetch(`${baseUrl}/api/v1/assistant/day-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    }),
    name
  );

  if (!response.ok) {
    throw new Error(`status ${response.status}`);
  }

  const body = await response.json();
  const suggestions = body?.data?.suggerimenti;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error('risposta senza suggerimenti');
  }

  const elapsed = Date.now() - started;
  const degraded = body?.data?.degraded ? 'degraded/fallback' : 'ai-or-cache';
  pass(name, `${elapsed}ms, suggerimenti=${suggestions.length}, source=${degraded}`);
}

async function main() {
  console.log(`\nFilo beta smoke test`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Timeout: ${timeoutMs}ms\n`);

  let failures = 0;

  for (const test of [testHealth, testDayAnalysis]) {
    try {
      await test();
    } catch (error) {
      failures += 1;
      fail(test.name.replace('test', '').trim() || 'test', error?.message || String(error));
    }
  }

  if (failures > 0) {
    console.log(`\nEsito: FAIL (${failures} test falliti)`);
    process.exit(1);
  }

  console.log('\nEsito: PASS (tutti i controlli superati)');
}

main().catch((error) => {
  fail('beta-smoke', error?.message || String(error));
  process.exit(1);
});
