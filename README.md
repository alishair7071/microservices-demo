# Microservices Demo

A small project for learning how services communicate. Run it with:

```bash
docker compose up --build
```

Open the frontend at `http://localhost:3000`. Browser requests go through Kong at `http://localhost:8000/api`.

## Services and request flow

| Service | What it does |
| --- | --- |
| Inventory | Stores products in MongoDB; exposes REST and a gRPC stock operation. |
| Order | Creates orders, calls Inventory and Payment, and publishes an `OrderCreated` RabbitMQ event. |
| Payment | Saves payments and publishes a `PaymentApproved` Kafka event. |
| Email A/B | Consume RabbitMQ and Kafka messages. |
| Notification | Consumes RabbitMQ and Kafka messages. |
| Resilience demo | Returns a simple JSON response, immediately or after 5 seconds. |
| Kong | Routes frontend requests to the services; also demonstrates load balancing and rate limiting. |

The main order flow is:

```text
Frontend -> Kong -> Order -> Inventory (product REST lookup, then gRPC stock reduction)
                         -> MongoDB (save order)
                         -> RabbitMQ (OrderCreated event)

Frontend -> Kong -> Order -> Payment -> MongoDB (save payment)
                                    -> Kafka (PaymentApproved event)
```

## Where to look in the code

- `*/server.js` starts each HTTP service.
- `*/routes/` contains the HTTP paths and their handlers. Express combines the path in `app.use('/orders', orderRoutes)` with a route's `router.post('/')` to make `POST /orders`.
- `*/models/` contains MongoDB schemas.
- `*/grpc/`, `*/messaging/`, and `*/kafka/` contain the corresponding communication code.
- `order-service/resilience/circuit-breaker-demo.js` contains the Opossum breaker. It is created once so its state persists between requests.
- `kong/kong.yml` maps public `/api/...` paths to service paths.
- `frontend/public/app.js` sends browser requests to Kong and renders the results.

## Circuit breaker and timeout lab

The frontend has one **Send Protected Request** button. The request travels through Kong and Order Service to the separate Resilience Demo Service.

- **Normal response:** returns JSON immediately.
- **Slow response:** waits 5 seconds; the Order Service breaker times out after 3 seconds.
- **Unavailable service:** run `docker compose stop resilience-demo-service`, then click the button repeatedly. After three failures, the circuit opens and rejects requests immediately. Run `docker compose start resilience-demo-service`, wait 15 seconds, and click again to test recovery.

Keep Order Service running during this lab because the breaker lives there.
