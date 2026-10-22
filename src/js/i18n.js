/*
 * i18n.js - DA NGON NGU (VI / EN)
 * -------------------------------
 * Tu dien dich + ham t(key, vars). Ngon hien tai doc tu settings (store),
 * nhung khong phu thuoc store -> tranh vong tron import. App set i18n.lang
 * khi khoi dong va khi doi ngon ngu.
 */

const DICTIONARY = {
  // ---- Chung ----
  'app.name': { vi: 'Daily Quest', en: 'Daily Quest' },
  'common.save': { vi: 'Lưu', en: 'Save' },
  'common.cancel': { vi: 'Hủy', en: 'Cancel' },
  'common.delete': { vi: 'Xóa', en: 'Delete' },
  'common.edit': { vi: 'Sửa', en: 'Edit' },
  'common.add': { vi: 'Thêm', en: 'Add' },
  'common.close': { vi: 'Đóng', en: 'Close' },
  'common.confirm': { vi: 'Xác nhận', en: 'Confirm' },
  'common.undo': { vi: 'Hoàn tác', en: 'Undo' },
  'common.redo': { vi: 'Làm lại', en: 'Redo' },
  'common.apply': { vi: 'Áp dụng', en: 'Apply' },
  'common.preview': { vi: 'Xem trước', en: 'Preview' },
  'common.all': { vi: 'Tất cả', en: 'All' },
  'common.done': { vi: 'Xong', en: 'Done' },
  'common.today': { vi: 'Hôm nay', en: 'Today' },
  'common.search': { vi: 'Tìm kiếm', en: 'Search' },
  'common.empty': { vi: 'Trống', en: 'Empty' },
  'common.new': { vi: 'Mới', en: 'New' },
  'common.optional': { vi: 'tùy chọn', en: 'optional' },
  'common.level': { vi: 'Cấp', en: 'Level' },
  'common.xp': { vi: 'XP', en: 'XP' },
  'common.coin': { vi: 'coin', en: 'coins' },
  'common.streak': { vi: 'Chuỗi', en: 'Streak' },
  'common.days': { vi: 'ngày', en: 'days' },
  'common.day': { vi: 'ngày', en: 'day' },
  'common.category': { vi: 'Nhóm', en: 'Category' },
  'common.difficulty': { vi: 'Độ khó', en: 'Difficulty' },
  'common.priority': { vi: 'Ưu tiên', en: 'Priority' },
  'common.tags': { vi: 'Thẻ', en: 'Tags' },
  'common.deadline': { vi: 'Hạn chót', en: 'Deadline' },
  'common.repeat': { vi: 'Lặp lại', en: 'Repeat' },
  'common.subtasks': { vi: 'Việc nhỏ', en: 'Subtasks' },
  'common.description': { vi: 'Mô tả', en: 'Description' },
  'common.title': { vi: 'Tên', en: 'Title' },
  'common.type': { vi: 'Loại', en: 'Type' },

  // ---- Dieu huong ----
  'nav.dashboard': { vi: 'Bảng điều khiển', en: 'Dashboard' },
  'nav.quests': { vi: 'Nhiệm vụ', en: 'Quests' },
  'nav.todo': { vi: 'To-do', en: 'To-do' },
  'nav.schedule': { vi: 'Lịch trình', en: 'Schedule' },
  'nav.stats': { vi: 'Thống kê', en: 'Stats' },
  'nav.achievements': { vi: 'Thành tựu', en: 'Achievements' },
  'nav.shop': { vi: 'Cửa hàng', en: 'Shop' },
  'nav.journal': { vi: 'Nhật ký', en: 'Journal' },
  'nav.settings': { vi: 'Cài đặt', en: 'Settings' },

  // ---- Dashboard ----
  'dash.greeting.morning': { vi: 'Chào buổi sáng', en: 'Good morning' },
  'dash.greeting.midday': { vi: 'Chào buổi trưa', en: 'Good noon' },
  'dash.greeting.afternoon': { vi: 'Chào buổi chiều', en: 'Good afternoon' },
  'dash.greeting.evening': { vi: 'Chào buổi tối', en: 'Good evening' },
  'dash.greeting.lateNight': { vi: 'Chào đêm khuya', en: 'Hello night owl' },
  'dash.progressToday': { vi: 'Tiến độ hôm nay', en: "Today's progress" },
  'dash.questDone': { vi: 'quest', en: 'quests' },
  'dash.perfectHint': { vi: 'Còn {n} quest nữa là Perfect Day', en: '{n} more for a Perfect Day' },
  'dash.allDone': { vi: 'Xuất sắc! Đã xong hết hôm nay', en: 'Amazing! All done today' },
  'dash.boss': { vi: 'BOSS QUEST · x2 XP', en: 'BOSS QUEST · x2 XP' },
  'dash.bossDesc': { vi: 'Đánh bại boss để nhận {xp} XP và {coin} coin.', en: 'Defeat the boss for {xp} XP and {coin} coins.' },
  'dash.bossHp': { vi: 'HP boss còn {n}%', en: 'Boss HP {n}%' },
  'dash.bossReroll': { vi: 'Đổi boss', en: 'Reroll boss' },
  'dash.todayQuests': { vi: 'Quest hôm nay', en: "Today's quests" },
  'dash.nextEvent': { vi: 'Sự kiện tiếp theo', en: 'Next event' },
  'dash.remaining': { vi: 'Còn {t}', en: 'In {t}' },
  'dash.streakCard': { vi: 'Chuỗi {n} ngày', en: '{n}-day streak' },
  'dash.justUnlocked': { vi: 'Vừa mở khóa', en: 'Just unlocked' },
  'dash.noEvent': { vi: 'Hôm nay không có sự kiện', en: 'No events today' },
  'dash.focusNext': { vi: 'Tập trung vào', en: 'Focus on' },
  'dash.calm': { vi: 'THÀNH PHỐ BÌNH YÊN', en: 'CITY AT PEACE' },

  // ---- Anh hung (My Hero Academia) ----
  'hero.rank': { vi: 'Hạng anh hùng', en: 'Hero rank' },
  'hero.style': { vi: 'Phong cách anh hùng', en: 'Hero style' },
  'hero.styleHint': { vi: 'Đổi toàn bộ màu sắc, linh vật, hiệu ứng ra đòn và lời thoại.', en: 'Changes palette, mascot, strike effects and voice lines.' },
  'hero.custom': { vi: 'Tùy chỉnh', en: 'Custom' },
  'hero.customHint': { vi: 'Tự chọn hai màu cho bộ đồ hero của bạn', en: 'Pick your own two hero-suit colors' },
  'hero.fx': { vi: 'Hiệu ứng chiến đấu', en: 'Battle effects' },
  'hero.fxHint': { vi: 'Chớp màn hình, sóng kích, chữ comic khi hoàn thành quest', en: 'Screen flash, shockwaves and comic text on quest completion' },
  'hero.fxTest': { vi: 'Chạy thử đòn SMASH', en: 'Test a SMASH' },
  'hero.rankTest': { vi: 'Thử thẻ LÊN HANG', en: 'Test rank card' },
  'hero.pickTitle': { vi: 'Chọn người đồng hành', en: 'Choose your partner hero' },
  'hero.sayMore': { vi: 'Bấm vào tướng hero để nghe một câu khác', en: 'Tap the hero portrait for another line' },
  'hero.photoTitle': { vi: 'Ảnh anh hùng của bạn', en: 'Your hero artwork' },
  'hero.photoHint': {
    vi: 'Đặt ảnh của bạn vào thư mục cục bộ (png/jpg/webp), đặt tên theo nhân vật: allmight.png, allmight-cheer.png, allmight-skinny.png, villain.png… Ảnh chỉ nằm trên máy bạn, không đi vào file cài đặt. Không có ảnh thì app dùng hình vẽ SVG sẵn có.',
    en: 'Drop your own images (png/jpg/webp) into the local folder, named by character: allmight.png, allmight-cheer.png, allmight-skinny.png, villain.png… They stay on your machine and are never bundled into the build. Without them the built-in SVG art is used.',
  },
  'hero.photoOpen': { vi: 'Mở thư mục ảnh', en: 'Open image folder' },
  'hero.photoReload': { vi: 'Tải lại ảnh', en: 'Reload images' },
  'hero.photoCount': { vi: 'ảnh', en: 'imgs' },
  'hero.photoSvg': { vi: 'SVG', en: 'SVG' },
  'hero.villainLabel': { vi: 'Ác nhân', en: 'Villain' },

  // ---- Quests ----
  'quest.new': { vi: 'Quest mới', en: 'New quest' },
  'quest.edit': { vi: 'Sửa quest', en: 'Edit quest' },
  'quest.search': { vi: 'Tìm quest... (Ctrl+K)', en: 'Search quests... (Ctrl+K)' },
  'quest.import': { vi: 'Import JSON', en: 'Import JSON' },
  'quest.activeCount': { vi: '{n} quest đang hoạt động', en: '{n} active quests' },
  'quest.emptyTitle': { vi: 'Chưa có quest nào', en: 'No quests yet' },
  'quest.emptyMsg': { vi: 'Tạo quest đầu tiên hoặc import JSON để bắt đầu hành trình.', en: 'Create your first quest or import JSON to start your journey.' },
  'quest.complete': { vi: 'Hoàn thành', en: 'Complete' },
  'quest.reopen': { vi: 'Mở lại', en: 'Reopen' },
  'quest.promote': { vi: 'Thăng cấp thành Quest', en: 'Promote to Quest' },
  'quest.filterType': { vi: 'Lọc theo loại', en: 'Filter by type' },
  'quest.sortBy': { vi: 'Sắp xếp', en: 'Sort by' },
  'quest.sort.manual': { vi: 'Thủ công (kéo thả)', en: 'Manual (drag)' },
  'quest.sort.priority': { vi: 'Ưu tiên', en: 'Priority' },
  'quest.sort.deadline': { vi: 'Hạn chót', en: 'Deadline' },
  'quest.sort.xp': { vi: 'XP', en: 'XP' },
  'quest.deleteConfirm': { vi: 'Xóa quest "{name}"?', en: 'Delete quest "{name}"?' },
  'quest.subProgress': { vi: '{a} / {b} hoàn thành', en: '{a} / {b} done' },

  // ---- To-do ----
  'todo.placeholder': { vi: 'Thêm to-do nhanh, Enter để lưu...', en: 'Quick add a to-do, Enter to save...' },
  'todo.emptyTitle': { vi: 'Chưa có to-do', en: 'No to-dos' },
  'todo.emptyMsg': { vi: 'Ghi nhanh việc lặt vặt ở đây. Xong thì được chút XP!', en: 'Jot quick tasks here. Finish them for a little XP!' },
  'todo.promoteHint': { vi: 'Biến thành Quest', en: 'Turn into Quest' },

  // ---- Schedule ----
  'sched.day': { vi: 'Ngày', en: 'Day' },
  'sched.week': { vi: 'Tuần', en: 'Week' },
  'sched.happening': { vi: 'Đang diễn ra', en: 'Happening now' },
  'sched.upNext': { vi: 'Tiếp theo', en: 'Up next' },
  'sched.reminder': { vi: 'Nhắc nhớ', en: 'Reminders' },
  'sched.reminderDesc': { vi: 'Thông báo trước {n} phút mỗi sự kiện. Sự kiện lặp theo ngày trong tuần.', en: 'Notify {n} min before each event. Events repeat by weekday.' },
  'sched.linkedQuest': { vi: 'Liên kết quest: {name}', en: 'Linked quest: {name}' },
  'sched.newEvent': { vi: 'Sự kiện mới', en: 'New event' },
  'sched.emptyTitle': { vi: 'Chưa có lịch trình', en: 'No schedule' },
  'sched.emptyMsg': { vi: 'Thêm khung giờ cho ngày của bạn, hoặc import JSON.', en: 'Add time blocks to your day, or import JSON.' },
  'sched.eventDone': { vi: 'Xong sự kiện', en: 'Complete event' },

  // ---- Stats ----
  'stats.overview': { vi: 'Tổng quan', en: 'Overview' },
  'stats.last7': { vi: '7 ngày gần nhất', en: 'Last 7 days' },
  'stats.heatmap': { vi: 'Nhiệt độ 12 tuần', en: '12-week heatmap' },
  'stats.byCategory': { vi: 'Theo nhóm', en: 'By category' },
  'stats.xpEarned': { vi: 'XP kiếm được', en: 'XP earned' },
  'stats.questsDone': { vi: 'Quest hoàn thành', en: 'Quests done' },
  'stats.perfectDays': { vi: 'Ngày hoàn hảo', en: 'Perfect days' },
  'stats.bestStreak': { vi: 'Chuỗi tốt nhất', en: 'Best streak' },
  'stats.completionRate': { vi: 'Tỉ lệ hoàn thành', en: 'Completion rate' },

  // ---- Achievements ----
  'ach.title': { vi: 'Thành tựu', en: 'Achievements' },
  'ach.unlocked': { vi: 'Đã mở: {a}/{b}', en: 'Unlocked: {a}/{b}' },
  'ach.locked': { vi: 'Chưa mở khóa', en: 'Locked' },
  'ach.progress': { vi: 'Tiến trình', en: 'Progress' },

  // ---- Shop ----
  'shop.title': { vi: 'Cửa hàng phần thưởng', en: 'Reward shop' },
  'shop.yourCoins': { vi: 'Số dư của bạn', en: 'Your balance' },
  'shop.newReward': { vi: 'Thêm phần thưởng', en: 'Add reward' },
  'shop.redeem': { vi: 'Đổi', en: 'Redeem' },
  'shop.redeemed': { vi: 'Đã đổi {n} lần', en: 'Redeemed {n}×' },
  'shop.notEnough': { vi: 'Không đủ coin!', en: 'Not enough coins!' },
  'shop.emptyTitle': { vi: 'Chưa có phần thưởng', en: 'No rewards yet' },
  'shop.emptyMsg': { vi: 'Tạo phần thưởng để tự thưởng cho bản thân sau chuỗi ngày cố gắng.', en: 'Create rewards to treat yourself after hard work.' },
  'shop.redeemConfirm': { vi: 'Đổi "{name}" với {cost} coin?', en: 'Redeem "{name}" for {cost} coins?' },

  // ---- Journal ----
  'journal.title': { vi: 'Nhật ký cuối ngày', en: 'Daily journal' },
  'journal.placeholder': { vi: 'Hôm nay của bạn thế nào? Viết vài dòng nhé...', en: 'How was today? Write a few lines...' },
  'journal.mood': { vi: 'Cảm xúc', en: 'Mood' },
  'journal.save': { vi: 'Lưu nhật ký', en: 'Save entry' },
  'journal.saved': { vi: 'Đã lưu nhật ký {date}', en: 'Saved journal for {date}' },
  'journal.emptyTitle': { vi: 'Chưa có nhật ký', en: 'No entries yet' },
  'journal.emptyMsg': { vi: 'Cuối ngày ghi lại cảm xúc, tích lũy để mở thành tựu.', en: 'Note your feelings at day end to unlock achievements.' },

  // ---- Settings ----
  'set.appearance': { vi: 'Giao diện', en: 'Appearance' },
  'set.theme': { vi: 'Chủ đề', en: 'Theme' },
  'set.accent': { vi: 'Màu nhấn', en: 'Accent color' },
  'set.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'set.gameplay': { vi: 'Vận hành game', en: 'Gameplay' },
  'set.dayStart': { vi: 'Giờ bắt đầu ngày mới', en: 'Day starts at' },
  'set.dayStartHint': { vi: 'Người thức khuya đặt 04:00 để không mất streak.', en: 'Night owls set 04:00 to keep streak.' },
  'set.xpDifficulty': { vi: 'Độ khó XP', en: 'XP difficulty' },
  'set.autoBoss': { vi: 'Tự sinh Boss Quest mỗi ngày', en: 'Auto Boss Quest daily' },
  'set.audio': { vi: 'Âm thanh & Hiệu ứng', en: 'Sound & Effects' },
  'set.sound': { vi: 'Âm thanh', en: 'Sound' },
  'set.volume': { vi: 'Âm lượng', en: 'Volume' },
  'set.reducedMotion': { vi: 'Giảm animation', en: 'Reduce motion' },
  'set.system': { vi: 'Hệ thống', en: 'System' },
  'set.notifications': { vi: 'Thông báo desktop', en: 'Desktop notifications' },
  'set.minimizeToTray': { vi: 'Thu nhỏ xuống khay hệ thống', en: 'Minimize to tray' },
  'set.autoStart': { vi: 'Khởi động cùng Windows', en: 'Start with Windows' },
  'set.data': { vi: 'Dữ liệu', en: 'Data' },
  'set.exportAll': { vi: 'Xuất toàn bộ', en: 'Export all' },
  'set.import': { vi: 'Nhập dữ liệu', en: 'Import data' },
  'set.backup': { vi: 'Backup', en: 'Backup' },
  'set.restore': { vi: 'Khôi phục', en: 'Restore' },
  'set.backups': { vi: 'Các bản sao lưu', en: 'Backups' },
  'set.noBackups': { vi: 'Chưa có bản sao lưu', en: 'No backups yet' },
  'set.reset': { vi: 'Reset toàn bộ dữ liệu', en: 'Reset all data' },
  'set.resetWarn': { vi: 'Hành động này sẽ XÓA SẠCH tiến trình, quest, lịch trình. Không thể hoàn tác.', en: 'This will ERASE all progress, quests and schedule. Cannot be undone.' },
  'set.resetStep1': { vi: 'Bước 1/2: Tôi hiểu và muốn tiếp tục', en: 'Step 1/2: I understand and want to continue' },
  'set.resetStep2': { vi: 'Bước 2/2: Xác nhận xóa vĩnh viễn', en: 'Step 2/2: Confirm permanent delete' },
  'set.shortcuts': { vi: 'Phím tắt', en: 'Keyboard shortcuts' },
  'set.about': { vi: 'Giới thiệu', en: 'About' },

  // ---- Report ----
  'report.title': { vi: 'Tổng kết ngày', en: 'Daily Report' },
  'report.xp': { vi: 'XP hôm nay', en: 'XP today' },
  'report.quests': { vi: 'Quest hoàn thành', en: 'Quests done' },
  'report.vsYesterday': { vi: 'So với hôm qua', en: 'vs yesterday' },
  'report.streak': { vi: 'Chuỗi hiện tại', en: 'Current streak' },
  'report.mood': { vi: 'Cảm xúc hôm nay', en: "Today's mood" },
  'report.cta': { vi: 'Viết nhật ký', en: 'Write journal' },
  'report.later': { vi: 'Để sau', en: 'Later' },

  // ---- Onboarding ----
  'ob.welcome': { vi: 'Chào mừng đến với Daily Quest', en: 'Welcome to Daily Quest' },
  'ob.welcomeSub': { vi: 'Biến mỗi ngày thành một màn game nhập vai.', en: 'Turn every day into a role-playing game.' },
  'ob.name': { vi: 'Bạn tên gì, hỡi anh hùng?', en: 'What is your name, hero?' },
  'ob.namePh': { vi: 'Nhập tên của bạn', en: 'Enter your name' },
  'ob.avatar': { vi: 'Chọn avatar của bạn', en: 'Choose your avatar' },
  'ob.theme': { vi: 'Chọn phong cách giao diện', en: 'Pick your theme' },
  'ob.start': { vi: 'Bắt đầu hành trình', en: 'Start the journey' },
  'ob.next': { vi: 'Tiếp tục', en: 'Continue' },
  'ob.back': { vi: 'Quay lại', en: 'Back' },
  'ob.loadSample': { vi: 'Nạp quest & lịch trình mẫu', en: 'Load sample quests & schedule' },

  // ---- Import ----
  'import.title': { vi: 'Import JSON', en: 'Import JSON' },
  'import.quests': { vi: 'Import Quests JSON', en: 'Import Quests JSON' },
  'import.schedule': { vi: 'Import Schedule JSON', en: 'Import Schedule JSON' },
  'import.pickFile': { vi: 'Chọn file...', en: 'Choose file...' },
  'import.paste': { vi: 'Hoặc dán JSON trực tiếp vào đây', en: 'Or paste JSON directly here' },
  'import.merge': { vi: 'Hợp nhất', en: 'Merge' },
  'import.mergeDesc': { vi: 'Thêm mới, bỏ qua trùng id', en: 'Add new, skip duplicate ids' },
  'import.replace': { vi: 'Thay thế', en: 'Replace' },
  'import.replaceDesc': { vi: 'Xóa hết và dùng dữ liệu mới', en: 'Clear all and use new data' },
  'import.doPreview': { vi: 'Kiểm tra & xem trước', en: 'Validate & preview' },
  'import.valid': { vi: 'Hợp lệ: {n} mục', en: 'Valid: {n} items' },
  'import.invalid': { vi: 'Có lỗi khi kiểm tra', en: 'Validation errors' },
  'import.downloadSample': { vi: 'Tải file mẫu', en: 'Download sample' },
  'import.apply': { vi: 'Áp dụng import', en: 'Apply import' },
  'import.summary': { vi: 'Sẽ thêm {add}, bỏ qua {skip} trùng id.', en: 'Will add {add}, skip {skip} duplicates.' },

  // ---- Toasts ----
  'toast.questDone': { vi: 'Hoàn thành: {name}', en: 'Completed: {name}' },
  'toast.levelUp': { vi: 'LÊN CẤP! Bạn giờ là {title}', en: 'LEVEL UP! Now a {title}' },
  'toast.achUnlock': { vi: 'Mở khóa thành tựu: {name}', en: 'Achievement unlocked: {name}' },
  'toast.saved': { vi: 'Đã lưu', en: 'Saved' },
  'toast.restored': { vi: 'Đã khôi phục từ bản sao lưu', en: 'Restored from backup' },
  'toast.imported': { vi: 'Đã nhập {n} mục', en: 'Imported {n} items' },
  'toast.redeemed': { vi: 'Đã đổi "{name}" 🎉', en: 'Redeemed "{name}" 🎉' },
  'toast.undo': { vi: 'Đã hoàn tác', en: 'Undone' },
  'toast.redo': { vi: 'Đã làm lại', en: 'Redone' },
  'toast.focusDone': { vi: 'Xong phiên focus! +{xp} XP', en: 'Focus session done! +{xp} XP' },
};

const state = { lang: 'vi' };

export const i18n = {
  get lang() {
    return state.lang;
  },
  setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'vi';
    document.documentElement.lang = state.lang;
  },
  /** Dich key; thay {var} tu obj. Tra ve key neu khong tim thay. */
  t(key, vars) {
    const entry = DICTIONARY[key];
    let str = entry ? entry[state.lang] || entry.vi : key;
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    }
    return str;
  },
  /** Lay label cho doi tuong co {vi,en} (category, difficulty...). */
  label(obj) {
    if (!obj) return '';
    return state.lang === 'en' ? obj.en || obj.vi : obj.vi || obj.en;
  },
};

// Tien ich goi nhanh
export const t = (key, vars) => i18n.t(key, vars);
