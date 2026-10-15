# School Database Design

## Table Explanations & Relationships
* **students**: Stores individual student records, holding unique identifiers, names, and unique email addresses.
* **courses**: Stores available school courses, identified by a unique course code and title.
* **enrolments**: A many-to-many join table linking `students` to `courses`. A student can enrol in multiple courses, and a course can have multiple students. This table stores the relationship along with extra metadata (`grade` and `enrolled_at`).

## Indexing
An index on `enrolments(student_id)` and `enrolments(course_id)` would improve query performance. Since foreign keys are frequently used to filter records during `JOIN` operations across large datasets, indexing them speeds up lookups, though it adds a minor overhead during inserts and updates.

## Database Choice: SQL vs. NoSQL
For this school system, a relational database (SQL) is the optimal choice[cite: 7]. School administration data relies heavily on strict structured relationships (students mapped to specific enrolments, courses, and grades) where data integrity, uniqueness constraints (like student emails), and transaction consistency (ACID compliance) are critical[cite: 7, 8]. A relational model prevents orphan records and ensures grades and course linkages remain accurate.