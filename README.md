# Microservices Demo

## Architecture

This project demonstrates microservices with multiple communication patterns:

- **REST**: Frontend ↔ Order Service ↔ Inventory/Payment Services
- **gRPC**: Order Service → Inventory Service (stock reduction)
- **RabbitMQ (async events)**: Order Service → Exchange → Email Service & Notification Service

### RabbitMQ Architecture

```
Order Service publishes OrderCreated event
        |
        v
  ┌───────────────────────┐
  │  RabbitMQ Exchange    │
  │  microservices.events │
  │  (topic exchange)     │
  └───────┬───────┬───────┘
          |       |
          v       v
  ┌───────────┐ ┌───────────────┐
  │ email-    │ │ notification- │
  │ service-  │ │ service-queue │
  │ queue     │ │               │
  └─────┬─────┘ └──────┬────────┘
        |              |
        v              v
  Email Service   Notification Service
  (GET /emails)   (GET /notifications)
```

**Exchange**: `microservices.events` (topic)  
**Routing key**: `order.created`  
**Queues**: `email-service-queue`, `notification-service-queue`  

### Services

| Service | Port | Communication | Storage |
|---------|------|--------------|---------|
| Frontend | 3000 | REST | — |
| Order Service | 4000 | REST + gRPC + RabbitMQ | MongoDB |
| Inventory Service | 4001 | REST + gRPC | MongoDB |
| Payment Service | 4002 | REST | MongoDB |
| Email Service | 4003 | RabbitMQ consumer | In-memory |
| Notification Service | 4004 | RabbitMQ consumer | In-memory |
| RabbitMQ | 5673 (host), 5672 (container), 15672 | Message broker | — |
| MongoDB | 27017 | Database | — |

## How to Run

```bash
docker compose up --build
```

The RabbitMQ management UI is available at: http://localhost:15672 (user: admin, pass: admin)

## How to Test the Flow

1. Open http://localhost:3000 in your browser.
2. Add a product using the "Add product" form.
3. Create an order using the "Create order" form.
4. After placing the order, check:
   - **Sent Emails** section shows the email sent by Email Service.
   - **Notifications** section shows the notification from Notification Service.
   - Check the console/logs for: `Email sent to ali@example.com for order ...` and `Notification created for order ...`
5. Optionally, visit:
   - http://localhost:4003/emails to see all stored emails
   - http://localhost:4004/notifications to see all stored notifications
6. RabbitMQ management UI: http://localhost:15672

## Endpoints

- `GET /products` — List products (inventory-service)
- `POST /products` — Add product (inventory-service)
- `GET /orders` — List orders (order-service)
- `POST /orders` — Create order (order-service, publishes OrderCreated event)
- `POST /orders/:id/pay` — Pay for order (order-service)
- `GET /emails` — View sent emails (email-service)
- `GET /notifications` — View notifications (notification-service)
- `GET /health` — Health check for each service
