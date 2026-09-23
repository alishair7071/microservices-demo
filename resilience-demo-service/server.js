const http = require('http');

const port = 4010;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/health') {
    return sendJson(response, 200, { status: 'ok', service: 'resilience-demo-service' });
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
}).listen(port, () => console.log(`Resilience demo service listening on port ${port}`));
