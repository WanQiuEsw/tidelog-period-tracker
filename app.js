// TideLog 潮汐历 - 纯本地温柔身体手帐 (Zero-dependency)
// shortcut: state persists in localStorage; switch to IndexedDB only if users attach media files.

const STORAGE_KEY = "tidelog_v1_state";
const DAY_MS = 86400000;

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateStr(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr, days) {
  const dt = parseDateStr(dateStr);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
}

function diffDays(aStr, bStr) {
  return Math.round((parseDateStr(aStr).getTime() - parseDateStr(bStr).getTime()) / DAY_MS);
}

function formatCNDate(dateStr) {
  if (!dateStr) return "--";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 症状胶囊分组（支持防窥天气手帐切换）
const SYMPTOM_GROUPS = [
  {
    id: "flow",
    title: "今天的量",
    stealthTitle: "今日雨势",
    intimate: false,
    items: [
      { id: "flow_light", label: "一点点", stealth: "零星小雨" },
      { id: "flow_medium", label: "正常量", stealth: "平稳中雨" },
      { id: "flow_heavy", label: "量挺大", stealth: "阵雨偏大" },
      { id: "flow_clots", label: "有血块", stealth: "风力偏强" },
      { id: "flow_brown", label: "快干净了", stealth: "雨后放晴" }
    ]
  },
  {
    id: "body",
    title: "身体感觉",
    stealthTitle: "体感状态",
    intimate: false,
    items: [
      { id: "pain_cramps_mild", label: "小腹坠坠的", stealth: "微微发沉" },
      { id: "pain_cramps_heavy", label: "痛经难受", stealth: "急需热饮" },
      { id: "body_backache", label: "腰酸背痛", stealth: "肩腰酸软" },
      { id: "body_breast", label: "胸胀敏感", stealth: "体感偏敏" },
      { id: "body_headache", label: "头胀/偏头痛", stealth: "脑壳发紧" },
      { id: "body_acne", label: "下巴冒痘", stealth: "皮肤小抗议" },
      { id: "body_bloating", label: "水肿发胀", stealth: "有点浮肿" },
      { id: "body_insomnia", label: "没睡好", stealth: "浅眠多梦" }
    ]
  },
  {
    id: "mood",
    title: "脑袋和心情",
    stealthTitle: "心情天气",
    intimate: false,
    items: [
      { id: "mood_calm", label: "平静松弛", stealth: "微风正好" },
      { id: "mood_focus", label: "脑子超清晰", stealth: "灵感在线" },
      { id: "mood_tired", label: "电量剩20%", stealth: "电量告急" },
      { id: "mood_irritable", label: "莫名想发火", stealth: "气压偏低" },
      { id: "mood_sad", label: "委屈想哭", stealth: "多云转阴" },
      { id: "mood_craving", label: "狂想吃甜食/碳水", stealth: "急需甜点" }
    ]
  },
  {
    id: "intimate",
    title: "小记录与用药",
    stealthTitle: "日常备忘",
    intimate: true,
    items: [
      { id: "med_painkiller", label: "吃了止痛药", stealth: "补给已用" },
      { id: "med_iron", label: "贴了暖宝宝/热敷", stealth: "热敷回血" },
      { id: "intimate_protected", label: "亲密(有保护)", stealth: "双人时光 A" },
      { id: "intimate_unprotected", label: "亲密(无保护)", stealth: "双人时光 B" },
      { id: "med_bcp", label: "吃了短效药", stealth: "每日打卡" }
    ]
  }
];

const DOCTOR_QUESTIONS = [
  "痛经比以前更重了，需要做 B 超排查吗？",
  "最近周期变长/变短，算在正常范围里吗？",
  "经量突然变少或有较多血块，需要查激素吗？",
  "经前情绪波动或胸胀很明显，怎么缓解更安全？",
  "有重要考试/旅行撞期，可以怎么安全调整？"
];

// 阶段视觉元数据 + 温柔体贴手帐搭子语料引擎
const SEASON_META = {
  winter: {
    key: "winter",
    colorVar: "var(--season-winter)",
    softVar: "var(--season-winter-soft)",
    chip: "经期 · 合法躺平",
    stealthChip: "小雨 · 节能休整",
    title: "电量告急 · 合法躺平期",
    stealthTitle: "低电量休整日",
    battery: "20%",
    waveLevel: 146
  },
  spring: {
    key: "spring",
    colorVar: "var(--season-spring)",
    softVar: "var(--season-spring-soft)",
    chip: "回血期 · 状态回升",
    stealthChip: "晴朗 · 电量回升",
    title: "满血回春 · 状态回升中",
    stealthTitle: "清透回血日",
    battery: "85%",
    waveLevel: 158
  },
  summer: {
    key: "summer",
    colorVar: "var(--season-summer)",
    softVar: "var(--season-summer-soft)",
    chip: "高光日 · 精力拉满",
    stealthChip: "大晴 · 满格状态",
    title: "全月高光 · 精力拉满",
    stealthTitle: "高能晴朗日",
    battery: "100%",
    waveLevel: 168
  },
  autumn: {
    key: "autumn",
    colorVar: "var(--season-autumn)",
    softVar: "var(--season-autumn-soft)",
    chip: "经前预警 · 敏感期",
    stealthChip: "多云 · 慢节奏",
    title: "经前预警 · 易燃易爆炸",
    stealthTitle: "微风多云日",
    battery: "45%",
    waveLevel: 152
  }
};

const COMPANION_COPY = {
  name: "手帐搭子",
  avatar: "搭",
  defaultTag: "今日悄悄话",
  reactTag: "接住你啦",
  hugTitle: "给你兜底的一句话",
  lateHint: d => `它晚点了 ${d} 天，先别慌呀，最近是不是太累或熬夜了？身体偶尔会踩一下刹车。`,
  startToast: "记好啦，这几天什么都别硬撑，慢慢来。",
  endToast: "好耶，这趟顺利度过啦，准备慢慢回血！",
  seasons: {
    winter: {
      greeting: "今天电量本来就低，只想发呆、不想回消息都特别正常。把暖贴和热饮放手边，允许自己当一天咸鱼。",
      work: "不用逼自己冲刺，挑几件轻松的收尾活做完就行，难啃的事可以留到下周。",
      sport: "暂停蹦跳和卷腹，散散步、伸个懒腰，或者早点钻进被窝最舒服。",
      hug: "现在身体正在悄悄换新，反应变慢一点不是偷懒，是身体在温柔地喊你慢下来。"
    },
    spring: {
      greeting: "最难熬的几天翻篇啦！是不是觉得脑子轻快了不少？趁这股顺风去做件自己一直想做的小事吧。",
      work: "好奇心和专注力都在回来，开新坑、整理计划、约想见的朋友都很合适。",
      sport: "体力和恢复力都在悄悄涨回来，慢跑、普拉提、快走都能安排得挺舒服。",
      hug: "水肿在消，气色也在变亮。不用赶进度，顺着这几天的好状态轻盈地往前走就好。"
    },
    summer: {
      greeting: "这几天是你整个月里底气最足的高光时刻，气色和表达欲都在线，大胆去发光吧。",
      work: "重要的汇报、面试、谈条件或约会放这几天超加分，你说话会比平时更有感染力。",
      sport: "状态满格，喜欢流汗的话可以小冲一下，记得多补水、也别把日程塞得太满。",
      hug: "如果偶尔觉得单侧小腹微微发闷，大多是排卵的小信号，放宽心，身体在好好工作呢。"
    },
    autumn: {
      greeting: "快到日子啦，这两天觉得烦、想吃甜食、看啥都不顺眼，真的不是你矫情，是激素在退潮。",
      work: "对噪音和细节更敏感，适合戴上耳机安安静静收尾，少管闲事、少做冲动决定。",
      sport: "比平时更容易累和喘，把高强度换成拉伸或散步就好，绝不要责怪自己体力下降。",
      hug: "今天如果突然很委屈或者只想吃碳水，请把锅大大方方扣给激素。早点睡，明天会松快很多。"
    }
  }
};

// 点胶囊后的温柔体贴即时回应（多条轮换，不重样）
const SYMPTOM_REPLIES = {
  pain_cramps_heavy: [
    "抱抱你，痛到难受千万别硬扛，布洛芬配温水、暖宝宝贴好，今天什么都不做也没关系。",
    "辛苦了，小腹发紧的时候可以蜷着侧躺一会儿，或者点上面「有点难受」跟着缓口气。"
  ],
  pain_cramps_mild: [
    "小腹坠坠的时候最磨人了，把脚踝和肚子捂暖一点，少喝冰的会舒服不少。",
    "收到信号啦，今天走路慢一点、别久站，晚上回家泡个热水脚吧。"
  ],
  body_backache: ["腰酸真的太消耗人了，找个靠垫垫在后腰，隔着衣服贴片暖贴在腰眼超管用。"],
  body_breast: ["胸胀敏感的时候，回家第一件事就是换上最松软的无钢圈内衣，给身体松松绑。"],
  body_headache: ["头胀的时候屏幕亮度调低一点，闭眼深呼吸一分钟，喝口温水慢慢缓一缓。"],
  body_acne: ["下巴冒痘大多是周期前的小波动，千万别手痒去挤，早睡两天它自己会乖乖消下去。"],
  body_bloating: ["这几天身体会多存一点水，体重涨一两斤都是假象！明天少吃点重盐，过两天秒消。"],
  body_insomnia: ["没睡好会放大所有疲惫，今天中午哪怕趴十分钟闭闭眼，也是在给大脑充电。"],
  mood_tired: ["电量只剩 20% 啦，开启省电模式吧！今天能点外卖就不做饭，能躺着绝不坐着。"],
  mood_irritable: [
    "烦躁是身体在拉警报呢，不用逼自己当情绪稳定的大人，今天戴上耳机离吵闹远一点。",
    "想发火很正常，把想骂的话丢进工具箱的「情绪树洞」冲进海里，别憋着自己。"
  ],
  mood_sad: [
    "想哭就哭一会儿吧，眼泪能帮身体把多余的压力排出去。你已经很努力了，今天我站在你这边。",
    "委屈的时候别急着振作，抱抱自己，点一杯热的甜饮，天黑了就早点钻被窝。"
  ],
  mood_craving: [
    "不是你嘴馋，是激素在提醒你补点快乐因子。去买杯热饮或小蛋糕吧，今天免责！",
    "想吃碳水就大大方方吃，温热的红豆汤、烤红薯或热奶茶，开心比热量表重要。"
  ],
  mood_focus: ["脑子超清晰的一天！趁灵感在线把最想搞定的事一鼓作气拿下，晚上记得犒劳自己。"],
  mood_calm: ["平静松弛的普通一天，其实最珍贵啦。祝你今天顺顺当当，微风正好。"],
  med_painkiller: ["按时吃止痛药是对自己负责，别有心理负担。配温水，等药效上来好好歇一会儿。"],
  med_iron: ["暖暖的舒服多啦，记得隔着衣服贴防低温烫伤，手边再放杯温水。"]
};

// 今日生存小票 2 种温暖语气（温柔体贴风 / 轻松俏皮风）
const RECEIPT_COPY = {
  winter: {
    gentle: {
      title: "温柔照顾清单 · 经期休整",
      quote: "她这几天电量只剩 20%，身体正在悄悄换新，比平时更容易累和怕冷。",
      feeding: "热红豆汤、温热鲜奶、烤红薯、清淡热汤面",
      dos: "顺手接管洗碗和跑腿、准备暖水袋、安安静静抱一抱",
      donts: "别敷衍说“多喝热水”、别催赶时间、别在这几天争论复杂问题"
    },
    witty: {
      title: "暖心渡劫小票 · 掉血期",
      quote: "温馨播报：正在经历每月一次的物理掉血，今天体力值偏低，急需温柔投喂和抱抱。",
      feeding: "热奶茶、布洛芬、热腾腾外卖、搞笑下饭视频",
      dos: "默默递上暖贴和热饮、顺手拿快递和洗碗、夸她今天也很可爱",
      donts: "别讲大道理、别惹毛、别建议“去跑两圈就好了”"
    }
  },
  spring: {
    gentle: {
      title: "温柔约会清单 · 回血期",
      quote: "难熬的几天终于翻篇啦，她的精力和好心情正在一点点涨回来。",
      feeding: "清爽沙拉、新开的咖啡馆、一起探一家没吃过的小店",
      dos: "约她散步拍照、聊聊周末小计划、认真听她的新想法",
      donts: "别扫兴泼冷水，这几天是她最有干劲的时候"
    },
    witty: {
      title: "满血回春小票 · 复活中",
      quote: "渡劫成功！已从咸鱼形态切换回元气模式，现限时开放约饭散步名额。",
      feeding: "火锅、小甜品、喜欢喝的咖啡终于可以安排啦",
      dos: "约逛街、看电影、一起干点新鲜好玩的事",
      donts: "别浪费这几天难得的好心情呀"
    }
  },
  summer: {
    gentle: {
      title: "高光闪耀清单 · 精力满格",
      quote: "这是她一个月里状态最好、表达欲最旺的几天，气色和自信都在线。",
      feeding: "浪漫晚餐、清爽果茶、一顿有仪式感的大餐",
      dos: "真诚夸赞她的状态、安排约会或深度聊天、如非备孕务必做好保护",
      donts: "别敷衍她的分享欲，也别在安全措施上掉链子"
    },
    witty: {
      title: "限时闪耀小票 · 高光期",
      quote: "全月精力与气场最在线的黄金几天！适合安排浪漫约会和拍美美的照片。",
      feeding: "漂亮饭 + 饭后小甜水",
      dos: "真诚夸夸、一起去好玩的地方、安全措施记牢",
      donts: "别敷衍，也别忘了做好防护哦"
    }
  },
  autumn: {
    gentle: {
      title: "温柔预警清单 · 经前黄体期",
      quote: "离大姨妈很近啦，这几天她容易累、想吃甜食、情绪也更敏感，需要多一点偏爱。",
      feeding: "热可可、小蛋糕、烤红薯、一切能带来安全感的碳水",
      dos: "先拥抱再说话、给她独处和早睡的空间、备好小零食",
      donts: "千万别把情绪波动说成“无理取闹”、别挑起敏感争吵"
    },
    witty: {
      title: "顺毛预警小票 · 经前敏感期",
      quote: "体内快乐激素正在悄悄滑坡，前一秒想吃甜食后一秒有点委屈，错在激素不在她呀。",
      feeding: "甜食、热汤、小蛋糕，一切暖呼呼的投喂",
      dos: "温柔顺毛、坚定站她这边、主动递上小零食和拥抱",
      donts: "别讲道理、别挑刺、别追问“怎么突然不开心”"
    }
  }
};

let replyPickCounter = 0;
function pickSymptomReply(tagId) {
  const list = SYMPTOM_REPLIES[tagId];
  if (!list || !list.length) return null;
  replyPickCounter = (replyPickCounter + 1) % 997;
  return list[replyPickCounter % list.length];
}

function createDefaultState() {
  const todayStr = toDateStr(new Date());
  const c1Start = addDays(todayStr, -18);
  const c2Start = addDays(c1Start, -29);
  const c3Start = addDays(c2Start, -28);
  const c4Start = addDays(c3Start, -31);
  const c5Start = addDays(c4Start, -28);

  const logs = {};
  logs[c1Start] = { tags: ["flow_medium", "pain_cramps_mild", "med_iron"], note: "第一天有点腰酸，贴了暖宝宝舒服很多。" };
  logs[addDays(c1Start, 1)] = { tags: ["flow_heavy", "pain_cramps_heavy", "med_painkiller", "mood_tired"], note: "第二天量最大，吃了止痛药早点躺平了。" };
  logs[addDays(c1Start, -2)] = { tags: ["mood_craving", "body_backache"], note: "突然超级想喝热奶茶。" };
  logs[addDays(c2Start, -2)] = { tags: ["mood_craving", "mood_irritable"], note: "看啥都有点烦，买了块小蛋糕哄自己。" };
  logs[addDays(c2Start, 1)] = { tags: ["flow_heavy", "pain_cramps_mild", "body_backache"], note: "" };
  logs[c3Start] = { tags: ["flow_medium", "body_headache"], note: "" };
  logs[todayStr] = { tags: ["mood_craving", "body_breast"], note: "下午好想喝热红豆汤，今晚十点半准备上床。" };

  return {
    settings: {
      defaultCycleLen: 29,
      defaultPeriodLen: 5,
      camouflageMode: false,
      hideIntimateTags: false,
      partnerTone: "gentle",
      persona: "gentle",
      theme: "paper"
    },
    cycles: [
      { id: "c5", startDate: c5Start, endDate: addDays(c5Start, 4), excluded: false },
      { id: "c4", startDate: c4Start, endDate: addDays(c4Start, 5), excluded: false },
      { id: "c3", startDate: c3Start, endDate: addDays(c3Start, 4), excluded: false },
      { id: "c2", startDate: c2Start, endDate: addDays(c2Start, 4), excluded: false },
      { id: "c1", startDate: c1Start, endDate: addDays(c1Start, 4), excluded: false }
    ],
    logs,
    events: [
      { id: "ev_demo_1", name: "周末短途看海", date: addDays(todayStr, 12), checkedItems: [] },
      { id: "ev_demo_2", name: "重要考试 / 汇报", date: addDays(todayStr, 25), checkedItems: [] }
    ],
    doctorQuestions: [DOCTOR_QUESTIONS[0]],
    isDemoData: true
  };
}

function normalizeState(raw) {
  const base = createDefaultState();
  if (!raw || !Array.isArray(raw.cycles) || !raw.settings) return base;
  const merged = {
    settings: { ...base.settings, ...raw.settings },
    cycles: raw.cycles,
    logs: raw.logs && typeof raw.logs === "object" ? raw.logs : {},
    events: Array.isArray(raw.events) ? raw.events : base.events,
    doctorQuestions: Array.isArray(raw.doctorQuestions) ? raw.doctorQuestions : base.doctorQuestions,
    isDemoData: typeof raw.isDemoData === "boolean" ? raw.isDemoData : false
  };
  // 兼容旧版 partnerTone / persona 值
  if (!["gentle", "witty"].includes(merged.settings.partnerTone)) {
    merged.settings.partnerTone = "gentle";
  }
  merged.settings.persona = "gentle";
  if (!["paper", "sage", "midnight"].includes(merged.settings.theme)) {
    merged.settings.theme = "paper";
  }
  return merged;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = createDefaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return normalizeState(JSON.parse(raw));
  } catch (e) {
    return createDefaultState();
  }
}

let appState = loadState();
let selectedDateStr = toDateStr(new Date());
let calendarViewDate = new Date();
let selectedEventId = appState.events[0]?.id || null;
let lastCompanionOverride = null; // 点击胶囊后的即时对话反馈
let waveHoverRatio = null;
let isCalendarPaintMode = false;
let editingCycleId = null;
let retroSelectedDur = 5;

let activeMobileSheet = null;
const MOBILE_MQ = window.matchMedia("(max-width: 839px)");
const TOOLKIT_SHEET_TITLES = {
  "sub-cards": ["今日生存小票", "存成小票图直接甩微信，或下滑保存月度切片海报"],
  "sub-relief": ["电子布洛芬急救角", "跟着圆球 4-7-8 放松呼吸，或把坏情绪丢进海里"],
  "sub-events": ["未来大事记撞期", "记下重要日子，提前看当天状态与打包清单"],
  "sub-doctor": ["妇科门诊看病小抄", "白底大字清清楚楚，直接递给医生看或存成图"]
};

function getWeekDates(anchorDateStr) {
  const dt = parseDateStr(anchorDateStr);
  const offsetToMon = (dt.getDay() + 6) % 7;
  const monStr = addDays(anchorDateStr, -offsetToMon);
  return Array.from({ length: 7 }, (_, i) => addDays(monStr, i));
}

function renderMobileWeekStrip(stats, stealth) {
  const grid = document.getElementById("mobileWeekGrid");
  if (!grid) return;
  const todayStr = toDateStr(new Date());
  const weekDates = getWeekDates(todayStr);
  const wdNames = ["一", "二", "三", "四", "五", "六", "日"];
  const [y, m] = todayStr.split("-").map(Number);
  const monthEl = document.getElementById("mobileWeekMonth");
  if (monthEl) monthEl.textContent = `${y}年 ${m}月`;

  grid.innerHTML = weekDates
    .map((dateStr, idx) => {
      const dayNum = Number(dateStr.split("-")[2]);
      const phase = getCalendarDayPhase(dateStr, stats);
      const log = appState.logs[dateStr];
      const hasLog = log && ((log.tags && log.tags.length) || (log.note && log.note.trim()));
      const cls = ["week-day-btn"];
      if (dateStr === todayStr) cls.push("is-today");
      if (dateStr === selectedDateStr) cls.push("is-selected");
      if (phase.type === "period") cls.push("is-period");
      else if (phase.type === "predicted-period") cls.push("is-predicted");
      else if (phase.type === "ovulation") cls.push("is-ovulation");
      return `
        <button type="button" class="${cls.join(" ")}" data-week-date="${dateStr}" aria-label="${formatCNDate(dateStr)}">
          <span class="week-day-wd">${wdNames[idx]}</span>
          <span class="week-day-num">${dayNum}</span>
          ${hasLog ? '<span class="week-day-dot" aria-hidden="true"></span>' : ""}
        </button>
      `;
    })
    .join("");

  const logBtnTxt = document.getElementById("mobileLogBtnText");
  if (logBtnTxt) {
    logBtnTxt.textContent = selectedDateStr === todayStr
      ? (stealth ? "记一下体感" : "记一下今天")
      : `记 ${formatCNDate(selectedDateStr)}`;
  }
}

function openMobileSheet(sheetId, subTabId = null) {
  if (!MOBILE_MQ.matches) {
    if (sheetId.startsWith("tab-")) switchMainTab(sheetId);
    if (subTabId) switchSubTab(subTabId);
    return;
  }
  if (subTabId) switchSubTab(subTabId);
  activeMobileSheet = sheetId;
  document.querySelectorAll(".mobile-sheet").forEach(el => {
    el.classList.toggle("sheet-open", el.id === sheetId);
  });
  document.getElementById("mobileSheetScrim")?.classList.add("open");
  document.body.classList.add("has-open-sheet");
  syncMobileDockActive();
}

function closeMobileSheet() {
  activeMobileSheet = null;
  document.querySelectorAll(".mobile-sheet.sheet-open").forEach(el => el.classList.remove("sheet-open"));
  document.getElementById("mobileSheetScrim")?.classList.remove("open");
  document.body.classList.remove("has-open-sheet");
  syncMobileDockActive();
}

function syncMobileDockActive() {
  const activeSub = document.querySelector(".subtab-btn.active")?.getAttribute("data-subtab");
  document.querySelectorAll(".mobile-bottom-nav .mnav-btn").forEach(btn => {
    const targetSheet = btn.getAttribute("data-open-sheet");
    const targetSub = btn.getAttribute("data-open-subtab");
    const on = Boolean(activeMobileSheet) && targetSheet === activeMobileSheet && (
      !targetSub ||
      targetSub === activeSub ||
      (targetSub === "sub-events" && (activeSub === "sub-events" || activeSub === "sub-doctor"))
    );
    btn.classList.toggle("active", on);
  });
}

function findCycleContainingDate(dateStr, cycles, defaultPeriodLen) {
  for (const c of cycles) {
    const end = c.endDate || addDays(c.startDate, defaultPeriodLen - 1);
    if (dateStr >= c.startDate && dateStr <= end) return { ...c, endDate: end };
  }
  return null;
}

// 写入或修改周期并自动合并重叠/相连的经期段，避免产生脏数据
function upsertCycleMerged(state, { id = null, startDate, endDate, excluded = false }) {
  const defaultPeriod = Number(state.settings.defaultPeriodLen) || 5;
  const safeEnd = endDate && endDate >= startDate ? endDate : startDate;
  const nextList = state.cycles
    .filter(c => !id || c.id !== id)
    .map(c => ({ ...c, endDate: c.endDate || addDays(c.startDate, defaultPeriod - 1) }));

  nextList.push({
    id: id || "c_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    startDate,
    endDate: safeEnd,
    excluded: Boolean(excluded)
  });

  nextList.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const merged = [];
  for (const c of nextList) {
    const prev = merged[merged.length - 1];
    if (prev && c.startDate <= addDays(prev.endDate, 1)) {
      if (c.endDate > prev.endDate) prev.endDate = c.endDate;
      prev.excluded = Boolean(prev.excluded || c.excluded);
    } else {
      merged.push(c);
    }
  }
  state.cycles = merged;
  state.isDemoData = false;
}

// 日历单日点选涂色：标上自动连片合并，取消自动裁剪或拆分
function togglePeriodDay(state, dateStr) {
  const defaultPeriod = Number(state.settings.defaultPeriodLen) || 5;
  const normalized = state.cycles
    .map(c => ({ ...c, endDate: c.endDate || addDays(c.startDate, defaultPeriod - 1) }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const hitIdx = normalized.findIndex(c => dateStr >= c.startDate && dateStr <= c.endDate);
  if (hitIdx >= 0) {
    const hit = normalized[hitIdx];
    normalized.splice(hitIdx, 1);
    if (hit.startDate !== hit.endDate) {
      if (dateStr === hit.startDate) {
        normalized.push({ ...hit, startDate: addDays(dateStr, 1) });
      } else if (dateStr === hit.endDate) {
        normalized.push({ ...hit, endDate: addDays(dateStr, -1) });
      } else {
        normalized.push({ ...hit, endDate: addDays(dateStr, -1) });
        normalized.push({
          id: "c_" + Date.now() + "_s",
          startDate: addDays(dateStr, 1),
          endDate: hit.endDate,
          excluded: hit.excluded
        });
      }
    }
    state.cycles = normalized.sort((a, b) => a.startDate.localeCompare(b.startDate));
    state.isDemoData = false;
    return "removed";
  }

  state.cycles = normalized;
  upsertCycleMerged(state, { startDate: dateStr, endDate: dateStr, excluded: false });
  return "added";
}

function saveState(toastMsg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  renderAll();
  if (toastMsg) showToast(toastMsg);
}

function showToast(msg) {
  const el = document.getElementById("toastEl");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

// ==================== 核心周期预测与波浪曲线数学 ====================
function computeCycleStats(state) {
  const sorted = [...state.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const defaultCycle = Number(state.settings.defaultCycleLen) || 29;
  const defaultPeriod = Number(state.settings.defaultPeriodLen) || 5;

  const lengths = [];
  const durations = [];
  const historyRows = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const dur = cur.endDate ? Math.max(1, diffDays(cur.endDate, cur.startDate) + 1) : defaultPeriod;
    durations.push(dur);

    let cycleLen = null;
    if (i < sorted.length - 1) {
      cycleLen = diffDays(sorted[i + 1].startDate, cur.startDate);
      if (!cur.excluded && cycleLen >= 16 && cycleLen <= 65) lengths.push(cycleLen);
    }
    historyRows.push({ ...cur, duration: dur, cycleLen });
  }

  const avgCycleLen = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : defaultCycle;
  const avgPeriodLen = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : defaultPeriod;

  const minCycle = lengths.length ? Math.min(...lengths) : avgCycleLen - 1;
  const maxCycle = lengths.length ? Math.max(...lengths) : avgCycleLen + 1;
  const variation = lengths.length >= 2 ? maxCycle - minCycle : 2;

  const todayStr = toDateStr(new Date());
  const latestCycle = sorted[sorted.length - 1] || null;
  const lmpDate = latestCycle ? latestCycle.startDate : todayStr;
  const cycleDay = Math.max(1, diffDays(todayStr, lmpDate) + 1);

  const nextPredCenter = addDays(lmpDate, avgCycleLen);
  const spread = Math.max(1, Math.min(3, Math.round(variation / 2)));
  const nextPredStart = addDays(nextPredCenter, -spread);
  const nextPredEnd = addDays(nextPredCenter, spread);
  const ovulationDayNum = Math.max(avgPeriodLen + 3, avgCycleLen - 14);
  const seasonInfo = getSeasonForDay(cycleDay, avgPeriodLen, ovulationDayNum, avgCycleLen);

  return {
    sortedCycles: sorted,
    historyRows, // 按时间顺序（从早到晚）展示
    avgCycleLen,
    avgPeriodLen,
    minCycle,
    maxCycle,
    variation,
    spread,
    lmpDate,
    cycleDay,
    nextPredCenter,
    nextPredStart,
    nextPredEnd,
    ovulationDayNum,
    seasonInfo
  };
}

function getSeasonForDay(dayNum, periodLen, ovulationDayNum, avgCycleLen) {
  const effectiveDay = ((dayNum - 1) % Math.max(21, avgCycleLen)) + 1;
  if (effectiveDay <= periodLen) return SEASON_META.winter;
  if (effectiveDay < ovulationDayNum - 2) return SEASON_META.spring;
  if (effectiveDay <= ovulationDayNum + 2) return SEASON_META.summer;
  return SEASON_META.autumn;
}

function isDateInLoggedPeriod(dateStr, cycles, defaultPeriodLen) {
  for (const c of cycles) {
    const end = c.endDate || addDays(c.startDate, defaultPeriodLen - 1);
    if (dateStr >= c.startDate && dateStr <= end) return true;
  }
  return false;
}

function getFutureDatePrediction(dateStr, stats) {
  const daysFromLmp = diffDays(dateStr, stats.lmpDate);
  if (daysFromLmp < 0) return { type: "past", modDay: 1, season: SEASON_META.spring };
  const cycleLen = stats.avgCycleLen;
  const modDay = (daysFromLmp % cycleLen) + 1;
  const isFuture = dateStr > toDateStr(new Date());

  const isPredictedPeriod =
    isFuture && daysFromLmp >= cycleLen - 1 && (modDay <= stats.avgPeriodLen || modDay === cycleLen);
  const isOvulationWindow =
    modDay >= stats.ovulationDayNum - 2 && modDay <= stats.ovulationDayNum + 2;
  const season = getSeasonForDay(modDay, stats.avgPeriodLen, stats.ovulationDayNum, cycleLen);

  return {
    type: isPredictedPeriod ? "predicted-period" : isOvulationWindow ? "ovulation" : "normal",
    modDay,
    season
  };
}

// 精确计算日历中任意一天的生理分期（支持历史周期间隔与当前/未来周期：生理期 / 预计经期 / 卵泡期 / 排卵期 / 黄体期）
function getCalendarDayPhase(dateStr, stats) {
  const cycles = stats.sortedCycles;
  if (!cycles.length) return { type: "none", season: null, cycleHit: null };

  const cycleHit = findCycleContainingDate(dateStr, cycles, stats.avgPeriodLen);
  if (cycleHit) return { type: "period", season: SEASON_META.winter, cycleHit };

  if (dateStr < cycles[0].startDate) return { type: "none", season: null, cycleHit: null };

  // 位于两次已记录经期之间的过去日期：按该次真实周期间隔推算卵泡期 / 排卵期 / 黄体期
  for (let i = 0; i < cycles.length - 1; i++) {
    const cur = cycles[i];
    const next = cycles[i + 1];
    if (dateStr > cur.startDate && dateStr < next.startDate) {
      const cycleLen = Math.max(18, diffDays(next.startDate, cur.startDate));
      const periodEnd = cur.endDate || addDays(cur.startDate, stats.avgPeriodLen - 1);
      const periodDur = Math.max(1, diffDays(periodEnd, cur.startDate) + 1);
      const dayNum = diffDays(dateStr, cur.startDate) + 1;
      const ovDay = Math.max(periodDur + 3, cycleLen - 14);
      if (dayNum < ovDay - 2) return { type: "follicular", season: SEASON_META.spring, cycleHit: null };
      if (dayNum <= ovDay + 2) return { type: "ovulation", season: SEASON_META.summer, cycleHit: null };
      return { type: "luteal", season: SEASON_META.autumn, cycleHit: null };
    }
  }

  // 当前周期及未来预测日期
  const pred = getFutureDatePrediction(dateStr, stats);
  if (pred.type === "predicted-period") return { type: "predicted-period", season: SEASON_META.winter, cycleHit: null };
  if (pred.season.key === "spring") return { type: "follicular", season: SEASON_META.spring, cycleHit: null };
  if (pred.season.key === "summer") return { type: "ovulation", season: SEASON_META.summer, cycleHit: null };
  return { type: "luteal", season: SEASON_META.autumn, cycleHit: null };
}

// 精力值与敏感度连续曲线函数（保证曲线路径与游标圆点 100% 精准贴合）
function evalWaveY(ratio) {
  const r = Math.min(1, Math.max(0, ratio));
  // 精力曲线（雌激素趋势）：排卵附近(0.46)最高，黄体中段(0.75)小回弹，经期低谷
  const energyNorm =
    0.16 +
    0.78 * Math.exp(-Math.pow((r - 0.45) / 0.16, 2)) +
    0.30 * Math.exp(-Math.pow((r - 0.76) / 0.14, 2));
  // 敏感度/想躺平曲线（孕酮/经前情绪波动）：黄体期(0.76)高企，临近来潮陡降
  const sensNorm =
    0.14 +
    0.78 * Math.exp(-Math.pow((r - 0.77) / 0.16, 2)) +
    0.18 * Math.exp(-Math.pow((r - 0.06) / 0.09, 2));

  const yEnergy = 78 - Math.min(1, energyNorm) * 62;
  const ySens = 78 - Math.min(1, sensNorm) * 60;
  return { yEnergy, ySens };
}

function buildWavePaths() {
  const steps = 48;
  const ePts = [];
  const sPts = [];
  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    const x = +(r * 400).toFixed(1);
    const { yEnergy, ySens } = evalWaveY(r);
    ePts.push(`${x},${yEnergy.toFixed(1)}`);
    sPts.push(`${x},${ySens.toFixed(1)}`);
  }
  const energyLine = `M ${ePts.join(" L ")}`;
  const energyArea = `${energyLine} L 400,88 L 0,88 Z`;
  const sensLine = `M ${sPts.join(" L ")}`;
  return { energyLine, energyArea, sensLine };
}

// 自动发现个人身体小规律（纯本地统计，关联经前 1~4 天与经期第 1~2 天的高频信号）
function discoverPersonalInsight(state, stats) {
  const labelMap = {};
  const intimateIds = new Set();
  SYMPTOM_GROUPS.forEach(g =>
    g.items.forEach(it => {
      labelMap[it.id] = it.label;
      if (g.intimate) intimateIds.add(it.id);
    })
  );

  const preCounts = {};
  const periodCounts = {};
  const starts = stats.sortedCycles.map(c => c.startDate);

  Object.entries(state.logs || {}).forEach(([dateStr, log]) => {
    const tags = (log.tags || []).filter(t => !intimateIds.has(t));
    if (!tags.length) return;
    for (const sDate of starts) {
      const d = diffDays(dateStr, sDate);
      if (d >= -4 && d <= -1) {
        tags.forEach(t => { preCounts[t] = (preCounts[t] || 0) + 1; });
      } else if (d >= 0 && d <= 2) {
        tags.forEach(t => { periodCounts[t] = (periodCounts[t] || 0) + 1; });
      }
    }
  });

  const topPre = Object.entries(preCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topPeriod = Object.entries(periodCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);

  if (topPre.length) {
    const names = topPre.map(([id]) => `「${labelMap[id] || id}」`).join(" 和 ");
    return `翻了翻你之前的记录，发现一个专属小规律：你通常在来之前 1~4 天容易出现 ${names}。下次同时遇到它们，记得包里顺手塞一片卫生巾、早点休息哦。`;
  }
  if (topPeriod.length) {
    const names = topPeriod.map(([id]) => `「${labelMap[id] || id}」`).join("、");
    return `从你之前的记录来看，刚来的前两天最常出现 ${names}，下次快到窗口期时提前备好暖贴和止痛药会安心很多。`;
  }
  return null;
}

// 隐私脱敏月度身体切片数据（绝不包含具体日期与私密/用药标签）
function getMonthlySliceData(state, stats) {
  const intimateIds = new Set();
  const labelMap = {};
  SYMPTOM_GROUPS.forEach(g =>
    g.items.forEach(it => {
      labelMap[it.id] = it.label;
      if (g.intimate) intimateIds.add(it.id);
    })
  );

  const safeCounts = {};
  let logDays = 0;
  Object.values(state.logs || {}).forEach(log => {
    if ((log.tags && log.tags.length) || (log.note && log.note.trim())) logDays++;
    (log.tags || []).forEach(t => {
      if (!intimateIds.has(t) && !t.startsWith("flow_")) {
        safeCounts[t] = (safeCounts[t] || 0) + 1;
      }
    });
  });

  const topTags = Object.entries(safeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => labelMap[id] || id);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
  const quote = "“不是每天都要满格运转，允许自己跟着潮汐起伏，本身就是很棒的照顾。”";

  return {
    monthLabel,
    restDays: stats.avgPeriodLen,
    logDays,
    cycleDays: stats.avgCycleLen,
    topTags: topTags.length ? topTags : ["平静松弛", "好好睡觉"],
    quote
  };
}

// ==================== 全局渲染 ====================
function renderAll() {
  const stats = computeCycleStats(appState);
  const stealth = Boolean(appState.settings.camouflageMode);
  const theme = appState.settings.theme || "paper";

  // 主题与季节强调色（写在 body 上，确保跟随 data-theme="midnight" 解析深色变量）
  document.body.setAttribute("data-theme", theme);
  document.body.classList.toggle("stealth-mode", stealth);
  document.body.style.setProperty("--active-season", stats.seasonInfo.colorVar);
  document.body.style.setProperty("--active-season-soft", stats.seasonInfo.softVar);

  const themeColors = { paper: "#FAF6F0", sage: "#F3F6F2", midnight: "#12151C" };
  document.getElementById("metaThemeColor")?.setAttribute("content", themeColors[theme] || "#FAF6F0");

  // 顶部栏
  document.getElementById("brandTitle").textContent = stealth ? "晴雨手帐" : "潮汐历";
  document.getElementById("brandSubtitle").textContent = stealth
    ? "每日天气与精力小记"
    : "只存你设备里的小手帐";

  document.getElementById("stealthBtn").classList.toggle("active", stealth);
  const stealthText = document.getElementById("stealthBtnText");
  if (stealthText) stealthText.textContent = stealth ? "已防窥" : "防窥";

  const demoBar = document.getElementById("demoNoticeBar");
  if (demoBar) demoBar.style.display = appState.isDemoData ? "flex" : "none";

  renderTodayTab(stats, stealth);
  renderMobileWeekStrip(stats, stealth);
  renderPersonalInsightCard(stats, stealth);
  renderCapsuleLogger(stealth);
  renderCalendarTab(stats, stealth);
  renderToolkitTab(stats, stealth);
  renderMineTab(stealth, theme);
}

function renderPersonalInsightCard(stats, stealth) {
  const card = document.getElementById("personalInsightCard");
  if (!card) return;
  if (stealth) {
    card.style.display = "none";
    return;
  }
  const insight = discoverPersonalInsight(appState, stats);
  if (!insight) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  card.innerHTML = `
    <div class="insight-banner-head">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>
      <span>我发现你的一个小规律</span>
    </div>
    <p>${escapeHtml(insight)}</p>
  `;
}

function renderTodayTab(stats, stealth) {
  const s = stats.seasonInfo;
  const p = COMPANION_COPY;
  const pSeason = p.seasons[s.key] || p.seasons.winter;
  document.getElementById("currentPhaseChip").textContent = stealth ? s.stealthChip : s.chip;

  const regText =
    stats.variation <= 3
      ? `最近挺规律 · 误差±${stats.spread}天`
      : stats.variation <= 7
        ? `节奏还挺稳 · 误差±${stats.spread}天`
        : `最近有波动 · 按±${stats.spread}天估`;
  document.getElementById("regularityChip").textContent = regText;

  const todayStr = toDateStr(new Date());
  const todayInPeriod = isDateInLoggedPeriod(todayStr, stats.sortedCycles, stats.avgPeriodLen);
  const daysUntilNext = diffDays(stats.nextPredCenter, todayStr);
  const hasCycles = stats.sortedCycles.length > 0;

  document.getElementById("cycleDayLabel").textContent = !hasCycles
    ? "还没开始记录"
    : stealth
      ? "今日状态"
      : todayInPeriod
        ? "正在经期"
        : daysUntilNext < 0
          ? "已过预计日"
          : "距离下次";

  document.getElementById("cycleDayNum").textContent = !hasCycles
    ? "记一次吧"
    : todayInPeriod
      ? (stealth ? `小雨第 ${stats.cycleDay} 天` : `第 ${stats.cycleDay} 天`)
      : daysUntilNext > 0
        ? `还有 ${daysUntilNext} 天`
        : daysUntilNext === 0
          ? "就在这两天"
          : `晚了 ${Math.abs(daysUntilNext)} 天`;

  document.getElementById("compassPhaseTitle").textContent = !hasCycles
    ? "点下面「补记/改日期」录入上一次"
    : stealth
      ? s.stealthTitle
      : s.title;

  const nextHintEl = document.getElementById("compassNextHint");
  if (!hasCycles) {
    nextHintEl.textContent = "录完最近 1~2 次就能自动推算";
  } else if (todayInPeriod) {
    const leftDays = Math.max(0, stats.avgPeriodLen - stats.cycleDay);
    nextHintEl.textContent = leftDays > 0 ? `大概还有 ${leftDays} 天结束` : "快收尾啦，辛苦了";
  } else if (daysUntilNext > 0) {
    nextHintEl.innerHTML = stealth
      ? `周期第 ${stats.cycleDay} 天`
      : `周期第 ${stats.cycleDay} 天<br><span style="white-space:nowrap;">预计 ${formatCNDate(stats.nextPredStart)} 前后</span>`;
  } else if (daysUntilNext === 0) {
    nextHintEl.textContent = stealth ? `周期第 ${stats.cycleDay} 天` : "包里记得顺手备一片";
  } else {
    nextHintEl.textContent = `周期第 ${stats.cycleDay} 天 · 先别慌`;
  }

  // 高亮 4 阶段一眼看懂进度条
  const stepNames = stealth
    ? { winter: "小雨", spring: "晴朗", summer: "大晴", autumn: "多云" }
    : { winter: "经期", spring: "回血期", summer: "高光日", autumn: "经前预警" };
  document.querySelectorAll("#phaseStepper .phase-step").forEach(el => {
    const ph = el.getAttribute("data-phase");
    el.classList.toggle("active", hasCycles && ph === s.key);
    const sp = el.querySelector("span");
    if (sp && stepNames[ph]) sp.textContent = stepNames[ph];
  });

  // 圆环与四季参考弧
  const C = 2 * Math.PI * 98; // 615.75
  const ratio = Math.min(1, Math.max(0.03, stats.cycleDay / stats.avgCycleLen));
  const ring = document.getElementById("cycleProgressRing");
  ring.setAttribute("stroke-dasharray", C.toFixed(2));
  ring.setAttribute("stroke-dashoffset", (C * (1 - ratio)).toFixed(2));

  const winterArc = C * (stats.avgPeriodLen / stats.avgCycleLen);
  document.getElementById("seasonArcWinter").setAttribute("stroke-dasharray", `${winterArc.toFixed(1)} ${C.toFixed(1)}`);
  const summerStart = (stats.ovulationDayNum - 2) / stats.avgCycleLen;
  const summerArc = C * (5 / stats.avgCycleLen);
  const summerEl = document.getElementById("seasonArcSummer");
  summerEl.setAttribute("stroke-dasharray", `${summerArc.toFixed(1)} ${C.toFixed(1)}`);
  summerEl.setAttribute("stroke-dashoffset", (-C * summerStart).toFixed(1));

  const angleRad = (ratio * 360 - 90) * (Math.PI / 180);
  const dot = document.getElementById("cycleDotIndicator");
  dot.setAttribute("cx", (120 + 98 * Math.cos(angleRad)).toFixed(1));
  dot.setAttribute("cy", (120 + 98 * Math.sin(angleRad)).toFixed(1));

  // 更新内圆水波高度
  const wy = s.waveLevel || 154;
  document.getElementById("tideWaveBack").setAttribute("d", `M 20,${wy} Q 70,${wy - 12} 120,${wy} T 220,${wy} T 320,${wy} L 320,220 L 20,220 Z`);
  document.getElementById("tideWaveFront").setAttribute("d", `M 20,${wy + 8} Q 70,${wy - 4} 120,${wy + 8} T 220,${wy + 8} T 320,${wy + 8} L 320,220 L 20,220 Z`);

  // 温柔搭子对话气泡（经期推迟时自动换成安抚话术）
  document.getElementById("companionAvatar").textContent = p.avatar;
  document.getElementById("companionName").textContent = p.name;
  document.getElementById("companionTag").textContent = lastCompanionOverride ? p.reactTag : p.defaultTag;
  const defaultGreeting = !todayInPeriod && daysUntilNext < 0
    ? p.lateHint(Math.abs(daysUntilNext))
    : pSeason.greeting;
  document.getElementById("companionMessage").textContent = lastCompanionOverride || defaultGreeting;

  // 主打卡按钮
  document.getElementById("quickBtnText").textContent = todayInPeriod
    ? stealth ? "今天放晴了（标记结束）" : "今天结束了"
    : stealth ? "记录今天开始下雨" : "今天来了";

  // 渲染互动波浪曲线
  const paths = buildWavePaths();
  document.getElementById("energyAreaPath").setAttribute("d", paths.energyArea);
  document.getElementById("energyLinePath").setAttribute("d", paths.energyLine);
  document.getElementById("sensitivityLinePath").setAttribute("d", paths.sensLine);
  updateWaveCursor(waveHoverRatio !== null ? waveHoverRatio : ratio, stats, stealth);

  // 今日贴心小贴士（随人设变化）
  document.getElementById("dailyGuideCards").innerHTML = `
    <div class="tip-card">
      <div class="tip-badge">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <div>
        <h4>今天适合怎么安排事</h4>
        <p>${escapeHtml(pSeason.work)}</p>
      </div>
    </div>
    <div class="tip-card">
      <div class="tip-badge" style="color: var(--season-spring);">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
      </div>
      <div>
        <h4>身体怎么动更舒服</h4>
        <p>${escapeHtml(pSeason.sport)}</p>
      </div>
    </div>
    <div class="tip-card highlight">
      <div class="tip-badge">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
      <div>
        <h4>${escapeHtml(p.hugTitle)}</h4>
        <p>${escapeHtml(pSeason.hug)}</p>
      </div>
    </div>
  `;
}

function updateWaveCursor(ratio, stats, stealth) {
  const clamped = Math.min(0.99, Math.max(0.01, ratio));
  const x = (clamped * 400).toFixed(1);
  const { yEnergy, ySens } = evalWaveY(clamped);

  const line = document.getElementById("hormoneCursorLine");
  line.setAttribute("x1", x);
  line.setAttribute("x2", x);

  const eDot = document.getElementById("energyCursorDot");
  eDot.setAttribute("cx", x);
  eDot.setAttribute("cy", yEnergy.toFixed(1));

  const sDot = document.getElementById("sensitivityCursorDot");
  sDot.setAttribute("cx", x);
  sDot.setAttribute("cy", ySens.toFixed(1));

  const previewDay = Math.max(1, Math.min(stats.avgCycleLen, Math.round(clamped * stats.avgCycleLen) || 1));
  const daySeason = getSeasonForDay(previewDay, stats.avgPeriodLen, stats.ovulationDayNum, stats.avgCycleLen);
  const label = document.getElementById("wavePreviewLabel");
  if (waveHoverRatio !== null) {
    label.textContent = `预览第 ${previewDay} 天 · ${stealth ? daySeason.stealthTitle : daySeason.title}`;
  } else {
    label.textContent = `现在在第 ${stats.cycleDay} 天 · 点按或滑动波浪可看每一天`;
  }
}

function renderCapsuleLogger(stealth) {
  const todayStr = toDateStr(new Date());
  const isToday = selectedDateStr === todayStr;
  document.getElementById("loggerCardTitle").textContent = stealth ? "今天天气和体感" : "今天感觉怎么样？";
  document.getElementById("selectedDateDisplay").innerHTML = isToday
    ? "正在记：今天（点完自动保存）"
    : `正在补记：${formatCNDate(selectedDateStr)} <button type="button" class="inline-today-link" id="loggerBackTodayBtn">回到今天</button>`;

  const hideIntimate = Boolean(appState.settings.hideIntimateTags);
  document.getElementById("toggleIntimateTagsBtn").textContent = hideIntimate ? "显示私密项" : "隐藏私密项";

  const dayLog = appState.logs[selectedDateStr] || { tags: [], note: "" };
  const activeTags = new Set(dayLog.tags || []);

  document.getElementById("capsuleGroupsContainer").innerHTML = SYMPTOM_GROUPS.filter(
    g => !(hideIntimate && g.intimate)
  )
    .map(group => {
      const title = stealth ? group.stealthTitle : group.title;
      const btns = group.items
        .map(it => {
          const on = activeTags.has(it.id);
          return `<button type="button" class="capsule-btn ${on ? "selected" : ""}" data-tag-id="${it.id}">${escapeHtml(stealth ? it.stealth : it.label)}</button>`;
        })
        .join("");
      return `<div><div class="symptom-group-title">${escapeHtml(title)}</div><div class="capsule-grid">${btns}</div></div>`;
    })
    .join("");

  const noteInput = document.getElementById("dailyNoteInput");
  if (document.activeElement !== noteInput) {
    noteInput.value = dayLog.note || "";
  }
}

// ==================== Tab 2: 日历与原地日期抽屉 ====================
function renderCalendarTab(stats, stealth) {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById("calendarMonthTitle").textContent = `${year}年 ${month + 1}月`;
  document.getElementById("legendPeriodText").textContent = stealth ? "小雨日" : "生理期";
  document.getElementById("legendPredText").textContent = stealth ? "预计变天" : "预计经期";
  const follLegend = document.getElementById("legendFollText");
  const goldLegend = document.getElementById("legendGoldText");
  const lutealLegend = document.getElementById("legendLutealText");
  if (follLegend) follLegend.textContent = stealth ? "晴朗日" : "卵泡期";
  if (goldLegend) goldLegend.textContent = stealth ? "大晴日" : "排卵期";
  if (lutealLegend) lutealLegend.textContent = stealth ? "多云日" : "黄体期";

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(new Date());
  const eventDates = new Set((appState.events || []).map(e => e.date));

  // 点选涂色模式状态栏
  const calCard = document.querySelector(".calendar-card");
  calCard?.classList.toggle("is-paint-mode", isCalendarPaintMode);
  const paintBtn = document.getElementById("togglePaintModeBtn");
  paintBtn?.classList.toggle("active", isCalendarPaintMode);
  const paintBtnTxt = document.getElementById("paintModeBtnText");
  if (paintBtnTxt) paintBtnTxt.textContent = isCalendarPaintMode ? "正在点选经期中…" : "点选日历标/改经期";
  const paintHint = document.getElementById("paintHintBar");
  if (paintHint) paintHint.style.display = isCalendarPaintMode ? "flex" : "none";

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(`<div class="cal-day empty"></div>`);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const phase = getCalendarDayPhase(dateStr, stats);
    const cycleHit = phase.cycleHit;
    const log = appState.logs[dateStr];
    const hasLog = log && ((log.tags && log.tags.length) || (log.note && log.note.trim()));
    const hasEvent = eventDates.has(dateStr);

    const cls = ["cal-day"];
    if (dateStr === todayStr) cls.push("is-today");
    if (dateStr === selectedDateStr) cls.push("selected-day");
    if (phase.type === "period") cls.push("is-period");
    else if (phase.type === "predicted-period") cls.push("is-predicted-period");
    else if (phase.type === "follicular") cls.push("is-follicular");
    else if (phase.type === "ovulation") cls.push("is-ovulation");
    else if (phase.type === "luteal") cls.push("is-luteal");

    // 清晰一眼识别的微型中文角标（生理期/卵泡期/排卵期/黄体期分色分标）
    let subLabel = "";
    if (phase.type === "period") {
      if (cycleHit.startDate === cycleHit.endDate) subLabel = stealth ? "雨" : "经";
      else if (dateStr === cycleHit.startDate) subLabel = stealth ? "始" : "来";
      else if (dateStr === cycleHit.endDate) subLabel = stealth ? "晴" : "完";
      else subLabel = stealth ? "雨" : "经";
    } else if (dateStr === todayStr) {
      subLabel = "今";
    } else if (phase.type === "predicted-period") {
      subLabel = "预";
    } else if (phase.type === "follicular") {
      subLabel = stealth ? "晴" : "卵";
    } else if (phase.type === "ovulation") {
      subLabel = stealth ? "旺" : "排";
    } else if (phase.type === "luteal") {
      subLabel = stealth ? "云" : "黄";
    }

    cells.push(`
      <button type="button" class="${cls.join(" ")}" data-date="${dateStr}">
        <span>${d}</span>
        ${subLabel ? `<span class="cal-sub">${subLabel}</span>` : ""}
        ${hasLog || hasEvent ? `<span class="cal-dots">${hasLog ? '<i class="cal-dot"></i>' : ""}${hasEvent ? '<i class="cal-dot event"></i>' : ""}</span>` : ""}
      </button>
    `);
  }
  document.getElementById("calendarGrid").innerHTML = cells.join("");

  renderCalendarDayDrawer(stats, stealth);

  // 统计卡
  const isRegular = stats.variation <= 7 && stats.avgCycleLen >= 21 && stats.avgCycleLen <= 35;
  document.getElementById("insightMetricsGrid").innerHTML = `
    <div class="stat-tile">
      <div class="stat-tile-label">平均多久来一次</div>
      <div class="stat-tile-val">${stats.avgCycleLen} 天</div>
      <div class="stat-tile-sub">常见范围 21~35 天</div>
    </div>
    <div class="stat-tile" style="border-left-color: var(--season-spring);">
      <div class="stat-tile-label">每次大概持续</div>
      <div class="stat-tile-val">${stats.avgPeriodLen} 天</div>
      <div class="stat-tile-sub">常见范围 3~7 天</div>
    </div>
    <div class="stat-tile" style="border-left-color: var(--season-summer);">
      <div class="stat-tile-label">最近波动幅度</div>
      <div class="stat-tile-val">±${stats.spread} 天</div>
      <div class="stat-tile-sub">${isRegular ? "节奏很稳" : "有点浮动，已按区间估"}</div>
    </div>
    <div class="stat-tile" style="border-left-color: var(--season-autumn);">
      <div class="stat-tile-label">下次排卵期</div>
      <div class="stat-tile-val" style="font-size:15.5px;">${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum - 2))} ~ ${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum + 2))}</div>
      <div class="stat-tile-sub">精力与状态通常最好</div>
    </div>
  `;

  // 历史列表（按时间顺序从早到晚展示，支持直接修改）
  const curYear = String(new Date().getFullYear());
  const fmtHistoryDate = ds => (ds && ds.slice(0, 4) !== curYear ? `${ds.slice(0, 4)}年${formatCNDate(ds)}` : formatCNDate(ds));
  document.getElementById("cycleHistoryList").innerHTML = stats.historyRows.length
    ? stats.historyRows
        .map(row => `
          <div class="history-row">
            <div>
              <strong>${fmtHistoryDate(row.startDate)} ~ ${fmtHistoryDate(row.endDate)}<span style="white-space:nowrap;">（${row.duration}天）</span></strong>
              <small>${row.cycleLen ? `距下次间隔 ${row.cycleLen} 天` : "最近一次记录"}${row.excluded ? " · 已忽略偶发波动" : ""}</small>
            </div>
            <div class="history-row-ops">
              <label class="exclude-label">
                <input type="checkbox" class="exclude-cycle-cb" data-cycle-id="${row.id}" ${row.excluded ? "checked" : ""} />
                忽略
              </label>
              <button type="button" class="chip-action edit-cycle-btn" data-cycle-id="${row.id}">修改</button>
              <button type="button" class="chip-action delete-cycle-btn" data-cycle-id="${row.id}">删</button>
            </div>
          </div>
        `)
        .join("")
    : `<p class="section-sub">还没有记录过经期，点上面的「点选日历标/改经期」或「+ 补记一次」就能快速开始。</p>`;
}

function renderCalendarDayDrawer(stats, stealth) {
  const drawer = document.getElementById("calendarDayDrawer");
  const dateStr = selectedDateStr;
  const todayStr = toDateStr(new Date());
  const phase = getCalendarDayPhase(dateStr, stats);
  const cycleHit = phase.cycleHit;
  const inPeriod = phase.type === "period";
  const dayLog = appState.logs[dateStr] || { tags: [], note: "" };
  const activeTags = new Set(dayLog.tags || []);
  const dayEvents = (appState.events || []).filter(e => e.date === dateStr);

  // 检查是否可以作为最近一次已开始经期的结束日（开始后 1~14 天内）
  const nearbyPrevCycle = !inPeriod
    ? [...stats.sortedCycles]
        .reverse()
        .find(c => {
          const gap = diffDays(dateStr, c.startDate);
          return gap >= 1 && gap <= 14;
        })
    : null;

  const quickIds = ["flow_medium", "flow_heavy", "pain_cramps_mild", "pain_cramps_heavy", "mood_tired", "mood_irritable", "mood_craving", "med_painkiller"];
  const itemMap = {};
  SYMPTOM_GROUPS.forEach(g => g.items.forEach(it => { itemMap[it.id] = it; }));

  const quickChipsHtml = quickIds
    .map(id => {
      const it = itemMap[id];
      if (!it) return "";
      const on = activeTags.has(id);
      return `<button type="button" class="capsule-btn drawer-tag-btn ${on ? "selected" : ""}" data-tag-id="${id}">${escapeHtml(stealth ? it.stealth : it.label)}</button>`;
    })
    .join("");

  const phaseLabels = stealth
    ? {
        period: `记过的小雨日（${formatCNDate(cycleHit?.startDate)} ~ ${formatCNDate(cycleHit?.endDate)}）`,
        "predicted-period": "预计可能会下雨",
        follicular: "晴朗日 · 状态回升",
        ovulation: "大晴日 · 满格状态",
        luteal: "多云日 · 放慢节奏",
        none: "暂无周期记录"
      }
    : {
        period: `生理期（${formatCNDate(cycleHit?.startDate)} ~ ${formatCNDate(cycleHit?.endDate)}）`,
        "predicted-period": "预计经期 · 记得提前备一片",
        follicular: "卵泡期 · 满血回春状态回升",
        ovulation: "排卵期 · 全月精力高光日",
        luteal: "黄体期 · 经前敏感缓冲期",
        none: "暂无周期记录"
      };
  const phaseText = phaseLabels[phase.type] || "日常手帐";

  const eventBanner = dayEvents.length
    ? `<p class="drawer-phase-sub" style="color:var(--season-spring); margin-top:4px;">大事记：${dayEvents.map(e => escapeHtml(e.name)).join("、")}</p>`
    : "";

  const isFutureDate = dateStr > todayStr;
  let periodBtnsHtml = "";
  if (!isFutureDate) {
    if (inPeriod) {
      periodBtnsHtml = `
        <button type="button" class="btn-soft sm" id="drawerEditCycleBtn" data-cycle-id="${cycleHit.id}">修改这次起止</button>
        ${dateStr !== cycleHit.endDate ? `<button type="button" class="btn-soft sm" id="drawerEndHereBtn" data-cycle-id="${cycleHit.id}">记这天结束</button>` : ""}
        <button type="button" class="chip-action" id="drawerUnmarkDayBtn">取消这天标记</button>
      `;
    } else {
      periodBtnsHtml = `
        <button type="button" class="btn-primary sm" id="drawerStartPeriodBtn">记这天来了</button>
        ${nearbyPrevCycle ? `<button type="button" class="btn-soft sm" id="drawerExtendEndBtn" data-cycle-id="${nearbyPrevCycle.id}">延续到这天结束</button>` : ""}
        <button type="button" class="chip-action" id="drawerToggleSingleDayBtn">只标这一天</button>
      `;
    }
  }

  drawer.innerHTML = `
    <div class="drawer-top">
      <div>
        <div class="drawer-date-title">${formatCNDate(dateStr)} ${dateStr === todayStr ? "· 今天" : ""}</div>
        <div class="drawer-phase-sub">${escapeHtml(phaseText)}</div>
        ${eventBanner}
      </div>
    </div>
    ${periodBtnsHtml ? `<div class="drawer-period-actions">${periodBtnsHtml}</div>` : ""}
    <div class="drawer-quick-tags">${quickChipsHtml}</div>
    <textarea id="drawerNoteInput" class="journal-textarea" rows="2" placeholder="给 ${formatCNDate(dateStr)} 留一句手帐备注…">${escapeHtml(dayLog.note || "")}</textarea>
  `;
}

// ==================== Tab 3: 工具箱（基础壳子，Milestone 3 将全面升级出图/呼吸/多日程） ====================
function renderToolkitTab(stats, stealth) {
  const s = stats.seasonInfo;
  const tone = appState.settings.partnerTone === "witty" ? "witty" : "gentle";
  document.querySelectorAll("#receiptTonePills [data-partner-tone]").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-partner-tone") === tone);
  });

  const rData = RECEIPT_COPY[s.key]?.[tone] || RECEIPT_COPY.winter.gentle;
  const barWidths = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 3, 2, 1, 2];
  document.getElementById("partnerReceiptPreview").innerHTML = `
    <div class="receipt-head">
      <div class="receipt-meta-top">
        <span>TIDELOG · 潮汐便利店</span>
        <span>NO. ${toDateStr(new Date())}</span>
      </div>
      <div class="receipt-store">${escapeHtml(rData.title)}</div>
      <div class="receipt-meta">
        <span class="receipt-pill">${escapeHtml(s.chip)}</span>
        <span class="receipt-pill muted">周期第 ${stats.cycleDay} 天 · 电量 ${s.battery}</span>
      </div>
    </div>
    <p class="receipt-quote">“${escapeHtml(rData.quote)}”</p>
    <div class="receipt-rows">
      <div class="receipt-row"><strong>推荐投喂</strong><span>${escapeHtml(rData.feeding)}</span></div>
      <div class="receipt-row is-do"><strong>今日宜做</strong><span>${escapeHtml(rData.dos)}</span></div>
      <div class="receipt-row is-dont"><strong>避雷提醒</strong><span>${escapeHtml(rData.donts)}</span></div>
    </div>
    <div class="receipt-barcode">
      <div class="receipt-bars" aria-hidden="true">${barWidths.map(w => `<i style="width:${w}px"></i>`).join("")}</div>
      <div>★ 100% 本地生成 · TIDELOG ★</div>
    </div>
  `;

  const slice = getMonthlySliceData(appState, stats);
  document.getElementById("monthlySlicePreview").innerHTML = `
    <div class="slice-top">
      <span>TIDELOG 月度身体切片</span>
      <span>${slice.monthLabel}</span>
    </div>
    <div class="slice-title">这个月，也好好照顾了自己</div>
    <div class="slice-stats">
      <div class="slice-stat-box"><strong>${slice.restDays}天</strong><span>安心休整</span></div>
      <div class="slice-stat-box"><strong>${slice.logDays}次</strong><span>手帐记录</span></div>
      <div class="slice-stat-box"><strong>${slice.cycleDays}天</strong><span>身体节奏</span></div>
    </div>
    <div class="slice-tags">
      ${slice.topTags.map(t => `<span class="slice-tag"># ${escapeHtml(t)}</span>`).join("")}
    </div>
    <div class="slice-footer-quote">${escapeHtml(slice.quote)}</div>
  `;

  renderEventsPanel(stats);
  renderDoctorPanel(stats);
  renderReliefTips();
}

const EVENT_CHECKLISTS = {
  winter: [
    "日夜用卫生巾 / 棉条或月经杯（下水必备）",
    "布洛芬止痛药（随身包放 2 粒备用）",
    "便携暖宝宝贴 + 保温杯",
    "一条深色舒适备换下装"
  ],
  autumn: [
    "包里随手塞 2 片护垫/卫生巾防提前来潮",
    "备点黑巧或小零食稳住低血糖",
    "提前把当天行程留出 1 小时放空"
  ],
  spring: [
    "状态轻盈，带上好心情和防晒就行",
    "适合拍照和走长路线，穿双舒服的鞋"
  ],
  summer: [
    "全月状态巅峰，放心安排高光行程",
    "记得多补水，玩开心也别熬太晚"
  ]
};

function renderReliefTips() {
  const tips = [
    { t: "止痛药别等到痛到发抖才吃", d: "布洛芬是拦住前列腺素生成的，刚觉得小腹发坠时吃效果最好，饭后温水送服。" },
    { t: "暖贴贴在下腹或后腰（别直接贴皮肤）", d: "40°C 左右的温热能帮子宫平滑肌放松，怕闷可以隔着棉质内衣贴在后腰。" },
    { t: "想吃甜的或热碳水，别跟自己较劲", d: "热豆浆、红豆汤、烤红薯或一小块黑巧，稳住血糖的同时也能让情绪软下来。" }
  ];
  document.getElementById("reliefTipsList").innerHTML = tips
    .map(x => `<div class="relief-tip"><strong>${x.t}</strong><span>${x.d}</span></div>`)
    .join("");
}

function renderEventsPanel(stats) {
  const listEl = document.getElementById("savedEventsList");
  const events = appState.events || [];
  if (!events.length) {
    listEl.innerHTML = `<p class="section-sub">还没有记大事记，在上面添一个吧。</p>`;
    document.getElementById("eventCollisionResult").innerHTML = `<p class="section-sub">添加日程后，这里会告诉你当天状态和打包建议。</p>`;
    return;
  }
  if (!events.some(e => e.id === selectedEventId)) selectedEventId = events[0].id;

  const todayStr = toDateStr(new Date());
  listEl.innerHTML = events
    .map(ev => {
      const pred = getFutureDatePrediction(ev.date, stats);
      const isHit = pred.season.key === "winter";
      const daysLeft = diffDays(ev.date, todayStr);
      const countTxt = daysLeft > 0 ? `${daysLeft} 天后` : daysLeft === 0 ? "就是今天" : "已过去";
      return `
        <div class="event-item ${ev.id === selectedEventId ? "active" : ""}" data-event-id="${ev.id}">
          <div class="event-item-meta">
            <strong>${escapeHtml(ev.name)}</strong>
            <small>${formatCNDate(ev.date)} · ${countTxt}</small>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="event-badge" style="background:${pred.season.softVar};color:${pred.season.colorVar};">${isHit ? "可能撞期" : pred.season.chip.split("·")[0].trim()}</span>
            <button type="button" class="chip-action delete-event-btn" data-event-id="${ev.id}">删</button>
          </div>
        </div>
      `;
    })
    .join("");

  const cur = events.find(e => e.id === selectedEventId);
  if (!cur) return;
  const pred = getFutureDatePrediction(cur.date, stats);
  const s = pred.season;
  const items = EVENT_CHECKLISTS[s.key] || EVENT_CHECKLISTS.spring;
  const checkedSet = new Set(cur.checkedItems || []);

  document.getElementById("eventCollisionResult").innerHTML = `
    <div class="tip-card highlight">
      <div>
        <h4>${escapeHtml(cur.name)}（${formatCNDate(cur.date)}）</h4>
        <p style="margin-top:4px;">预计处于 <strong>${escapeHtml(s.title)}</strong>（周期约第 ${pred.modDay} 天）。</p>
        <p style="margin-top:6px;">${s.key === "winter" ? "大概率会撞上经期！如果是无法改期的大考或水上活动，可提前 1 个月咨询医生评估安全调经，下面清单帮你提前打包：" : s.key === "autumn" ? "离经期很近啦，提前做好小准备就不慌：" : "完美避开难受的日子，安心冲就行！"}</p>
      </div>
    </div>
    <div class="checklist-box" data-checklist-event="${cur.id}">
      ${items.map(it => `
        <label class="checklist-item">
          <input type="checkbox" class="event-check-cb" data-item="${escapeHtml(it)}" ${checkedSet.has(it) ? "checked" : ""} />
          <span>${escapeHtml(it)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderDoctorPanel(stats) {
  const selectedQ = new Set(appState.doctorQuestions || []);
  document.getElementById("doctorQuestionChips").innerHTML = DOCTOR_QUESTIONS.map(q => {
    const on = selectedQ.has(q);
    return `<button type="button" class="capsule-btn doctor-q-btn ${on ? "selected" : ""}" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`;
  }).join("");

  const tagCounts = {};
  const labelMap = {};
  SYMPTOM_GROUPS.forEach(g => g.items.forEach(it => { labelMap[it.id] = it.label; }));
  Object.values(appState.logs).forEach(log => (log.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

  const topSymptoms = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, c]) => `${labelMap[id] || id}(${c}次)`)
    .join("、") || "近期无明显不适记录";

  const rowsHtml = [...stats.historyRows]
    .slice(-6)
    .reverse()
    .map((r, idx) => `
      <tr>
        <td>近第 ${idx + 1} 次</td>
        <td><strong>${r.startDate}</strong></td>
        <td>${r.endDate || "--"}（${r.duration}天）</td>
        <td>${r.cycleLen ? r.cycleLen + "天" : `进行中(第${stats.cycleDay}天)`}</td>
        <td>${r.excluded ? "偶发异常" : "正常"}</td>
      </tr>
    `)
    .join("");

  const qBlock = (appState.doctorQuestions || []).length
    ? `<div style="margin-top:14px;padding:12px 14px;background:#F7F5F0;border-radius:12px;">
        <div style="font-size:12px;font-weight:700;color:#4A443F;margin-bottom:4px;">本次想咨询医生的问题：</div>
        <ul style="padding-left:18px;font-size:13px;color:#1A1A1A;line-height:1.6;">
          ${appState.doctorQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  document.getElementById("doctorSheetContent").innerHTML = `
    <div class="doctor-sheet-header">
      <div>
        <h3>妇科门诊月经史摘要</h3>
        <p style="font-size:12px;color:#5E5752;margin-top:2px;">生成日期：${toDateStr(new Date())} · 供医生快速查阅</p>
      </div>
      <span style="background:#2A2523;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">
        当前周期第 ${stats.cycleDay} 天
      </span>
    </div>
    <div class="doctor-metrics-grid">
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">末次月经第一天 (LMP)</div>
        <div class="doctor-metric-val">${stats.lmpDate}</div>
        <div class="doctor-metric-sub">距今第 ${stats.cycleDay} 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">既往周期范围 / 均值</div>
        <div class="doctor-metric-val">${stats.minCycle}~${stats.maxCycle} 天（均 ${stats.avgCycleLen} 天）</div>
        <div class="doctor-metric-sub">最大波动差 ${stats.variation} 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">平均行经天数</div>
        <div class="doctor-metric-val">${stats.avgPeriodLen} 天</div>
        <div class="doctor-metric-sub">常见参考值 3~7 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">近期高频伴随症状</div>
        <div class="doctor-metric-val" style="font-size:14px;line-height:1.45;">${escapeHtml(topSymptoms)}</div>
      </div>
    </div>
    <div class="doctor-table-wrap">
      <table class="doctor-history-table">
        <thead><tr><th>序次</th><th>来潮首日</th><th>结束日期</th><th>周期</th><th>备注</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    ${qBlock}
  `;
}

function renderMineTab(stealth, theme) {
  document.querySelectorAll("[data-theme-choice]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === theme);
  });
  document.getElementById("stealthSwitchMine").setAttribute("aria-checked", String(stealth));
  document.getElementById("settingCycleLen").value = appState.settings.defaultCycleLen || 29;
  document.getElementById("settingPeriodLen").value = appState.settings.defaultPeriodLen || 5;
}

// ==================== 交互事件绑定 ====================
function switchMainTab(targetId) {
  document.querySelectorAll(".nav-pill").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === targetId);
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("active", p.id === targetId);
  });
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function switchSubTab(subId) {
  document.querySelectorAll(".subtab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-subtab") === subId);
  });
  document.querySelectorAll(".subtab-panel").forEach(p => {
    p.classList.toggle("active", p.id === subId);
  });
  const [title, sub] = TOOLKIT_SHEET_TITLES[subId] || TOOLKIT_SHEET_TITLES["sub-cards"];
  const hEl = document.getElementById("toolkitSheetHeading");
  const sEl = document.getElementById("toolkitSheetSub");
  if (hEl) hEl.textContent = title;
  if (sEl) sEl.textContent = sub;
  syncMobileDockActive();
}

function triggerBubblePop() {
  const bubble = document.getElementById("companionBubble");
  if (!bubble) return;
  bubble.classList.remove("pop");
  void bubble.offsetWidth;
  bubble.classList.add("pop");
}

function toggleTagForDate(dateStr, tagId) {
  if (!appState.logs[dateStr]) appState.logs[dateStr] = { tags: [], note: "" };
  const tags = appState.logs[dateStr].tags;
  const idx = tags.indexOf(tagId);
  const adding = idx < 0;
  if (adding) tags.push(tagId);
  else tags.splice(idx, 1);

  let toastText = adding ? "已悄悄记下" : "已取消这个标记";
  if (adding) {
    const reply = pickSymptomReply(tagId);
    if (reply) {
      lastCompanionOverride = reply;
      toastText = "搭子接住你的信号啦";
    }
  }
  saveState(toastText);
  if (adding && lastCompanionOverride) triggerBubblePop();
}

function bindEvents() {
  // 桌面端主导航
  document.querySelectorAll(".nav-pill").forEach(btn => {
    btn.addEventListener("click", () => switchMainTab(btn.getAttribute("data-tab")));
  });

  // 手机端底部轻坞（呼出各功能底部抽屉）
  document.querySelectorAll(".mobile-bottom-nav .mnav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sheetId = btn.getAttribute("data-open-sheet");
      const subId = btn.getAttribute("data-open-subtab");
      if (activeMobileSheet === sheetId && (!subId || document.querySelector(".subtab-btn.active")?.getAttribute("data-subtab") === subId)) {
        closeMobileSheet();
      } else {
        openMobileSheet(sheetId, subId);
      }
    });
  });

  // 手机端各抽屉触发器与关闭机制
  document.getElementById("mobileSettingsBtn")?.addEventListener("click", () => openMobileSheet("tab-mine"));
  document.getElementById("mobileOpenLogBtn")?.addEventListener("click", () => openMobileSheet("sheet-logger"));
  document.getElementById("openCalFromStripBtn")?.addEventListener("click", () => openMobileSheet("tab-calendar"));
  document.getElementById("openInsightSheetBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    openMobileSheet("sheet-insights");
  });
  document.getElementById("companionBubble")?.addEventListener("click", () => {
    if (MOBILE_MQ.matches) openMobileSheet("sheet-insights");
  });

  // 手机端 7 天横条点选日期
  document.getElementById("mobileWeekGrid")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-week-date]");
    if (!btn) return;
    const d = btn.getAttribute("data-week-date");
    const same = selectedDateStr === d;
    selectedDateStr = d;
    renderAll();
    if (same) openMobileSheet("sheet-logger");
  });

  document.getElementById("mobileSheetScrim")?.addEventListener("click", closeMobileSheet);
  document.querySelectorAll("[data-close-sheet]").forEach(btn => {
    btn.addEventListener("click", closeMobileSheet);
  });

  // 抽屉顶部手柄下滑关闭手势
  document.querySelectorAll(".sheet-chrome").forEach(chrome => {
    let startY = null;
    chrome.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      startY = e.clientY;
    });
    chrome.addEventListener("pointerup", e => {
      if (startY !== null && e.clientY - startY > 44) closeMobileSheet();
      startY = null;
    });
    chrome.addEventListener("pointercancel", () => { startY = null; });
  });

  // Esc 键关闭弹窗/抽屉，窗口切回桌面端自动收起手机抽屉态
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (document.getElementById("retroModal")?.classList.contains("open")) {
      document.getElementById("closeRetroModalBtn")?.click();
    } else if (activeMobileSheet) {
      closeMobileSheet();
    }
  });
  MOBILE_MQ.addEventListener?.("change", e => {
    if (!e.matches && activeMobileSheet) closeMobileSheet();
  });

  // 工具箱子导航
  document.querySelectorAll(".subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchSubTab(btn.getAttribute("data-subtab")));
  });

  // 快捷跳到电子布洛芬急救角
  document.getElementById("jumpReliefBtn").addEventListener("click", () => {
    if (MOBILE_MQ.matches) {
      openMobileSheet("tab-toolkit", "sub-relief");
    } else {
      switchMainTab("tab-toolkit");
      switchSubTab("sub-relief");
    }
  });

  // 顶部和“我的”里的防窥天气模式开关
  const toggleStealth = () => {
    appState.settings.camouflageMode = !appState.settings.camouflageMode;
    saveState(appState.settings.camouflageMode ? "已切为晴雨天气手帐（防窥中）" : "已切回正常模式");
  };
  document.getElementById("stealthBtn").addEventListener("click", toggleStealth);
  document.getElementById("stealthSwitchMine").addEventListener("click", toggleStealth);

  // 一键记录今天来了/结束
  document.getElementById("quickPeriodToggleBtn").addEventListener("click", () => {
    const todayStr = toDateStr(new Date());
    const stats = computeCycleStats(appState);
    const p = COMPANION_COPY;
    const inPeriod = isDateInLoggedPeriod(todayStr, stats.sortedCycles, stats.avgPeriodLen);
    if (inPeriod) {
      const latest = appState.cycles[appState.cycles.length - 1];
      if (latest) {
        if (latest.startDate === todayStr) {
          appState.cycles.pop();
          lastCompanionOverride = null;
          saveState("已撤销今天的开始记录");
        } else {
          latest.endDate = addDays(todayStr, -1);
          lastCompanionOverride = null;
          saveState(p.endToast);
        }
      }
    } else {
      const dur = Number(appState.settings.defaultPeriodLen) || 5;
      upsertCycleMerged(appState, { startDate: todayStr, endDate: addDays(todayStr, dur - 1), excluded: false });
      lastCompanionOverride = null;
      saveState(p.startToast);
    }
  });

  // 互动波浪条点击/滑动预览
  const waveWrap = document.getElementById("waveInteractiveWrap");
  const handleWavePointer = clientX => {
    const rect = waveWrap.getBoundingClientRect();
    waveHoverRatio = Math.min(0.99, Math.max(0.01, (clientX - rect.left) / rect.width));
    updateWaveCursor(waveHoverRatio, computeCycleStats(appState), Boolean(appState.settings.camouflageMode));
  };
  waveWrap.addEventListener("pointerdown", e => handleWavePointer(e.clientX));
  waveWrap.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "mouse") handleWavePointer(e.clientX); });
  waveWrap.addEventListener("pointerleave", () => {
    waveHoverRatio = null;
    const stats = computeCycleStats(appState);
    updateWaveCursor(Math.min(1, Math.max(0.03, stats.cycleDay / stats.avgCycleLen)), stats, Boolean(appState.settings.camouflageMode));
  });

  // 示例数据引导条交互
  document.getElementById("dismissDemoBtn")?.addEventListener("click", () => {
    appState.isDemoData = false;
    saveState("随时可以去日历或「补记/改日期」录入你自己的记录");
  });
  document.getElementById("startMyOwnBtn")?.addEventListener("click", () => {
    appState.cycles = [];
    appState.logs = {};
    appState.events = [];
    appState.isDemoData = false;
    saveState("已清空示例，先录一下你上一次来的日期吧");
    openRetroModal({ defaultStart: addDays(toDateStr(new Date()), -14) });
  });

  // 升级版补记 / 修改历史经期弹窗（快捷日期 + 持续天数胶囊 + 连续补记）
  const retroModal = document.getElementById("retroModal");
  const retroStartInput = document.getElementById("retroStartDate");
  const retroEndInput = document.getElementById("retroEndDate");
  const retroExcludedCb = document.getElementById("retroExcludedCb");
  const retroPreviewEl = document.getElementById("retroRangePreview");

  function syncRetroPreview() {
    const start = retroStartInput.value;
    if (!start) {
      retroPreviewEl.textContent = "先选一个开始日期";
      return;
    }
    let end;
    if (retroSelectedDur === "custom") {
      end = retroEndInput.value && retroEndInput.value >= start ? retroEndInput.value : start;
      retroEndInput.value = end;
    } else {
      end = addDays(start, Number(retroSelectedDur) - 1);
      retroEndInput.value = end;
    }
    const days = Math.max(1, diffDays(end, start) + 1);
    retroPreviewEl.textContent = `将记录：${formatCNDate(start)} ~ ${formatCNDate(end)}（共 ${days} 天）`;
  }

  function setRetroDuration(dur) {
    retroSelectedDur = dur;
    document.querySelectorAll("#retroDurationPills [data-dur]").forEach(btn => {
      btn.classList.toggle("selected", btn.getAttribute("data-dur") === String(dur));
    });
    retroEndInput.style.display = dur === "custom" ? "block" : "none";
    syncRetroPreview();
  }

  function openRetroModal({ cycle = null, defaultStart = null } = {}) {
    const defDur = Number(appState.settings.defaultPeriodLen) || 5;
    if (cycle) {
      editingCycleId = cycle.id;
      document.getElementById("retroModalTitle").textContent = "修改这次经期记录";
      document.getElementById("retroModalSubtitle").textContent = "调一下开始日期或持续天数，日历和预测会自动重算。";
      document.getElementById("saveAndPrevRetroBtn").style.display = "none";
      retroStartInput.value = cycle.startDate;
      retroEndInput.value = cycle.endDate || addDays(cycle.startDate, defDur - 1);
      retroExcludedCb.checked = Boolean(cycle.excluded);
      const dur = Math.max(1, diffDays(retroEndInput.value, cycle.startDate) + 1);
      setRetroDuration([3, 4, 5, 6, 7].includes(dur) ? dur : "custom");
    } else {
      editingCycleId = null;
      document.getElementById("retroModalTitle").textContent = "补记之前的经期";
      document.getElementById("retroModalSubtitle").textContent = "选开始那一天，再点一下持续了几天就能搞定；想连录前几个月点左下角。";
      document.getElementById("saveAndPrevRetroBtn").style.display = "inline-flex";
      const startVal = defaultStart || (selectedDateStr <= toDateStr(new Date()) ? selectedDateStr : toDateStr(new Date()));
      retroStartInput.value = startVal;
      retroExcludedCb.checked = false;
      setRetroDuration([3, 4, 5, 6, 7].includes(defDur) ? defDur : 5);
    }
    retroModal.classList.add("open");
  }

  const closeRetro = () => {
    retroModal.classList.remove("open");
    editingCycleId = null;
  };

  function commitRetroForm(continueEarlier) {
    const start = retroStartInput.value;
    if (!start) return showToast("先选一下哪天开始的");
    if (start > toDateStr(new Date())) return showToast("未来的日期还没到哦");
    const end = retroSelectedDur === "custom"
      ? (retroEndInput.value && retroEndInput.value >= start ? retroEndInput.value : start)
      : addDays(start, Number(retroSelectedDur) - 1);

    upsertCycleMerged(appState, {
      id: editingCycleId,
      startDate: start,
      endDate: end,
      excluded: retroExcludedCb.checked
    });

    if (continueEarlier) {
      const avgGap = Number(appState.settings.defaultCycleLen) || 29;
      const prevStart = addDays(start, -avgGap);
      editingCycleId = null;
      retroStartInput.value = prevStart;
      retroExcludedCb.checked = false;
      syncRetroPreview();
      saveState(`已记下 ${formatCNDate(start)}，继续补更早一次吧`);
    } else {
      closeRetro();
      saveState("已保存，日历和预测已经跟着更新啦");
    }
  }

  document.getElementById("openRetroModalBtn").addEventListener("click", () => openRetroModal());
  document.getElementById("calendarAddRetroBtn").addEventListener("click", () => openRetroModal());
  document.getElementById("calendarQuickRetroBtn").addEventListener("click", () => openRetroModal());
  document.getElementById("closeRetroModalBtn").addEventListener("click", closeRetro);
  retroModal.addEventListener("click", e => { if (e.target === retroModal) closeRetro(); });

  document.getElementById("retroDatePresets").addEventListener("click", e => {
    const btn = e.target.closest("[data-offset]");
    if (!btn) return;
    const offset = Number(btn.getAttribute("data-offset"));
    retroStartInput.value = addDays(toDateStr(new Date()), offset);
    syncRetroPreview();
  });

  document.getElementById("retroDurationPills").addEventListener("click", e => {
    const btn = e.target.closest("[data-dur]");
    if (!btn) return;
    const val = btn.getAttribute("data-dur");
    setRetroDuration(val === "custom" ? "custom" : Number(val));
  });

  retroStartInput.addEventListener("change", syncRetroPreview);
  retroEndInput.addEventListener("change", syncRetroPreview);

  document.getElementById("confirmRetroBtn").addEventListener("click", () => commitRetroForm(false));
  document.getElementById("saveAndPrevRetroBtn").addEventListener("click", () => commitRetroForm(true));

  // 首页胶囊 & 笔记
  document.getElementById("capsuleGroupsContainer").addEventListener("click", e => {
    const btn = e.target.closest(".capsule-btn[data-tag-id]");
    if (btn) toggleTagForDate(selectedDateStr, btn.getAttribute("data-tag-id"));
  });

  document.getElementById("selectedDateDisplay").addEventListener("click", e => {
    if (e.target.id === "loggerBackTodayBtn") {
      selectedDateStr = toDateStr(new Date());
      renderAll();
    }
  });

  document.getElementById("toggleIntimateTagsBtn").addEventListener("click", () => {
    appState.settings.hideIntimateTags = !appState.settings.hideIntimateTags;
    saveState(appState.settings.hideIntimateTags ? "已收起私密项" : "已显示全部选项");
  });

  document.getElementById("dailyNoteInput").addEventListener("input", e => {
    if (!appState.logs[selectedDateStr]) appState.logs[selectedDateStr] = { tags: [], note: "" };
    appState.logs[selectedDateStr].note = e.target.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  });

  // 日历导航、点选涂色模式与原地抽屉交互
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderAll();
  });
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderAll();
  });
  document.getElementById("jumpTodayBtn").addEventListener("click", () => {
    calendarViewDate = new Date();
    selectedDateStr = toDateStr(new Date());
    renderAll();
  });

  document.getElementById("togglePaintModeBtn").addEventListener("click", () => {
    isCalendarPaintMode = !isCalendarPaintMode;
    renderAll();
    if (isCalendarPaintMode) showToast("直接点日期就能标上或取消经期");
  });
  document.getElementById("donePaintModeBtn").addEventListener("click", () => {
    isCalendarPaintMode = false;
    renderAll();
    showToast("经期标记已保存好啦");
  });

  document.getElementById("calendarGrid").addEventListener("click", e => {
    const cell = e.target.closest(".cal-day[data-date]");
    if (!cell) return;
    const clickedDate = cell.getAttribute("data-date");
    selectedDateStr = clickedDate;
    if (isCalendarPaintMode) {
      if (clickedDate > toDateStr(new Date())) {
        renderAll();
        return showToast("未来的日期还没到，不能标为已来哦");
      }
      const res = togglePeriodDay(appState, clickedDate);
      saveState(res === "added" ? `已标上 ${formatCNDate(clickedDate)}` : `已取消 ${formatCNDate(clickedDate)}`);
      return;
    }
    renderAll();
  });

  document.getElementById("calendarDayDrawer").addEventListener("click", e => {
    const tagBtn = e.target.closest(".drawer-tag-btn[data-tag-id]");
    if (tagBtn) {
      toggleTagForDate(selectedDateStr, tagBtn.getAttribute("data-tag-id"));
      return;
    }
    const id = e.target.id;
    if (id === "drawerStartPeriodBtn") {
      const dur = Number(appState.settings.defaultPeriodLen) || 5;
      upsertCycleMerged(appState, { startDate: selectedDateStr, endDate: addDays(selectedDateStr, dur - 1), excluded: false });
      saveState(`已记 ${formatCNDate(selectedDateStr)} 开始（默认 ${dur} 天，随时可改）`);
    } else if (id === "drawerToggleSingleDayBtn") {
      togglePeriodDay(appState, selectedDateStr);
      saveState(`已单独标记 ${formatCNDate(selectedDateStr)}`);
    } else if (id === "drawerExtendEndBtn") {
      const cid = e.target.getAttribute("data-cycle-id");
      const target = appState.cycles.find(c => c.id === cid);
      if (target) {
        upsertCycleMerged(appState, { id: target.id, startDate: target.startDate, endDate: selectedDateStr, excluded: target.excluded });
        saveState(`已把那次经期延续到 ${formatCNDate(selectedDateStr)} 结束`);
      }
    } else if (id === "drawerEndHereBtn") {
      const cid = e.target.getAttribute("data-cycle-id");
      const target = appState.cycles.find(c => c.id === cid);
      if (target) {
        upsertCycleMerged(appState, { id: target.id, startDate: target.startDate, endDate: selectedDateStr, excluded: target.excluded });
        saveState(`已改为 ${formatCNDate(selectedDateStr)} 结束`);
      }
    } else if (id === "drawerUnmarkDayBtn") {
      togglePeriodDay(appState, selectedDateStr);
      saveState(`已取消 ${formatCNDate(selectedDateStr)} 的经期标记`);
    } else if (id === "drawerEditCycleBtn") {
      const cid = e.target.getAttribute("data-cycle-id");
      const target = appState.cycles.find(c => c.id === cid);
      if (target) openRetroModal({ cycle: target });
    }
  });

  document.getElementById("calendarDayDrawer").addEventListener("input", e => {
    if (e.target.id === "drawerNoteInput") {
      if (!appState.logs[selectedDateStr]) appState.logs[selectedDateStr] = { tags: [], note: "" };
      appState.logs[selectedDateStr].note = e.target.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
  });

  // 历史周期：忽略异常、修改与删除
  document.getElementById("cycleHistoryList").addEventListener("change", e => {
    if (e.target.classList.contains("exclude-cycle-cb")) {
      const target = appState.cycles.find(c => c.id === e.target.getAttribute("data-cycle-id"));
      if (target) {
        target.excluded = e.target.checked;
        saveState(target.excluded ? "已忽略这次波动，不拉偏预测" : "已恢复计入平均");
      }
    }
  });

  document.getElementById("cycleHistoryList").addEventListener("click", e => {
    const editBtn = e.target.closest(".edit-cycle-btn");
    if (editBtn) {
      const target = appState.cycles.find(c => c.id === editBtn.getAttribute("data-cycle-id"));
      if (target) openRetroModal({ cycle: target });
      return;
    }
    const delBtn = e.target.closest(".delete-cycle-btn");
    if (!delBtn) return;
    appState.cycles = appState.cycles.filter(c => c.id !== delBtn.getAttribute("data-cycle-id"));
    appState.isDemoData = false;
    saveState("已删除这条记录");
  });

  // 工具箱：大事记与小抄基础交互
  document.getElementById("addEventBtn").addEventListener("click", () => {
    const name = document.getElementById("eventNameInput").value.trim();
    const date = document.getElementById("eventDateInput").value;
    if (!name || !date) return showToast("把事件名字和日期都填上吧");
    const ev = { id: "ev_" + Date.now(), name, date, checkedItems: [] };
    appState.events.push(ev);
    appState.events.sort((a, b) => a.date.localeCompare(b.date));
    selectedEventId = ev.id;
    document.getElementById("eventNameInput").value = "";
    saveState("已放进大事记，日历也标好啦");
  });

  document.getElementById("savedEventsList").addEventListener("click", e => {
    const del = e.target.closest(".delete-event-btn");
    if (del) {
      e.stopPropagation();
      appState.events = appState.events.filter(x => x.id !== del.getAttribute("data-event-id"));
      saveState("已移除这条大事记");
      return;
    }
    const item = e.target.closest(".event-item[data-event-id]");
    if (item) {
      selectedEventId = item.getAttribute("data-event-id");
      renderEventsPanel(computeCycleStats(appState));
    }
  });

  document.getElementById("doctorQuestionChips").addEventListener("click", e => {
    const btn = e.target.closest(".doctor-q-btn");
    if (!btn) return;
    const q = btn.getAttribute("data-q");
    const list = appState.doctorQuestions || [];
    const idx = list.indexOf(q);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(q);
    appState.doctorQuestions = list;
    saveState();
  });

  document.getElementById("copyDoctorSummaryBtn").addEventListener("click", () => {
    const stats = computeCycleStats(appState);
    const text = [
      `【妇科门诊月经史摘要】${toDateStr(new Date())}`,
      `末次月经首日：${stats.lmpDate}（当前第 ${stats.cycleDay} 天）`,
      `周期范围：${stats.minCycle}~${stats.maxCycle} 天（均值 ${stats.avgCycleLen} 天）`,
      `平均行经：${stats.avgPeriodLen} 天`,
      ...(appState.doctorQuestions.length ? ["想咨询的问题：" + appState.doctorQuestions.join("；")] : [])
    ].join("\n");
    navigator.clipboard?.writeText(text);
    showToast("看病摘要已复制");
  });

  document.querySelectorAll("#receiptTonePills [data-partner-tone]").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.settings.partnerTone = btn.getAttribute("data-partner-tone");
      saveState();
    });
  });

  document.getElementById("copyPartnerCardBtn").addEventListener("click", () => {
    const stats = computeCycleStats(appState);
    const s = stats.seasonInfo;
    const tone = appState.settings.partnerTone || "gentle";
    const rData = RECEIPT_COPY[s.key]?.[tone] || RECEIPT_COPY.winter.gentle;
    const shareText = [
      `【${rData.title} · 周期第 ${stats.cycleDay} 天 · 电量 ${s.battery}】`,
      `“${rData.quote}”`,
      `投喂推荐：${rData.feeding}`,
      `今天宜做：${rData.dos}`,
      `避雷提醒：${rData.donts}`
    ].join("\n");
    navigator.clipboard?.writeText(shareText);
    showToast("小票文字版已复制，去微信粘贴发给 TA 吧");
  });

  // Canvas 一键保存 PNG（小票 / 月度切片 / 看病小抄）
  document.getElementById("downloadReceiptBtn").addEventListener("click", () => {
    exportReceiptPng(computeCycleStats(appState));
  });
  document.getElementById("downloadSliceBtn").addEventListener("click", () => {
    exportMonthlySlicePng(computeCycleStats(appState));
  });
  document.getElementById("downloadDoctorPngBtn").addEventListener("click", () => {
    exportDoctorPng(computeCycleStats(appState));
  });

  // 打包清单勾选持久化
  document.getElementById("eventCollisionResult").addEventListener("change", e => {
    if (!e.target.classList.contains("event-check-cb")) return;
    const box = e.target.closest("[data-checklist-event]");
    const ev = (appState.events || []).find(x => x.id === box?.getAttribute("data-checklist-event"));
    if (!ev) return;
    const item = e.target.getAttribute("data-item");
    ev.checkedItems = Array.isArray(ev.checkedItems) ? ev.checkedItems : [];
    if (e.target.checked && !ev.checkedItems.includes(item)) ev.checkedItems.push(item);
    else if (!e.target.checked) ev.checkedItems = ev.checkedItems.filter(x => x !== item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  });

  // 电子布洛芬：4-7-8 呼吸引导 & 情绪树洞丢进海里
  document.getElementById("toggleBreathBtn").addEventListener("click", toggleBreathing);

  document.getElementById("tossToSeaBtn").addEventListener("click", () => {
    const ta = document.getElementById("ventTextarea");
    const box = document.getElementById("ventPaperBox");
    const reply = document.getElementById("ventReplyText");
    if (!ta.value.trim()) return showToast("先写点什么再丢进海里吧");
    box.classList.add("dissolving");
    setTimeout(() => {
      ta.value = "";
      box.classList.remove("dissolving");
      reply.textContent = "已经跟着潮水飘走啦，不留一点痕迹。心里有没有松快了一点点？";
      showToast("坏情绪已丢进海里");
    }, 650);
  });

  document.getElementById("saveVentToNoteBtn").addEventListener("click", () => {
    const ta = document.getElementById("ventTextarea");
    const val = ta.value.trim();
    if (!val) return showToast("还没写内容呢");
    const todayStr = toDateStr(new Date());
    if (!appState.logs[todayStr]) appState.logs[todayStr] = { tags: [], note: "" };
    appState.logs[todayStr].note = appState.logs[todayStr].note
      ? `${appState.logs[todayStr].note}\n${val}`
      : val;
    ta.value = "";
    saveState("已悄悄存进今天的手帐里");
  });

  // 我的：皮肤、参数与备份
  document.querySelectorAll("[data-theme-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.settings.theme = btn.getAttribute("data-theme-choice");
      saveState("新配色已换上");
    });
  });

  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    appState.settings.defaultCycleLen = Math.min(60, Math.max(18, Number(document.getElementById("settingCycleLen").value) || 29));
    appState.settings.defaultPeriodLen = Math.min(14, Math.max(2, Number(document.getElementById("settingPeriodLen").value) || 5));
    saveState("周期参考值已更新");
  });

  document.getElementById("exportDataBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tidelog-backup-${toDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("本地备份文件已下载");
  });

  const importInput = document.getElementById("importDataInput");
  document.getElementById("importDataBtn").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.cycles)) throw new Error("bad");
        appState = normalizeState(parsed);
        saveState("备份已恢复好啦");
      } catch {
        showToast("文件格式不对，导入失败");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("nukeDataBtn").addEventListener("click", () => {
    if (window.confirm("确定要清空当前设备里的所有记录吗？清空后无法找回。")) {
      localStorage.removeItem(STORAGE_KEY);
      appState = createDefaultState();
      appState.logs = {};
      appState.events = [];
      saveState("已全部清空");
    }
  });
}

// ==================== 4-7-8 放松呼吸机 ====================
let breathTimer = null;
const BREATH_PHASES = [
  { cls: "inhale", label: "慢慢吸气", sec: 4 },
  { cls: "hold", label: "轻轻屏住", sec: 7 },
  { cls: "exhale", label: "缓缓呼出", sec: 8 }
];

function toggleBreathing() {
  const orb = document.getElementById("breathOrb");
  const phaseEl = document.getElementById("breathPhaseText");
  const countEl = document.getElementById("breathCountText");
  const btn = document.getElementById("toggleBreathBtn");

  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
    orb.className = "breath-orb";
    phaseEl.textContent = "准备好了吗";
    countEl.textContent = "点下面开始";
    btn.textContent = "开始跟着呼吸";
    return;
  }

  let idx = 0;
  let remain = BREATH_PHASES[0].sec;
  const applyStep = () => {
    const cur = BREATH_PHASES[idx];
    orb.className = `breath-orb ${cur.cls}`;
    phaseEl.textContent = cur.label;
    countEl.textContent = `${remain} 秒`;
  };
  btn.textContent = "停一下";
  applyStep();
  breathTimer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      idx = (idx + 1) % BREATH_PHASES.length;
      remain = BREATH_PHASES[idx].sec;
    }
    applyStep();
  }, 1000);
}

// ==================== 零依赖 Canvas 高清晒图/小票/小抄导出 ====================
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = "";
  let curY = y;
  for (const ch of String(text || "")) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = ch;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function downloadCanvasPng(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportReceiptPng(stats) {
  const s = stats.seasonInfo;
  const tone = appState.settings.partnerTone || "gentle";
  const rData = RECEIPT_COPY[s.key]?.[tone] || RECEIPT_COPY.winter.gentle;

  const W = 760, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 柔和底布
  ctx.fillStyle = "#EFE8DD";
  ctx.fillRect(0, 0, W, H);

  // 锯齿便利店小票主体
  const px = 56, py = 48, pw = W - 112, ph = H - 96;
  ctx.save();
  ctx.shadowColor = "rgba(45,38,34,0.14)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#FFFDF8";
  ctx.beginPath();
  ctx.moveTo(px, py);
  const tooth = 18;
  for (let x = px; x < px + pw; x += tooth) {
    ctx.lineTo(x + tooth / 2, py + 9);
    ctx.lineTo(Math.min(px + pw, x + tooth), py);
  }
  ctx.lineTo(px + pw, py + ph);
  for (let x = px + pw; x > px; x -= tooth) {
    ctx.lineTo(x - tooth / 2, py + ph - 9);
    ctx.lineTo(Math.max(px, x - tooth), py + ph);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const innerX = px + 44;
  const innerW = pw - 88;
  ctx.fillStyle = "#26211F";
  ctx.textAlign = "center";
  ctx.font = '700 30px "Noto Serif SC", Georgia, serif';
  ctx.fillText(`TIDELOG · ${rData.title}`, W / 2, py + 76);

  ctx.fillStyle = "#7C726B";
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${toDateStr(new Date())}  ·  周期第 ${stats.cycleDay} 天  ·  电量 ${s.battery}`, W / 2, py + 114);

  // 虚线分割
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(38,33,31,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(innerX, py + 144);
  ctx.lineTo(innerX + innerW, py + 144);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#26211F";
  ctx.font = '600 26px "Noto Serif SC", Georgia, serif';
  let y = wrapCanvasText(ctx, `“${rData.quote}”`, innerX, py + 204, innerW, 42);

  y += 20;
  ctx.beginPath();
  ctx.moveTo(innerX, y);
  ctx.lineTo(innerX + innerW, y);
  ctx.stroke();
  ctx.setLineDash([]);

  const rows = [
    ["投喂推荐", rData.feeding],
    ["今天宜做", rData.dos],
    ["避雷提醒", rData.donts]
  ];
  y += 46;
  rows.forEach(([k, v]) => {
    ctx.fillStyle = "#8B7D74";
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(k, innerX, y);
    ctx.fillStyle = "#2B2420";
    ctx.font = '500 23px "Plus Jakarta Sans", sans-serif';
    y = wrapCanvasText(ctx, v, innerX, y + 34, innerW, 34) + 22;
  });

  // 底部条形码装饰
  const barY = py + ph - 120;
  ctx.fillStyle = "#2B2420";
  const pattern = [4, 2, 6, 2, 3, 5, 2, 4, 2, 7, 3, 2, 5, 2, 4, 6, 2, 3, 4, 2, 5, 3, 2, 6, 2, 4];
  let bx = W / 2 - 150;
  pattern.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, barY, w * 2.2, 46);
    bx += w * 2.6;
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#8C827B";
  ctx.font = '500 18px monospace';
  ctx.fillText("TIDELOG · ONLY STORED ON YOUR DEVICE", W / 2, barY + 76);

  downloadCanvasPng(canvas, `tidelog-receipt-${toDateStr(new Date())}.png`);
  showToast("小票高清图已保存，快去发给 TA 吧");
}

function exportMonthlySlicePng(stats) {
  const slice = getMonthlySliceData(appState, stats);
  const W = 900, H = 1200; // 小红书标准 3:4
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#FBF5EC");
  grad.addColorStop(0.55, "#F3E6DA");
  grad.addColorStop(1, "#EAE2EE");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 装饰柔光圆
  ctx.fillStyle = "rgba(201,106,80,0.08)";
  ctx.beginPath();
  ctx.arc(760, 180, 220, 0, Math.PI * 2);
  ctx.fill();

  const pad = 74;
  ctx.fillStyle = "#7D7068";
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("TIDELOG · 月度身体切片", pad, 112);
  ctx.textAlign = "right";
  ctx.fillText(slice.monthLabel, W - pad, 112);
  ctx.textAlign = "left";

  ctx.fillStyle = "#2A2320";
  ctx.font = '700 54px "Noto Serif SC", Georgia, serif';
  ctx.fillText("这个月，也好好", pad, 232);
  ctx.fillText("照顾了自己。", pad, 304);

  // 3 枚数据卡片
  const cards = [
    [`${slice.restDays}天`, "安心休整"],
    [`${slice.logDays}次`, "手帐记录"],
    [`${slice.cycleDays}天`, "身体节奏"]
  ];
  const cardW = (W - pad * 2 - 36) / 3;
  cards.forEach(([val, lbl], i) => {
    const cx = pad + i * (cardW + 18);
    const cy = 386;
    drawRoundedRect(ctx, cx, cy, cardW, 180, 28);
    ctx.fillStyle = "rgba(255,253,249,0.82)";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#2A2320";
    ctx.font = '700 46px "Noto Serif SC", Georgia, serif';
    ctx.fillText(val, cx + cardW / 2, cy + 88);
    ctx.fillStyle = "#736760";
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(lbl, cx + cardW / 2, cy + 134);
  });

  // 隐私脱敏情绪标签
  ctx.textAlign = "left";
  ctx.fillStyle = "#736760";
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("本月高频状态（已隐去隐私日期）", pad, 650);

  let tx = pad, ty = 682;
  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  slice.topTags.forEach(tag => {
    const label = `# ${tag}`;
    const tw = ctx.measureText(label).width + 44;
    if (tx + tw > W - pad) {
      tx = pad;
      ty += 66;
    }
    drawRoundedRect(ctx, tx, ty, tw, 50, 25);
    ctx.fillStyle = "rgba(255,253,249,0.88)";
    ctx.fill();
    ctx.fillStyle = "#3C3430";
    ctx.fillText(label, tx + 22, ty + 33);
    tx += tw + 14;
  });

  // 底部诗意寄语
  ctx.strokeStyle = "rgba(42,35,32,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 910);
  ctx.lineTo(W - pad, 910);
  ctx.stroke();

  ctx.fillStyle = "#3E3530";
  ctx.font = '600 30px "Noto Serif SC", Georgia, serif';
  wrapCanvasText(ctx, slice.quote, pad, 976, W - pad * 2, 48);

  ctx.fillStyle = "#8C7F77";
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("潮汐历 TideLog · 纯本地无广身体手帐", pad, H - 64);

  downloadCanvasPng(canvas, `tidelog-monthly-${slice.monthLabel}.png`);
  showToast("3:4 晒图海报已保存");
}

function exportDoctorPng(stats) {
  const W = 900, H = 1220;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#221E1C";
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const pad = 74;
  ctx.fillStyle = "#1A1817";
  ctx.font = '700 38px "Noto Serif SC", Georgia, serif';
  ctx.fillText("妇科门诊月经史摘要", pad, 114);
  ctx.fillStyle = "#5F5852";
  ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`生成日期：${toDateStr(new Date())}  ·  当前周期第 ${stats.cycleDay} 天`, pad, 152);

  ctx.strokeStyle = "#1A1817";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pad, 178);
  ctx.lineTo(W - pad, 178);
  ctx.stroke();

  const metrics = [
    ["末次月经首日 (LMP)", stats.lmpDate, `距今第 ${stats.cycleDay} 天`],
    ["既往周期范围 / 均值", `${stats.minCycle}~${stats.maxCycle} 天（均 ${stats.avgCycleLen} 天）`, `最大差值 ${stats.variation} 天`],
    ["平均行经天数", `${stats.avgPeriodLen} 天`, "参考值 3~7 天"],
    ["记录周期数", `${stats.sortedCycles.length} 次`, "已过滤偶发异常"]
  ];
  const mw = (W - pad * 2 - 20) / 2;
  metrics.forEach(([lbl, val, sub], i) => {
    const mx = pad + (i % 2) * (mw + 20);
    const my = 206 + Math.floor(i / 2) * 144;
    drawRoundedRect(ctx, mx, my, mw, 124, 14);
    ctx.fillStyle = "#F6F4EF";
    ctx.fill();
    ctx.fillStyle = "#C96A50";
    ctx.fillRect(mx, my + 12, 6, 100);
    ctx.fillStyle = "#5D5650";
    ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(lbl, mx + 22, my + 36);
    ctx.fillStyle = "#151210";
    ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(val, mx + 22, my + 76);
    ctx.fillStyle = "#6F6862";
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sub, mx + 22, my + 106);
  });

  let y = 532;
  ctx.fillStyle = "#1A1817";
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("近 6 次月经起止明细", pad, y);
  y += 38;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#5D5650";
  ctx.fillText("来潮首日            结束日期（天数）         周期间隔          备注", pad, y);
  y += 16;
  ctx.strokeStyle = "#DED9D2";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();

  ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
  [...stats.historyRows].slice(-6).reverse().forEach(r => {
    y += 44;
    ctx.fillStyle = "#1C1917";
    ctx.fillText(r.startDate, pad, y);
    ctx.fillText(`${r.endDate || "--"} (${r.duration}天)`, pad + 185, y);
    ctx.fillText(r.cycleLen ? `${r.cycleLen} 天` : `进行中(Day ${stats.cycleDay})`, pad + 425, y);
    ctx.fillStyle = r.excluded ? "#C96A50" : "#5D5650";
    ctx.fillText(r.excluded ? "偶发异常" : "正常", pad + 615, y);
  });

  if ((appState.doctorQuestions || []).length) {
    y += 66;
    ctx.fillStyle = "#1A1817";
    ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("本次想咨询医生的问题：", pad, y);
    y += 36;
    ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#2A2523";
    appState.doctorQuestions.forEach(q => {
      y = wrapCanvasText(ctx, `• ${q}`, pad, y, W - pad * 2, 34) + 6;
    });
  }

  downloadCanvasPng(canvas, `tidelog-doctor-card-${toDateStr(new Date())}.png`);
  showToast("妇科看病小抄高清图已保存");
}

function runSelfChecks() {
  const sample = createDefaultState();
  const stats = computeCycleStats(sample);
  console.assert(stats.avgCycleLen >= 21 && stats.avgCycleLen <= 35, "avgCycleLen bounds");
  console.assert(stats.nextPredStart <= stats.nextPredCenter && stats.nextPredCenter <= stats.nextPredEnd, "window order");
  const w0 = evalWaveY(0.45);
  console.assert(w0.yEnergy >= 10 && w0.yEnergy <= 82, "wave y bounds");
  const migrated = normalizeState({ settings: { defaultCycleLen: 30, persona: "ceo", partnerTone: "ceo" }, cycles: sample.cycles });
  console.assert(migrated.settings.persona === "gentle" && migrated.settings.partnerTone === "gentle" && migrated.settings.theme === "paper", "migration defaults");
  const insight = discoverPersonalInsight(sample, stats);
  console.assert(Boolean(insight && insight.includes("狂想吃甜食")), "pattern discovery detects pre-period craving");
  sample.logs[toDateStr(new Date())].tags.push("intimate_protected");
  const slice = getMonthlySliceData(sample, stats);
  console.assert(!slice.topTags.some(t => t.includes("亲密")), "monthly slice must exclude intimate tags");

  // 自检：历史记录按时间顺序排列 & 日历分期识别（生理期 / 卵泡期 / 排卵期 / 黄体期）
  for (let i = 1; i < stats.historyRows.length; i++) {
    console.assert(stats.historyRows[i].startDate >= stats.historyRows[i - 1].startDate, "historyRows must be chronological");
  }
  const latestStart = stats.sortedCycles[stats.sortedCycles.length - 1].startDate;
  console.assert(getCalendarDayPhase(latestStart, stats).type === "period", "start day must be period");
  console.assert(getCalendarDayPhase(addDays(latestStart, 7), stats).type === "follicular", "day 8 must be follicular");
  console.assert(getCalendarDayPhase(addDays(latestStart, stats.ovulationDayNum - 1), stats).type === "ovulation", "ovulation day must be ovulation");
  console.assert(getCalendarDayPhase(addDays(latestStart, stats.ovulationDayNum + 5), stats).type === "luteal", "post-ovulation must be luteal");

  // 自检：单日点选涂色合并/拆分与重叠周期合并
  const testState = { settings: { defaultPeriodLen: 5 }, cycles: [], logs: {}, isDemoData: true };
  togglePeriodDay(testState, "2026-10-01");
  togglePeriodDay(testState, "2026-10-02");
  togglePeriodDay(testState, "2026-10-03");
  console.assert(testState.cycles.length === 1 && testState.cycles[0].startDate === "2026-10-01" && testState.cycles[0].endDate === "2026-10-03", "adjacent paint days must merge");
  togglePeriodDay(testState, "2026-10-02");
  console.assert(testState.cycles.length === 2, "unmarking middle day must split span cleanly");
  upsertCycleMerged(testState, { startDate: "2026-10-01", endDate: "2026-10-05", excluded: false });
  console.assert(testState.cycles.length === 1 && testState.cycles[0].endDate === "2026-10-05", "overlapping upsert must merge cleanly");

  // 自检：手机端 7 天周历条周一到周日连续 7 天且包含基准日
  const wk = getWeekDates("2026-11-25");
  console.assert(wk.length === 7 && wk[0] === "2026-11-23" && wk[6] === "2026-11-29" && wk.includes("2026-11-25"), "week strip spans Mon-Sun containing anchor");
}

document.addEventListener("DOMContentLoaded", () => {
  runSelfChecks();
  bindEvents();
  renderAll();
});
