# AI_README.md — Hướng dẫn cho AI khi mở rộng Daily Quest (trọng tâm: LỊCH TRÌNH)

> File này dành cho **trợ lý AI** (ở phiên sau). Mục đích: giúp bạn (AI) định vị nhanh mã nguồn và **thêm/bớt chức năng cho phần Lịch trình (Schedule)** mà không phải đọc lại toàn bộ dự án. Người dùng sẽ nói kiểu: "thêm tính năng X cho lịch trình".

## 0. Run / kiểm tra nhanh
- Chạy: `npm install` rồi `npm start` (dev mở DevTools: `npm run dev`).
- Syntax check file ESM: `node --check <file>.mjs` (phải là `.mjs` vì renderer dùng ES module). `main.js`/`preload.js` là CommonJS → `node --check main.js`.
- Không có dependency runtime nào ngoài Electron. Mọi thứ offline.

## 1. Kiến trúc tổng quan (renderer)
- **1 cửa sổ chính** (`src/index.html` + `src/js/app.js`) và **1 cửa sổ mini "hiệp sĩ"** (`src/pet.html` + `src/js/pet.js`) — cả hai nạp qua custom protocol `dquest://app/...` (khai báo ở `main.js`).
- Renderer **không** đụng `fs`. Tất cả IO qua `window.api` (định nghĩa ở `preload.js`, xử lý ở `main.js`). **Tên kênh IPC phải khớp giữa `preload.js` và `main.js`**; sự kiện main→renderer mới phải thêm vào `LISTEN_CHANNELS` trong `preload.js`.
- `contextIsolation: true`, `nodeIntegration: false`.

### Luồng state (QUAN TRỌNG)
- State duy nhất ở `src/js/store.js` (singleton `store`). Nguồn sự thật là **cửa sổ chính**; cửa sổ pet chỉ nhận gửi tiếp qua IPC.
- Mọi thay đổi: `store.update((draft) => { ...mutate draft... }, { undoable: bool, reason: string })`.
  - `draft` là **bản deep-clone** của state; mutate thoải mái; xong nó set state + notify + persist (debounce 600ms) + đẩy vào undo stack (nếu `undoable`).
  - **KHÔNG gọi `store.update` lồng nhau** bên trong một recipe. Muốn làm hành động phụ (vd hoàn thành quest liên kết), làm **sau** khi `store.update` trả về. Xem ví dụ `toggleEventDone` ở `schedule.js`.
- Subscribe: `store.subscribe(fn)` — `app.js` dùng để vẽ lại header + `router.notifyState` + đẩy to-do/theme sang pet.
- Trang tự đăng ký với `router` (`src/js/router.js`), render vào `#view`. Trang có `render/onShow/onHide/onState`.

### Đồng hồ / thời gian thực
- `app.js` chạy `setInterval(..., 1000)` → gọi `scheduler.tick()` và `document.dispatchEvent(new CustomEvent('clock:tick'))`.
- Trang Lịch trình (và Dashboard) subscribe `clock:tick` trong `onShow` để cập nhật **đường "bây giờ"** + đếm ngược.

### "Ngày chơi" (game-day)
- Boundary theo `settings.dayStartHour` (mặc định 04:00), KHÔNG dùng UTC. Helper: `gameDayKey(date, dayStartHour)` ở `utils.js`; `store.todayKey()`.
- Định dạng khóa ngày: `'YYYY-MM-DD'` (`dateKey()`).

## 2. LỊCH TRÌNH — mọi thứ nằm ở đâu

### 2.1 Mô hình dữ liệu 1 sự kiện (`state.schedule[i]`) — hỗ trợ kiểu Google Calendar
```js
{
  id: 's_001',            // string, bắt buộc (importer tự sinh nếu thiếu)
  title: 'Học tiếng Anh', // string, bắt buộc
  start: '19:00',         // 'HH:MM'
  end:   '20:00',         // 'HH:MM'
  days:  [1,2,3,4,5],     // 0=CN,1=T2,...,6=T7 (khớp JS getDay()). all=[0..6], weekdays=[1..5]
  category: 'study',      // 1 trong CATEGORIES (xem constants.js)
  linkedQuestId: 'q_002', // '' hoặc id quest — hoàn thành sự kiện sẽ hoàn thành quest
  note: 'Ôn unit 5',      // string
  reminderMinutes: 10,    // 0 = không nhắc

  // --- NGÀY THÁNG + LUẬT LẶP (mới, tùy chọn; để trống = hành xử cũ: lặp hàng tuần theo `days` mãi mãi) ---
  startDate: '2026-10-05',// 'YYYY-MM-DD' ngày đầu tiên áp dụng (= DTSTART). Bỏ trống = không giới hạn dưới
  endDate:   '2026-10-31',// 'YYYY-MM-DD' ngày cuối cùng (= UNTIL). Bỏ trống = mãi mãi
  dates:     ['2026-10-12','2026-10-26'], // danh sách NGÀY CỤ THỂ (= RDATE). Nếu có sẽ GHI ĐÈ mọi luật lặp
  repeat: { freq: 'none'|'daily'|'weekly'|'monthly', interval: 1, byWeekdays: [2,4], byMonthDays: [5] },
}
```
- **Logic xuất hiện nằm ở `src/js/recurrence.js`** (module thuần, test được bằng Node): `eventOccursOnDate(event, dateKey)` trả về true nếu sự kiện diễn ra ngày đó. `selectors.eventsOnDay()` đã gọi hàm này. Các hàm khác: `findNextEvent(state, fromDayKey, now, horizon)` (sự kiện kế tiếp vượt qua nhiều ngày), `occurrencesInRange`, `describeRepeat(event, lang)` (chuỗi mô tả cho UI), `isValidDateStr`.
- **Quy tắc**: `dates[]` thắng → nếu có thì chỉ hiện đúng các ngày đó. Ngược lại xét `repeat.freq` + `interval` trong khoảng `startDate..endDate`. `freq` mặc định suy ra: có `days` → weekly, không → none. `weekly` dùng `days` (hoặc `repeat.byWeekdays`); `monthly` dùng `repeat.byMonthDays` (mặc định lấy ngày của `startDate`).
- **Tương thích ngược**: event cũ chỉ có `days` vẫn hoạt động y hệt (lặp hàng tuần vô hạn).
- **Trạng thái "đã xong" của sự kiện KHÔNG nằm trên object event**, mà theo từng game-day: `state.dayRecords[dateKey].events[eventId] = true`. Xem `eventDone()` / `toggleEventDone()` trong `schedule.js`.

### 2.2 File liên quan tới lịch trình
| File | Vai trò |
|---|---|
| `src/js/pages/schedule.js` | **TOÀN BỘ trang Lịch trình**: 3 chế độ Ngày/Tuần/Tháng, timeline, form thêm/sửa/xóa sự kiện, card bên phải, đường "bây giờ". **Sửa tính năng lịch trình chủ yếu ở đây.** |
| `src/js/selectors.js` | `eventsOnDay(state,dateKey)` (lọc theo `days`), `scheduleStatus(state,dateKey,now)` (tìm `happening`/`upcoming`), `weekdayOf`, `findQuest`, `isQuestCompletedOn`. |
| `src/js/scheduler.js` | `checkReminders()` (Notification trước `reminderMinutes`), đổi ngày, boss. |
| `src/js/recurrence.js` | **Luật xuất hiện sự kiện** (kiểu Google Calendar): `eventOccursOnDate`, `findNextEvent`, `occurrencesInRange`, `describeRepeat`, `isValidDateStr`. Thuần logic, không DOM. |
| `src/js/importer.js` | `normalizeEvent(raw,i)` + `validateSchedule(text)` + `mergeById(existing,incoming,'merge'|'replace')`. |
| `src/js/importDialog.js` | Hộp Import (chọn file/dán JSON/preview/merge|replace) — dùng chung cho quests & schedule. |
| `src/js/constants.js` | `CATEGORIES`, `SAMPLE_SCHEDULE`, `DAY_PRESETS`. |
| `src/js/utils.js` | `timeToMinutes`, `minutesToTime`, `dateKey`, `parseDateKey`, `addDaysKey`, `weekdayOf` (bên selectors), `weekdayLabel`, `formatDateLong`, `secondsToClock`, `humanDuration`. |
| `src/js/i18n.js` | Tra `sched.*`, `dash.*` trong `DICTIONARY`. |
| `src/styles/pages.css` | Class: `.sched`, `.timeline`, `.tl-hour`, `.tl-event`, `.tl-now`, `.week-grid`, `.week-chip`, `.cal*` (tháng), `.day-pill`, `.now-card`. |
| `examples/schedule.sample.json` | File mẫu import. |

### 2.3 Các hàm chính trong `schedule.js` (đọc trước khi sửa)
- `const state = { mode:'day'|'week'|'month', dateKey }` — trạng thái cục bộ của trang.
- `todayKey()`, `selKey()` (= `state.dateKey || todayKey()`), `toMin(hhmm)`, `catColorVar(cat)`.
- `HOUR_H = 60` → **1 phút = 1px** trong timeline. `layout(events)` xếp chồng sang "lane" để không đè nhau.
- Render: `dayPickerHtml()` (hàng chọn T2..CN), `timelineHtml()` (Ngày), `weekHtml()` (Tuần), `monthHtml()` (Tháng), `sideHtml()` (card bên phải: Đang diễn ra / Tiếp theo / Nhắc nhớ).
- `rerender()` — chọn HTML theo `state.mode` và cập nhật `#sched-main` + `#sched-side`.
- `updateLive()` — gọi mỗi `clock:tick` để dời `.tl-now` + cập nhật đếm ngược.
- `openEventForm(ev|null)` — modal thêm/sửa: title, start, end, category, reminderMinutes, **bộ chọn `days`** (7 nút), **`linkedQuestId`** (select quest), note. Lưu bằng `store.update(..., {undoable:true})`.
- `eventDone(id,dk)` / `toggleEventDone(id,dk)` — bật/tat xong sự kiện trong `dayRecords[dk].events`; **nếu có `linkedQuestId` thì gọi `completeQuest()` SAU recipe** (không lồng `store.update`).
- `schedulePage` object: `render(view)` gắn các listener (seg chuyển chế độ, day-picker, click `.tl-event`/`.week-chip`/`.cal-cell`/`[data-mnav]`/`[data-evdone]`), `onState()` → `rerender()`, `onShow/onHide()` bật/tắt listener `clock:tick`.

## 3. Công thức thêm tính năng cho Lịch trình

### 3.1 Thêm 1 TRƯỜNG mới cho sự kiện (vd `location`, `color`, `attendees`)
1. **Mặc định + import**: trong `importer.js → normalizeEvent()` thêm field (kiểm tra kiểu + giá trị mặc định). Thêm vào `examples/schedule.sample.json` nếu muốn mẫu có nó.
2. **Form**: trong `schedule.js → openEventForm()` thêm `<input>` vào `body.innerHTML`, và ghi field đó vào object `data` trong `[data-save]`.
3. **Hiển thị**: cập nhật ở `timelineHtml()` block, `weekHtml()` chip, `monthHtml()` (nếu cần), `sideHtml()` (card đang diễn ra). Nhớ `escapeHtml(value)`.
4. **Không cần migrate**: field thừa tự nằm trong object event và được `store` lưu/đọc nguyên vẹn.

### 3.2 Thêm 1 CHẾ ĐỘ XEM mới (vd "Agenda" danh sách)
1. Thêm nút `<button data-mode="agenda">` vào `#sched-mode` trong `render()`.
2. Viết `agendaHtml()` trả về chuỗi HTML.
3. Trong `rerender()`, mở rộng nhánh: `state.mode === 'agenda' ? agendaHtml() : ...`.
4. Trong `subtitle()` xử lý nhãn cho mode mới. Xử lý click (mở form) trong listener `view.addEventListener('click')` đã có.

### 3.3 Đổi khoảng giờ / chiều cao timeline
- `HOUR_H` (px mỗi giờ) trong `schedule.js` + `--hour-h` trong `.timeline` (pages.css) phải khớp.
- Vòng `for (let h=0; h<24; h++)` trong `timelineHtml()` quyết định khung giờ; đổi thành 5→24 v.v. Nhớ `tl.scrollTop` trong `rerender()`.

### 3.4 Luật lặp / ngày tháng (đã hỗ trợ sẵn)
- **Đã làm**: `recurrence.js` + `eventsOnDay()` xử lý `dates[]`, `startDate/endDate`, `repeat.freq` (none/daily/weekly/monthly) + `interval`. Import (`importer.normalizeEvent`) và form (`schedule.js → openEventForm`) đều đã có các trường này. Schema xem mục 2.1 và `examples/schedule.sample.json` (có ví dụ "lịch học cả tháng", "ôn thi hàng ngày", "ngày cụ thể", "hàng tháng").
- **Cần thêm kiểu mới** (vd "ngày thứ 2 của tháng", "mỗi 2 tuần", EXDATE loại trừ ngày):
  1. Thêm field vào event + parse/validate trong `importer.normalizeEvent`.
  2. Mở rộng `eventOccursOnDate()` trong `recurrence.js` (đây là chỗ duy nhất quyết định "có diễn ra không").
  3. Thêm control tương ứng vào `openEventForm` trong `schedule.js`.
  4. Chạy test nhanh bằng cách import `recurrence.js` trong 1 file `.mjs` rồi assert (nó thuần logic nên chạy được bằng Node).

### 3.5 Kéo-thả để tạo / dời sự kiện trên timeline
- Gắn `pointerdown/move/up` lên `.tl-grid`. Đổi `offsetY → phút → 'HH:MM'` (`minutesToTime`). `store.update` để sửa `start/end` của event (undoable). Sau đó `rerender()`.
- Tham khảo cách drag-reorder quest đã làm trong `components.js → attachQuestDelegation` (HTML5 draggable) để giữ cùng phong cách.

### 3.6 Nhắc lịch trình (Notification)
- `scheduler.js → checkReminders(now, today)` duyệt `eventsOnDay` và gửi `window.api.notify(title, body)` khi `0 <= (start - now) <= reminderMinutes`. Chống lặp bằng `notified` Set (khóa `ev:${date}:${id}:${start}`). Tôn trọng `settings.notifications`.

### 3.7 Liên kết sự kiện ↔ quest
- Field `linkedQuestId`. Khi tick xong sự kiện → `toggleEventDone` gọi `completeQuest(linkedQuestId)` (bên ngoài recipe). Quest hoàn thành sẽ cộng XP/coin/streak qua `gamification.js`.

## 4. Quy ước phải giữ
- **Comment bằng tiếng Việt** ở logic chính (theo phong cách hiện tại).
- Mọi chuỗi do người dùng nhập khi chen vào `innerHTML` phải qua `escapeHtml()` (utils.js) — chống XSS.
- **Ngày tháng**: dùng `parseFlexibleDate()` (utils.js) để đọc `DD/MM/YYYY` **hoặc** `YYYY-MM-DD` → chuẩn hóa về ISO `YYYY-MM-DD` để lưu; `formatDateShort()` để hiển thị `DD/MM/YYYY`. Quest có `dueDate`; schedule có `startDate`/`endDate`/`dates`/`repeat` (xem `recurrence.js`).
- Màu category = CSS var (`CATEGORIES[id].color` / `catColorVar`); không hardcode màu.
- Text đa ngôn ngữ: thêm key vào `i18n.js DICTIONARY` (`{ vi, en }`) rồi dùng `t('sched.x')`; `i18n.lang` để rẽ nhánh.
- Ghi file **atomic** đã xử lý ở `main.js` (ghi `.tmp` → `rename`, tự backup vào `userData/backups`, tự khôi phục khi hỏng) — đừng tự ghi file ở renderer.
- Thêm kênh IPC mới: đủ 3 chỗ — `main.js` (`ipcMain.handle/on`), `preload.js` (hàm gọi + nếu main→renderer thì thêm vào `LISTEN_CHANNELS`), và nơi dùng `window.api.*`.

## 5. Mini "hiệp sĩ" (pet) — nếu liên quan
- `src/pet.html` + `src/js/pet.js` + `src/styles/pet.css`. Cửa sổ trong suốt, always-on-top (`main.js → createPet/resizePet`).
- Kéo bằng tọa độ **màn hình** (`pet:getBounds` + `pet:moveTo`), bấm = chém + bật panel to-do.
- Panel to-do **đồng bộ theme** qua kênh `theme:state` (app gửi `appearanceOf(settings)`; pet `applyAppearance`). To-do đồng bộ qua `todos:state` / `pet:action`. **Cửa sổ chính là nơi duy nhất ghi file.**

## 6. Checklist khi AI sửa xong
1. `node --check` các file đã sửa (ESM dùng bản `.mjs`).
2. Kiểm tra import/export khớp (tên hàm `import { ... } from` có thật sự `export`).
3. `npm start` → mở đúng trang bị sửa, test case biên (JSON sai, ngày cuối tháng, sự kiện chồng nhau, đổi theme khi đang mở pet).
4. Không để `store.update` lồng nhau; không bỏ sót `escapeHtml`.

---
_Tóm lại: muốn thêm tính năng Lịch trình → hầu hết ở `src/js/pages/schedule.js`, dữ liệu ở `state.schedule` + `state.dayRecords[day].events`, lọc/ngày ở `selectors.js`, nhắc ở `scheduler.js`, import ở `importer.js`, kiểu ở `pages.css`._
