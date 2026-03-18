import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const db = new Database("campus.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER,
    name TEXT NOT NULL,
    capacity INTEGER,
    department_id INTEGER,
    FOREIGN KEY(block_id) REFERENCES blocks(id),
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('student', 'faculty', 'dept_admin')) NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS faculty_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    block_id INTEGER,
    type TEXT, -- e.g. 'Theory', 'Lab', 'Research'
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(block_id) REFERENCES blocks(id)
  );

  CREATE TABLE IF NOT EXISTS student_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    year INTEGER,
    section TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS timetables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER,
    faculty_id INTEGER,
    faculty_name TEXT,
    classroom_id INTEGER,
    classroom_name TEXT,
    day TEXT,
    start_time TEXT,
    end_time TEXT,
    subject TEXT,
    year INTEGER,
    section TEXT,
    FOREIGN KEY(department_id) REFERENCES departments(id),
    FOREIGN KEY(faculty_id) REFERENCES users(id),
    FOREIGN KEY(classroom_id) REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    timetable_id INTEGER,
    date TEXT,
    status TEXT CHECK(status IN ('present', 'absent')),
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(timetable_id) REFERENCES timetables(id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER,
    credits INTEGER,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS student_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    semester TEXT,
    year INTEGER,
    grade TEXT,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
`);

// Migration: Add type column to faculty_details if it doesn't exist
try {
  db.prepare("ALTER TABLE faculty_details ADD COLUMN type TEXT").run();
} catch (e) {
  // Column might already exist
}

// Migration: Add year and section to timetables if they don't exist
const timetableInfo = db.prepare("PRAGMA table_info(timetables)").all() as any[];
const hasYear = timetableInfo.some(col => col.name === 'year');
const hasFacultyName = timetableInfo.some(col => col.name === 'faculty_name');

if (!hasYear) {
  db.exec("ALTER TABLE timetables ADD COLUMN year INTEGER");
  db.exec("ALTER TABLE timetables ADD COLUMN section TEXT");
}
if (!hasFacultyName) {
  db.exec("ALTER TABLE timetables ADD COLUMN faculty_name TEXT");
}

// Migration: Add image_url to departments if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(departments)").all() as any[];
const hasImageUrl = tableInfo.some(col => col.name === 'image_url');
if (!hasImageUrl) {
  db.exec("ALTER TABLE departments ADD COLUMN image_url TEXT");
}

// Migration: Add image_url to blocks if it doesn't exist
const blockTableInfo = db.prepare("PRAGMA table_info(blocks)").all() as any[];
const hasBlockImageUrl = blockTableInfo.some(col => col.name === 'image_url');
if (!hasBlockImageUrl) {
  db.exec("ALTER TABLE blocks ADD COLUMN image_url TEXT");
}

// Migration: Add department_id to classrooms if it doesn't exist
const classroomInfo = db.prepare("PRAGMA table_info(classrooms)").all() as any[];
const hasDeptId = classroomInfo.some(col => col.name === 'department_id');
if (!hasDeptId) {
  db.exec("ALTER TABLE classrooms ADD COLUMN department_id INTEGER");
}

// Add more departments if they don't exist
const existingDepts = db.prepare("SELECT name FROM departments").all() as { name: string }[];
const deptNames = existingDepts.map(d => d.name);
const newDepts = [
  { name: "Electrical Engineering", location: "Block C, 1st Floor" },
  { name: "Civil Engineering", location: "Block D, Ground Floor" },
  { name: "Business Administration", location: "Block E, 3rd Floor" },
  { name: "Biotechnology", location: "Block F, 2nd Floor" },
  { name: "AI&DS", location: "Block A, 3rd Floor" }
];

for (const dept of newDepts) {
  if (!deptNames.includes(dept.name)) {
    db.prepare("INSERT INTO departments (name, location) VALUES (?, ?)").run(dept.name, dept.location);
  }
}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  // Ensure we have at least one department for seeding
  const csDept = db.prepare("SELECT id FROM departments WHERE name = ?").get("Computer Science") as { id: number } | undefined;
  let deptId = csDept?.id;
  
  if (!deptId) {
    const result = db.prepare("INSERT INTO departments (name, location) VALUES (?, ?)").run("Computer Science", "Block A, 2nd Floor");
    deptId = result.lastInsertRowid as number;
  }

  db.prepare("INSERT INTO blocks (name, type) VALUES (?, ?)").run("Academic Block A", "Academic");
  db.prepare("INSERT INTO blocks (name, type) VALUES (?, ?)").run("Admin Block", "Administrative");
  
  db.prepare("INSERT INTO classrooms (block_id, name, capacity, department_id) VALUES (?, ?, ?, ?)").run(1, "Room 201", 60, deptId);
  db.prepare("INSERT INTO classrooms (block_id, name, capacity, department_id) VALUES (?, ?, ?, ?)").run(1, "Room 202", 40, deptId);

  // Seed users (password is 'password' for all)
  const facultyResult = db.prepare("INSERT INTO users (email, password, role, name, department_id) VALUES (?, ?, ?, ?, ?)").run("faculty@college.edu", "password", "faculty", "Dr. Smith", deptId);
  const facultyId = facultyResult.lastInsertRowid as number;

  const studentResult = db.prepare("INSERT INTO users (email, password, role, name, department_id) VALUES (?, ?, ?, ?, ?)").run("student@college.edu", "password", "student", "John Doe", deptId);
  const studentId = studentResult.lastInsertRowid as number;

  const adminResult = db.prepare("INSERT INTO users (email, password, role, name, department_id) VALUES (?, ?, ?, ?, ?)").run("admin@college.edu", "password", "dept_admin", "Admin User", deptId);
  
  db.prepare("INSERT INTO faculty_details (user_id, block_id, type) VALUES (?, ?, ?)").run(facultyId, 1, "Professor");
  db.prepare("INSERT INTO student_details (user_id, year, section) VALUES (?, ?, ?)").run(studentId, 2, "A");

  db.prepare("INSERT INTO courses (code, name, department_id, credits) VALUES (?, ?, ?, ?)").run("CS101", "Introduction to Programming", deptId, 4);
  db.prepare("INSERT INTO courses (code, name, department_id, credits) VALUES (?, ?, ?, ?)").run("CS102", "Data Structures", deptId, 4);

  db.prepare("INSERT INTO timetables (department_id, faculty_id, classroom_id, day, start_time, end_time, subject, year, section) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(deptId, facultyId, 1, "Monday", "08:00", "08:50", "Data Structures", 2, "A");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare(`
      SELECT u.*, d.name as department_name, sd.year, sd.section
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN student_details sd ON u.id = sd.user_id
      WHERE u.email = ? AND u.password = ?
    `).get(email, password) as any;
    
    if (user) {
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          name: user.name, 
          department_id: user.department_id,
          department_name: user.department_name,
          year: user.year,
          section: user.section
        } 
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  app.get("/api/departments", (req, res) => {
    const depts = db.prepare("SELECT * FROM departments").all();
    res.json(depts);
  });

  app.post("/api/departments", (req, res) => {
    const { name, location, image_url } = req.body;
    try {
      const result = db.prepare("INSERT INTO departments (name, location, image_url) VALUES (?, ?, ?)").run(name, location, image_url);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to add department" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update profile" });
    }
  });

  // Announcements API
  app.get("/api/announcements", (req, res) => {
    try {
      const announcements = db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all();
      res.json(announcements);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", (req, res) => {
    const { title, content, author_id, author_name, author_role } = req.body;
    try {
      db.prepare(`
        INSERT INTO announcements (title, content, author_id, author_name, author_role)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, content, author_id, author_name, author_role);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.put("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    try {
      db.prepare(`
        UPDATE announcements 
        SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(title, content, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  });

  app.put("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    const { name, location } = req.body;
    try {
      db.prepare("UPDATE departments SET name = ?, location = ? WHERE id = ?").run(name, location, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Get image URL to delete file
      const dept = db.prepare("SELECT image_url FROM departments WHERE id = ?").get(id) as any;
      if (dept && typeof dept.image_url === 'string' && dept.image_url.startsWith('/uploads/')) {
        const relativePath = dept.image_url.startsWith('/') ? dept.image_url.slice(1) : dept.image_url;
        const oldPath = path.join(__dirname, "public", relativePath);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (unlinkErr) {
          console.error("Failed to delete file:", oldPath, unlinkErr);
        }
      }
      db.prepare("DELETE FROM departments WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete department" });
    }
  });

  app.put("/api/departments/:id/image", (req, res) => {
    const { id } = req.params;
    const { image_url } = req.body;
    try {
      // Get old image URL to delete file
      const dept = db.prepare("SELECT image_url FROM departments WHERE id = ?").get(id) as any;
      if (dept && typeof dept.image_url === 'string' && dept.image_url.startsWith('/uploads/')) {
        const relativePath = dept.image_url.startsWith('/') ? dept.image_url.slice(1) : dept.image_url;
        const oldPath = path.join(__dirname, "public", relativePath);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (unlinkErr) {
          console.error("Failed to delete file:", oldPath, unlinkErr);
        }
      }
      db.prepare("UPDATE departments SET image_url = ? WHERE id = ?").run(image_url, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update department image" });
    }
  });

  app.put("/api/blocks/:id/image", (req, res) => {
    const { id } = req.params;
    const { image_url } = req.body;
    try {
      // Get old image URL to delete file
      const block = db.prepare("SELECT image_url FROM blocks WHERE id = ?").get(id) as any;
      if (block && typeof block.image_url === 'string' && block.image_url.startsWith('/uploads/')) {
        const relativePath = block.image_url.startsWith('/') ? block.image_url.slice(1) : block.image_url;
        const oldPath = path.join(__dirname, "public", relativePath);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (unlinkErr) {
          console.error("Failed to delete file:", oldPath, unlinkErr);
        }
      }
      db.prepare("UPDATE blocks SET image_url = ? WHERE id = ?").run(image_url, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update block image" });
    }
  });

  app.put("/api/classrooms/:id", (req, res) => {
    const { id } = req.params;
    const { name, capacity, department_id } = req.body;
    try {
      db.prepare("UPDATE classrooms SET name = ?, capacity = ?, department_id = ? WHERE id = ?").run(name, capacity, department_id, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update classroom" });
    }
  });

  app.post("/api/classrooms", (req, res) => {
    const { name, capacity, block_id, department_id } = req.body;
    try {
      const result = db.prepare("INSERT INTO classrooms (name, capacity, block_id, department_id) VALUES (?, ?, ?, ?)").run(name, capacity, block_id, department_id);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to add classroom" });
    }
  });

  app.get("/api/classrooms/:id/students", (req, res) => {
    const { id } = req.params;
    try {
      // Find students who have classes in this classroom
      const students = db.prepare(`
        SELECT DISTINCT u.id, u.name, u.email, d.name as department_name, sd.year, sd.section
        FROM users u
        JOIN student_details sd ON u.id = sd.user_id
        JOIN departments d ON u.department_id = d.id
        JOIN timetables t ON t.department_id = u.department_id
        WHERE t.classroom_id = ? AND u.role = 'student'
      `).all(id);
      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch students" });
    }
  });

  app.delete("/api/timetable/clear", (req, res) => {
    const { department_id, year, section } = req.query;
    if (!department_id || !year || !section) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    try {
      db.prepare("DELETE FROM timetables WHERE department_id = ? AND year = ? AND section = ?")
        .run(department_id, year, section);
      res.json({ success: true, message: "Timetable cleared successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to clear timetable" });
    }
  });

  app.post("/api/timetable/upload", (req, res) => {
    const { entries, clear } = req.body;
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: "Invalid entries format" });
    }

    try {
      const transaction = db.transaction((timetableEntries) => {
        if (clear && timetableEntries.length > 0) {
          // Use the first entry to determine which class timetable to clear
          // but only if it has the required fields
          const first = timetableEntries[0];
          if (first.year && first.section && first.department_id) {
            db.prepare("DELETE FROM timetables WHERE year = ? AND section = ? AND department_id = ?")
              .run(first.year, first.section, first.department_id);
          }
        }

        const insert = db.prepare(`
          INSERT INTO timetables (department_id, faculty_id, faculty_name, classroom_id, classroom_name, day, start_time, end_time, subject, year, section)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const entry of timetableEntries) {
          if (entry.subject && entry.subject.trim() !== "") {
            insert.run(
              entry.department_id,
              entry.faculty_id,
              entry.faculty_name,
              entry.classroom_id,
              entry.classroom_name,
              entry.day,
              entry.start_time,
              entry.end_time,
              entry.subject,
              entry.year,
              entry.section
            );
          }
        }
      });

      transaction(entries);
      res.json({ success: true, message: "Timetable updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to upload timetable" });
    }
  });

  app.get("/api/blocks", (req, res) => {
    const blocks = db.prepare("SELECT * FROM blocks").all();
    res.json(blocks);
  });

  app.get("/api/classrooms", (req, res) => {
    const { department_id } = req.query;
    let query = `
      SELECT c.*, b.name as block_name 
      FROM classrooms c 
      JOIN blocks b ON c.block_id = b.id
    `;
    const params: any[] = [];
    if (department_id) {
      query += " WHERE c.department_id = ? OR c.department_id IS NULL";
      params.push(department_id);
    }
    const classrooms = db.prepare(query).all(...params);
    res.json(classrooms);
  });

  app.get("/api/timetable/:role/:id", (req, res) => {
    const { role, id } = req.params;
    const { year, section, department_id } = req.query;
    
    try {
      let query = "";
      let params: any[] = [];

      if (year && section && department_id) {
        query = `
          SELECT t.*, COALESCE(t.classroom_name, c.name) as classroom_name, 
                 COALESCE(t.faculty_name, u.name) as faculty_name 
          FROM timetables t
          LEFT JOIN classrooms c ON t.classroom_id = c.id
          LEFT JOIN users u ON t.faculty_id = u.id
          WHERE t.year = ? AND t.section = ? AND t.department_id = ?
        `;
        params = [parseInt(year as string), section, parseInt(department_id as string)];
      } else if (role === 'faculty') {
        query = `
          SELECT t.*, COALESCE(t.classroom_name, c.name) as classroom_name, 
                 COALESCE(t.faculty_name, u.name) as faculty_name 
          FROM timetables t 
          LEFT JOIN classrooms c ON t.classroom_id = c.id 
          LEFT JOIN users u ON t.faculty_id = u.id
          WHERE t.faculty_id = ? OR t.faculty_name = (SELECT name FROM users WHERE id = ?)
        `;
        params = [id, id];
      } else if (role === 'visitor') {
        return res.json([]);
      } else {
        // For student, we show timetable of their specific class
        query = `
          SELECT t.*, COALESCE(t.classroom_name, c.name) as classroom_name, 
                 COALESCE(t.faculty_name, u.name) as faculty_name 
          FROM timetables t 
          LEFT JOIN classrooms c ON t.classroom_id = c.id 
          LEFT JOIN users u ON t.faculty_id = u.id 
          JOIN student_details sd ON sd.user_id = ?
          WHERE t.department_id = (SELECT department_id FROM users WHERE id = ?)
          AND t.year = sd.year AND t.section = sd.section
        `;
        params = [id, id];
      }
      const timetable = db.prepare(query).all(...params);
      res.json(timetable);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch timetable" });
    }
  });

  app.delete("/api/timetable/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM timetables WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete timetable entry" });
    }
  });

  app.get("/api/stats/attendance", (req, res) => {
    const { studentId, role } = req.query;
    try {
      let overallQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
      `;
      let weeklyQuery = `
        SELECT 
          strftime('%w', date) as day_index,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date >= date('now', '-7 days')
      `;

      const params: any[] = [];
      if (role === 'visitor') {
        return res.json({ avgAttendance: 0, weeklyData: [1, 2, 3, 4, 5].map(idx => ({ name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx], value: 0 })) });
      }
      if (studentId) {
        overallQuery += " WHERE student_id = ?";
        weeklyQuery += " AND student_id = ?";
        params.push(studentId);
      }

      weeklyQuery += " GROUP BY day_index";

      const overall = db.prepare(overallQuery).get(...params) as { total: number, present: number };
      const avgAttendance = overall && overall.total > 0 
        ? Math.round((overall.present / overall.total) * 100) 
        : 0;

      const weekly = db.prepare(weeklyQuery).all(...params) as { day_index: string, total: number, present: number }[];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = [1, 2, 3, 4, 5].map(idx => {
        const dayData = weekly.find(w => parseInt(w.day_index) === idx);
        return {
          name: dayNames[idx],
          value: dayData && dayData.total > 0 ? Math.round((dayData.present / dayData.total) * 100) : 0
        };
      });

      res.json({ avgAttendance, weeklyData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  });

  app.get("/api/attendance/:studentId", (req, res) => {
    const attendance = db.prepare(`
      SELECT a.*, t.subject, t.date as schedule_date 
      FROM attendance a 
      JOIN timetables t ON a.timetable_id = t.id 
      WHERE a.student_id = ?
    `).all(req.params.studentId);
    res.json(attendance);
  });

  app.post("/api/attendance", (req, res) => {
    const { student_id, timetable_id, date, status } = req.body;
    db.prepare("INSERT INTO attendance (student_id, timetable_id, date, status) VALUES (?, ?, ?, ?)").run(student_id, timetable_id, date, status);
    res.json({ success: true });
  });

  app.get("/api/courses", (req, res) => {
    const { department_id } = req.query;
    let query = "SELECT * FROM courses";
    const params: any[] = [];
    if (department_id) {
      query += " WHERE department_id = ?";
      params.push(department_id);
    }
    const courses = db.prepare(query).all(...params);
    res.json(courses);
  });

  app.post("/api/courses", (req, res) => {
    const { code, name, department_id, credits } = req.body;
    try {
      const result = db.prepare("INSERT INTO courses (code, name, department_id, credits) VALUES (?, ?, ?, ?)").run(code, name, department_id, credits);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to add course" });
    }
  });

  app.get("/api/faculty", (req, res) => {
    const { department_id } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, d.name as department_name, b.name as block_name, fd.type
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN faculty_details fd ON u.id = fd.user_id
      LEFT JOIN blocks b ON fd.block_id = b.id
      WHERE u.role = 'faculty'
    `;
    const params: any[] = [];
    if (department_id) {
      query += " AND u.department_id = ?";
      params.push(department_id);
    }
    const faculty = db.prepare(query).all(...params);
    res.json(faculty);
  });

  app.get("/api/student-progress/:studentId", (req, res) => {
    const { studentId } = req.params;
    try {
      const attendance = db.prepare(`
        SELECT 
          t.subject,
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          (
            SELECT ROUND(AVG(CASE WHEN a2.status = 'present' THEN 100.0 ELSE 0.0 END), 1)
            FROM attendance a2
            JOIN timetables t2 ON a2.timetable_id = t2.id
            WHERE t2.subject = t.subject AND t2.department_id = (SELECT department_id FROM users WHERE id = ?)
          ) as dept_avg
        FROM attendance a
        JOIN timetables t ON a.timetable_id = t.id
        WHERE a.student_id = ?
        GROUP BY t.subject
      `).all(studentId, studentId) as any[];

      const courses = db.prepare(`
        SELECT c.code, c.name, sc.grade, sc.semester, sc.year
        FROM student_courses sc
        JOIN courses c ON sc.course_id = c.id
        WHERE sc.student_id = ?
      `).all(studentId);

      res.json({ attendance, courses });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/student-courses", (req, res) => {
    const { student_id, course_id, semester, year } = req.body;
    try {
      db.prepare("INSERT INTO student_courses (student_id, course_id, semester, year) VALUES (?, ?, ?, ?)").run(student_id, course_id, semester, year);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  });

  app.get("/api/students", (req, res) => {
    const { department_id, year, section } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, d.name as department_name, u.department_id, sd.year, sd.section
      FROM users u
      JOIN departments d ON u.department_id = d.id
      JOIN student_details sd ON u.id = sd.user_id
      WHERE u.role = 'student'
    `;
    const params: any[] = [];
    
    if (department_id && department_id !== '0') {
      query += " AND u.department_id = ?";
      params.push(parseInt(department_id as string));
    }
    if (year && year !== '0') {
      query += " AND sd.year = ?";
      params.push(parseInt(year as string));
    }
    if (section && section !== 'All') {
      query += " AND sd.section = ?";
      params.push(section);
    }

    try {
      const students = db.prepare(query).all(...params);
      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", (req, res) => {
    const { name, email, password, department_id, year, section } = req.body;
    
    const createTransaction = db.transaction(() => {
      const userResult = db.prepare("INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, 'student', ?)").run(name, email, password || 'password123', department_id);
      const userId = userResult.lastInsertRowid;
      db.prepare("INSERT INTO student_details (user_id, year, section) VALUES (?, ?, ?)").run(userId, year, section);
      return userId;
    });

    try {
      const userId = createTransaction();
      res.json({ success: true, id: userId });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ success: false, message: "Email already exists" });
      } else {
        res.status(500).json({ success: false, message: "Failed to create student" });
      }
    }
  });

  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, year, section, department_id } = req.body;
    
    const updateTransaction = db.transaction(() => {
      if (department_id) {
        db.prepare("UPDATE users SET name = ?, email = ?, department_id = ? WHERE id = ?").run(name, email, department_id, id);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, id);
      }
      db.prepare("UPDATE student_details SET year = ?, section = ? WHERE user_id = ?").run(year, section, id);
    });
    
    try {
      updateTransaction();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    console.log(`Deleting student with ID: ${id}`);
    
    const deleteTransaction = db.transaction(() => {
      // Delete from attendance first due to FK constraints
      db.prepare("DELETE FROM attendance WHERE student_id = ?").run(id);
      // Delete from student_details
      db.prepare("DELETE FROM student_details WHERE user_id = ?").run(id);
      // Delete from users
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
    });

    try {
      deleteTransaction();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete student" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    app.use("/uploads", express.static(uploadDir));
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
