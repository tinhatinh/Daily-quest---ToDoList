/*
 * constants.js - HANG SO TOAN CUC (khong obfuscate, co chu thich day du)
 * ---------------------------------------------------------------------
 * Gom: category, do kho, loai nhiem vu, luat lap lai, muc do uu tien,
 * ten danh hieu theo cap, cong thuc XP, combo/streak, danh sach 24 thanh
 * tuu, avatar, mood, loi nhan dong vien, cai dat mac dinh, du lieu mau.
 * Moi thu deu la object/mang de doc va mo rong.
 */

/* ============================ CATEGORY ============================ */
// Moi category: id, nhan VI/EN, ten bien mau (CSS var), icon (ten trong icons.js)
export const CATEGORIES = {
  health: { id: 'health', vi: 'Sức khỏe', en: 'Health', color: 'var(--cat-health)', icon: 'heart' },
  study: { id: 'study', vi: 'Học tập', en: 'Study', color: 'var(--cat-study)', icon: 'brain' },
  work: { id: 'work', vi: 'Công việc', en: 'Work', color: 'var(--cat-work)', icon: 'layers' },
  growth: { id: 'growth', vi: 'Phát triển', en: 'Growth', color: 'var(--cat-growth)', icon: 'trendingUp' },
  life: { id: 'life', vi: 'Cuộc sống', en: 'Life', color: 'var(--cat-life)', icon: 'sun' },
  social: { id: 'social', vi: 'Xã hội', en: 'Social', color: 'var(--cat-social)', icon: 'user' },
  finance: { id: 'finance', vi: 'Tài chính', en: 'Finance', color: 'var(--cat-finance)', icon: 'coin' },
};
export const CATEGORY_IDS = Object.keys(CATEGORIES);
export const DEFAULT_CATEGORY = 'life';

/* ============================ DIFFICULTY ============================ */
// Do kho: nhan, mau, XP va Coin mac dinh khi tao quest moi
export const DIFFICULTIES = {
  easy: { id: 'easy', vi: 'Dễ', en: 'Easy', color: 'var(--diff-easy)', xp: 15, coin: 5 },
  normal: { id: 'normal', vi: 'Thường', en: 'Normal', color: 'var(--diff-normal)', xp: 30, coin: 10 },
  hard: { id: 'hard', vi: 'Khó', en: 'Hard', color: 'var(--diff-hard)', xp: 50, coin: 18 },
  epic: { id: 'epic', vi: 'Sử thi', en: 'Epic', color: 'var(--diff-epic)', xp: 80, coin: 30 },
};
export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
export const DEFAULT_DIFFICULTY = 'normal';

/* ============================ QUEST TYPE ============================ */
// Loai nhiem vu. 'side' = Side Quest tuy chon (khong tinh Perfect Day).
export const QUEST_TYPES = {
  daily: { id: 'daily', vi: 'Hàng ngày', en: 'Daily' },
  weekly: { id: 'weekly', vi: 'Hàng tuần', en: 'Weekly' },
  'one-time': { id: 'one-time', vi: 'Một lần', en: 'One-time' },
  side: { id: 'side', vi: 'Side Quest', en: 'Side Quest' },
};
export const QUEST_TYPE_IDS = Object.keys(QUEST_TYPES);
export const DEFAULT_QUEST_TYPE = 'daily';

/* ============================ REPEAT MODE ============================ */
// Cach nhiem vu lap lai. 'days' luon la mang 0..6 (0 = Chu Nhat, 1 = Thu Hai...)
export const REPEAT_MODES = {
  none: { id: 'none', vi: 'Không lặp', en: 'No repeat' },
  everyday: { id: 'everyday', vi: 'Mỗi ngày', en: 'Every day' },
  weekdays: { id: 'weekdays', vi: 'Ngày trong tuần', en: 'Weekdays' },
  weekly: { id: 'weekly', vi: 'Thứ cụ thể', en: 'Specific days' },
  everyN: { id: 'everyN', vi: 'Mỗi N ngày', en: 'Every N days' },
};
export const REPEAT_MODE_IDS = Object.keys(REPEAT_MODES);

// Nhom ngay tien dung
export const DAY_PRESETS = {
  everyday: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
  monToSat: [1, 2, 3, 4, 5, 6],
};

/* ============================ PRIORITY ============================ */
export const PRIORITIES = {
  low: { id: 'low', vi: 'Thấp', en: 'Low', color: 'var(--muted)' },
  medium: { id: 'medium', vi: 'Vừa', en: 'Medium', color: 'var(--info)' },
  high: { id: 'high', vi: 'Cao', en: 'High', color: 'var(--warning)' },
  urgent: { id: 'urgent', vi: 'Khẩn', en: 'Urgent', color: 'var(--danger)' },
};
export const PRIORITY_IDS = Object.keys(PRIORITIES);

/* ============================ XP / LEVEL ============================ */
// XP can de len cap tiep theo = round(XP_BASE * level^XP_EXP).
// Voi XP_BASE=100, XP_EXP=1.35 -> level 12 ~ 2864 (~3000 nhu mockup).
export const XP_BASE = 100;
export const XP_EXP = 1.35;
export const MAX_LEVEL = 99;

// He so do kho XP (Cai dat): 'chill' can it XP hon, 'hardcore' can nhieu hon
export const XP_DIFFICULTY = {
  chill: { id: 'chill', vi: 'Dễ dãi', en: 'Chill', reqMult: 0.75, gainMult: 1.15 },
  normal: { id: 'normal', vi: 'Bình thường', en: 'Normal', reqMult: 1, gainMult: 1 },
  hardcore: { id: 'hardcore', vi: 'Cường độ cao', en: 'Hardcore', reqMult: 1.4, gainMult: 0.9 },
};

/* ============================ COMBO ============================ */
// Combo: hoan thanh tiep trong COMBO_WINDOW_MS thi tang chuoi.
export const COMBO_WINDOW_MS = 5 * 60 * 1000; // 5 phut giua 2 lan tick
export const COMBO_BONUS_PER_STEP = 0.1; // +10% XP moi bac combo
export const COMBO_MAX_MULT = 0.6; // tran thuong bonus 60%
export const COMBO_ACHIEVE_WINDOW_MS = 30 * 60 * 1000; // 5 quest/30ph = Combo x5

/* ============================ STREAK ============================ */
export const STREAK_MILESTONES = [3, 7, 30, 100]; // moc mo khoa huy hieu
export const STREAK_FREEZE_EVERY = 7; // moi 7 ngay lien tiep +1 freeze
export const STREAK_FREEZE_MAX = 2; // toi da 2 freeze

/* ============================ BOSS QUEST ============================ */
export const BOSS_XP_MULT = 2; // Boss Quest nhan x2 XP
export const BOSS_COIN_BONUS = 20; // thuong them coin

/* ============================ TITLES (danh hieu theo level) ============================ */
// Sap xep tang dan; level toi thieu de dat danh hieu
export const LEVEL_TITLES = [
  { level: 1, vi: 'Newbie', en: 'Newbie' },
  { level: 3, vi: 'Nhà thám hiểm', en: 'Adventurer' },
  { level: 5, vi: 'Kiến tạo', en: 'Builder' },
  { level: 8, vi: 'Chiến binh', en: 'Warrior' },
  { level: 12, vi: 'Anh hùng', en: 'Hero' },
  { level: 16, vi: 'Đấu sĩ', en: 'Champion' },
  { level: 20, vi: 'Bậc thầy', en: 'Master' },
  { level: 25, vi: 'Huyền thoại', en: 'Legend' },
  { level: 30, vi: 'Thần thoại', en: 'Mythic' },
  { level: 40, vi: 'Bất tử', en: 'Immortal' },
  { level: 50, vi: 'Vũ trụ', en: 'Cosmic' },
];

/* ============================ AVATAR ============================ */
// Avatar dung emoji (hop le vi la hinh dai dien, khong phai icon UI)
export const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦉', '🦄', '🐝', '🐳', '🦖', '🐨'];

/* ============================ MOOD (journal) ============================ */
export const MOODS = [
  { id: 'great', emoji: '😄', vi: 'Tuyệt', en: 'Great' },
  { id: 'good', emoji: '🙂', vi: 'Ổn', en: 'Good' },
  { id: 'meh', emoji: '😐', vi: 'Bình thường', en: 'Meh' },
  { id: 'tired', emoji: '😪', vi: 'Mệt', en: 'Tired' },
  { id: 'bad', emoji: '😞', vi: 'Không vui', en: 'Bad' },
  { id: 'angry', emoji: '😤', vi: 'Bực', en: 'Angry' },
];

/* ============================ ACHIEVEMENTS (>= 20) ============================ */
// Moi thanh tuu: id, ten VI/EN, mo ta, icon, tier (bronze/silver/gold/legend),
// va ham test(ctx) -> boolean. ctx duoc gamification cung cap (xem duoi).
export const ACHIEVEMENTS = [
  { id: 'first_quest', vi: 'First Blood', en: 'First Blood', descVi: 'Hoàn thành nhiệm vụ đầu tiên', descEn: 'Complete your first quest', icon: 'sword', tier: 'bronze', test: (c) => c.stats.totalQuests >= 1 },
  { id: 'early_bird', vi: 'Chim Sớm', en: 'Early Bird', descVi: 'Hoàn thành 1 quest trước 8:00 sáng', descEn: 'Finish a quest before 8:00 AM', icon: 'sun', tier: 'bronze', test: (c) => c.flags.earlyBird },
  { id: 'night_owl', vi: 'Cú Đêm', en: 'Night Owl', descVi: 'Hoàn thành 1 quest sau 23:00', descEn: 'Finish a quest after 11:00 PM', icon: 'moon', tier: 'bronze', test: (c) => c.flags.nightOwl },
  { id: 'combo_5', vi: 'Combo x5', en: 'Combo x5', descVi: 'Hoàn thành 5 quest trong 30 phút', descEn: 'Complete 5 quests within 30 minutes', icon: 'zap', tier: 'gold', test: (c) => c.flags.combo5 },
  { id: 'streak_3', vi: 'Khởi Động', en: 'Getting Started', descVi: 'Chuỗi 3 ngày liên tiếp', descEn: '3-day streak', icon: 'flame', tier: 'bronze', test: (c) => c.game.streak.count >= 3 || c.stats.maxStreak >= 3 },
  { id: 'streak_7', vi: 'Một Tuần Vững', en: 'Solid Week', descVi: 'Chuỗi 7 ngày liên tiếp', descEn: '7-day streak', icon: 'flame', tier: 'silver', test: (c) => c.game.streak.count >= 7 || c.stats.maxStreak >= 7 },
  { id: 'streak_30', vi: 'Kỷ Luật Thép', en: 'Iron Discipline', descVi: 'Chuỗi 30 ngày liên tiếp', descEn: '30-day streak', icon: 'shield', tier: 'gold', test: (c) => c.game.streak.count >= 30 || c.stats.maxStreak >= 30 },
  { id: 'streak_100', vi: 'Bất Tử', en: 'Immortal', descVi: 'Chuỗi 100 ngày liên tiếp', descEn: '100-day streak', icon: 'crown', tier: 'legend', test: (c) => c.game.streak.count >= 100 || c.stats.maxStreak >= 100 },
  { id: 'perfect_day', vi: 'Perfect Day', en: 'Perfect Day', descVi: 'Hoàn thành 100% quest trong một ngày', descEn: 'Complete 100% of quests in a day', icon: 'star', tier: 'gold', test: (c) => c.flags.perfectDay || c.stats.perfectDays >= 1 },
  { id: 'level_5', vi: 'Tỉnh Thức', en: 'Awakened', descVi: 'Đạt cấp độ 5', descEn: 'Reach level 5', icon: 'trendingUp', tier: 'bronze', test: (c) => c.game.level >= 5 },
  { id: 'level_10', vi: 'Chuyên Nghiệp', en: 'Professional', descVi: 'Đạt cấp độ 10', descEn: 'Reach level 10', icon: 'award', tier: 'silver', test: (c) => c.game.level >= 10 },
  { id: 'level_25', vi: 'Bậc Thầy', en: 'Grandmaster', descVi: 'Đạt cấp độ 25', descEn: 'Reach level 25', icon: 'crown', tier: 'legend', test: (c) => c.game.level >= 25 },
  { id: 'xp_1000', vi: 'Tích Lũy', en: 'Collector', descVi: 'Tổng cộng 1.000 XP', descEn: 'Earn 1,000 total XP', icon: 'zap', tier: 'bronze', test: (c) => c.game.totalXp >= 1000 },
  { id: 'xp_10000', vi: 'Kho Báu', en: 'Treasury', descVi: 'Tổng cộng 10.000 XP', descEn: 'Earn 10,000 total XP', icon: 'sparkles', tier: 'gold', test: (c) => c.game.totalXp >= 10000 },
  { id: 'quests_50', vi: 'Thợ Săn', en: 'Hunter', descVi: 'Hoàn thành 50 quest', descEn: 'Complete 50 quests', icon: 'target', tier: 'silver', test: (c) => c.stats.totalQuests >= 50 },
  { id: 'quests_200', vi: 'Huyền Thoại', en: 'Legend Slayer', descVi: 'Hoàn thành 200 quest', descEn: 'Complete 200 quests', icon: 'trophy', tier: 'legend', test: (c) => c.stats.totalQuests >= 200 },
  { id: 'epic_done', vi: 'Kẻ Hủy Diệt', en: 'Destroyer', descVi: 'Hoàn thành 1 quest Epic', descEn: 'Complete an Epic quest', icon: 'bolt', tier: 'silver', test: (c) => c.flags.epicDone || c.stats.epicDone >= 1 },
  { id: 'boss_slayer', vi: 'Diệt Boss', en: 'Boss Slayer', descVi: 'Đánh bại một Boss Quest', descEn: 'Defeat a Boss Quest', icon: 'flag', tier: 'gold', test: (c) => c.flags.bossSlain || c.stats.bossSlain >= 1 },
  { id: 'shop_first', vi: 'Biết Thưởng', en: 'Self-Care', descVi: 'Mua phần thưởng đầu tiên', descEn: 'Redeem your first reward', icon: 'gift', tier: 'bronze', test: (c) => c.stats.redeems >= 1 },
  { id: 'coin_500', vi: 'Khá Giả', en: 'Wealthy', descVi: 'Tích lũy 500 coin', descEn: 'Accumulate 500 coins', icon: 'coin', tier: 'silver', test: (c) => c.stats.totalCoinsEarned >= 500 },
  { id: 'focus_1', vi: 'Tập Trung', en: 'Locked In', descVi: 'Hoàn thành 1 phiên Focus', descEn: 'Finish a focus session', icon: 'timer', tier: 'bronze', test: (c) => c.stats.focusSessions >= 1 },
  { id: 'focus_25', vi: 'Deep Worker', en: 'Deep Worker', descVi: 'Hoàn thành 25 phiên Focus', descEn: 'Finish 25 focus sessions', icon: 'coffee', tier: 'gold', test: (c) => c.stats.focusSessions >= 25 },
  { id: 'journal_7', vi: 'Người Ghi Chép', en: 'Chronicler', descVi: 'Viết nhật ký 7 ngày', descEn: 'Write journal 7 days', icon: 'book', tier: 'silver', test: (c) => c.stats.journalDays >= 7 },
  { id: 'subtask_master', vi: 'Chú Chi Tiết', en: 'Detail-Oriented', descVi: 'Hoàn thành quest có subtasks', descEn: 'Finish a quest with subtasks', icon: 'list', tier: 'bronze', test: (c) => c.flags.subtaskDone || c.stats.subtaskDone >= 1 },
  { id: 'todo_20', vi: 'Cleaner', en: 'Cleaner', descVi: 'Xong 20 to-do', descEn: 'Clear 20 to-dos', icon: 'checkSquare', tier: 'bronze', test: (c) => c.stats.todosDone >= 20 },
  { id: 'week_warrior', vi: 'Chiến Binh Tuần', en: 'Week Warrior', descVi: 'Perfect Day 3 lần/tuần', descEn: '3 perfect days in a week', icon: 'flag', tier: 'gold', test: (c) => c.stats.perfectDaysThisWeek >= 3 },
];
export const ACHIEVEMENT_TIERS = {
  bronze: { vi: 'Đồng', en: 'Bronze', color: '#cd7f32' },
  silver: { vi: 'Bạc', en: 'Silver', color: '#c0c0c8' },
  gold: { vi: 'Vàng', en: 'Gold', color: '#ffc94a' },
  legend: { vi: 'Huyền thoại', en: 'Legend', color: '#ff6ec7' },
};

/* ============================ LOI NHAN DONG VIEN ============================ */
// Ngau nhien theo nguyen canh. Giong vui ve, khong len lop.
export const ENCOURAGEMENT = {
  morning: [
    'Chào buổi sáng! Ngày mới, combo mới. ☀️',
    'Dậy sớm thế, xứng đáng một quest Easy!',
    'Cà phê chưa? Cứ từ từ, mình có cả ngày.',
    'Hôm nay là trang giấy trắng - vẽ gì cũng được!',
  ],
  midday: [
    'Giữa ngày rồi, giữ nhịp thôi nào!',
    'Đã làm được kha khá đấy, tiếp nhé!',
    'Nghỉ một chút rồi chiến tiếp.',
  ],
  afternoon: [
    'Buổi chiều là lúc về đích, cố lên!',
    'Còn vài quest nữa thôi, ga cuối rồi!',
    'Đừng quên uống nước nha.',
  ],
  evening: [
    'Chào buổi tối, hôm nay bạn làm tốt lắm!',
    'Còn kịp để cứu một Perfect Day đó!',
    'Tối nay thư giãn nhưng đừng bỏ quest cuối nhé.',
  ],
  lateNight: [
    'Khuya rồi đó... quest xong chưa ta? 🌙',
    'Làm xong rồi thì đi ngủ sớm nha!',
    'Night Owl hoạt động à? Ghi nhận!',
  ],
  allDone: [
    'SẠCH QUEST! Bạn đúng là huyền thoại! 🎉',
    'Perfect Day! Hôm nay không còn gì để làm nữa.',
    'Xong hết! Tự thưởng bản thân đi, bạn xứng đáng.',
  ],
  streakLost: [
    'Mất streak rồi... nhưng ngày mai làm lại còn mạnh hơn! 💪',
    'Không sao, ai cũng có lúc hụt. Quay lại nào!',
    'Streak đóng băng? Kích hoạt Freeze đi bạn ơi.',
  ],
  almostDayOver: [
    'Sắp hết ngày rồi, còn quest nào chưa xong không?',
    'Chạy nước rút thôi, thêm 1 quest cũng đáng!',
  ],
  levelUp: [
    'LÊN CẤP! Danh hiệu mới đã chờ sẵn!',
    'Đẳng cấp tăng rồi, ăn mừng nhẹ nha!',
  ],
  combo: [
    'COMBO! Cứ đà này mà tiến!',
    'Chuỗi hoàn thành đang nóng lên, đừng dừng!',
  ],
  empty: [
    'Chưa có quest nào. Thêm một cái để bắt đầu hành trình?',
    'Trống trơn thế! Bấm "+ Quest mới" để mở màn thôi.',
  ],
};

/* ============================ CAI DAT MAC DINH ============================ */
export const DEFAULT_SETTINGS = {
  theme: 'dark', // dark | light | cyberpunk | forest
  accent: 'violet', // violet | blue | cyan | green | amber | pink | red | custom
  customAccent: '#7c5cff',
  customAccent2: '#22d3ee',
  language: 'vi', // vi | en
  dayStartHour: 4, // 04:00 la bat dau "ngay choi" moi (nguoi thuc khuya)
  sound: true,
  volume: 0.5,
  reducedMotion: false,
  xpDifficulty: 'normal',
  notifications: true,
  startOnBoot: false,
  minimizeToTray: true,
  autoBoss: true,
  sidebarCollapsed: false,
  focusWorkMin: 25,
  focusBreakMin: 5,
};

/* ============================ SHOP MAC DINH ============================ */
// Cua hang phan thuong tu dinh nghia (vi du "xem 1 tap phim = 50 coin")
export const DEFAULT_SHOP = [
  { id: 'r_001', name: 'Xem 1 tập phim', cost: 50, icon: '📺', description: 'Cày một tập series yêu thích' },
  { id: 'r_002', name: '30 phút thời gian rảnh', cost: 40, icon: '⏳', description: 'Mua 30 phút nghỉ ngơi không tội lỗi' },
  { id: 'r_003', name: '1 giờ thời gian rảnh', cost: 80, icon: '🕑', description: 'Mua trọn 1 giờ để làm gì mình thích' },
  { id: 'r_004', name: 'Trà sữa', cost: 80, icon: '🧋', description: 'Một ly trà sữa full topping' },
  { id: 'r_005', name: '1h game tự do', cost: 120, icon: '🎮', description: 'Chơi game không cảm giác tội lỗi' },
  { id: 'r_006', name: 'Nửa ngày rảnh', cost: 250, icon: '🌤️', description: 'Một buổi chỉ để nghỉ ngơi' },
  { id: 'r_007', name: 'Mua sách mới', cost: 200, icon: '📚', description: 'Tự thưởng một cuốn sách' },
  { id: 'r_008', name: 'Ngày nghỉ không tội lỗi', cost: 400, icon: '🏖️', description: 'Xả trại hoàn toàn, không quest' },
];

/* ============================ CONG THUC XP ============================ */
/** XP can de len cap tiep theo (trước khi nhân hệ số độ khó). */
export function xpForLevel(level) {
  return Math.round(XP_BASE * Math.pow(Math.max(1, level), XP_EXP));
}

/* ============================ DU LIEU MAU (onboarding) ============================ */
// 8 quest + 6 su kien lich trinh mau, da dang category (nap lan chay dau).
export const SAMPLE_QUESTS = [
  { id: 'q_001', title: 'Tập thể dục 30 phút', description: 'Chạy bộ hoặc gym', type: 'daily', category: 'health', difficulty: 'normal', xp: 30, coin: 10, repeat: { mode: 'weekdays', days: [1, 2, 3, 4, 5] }, deadline: '21:00', subtasks: ['Khởi động', 'Tập chính', 'Giãn cơ'], tags: ['sức khỏe'], priority: 'high' },
  { id: 'q_002', title: 'Học tiếng Anh unit 5', description: 'Ôn từ vựng + nghe + làm bài', type: 'daily', category: 'study', difficulty: 'hard', xp: 60, coin: 20, repeat: { mode: 'weekdays', days: [1, 2, 3, 4, 5] }, deadline: '22:00', subtasks: ['Ôn từ vựng', 'Nghe podcast 15 phút', 'Làm bài tập'], tags: ['ngoại ngữ'], priority: 'high' },
  { id: 'q_003', title: 'Viết báo cáo tuần', description: 'Tổng hợp số liệu', type: 'weekly', category: 'work', difficulty: 'epic', xp: 80, coin: 30, repeat: { mode: 'weekly', days: [5] }, deadline: '18:00', subtasks: ['Thu thập số liệu', 'Viết nội dung', 'Trình bày'], tags: ['công việc'], priority: 'high' },
  { id: 'q_004', title: 'Đọc sách 20 trang', description: 'Trước khi ngủ', type: 'daily', category: 'growth', difficulty: 'easy', xp: 15, coin: 5, repeat: { mode: 'everyday', days: [0, 1, 2, 3, 4, 5, 6] }, deadline: '23:00', subtasks: [], tags: ['đọc'], priority: 'medium' },
  { id: 'q_005', title: 'Thiền 10 phút', description: 'Hít thở sâu', type: 'daily', category: 'health', difficulty: 'easy', xp: 15, coin: 5, repeat: { mode: 'everyday', days: [0, 1, 2, 3, 4, 5, 6] }, deadline: '08:00', subtasks: [], tags: ['tinh thần'], priority: 'low' },
  { id: 'q_006', title: 'Ôn flashcard từ vựng', description: '50 thẻ Anki', type: 'daily', category: 'study', difficulty: 'normal', xp: 25, coin: 8, repeat: { mode: 'weekdays', days: [1, 2, 3, 4, 5] }, deadline: '22:30', subtasks: [], tags: ['ngoại ngữ'], priority: 'medium' },
  { id: 'q_007', title: 'Gọi điện cho gia đình', description: 'Hỏi thăm ba mẹ', type: 'one-time', category: 'life', difficulty: 'normal', xp: 20, coin: 8, repeat: { mode: 'everyN', everyNDays: 3, days: [] }, deadline: '', subtasks: [], tags: ['gia đình'], priority: 'medium' },
  { id: 'q_008', title: 'Học thử 1 công cụ mới', description: 'Side quest', type: 'side', category: 'growth', difficulty: 'hard', xp: 50, coin: 15, repeat: { mode: 'none', days: [] }, deadline: '', subtasks: ['Tìm hiểu', 'Cài đặt', 'Làm ví dụ'], tags: ['công nghệ'], priority: 'low' },
];

export const SAMPLE_SCHEDULE = [
  { id: 's_001', title: 'Chạy bộ', start: '07:00', end: '08:00', days: [1, 2, 3, 4, 5], category: 'health', linkedQuestId: 'q_001', note: 'Công viên gần nhà', reminderMinutes: 5 },
  { id: 's_002', title: 'Deep work', start: '09:00', end: '12:00', days: [1, 2, 3, 4, 5], category: 'work', linkedQuestId: '', note: 'Tắt thông báo', reminderMinutes: 0 },
  { id: 's_003', title: 'Ăn trưa', start: '12:00', end: '13:00', days: [0, 1, 2, 3, 4, 5, 6], category: 'life', linkedQuestId: '', note: '', reminderMinutes: 0 },
  { id: 's_004', title: 'Học tiếng Anh', start: '14:00', end: '15:30', days: [1, 3, 5], category: 'study', linkedQuestId: 'q_002', note: 'Ôn từ vựng unit 5', reminderMinutes: 10 },
  { id: 's_005', title: 'Gym', start: '17:00', end: '18:00', days: [2, 4, 6], category: 'health', linkedQuestId: 'q_001', note: 'Chân + tay', reminderMinutes: 10 },
  { id: 's_006', title: 'Đọc sách', start: '19:00', end: '20:00', days: [0, 1, 2, 3, 4, 5, 6], category: 'growth', linkedQuestId: 'q_004', note: '', reminderMinutes: 5 },
];

/* ============================ NGON NGU / THEME / ACCENT ============================ */
export const LANGUAGES = { vi: 'Tiếng Việt', en: 'English' };

export const THEMES = {
  dark: { vi: 'Dark Neon', en: 'Dark Neon', preview: 'linear-gradient(135deg,#0b0a14,#22d3ee)' },
  light: { vi: 'Light', en: 'Light', preview: 'linear-gradient(135deg,#eef0f8,#6d4aff)' },
  cyberpunk: { vi: 'Cyberpunk', en: 'Cyberpunk', preview: 'linear-gradient(135deg,#07060f,#ff2d95)' },
  forest: { vi: 'Forest', en: 'Forest', preview: 'linear-gradient(135deg,#0b1410,#b6e04a)' },
};

export const ACCENT_SWATCHES = [
  { id: 'violet', color: '#7c5cff' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'green', color: '#22c55e' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'pink', color: '#ec4899' },
  { id: 'red', color: '#ef4444' },
];

/* ============================ PHIM TAT ============================ */
// Danh sach phim tat hien thi trong trg tro giup / command palette
export const SHORTCUTS = [
  { keys: 'Ctrl+N', vi: 'Thêm quest mới', en: 'New quest', cmd: 'new-quest' },
  { keys: 'Ctrl+K', vi: 'Command palette', en: 'Command palette', cmd: 'palette' },
  { keys: 'Ctrl+Z', vi: 'Hoàn tác', en: 'Undo', cmd: 'undo' },
  { keys: 'Ctrl+Shift+Z', vi: 'Làm lại', en: 'Redo', cmd: 'redo' },
  { keys: 'Space', vi: 'Tick quest đang chọn', en: 'Toggle selected quest', cmd: 'toggle-selected' },
  { keys: '1 - 5', vi: 'Chuyển trang nhanh', en: 'Switch page', cmd: 'nav' },
  { keys: 'Ctrl+T', vi: 'Thêm to-do', en: 'Add to-do', cmd: 'focus-todo' },
];
