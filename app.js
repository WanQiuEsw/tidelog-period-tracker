// TideLog (潮汐历) - Local-First Period & Hormone Cycle Syncing App
// shortcut: single-file state in localStorage, upgrade to IndexedDB only if logs exceed 10+ years of daily rich media.

const STORAGE_KEY = "tidelog_v1_state";
const DAY_MS = 86400000;

function toDateStr(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function diffDays(dateStrA, dateStrB) {
  const a = parseDateStr(dateStrA);
  const b = parseDateStr(dateStrB);
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

function formatCNDate(dateStr) {
  if (!dateStr) return "--";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日`;
}

// 预设胶囊标签体系（支持普通模式与月相暗语模式双语切换）
const SYMPTOM_GROUPS = [
  {
    id: "flow",
    title: "经量与性状",
    camoTitle: "潮汐强度",
    intimate: false,
    items: [
      { id: "flow_light", label: "💧 点滴/少量", camo: "💧 微汐" },
      { id: "flow_medium", label: "🩸 正常经量", camo: "🌊 常潮" },
      { id: "flow_heavy", label: "🌊 量大夜用", camo: "⛈️ 涌潮" },
      { id: "flow_clots", label: "🫘 伴随血块", camo: "🪨 暗流" },
      { id: "flow_brown", label: "🍂 褐色分泌", camo: "🍂 余汐" }
    ]
  },
  {
    id: "body",
    title: "身体感受",
    camoTitle: "体感信号",
    intimate: false,
    items: [
      { id: "pain_cramps_mild", label: "⚡ 轻微腹坠", camo: "⚡ 轻微震荡" },
      { id: "pain_cramps_heavy", label: "🔥 重度痛经", camo: "🔥 强能量波动" },
      { id: "body_backache", label: "🪵 腰酸背痛", camo: "🪵 核心酸沉" },
      { id: "body_breast", label: "🎈 乳房胀痛", camo: "🎈 胸廓敏感" },
      { id: "body_headache", label: "🤕 偏头痛", camo: "🤕 头部紧绷" },
      { id: "body_acne", label: "🌱 下巴冒痘", camo: "🌱 肌表微瑕" },
      { id: "body_bloating", label: "🫧 水肿腹胀", camo: "🫧 储水期" },
      { id: "body_insomnia", label: "🦉 浅眠多梦", camo: "🦉 夜航浅眠" }
    ]
  },
  {
    id: "mood",
    title: "荷尔蒙情绪与精力",
    camoTitle: "精神电波",
    intimate: false,
    items: [
      { id: "mood_calm", label: "🍵 平静松弛", camo: "🍵 静水深流" },
      { id: "mood_focus", label: "✨ 思维极度清晰", camo: "✨ 满格灵感" },
      { id: "mood_tired", label: "🔋 电量仅剩20%", camo: "🔋 低功耗模式" },
      { id: "mood_irritable", label: "🧨 莫名烦躁易怒", camo: "🧨 气压偏低" },
      { id: "mood_sad", label: "🌧️ 委屈想哭", camo: "🌧️ 阴雨微潮" },
      { id: "mood_craving", label: "🥐 疯狂想吃碳水/甜食", camo: "🥐 热量召唤" }
    ]
  },
  {
    id: "intimate",
    title: "私密与用药打卡",
    camoTitle: "特殊信标",
    intimate: true,
    items: [
      { id: "med_painkiller", label: "💊 服用布洛芬/止痛药", camo: "💊 舒缓补给" },
      { id: "med_iron", label: "🍷 补铁/热敷暖贴", camo: "🍷 暖能补充" },
      { id: "intimate_protected", label: "🛡️ 亲密(有措施)", camo: "🛡️ 双星伴行(护)" },
      { id: "intimate_unprotected", label: "❤️ 亲密(无措施)", camo: "❤️ 双星交汇" },
      { id: "med_bcp", label: "📅 短效避孕药打卡", camo: "📅 周期锚点打卡" }
    ]
  }
];

// 身体四季科学元数据（Cycle Syncing）
const SEASON_META = {
  winter: {
    key: "winter",
    colorVar: "var(--season-winter)",
    softVar: "var(--season-winter-soft)",
    badge: "❄️ 身体冬季 · 月经休养期",
    camoBadge: "🌑 朔月潮汐 · 深度归零期",
    title: "冬季 · 经期来潮",
    camoTitle: "朔月 · 潮汐休整",
    work: "大脑左右半球连接最紧密的时期。不必强迫自己开启高强度新项目，适合做复盘、断舍离与直觉型决策。",
    sport: "子宫内膜正在剥落更新，停止高冲击HIIT与卷腹。推荐阴瑜伽、冥想或慢速散步，给身体彻底放假。",
    reassurance: "💛 反焦虑抱抱：现在雌激素和孕酮双双处于谷底。今天只想躺平、反应变慢并不是你懒惰，而是身体正在进行每月一次的深度重启。",
    partnerScience: {
      quote: "她目前处于【身体冬季（月经期）】，体内前列腺素引发子宫平滑肌收缩，雌激素处于全月最低谷，体力值约剩 25%。",
      dos: "✅ 主动接管洗碗/家务、准备好热饮或暖水袋、允许她安静放空",
      donts: "❌ 忌说“多喝热水”、忌催促赶时间、忌在这个阶段争辩复杂矛盾"
    },
    partnerWitty: {
      quote: "🚨 一级警报：本宫正在经历每月一次的“渡劫掉血期”，当前护甲值为 0，痛感神经放大 200%！",
      dos: "✅ 投喂温热红糖姜茶/热汤、主动承包外卖与跑腿、提供人肉暖手宝服务",
      donts: "❌ 严禁惹毛、严禁讲大道理、严禁问“怎么又累了”"
    },
    partnerMinimal: {
      quote: "【状态：冬季休眠 / 电量 25%】生理痛感与疲劳高发期。",
      dos: "✅ 宜：热敷、投喂温食、免除家务",
      donts: "❌ 忌：讲道理、安排高体力外出"
    }
  },
  spring: {
    key: "spring",
    colorVar: "var(--season-spring)",
    softVar: "var(--season-spring-soft)",
    badge: "🌱 身体春季 · 卵泡复苏期",
    camoBadge: "🌒 上弦新芽 · 能量攀升期",
    title: "春季 · 卵泡生长期",
    camoTitle: "上弦 · 灵感复苏",
    work: "雌激素稳步爬升，大脑多巴胺与好奇心同步觉醒！现在是开启新计划、头脑风暴、学习新技能与攻克难题的黄金周。",
    sport: "体能与肌肉恢复速度明显加快，适合逐步恢复慢跑、普拉提、网球或中等强度有氧训练。",
    reassurance: "💚 身体信号：你会明显感觉水肿消退、皮肤变透亮、情绪轻盈。趁着这波天然的荷尔蒙顺风车去推进你想做的事吧！",
    partnerScience: {
      quote: "她已进入【身体春季（卵泡期）】，雌激素持续回升，血清素与多巴胺分泌增加，她的精力、创造力与好心情正在快速回归。",
      dos: "✅ 约她探索新餐厅、一起规划周末短途出游、支持她的新点子",
      donts: "❌ 不要扫兴泼冷水，这是她一个月里最有干劲的阶段"
    },
    partnerWitty: {
      quote: "🌱 满血复活通知！渡劫结束，本仙女的智商、颜值与好脾气已重新占领高地！",
      dos: "✅ 适合带我出去吃好吃的、拍照打卡、讨论有趣的计划",
      donts: "❌ 别宅着发霉，趁我心情好赶紧表现"
    },
    partnerMinimal: {
      quote: "【状态：春季复苏 / 电量 85%】雌激素上升，情绪积极明朗。",
      dos: "✅ 宜：约会、运动、探索新鲜事物",
      donts: "❌ 忌：沉闷敷衍"
    }
  },
  summer: {
    key: "summer",
    colorVar: "var(--season-summer)",
    softVar: "var(--season-summer-soft)",
    badge: "☀️ 身体夏季 · 排卵高能期",
    camoBadge: "🌕 满月巅峰 · 光芒外放期",
    title: "夏季 · 黄金高能期",
    camoTitle: "满月 · 能量峰值",
    work: "雌激素达到全月巅峰！你的语言表达力、共情力与抗压能力处于最强状态。最适合做公开演讲、商务谈判、面试或重要社交。",
    sport: "爆发力与核心体能满格！适合挑战个人最佳纪录（PB）、力量举铁、燃脂搏击或高强度间歇训练。",
    reassurance: "🧡 贴心提醒：满格的社交欲可能会让你不小心排满日程。注意排卵期可能伴随轻微单侧小腹隐痛或透明拉丝分泌物，均属健康生理现象。",
    partnerScience: {
      quote: "她正处于【身体夏季（排卵高峰期）】，雌激素与促黄体生成素达到峰值，这是她全月社交欲、魅力值与精力最旺盛的几天。",
      dos: "✅ 安排浪漫约会、真诚夸赞她的状态、共同参与社交或运动",
      donts: "❌ 若有避孕需求，这几天属于高受孕风险窗口，请务必严格做好安全措施"
    },
    partnerWitty: {
      quote: "☀️ 全月高光时刻！今日颜值、气场与精力统统拉满，属于“看谁都顺眼”的限时福利期～",
      dos: "✅ 夸我好看、带我去热闹浪漫的地方约会",
      donts: "❌ 重点提醒：安全措施必须100%到位，别掉链子！"
    },
    partnerMinimal: {
      quote: "【状态：夏季巅峰 / 电量 100%】表达欲与体能全月最高。",
      dos: "✅ 宜：深度沟通、约会、严格避孕(如非备孕)",
      donts: "❌ 忌：忽视她的分享欲"
    }
  },
  autumn: {
    key: "autumn",
    colorVar: "var(--season-autumn)",
    softVar: "var(--season-autumn-soft)",
    badge: "🍂 身体秋季 · 黄体敏感期",
    camoBadge: "🌘 下弦内敛 · 节能防御期",
    title: "秋季 · 黄体缓冲期",
    camoTitle: "下弦 · 能量回落",
    work: "孕酮升高使基础体温上升 0.3~0.5℃，大脑对细节和风险更敏感。适合做推进收尾、校对审核与独立专注工作，减少无效社交。",
    sport: "黄体晚期容易更快感到心率升高和疲惫。请把高强度燃脂切换为拉伸、快走或轻重量训练，绝不苛责体能下降。",
    reassurance: "💜 科学脱敏：黄体晚期孕酮与血清素骤降，大脑会本能地渴望高碳水/甜食来合成快乐激素，且容易对小事产生悲观或烦躁（PMS）。**这不是你的性格缺陷，是荷尔蒙退潮时的生理反射，请允许自己早睡和吃一点喜欢的食物。**",
    partnerScience: {
      quote: "她进入了【身体深秋（黄体期 / PMS 敏感期）】，孕酮冲高后开始回落，导致基础体温升高、容易疲倦，且大脑血清素下降会降低情绪缓冲阈值。",
      dos: "✅ 给她独处和早睡的空间、备好健康小零食、在她烦躁时先共情拥抱而非讲道理",
      donts: "❌ 千万不要把她的情绪波动归咎于“无理取闹”，不要在这个阶段挑起敏感话题"
    },
    partnerWitty: {
      quote: "🍂 警告：已进入暴风雨前的【秋日敏感结界】！体内快乐激素正在滑坡，我现在就像一只炸毛边缘的猫，非常需要碳水和安慰！",
      dos: "✅ 无条件顺毛、投喂好吃的甜点/热食、听我吐槽并坚定站我这边",
      donts: "❌ 严禁顶嘴、严禁冷战、严禁质疑我为什么突然不开心"
    },
    partnerMinimal: {
      quote: "【状态：秋季回落 / 电量 45%】经前敏感期 (PMS)，易疲惫与情绪波动。",
      dos: "✅ 宜：顺毛倾听、温暖陪伴、减少施压",
      donts: "❌ 忌：争吵、说教、挑刺"
    }
  }
};

// 生成贴合当前时间的默认真实感演示数据（让用户一打开就能看到完整的四季、历史规律与就医卡）
function createDefaultState() {
  const todayStr = toDateStr(new Date());
  // 默认让用户处于周期第 19 天（身体秋季/黄体期），或可一键点击切换为“今日来潮”
  const c1Start = addDays(todayStr, -18);
  const c2Start = addDays(c1Start, -29);
  const c3Start = addDays(c2Start, -28);
  const c4Start = addDays(c3Start, -31);
  const c5Start = addDays(c4Start, -28);

  const logs = {};
  logs[c1Start] = { tags: ["flow_medium", "pain_cramps_mild", "med_iron"], note: "第一天有点腰酸，贴了暖宝宝舒服很多。" };
  logs[addDays(c1Start, 1)] = { tags: ["flow_heavy", "pain_cramps_heavy", "med_painkiller", "mood_tired"], note: "第二天量最大，吃了一粒布洛芬。" };
  logs[addDays(c2Start, 1)] = { tags: ["flow_heavy", "pain_cramps_mild", "body_backache"], note: "" };
  logs[addDays(c3Start, 0)] = { tags: ["flow_medium", "body_headache"], note: "" };
  logs[todayStr] = { tags: ["mood_craving", "body_breast"], note: "下午特别想喝热奶茶，进入身体秋天模式，今晚准备早点睡。" };

  return {
    settings: {
      defaultCycleLen: 29,
      defaultPeriodLen: 5,
      camouflageMode: false,
      hideIntimateTags: false,
      partnerTone: "science"
    },
    cycles: [
      { id: "c5", startDate: c5Start, endDate: addDays(c5Start, 4), excluded: false },
      { id: "c4", startDate: c4Start, endDate: addDays(c4Start, 5), excluded: false },
      { id: "c3", startDate: c3Start, endDate: addDays(c3Start, 4), excluded: false },
      { id: "c2", startDate: c2Start, endDate: addDays(c2Start, 4), excluded: false },
      { id: "c1", startDate: c1Start, endDate: addDays(c1Start, 4), excluded: false }
    ],
    logs
  };
}

let appState = loadState();
let selectedDateStr = toDateStr(new Date());
let calendarViewDate = new Date();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cycles) || !parsed.settings) {
      return createDefaultState();
    }
    return parsed;
  } catch (e) {
    return createDefaultState();
  }
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
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

// 核心算法：计算加权平均周期、波动差值、当前所处季节与弹性预测窗口
function computeCycleStats(state) {
  const sorted = [...state.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const defaultCycle = Number(state.settings.defaultCycleLen) || 28;
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
      if (!cur.excluded && cycleLen >= 16 && cycleLen <= 65) {
        lengths.push(cycleLen);
      }
    }
    historyRows.push({
      ...cur,
      duration: dur,
      cycleLen
    });
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
  // 波动越小置信度越高
  const confidence = Math.max(68, Math.min(96, 95 - variation * 3));

  const todayStr = toDateStr(new Date());
  const latestCycle = sorted.length ? sorted[sorted.length - 1] : null;
  const lmpDate = latestCycle ? latestCycle.startDate : todayStr;
  const cycleDay = Math.max(1, diffDays(todayStr, lmpDate) + 1);

  // 弹性预测下次来潮窗口
  const nextPredCenter = addDays(lmpDate, avgCycleLen);
  const spread = Math.max(1, Math.min(3, Math.round(variation / 2)));
  const nextPredStart = addDays(nextPredCenter, -spread);
  const nextPredEnd = addDays(nextPredCenter, spread);

  // 排卵日通常在下次来潮前 14 天
  const ovulationDayNum = Math.max(avgPeriodLen + 3, avgCycleLen - 14);

  const seasonInfo = getSeasonForDay(cycleDay, avgPeriodLen, ovulationDayNum, avgCycleLen);

  return {
    sortedCycles: sorted,
    historyRows: historyRows.reverse(),
    avgCycleLen,
    avgPeriodLen,
    minCycle,
    maxCycle,
    variation,
    confidence,
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
  if (effectiveDay <= periodLen) {
    return SEASON_META.winter;
  }
  if (effectiveDay < ovulationDayNum - 2) {
    return SEASON_META.spring;
  }
  if (effectiveDay <= ovulationDayNum + 2) {
    return SEASON_META.summer;
  }
  return SEASON_META.autumn;
}

// 判断某一天是否在已记录的真实经期内
function isDateInLoggedPeriod(dateStr, cycles, defaultPeriodLen) {
  for (const c of cycles) {
    const end = c.endDate || addDays(c.startDate, defaultPeriodLen - 1);
    if (dateStr >= c.startDate && dateStr <= end) return true;
  }
  return false;
}

// 判断未来某一天所处的预测状态
function getFutureDatePrediction(dateStr, stats) {
  const daysFromLmp = diffDays(dateStr, stats.lmpDate);
  if (daysFromLmp < 0) return { type: "past", season: SEASON_META.spring };

  const cycleLen = stats.avgCycleLen;
  const modDay = (daysFromLmp % cycleLen) + 1;
  const isFuture = dateStr > toDateStr(new Date());

  const isPredictedPeriod =
    isFuture &&
    daysFromLmp >= cycleLen - 1 &&
    (modDay <= stats.avgPeriodLen || modDay === cycleLen);

  const isOvulationWindow =
    modDay >= stats.ovulationDayNum - 2 && modDay <= stats.ovulationDayNum + 2;

  const season = getSeasonForDay(modDay, stats.avgPeriodLen, stats.ovulationDayNum, cycleLen);

  return {
    type: isPredictedPeriod ? "predicted-period" : isOvulationWindow ? "ovulation" : "normal",
    modDay,
    season
  };
}

// 渲染全局界面
function renderAll() {
  const stats = computeCycleStats(appState);
  const camo = Boolean(appState.settings.camouflageMode);

  // 1. 切换月相暗语模式主题
  document.body.classList.toggle("camouflage-mode", camo);
  document.getElementById("brandMark").textContent = camo ? "月" : "汐";
  document.getElementById("brandTitle").textContent = camo ? "月相天文台 LunarLog" : "潮汐历 TideLog";
  document.getElementById("brandSubtitle").textContent = camo
    ? "自然节律与精力潮汐观测笔记"
    : "去粉红化 · 身体四季与荷尔蒙能量天文台";
  document.getElementById("camouflageIcon").textContent = camo ? "🌕" : "🌙";
  document.getElementById("camouflageText").textContent = camo ? "月相暗语模式：已开启" : "月相暗语模式：关";
  document.getElementById("camouflageBtn").classList.toggle("active", camo);

  renderCompassTab(stats, camo);
  renderCapsuleLogger(camo);
  renderCalendarTab(stats, camo);
  renderDoctorTab(stats);
  renderToolkitTab(stats);
  renderSettingsTab();
}

// 渲染 Tab 1：身体四季能量罗盘
function renderCompassTab(stats, camo) {
  const s = stats.seasonInfo;
  const badgeEl = document.getElementById("currentSeasonBadge");
  badgeEl.textContent = camo ? s.camoBadge : s.badge;
  badgeEl.style.background = s.softVar;
  badgeEl.style.color = s.colorVar;

  document.getElementById("predictionConfidence").textContent = `弹性预测置信度 ${stats.confidence}%`;
  document.getElementById("cycleDayLabel").textContent = camo ? "当前月相周期" : "当前生理周期";
  document.getElementById("cycleDayNum").textContent = `Day ${stats.cycleDay}`;

  const titleEl = document.getElementById("compassSeasonTitle");
  titleEl.textContent = camo ? s.camoTitle : s.title;
  titleEl.style.color = s.colorVar;

  const daysUntilNext = diffDays(stats.nextPredCenter, toDateStr(new Date()));
  const hintPrefix = camo ? "下次朔月潮汐窗口" : "下次预计来潮窗口";
  document.getElementById("compassNextHint").textContent =
    daysUntilNext >= 0
      ? `${hintPrefix}：${formatCNDate(stats.nextPredStart)} ~ ${formatCNDate(stats.nextPredEnd)}（约 ${daysUntilNext} 天后）`
      : `${hintPrefix}：已进入弹性来潮窗口（推迟 ${Math.abs(daysUntilNext)} 天属常见波动）`;

  // 更新 SVG 圆环进度与光点坐标
  const circumference = 2 * Math.PI * 102; // 640.88
  const progressRatio = Math.min(1, Math.max(0.04, stats.cycleDay / stats.avgCycleLen));
  const offset = circumference * (1 - progressRatio);
  const ringEl = document.getElementById("cycleProgressRing");
  ringEl.style.strokeDashoffset = String(offset);
  ringEl.style.stroke = s.colorVar;

  const angleRad = (progressRatio * 360 - 90) * (Math.PI / 180);
  const dotX = 125 + 102 * Math.cos(angleRad);
  const dotY = 125 + 102 * Math.sin(angleRad);
  const dotEl = document.getElementById("cycleDotIndicator");
  dotEl.setAttribute("cx", dotX.toFixed(1));
  dotEl.setAttribute("cy", dotY.toFixed(1));
  dotEl.setAttribute("stroke", s.colorVar);

  // 更新荷尔蒙游标线
  const cursorX = Math.min(392, Math.max(8, Math.round(progressRatio * 400)));
  const cursorLine = document.getElementById("hormoneCursorLine");
  const cursorDot = document.getElementById("hormoneCursorDot");
  cursorLine.setAttribute("x1", String(cursorX));
  cursorLine.setAttribute("x2", String(cursorX));
  cursorLine.setAttribute("stroke", s.colorVar);
  cursorDot.setAttribute("cx", String(cursorX));
  cursorDot.setAttribute("fill", s.colorVar);

  // 一键打卡按钮状态
  const todayStr = toDateStr(new Date());
  const todayInPeriod = isDateInLoggedPeriod(todayStr, stats.sortedCycles, stats.avgPeriodLen);
  const quickBtn = document.getElementById("quickPeriodToggleBtn");
  document.getElementById("quickBtnIcon").textContent = todayInPeriod ? "🌿" : camo ? "🌑" : "🩸";
  document.getElementById("quickBtnText").textContent = todayInPeriod
    ? camo
      ? "今日仍在潮汐期（点击标记结束）"
      : "今日仍在经期（点击标记姨妈结束）"
    : camo
      ? "记录今日朔月潮汐开启"
      : "今日大姨妈来了（一键打卡）";
  quickBtn.style.background = s.colorVar;

  // 渲染今日三维能量指南卡片
  const guidesContainer = document.getElementById("dailyGuideCards");
  guidesContainer.innerHTML = `
    <div class="guide-item">
      <div class="guide-icon" style="background: ${s.softVar}; color: ${s.colorVar};">🧠</div>
      <div class="guide-content">
        <h4>今日职场与脑力节律</h4>
        <p>${s.work}</p>
      </div>
    </div>
    <div class="guide-item">
      <div class="guide-icon" style="background: var(--season-spring-soft); color: var(--season-spring);">🧘‍♀️</div>
      <div class="guide-content">
        <h4>运动与身体顺应指南</h4>
        <p>${s.sport}</p>
      </div>
    </div>
    <div class="guide-item guide-reassurance">
      <div class="guide-icon" style="background: rgba(255,255,255,0.65);">🫂</div>
      <div class="guide-content">
        <h4>荷尔蒙情绪解绑卡</h4>
        <p>${s.reassurance}</p>
      </div>
    </div>
  `;
}

// 渲染右栏：3秒身体胶囊面板
function renderCapsuleLogger(camo) {
  const todayStr = toDateStr(new Date());
  const isToday = selectedDateStr === todayStr;
  document.getElementById("loggerCardTitle").textContent = camo ? "3秒月相电波记录" : "3秒身体胶囊记录";
  document.getElementById("selectedDateDisplay").textContent =
    `正在记录：${formatCNDate(selectedDateStr)} ${isToday ? "（今天）" : "（点击日历可切换日期）"}`;

  const hideIntimate = Boolean(appState.settings.hideIntimateTags);
  document.getElementById("toggleIntimateTagsBtn").textContent = hideIntimate
    ? "👁️ 显示私密标签"
    : "🙈 隐藏私密标签";

  const dayLog = appState.logs[selectedDateStr] || { tags: [], note: "" };
  const activeTags = new Set(dayLog.tags || []);

  const container = document.getElementById("capsuleGroupsContainer");
  container.innerHTML = SYMPTOM_GROUPS.filter(g => !(hideIntimate && g.intimate))
    .map(group => {
      const groupTitle = camo ? group.camoTitle : group.title;
      const buttonsHtml = group.items
        .map(item => {
          const isSelected = activeTags.has(item.id);
          const text = camo ? item.camo : item.label;
          return `<button type="button" class="capsule-btn ${isSelected ? "selected" : ""}" data-tag-id="${item.id}">${text}</button>`;
        })
        .join("");

      return `
        <div class="symptom-group">
          <div class="symptom-group-title">
            <span>${groupTitle}</span>
          </div>
          <div class="capsule-grid">${buttonsHtml}</div>
        </div>
      `;
    })
    .join("");

  const noteInput = document.getElementById("dailyNoteInput");
  if (document.activeElement !== noteInput) {
    noteInput.value = dayLog.note || "";
  }
}

// 渲染 Tab 2：四季色彩智能日历 & 身体规律自检报告
function renderCalendarTab(stats, camo) {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById("calendarMonthTitle").textContent = `${year}年 ${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // 周一为 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(new Date());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(`<div class="cal-day empty"></div>`);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const inPeriod = isDateInLoggedPeriod(dateStr, stats.sortedCycles, stats.avgPeriodLen);
    const pred = getFutureDatePrediction(dateStr, stats);
    const hasLog =
      appState.logs[dateStr] &&
      ((appState.logs[dateStr].tags && appState.logs[dateStr].tags.length > 0) ||
        (appState.logs[dateStr].note && appState.logs[dateStr].note.trim().length > 0));

    const classes = ["cal-day"];
    if (dateStr === todayStr) classes.push("is-today");
    if (dateStr === selectedDateStr) classes.push("selected-day");
    if (inPeriod) {
      classes.push("is-period");
    } else if (pred.type === "predicted-period") {
      classes.push("is-predicted-period");
    } else if (pred.type === "ovulation") {
      classes.push("is-ovulation");
    }

    cells.push(`
      <div class="${classes.join(" ")}" data-date="${dateStr}" title="点击查看或记录 ${dateStr}">
        <span>${d}</span>
        ${hasLog ? '<i class="cal-day-dot"></i>' : ""}
      </div>
    `);
  }

  document.getElementById("calendarGrid").innerHTML = cells.join("");

  // 右侧规律统计
  const isRegular = stats.variation <= 7 && stats.avgCycleLen >= 21 && stats.avgCycleLen <= 35;
  document.getElementById("insightMetricsGrid").innerHTML = `
    <div class="doctor-metric-box" style="background: var(--bg-card-solid);">
      <div class="doctor-metric-label">加权平均周期长度</div>
      <div class="doctor-metric-val" style="color: var(--text-primary);">${stats.avgCycleLen} 天</div>
      <div class="doctor-metric-sub">医学参考常态：21 ~ 35 天</div>
    </div>
    <div class="doctor-metric-box" style="background: var(--bg-card-solid); border-left-color: var(--season-spring);">
      <div class="doctor-metric-label">平均${camo ? "潮汐" : "经期"}持续天数</div>
      <div class="doctor-metric-val" style="color: var(--text-primary);">${stats.avgPeriodLen} 天</div>
      <div class="doctor-metric-sub">医学参考常态：3 ~ 7 天</div>
    </div>
    <div class="doctor-metric-box" style="background: var(--bg-card-solid); border-left-color: var(--season-summer);">
      <div class="doctor-metric-label">近半年周期最大波动差</div>
      <div class="doctor-metric-val" style="color: var(--text-primary);">±${Math.round(stats.variation / 2)} 天（差值 ${stats.variation} 天）</div>
      <div class="doctor-metric-sub">${isRegular ? "✅ 节律非常稳健" : "💡 存在波动，已启用弹性窗口"}</div>
    </div>
    <div class="doctor-metric-box" style="background: var(--bg-card-solid); border-left-color: var(--season-autumn);">
      <div class="doctor-metric-label">下次黄金高能期 (排卵窗口)</div>
      <div class="doctor-metric-val" style="color: var(--text-primary); font-size: 18px;">
        ${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum - 2))} ~ ${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum + 2))}
      </div>
      <div class="doctor-metric-sub">精力与表达力峰值期</div>
    </div>
  `;

  // 历史周期列表（支持勾选排除异常周期）
  const historyContainer = document.getElementById("cycleHistoryList");
  historyContainer.innerHTML = stats.historyRows
    .map(row => {
      const lenBadge = row.cycleLen
        ? `周期 ${row.cycleLen} 天`
        : "当前进行中周期";
      return `
        <div class="guide-item" style="align-items: center; justify-content: space-between; padding: 12px 16px;">
          <div>
            <h4 style="font-size: 14px;">${formatCNDate(row.startDate)} ~ ${formatCNDate(row.endDate)}（持续 ${row.duration} 天）</h4>
            <p style="font-size: 12px;">${lenBadge} ${row.excluded ? "· ⚠️ 已标记为偶发异常（不计入均值）" : ""}</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 12px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" class="exclude-cycle-cb" data-cycle-id="${row.id}" ${row.excluded ? "checked" : ""} />
              排除异常
            </label>
            <button type="button" class="btn-secondary delete-cycle-btn" data-cycle-id="${row.id}" style="padding: 4px 10px; font-size: 12px;">删除</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// 渲染 Tab 3：妇科门诊就医一键小抄 (Doctor's Card)
function renderDoctorTab(stats) {
  // 汇总近 90 天内记录的高频症状
  const tagCounts = {};
  const labelMap = {};
  SYMPTOM_GROUPS.forEach(g => g.items.forEach(it => { labelMap[it.id] = it.label; }));

  Object.entries(appState.logs).forEach(([, log]) => {
    (log.tags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const topSymptoms = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, count]) => `${labelMap[id] || id} (${count}次)`)
    .join("、") || "近期无特殊不适标记";

  const rowsHtml = stats.historyRows
    .slice(0, 6)
    .map((r, idx) => `
      <tr>
        <td>第 ${idx + 1} 近周期</td>
        <td><strong>${r.startDate}</strong></td>
        <td>${r.endDate || "--"} (${r.duration} 天)</td>
        <td>${r.cycleLen ? r.cycleLen + " 天" : "当前周期 (Day " + stats.cycleDay + ")"}</td>
        <td>${r.excluded ? "偶发异常(熬夜/压力)" : "正常"}</td>
      </tr>
    `)
    .join("");

  document.getElementById("doctorSheetContent").innerHTML = `
    <div class="doctor-sheet-header">
      <div>
        <h3>妇科门诊月经史临床摘要卡 (Clinical Menstrual Summary)</h3>
        <p style="font-size: 12.5px; color: #555; margin-top: 4px;">生成日期：${toDateStr(new Date())} · 供临床问诊快速查阅</p>
      </div>
      <span style="background: #2B2523; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
        当前处于周期 Day ${stats.cycleDay}
      </span>
    </div>

    <div class="doctor-metrics-grid">
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">末次月经首日 (LMP - Last Menstrual Period)</div>
        <div class="doctor-metric-val">${stats.lmpDate}</div>
        <div class="doctor-metric-sub">距今第 ${stats.cycleDay} 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">既往周期区间 / 平均周期</div>
        <div class="doctor-metric-val">${stats.minCycle} ~ ${stats.maxCycle} 天（均值 ${stats.avgCycleLen} 天）</div>
        <div class="doctor-metric-sub">近半年最大周期差值：${stats.variation} 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">平均行经持续天数</div>
        <div class="doctor-metric-val">${stats.avgPeriodLen} 天</div>
        <div class="doctor-metric-sub">正常参考值 3~7 天</div>
      </div>
      <div class="doctor-metric-box">
        <div class="doctor-metric-label">近期主诉与高频伴随症状</div>
        <div class="doctor-metric-val" style="font-size: 14.5px; line-height: 1.45;">${topSymptoms}</div>
      </div>
    </div>

    <h4 style="font-size: 14px; margin-bottom: 8px; color: #222;">近 6 次月经起止明细表</h4>
    <table class="doctor-history-table">
      <thead>
        <tr>
          <th>序次</th>
          <th>来潮首日</th>
          <th>结束日期 (行经天数)</th>
          <th>周期长度</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

// 渲染 Tab 4：伴侣关怀行动卡 & 重要日程撞期测算器
function renderToolkitTab(stats) {
  const tone = appState.settings.partnerTone || "science";
  document.querySelectorAll("[data-partner-tone]").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-partner-tone") === tone);
  });

  const s = stats.seasonInfo;
  const copyData =
    tone === "witty"
      ? s.partnerWitty
      : tone === "minimal"
        ? s.partnerMinimal
        : s.partnerScience;

  document.getElementById("partnerCardPreview").innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="season-badge" style="background: ${s.softVar}; color: ${s.colorVar};">${s.badge}</span>
      <span style="font-size: 12px; color: var(--text-secondary);">周期 Day ${stats.cycleDay}</span>
    </div>
    <p class="partner-card-quote">“${copyData.quote}”</p>
    <div class="partner-dos-donts">
      <div class="partner-box">${copyData.dos}</div>
      <div class="partner-box">${copyData.donts}</div>
    </div>
  `;

  // 初始化撞期测算默认日期为 25 天后
  const eventDateInput = document.getElementById("eventDateInput");
  if (!eventDateInput.value) {
    eventDateInput.value = addDays(toDateStr(new Date()), 24);
  }
  renderEventCollisionResult(stats);
}

function renderEventCollisionResult(stats) {
  const eventName = document.getElementById("eventNameInput").value.trim() || "重要日程";
  const targetDate = document.getElementById("eventDateInput").value;
  if (!targetDate) return;

  const pred = getFutureDatePrediction(targetDate, stats);
  const s = pred.season;
  const isCollision = s.key === "winter";

  const checklist =
    s.key === "winter"
      ? "🎒 <strong>撞期应对包</strong>：预计当天正处于经期！建议提前备好日夜用卫生巾/棉条（水上活动可备棉条或月经杯）、布洛芬止痛药、便携暖宫贴；若为不可推迟的高考/重要比赛，建议提前 1 个月咨询妇科医生评估安全药物调经。"
      : s.key === "autumn"
        ? "🍂 <strong>深秋缓冲建议</strong>：当天处于经前黄体期（距离来潮很近），体能耐力略降，建议包里随身备一片护垫/卫生巾防提前来潮，行程切勿排得过满，留出充足睡眠。"
        : s.key === "summer"
          ? "☀️ <strong>满分状态喜报</strong>：当天正处于【身体夏季 · 黄金高能期】！体能、上镜皮肤状态与抗压能力均在巅峰，尽情享受你的重要日程吧！"
          : "🌱 <strong>轻盈复苏期</strong>：当天处于【身体春季 · 卵泡期】，完美避开经期与水肿期，精力充沛、心情明朗，非常适宜出行或迎战挑战！";

  document.getElementById("eventCollisionResult").innerHTML = `
    <div class="guide-item" style="border-color: ${s.colorVar}; background: ${s.softVar};">
      <div class="guide-icon" style="background: var(--bg-card-solid); color: ${s.colorVar};">
        ${isCollision ? "⚠️" : "✨"}
      </div>
      <div class="guide-content">
        <h4>【${eventName} · ${formatCNDate(targetDate)}】预计处于：${s.title}（周期约 Day ${pred.modDay}）</h4>
        <p style="margin-top: 6px; color: var(--text-primary);">${checklist}</p>
      </div>
    </div>
  `;
}

function renderSettingsTab() {
  document.getElementById("settingCycleLen").value = appState.settings.defaultCycleLen || 29;
  document.getElementById("settingPeriodLen").value = appState.settings.defaultPeriodLen || 5;
}

// 绑定交互事件
function bindEvents() {
  // 顶部防社死月相暗语模式切换
  document.getElementById("camouflageBtn").addEventListener("click", () => {
    appState.settings.camouflageMode = !appState.settings.camouflageMode;
    saveState(
      appState.settings.camouflageMode
        ? "🌕 已开启月相暗语模式（办公室防社死保护中）"
        : "🌿 已切换回身体四季自然模式"
    );
  });

  // 顶部 Tabs 切换
  document.querySelectorAll(".nav-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      const targetId = tabBtn.getAttribute("data-tab");
      document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      tabBtn.classList.add("active");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // 一键极速打卡（今日来潮 / 今日结束）
  document.getElementById("quickPeriodToggleBtn").addEventListener("click", () => {
    const todayStr = toDateStr(new Date());
    const stats = computeCycleStats(appState);
    const inPeriod = isDateInLoggedPeriod(todayStr, stats.sortedCycles, stats.avgPeriodLen);

    if (inPeriod) {
      // 将最近一次经期结束日设为昨天（若今天就是首日则移除本次误触打卡）
      const latest = appState.cycles[appState.cycles.length - 1];
      if (latest) {
        if (latest.startDate === todayStr) {
          appState.cycles.pop();
          saveState("已取消今日来潮打卡");
        } else {
          latest.endDate = addDays(todayStr, -1);
          saveState("🌿 已标记本次生理期结束，欢迎进入身体春季！");
        }
      }
    } else {
      const dur = Number(appState.settings.defaultPeriodLen) || 5;
      appState.cycles.push({
        id: "c_" + Date.now(),
        startDate: todayStr,
        endDate: addDays(todayStr, dur - 1),
        excluded: false
      });
      saveState("🩸 已记录今日来潮，开启身体冬季休养模式");
    }
  });

  // 补录历史经期弹窗
  const retroModal = document.getElementById("retroModal");
  const openRetro = () => {
    document.getElementById("retroStartDate").value = selectedDateStr;
    document.getElementById("retroEndDate").value = addDays(
      selectedDateStr,
      (Number(appState.settings.defaultPeriodLen) || 5) - 1
    );
    retroModal.classList.add("open");
  };
  const closeRetro = () => retroModal.classList.remove("open");

  document.getElementById("openRetroModalBtn").addEventListener("click", openRetro);
  document.getElementById("closeRetroModalBtn").addEventListener("click", closeRetro);
  document.getElementById("cancelRetroBtn").addEventListener("click", closeRetro);

  document.getElementById("confirmRetroBtn").addEventListener("click", () => {
    const start = document.getElementById("retroStartDate").value;
    let end = document.getElementById("retroEndDate").value;
    if (!start) {
      showToast("请选择来潮第一天日期");
      return;
    }
    const dur = Number(appState.settings.defaultPeriodLen) || 5;
    if (!end || end < start) {
      end = addDays(start, dur - 1);
    }
    appState.cycles.push({
      id: "c_" + Date.now(),
      startDate: start,
      endDate: end,
      excluded: false
    });
    closeRetro();
    saveState("✍️ 周期记录已保存，预测模型已动态更新");
  });

  // 胶囊症状点击委托
  document.getElementById("capsuleGroupsContainer").addEventListener("click", e => {
    const btn = e.target.closest(".capsule-btn");
    if (!btn) return;
    const tagId = btn.getAttribute("data-tag-id");
    if (!appState.logs[selectedDateStr]) {
      appState.logs[selectedDateStr] = { tags: [], note: "" };
    }
    const tags = appState.logs[selectedDateStr].tags;
    const idx = tags.indexOf(tagId);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tagId);
    }
    saveState("已记录今日身体胶囊");
  });

  // 隐藏/显示私密标签
  document.getElementById("toggleIntimateTagsBtn").addEventListener("click", () => {
    appState.settings.hideIntimateTags = !appState.settings.hideIntimateTags;
    saveState(appState.settings.hideIntimateTags ? "已隐藏私密与用药分类" : "已显示全部胶囊分类");
  });

  // 每日笔记自动保存
  document.getElementById("dailyNoteInput").addEventListener("input", e => {
    if (!appState.logs[selectedDateStr]) {
      appState.logs[selectedDateStr] = { tags: [], note: "" };
    }
    appState.logs[selectedDateStr].note = e.target.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  });

  // 日历月份切换与日期点击
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderAll();
  });
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderAll();
  });

  document.getElementById("calendarGrid").addEventListener("click", e => {
    const cell = e.target.closest(".cal-day[data-date]");
    if (!cell) return;
    selectedDateStr = cell.getAttribute("data-date");
    renderAll();
    showToast(`已选中 ${formatCNDate(selectedDateStr)}，可在首页记录当日胶囊`);
  });

  // 历史周期列表：排除异常周期 & 删除
  document.getElementById("cycleHistoryList").addEventListener("change", e => {
    if (e.target.classList.contains("exclude-cycle-cb")) {
      const id = e.target.getAttribute("data-cycle-id");
      const target = appState.cycles.find(c => c.id === id);
      if (target) {
        target.excluded = e.target.checked;
        saveState(target.excluded ? "已将该次异常波动排除出均值算法" : "已恢复计入周期均值");
      }
    }
  });

  document.getElementById("cycleHistoryList").addEventListener("click", e => {
    const delBtn = e.target.closest(".delete-cycle-btn");
    if (!delBtn) return;
    if (appState.cycles.length <= 1) {
      showToast("请至少保留 1 条基准周期记录");
      return;
    }
    const id = delBtn.getAttribute("data-cycle-id");
    appState.cycles = appState.cycles.filter(c => c.id !== id);
    saveState("已删除该条周期记录");
  });

  // 复制妇科门诊病历摘要
  document.getElementById("copyDoctorSummaryBtn").addEventListener("click", () => {
    const stats = computeCycleStats(appState);
    const text = [
      `【妇科门诊月经史摘要】生成日：${toDateStr(new Date())}`,
      `• 末次月经首日 (LMP)：${stats.lmpDate}（当前处于周期第 ${stats.cycleDay} 天）`,
      `• 既往周期范围：${stats.minCycle}~${stats.maxCycle} 天（平均 ${stats.avgCycleLen} 天，波动差值 ${stats.variation} 天）`,
      `• 平均行经天数：${stats.avgPeriodLen} 天`,
      `• 近3次来潮首日：${stats.historyRows.slice(0, 3).map(r => r.startDate).join(" / ")}`
    ].join("\n");
    navigator.clipboard?.writeText(text);
    showToast("🩺 已复制临床病历摘要到剪贴板");
  });

  // 伴侣卡片语气切换与一键复制
  document.querySelectorAll("[data-partner-tone]").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.settings.partnerTone = btn.getAttribute("data-partner-tone");
      saveState();
    });
  });

  document.getElementById("copyPartnerCardBtn").addEventListener("click", () => {
    const stats = computeCycleStats(appState);
    const s = stats.seasonInfo;
    const tone = appState.settings.partnerTone || "science";
    const copyData =
      tone === "witty" ? s.partnerWitty : tone === "minimal" ? s.partnerMinimal : s.partnerScience;
    const shareText = `💌【今日身体四季状态卡 · 周期 Day ${stats.cycleDay}】\n${s.badge}\n\n“${copyData.quote}”\n\n${copyData.dos}\n${copyData.donts}`;
    navigator.clipboard?.writeText(shareText);
    showToast("💌 已复制伴侣关怀卡，快去微信粘贴发给 TA 吧！");
  });

  // 重要日程撞期测算
  document.getElementById("calcEventCollisionBtn").addEventListener("click", () => {
    const stats = computeCycleStats(appState);
    renderEventCollisionResult(stats);
    showToast("🔮 已完成日程身体季节测算");
  });

  // 隐私保险箱：JSON 导出、导入与一键焚毁
  document.getElementById("exportDataBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tidelog-backup-${toDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📦 本地加密备份 JSON 已下载");
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
        if (!parsed || !Array.isArray(parsed.cycles) || !parsed.settings) {
          throw new Error("Invalid schema");
        }
        appState = parsed;
        saveState("✅ 备份数据已成功恢复至本地！");
      } catch (err) {
        showToast("❌ 备份文件格式有误，导入失败");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("nukeDataBtn").addEventListener("click", () => {
    if (window.confirm("确定要彻底焚毁当前浏览器中的所有周期、症状和笔记数据吗？此操作不可撤销。")) {
      localStorage.removeItem(STORAGE_KEY);
      appState = createDefaultState();
      appState.logs = {};
      saveState("🔥 本地历史痕迹已彻底清空");
    }
  });

  // 保存周期基准参数
  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    const cLen = Math.min(60, Math.max(18, Number(document.getElementById("settingCycleLen").value) || 29));
    const pLen = Math.min(14, Math.max(2, Number(document.getElementById("settingPeriodLen").value) || 5));
    appState.settings.defaultCycleLen = cLen;
    appState.settings.defaultPeriodLen = pLen;
    saveState("⚙️ 基准周期参数已更新");
  });
}

// 自检断言（Ponytail rule: assert-based self-check for core non-trivial cycle prediction math）
function runSelfChecks() {
  const sample = createDefaultState();
  const stats = computeCycleStats(sample);
  console.assert(stats.avgCycleLen >= 21 && stats.avgCycleLen <= 35, "Cycle average out of bounds");
  console.assert(stats.nextPredStart <= stats.nextPredCenter && stats.nextPredCenter <= stats.nextPredEnd, "Prediction window inverted");
  console.assert(getSeasonForDay(1, 5, 14, 28).key === "winter", "Day 1 must be winter");
  console.assert(getSeasonForDay(14, 5, 14, 28).key === "summer", "Ovulation day must be summer");
}

document.addEventListener("DOMContentLoaded", () => {
  runSelfChecks();
  bindEvents();
  renderAll();
});
