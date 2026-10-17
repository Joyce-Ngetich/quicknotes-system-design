# SnapShare Photo-Sharing App: Scaling & Architecture Plan

## 1. Assumptions & Active User Calculations

- **Registered Users**: 10,000,000
- **Daily Active Users (DAU)**: 10% of registered users = 1,000,000 DAU
- **Upload Behavior**: Each active user uploads 1 photo per day.
- **Consumption Behavior**: Each active user views 50 feed pages per day.
- **File Sizes**: Average photo = 2 MB; Thumbnail = 50 KB.

---

## 2. Load and Storage Calculations

- **Seconds in a Day**: ~86,400 seconds (rounded to 100,000 for estimation).
- **Writes (Photo Uploads)**:
  - $1,000,000 \text{ uploads} / 100,000 \text{ seconds} \approx \mathbf{10 \text{ writes per second (average)}}$
- **Reads (Feed Views)**:
  - $1,000,000 \text{ users} \times 50 \text{ feeds} = 50,000,000 \text{ feed views per day}$
  - $50,000,000 / 100,000 \text{ seconds} \approx \mathbf{500 \text{ reads per second (average)}}$
- **Peak Traffic (5× Multiplier)**:
  - Peak Writes: $\approx \mathbf{50 \text{ writes/s}}$
  - Peak Reads: $\approx \mathbf{2,500 \text{ reads/s}}$
- **Storage per Year**:
  - Original Photos: $1,000,000 \text{ uploads/day} \times 2 \text{ MB} = 2,000,000 \text{ MB/day} = 2 \text{ TB/day}$
  - Thumbnails: $1,000,000 \text{ uploads/day} \times 50 \text{ KB} = 50,000 \text{ MB/day} \approx 50 \text{ GB/day}$
  - Total Storage/Year: $(2 \text{ TB} + 0.05 \text{ TB}) \times 365 \text{ days} \approx \mathbf{748 \text{ TB per year}}$

---

## 3. System Characteristics

- **Read-Heavy vs. Write-Heavy**: The system is heavily **read-heavy** (roughly 50 reads for every 1 write).
- **Design Implications**: Because reads vastly outnumber writes, the architecture heavily prioritizes caching user feeds, deploying database read replicas, and utilizing a Content Delivery Network (CDN) to serve photo files globally with low latency.

---

## 4. Why Not Store Photos in the Database?

Relational databases are optimized for structured tabular data, quick indexing, and transactional integrity (ACID). Storing large binary files (BLOBs) like 2 MB images inside a database would bloat database size, degrade query performance, exhaust RAM, and complicate backups. Instead, photo binary files must be stored in specialized **Object Storage** (e.g., AWS S3), while the database stores only lightweight metadata references (e.g., image URLs, timestamps, user IDs).

---

## 5. System Architecture Diagram

```text
               ┌─────────────────────────┐
               │           DNS           │
               └────────────┬────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       │                                         │
┌──────┴──────┐                           ┌──────┴──────┐
│  Browser /  │      Static Assets        │ CDN (Edge)  │
│ Mobile App  │──────────────────────────>│ (Images/UI) │
└──────┬──────┘                           └─────────────┘
       │ API Requests (HTTPS)
       v
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       ├─────────────────┬─────────────────┐
       v                 v                 v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ App Server 1 │  │ App Server 2 │  │ App Server 3 │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ├─────────────────┼─────────────────┘
       │                 │
       │ Writes          │ Reads
       v                 v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Primary    │─>│ Read         │  │ Cache (Redis)│
│   Database   │  │ Replicas     │  └──────────────┘
└──────────────┘  └──────────────┘
       │
       │ Enqueue Job
       v
┌──────────────┐    Pulls Job     ┌──────────────┐    Saves Thumbnail  ┌──────────────┐
│ Message Queue│─────────────────>│    Worker    │────────────────────>│ Object Store │
└──────────────┘                  └──────────────┘                     │ (S3 / Blobs) │
                                                                       └──────────────┘
```
