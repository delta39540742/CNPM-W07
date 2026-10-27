const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'tasks.db');

// Initialize SQLite database and migrate data from tasks.json if needed
function initDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  // Check if tasks table has data; if not, migrate from tasks.json
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM tasks').get();
  const taskCount = row.cnt;

  if (taskCount === 0) {
    const tasksJson = path.join(__dirname, 'tasks.json');
    if (require('fs').existsSync(tasksJson)) {
      try {
        const raw = require('fs').readFileSync(tasksJson, 'utf8');
        const tasks = JSON.parse(raw);
        if (Array.isArray(tasks) && tasks.length > 0) {
          const stmt = db.prepare('INSERT INTO tasks (id, name, completed, createdAt) VALUES (?, ?, ?, ?)');
          for (const t of tasks) {
            stmt.run(t.id, t.name, t.completed ? 1 : 0, t.createdAt);
          }
          console.log(`Migrated ${tasks.length} tasks from tasks.json to SQLite at ${DB_PATH}`);
        } else {
          console.log('tasks.json is empty or invalid; starting with empty database.');
        }
      } catch (err) {
        console.error('Failed to migrate from tasks.json:', err);
      }
    } else {
      console.log('No tasks.json found; starting with empty database.');
    }
  }

  db.close();
  // Return a new database instance for app use
  return new Database(DB_PATH);
}

// Initialize database instance
let db;
try {
  db = initDatabase();
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

// Middleware to parse JSON bodies
app.use(express.json());

// Helper: Get all tasks from SQLite
function getTasks() {
  const stmt = db.prepare('SELECT id, name, completed, createdAt FROM tasks ORDER BY completed ASC, createdAt ASC');
  return stmt.all();
}

// Helper: Create a new task in SQLite
function createTask(name) {
  const id = Date.now().toString();
  const createdAt = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO tasks (id, name, completed, createdAt) VALUES (?, ?, ?, ?)');
  const result = stmt.run(id, name, 0, createdAt);
  return { id, name, completed: false, createdAt };
}

// Helper: Update task completion in SQLite
function updateTaskCompleted(id, completed) {
  const stmt = db.prepare('UPDATE tasks SET completed = ? WHERE id = ?');
  const result = stmt.run(completed ? 1 : 0, id);
  return result.changes > 0;
}

// Helper: Delete task from SQLite
function deleteTask(id) {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// GET /tasks - Lấy danh sách task
app.get('/tasks', (req, res) => {
  const tasks = getTasks();
  res.json(tasks);
});

// POST /tasks - Tạo task mới
app.post('/tasks', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Task name is required' });
  }

  const newTask = createTask(name.trim());
  res.status(201).json(newTask);
});

// PATCH /tasks/:id - Đổi trạng thái hoàn thành
app.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;

  const task = getTaskById(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const success = updateTaskCompleted(id, !task.completed);
  if (!success) {
    return res.status(500).json({ error: 'Failed to update task' });
  }

  const updatedTask = getTaskById(id);
  res.json(updatedTask);
});

// Helper: Get a single task by ID from SQLite
function getTaskById(id) {
  const stmt = db.prepare('SELECT id, name, completed, createdAt FROM tasks WHERE id = ?');
  return stmt.get(id);
}

// DELETE /tasks/:id - Xóa task
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;

  const success = deleteTask(id);
  if (!success) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task deleted' });
});

// Serve static HTML frontend
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(PORT, () => {
  console.log(`Task Manager V3 running at http://localhost:${PORT}`);
});