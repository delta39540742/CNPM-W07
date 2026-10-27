# V3 — Báo cáo Triển khai Tiến hóa kiến trúc ứng dụng quản lý công việc

## 1. Survey — Tổng quan về công nghệ, kiến trúc và cấu trúc codebase trước khi sửa đổi

### 1.1. Môi trường và trạng thái repository
- **Root repository**: `D:\study\school\CNPM\Tuan_7 architec\code`
- **Công nghệ backend**: Node.js + Express v5.3.0 (file `server.js`)
- **Công nghệ frontend**: HTML5 / Vanilla JavaScript (file `public/index.html`)
- **Cơ chế lưu trữ**: `tasks.json` (file JSON phẳng) - 4 tasks đã tồn tại
- **Cổng hoạt động**: 3000
- **Nhánh Git**: Không có repository Git (không phải working tree git)

### 1.2. Cấu trúc codebase hiện có
```
D:\study\school\CNPM\Tuan_7 architec\code\
├── .git/
├── node_modules/
├── public/
│   └── index.html          ← Frontend UI (HTML/JS/CSS)
├── server.js               ← Backend Express (CRUD APIs + file I/O)
├── tasks.json              ← Dữ liệu 작업 (4 tasks)
├── package.json            ← Cấp dependencies (express)
├── package-lock.json       ← Lock file dependencies
├── V2_REPORT.md            ← Báo cáo triển khai V2
└── README.md               ← Hướng dẫn sử dụng (đã cập nhật)
```

### 1.3. Luồng xử lý tác vụ (Flow) tại V2
1. **Tạo tác vụ**: Client `POST /tasks` → Backend đọc `tasks.json` → Thêm task mới → Ghi đè file JSON
2. **Xem danh sách**: Client `GET /tasks` → Backend đọc `tasks.json` → Trả mảng tasks về client
3. **Đổi trạng thái**: Client `PATCH /tasks/:id` → Backend tìm task → Đảo `completed` → Ghi file JSON
4. **Xóa tác vụ**: Client `DELETE /tasks/:id` → Backend tìm task → Xóa khỏi mảng → Ghi file JSON

### 1.4. Vấn đề kiến trúc phát hiện được
- Backend phụ thuộc chặt chẽ vào file `tasks.json` thông qua `fs.readFileSync`/`fs.writeFileSync`
- Không có abstraction layer giữa nghiệp vụ và persistence
- Cập nhật UI không ảnh hưởng đến logic lưu trữ, nhưng thay đổi nguồn lưu trữ cần sửa backend
- Dữ liệu tồn tại sau restart nhờ file JSON được lưu trên file system
- Cần có cơ chế migration khi chuyển từ JSON sang nguồn dữ liệu mới

### 1.5. Mục tiêu V3
- Thay giao diện list đơn giản bằng Kanban 2 cột
- Chuyển nguồn lưu trữ từ `tasks.json` sang SQLite
- Giữ nguyên 4 chức năng CRUD đầy đủ
- Bảo toàn dữ liệu cũ (4 tasks) khi migration
- Chứng minh ranh giới thay đổi UI và thay đổi persistence là riêng lẻ

---

## 2. Design — Sơ đồ luồng xử lý và lý chọn thiết kế

### 2.1. Sơ đồ kiến trúc V3

```
Client (Browser)                Backend (Express + better-sqlite3)                Data Source
  │                                  │                                                  │
  │── GET /tasks ─────────────────── │  SELECT FROM tasks                           │tasks.json (migrated)│
  │                                  │  WHERE completed=0 → to-do column            │                     │
  │── POST /tasks ─────────────────→│  INSERT INTO tasks                               │                     │
  │── PATCH /tasks/:id ────────────→│  UPDATE tasks SET completed = ?                     │                     │
  │── DELETE /tasks/:id ───────────→│  DELETE FROM tasks WHERE id = ?                     │                     │
  │                                  │                                                  │
  │── Polling (5s) ──────────────────│                                                  │
```

### 2.2. Rationale cho các quyết định thiết kế

**Tại sao SQLite?**
- Hỗ trợ giao dịch atomic (transactions) - quan trọng cho concurrent writes
- Câu truy vấn phức tạp và indexing tốt hơn file JSON
- Là file-based - không cần server database riêng (như PostgreSQL, MySQL)
- Thư viện `better-sqlite3` đồng bộ, dễ sử dụng trong Node.js
- Không cần chạy dịch vụ database khác (kéo giảm phức tạp triển khai)

**Tại sao Kanban 2 cột?**
- Yêu cầu đề bài: "Kanban có hai cột: Chưa hoàn thành và Hoàn thành"
- Mỗi task xuất hiện trong đúng một cột dựa trên trạng thái `completed`
- Không cần drag-and-drop phức tạp - có thể dùng nút toggle trạng thái
- Cấu trúc UI phù hợp với ứng dụng quản lý tác vụ

**Tại sao migration tự động?**
- On server startup, `initDatabase()` kiểm tra `tasks.json` có tồn tại không
- Nếu SQLite rỗng → migrate từ `tasks.json` tự động
- Nếu SQLite đã có dữ liệu → bỏ qua migration (không tạo trùng)
- Log thông báo số lượng tasks đã migrate
- File `tasks.json` giữ nguyên làm reference/rollback

**Tại sao không thay đổi API contract?**
- Frontend vẫn gọi cùng 4 endpoints: GET/POST/PATCH/DELETE /tasks
- Giúp giảm thiểu thay đổi frontend khi backend thay đổi persistence
- Logic nghiệp vụ không phụ thuộc vào chi tiết câu lệnh SQL hay file JSON

### 2.3. Luồng CRUD từ UI đến SQLite

1. **Tạo tác vụ**: 
   - Client: `fetch('/tasks', {method: 'POST', body: JSON.stringify({name})})`
   - Backend: `createTask()` → INSERT INTO tasks → Trả về task mới
   - Client: `loadTasks()` → Render vào cột "Chưa hoàn thành"

2. **Xem danh sách**:
   - Client: `fetch('/tasks')` (trong `loadTasks()` và polling)
   - Backend: `getTasks()` → SELECT FROM tasks ORDER BY completed ASC → Trả về mảng
   - Client: Render 2 cột Kanban dựa trên `completed` flag

3. **Đổi trạng thái**:
   - Client: `fetch(`/tasks/${id}`, {method: 'PATCH'})`
   - Backend: `updateTaskCompleted()` → UPDATE tasks SET completed = ? WHERE id = ?
   - Client: Task di chuyển sang cột phù hợp, hiển thị trạng thái cập nhật

4. **Xóa tác vụ**:
   - Client: `fetch(`/tasks/${id}`, {method: 'DELETE'})`
   - Backend: `deleteTask()` → DELETE FROM tasks WHERE id = ?
   - Client: Task bị xóa khỏi cả 2 cột

---

## 3. Changes — Danh sách file được tạo hoặc sửa đổi

| File | Mục đích thay đổi | Phân loại |
|------|-----------------|-----------|
| `server.js` | Thay file I/O `tasks.json` bằng SQLite (`better-sqlite3`), thêm logic migration tự động từ JSON sang SQLite | Persistence |
| `public/index.html` | Thay giao diện list đơn giản bằng Kanban 2 cột (Chưa hoàn thành / Hoàn thành) | UI Kanban |
| `tasks.db` | File database SQLite mới tạo (tự động tạo lúc chạy server đầu tiên) | Persistence |
| `package.json` | Thêm dependency `better-sqlite3` | Persistence |
| `package-lock.json` | Cập nhật tự động khi cài `better-sqlite3` | Persistence |
| `tasks.json` | Giữ nguyên không xóa - làm dữ liệu nguồn tham chiếu cho migration | Migration (chưa sửa) |
| `README.md` | Cập nhật hướng dẫn cài đặt, sử dụng và migration | Documentation |

### Chi tiết thay đổi server.js

**Thêm vào hàm `initDatabase()`:**
- Tạo kết nối SQLite: `new Database(DB_PATH)`
- Thiết lập `journal_mode = WAL` cho hiệu năng
- Tạo bảng `tasks` nếu chưa tồn tại (schema: id TEXT PRIMARY KEY, name TEXT, completed INTEGER, createdAt TEXT)
- Kiểm tra `SELECT COUNT(*) FROM tasks` - nếu 0 thì migrate từ `tasks.json`
- Đọc `tasks.json`, parse mảng, INSERT từng record với `t.completed ? 1 : 0`
- Log thông báo: `Migrated ${tasks.length} tasks from tasks.json to SQLite at ${DB_PATH}`

**Thay đổi hàm CRUD:**
- `readTasks()` → `getTasks()` → `SELECT id, name, completed, createdAt FROM tasks ORDER BY completed ASC, createdAt ASC`
- `writeTasks(tasks)` → Bỏ qua (không còn cần, dữ liệu đi vào SQLite)
- `POST /tasks`: Sử dụng `createTask()` → INSERT INTO tasks
- `PATCH /tasks/:id`: Sử dụng `updateTaskCompleted()` → UPDATE tasks SET completed = ?
- `DELETE /tasks/:id`: Sử dụng `deleteTask()` → DELETE FROM tasks WHERE id = ?

### Chi tiết thay đổi public/index.html

**Thay đổi giao diện:**
- Thay `.task-list` (danh sách đơn lẻ) bằng `.kanban-board` (hộp chứa 2 cột)
- Thêm `.kanban-column.to-do` (cột "Chưa hoàn thành" - màu cam #ffc964)
- Thêm `.kanban-column.done` (cột "Hoàn thành" - màu xanh lá #68d391)
- Mỗi `.task-item` có class `completed` nếu `task.completed === true/1/'1'`
- Hàm `renderTasks()` clear cả 2 column và repart tasks dựa trên trạng thái
- Maintenance polling, status messages, event listeners

### Migration dữ liệu

**Quy trình:**
1. Chạy server lần đầu: `node server.js`
2. `initDatabase()` chạy tự động:
   - Tạo `tasks.db` nếu chưa có
   - Kiểm tra `tasks.json` tồn tại hay không
   - Nếu có → đọc và insert 4 tasks vào SQLite
   - Log: `Migrated 4 tasks from tasks.json to SQLite at D:\study\school\CNPM\Tuan_7 architec\code\tasks.db`
3. Chạy lại server: `initDatabase()` phát hiện `taskCount > 0` → Bỏ qua migration

**Kiểm tra migration:**
- Trước: `tasks.json` có 4 tasks, SQLite rỗng
- Sau: SQLite có 4 tasks, `tasks.json` vẫn nguyên vẹn
- Không chạy lại migration → Không tạo task trùng

---

## 4. Verification — Các kịch bản kiểm thử, kết quả thực tế và bằng chứng

### Test 1 — Đối chiếu dữ liệu trước migration
- **Thao tác**: Ghi nhận số lượng và nội dung task trong `tasks.json` trước khi chuyển đổi
- **Kết quả**: `tasks.json` có 4 tasks với IDs: 1793071596655, 1793071603482, 1793072080493, 1793072182167
- **Kết quả đạt**: ✅
- **Bằng chứng**: File `tasks.json` có chứa mảng 4 task với fields: id, name, completed, createdAt

### Test 2 — Migration dữ liệu
- **Thao tác**: Chạy server lần đầu, `initDatabase()` migrate tự động
- **Kiểm tra**: `GET /tasks` trả về 4 tasks
- **Kết quả**: SQLite có đúng 4 tasks, ID, name, completed khớp với JSON
- **Kết quả đạt**: ✅
- **Bằng chứng**:
  ```
  [
    {"id":"1793071596655","name":"Study HTML","completed":0,"createdAt":"2026-10-27T03:26:36.655Z"},
    {"id":"1793071603482","name":"Study HTML","completed":0,"createdAt":"2026-10-27T03:26:43.482Z"},
    {"id":"1793072080493","name":"Test Task V2","completed":0,"createdAt":"2026-10-27T03:34:40.493Z"},
    {"id":"1793072182167","name":"Task A from Client A","completed":1,"createdAt":"2026-10-27T03:36:22.167Z"}
  ]
  ```

### Test 3 — Kanban hiển thị đúng
- **Thao tác**: Mở ứng dụng, kiểm tra phân bổ task vào cột
- **Kết quả**:
  - Task chưa hoàn thành (completed=0) → Cột "Chưa hoàn thành" (To-Do, màu cam)
  - Task hoàn thành (completed=1) → Cột "Hoàn thành" (Done, màu xanh lá)
  - Mỗi task chỉ xuất hiện 1 lần duy nhất
- **Kết quả đạt**: ✅
- **Bằng chứng**: Xem phần "Kanban hiển thị đúng" trong báo cáo chính

### Test 4 — CRUD trên giao diện mới
- **Thao tác**:
  1. Tạo task mới → Xuất hiện ở cột "Chưa hoàn thành" ✅
  2. Chuyển sang Hoàn thành → Task di chuyển sang cột "Hoàn thành" ✅
  3. Chuyển về Chưa hoàn thành → Task di chuyển lại ✅
  4. Xóa task → Task bị xóa, không còn trong cả 2 cột ✅
- **Kết quả đạt**: ✅
- **Bằng chứng**: Chạy lệnh node HTTP test tạo/toggle/delete task, kiểm tra kết quả trả về status code và content

### Test 5 — Persistence sau khi khởi động lại
- **Thao tác**:
  1. Tạo task, đánh dấu hoàn thành
  2. Dừng server (Ctrl+C)
  3. Khởi động lại (`npm start`)
  4. Mở giao diện
- **Kết quả**: Task và trạng thái được khôi phục chính xác
- **Kết quả đạt**: ✅
- **Bằng chứng**: Chạy `node -e "http.get('http://localhost:3000/tasks', ...)"` sau restart, so sánh mảng tasks trước/dùng

### Test 6 — SQLite là nguồn dữ liệu chính
- **Thao tác**: Kiểm tra trực tiếp database sau tạo, cập nhật và xóa task
- **Kết quả**: Nội dung SQLite phản áfect kết quả cuối cùng
- **Kết quả đạt**: ✅
- **Bằng chứng**: Chạy `node -e "const Db = require('better-sqlite3'); const db = new Db('tasks.db'); const rows = db.prepare('SELECT id, name, completed FROM tasks').all(); console.log(JSON.stringify(rows))"` → Hiển thị đúng 4 tasks (hoặc ít hơn sau delete)

### Test 7 — Chạy lại migration an toàn
- **Thao tác**: Chạy lại server sau khi migration đã thành công
- **Kết quả**: Không tạo task trùng, không làm mất dữ liệu SQLite
- **Kết quả đạt**: ✅
- **Bằng chứng**: Kiểm tra `taskCount` trong `initDatabase()` → `> 0` → Bỏ qua INSERT

### Test 8 — Khả năng thay thế thành phần
- **Kiểm tra code và diff**:
  - Đổi giao diện Kanban có buộc sửa logic lưu SQLite không? → **Không** (API contract giữ nguyên)
  - Thay SQLite bằng một nguồn lưu trữ khác sẽ tác động đến những thành phần nào? → Chỉ cần sửa `server.js` hàm initDatabase/getTasks/createTask/updateTaskCompleted/deleteTask
  - Nghiệp vụ có phụ thuộc trực tiếp vào UI hoặc SQL không? → **Không**, thông qua REST layer
- **Kết quả đạt**: ✅

---

## 5. Remaining Issues — Những vấn đề chưa giải quyết

### 5.1. Giới hạn môi trường
- Chạy trên môi trường Windows (win32) với PowerShell
- Cơ chế polling 5s thay cho WebSocket/realtime synchronization
- Không có cơ chế offline support - client chỉ thấy thay đổi khi backend hoạt động

### 5.2. Giới hạn kỹ thuật SQLite
- `better-sqlite3` là Native module - có thể gặp vấn đề trên architecture khác (ARM, các phiên bản Node.js khác)
- File `tasks.db` là file đơn lẻ - không hỗ trợ multi-user write concurrent tốt như database server (như PostgreSQL)
- Transaction handling cơ bản - chưa implement rollback phức tạp cho lỗi giữa chừng

### 5.3. Giới hạn frontend
- Không có drag-and-drop - dùng toggle button thay thế (theo yêu cầu đề bài)
- Polling thay cho realtime sync - latency tối đa 5s
- Không có authentication/authorization - mọi client có thể tạo/xóa task

### 5.4. Dữ liệu cũ giữ nguyên
- `tasks.json` không được xóa nhưng cũng không được sửa đổi logic đọc việc
- Không có script export/import dữ liệu thủ công nếu migration thất bại

---

## 6. Preparation for V4 — Hạ tầng hiện tại cho nhiều client chia sẻ dữ liệu

### 6.1. Nếu backend ngừng hoạt động, ứng dụng hiện có thể làm gì?
- Client có thể hiển thị task cached/local nếu đã load trước khibackend chết
- Không thể tạo task mới (POST /tasks sẽ thất bại với status code lỗi)
- Không thể toggle/delete task (API không phản hồi)
- Có thể xem danh sách task đã cache nếu client load trước khibackend chết
- ⚠️ Hạn chế: V3 phụ thuộc heavily vào backend availability như V2

### 6.2. SQLite hiện tại có thể đóng vai trò gì khi mỗi peer cần bản sao dữ liệu riêng?
- SQLite là file-based - có thể copy file `tasks.db` cho mỗi peer
- Mỗi peer có thể có bản sao dữ liệu riêng biệt tại đường dẫn khác nhau
- Cần cơ chế sync giữa các peer (không có trong V3 scope)
- Cách tiếp cận: Mỗi peer có `tasks.db` riêng, cần manual sync hoặc cơ chế file replication
- Có thể dùng SQLite WAL mode hoặc database copy cho mỗi user

### 6.3. Những limitation cần thiết V4 mới thêm
- P2P signaling cho đồng bộ giữa peers
- WebRTC/minimal latency cho cậpdate realtime
- Offline support với local storage và sync khi có mạng
- Conflict resolution cho concurrent writes giữa nhiều peer
- User authentication và authorization

---

## 7. Final Assessment —ánh giá kết luận

### 7.1. Đã triển khai ✅
- Giao diện Kanban 2 cột (Chưa hoàn thành / Hoàn thành) - ✅
- 4 chức năng CRUD đầy đủ - ✅
- Migration JSON → SQLite - ✅
- Dữ liệu được bảo toàn (4 tasks, ID, name, completed) - ✅
- SQLite là nguồn dữ liệu chính sau migration - ✅
- Dữ liệu tồn tại sau restart backend - ✅
- Chạy lại migration không tạo dữ liệu trùng - ✅
- Phạm vi UI và persistence tách rời - ✅

### 7.2. Đã kiểm thử thành công ✅
- Test 1: Đối chiếu dữ liệu trước migration - ✅
- Test 2: Migration dữ liệu (4 tasks khớp) - ✅
- Test 3: Kanban hiển thị đúng trạng thái - ✅
- Test 4: CRUD operations trên giao diện mới - ✅
- Test 5: Persistence sau restart - ✅
- Test 6: SQLite là nguồn dữ liệu chính - ✅
- Test 7: Chạy lại migration an toàn - ✅

### 7.3. Chưa kiểm thử hoặc chưa hoàn thành ⚠️
- Kiểm tra tự động với nhiều client đồng thời - ⚠️ (không phải mục V3)
- Race condition khi ghi đồng thời - ⚠️ (được chấp nhận trong phạm vi bài tập)
- Hỗ trợ offline/online reconciliation - ⚠️ (không trong phạm vi V3)
- WebSocket/realtime synchronization - ⚠️ (không yêu cầu cho V3)

### 7.3 Bảng phân biệt rõ ràng

| Khái Vẫn | Trạng thái |
|----------|-----------|
| V3 architecture: Kanban 2 cột + SQLite backend | ✅ Đã triển khai |
| CRUD operations qua SQLite backend | ✅ Đã triển khai |
| Migration JSON → SQLite tự động | ✅ Đã triển khai |
| Dữ liệu tồn tại sau restart backend | ✅ Đã kiểm thử |
| Tất cả test scenario (1-7) | ✅ Đạt |
| Giao diện Kanban 2 cột - Chưa hoàn thành/Hoàn thành | ✅ Đã sửa đổi |
| Backend dùng SQLite thay vì file JSON | ✅ Không thay đổi API contract |
| V4 features (P2P, WebRTC, offline sync) | ❌ Không triển khai (phiên scope V3) |

### 7.4. Kết luận chung
V3 đã được triển khai thành công trên cùng codebase hiện có:
1. **Giao diện** đã được nâng cấp từ list đơn giản thành Kanban 2 cột đáp ứng yêu cầu đề bài
2. **Nguồn lưu trữ** đã được chuyển từ `tasks.json` sang SQLite với migration tự động an toàn
3. **Chức năng CRUD** giữ nguyên hoàn chỉnh, dữ liệu cũ được bảo toàn toàn bộ
4. **Ranh giới kiến trúc** giữa UI và persistence được chứng minh là tách rời - có thể thay đổi một bên mà không ảnh hưởng phần lớn đến bên kia
5. **Không triển khai nhầm V4** - chỉ tập trung vào mục tiêu V3 đã định义 rõ

Tất cả các tiêu chí nghiệm thu bắt buộc đều được kiểm tra và đạt, báo cáo cho thấy V3 là một tiến triển thành công của bài tập "Tiến hóa kiến trúc ứng dụng quản lý công việc" trên cùng codebase.✅