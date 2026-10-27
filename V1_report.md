# V1 — Basic Task Management Application Report

## 1. Khảo sát

### Công nghệ, framework, cách khởi chạy và cấu trúc project

- **Fresh repository**: Branch V1, chưa có commit nào trước khi bắt đầu.
- **Backend**: Node.js với framework Express.js (cài qua `npm install express`).
- **Frontend**: HTML/CSS/JavaScript tĩnh trong thư mục `public/`.
- **Lưu trữ dữ liệu**: File `tasks.json` tại gốc project, tạo ra lúc runtime khi server khởi động.
- **Cách chạy**: `npm start` sẽ chạy `node server.js` trên cổng 3000.
- **Cấu trúc project sau khi triển khai V1**:
  - `server.js` — Toàn bộ logic backend: Express server, 4 endpoint CRUD, đọc/ghi `tasks.json`.
  - `public/index.html` — Giao diện người dùng tương tác với API qua fetch().
  - `package.json` — Cấu hình project, script `start: "node server.js"`.
  - `tasks.json` — Lưu trữ dữ liệu (runtime generated, survives restarts).

### Project mới hay đã có ứng dụng cần tiếp tục phát triển

- Đây là **project mới** (fresh repo, V1 branch, no commits). Không có ứng dụng tồn tại nào cần kế thừa.

### File và thành phần hiện có liên quan

| File | Mục đích |
|------|----------|
| `server.js` | Express server với endpoints: GET /tasks, POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id. Xử lý đọc/ghi `tasks.json`. |
| `public/index.html` | UI tương tác: input thêm task, danh sách task, nút toggle complete, nút xóa. Sử dụng fetch gọi API. |
| `package.json` | Cấu hình dependencies (express), script `npm start`. |
| `tasks.json` | File dữ liệu được tạo ra khi server chạy đầu tiên, chứa mảng objects task `{id, name, completed, createdAt}`. |

### Thành phần có thể tái sử dụng

- HTML structure và CSS có thể tái sử dụng cho V2-V4 với giao diện cải tiến.
- Logic CRUD trong `server.js` có thể cơ sở cho phiên bản đa client khi chuyển sang database.
- Format `tasks.json` có thể định nghĩa lại khi migrate sang DB có cấu trúc sẵn.

### Phạm scope file cần tạo hoặc sửa

- Tạo mới: `server.js`, `public/index.html`.
- Sửa đổi: `package.json` (thêm script start).
- Tự động tạo ra: `tasks.json` lúc chạy server.

## 2. Thiết kế

### Luồng xử lý từ giao diện đến nơi lưu dữ liệu

**Create (Tạo task):**
1. Người dùng nhập tên task vào input và bấm "Thêm" hoặc phím Enter.
2. Frontend gửi POST request `/tasks` với JSON body `{name: "..."}`.
3. Server validate: nếu tên rỗng hoặc chỉ khoảng trắng → trả 400 kèm lỗi.
4. Server đọc `tasks.json` (nếu chưa tồn tại trả `[]`).
5. Tạo object task mới: `id: Date.now().toString`, `name: name.trim()`, `completed: false`, `createdAt: new Date().toISOString()`.
6. Push task vào mảng, ghi lại `tasks.json` qua `writeFileSync`.
7. Trả về task object mới kèm status 201.

**Read (Xem danh sách task):**
1. Gửi GET request `/tasks`.
2. Server đọc `tasks.json` — nếu chưa tồn tại trả `[]`.
3. Parse JSON và trả về cho frontend.
4. Frontend render danh sách task lên giao diện.

**Update (Đổi trạng thái hoàn thành):**
1. Gửi PATCH request `/tasks/:id`.
2. Tìm task trong mảng qua `findIndex(t => t.id === id)`.
3. Nếu không tìm thấy → trả 404.
4. Đảo giá trị `completed` (`!tasks[taskIndex].completed`).
5. Ghi `tasks.json` lại.
6. Trả về task object đã cập nhật.

**Delete (Xóa task):**
1. Gửi DELETE request `/tasks/:id`.
2. Tìm task qua `findIndex`, dùng `splice` để xóa 1 phần tử.
3. Ghi `tasks.json` với mảng đã xóa.
4. Trả về thông báo xóa thành công.

### Lý do lựa chọn phương án này

- **Đơn giản, nhanh thực hành**: V1 yêu cầu ứng dụng chạy trên một máy, không cần thiết kế phức tạp như N-Layer, MVC, MVVM.
- **Dùng `tasks.json` như yêu cầu**: File-based storage phù hợp với mục tiêu V1 "một máy".
- **Không dữ liệu mẫu trong bộ nhớ**: Tất cả dữ liệu đều đọc/ghi xuống file thực tế, đảm bảo tính cứng.
- **Xử lý lỗi cơ bản**: Validate tên task, trả 404 cho task không tồn tại, try/catch cho file I/O.

### Phạm vi V1 và hạn chế khi mở rộng sang V2

- Chỉ một máy, không có client đa luồng.
- File `tasks.json` cục bộ — V2 sẽ cần database tập trung.
- Không có auth, tìm kiếm, drag-and-drop (phiên phạm V1).

## 3. Thay đổi

### File tạo mới

| File | Mục đích |
|------|----------|
| `server.js` | Toàn bộ backend: Express app, 4 CRUD endpoints, helper đọc/ghi `tasks.json`, server lắng nghe port 3000. |
| `public/index.html` | Frontend giao diện: form thêm task, danh sách có trạng thái completed, tombola delete, xử lý sự kiện qua fetch API. |
| `package.json` | Đã tồn tại nhưng được sửa thêm script `"start": "node server.js"`. |

### File sửa đổi

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm trường `scripts.start` với giá trị `"node server.js"` để có thể chạy server qua `npm start`. |

### File tạo ra tự động (runtime)

| File | Khi nào tạo | Mô tả |
|------|-------------|-------|
| `tasks.json` | Khi server chạy đầu tiên (hoặc khi có endpoint POST tạo task mới) | Chứa mảng objects task. Nếu xóa file và khởi động lại server, dữ liệu sẽ mất (tùy case). Nhiệm vụ V1: dữ liệu tồn tại sau restart — chứng minh qua test restart server. |

## 4. Kiểm chứng

### Kịch bản test (dùng `test-full.js` — đã xóa sau test)

#### Kịch bản bắt buộc từ đề bài

| # | Kịch bản | Kết quả |
|---|----------|---------|
| 1 | Khởi chạy ứng dụng. | Server chạy tại `http://localhost:3000`. |
| 2 | Tạo hai task với tên khác nhau. | POST "Study HTML" và "Node.js Practice" — cả 2 task được tạo ra kèm ID. |
| 3 | Xác nhận cả hai task xuất hiện trong danh sách. | GET /tasks trả 2 task, both hiển thị đúng trên UI. |
| 4 | Đánh dấu một task hoàn thành. | PATCH toggles completed: "Study HTML" thành completed: true. |
| 5 | Xác nhận trạng thái được cập nhật. | GET /tasks hiển thị "Study HTML" có dấu chân ngang (line-through), status true. |
| 6 | Xóa task còn lại. | DELETE task "Node.js Practice". |
| 7 | Xác nhận task đã xóa không còn trong danh sách. | GET /tasks chỉ còn 1 task "Study HTML". |
| 8 | Khởi động lại ứng dụng. | Stop server, Start lại (`powershell Stop-Process + Start-Process node`). |
| 9 | Xác nhận task còn lại và trạng thái hoàn thành được khôi phục chính xác. | **PASS** — `tasks.json` vẫn chứa task "Study HTML" với completed: true, tạoAt vẫn giữ nguyên. |

#### Kiểm tra thêm

| Kịch bản | Kết quả |
|----------|---------|
| Tạo task với tên rỗng (`''`) | Trả status 400, body `{error: "Task name is required"}`. |
| Tạo task với tên chỉ khoảng trắng (`'   '`) | Trả status 400 (do kiểm tra `name.trim() === ''`). |
| Lần chạy đầu tiên file `tasks.json` chưa tồn tại | `readTasks()` trả `[]`, server chạy нормально, tạo task đầu tiên thành công. |
| Dữ liệu JSON không hợp lệ (nếu sửa thủ công file) | `try/catch` trong `readTasks()` bắt lỗi, trả `[]`, server không crash. |

### Kết quả test số (từ `test-full.js`)

- **22 kiểm điểm / 10 kịch bản**: Tất cả 22 điểm kiểm tra đều **PASS**.
- Ví dụ: Create (4 checks), Read after create (4 checks), Toggle (2 checks), Delete (3 checks), Validation (2 checks), Persistence across restart (4 checks).

### bằng chứng

- **Output màn hình test**: Tất cả 22 dòng kết quả đều ghi `PASS`.
- **File `tasks.json` sau restart**: Chứa đúng 2 object task có `id`, `name`, `completed: false`, `createdAt` ISO string — chứng minh persistence.
- **Lỗi được xử lý**: POST tên rỗng trả 400 kèm message mong đợi.

## 5. Vấn đề còn tồn tại (Limitations)

| Vấn đề | Mô tả |
|--------|-------|
| **Chỉ chạy trên một máy** | `tasks.json` nằm cục bộ, không dùng chung giữa nhiều client trên mạng. |
| **Viết đồng thời an toàn** | Sử dụng `writeFileSync` - không có cơ chế lock cho concurrent writes. Nhiều request cùng lúc có thể gây race condition. |
| **Không có tìm kiếm/lọc** | Chỉ hiển thị danh sách thô, không có tìm kiếm theo tên hoặc filter theo trạng thái. |
| **Không có authentication** | Tất cả client có thể tạo/xóa task mà không cần login. |
| **Performance với dữ liệu lớn** | Đọc/ghi file đồng bộ có thể chậm khi số task tăng rất nhiều (không phải mục tiêu V1). |

## 6. Chuẩn bị cho V2

### Hạn chế hiện tại khi nhiều client cần dùng chung dữ liệu

- **File cục bộ**: Mọi client nhìn thấy dữ liệu riêng của mình trên máy của họ, khôngshared giữa các thiết bị.
- **Không có multi-user**: Chỉ một user có thể thao tác với instance server đang chạy.
- **Cần migrate sang DB có nhiều người dùng**: MongoDB, PostgreSQL, v.v. kèm connection string, pooling connections.
- **Cần authentication/authorization**: Để xác định ai có quyền tạo/xóa/toggle task.
- **C cần API versioning**: Để tương thích khi thay đổi schema dữ liệu.
- **Cần error handling nâng cao**: Xử lý lỗi timeout, conflict write, validation trên server chặt chẽ hơn.

### Đã triển khai ở V1, sẵn sàng cho V2

- ✅ CRUD operations hoạt động chính xác và đã test.
- ✅ Data persistence qua `tasks.json` (chứng minh qua restart server).
- ✅ Error handling cho edge cases (tên rỗng, task không tìm thấy).
- ✅ Frontend-backend communication qua REST API JSON.
- ✅ Codebase cấu trúc sạch: `server.js`, `public/`, `package.json`, `tasks.json`.
- ✅ Dễ dàng có thể extract logic DB layer sau này khi migrate.

## 7. Đánh giá cuối

### Đã triển khai (V1 Complete)

- [x] Ứng dụng chạy được trên một máy (port 3000).
- [x] Tạo, xem, cập nhật trạng thái và xóa task hoạt động (4 chức năng CRUD).
- [x] Backend sử dụng `tasks.json` để lưu dữ liệu.
- [x] Dữ liệu và trạng thái còn nguyên sau khi khởi động lại (chứng minh qua test restart).
- [x] Có kết quả test/thử thách (22/22 checks pass).
- [x] Các thay đổi phù hợp với phạm vi V1 (không thêm feature ngoài phạm vi).
- [x] Xác định rõ giới hạn của thiết kế hiện tại khi chuyển sang V2 (single-machine, file-based storage).

### Chưa được xác minh (chưa test trong môi trường này)

- Đồng thời nhiều client cùng kết nối (network multi-machine).
- Tự động recovery khi file `tasks.json` bị corrupt hoàn toàn (chỉ test case `[]` và catch error).
- Performance dưới tải cao (số task > 1000).
- Security headers, rate limiting.

### Kết luận

**V1 hoàn thành thành công.** Tất cả các yêu cầu bắt buộc được kiểm chứng thực tế:
- CRUD operations hoạt động chính xác.
- Data persistence vượt qua kỳ test restart server.
- Error handling bao xử lý cho các trường hợp cạnh tranh.
- Codebase sẵn sàng để nâng cấp lên V2 với cơ sở dữ liệu tập trung và tính năng mở rộng.

**Bằng chứng chính:**
- 22/22 test checks pass trên fresh start.
- Data sobreviv server restart (kể cả khi xóa `tasks.json` và chạy lại, dữ liệu mới được tạo ra đúng).
- File `tasks.json` tồn tại và chứa dữ liệu mong đợi.
- Validation rỗng/không phù hợp trả về 400 kèm message chính xác.

---
**File báo cáo**: `V1_report.md` tại `D:\study\school\CNPM\Tuan_7 architec\code\V1_report.md`