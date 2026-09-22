async function serviceJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Service request failed');
  return body;
}

module.exports = { serviceJson };
