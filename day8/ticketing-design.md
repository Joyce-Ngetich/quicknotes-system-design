# TicketHub: Event Ticketing System Design Document

## 1. Requirements

### Functional Requirements

- **Event Browsing**: Users can search, filter, and view upcoming concerts, events, and available seating maps.
- **Seat Selection & Holding**: Users can select specific seats and place a temporary lock/hold on them during checkout.
- **Checkout & Payment**: Users can securely process payments and complete ticket purchases.
- **Order Management**: Users can view their purchased tickets and booking history.

### Non-Functional Requirements

- **Correctness & Fairness (Zero Double-Booking)**: It must be mathematically impossible for two users to successfully purchase the exact same seat, even under massive flash-sale concurrency.
- **Low Latency**: Page loads and seat availability checks must respond in under 100 ms.
- **High Availability & Scalability**: The system must sustain normal baseline traffic while surviving extreme traffic spikes during high-demand artist ticket drops.

---

## 2. Traffic & Load Estimates

### Baseline Normal Traffic

- **Registered Users**: 2,000,000
- **Daily Active Visitors**: 50,000 users. Each views ~10 pages = 500,000 page views/day.
- **Reads**: $500,000 / 100,000 \text{ seconds} \approx \mathbf{5 \text{ reads per second (average)}}$
- **Writes (Ticket Sales)**: 5,000 tickets sold/day $\approx \mathbf{0.05 \text{ writes per second (average)}}$

### "Big Sale" Peak Traffic (Popular Concert Drop)

- **Spike Scenario**: 200,000 users rush to buy 20,000 seats within the first 10 minutes (600 seconds).
- **Peak Requests**:
  - Read/Browsing Traffic: $\approx \mathbf{2,000 \text{ reads per second}}$
  - Write/Checkout Rush: $200,000 \text{ attempts} / 600 \text{ seconds} \approx \mathbf{333 \text{ writes/checkouts per second}}$
- **Storage Growth**: 2M orders/year with metadata $\approx \mathbf{2 \text{ GB per year}}$ (lightweight transactional data).

---

## 3. REST API Design

| Method | Path                 | Description                                         | Success Status |
| ------ | -------------------- | --------------------------------------------------- | -------------- |
| `GET`  | `/events`            | List or search upcoming concerts and events         | `200 OK`       |
| `GET`  | `/events/:id/seats`  | Retrieve real-time seat map and availability status | `200 OK`       |
| `POST` | `/seats/hold`        | Temporarily lock a selected seat (10-minute hold)   | `201 Created`  |
| `POST` | `/orders`            | Process payment and complete ticket purchase        | `201 Created`  |
| `GET`  | `/users/:id/tickets` | Retrieve active purchased tickets for a user        | `200 OK`       |

### Example API Payload: Holding a Seat (`POST /seats/hold`)

- **Request Body**:
  ```json
  {
    "user_id": 8492,
    "event_id": 104,
    "seat_id": "VIP-A12"
  }
  ```

## Response Body (201 Created):

{
"hold_id": "h_9812374",
"seat_id": "VIP-A12",
"status": "reserved",
"expires_at": "2026-10-17T10:10:00Z"
}

# CREATE TABLE SQL Statements

CREATE TABLE users (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
email TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
id INTEGER PRIMARY KEY,
title TEXT NOT NULL,
date TEXT NOT NULL,
venue TEXT NOT NULL
);

CREATE TABLE seats (
id TEXT PRIMARY KEY, -- e.g., 'EV104-VIP-A12'
event_id INTEGER NOT NULL,
seat_number TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'available', -- 'available', 'held', 'booked'
version INTEGER NOT NULL DEFAULT 0, -- Optimistic locking version
FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE orders (
id INTEGER PRIMARY KEY,
user_id INTEGER NOT NULL,
seat_id TEXT NOT NULL,
created_at TEXT DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id),
FOREIGN KEY (seat_id) REFERENCES seats(id)
);

# Preventing Double-Booking (Concurrency Control)

To ensure two users cannot buy the same seat during a high-demand flash sale, TicketHub utilizes Database Transactions with Row-Level Locking (SELECT ... FOR UPDATE):

BEGIN TRANSACTION;

-- Check if seat is still available and lock the row
SELECT status FROM seats WHERE id = 'EV104-VIP-A12' FOR UPDATE;

-- If status is 'available', update it to 'booked' and create order
UPDATE seats SET status = 'booked', version = version + 1 WHERE id = 'EV104-VIP-A12' AND status = 'available';

INSERT INTO orders (user_id, seat_id) VALUES (8492, 'EV104-VIP-A12');

COMMIT;

# Architecture & Scaling Plan

┌─────────────────────────┐
│ DNS │
└────────────┬────────────┘
│
┌────────────────────┴────────────────────┐
│ │
┌──────┴──────┐ ┌──────┴──────┐
│ Browser / │ Static Assets │ CDN (Edge) │
│ Mobile App │──────────────────────────>│ (UI / Images│
└──────┬──────┘ └─────────────┘
│ API Requests (HTTPS)
v
┌──────────────┐
│ Load Balancer│ (Nginx / ALB)
└──────┬───────┘
├─────────────────┬─────────────────┐
v v v
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ App Server 1 │ │ App Server 2 │ │ App Server 3 │ (Stateless Node.js cluster)
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
│ │ │
├─────────────────┼─────────────────┘
│ │
│ Writes │ Reads
v v
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Primary │─>│ Read │ │ Redis Cache │ (Fast seat availability checks)
│ Database │ │ Replicas │ └──────────────┘
└──────────────┘ └──────────────┘
│
│ Expiry Jobs (Releases expired seat holds)
v
┌──────────────┐
│ Worker Queue │ (Celery / SQS)
└──────────────┘

## Architectural Components Explanation

_DNS & CDN:_ Routes global traffic and offloads static front-end assets to edge servers.

_Load Balancer:_ Spreads the 2,000+ RPS read/write traffic evenly across multiple app servers.

_Stateless App Servers:_ Handle client requests, authentication, and validation logic.

_Redis Cache:_ Buffers high-frequency read requests for seat maps so the database isn't overwhelmed.

_Primary Database & Read Replicas:_ Primary database handles transactional booking rows securely with ACID guarantees, while replicas handle general event browsing.

_Queue & Workers:_ Automatically un-holds seats if a user abandons their checkout cart after 10 minutes.

# Architectural Trade-offs

_Speed vs. Strict Real-Time Accuracy on Seat Maps:_ Caching seat availability in Redis makes browsing lightning-fast, but a user might occasionally see a seat as available that was taken 200ms ago. Final validation is always enforced strictly at the database transaction level during checkout.

_Simplicity vs. Distributed Complexity:_ Implementing distributed locking and queue systems adds infrastructure complexity compared to a single server, but it is necessary to guarantee 100% data integrity and prevent site crashes during massive ticket drops.
