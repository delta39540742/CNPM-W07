const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Helper: Read tasks from file
function readTasks() {
  try {
    if (!fs.existsSync(TASKS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

// Helper: Write tasks to file
function writeTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error writing tasks file:', error);
    throw error;
  }
}

// GET /tasks - Lấy danh sách task
app.get('/tasks', (req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

// POST /tasks - Tạo task mới
app.post('/tasks', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Task name is required' });
  }

  const tasks = readTasks();
  const newTask = {
    id: Date.now().toString(),
    name: name.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

// PATCH /tasks/:id - Đổi trạng thái hoàn thành
app.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;

  let tasks = readTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[taskIndex].completed = !tasks[taskIndex].completed;
  writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

// DELETE /tasks/:id - Xóa task
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;

  let tasks = readTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deleted = tasks.splice(taskIndex, 1);
  writeTasks(tasks);
  res.json({ message: 'Task deleted', task: deleted[0] });
});

// Serve static HTML frontend
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(PORT, () => {
  console.log(`Task Manager V1 running at http://localhost:${PORT}`);
});