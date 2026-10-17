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

## 6. Component Explanations

**DNS:**: Translates human-readable domain names into machine-readable IP addresses to route client requests.
**CDN (Content Delivery Network):** Caches static assets and media files close to global users on edge servers to minimize network latency.
**Load Balancer:** Distributes incoming web and API traffic evenly across multiple application servers to prevent bottlenecks.
**App Servers:** Stateless compute nodes that process business logic, handle client authentication, and coordinate database interactions.
**Cache (Redis):** Stores frequently accessed data in high-speed memory (RAM) to serve read requests instantaneously without hitting the database.
**Primary Database:** Handles all data modification queries (inserts, updates, deletes) to maintain absolute transactional consistency.  
**Read Replicas:** Synchronized copies of the primary database dedicated solely to handling read queries, scaling database read capacity.  
**Message Queue:** Asynchronously holds background tasks so the app server can respond immediately to the client without waiting for heavy processing to finish[cite: 5].
**Worker:** Background process that pulls tasks from the queue to execute heavy operations like image resizing and thumbnail generation.
**Object Storage:** Highly scalable, cost-effective storage service engineered specifically to house large unstructured binary files like raw photos and videos[cite: 3]

## 7. Step-by-Step Photo Upload Flow

i. **Initiation:** The client authenticates with an app server and sends a POST /photos request containing the image binary data and caption.

ii. **File Storing:** The app server streams the raw 2 MB image file directly into the Object Storage bucket and receives back a secure public URL.

iii. **Database Write:** The app server writes a new record into the Primary Database containing the user ID, caption, and the object storage image URL[cite: 3].

iv. **Queue Offloading:** The app server pushes a background job message (create_thumbnail with the image reference) into the Message Queue and instantly replies to the client with 201 Created.

v. **Worker Processing:** A background Worker pulls the job from the queue, downloads the raw photo, resizes it down to a 50 KB thumbnail, uploads the thumbnail back to the Object Storage, and updates the database record with the thumbnail URL.

## 8. Architectural Trade-offs

**Speed vs. Freshness (Eventual Consistency):** Read replicas and cached feeds deliver blazing-fast load times for users, but newly uploaded photos may take a few milliseconds to appear across all replicas due to replication lag.

**Simplicity vs. Scalability:** Introducing distributed queues, object storage, and read replicas adds operational complexity and infrastructure overhead compared to a simple single-server monolith, but it is necessary to guarantee high availability and scale smoothly to 10 million users.
