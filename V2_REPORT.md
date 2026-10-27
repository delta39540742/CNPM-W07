# V2 — Client–Server Application Report

## A. Trạng thái ban đầu
- Công nghệ và framework: Node.js + Express (v5.3.0), HTML5/Vanilla JavaScript frontend, `tasks.json` file storage, Port 3000
- Cấu trúc kiến trúc V1: Backend (server.js) chứa toàn bộ logic CRUD và file I/O; Frontend (public/index.html) gọi REST APIs qua `fetch()`, tự động load tasks khi khởi động
- Phần được tái sử dụng: Toàn bộ backend (server.js) không cần thay đổi; File `tasks.json` là nguồn dữ liệu dùng chung đã có sẵn
- Vấn đề phát hiện: V1 chỉ cập nhật UI cục bộ - thay đổi không lan tỏa giữa clients; Không có cơ chế polling/sync

## B. Thiết kế V2
### Sơ đồ kiến trúc Client–Server
```
Client A                Backend (Express)                Data Source
│                       │                                      │
│── GET /tasks         │  readTasks()                        │tasks.json│
│── POST /tasks        │  writeTasks()                       │          │
│── PATCH /tasks/:id   │                                      │          │
│── DELETE /tasks/:id  │                                      │          │
│── Polling 5s         │                                      │          │
```

### Luồng dữ liệu
1. **Tạo task**: Client POST /tasks → Backend read/write tasks.json → Client loadTasks() → Task xuất hiện
2. **Đọc danh sách**: Client fetch `/tasks` → Backend đọc `tasks.json` → Cả hai client cùng nguồn dữ liệu
3. **Cập nhật trạng thái**: Client PATCH /tasks/:id → Backend toggle completed → Client loadTasks() → Trạng thái mới ở cả hai client
4. **Xóa task**: Client DELETE /tasks/:id → Backend xóa task, writeTasks() → Client loadTasks() → Task bị xóa

### Cách hai client nhận biết thay đổi
- Polling cơ bản: Mỗi 5 seconds fetch `/tasks` và cập nhật UI
- Tải lại thủ công: Gọi `loadTasks()` hoặc làm mới trang
- Cả hai cơ chế đều đọc từ cùng `tasks.json` thông qua backend

### Backend bảo đảm dữ liệu lưu vào file JSON dùng chung
- Tất cả API đều tham chiếu cùng `TASKS_FILE` path (cùng `__dirname` của server.js)
- File nằm cùng thư mục với server.js
- Mọi client gửi request đến cùng một instance backend

## C. Thay đổi mã nguồn

### File sửa tạo: `public/index.html`
- Thêm polling mechanism (startPolling/stopPolling)
- Thêm polling status indicator
- Thêm visibility change handler
- Thêm `loadTasks(fromPolling)` với tham số đánh dấu
- Khởi tự động: `loadTasks()` + `startPolling()` khi trang load

### File không sửa: `server.js`
- Đã tái sử dụng backend V1 đã có
- Cung cấp đủ API CRUD và quản lý `tasks.json`

## D. Bằng chứng kiểm thử (7/7 test pass)

| Test | Mô tả | Kết quả |
|------|-------|---------|
| Test 1 | Client A tạo task → Client B nhìn thấy | ✅ Đạt |
| Test 2 | Client B toggle trạng thái → Client A xem | ✅ Đạt |
| Test 3 | Client B tạo task → Client A nhận biết | ✅ Đạt |
| Test 4 | Client A xóa task → Client B xác nhận | ✅ Đạt |
| Test 5 | Khởi động lại backend → Dữ liệu vẫn còn | ✅ Đạt |
| Test 6 | Nội dung `tasks.json` đúng đắn | ✅ Đạt |
| Test 7 | Xử lý lỗi (task không tồn tại) | ✅ Đạt |

## E. Giới hạn kiến trúc

1. **Dữ liệu hiện nằm ở đâu?**
   - `tasks.json` trong thư mục backend (`D:\study\school\CNPM\Tuan_7 architec\code\`)
   - Backend là thành phần duy nhất đọc/ghi file này

2. **Nếu backend ngừng hoạt động, client còn thực hiện được chức năng nào?**
   - Không thể tạo task mới (POST /tasks thất bại)
   - Không thể toggle/delete tồn tại (API không phản hồi)
   - Có thể xem danh sách cache nếu client đã load trước khi backend chết
   - ⚠️ Hạn chế: V2 phụ thuộc heavily vào backend availability

3. **Vì sao hai client hiện nhìn thấy cùng dữ liệu?**
   - Cả hai client gửi request đến cùng một backend instance
   - Backend dùng chung `tasks.json` làm nguồn duy nhất
   - Polling cho phép thay đổi lan truyền từ server đến cả hai client

4. **Những hạn chế nào còn tồn tại khi nhiều client cùng ghi dữ liệu?**
   - **Race condition**: Hai client tạo task cùng lúc, có thể mất cập nhật do read-modify-write không atomic
   - **Không có conflito resolution**: Ghi đè đơn giản nhất, không có 3-way merge
   - **Không có offline support**: Client offline không sync được khi quay lại
   - **Không có realtime**: Chỉ polling 5s một lần, không có WebSocket
   - ⚠️ These are acceptable for the exercise scope as noted in requirements

## F. Chuẩn bị cho V3 (Chỉ phân tích, không triển khai)
1. **Chuyển JSON sang SQLite**: Thay `fs.readFileSync/writeFileSync` bằng `sqlite3` hoặc ORM; schema: `CREATE TABLE tasks (id TEXT PRIMARY KEY, name TEXT, completed BOOLEAN, createdAt TEXT)`; Frontend không cần thay đổi đáng kể vì cùng dùng REST API
2. **Đổi giao diện sang Kanban**: Cần tái thiết kế `renderTasks()` hiển thị cards theo cột (To-do, In-progress, Done); Không thay đổi logic backend - chỉ thay đổi UI presentation
3. **Phụ thuộc vào giao diện hoặc cách lưu trữ**: Logic CRUD hoàn toàn độc lập với giao diện thông qua REST layer; Thay đổi backend (JSON→SQLite) không ảnh hưởng đến frontend trừ khi thay đổi API format; Thay đổi giao diện không ảnh hưởng đến backend nếu giữ nguyên API contract

---
### Kết luận

- ✅ V2 architecture: Client–Server với chung `tasks.json` - Đã triển khai
- ✅ CRUD operations qua backend - Đã triển khai
- ✅ Polling tự động 5s giữa các client - Đã triển khai
- ✅ Dữ liệu tồn tại sau restart backend - ✅ Đã kiểm thử
- ✅ Tất cả test scenario (1-7) - ✅ Đạt
- ✅ Giao diện V1 giữ nguyên, chỉ thêm polling - ✅ Đã sửa đổi
- ✅ Backend không cần thay đổi - ✅ Không thay đổi
- ✅ Báo cáo chi tiết lưu tại `V2_REPORT.md`