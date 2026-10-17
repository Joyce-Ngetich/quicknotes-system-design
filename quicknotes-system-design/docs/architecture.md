# QuickNotes System Architecture & Scaling Plan

## Requirements

- **Functional Requirements**: User authentication, CRUD operations for notes, tagging, and secure persistence.
- **Non-Functional Requirements**: High availability (99.9%), fast read latency (< 50 ms), horizontal scalability, and fault tolerance.

---

## Load Estimates (1 Million Users)

- **Registered Users**: 1,000,000[cite: 2]
- **DAU (20%)**: 200,000 active users[cite: 2].
- **Writes**: 5 notes/user/day = 1,000,000 writes/day $\approx \mathbf{10 \text{ writes/sec (average)}}$ (Peak: $\approx \mathbf{50 \text{ writes/sec}}$)[cite: 2].
- **Reads**: 20 loads/user/day = 4,000,000 reads/day $\approx \mathbf{40 \text{ reads/sec (average)}}$ (Peak: $\approx \mathbf{200 \text{ reads/sec}}$)[cite: 2].
- **Storage**: 1M notes/day × 500 bytes = 500 MB/day $\approx \mathbf{180 \text{ GB per year}}$[cite: 2].

---

## Architecture Diagram

````text
                          ┌─────────┐
          ┌──────────────>│   DNS   │  (quicknotes.com → IP addresses)[cite: 2]
          │               └─────────┘
┌─────────┴─────┐  static files   ┌──────────────────────┐
│ Browser /     │ ─────────────>  │ CDN (HTML, CSS, JS)  │[cite: 2]
│ mobile client │                 └──────────────────────┘
└─────────┬─────┘
          │ API calls (HTTPS, JSON)[cite: 2]
          v
   ┌───────────────┐
   │ Load balancer │[cite: 2]
   └──────┬────────┘
     ┌────┴─────┬──────────┐
     v          v          v
┌─────────┐┌─────────┐┌─────────┐        ┌──────────────┐
│  App 1  ││  App 2  ││  App 3  │ ─────> │ Cache (Redis)│[cite: 2]
└────┬────┘└────┬────┘└────┬────┘        └──────────────┘
     │ writes   │ reads    │ jobs
     v          v          v
┌─────────┐┌──────────┐┌───────┐   ┌────────┐
│ Primary │>│ Read     ││ Queue │──>│ Worker │ (emails, exports)[cite: 2]
│   DB    ││ replicas │└───────┘   └────────┘
└─────────┘└──────────┘
```[cite: 2]

---

## Component Explanations
* **DNS**: Resolves domain names to specific network IP routing endpoints[cite: 2].
* **CDN**: Distributes static front-end web assets globally on edge servers close to users[cite: 2].
* **Load Balancer**: Distributes incoming API requests evenly across stateless application servers[cite: 2].
* **App Servers**: Process application business logic and coordinate data calls[cite: 2].
* **Redis Cache**: Minimizes database workload by caching active user payloads in high-speed RAM[cite: 2].
* **Primary Database**: Handles write transactions and authoritative system updates[cite: 2].
* **Read Replicas**: Synchronized copies of the primary database dedicated to handling read traffic[cite: 2].
* **Message Queue & Worker**: Offloads slow background tasks asynchronously away from request threads[cite: 2].

---

## Step-by-Step Request Flows
* **`GET /notes` Flow**: Request hits Load Balancer $\rightarrow$ App Server checks **Redis Cache**. If hit, data returns instantly (~1ms). If miss, app queries **Read Replicas**, caches the result, and responds[cite: 2].
* **`POST /notes` Flow**: Request hits Load Balancer $\rightarrow$ Server validates data and commits record to **Primary Database** $\rightarrow$ invalidates user cache key in **Redis** $\rightarrow$ returns `201 Created`[cite: 2].

---

## Trade-offs & Single Points of Failure (SPOF) Mitigation
* **Speed vs. Freshness**: Caching reads via Redis means users might occasionally experience brief stale data windows following updates, accepted in exchange for sub-millisecond read latency[cite: 2].
* **SPOF Mitigation**: Redundancy is embedded across tiers. Multiple stateless app servers sit behind a load balancer; primary databases have automatic failover read replicas so individual node failures cause zero downtime[cite: 2].
````
