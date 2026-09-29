const os = require('os');

function getContainerIp() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    const address = addresses?.find((item) => item.family === 'IPv4' && !item.internal);
    if (address) return address.address;
  }
  throw new Error('Could not find this service container IP');
}

async function registerService(serviceName, port) {
  const address = getContainerIp();
  const serviceId = `${serviceName}-${os.hostname()}`;
  const response = await fetch(`${process.env.CONSUL_HTTP_ADDR}/v1/agent/service/register`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ID: serviceId,
      Name: serviceName,
      Address: address,
      Port: port,
      Check: {
        HTTP: `http://${address}:${port}/health`,
        Interval: '5s',
        DeregisterCriticalServiceAfter: '1m'
      }
    })
  });

  if (!response.ok) throw new Error(`Consul registration failed with HTTP ${response.status}`);
  console.log(`Registered ${serviceName} at ${address}:${port} with Consul`);
  return serviceId;
}

async function startService(app, serviceName, port) {
  const server = app.listen(port);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const serviceId = await registerService(serviceName, port);
    return { server, serviceId };
  } catch (error) {
    server.close();
    throw error;
  }
}

async function deregisterService(serviceId) {
  if (!serviceId) return;
  await fetch(`${process.env.CONSUL_HTTP_ADDR}/v1/agent/service/deregister/${serviceId}`, { method: 'PUT' });
}

module.exports = { startService, deregisterService };
