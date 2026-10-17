# QuickNotes REST API Design Specification

## Overview

This document outlines the production RESTful API endpoints, request/response structures, and error handling mechanisms for the QuickNotes backend.

---

## Endpoints

| Method   | Path         | Description                                        | Success Status   |
| -------- | ------------ | -------------------------------------------------- | ---------------- |
| `GET`    | `/notes`     | List all notes belonging to the authenticated user | `200 OK`         |
| `GET`    | `/notes/:id` | Retrieve a single note by its unique identifier    | `200 OK`         |
| `POST`   | `/notes`     | Create a new note record                           | `201 Created`    |
| `PUT`    | `/notes/:id` | Fully replace an existing note record              | `200 OK`         |
| `PATCH`  | `/notes/:id` | Partially update fields of an existing note record | `200 OK`         |
| `DELETE` | `/notes/:id` | Delete a specific note record                      | `204 No Content` |

## Request & Response Examples

### 1. Creating a Note (`POST /notes`)

- **Request Header**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "title": "Review system architecture",
    "category": "work",
    "text": "Check Redis cache hit ratios and database replicas."
  }

  **Response Body**: (201 created)
  {
  "id": 42,
  "user_id": 7,
  "title": "Review system architecture",
  "category": "work",
  "text": "Check Redis cache hit ratios and database replicas.",
  "createdAt": "2026-10-17T10:00:00Z"
  }
  ```
