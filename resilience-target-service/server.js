const http = require('http');

const port = 4010;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/health') {
    return sendJson(response, 200, { status: 'ok', service: 'resilience-target-service' });
  }

  // Simulate a temporary problem: attempts 1 and 2 fail; attempt 3 succeeds.
  if (url.pathname === '/retry') {
    const attempt = Number(url.searchParams.get('attempt'));
    if (!Number.isInteger(attempt) || attempt < 1) {
      return sendJson(response, 400, { error: 'A positive attempt number is required.' });
    }
    if (attempt < 3) {
      return sendJson(response, 503, {
        success: false,
        message: `Temporary demo failure on attempt ${attempt}.`,
        attempt
      });
    }
    return sendJson(response, 200, {
      success: true,
      message: 'Demo service recovered and responded successfully.',
      attempt,
      respondedAt: new Date().toISOString()
    });
  }

  if (url.pathname !== '/respond') {
    return sendJson(response, 404, { error: 'Route not found' });
  }

  const requestedDelay = Number(url.searchParams.get('delayMs'));
  const delayMs = requestedDelay === 5000 ? 5000 : 0;

  setTimeout(() => {
    sendJson(response, 200, {
      success: true,
      message: 'Downstream demo service responded successfully.',
      delayMs,
      respondedAt: new Date().toISOString()
    });
  }, delayMs);
}).listen(port, () => console.log(`Resilience Target Service listening on port ${port}`));
