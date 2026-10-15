-- Enable foreign key constraints for SQLite
PRAGMA foreign_keys = ON;

-- 1. CREATE TABLES
CREATE TABLE students (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE enrolments (
  student_id  INTEGER NOT NULL,
  course_id   INTEGER NOT NULL,
  grade       TEXT,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id), -- Prevents duplicate enrolment on the same course
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 2. INSERT SAMPLE DATA
INSERT INTO students (name, email) VALUES 
  ('Amina Otieno', 'amina@example.com'),
  ('Brian Kamau', 'brian@example.com'),
  ('Chloe Wanjiku', 'chloe@example.com'),
  ('David Kiprop', 'david@example.com'); -- Student with no enrolments

INSERT INTO courses (title, code, description) VALUES 
  ('Database Systems', 'CS101', 'Introduction to relational databases and SQL'),
  ('Web Foundations', 'CS102', 'HTML, CSS, and JavaScript basics'),
  ('Project Management', 'PM201', 'Planning, execution, and monitoring');

INSERT INTO enrolments (student_id, course_id, grade) VALUES 
  (1, 1, 'A'),
  (1, 2, 'B+'),
  (2, 1, 'A-'),
  (2, 3, 'B'),
  (3, 2, 'A');

-- 3. REQUIRED QUERIES

-- Query 1: All courses for one student (by name)
SELECT courses.title, courses.code, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno';

-- Query 2: All students on one course
SELECT students.name, students.email, enrolments.grade
FROM enrolments
JOIN courses ON courses.id = enrolments.course_id
JOIN students ON students.id = enrolments.student_id
WHERE courses.code = 'CS101';

-- Query 3: The number of students per course
SELECT courses.title, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id;

-- Query 4: Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.course_id IS NULL;

-- Query 5: Update one enrolment's grade
UPDATE enrolments 
SET grade = 'A+' 
WHERE student_id = 1 AND course_id = 1;