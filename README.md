# Daily Quest 🎮

Quản lý nhiệm vụ hàng ngày được thiết kế như một **game nhập vai (RPG)**: làm nhiệm vụ → nhận XP → lên cấp → mở khóa thành tựu, giữ streak, đổi coin ở cửa hàng. Electron + HTML/CSS/JavaScript **thuần** (không React/Vite/Webpack), chạy **offline**.

> Mặc định giao diện **Dark Neon** theo bộ mockup: HUD game, glassmorphism, gradient, glow vừa phải, cửa sổ frameless với thanh tiêu đề tự vẽ.

---

## 1. Cài đặt & chạy

Yêu cầu: **Node.js 18+** và npm.

```bash
npm install
npm start
```

Lần chạy đầu app hiện **onboarding** (nhập tên, chọn avatar, chọn theme, tùy chọn nạp 8 quest + 6 sự kiện mẫu). Dữ liệu lưu tại thư mục `userData` của Electron (Windows: `%APPDATA%/Daily Quest/daily-quest-data.json`), có **tự backup** mỗi lần ghi.

Chạy ở chế độ dev (mở DevTools):

```bash
npm run dev
```

---

## 2. Build file .exe (electron-builder)

```bash
npm run build        # theo cấu hình trong package.json (NSIS + Portable, x64)
# hoặc:
npm run build:win
```

Kết quả nằm trong thư mục `dist/`:
- **Installer** (`.exe` NSIS): cài đặt, tạo shortcut Desktop.
- **Portable** (`.exe`): chạy ngay không cần cài.

Icon ứng dụng được **sinh tự động lúc build/run** (không cần file `.ico`), nên repo gọn và chạy được ngay.

---

## 3. Import / Export JSON

Trong app:
- **Nhiệm vụ → Import JSON** hoặc **Cài đặt → Dữ liệu → Nhập**: chọn file `.json` *hoặc* dán trực tiếp. Bấm **Kiểm tra & xem trước** để validate (báo lỗi theo từng trường, ví dụ `quests[2].difficulty phải là easy|normal|hard|epic`), chọn **Merge** (thêm mới, bỏ trùng id) hoặc **Replace**, rồi **Áp dụng**.
- Nút **Tải file mẫu** nạp nội dung từ `examples/`.
- **Xuất**: toàn bộ hoặc từng phần (quests / schedule) ra file.
- **Backup / Restore**: danh sách bản sao lưu tự động, khôi phục 1 click.

Có sẵn file mẫu:
- [`examples/quests.sample.json`](examples/quests.sample.json)
- [`examples/schedule.sample.json`](examples/schedule.sample.json)

### Schema quest (tối giản — chỉ `id`,`title` bắt buộc)
```json
{ "version": 2, "quests": [
  { "id": "q_001", "title": "Tập thể dục 30 phút", "type": "daily",
    "category": "health", "difficulty": "normal", "xp": 30, "coin": 10,
    "repeat": { "mode": "weekdays", "days": [1,2,3,4,5] }, "deadline": "21:00",
    "subtasks": ["Khởi động","Tập chính","Giãn cơ"], "tags": ["sức khỏe"], "priority": "high" },
  { "id": "q_009", "title": "Nộp chuyên đề cuối kỳ", "type": "one-time", "category": "study",
    "difficulty": "epic", "xp": 120, "coin": 40, "deadline": "23:59",
    "dueDate": "30/10/2026", "priority": "urgent" }
] }
```
- `deadline`: giờ trong ngày (`HH:MM`). `dueDate`: **ngày đến hạn** — chấp nhận `DD/MM/YYYY` **hoặc** `YYYY-MM-DD` (lưu nội bộ dạng ISO, hiển thị `DD/MM/YYYY`, quá hạn tô đỏ).
### Schema schedule
```json
{ "version": 2, "schedule": [
  { "id": "s_001", "title": "Học tiếng Anh", "start": "19:00", "end": "20:00",
    "days": [1,2,3,4,5], "category": "study", "linkedQuestId": "q_002", "reminderMinutes": 10 },
  { "id": "s_007", "title": "Lớp Toán", "start": "18:00", "end": "19:30", "category": "study",
    "startDate": "2026-10-05", "endDate": "2026-10-31",
    "repeat": { "freq": "weekly", "interval": 1, "byWeekdays": [2,4] } },
  { "id": "s_009", "title": "Họp lớp", "start": "19:00", "end": "20:30", "category": "social",
    "dates": ["2026-10-12", "2026-10-26"] }
] }
```
- `type`: `daily` / `weekly` / `one-time` / `side` (chấp nhận alias `once`).
- `days`: **0 = Chủ nhật … 6 = Thứ bảy** (khớp `getDay()` của JS).
- **Ngày tháng & lặp lại (kiểu Google Calendar)** — tất cả đều *tùy chọn*, để trống thì hành xử như cũ (lặp hàng tuần theo `days` mãi mãi):
  - `startDate` / `endDate` (`YYYY-MM-DD`): khoảng áp dụng (= DTSTART / UNTIL). Ví dụ một **lớp học cả tháng**.
  - `repeat`: `{ freq: 'none'|'daily'|'weekly'|'monthly', interval, byWeekdays, byMonthDays }`.
  - `dates`: mảng **ngày cụ thể** (mỗi phần tử `YYYY-MM-DD`) — ghi đè luật lặp (vd ngày thi, họp bất định kỳ).
- Trường thiếu sẽ tự đổ giá trị mặc định hợp lý.

---

## 4. Tính năng chính

- **XP & Level** (công thức `100·level^1.35`), lên cấp có flash + confetti + âm thanh + popup **LEVEL UP!**, danh hiệu tự đổi (Newbie → Adventurer → Hero → Legend…).
- **Độ khó** Easy/Normal/Hard/Epic (màu + XP/coin riêng), **Gold/Coin** + **cửa hàng tự định nghĩa**.
- **Streak** (icon lửa, mốc 3/7/30/100, **Streak Freeze** giữ chuỗi).
- **24 thành tựu** (First Blood, Early Bird, Night Owl, Combo x5, Perfect Day…), toast + âm thanh khi mở.
- **Combo** (thanh minh + bonus XP), **Boss Quest** ngẫu nhiên mỗi ngày (x2 XP).
- **Nhiệm vụ**: thêm/sửa/xóa/hoàn thành/hoàn tác, subtasks, tags, deadline, lặp (ngày/N ngày/thứ), tìm kiếm, lọc, sắp xếp, **kéo thả**.
- **To-do nhanh** (Enter để thêm, thăng cấp thành Quest), **Lịch trình** timeline (Ngày/Tuần, đường "bây giờ", đếm ngược, liên kết quest).
- **Thống kê**: bar 7 ngày, heatmap 12 tuần, ring tiến độ, theo category (tự vẽ bằng canvas/DOM).
- **Pomodoro/Focus** gắn quest, **Notification** desktop, **system tray**, **command palette**, **Nhật ký + mood**, **Daily Report**, **Đa ngôn ngữ VI/EN**, **4 theme + accent tùy chỉnh**, **phím tắt**, **undo/redo**.

### Phím tắt
| Phím | Chức năng |
|---|---|
| `Ctrl+N` | Thêm quest mới |
| `Ctrl+K` | Command palette |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Hoàn tác / Làm lại |
| `Space` | Tick quest đang chọn (trang Nhiệm vụ) |
| `↑ / ↓` | Di chuyển lựa chọn quest |
| `1 … 9` | Chuyển trang |
| `Ctrl+T` | Thêm to-do nhanh |

---

## 5. Kiến trúc

```
daily-quest/
├─ package.json          # electron + electron-builder (không runtime dep)
├─ main.js               # window frameless, protocol dquest://, tray, IPC, lưu atomic+backup, sinh icon
├─ preload.js            # contextBridge -> window.api (khan han)
├─ src/
│  ├─ index.html         # titlebar + sidebar + header + view + overlay
│  ├─ styles/            # tokens · base · components · themes · pages
│  └─ js/
│     ├─ app.js          # bootstrap + phim tat + palette + scheduler + report
│     ├─ store.js        # state + pub/sub + persist(debounce) + undo/redo + migrate
│     ├─ constants.js    # category/difficulty/24 achievements/titles/messages/defaults
│     ├─ icons.js        # bo SVG inline thong nhat
│     ├─ router.js       # registry + dieu huong trang
│     ├─ gamification.js # xp/level/streak/combo/achievements
│     ├─ selectors.js    # ham truy van state (pure)
│     ├─ scheduler.js    # doi ngay, boss, nhan nhac
│     ├─ importer.js     # validate + normalize + merge/replace JSON
│     ├─ importDialog.js # hop import (chon file / dan / preview)
│     ├─ questForm.js    # hop them/sua quest
│     ├─ components.js   # pill/quest card/header + hoi phu game + keo tha
│     ├─ ui.js           # toast/modal/confirm/confetti/levelup/combo/palette
│     ├─ audio.js        # SFX Web Audio (khong can mp3)
│     ├─ charts.js       # bar canvas + heatmap + ring
│     ├─ theme.js        # ap dung theme/accent/reduced-motion
│     ├─ focus.js        # pomodoro FAB
│     ├─ i18n.js         # VI/EN
│     ├─ utils.js        # ngay gio local, dinh dang, DOM
│     └─ pages/          # dashboard, quests, todo, schedule, stats, achievements, shop, journal, settings, onboarding
└─ examples/             # quests.sample.json · schedule.sample.json
```

**Bảo mật**: `contextIsolation: true`, `nodeIntegration: false`, renderer chỉ nói chuyện qua `window.api`. Ghi file **atomic** (ghi `.tmp` → `rename`), **tự backup** trước khi đè, **tự khôi phục** từ backup mới nhất nếu file chính hỏng.

---

## 6. Ghi chú

- App 100% offline; âm thanh tổng hợp bằng Web Audio, icon là SVG inline, font dùng system stack hỗ trợ tiếng Việt đầy đủ.
- "Ngày chơi" tính theo **giờ địa phương** và mốc **Giờ bắt đầu ngày mới** (mặc định 04:00) trong Cài đặt — người thức khuya không mất streak.
- Reset dữ liệu yêu cầu xác nhận **2 bước**.

---

## 7. Dành cho AI
Cần mở rộng chức năng (đặc biệt **Lịch trình**)? Đọc [`AI_README.md`](AI_README.md) — tài liệu onboarding cho trợ lý AI: kiến trúc, luồng state, mô hình dữ liệu sự kiện, và công thức từng bước để thêm tính năng lịch trình.
