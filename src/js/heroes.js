/*
 * heroes.js - DANH BA ANH HUNG (My Hero Academia style)
 * -----------------------------------------------------
 * Moi "hero style" la mot bo: bang mau, cau tho, ten don chien, hang anh
 * hung theo cap va loi nhan dong vien. All Might la mac dinh (giao dien
 * chinh), cac anh hung khong thay doi co che game - chi doi "chat" thi dau.
 *
 * Chi co du lieu thuan tuy (khong import gi ca) -> an toan dung o app.js,
 * pet.js, theme.js, settings.js.
 */

/* ============================ HANG ANH HUNG (theo level) ============================ */
// Du dung cho moi hero style; nhan theo goc "bang xep hang Pro Hero".
export const HERO_RANKS = [
  { level: 1, vi: 'Học trò UA', en: 'UA Student', tier: 'D' },
  { level: 3, vi: 'Thực tập sinh', en: 'Work Study', tier: 'D' },
  { level: 5, vi: 'Có giấy phép', en: 'Licensed Hero', tier: 'C' },
  { level: 8, vi: 'Trợ thủ', en: 'Sidekick', tier: 'C' },
  { level: 12, vi: 'Pro Hero', en: 'Pro Hero', tier: 'B' },
  { level: 16, vi: 'Pro Hero hạng A', en: 'A-Rank Hero', tier: 'B' },
  { level: 20, vi: 'Top Hero', en: 'Top Hero', tier: 'A' },
  { level: 25, vi: 'Anh hùng quốc gia', en: 'National Hero', tier: 'A' },
  { level: 30, vi: 'Biểu tượng', en: 'The Symbol', tier: 'S' },
  { level: 40, vi: 'Hero số 1', en: 'No.1 Hero', tier: 'S' },
  { level: 50, vi: 'Huyền thoại Hòa bình', en: 'Legend of Peace', tier: 'S' },
];

/** Tim hang anh hung gan nhat khong vuot qua level. */
export function rankForLevel(level) {
  let cur = HERO_RANKS[0];
  for (const r of HERO_RANKS) if (level >= r.level) cur = r;
  return cur;
}

/* ============================ DANH BA HERO ============================ */
export const HEROES = {
  /* ---------------------------- ALL MIGHT (mac dinh) ---------------------------- */
  allmight: {
    id: 'allmight',
    vi: 'All Might',
    en: 'All Might',
    aliasVi: 'Biểu tượng Hòa bình',
    aliasEn: 'The Symbol of Peace',
    heroName: 'All Might',
    colors: {
      accent: '#ffd23f', // vang dai
      accent2: '#2f6bff', // xanh costume
      glow: '#ff4d5e', // do mat na
      ink: '#10162e',
      hair: '#ffdf6b',
      suit: '#2f6bff',
      line: '#ffe98a',
    },
    // Ten don chien phat len khi hoan thanh quest (ngau nhien)
    smashes: [
      'DETROIT SMASH!',
      'CAROLINA SMASH!',
      'TEXAS SMASH!',
      'OKLAHOMA SLAM!',
      'MISSOURI BREAK!',
      'DELAWARE SMASH!',
      '100% ULTRA SMASH!',
    ],
    ultraVi: 'PLUS ULTRA!',
    ultraEn: 'PLUS ULTRA!',
    villainVi: 'All For One',
    villainEn: 'All For One',
    sfx: 'smash',
    lines: {
      morning: [
        'Chào buổi sáng! Hôm nay ta sẽ cười thay cho tất cả.',
        'Đứng dậy nào! Biểu tượng hòa bình không ngủ nướng.',
        'Một ngày mới. Cứ bước tới, PLUS ULTRA!',
      ],
      midday: [
        'Giữa ngày rồi. Giữ vững phong độ đi, cậu làm được mà!',
        'Ta ở đây mà! (Còn cậu thì còn quest.)',
      ],
      afternoon: [
        'Buổi chiều là lúc về đích. Hít sâu và SMASH!',
        'Còn vài việc nữa thôi - đừng để villain thắng nhé!',
      ],
      evening: [
        'Chào buổi tối. Hôm nay cậu đã cố rất nhiều, ta thấy hết.',
        'Còn kịp cứu một Perfect Day. Đứng lên, phủi bụi đi!',
      ],
      lateNight: [
        'Khuya rồi... sức mạnh của ta chỉ còn 1 giờ nữa thôi.',
        'Làm xong thì đi ngủ. Hero nghỉ ngơi cũng là nhiệm vụ.',
      ],
      allDone: [
        'SẠCH QUEST! Cậu đã cười thay cho cả thành phố hôm nay.',
        'Perfect Day! Đây chính là PLUS ULTRA của cậu!',
      ],
      streakLost: [
        'Mất chuỗi ư? Không sao. Ta từng gục 100 lần, và đứng lên 101.',
        'Ai cũng có lúc hụt. Hít vào, rồi làm lại nào!',
      ],
      almostDayOver: [
        'Sắp hết giờ rồi! Thêm một quest nữa thôi - ta tin cậu!',
        'Chạy nước rút! Sức mạnh thật sự nằm ở đoạn cuối.',
      ],
      levelUp: [
        'LÊN HANG! Cậu đang tiến gần hơn tới số 1!',
        'Phen này... là của cậu. Cứ tiến lên, PLUS ULTRA!',
      ],
      combo: [
        'Chuỗi đòn liên hoàn! Giữ nhịp này!',
        'Cứ đà này, villain nào cũng ngã!',
      ],
      empty: [
        'Chưa có nhiệm vụ nào. Một thành phố yên bình... hay cậu đang ngủ quên?',
        'Thêm quest đi. Hòa bình cần người gìn giữ mỗi ngày.',
      ],
      boss: [
        'Ác nhân xuất hiện rồi. Đánh bại nó, ta tin cậu!',
        'Boss hôm nay mạnh đấy. Hít sâu... rồi SMASH!',
      ],
    },
  },

  /* ---------------------------- DEKU / MIDORIYA ---------------------------- */
  midoriya: {
    id: 'midoriya',
    vi: 'Deku',
    en: 'Deku',
    aliasVi: 'One For All',
    aliasEn: 'One For All',
    heroName: 'Deku',
    colors: {
      accent: '#3ee08a', // xanh năng lượng
      accent2: '#12e0c0', // tia sét
      glow: '#0f1b2d',
      ink: '#0c1424',
      hair: '#2fbf71',
      suit: '#1f3f5c',
      line: '#b9ffe0',
    },
    smashes: ['FULL COWL!', '100% SMASH!', 'BLACK WHIP!', 'AIR FORCE!', 'GEARSHIFT: FOURTH!', 'STATE OF THE ART!'],
    ultraVi: 'Mình sẽ bảo vệ!',
    ultraEn: 'I CAN PROTECT!',
    villainVi: 'Shigaraki',
    villainEn: 'Shigaraki',
    sfx: 'cowl',
    lines: {
      morning: [
        'Chào buổi sáng! Mình sẽ ghi hết vào sổ nghiên cứu luôn!',
        'Ngày mới, thêm một bài học. Cố lên, chúng ta còn yếu lắm!',
      ],
      midday: [
        'Giữa ngày rồi. Phân tích trước, hành động sau - cậu làm tốt lắm!',
        'Hít thở... rồi tiếp tục. One For All là tích lũy mà!',
      ],
      afternoon: [
        'Chiều rồi, thêm một quest nữa là cậu vượt giới hạn hôm qua!',
        'Đừng gượng quá, nhớ 20% thôi nhé... à mà cậu mạnh hơn mình!',
      ],
      evening: [
        'Chào buổi tối. Hôm nay cậu đã bảo vệ được ngày của mình.',
        'Vẫn còn thời gian để cứu Perfect Day. Mình tin cậu!',
      ],
      lateNight: [
        'Khuya rồi... nghỉ đi, mai mình luyện tiếp.',
        'Ghi sổ cái đã rồi hãy ngủ nhé!',
      ],
      allDone: [
        'Hết sạch quest! Cậu... mạnh thật đấy!',
        'Perfect Day! Đây là phiên bản tốt nhất của cậu!',
      ],
      streakLost: [
        'Mất chuỗi... mình cũng từng thế. Đứng lên, bước tiếp thôi!',
        'Không sao hết. Tích lũy lại từ đầu, chậm mà chắc!',
      ],
      almostDayOver: [
        'Sắp hết ngày rồi! FULL COWL đi, còn kịp!',
        'Một quest cuối thôi - quyết định ở giây này!',
      ],
      levelUp: [
        'LÊN CẤP! One For All đang lớn dần trong cậu!',
        'Cấp mới rồi! Mình cũng đang cố cùng cậu!',
      ],
      combo: ['Liên hoàn! Đừng dừng lại!', 'Cứ phân tích rồi ra đòn, chuẩn luôn!'],
      empty: [
        'Chưa có nhiệm vụ nào. Viết danh sách đi, mình giúp!',
        'Trống quá... thêm quest để mình còn học hỏi chứ!',
      ],
      boss: [
        'Ác nhân mạnh lắm... nhưng cậu không đi một mình!',
        'Boss xuất hiện. Phân tích điểm yếu rồi tung đòn!',
      ],
    },
  },

  /* ---------------------------- BAKUGO ---------------------------- */
  bakugo: {
    id: 'bakugo',
    vi: 'Bakugo',
    en: 'Bakugo',
    aliasVi: 'Vua nổ tung',
    aliasEn: 'Explosion Murder',
    heroName: 'Bakugo',
    colors: {
      accent: '#ff8a1f',
      accent2: '#ff2d2d',
      glow: '#ffd23f',
      ink: '#1a0d06',
      hair: '#f2e2b3',
      suit: '#2b2b33',
      line: '#ffcf6b',
    },
    smashes: ['AP: AUTO SHOT!', 'HOWITZER IMPACT!', 'STUN GRENADE!', 'EXPLOSION: MAX!', 'AIM: SETTLED!'],
    ultraVi: 'DIE!!',
    ultraEn: 'DIE!!',
    villainVi: 'Nomu',
    villainEn: 'Nomu',
    sfx: 'blast',
    lines: {
      morning: [
        'Sáng rồi! Đừng có lề mề, thắng hay thua là do mày!',
        'Dậy và cày đi. Kẻ về nhì không có chỗ ở đây!',
      ],
      midday: [
        'Giữa ngày. Vẫn còn chậm - nhanh lên!',
        'Được đấy, nhưng đừng tưởng thế là đủ.',
      ],
      afternoon: [
        'Chiều rồi, làm hết đi rồi hãy nghỉ!',
        'Còn quest chưa xong? Vậy thì còn lâu mày mới thắng!',
      ],
      evening: [
        'Tối nay tạm chấp nhận. Đừng quên quest cuối!',
        'Hỏi mày nhé: hôm nay mày đã cố hết chưa?',
      ],
      lateNight: [
        'Khuya rồi. Ngủ đi, mai còn đánh tiếp!',
        'Làm xong chưa? Chưa thì nhanh lên!',
      ],
      allDone: [
        'SẠCH! Hừ... cũng ra dáng đấy.',
        'Perfect Day. Tất nhiên rồi, vì mày đang theo ta mà!',
      ],
      streakLost: [
        'Mất chuỗi? Cắn răng mà làm lại! Đừng có khóc!',
        'Thua một ngày không phải thua cuộc. Đứng lên!',
      ],
      almostDayOver: [
        'Hết giờ! Còn quest nữa không thì nói nhanh!',
        'Chạy nước rút đi. Đừng để thua một cái deadline!',
      ],
      levelUp: ['LÊN HANG! Tốt, nhưng vẫn còn xa mới bằng ta!', 'Cấp mới rồi. Thắng tiếp đi!'],
      combo: ['Chuỗi đòn đấy! Đừng có dừng!', 'Nổ liên hoàn! Đúng chất!'],
      empty: ['Chưa có quest? Vậy ngồi đó mà nhìn à? Thêm đi!', 'Rảnh quá hả? Tạo nhiệm vụ đi!'],
      boss: ['Con kia mạnh đấy. Nhưng mạnh hơn thì sao, cứ đánh!', 'Boss tới. Nổ tung nó!'],
    },
  },

  /* ---------------------------- TODOROKI ---------------------------- */
  todoroki: {
    id: 'todoroki',
    vi: 'Todoroki',
    en: 'Todoroki',
    aliasVi: 'Nửa lạnh nửa nóng',
    aliasEn: 'Half-Cold Half-Hot',
    heroName: 'Shoto',
    colors: {
      accent: '#63d3ff',
      accent2: '#ff6a3d',
      glow: '#a9f0ff',
      ink: '#0a1420',
      hair: '#e8f3ff',
      suit: '#12212f',
      line: '#ffd0b0',
    },
    smashes: ['GREAT FIRE!', 'ICE WALL: MAX!', 'FLAME WIND!', 'COLD FLAME!', 'ICED EARTH!'],
    ultraVi: 'Mình sẽ thắng, bằng chính mình.',
    ultraEn: 'This is me, now.',
    villainVi: 'Homo Smolder',
    villainEn: 'Homo Smolder',
    sfx: 'flame',
    lines: {
      morning: [
        'Chào buổi sáng. Giữ cái đầu lạnh, giữ trái tim nóng.',
        'Ngày mới. Hôm nay cậu chọn phần nào của mình?',
      ],
      midday: [
        'Giữa ngày. Cân bằng là sức mạnh.',
        'Đừng vội. Lạnh trước, nóng sau.',
      ],
      afternoon: [
        'Chiều rồi. Thêm một bước, không cần nhanh.',
        'Cứ đi tiếp. Cậu không phải ai khác cả.',
      ],
      evening: [
        'Chào buổi tối. Hôm nay cậu đã ổn.',
        'Vẫn còn thời gian. Chọn của cậu đi.',
      ],
      lateNight: [
        'Khuya rồi. Nghỉ đi, băng cũng cần tan.',
        'Ngủ một giấc, mai tính tiếp.',
      ],
      allDone: ['Toàn bộ đã xong. ...Đẹp đấy.', 'Perfect Day. Cậu tự chọn điều đó, đúng không?'],
      streakLost: ['Gián đoạn thôi. Bên trái hay bên phải, cậu vẫn đi được.', 'Mất chuỗi không định nghĩa cậu. Bắt đầu lại.'],
      almostDayOver: ['Sắp hết ngày. Một quest nữa thôi.', 'Quyết định đi. Cậu biết mình phải làm gì.'],
      levelUp: ['LÊN HANG. Đây là sức mạnh của cậu.', 'Cấp mới. Đừng nhìn ai, nhìn chính mình.'],
      combo: ['Liên hoàn. Băng và lửa cùng lúc.', 'Đà tốt. Giữ lấy.'],
      empty: ['Chưa có nhiệm vụ. Thêm một cái đi.', 'Trống quá. Cậu chọn gì hôm nay?'],
      boss: ['Boss mạnh. Không cần thắng bằng mọi giá, chỉ cần không bỏ.', 'Ác nhân tới. Dùng cả hai phía.'],
    },
  },

  /* ---------------------------- URARAKA ---------------------------- */
  uraraka: {
    id: 'uraraka',
    vi: 'Uravity',
    en: 'Uravity',
    aliasVi: 'Trọng lực bằng không',
    aliasEn: 'Zero Gravity',
    heroName: 'Uraraka',
    colors: {
      accent: '#ff8fc7',
      accent2: '#ffd6ec',
      glow: '#ff5fa8',
      ink: '#22101a',
      hair: '#a5714f',
      suit: '#f2f5ff',
      line: '#ffe3f2',
    },
    smashes: ['ZERO GRAVITY!', 'URAVITY SMASH!', 'METEOR BOMB!', 'SKY FLOAT!', 'TENKA IWATENKO!'],
    ultraVi: 'Mình làm được mà!',
    ultraEn: 'I can do it!',
    villainVi: 'Kamini Guren',
    villainEn: 'Kamini Guren',
    sfx: 'float',
    lines: {
      morning: [
        'Chào buổi sáng! Nhẹ người lên nào, mình bay cùng cậu!',
        'Ngày mới rồi. Cố lên, vì gia đình và vì chính cậu!',
      ],
      midday: [
        'Giữa ngày rồi, mọi thứ đang trôi rất êm!',
        'Thở ra nào. Nặng quá thì mình bỏ trọng lực đi!',
      ],
      afternoon: [
        'Chiều rồi, thêm quest nữa là bay tới đích!',
        'Đừng lo, mình ở đây. Từ từ cũng tới!',
      ],
      evening: [
        'Chào buổi tối! Hôm nay cậu giỏi lắm đấy, biết không?',
        'Còn một quest nữa là Perfect Day. Mình tin cậu!',
      ],
      lateNight: [
        'Khuya rồi, ngủ sớm nhé. Mai mình tập lại!',
        'Nghiêng đầu một cái là hết mệt. Đi ngủ thôi!',
      ],
      allDone: ['Xong hết rồi! Mình cậu bay lên được luôn á!', 'Perfect Day! Tuyệt vời quá đi mất!'],
      streakLost: ['Ôi... mất chuỗi hả? Không sao, mình bắt đầu lại cùng nhau!', 'Đừng buồn. Ngày mai nhẹ hơn nhiều, mình hứa!'],
      almostDayOver: ['Sắp hết ngày rồi, nhanh tay lên nào!', 'Một quest cuối thôi, mình đếm 1-2-3 nhé!'],
      levelUp: ['LÊN CẤP! Cậu bay cao thật đấy!', 'Cấp mới rồi! Mình cũng phải cố thêm!'],
      combo: ['Liên hoàn! Nhẹ tênh luôn!', 'Đà này là bay khỏi mặt đất rồi!'],
      empty: ['Chưa có nhiệm vụ nào. Thêm cái đi, mình chờ!', 'Trống trơn thế này thì buồn lắm à!'],
      boss: ['Boss to thế... nhưng mình sẽ làm nó bay lên!', 'Ác nhân tới rồi. Hít sâu, chạm vào nó!'],
    },
  },

  /* ---------------------------- ERASER HEAD ---------------------------- */
  aizawa: {
    id: 'aizawa',
    vi: 'Eraser Head',
    en: 'Eraser Head',
    aliasVi: 'Đặc vụ xóa bỏ',
    aliasEn: 'The Hero Teacher',
    heroName: 'Aizawa',
    colors: {
      accent: '#ff3355',
      accent2: '#8b93a7',
      glow: '#ff5c78',
      ink: '#0b0d12',
      hair: '#1b1e26',
      suit: '#2a2f3a',
      line: '#c8d0dd',
    },
    smashes: ['CAPTURE WARP!', 'ERASURE!', 'BINDING BAND!', 'LOGIC PURGE!', 'GROUND ZERO!'],
    ultraVi: 'Hãy thực tế đi.',
    ultraEn: 'Be realistic.',
    villainVi: 'Woolworth',
    villainEn: 'Woolworth',
    sfx: 'erase',
    lines: {
      morning: [
        'Sáng rồi. Bỏ thói quen trì hoãn, đó mới là quirk cần xóa.',
        'Không có đường tắt. Làm đi, ta sẽ quan sát.',
      ],
      midday: [
        'Giữa ngày. Tiến độ đâu rồi, cho ta xem.',
        'Cảm xúc không giải quyết được quest. Cứ làm tiếp.',
      ],
      afternoon: [
        'Chiều. Còn việc chưa xong thì đừng nghĩ mình nghỉ được.',
        'Logic đơn giản: làm xong thì xong.',
      ],
      evening: [
        'Tối. Hôm nay cậu còn sót gì không?',
        'Nếu còn quest, làm đi. Rồi ngủ đủ 8 tiếng.',
      ],
      lateNight: [
        'Muộn rồi. Thiếu ngủ là tự hủy quirk của mình.',
        'Làm xong chưa? Chưa thì 15 phút nữa, hết giờ.',
      ],
      allDone: ['Sạch. Được, hôm nay cậu không cần ta nhắc.', 'Perfect Day. Không cảm xúc, nhưng chính xác.'],
      streakLost: ['Mất chuỗi. Chấp nhận, phân tích nguyên nhân, làm lại.', 'Ngã thì đứng lên. Không có thời gian than.'],
      almostDayOver: ['Hết ngày. Chọn đi: làm hay là chấp nhận thua.', 'Còn 1 quest. Đừng để nó thành cái cớ.'],
      levelUp: ['LÊN HANG. Tốt. Giờ đặt mục tiêu cao hơn.', 'Cấp mới. Chưa đủ, nhưng tiến bộ.'],
      combo: ['Liên tục. Giữ kỷ luật đó.', 'Đà tốt. Đừng phá nó.'],
      empty: ['Không có nhiệm vụ? Vậy cậu định thắng bằng cách nào?', 'Thêm quest. Không có mục tiêu thì không có hero.'],
      boss: ['Boss. Phân tích trước, đánh sau. Bỏ cảm xúc ra ngoài.', 'Ta sẽ xóa quirk của nó. Phần còn lại là của cậu.'],
    },
  },
};

export const HERO_IDS = Object.keys(HEROES);
export const DEFAULT_HERO = 'allmight';

/** Lay hero, tu cho fallback ve All Might. */
export function getHero(id) {
  return HEROES[id] || HEROES[DEFAULT_HERO];
}

/** Ngau nhien 1 don chien cua hero. */
export function pickSmash(hero) {
  const h = getHero(hero);
  return h.smashes[Math.floor(Math.random() * h.smashes.length)];
}

/** Ngau nhien 1 loi tho theo nguyen canh (tra ve chuoi rong neu thieu). */
export function heroLine(hero, key) {
  const h = getHero(hero);
  const arr = (h.lines && h.lines[key]) || [];
  if (!arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Hang anh hung theo level (VI/EN). */
export function heroRank(level, lang = 'vi') {
  const r = rankForLevel(level);
  return lang === 'en' ? { ...r, label: r.en } : { ...r, label: r.vi };
}
