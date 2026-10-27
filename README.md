How to Run
============

cd D:\study\school\CNPM\Tuan_7\architec\code
npm install     # (already installed, express)
npm start       # Server runs at http://localhost:3000

V2 — Multi-Client Instructions
------------------------------

After starting the server (npm start), open two separate browser windows/tabs:

1. Open Client A: http://localhost:3000
2. Open Client B: http://localhost:3000 (different window/tab)

Both clients share the same backend and data source (tasks.json).

### Tested Scenarios

**Test 1 — Create task from Client A**
- Client A types a task name and clicks "Thêm task"
- Client B should see the new task appear after the polling interval (≈5s) or after manually refreshing

**Test 2 — Update status from Client B**
- Client B toggles the "completed" checkbox on a task
- Client A should see the updated status after the polling interval or after refreshing

**Test 3 — Create task from Client B**
- Client B creates a new task
- Client A should see the new task after polling/refresh

**Test 4 — Delete task from Client A**
- Client A deletes a task
- Client B should see the task removed after polling/refresh

**Test 5 — Restart backend**
- Stop the backend (Ctrl+C), then restart (npm start)
- Open the application; all previously created tasks and their states should persist

**Test 6 — Check tasks.json**
- The file `tasks.json` in the backend directory reflects all create/update/delete operations
- The backend is the sole manager of this file

**Test 7 — Error handling**
- Creating a task with empty name shows error
- Toggling/Deleting non-existent task shows appropriate error message

### How Polling Works (V2)

- The frontend automatically starts polling the backend every 5 seconds after page load
- Each poll fetches the current task list from the backend and updates the UI
- A status indicator "Đang theo dõi cập nhật..." appears when polling is active
- Polling stops automatically when the browser tab is hidden/switched
- Manual page refresh also loads the latest data from the backend

### Notes

- The backend (server.js) was not modified for V2 — it already provided the required CRUD APIs and single `tasks.json` data source
- The frontend (public/index.html) was updated with polling mechanism, status indicators, and visibility change handling
- Both clients connect to the same backend instance at http://localhost:3000
- Data persistence is guaranteed by `tasks.json` on the file system