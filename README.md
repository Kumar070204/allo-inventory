# Allo Inventory Reservation System

A concurrency-safe inventory reservation backend built with Next.js, Prisma, PostgreSQL, and Supabase.

The system allows users to reserve, confirm, and release inventory across multiple warehouses while preventing overselling through transactional database operations and PostgreSQL row-level locking.

---

## Repository

[https://github.com/Kumar070204/allo-inventory](https://github.com/Kumar070204/allo-inventory)

---

## Features

- Multi-warehouse inventory management
- Product reservation with quantity tracking
- Reservation confirmation flow
- Reservation cancellation and release
- Automatic expiry cleanup for stale reservations
- Concurrency-safe stock handling via row-level locking
- PostgreSQL transactions to prevent race conditions
- REST API with structured error responses
- Production deployment on Vercel with Supabase PostgreSQL

---

## Tech Stack

### Frontend

- Next.js 16
- React
- Tailwind CSS
- Axios

### Backend

- Next.js Route Handlers
- Prisma ORM
- PostgreSQL
- Supabase

### Deployment

- Vercel

---

## Database Schema

### Product

Stores product information.

| Field | Type   |
|-------|--------|
| id    | String |
| name  | String |
| sku   | String |

### Warehouse

Stores warehouse information.

| Field | Type   |
|-------|--------|
| id    | String |
| name  | String |

### Inventory

Represents stock for a product at a specific warehouse.

| Field            | Type   |
|------------------|--------|
| id               | String |
| productId        | String |
| warehouseId      | String |
| totalQuantity    | Int    |
| reservedQuantity | Int    |

Available stock is derived as `totalQuantity - reservedQuantity`.

### Reservation

Tracks individual reservation events.

| Field       | Type     |
|-------------|----------|
| id          | String   |
| inventoryId | String   |
| quantity    | Int      |
| status      | Enum     |
| expiresAt   | DateTime |

Status values: `PENDING`, `CONFIRMED`, `RELEASED`, `EXPIRED`

---

## Reservation Lifecycle

```
PENDING → CONFIRMED
        → RELEASED
        → EXPIRED (automatic)
```

### 1. Reserve

- Locks the inventory row with `SELECT ... FOR UPDATE`
- Validates available stock
- Increments `reservedQuantity`
- Creates a `PENDING` reservation with an expiry timestamp

### 2. Confirm

- Locks the reservation row
- Verifies reservation is still `PENDING` and not expired
- Decrements `totalQuantity`
- Marks reservation as `CONFIRMED`

### 3. Release

- Restores reserved stock by decrementing `reservedQuantity`
- Marks reservation as `RELEASED`

### 4. Expiry Cleanup

- Finds all reservations past their `expiresAt` timestamp
- Restores reserved stock for each expired reservation
- Marks reservations as `EXPIRED`

---

## Concurrency Handling

This is the core engineering challenge the system is designed to solve.

Without protection, simultaneous reservation requests against the same inventory row can result in overselling — multiple transactions each reading the same available stock and all succeeding despite there being insufficient quantity.

The system prevents this using **PostgreSQL row-level locking**:

```sql
SELECT *
FROM "Inventory"
WHERE id = $1
FOR UPDATE
```

`SELECT ... FOR UPDATE` acquires an exclusive lock on the row for the duration of the transaction. Any concurrent transaction attempting to lock the same row is blocked until the first transaction commits or rolls back.

This guarantees:

- Only one transaction can modify a given inventory row at a time
- Competing reservation requests fail safely with HTTP 409 if stock is insufficient
- Inventory counts remain consistent under concurrent load
- No overselling or double-confirmation is possible

All mutation operations — reserve, confirm, release, and expiry cleanup — execute inside Prisma transactions to ensure atomicity.

---

## API Endpoints

### `GET /api/products`

Returns all products with their inventory availability across warehouses.

---

### `POST /api/reservations`

Creates a new reservation.

**Request body:**

```json
{
  "productId": "product-id",
  "warehouseId": "warehouse-id",
  "quantity": 1
}
```

**Responses:**

- `201 Created` — Reservation created successfully
- `409 Conflict` — Insufficient stock (concurrent conflict or low inventory)

---

### `POST /api/reservations/:id/confirm`

Confirms an existing reservation and deducts from inventory.

**Responses:**

- `200 OK` — Reservation confirmed
- `404 Not Found` — Reservation does not exist
- `409 Conflict` — Reservation already confirmed, released, or expired

---

### `POST /api/reservations/:id/release`

Cancels an existing reservation and restores reserved stock.

**Responses:**

- `200 OK` — Reservation released
- `404 Not Found` — Reservation does not exist

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Kumar070204/allo-inventory.git
cd allo-inventory
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
```

### 4. Run Prisma migrations

```bash
pnpm prisma migrate dev
```

### 5. Seed the database

```bash
pnpm tsx prisma/seed.ts
```

### 6. Start the development server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

---

## Project Structure

```
app/
├── api/
│   ├── products/          # GET inventory
│   └── reservations/      # POST reserve, confirm, release
├── reservation/           # Reservation UI
└── page.tsx               # Home page

lib/
├── prisma.ts                        # Prisma client singleton
├── cleanupExpiredReservations.ts    # Expiry cleanup logic
└── AppError.ts                      # Structured error handling

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed data
```

---

## Deployment

Deployed on **Vercel** with **Supabase** as the managed PostgreSQL provider.

Environment variables `DATABASE_URL` and `DIRECT_URL` are configured in the Vercel project settings. The `DIRECT_URL` is required by Prisma for migrations when using a connection pooler.

---

## Production Considerations

- Transactional inventory updates prevent partial state
- Row-level locking prevents concurrent overselling
- Automatic expiry cleanup reclaims stale reservations
- Structured error responses with appropriate HTTP status codes
- Strict TypeScript throughout the codebase
- Deployment-ready architecture with environment-based configuration

---

## Future Improvements

- Authentication and authorization per user/tenant
- Rate limiting on reservation endpoints
- Redis caching for high-read inventory queries
- Background job queue for expiry cleanup (replacing ad-hoc calls)
- Real-time inventory updates via WebSockets
- Payment integration tied to reservation confirmation
- Reservation retry policies with backoff
- Audit logging for all state transitions
- Observability with structured logging and metrics

---

## Author

Kumaraswamy
