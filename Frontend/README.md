# Central Kitchen – Store App

Ứng dụng quản lý bếp trung tâm: đăng nhập theo vai trò (Admin / Cửa hàng franchise), tạo đơn hàng, quản lý sản phẩm & danh mục. Front-end React, kết nối API backend qua biến môi trường.

## Cấu trúc thư mục

```
src/
├── components/       # UI dùng chung
│   ├── common/       # StatCard, OrderCard, ...
│   └── icons/        # Icon SVG
├── constants/        # Cấu hình trạng thái, menu, role
├── pages/            # Trang theo vai trò
│   └── Login/        # Trang đăng nhập
├── services/         # Gọi API (auth, users, products, orders)
├── styles/           # CSS global (ck-app.css)
├── App.js            # Routing theo role
└── index.js
```

## Scripts

| Lệnh            | Mô tả                                                       |
| --------------- | ----------------------------------------------------------- |
| `npm start`     | Chạy dev tại [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Build production                                            |
| `npm test`      | Chạy test                                                   |

## Kết nối Backend

- Tạo file `.env` (copy từ `.env.example`) và đặt:

  ```
  REACT_APP_API_URL=http://localhost:8081
  ```

- **Auth (bắt buộc làm trước):**

  - `POST /api/auth/login` — body `{ username, password }` → trả về `{ token, username, role }`. App lưu token và gửi `Authorization: Bearer <token>` cho mọi request sau.
  - `POST /api/auth/register` — đăng ký tài khoản.
  - `PUT /api/auth/update-profile` — cập nhật hồ sơ (fullName).

- **Product & Kitchen:**  
  `GET /api/products`, `POST /api/products`, `POST /api/categories`, `POST /api/ingredients`, `POST /api/inventory/import`, `POST /api/kitchen/cook`.

## Công nghệ

- React 19
- Create React App
- Không dùng thư viện UI (CSS custom)
