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
| Resilience demo | Provides simple responses for the circuit breaker, timeout, and retry labs. |
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

## Retry lab

Click **Send Retry Request** once in the frontend. Order Service makes a safe GET request to the Resilience Demo Service. The demo returns `503` for attempts 1 and 2, then `200` for attempt 3. Order Service waits `200–300 ms` and `400–500 ms` between attempts (exponential backoff plus jitter). The frontend shows every attempt, wait, and the final result. The retry logic is in `order-service/routes/retry-demo-routes.js`.
