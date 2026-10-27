# V2 — Client–Server Application Report

## A. Trạng thái ban đầu

### Công nghệ và framework
- **Backend**: Node.js + Express (v5.3.0)
- **Frontend**: HTML5 / Vanilla JavaScript (no framework)
- **Data storage**: `tasks.json` file (plain JSON)
- **Port**: 3000

### Cấu trúc kiến trúc V1 thực tế
- **Backend (server.js)**: Một file Express chứa toàn bộ logic CRUD và file I/O
  - `readTasks()`: Đọc từ `tasks.json`, trả `[]` nếu file chưa tồn tại hoặc lỗi
  - `writeTasks(tasks)`: Ghi vào `tasks.json`
  - APIs: GET /tasks, POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id
  - Serves 정적 files từ thư mục `public/`
- **Frontend (public/index.html)**: HTML/JS gọi REST APIs thông qua `fetch()`
  - Tự động `loadTasks()` khi trang khởi động
  - Gọi API sau mỗi create/toggle/delete operation
  - Cập nhật UI cục bộ sau mỗi operation

### Những phần được tái sử dụng
- Toàn bộ backend (server.js) không cần thay đổi - đã cung cấp đủ API CRUD
- File `tasks.json` là nguồn dữ liệu dùng chung đã có sẵn
- Cấu trúc frontend cơ bản (input, list, buttons) được giữ lại

### Vấn đề phát hiện trước khi sửa
- V1 chỉ cập nhật UI cục bộ sau mỗi operation - thay đổi không lan tỏa giữa clients
- Không có cơ chế polling/sync giữa các client
- Cần thêm frontend polling để client B có thể thấy thay đổi từ client A

---

## B. Thiết kế V2

### Sơ đồ kiến trúc Client–Server

```
Client A (Browser)                Backend (Express)                Data Source
  │                                  │                                  │
  │── GET /tasks ─────────────────── │  readTasks()          |          |
  │                                  │  writeTasks()         │          │
  │                                  │                       │tasks.json│
  │── POST /tasks ──────────────── ─→│                       │          │
  │                                  │                       │          │
  │── PATCH /tasks/:id ─────────────→│                       │          │
  │                                  │                       │          │
  │── DELETE /tasks/:id ────────────→│                       │          │
  │                                  │                       │          │
  │── Polling (5s) ──────────────────│                       │          │
  │                                  │                       │          │
  │──────visibilitychange───────────→│                       │          │
```

### Luồng dữ liệu

**1. Tạo task:**
- Client: `fetch('/tasks', {method: 'POST', body: JSON.stringify({name})})`
- Backend: `readTasks()` → add new task → `writeTasks(tasks)` → trả về task mới
- Client: `loadTasks()` (tự động sau POST, hoặc polling sau này)
- Kết quả: Task xuất hiện trong `tasks.json`, client khác nhìn thấy sau khi load tiếp theo

**2. Đọc danh sách:**
- Client: `fetch('/tasks')` (trong `loadTasks()` và polling)
- Backend: đọc `tasks.json`, trả về mảng tasks
- Cả hai client lấy dữ liệu từ cùng một nguồn `tasks.json`

**3. Cập nhật trạng thái:**
- Client: `fetch(`/tasks/${id}`, {method: 'PATCH'})`
- Backend: tìm task, chuyển `completed` flag, `writeTasks(tasks)` → trả về task đã cập nhật
- Client: `loadTasks()` sau khi PATCH thành công
- Kết quả: Trạng thái mới xuất hiện ở cả hai client

**4. Xóa task:**
- Client: `fetch(`/tasks/${id}`, {method: 'DELETE'})`
- Backend: xóa task, `writeTasks(tasks)` → trả về thông báo
- Client: `loadTasks()` sau khi DELETE thành công
- Kết quả: Task bị xóa, client còn lại nhìn thấy danh sách cập nhật

### Cách hai client nhận biết thay đổi
- **Polling cơ bản**: Mỗi 5 seconds, frontend fetch `/tasks` và cập nhật UI
- **Tải lại thủ công**: Gọi `loadTasks()` thủ công hoặc làm mới trang
- Cả hai cơ chế đều đọc từ cùng một `tasks.json` thông qua backend

### Backend bảo đảm dữ liệu lưu vào file JSON dùng chung
- Tất cả các API đọc/write đều tham chiếu cùng một `TASKS_FILE` path
- File nằm trong cùng thư mục `__dirname` của server.js
- Mọi client đều gửi request đến cùng một instance backend
- Dữ liệu được lưu thực tế vào `tasks.json` trên file system

---

## C. Thay đổi mã nguồn

### File sửa tạo: `public/index.html`

**Vai trò**: Cải thiện frontend cho khả năng đa client thông qua polling và đồng bộ tự động.

**Các thay đổi chính:**

1. **Tiêu đề và phong cách**: Đổi title thành "Task Manager V2", cập nhật các thông điệp trạng thái
2. **Thêm polling mechanism**:
   - `startPolling()`: Bắt đầu định kỳ fetch mỗi 5 seconds, hiển thị thông báo "Đang theo dõi cập nhật..."
   - `stopPolling()`: Dừng polling, hiển thị "Đã dừng theo dõi"
   - `clearInterval()` khi page bị `visibilitychange` (user nhắm tab/tắt trình duyệt)
3. **Thêm `loadTasks(fromPolling)`**: Tham số đánh dấu gọi từ polling (hiển thị thông báo sync)
4. **Khởi tự động**: `loadTasks()` + `startPolling()` khi trang tải
5. **Giữ nguyên toàn bộ CRUD**: Tất cả hàm create/toggle/delete vẫn hoạt động như cũ, nhưng gọi `loadTasks(true)` để cho biết đã sync

**Vai trò các thay đổi:**
- Polling cho phép thay đổi từ Client A xuất hiện ở Client B mà không cần manual reload
- Thông báo trạng thái cho thấy ứng dụng đang tự động sync
- Stop polling khi page tắt giúp tiết kiệm tài nguyên
- UI duy trì sự đồng nhất giữa hai client

---

## D. Bằng chứng kiểm thử

### Test 1 — Tạo task từ Client A
- **Thao tác**: Mở server, tạo task "Task A from Client A" qua POST /tasks
- **Kết quả mong đợi**: Client B nhìn thấy task mới
- **Kết quả thực tế**: ✅ Đạt
  - Response: `id=1793072182167, name="Task A from Client A", completed=false`
  - Fetch `/tasks` trả 4 tasks kèm task mới
- **Bằng chứng**: Log powershell và nội dung file JSON

### Test 2 — Cập nhật trạng thái từ Client B
- **Thao tác**: PATCH `/tasks/1793072182167` (toggle completed)
- **Kết quả mong đợi**: Client A nhìn thấy trạng thái completed=true
- **Kết quả thực tế**: ✅ Đạt
  - Response: `completed=True`
  - Fetch `/tasks` thấy `Task A from Client A` có `completed=true`
- **Bằng chứng**: Powershell output và nội dung file JSON

### Test 3 — Tạo task từ Client B
- **Thao tác**: POST `/tasks` với name="Task B from Client B"
- **Kết quả mong đợi**: Client A nhìn thấy task "Task B from Client B"
- **Kết quả thực tế**: ✅ Đạt
  - Fetch `/tasks` liệt kê 5 tasks kèm task mới
- **Bằng chứng**: Log test execution

### Test 4 — Xóa task từ Client A
- **Thao tác**: DELETE `/tasks/1793072214870` (xóa Task B from Client B)
- **Kết quả mong đợi**: Client B nhìn thấy task B đã bị xóa
- **Kết quả thực tế**: ✅ Đạt
  - Fetch `/tasks` có 4 tasks, task B không còn
- **Bằng chứng**: Post-delete fetch verification

### Test 5 — Khởi động lại backend
- **Thao tác**: Dừng server, khởi động lại, fetch `/tasks`
- **Kết quả mong đợi**: Các task vẫn còn và trạng thái được khôi phục
- **Kết quả thực tế**: ✅ Đạt
  - Sau restart: 4 tasks vẫn có sẵn, `Task A from Client A` vẫn có `completed=true`
- **Bằng chứng**: `tasks.json` content sau restart, verified trên powershell

### Test 6 — Kiểm tra nguồn dữ liệu
- **Thao tác**: Kiểm tra `tasks.json` sau tạo, cập nhật, xóa
- **Kết quả mong đợi**: File JSON phản ánh đúng dữ liệu cuối cùng
- **Kết quả thực tế**: ✅ Đạt
  - File chứa 4 tasks với metadata đúng (id, name, completed, createdAt)
  - Backend là thành phần duy nhất quản lý file này
- **Bằng chứng**: `(Get-Content -Path ... -Raw)` output

### Test 7 — Kiểm tra lỗi
- **Thao tác**: PATCH `/tasks/999999` (task không tồn tại)
- **Kết quả mong đợi**: Backend trả lỗi phù hợp chứ không báo thành công giả
- **Kết quả thực tế**: ✅ Đạt
  - Response: `{"error":"Task not found"}` kèm status code không phải 2xx
  - Frontend catch block hiển thị "Lỗi khi cập nhật task"
- **Bằng chứng**: Powershell error output và frontend behavior

---

## E. Giới hạn kiến trúc

Câu trả lời cho các câu hỏi:

1. **Dữ liệu hiện nằm ở đâu?**
   - `tasks.json` nằm trong thư mục `D:\study\school\CNPM\Tuan_7 architec\code\` (cùng backend server.js)
   - Backend là thành phần duy nhất đọc/ghi file này

2. **Nếu backend ngừng hoạt động, client còn thực hiện được chức năng nào?**
   - Khán không: Client chỉ có thể xem dữ liệu đã cache/local nếu có
   - Không thể tạo task mới (POST /tasks thất bại)
   - Không thể toggle/delete tồn tại (API không phản hồi)
   - Có thể xem danh sách cache nếu client đã load trước khi backend chết
   - ⚠️ Hạn chế: V2 phụ thuộc heavily vào backend availability

3. **Vì sao hai client hiện nhìn thấy cùng dữ liệu?**
   - Cả hai client gửi request đến cùng một backend instance
   - Backend dùng chung `tasks.json` làm nguồn duy nhất
   - Polling cho phép thay đổi lan truyền từ server đến cả hai client

4. **Những hạn chế nào còn tồn tại khi nhiều client cùng ghi dữ liệu?**
   - **Race condition**: Nếu hai client tạo task cùng lúc, có thể mất cập nhật do read-modify-write không atomic
   - **Không có conflicto resolution**: Ghi đè đơn giản nhất, không có 3-way merge
   - **Không có offline support**: Client offline không sync được khi quay lại
   - **Không có realtime**: Chỉ polling 5s một lần, không có WebSocket/minimal latency
   - ⚠️ These are acceptable for the exercise scope as noted in requirements

---

## F. Chuẩn bị cho V3

*(Chỉ phân tích, không triển khai)*

1. **Chuyển JSON sang SQLite**:
   - Backend cần thay thế `fs.readFileSync/writeFileSync` bằng `sqlite3` hoặcORM
   - Schema: `CREATE TABLE tasks (id TEXT PRIMARY KEY, name TEXT, completed BOOLEAN, createdAt TEXT)`
   - Frontend không cần thay đổi đáng kể vì cùng dùng REST API
   - ⚠️ Lợi ích: Concurrent writes antoanatomic, atomic transactions, queries phức tạp

2. **Đổi giao diện sang Kanban**:
   - Cần tái thiết kế `renderTasks()` hiển thị cards theo cột (To-do, In-progress, Done)
   - Không thay đổi logic backend - chỉ thay đổi UI presentation
   - ⚠️ Giao diện hiện tại đơn giản danh sách chưa phù hợp cho Kanban tanpa thay đổi UX đáng kể

3. **Phụ thuộc vào giao diện hoặc cách lưu trữ**:
   - Logic CRUD hoàn toàn độc lập với giao diện thông qua REST layer
   - Thay đổi backend (JSON→SQLite) không ảnh hưởng đến frontend trừ khi thay đổi API format
   - Thay đổi giao diện không ảnh hưởng đến backend nếu giữ nguyên API contract

---

## Kết luận

### Đã triển khai
- ✅ Backend CRUD APIs hoạt động qua chung `tasks.json`
- ✅ Hai client độc lập share dữ liệu thông qua backend
- ✅ Test 1-7: Tất cả đạt công suất
- ✅ Dữ liệu tồn tại sau backend restart
- ✅ Xử lý lỗi phù hợp

### Đã kiểm thử thành công
- ✅ Test 1: Tạo task từ Client A → Client B nhận biết
- ✅ Test 2: Cập nhật trạng thái từ Client B → Client A nhận biết
- ✅ Test 3: Tạo task từ Client B → Client A nhận biết
- ✅ Test 4: Xóa task từ Client A → Client B xác nhận
- ✅ Test 5: Khởi động lại backend → Dữ liệu vẫn còn
- ✅ Test 6: Nội dung `tasks.json` đúng đắn
- ✅ Test 7: Xử lý lỗi task không tồn tại

### Chưa kiểm thử hoặc chưa hoàn thành
- ⚠️ Race condition khi hai client ghi đồng thời (được chấp nhận trong phạm vi bài tập)
- ⚠️ Hỗ trợ offline/online reconciliation (không trong phạm vi V2)
- ⚠️ WebSocket/realtime synchronization (không yêu cầu cho V2)

### Bảng phân biệt

| Khía Vẫn                                      | Trạng thái       |
|-----------------------------------------------|------------------|
| V2 architecture: Client–Server với chung `tasks.json` | ✅ Đã triển khai |
| CRUD operations qua backend                    | ✅ Đã triển khai |
| Polling tự động 5s giữa các client             | ✅ Đã triển khai |
| Dữ liệu tồn tại sau restart backend            | ✅ Đã kiểm thử |
| Tất cả test scenario (1-7)                    | ✅ Đạt          |
| Giao diện V1 giữ nguyên, chỉ thêm polling     | ✅ Đã sửa đổi   |
| Backend không cần thay đổi                     | ✅ Không thay đổi |