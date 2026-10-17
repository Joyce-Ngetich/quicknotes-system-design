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
  - Original Photos + Thumbnails: $1,000,000 \text{ uploads/day} \times 2.05 \text{ MB} \approx 2.05 \text{ TB/day}$
  - Total Storage/Year: $2.05 \text{ TB} \times 365 \text{ days} \approx \mathbf{748 \text{ TB per year}}$

---

## 3. System Characteristics

- **Read-Heavy vs. Write-Heavy**: The system is heavily **read-heavy** (roughly 50 reads for every 1 write).
- **Design Implications**: Because reads vastly outnumber writes, the architecture prioritizes database read replicas, caching, and a Content Delivery Network (CDN) to serve media globally with low latency.

---

## 4. Why Not Store Photos in the Database?

Relational databases are optimized for structured tabular data and transactional integrity. Storing large binary files (BLOBs) like 2 MB images inside a database bloats its size, degrades query performance, and complicates backups. Photos belong in specialized **Object Storage**, while the database stores only lightweight metadata URLs.

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
