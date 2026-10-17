# QuickNotes System Design & API Client (Project 2)

## Description

A full-stack client implementation and enterprise system design specification for **QuickNotes**, scaling the backend architecture to support 1 million users.

## How to Run the API Client

1. Clone or download this repository locally.
2. Open the project folder in **VS Code**.
3. Launch the web application using **Live Server** (or open `index.html` via a local web server to prevent CORS file protocol restrictions).

## System Documentation Links

- [API Design Specification](docs/api-design.md)
- [Data Model & Database Schema](docs/data-model.md)
- [Architecture & Scaling Plan](docs/architecture.md)

## What I Learned

1. **Client-Server Communication & Async JavaScript**: Mastering `fetch()`, `async/await`, error boundaries (`try/catch/finally`), and secure DOM rendering using `textContent`.
2. **Relational Database Design**: Structuring normalized entities, foreign key constraints, many-to-many join tables, and query optimization via indexes.
3. **Horizontal System Scaling**: Architecting resilient infrastructures utilizing CDNs, load balancers, caching layers (Redis), database replication, and asynchronous worker queues.
