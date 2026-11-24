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

// 基础阶段元数据（Milestone 2 将注入完整温柔搭子/霸总双人设与即时语料）
const SEASON_META = {
  winter: {
    key: "winter",
    colorVar: "var(--season-winter)",
    softVar: "var(--season-winter-soft)",
    chip: "经期 · 合法躺平",
    stealthChip: "小雨 · 节能休整",
    title: "电量告急 · 合法躺平期",
    stealthTitle: "低电量休整日",
    work: "这两天不用逼自己冲刺，做点轻收尾、整理和放空就够了。",
    sport: "暂停蹦跳和卷腹，散散步、伸展一下肩膀或者早点躺进被窝最舒服。",
    note: "现在身体正在悄悄换新，只想发呆、不想说话不是偷懒，是身体在喊你慢下来。",
    waveLevel: 148
  },
  spring: {
    key: "spring",
    colorVar: "var(--season-spring)",
    softVar: "var(--season-spring-soft)",
    chip: "回血期 · 状态回升",
    stealthChip: "晴朗 · 电量回升",
    title: "满血回春 · 状态回升中",
    stealthTitle: "清透回血日",
    work: "脑子开始变轻盈，适合开启新计划、学点新东西或约朋友聊聊天。",
    sport: "体力恢复得很快，慢跑、普拉提、快走或者轻力量都可以慢慢安排上。",
    note: "水肿在消，皮肤也在变亮。趁这几天心情轻快，去做件一直想做的小事吧。",
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
    work: "表达欲和底气都很足，重要的汇报、面试、谈事或约会放这几天很合适。",
    sport: "体能在线，喜欢运动的话可以小冲一下，记得多喝水、别排太满。",
    note: "这几天很容易看什么都顺眼；如果偶尔单侧小腹有一点点闷，大多是排卵的小信号。",
    waveLevel: 166
  },
  autumn: {
    key: "autumn",
    colorVar: "var(--season-autumn)",
    softVar: "var(--season-autumn-soft)",
    chip: "经前预警 · 敏感期",
    stealthChip: "多云 · 慢节奏",
    title: "经前预警 · 情绪易燃易爆炸",
    stealthTitle: "微风多云日",
    work: "对细节和噪音更敏感，适合戴上耳机独立收尾，少管闲事、少做重大决定。",
    sport: "比平时更容易累和喘，把高强度换成拉伸、瑜伽或慢走，别责怪体力变差。",
    note: "突然嘴馋甜食或莫名委屈，真的不是你矫情，是激素在退潮。早点睡，买点喜欢的吃。",
    waveLevel: 154
  }
};

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
    doctorQuestions: [DOCTOR_QUESTIONS[0]]
  };
}

function normalizeState(raw) {
  const base = createDefaultState();
  if (!raw || !Array.isArray(raw.cycles) || !raw.settings) return base;
  const merged = {
    settings: { ...base.settings, ...raw.settings },
    cycles: raw.cycles.length ? raw.cycles : base.cycles,
    logs: raw.logs && typeof raw.logs === "object" ? raw.logs : {},
    events: Array.isArray(raw.events) ? raw.events : base.events,
    doctorQuestions: Array.isArray(raw.doctorQuestions) ? raw.doctorQuestions : base.doctorQuestions
  };
  // 兼容旧版 partnerTone 值
  if (!["gentle", "ceo", "witty"].includes(merged.settings.partnerTone)) {
    merged.settings.partnerTone = "gentle";
  }
  if (!["gentle", "ceo"].includes(merged.settings.persona)) {
    merged.settings.persona = "gentle";
  }
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
    historyRows: historyRows.reverse(),
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

// ==================== 全局渲染 ====================
function renderAll() {
  const stats = computeCycleStats(appState);
  const stealth = Boolean(appState.settings.camouflageMode);
  const persona = appState.settings.persona || "gentle";
  const theme = appState.settings.theme || "paper";

  // 主题与季节强调色
  document.body.setAttribute("data-theme", theme);
  document.body.classList.toggle("stealth-mode", stealth);
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--active-season", stats.seasonInfo.colorVar);
  rootStyle.setProperty("--active-season-soft", stats.seasonInfo.softVar);

  const themeColors = { paper: "#FAF6F0", sage: "#F3F6F2", midnight: "#12151C" };
  document.getElementById("metaThemeColor")?.setAttribute("content", themeColors[theme] || "#FAF6F0");

  // 顶部栏
  document.getElementById("brandTitle").textContent = stealth ? "晴雨手帐" : "潮汐历";
  document.getElementById("brandSubtitle").textContent = stealth
    ? "每日天气与精力小记"
    : "只存你设备里的小手帐";

  const personaBtn = document.getElementById("personaQuickBtn");
  personaBtn.classList.toggle("is-ceo", persona === "ceo");
  document.getElementById("personaQuickText").textContent = persona === "ceo" ? "霸总模式" : "温柔搭子";
  document.getElementById("stealthBtn").classList.toggle("active", stealth);

  renderTodayTab(stats, stealth, persona);
  renderCapsuleLogger(stealth);
  renderCalendarTab(stats, stealth);
  renderToolkitTab(stats, stealth, persona);
  renderMineTab(stealth, persona, theme);
}

function renderTodayTab(stats, stealth, persona) {
  const s = stats.seasonInfo;
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
  document.getElementById("cycleDayLabel").textContent = stealth
    ? "本月第几天"
    : todayInPeriod
      ? "正在经期"
      : "当前周期";
  document.getElementById("cycleDayNum").textContent = `第 ${stats.cycleDay} 天`;
  document.getElementById("compassPhaseTitle").textContent = stealth ? s.stealthTitle : s.title;

  const daysUntilNext = diffDays(stats.nextPredCenter, todayStr);
  const nextHintEl = document.getElementById("compassNextHint");
  if (todayInPeriod) {
    const leftDays = Math.max(0, stats.avgPeriodLen - stats.cycleDay);
    nextHintEl.textContent = leftDays > 0 ? `大概还有 ${leftDays} 天就舒服啦` : "快收尾了，辛苦啦";
  } else if (daysUntilNext > 0) {
    nextHintEl.textContent = stealth
      ? `下次小雨约 ${daysUntilNext} 天后`
      : `离下次大概还有 ${daysUntilNext} 天 · ${formatCNDate(stats.nextPredStart)}前后`;
  } else if (daysUntilNext === 0) {
    nextHintEl.textContent = stealth ? "今明两天可能会变天" : "差不多就在这两天，包里记得备一片";
  } else {
    const late = Math.abs(daysUntilNext);
    nextHintEl.textContent = stealth
      ? `比平时晚了 ${late} 天，别着急`
      : `晚点了 ${late} 天，先别慌，最近累了吗？`;
  }

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

  // 活人感气泡
  const bubble = document.getElementById("companionBubble");
  bubble.classList.toggle("is-ceo", persona === "ceo");
  document.getElementById("companionAvatar").textContent = persona === "ceo" ? "总" : "搭";
  document.getElementById("companionName").textContent = persona === "ceo" ? "霸总管家" : "手帐搭子";
  document.getElementById("companionTag").textContent = lastCompanionOverride ? "刚收到你的信号" : "今日悄悄话";
  document.getElementById("companionMessage").textContent = lastCompanionOverride || s.note;

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

  // 今日贴心小贴士
  document.getElementById("dailyGuideCards").innerHTML = `
    <div class="tip-card">
      <div class="tip-badge">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <div>
        <h4>今天适合怎么安排事</h4>
        <p>${escapeHtml(s.work)}</p>
      </div>
    </div>
    <div class="tip-card">
      <div class="tip-badge" style="color: var(--season-spring);">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
      </div>
      <div>
        <h4>身体怎么动更舒服</h4>
        <p>${escapeHtml(s.sport)}</p>
      </div>
    </div>
    <div class="tip-card highlight">
      <div class="tip-badge">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
      <div>
        <h4>给你兜底的一句话</h4>
        <p>${escapeHtml(s.note)}</p>
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
  document.getElementById("selectedDateDisplay").textContent = isToday
    ? "正在记：今天（点完自动保存）"
    : `正在补记：${formatCNDate(selectedDateStr)}（点完自动保存）`;

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
  document.getElementById("legendPeriodText").textContent = stealth ? "小雨日" : "记过的经期";
  document.getElementById("legendPredText").textContent = stealth ? "预计变天" : "预计会来";

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(new Date());
  const eventDates = new Set((appState.events || []).map(e => e.date));

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(`<div class="cal-day empty"></div>`);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const inPeriod = isDateInLoggedPeriod(dateStr, stats.sortedCycles, stats.avgPeriodLen);
    const pred = getFutureDatePrediction(dateStr, stats);
    const log = appState.logs[dateStr];
    const hasLog = log && ((log.tags && log.tags.length) || (log.note && log.note.trim()));
    const hasEvent = eventDates.has(dateStr);

    const cls = ["cal-day"];
    if (dateStr === todayStr) cls.push("is-today");
    if (dateStr === selectedDateStr) cls.push("selected-day");
    if (inPeriod) cls.push("is-period");
    else if (pred.type === "predicted-period") cls.push("is-predicted-period");
    else if (pred.type === "ovulation") cls.push("is-ovulation");

    cells.push(`
      <button type="button" class="${cls.join(" ")}" data-date="${dateStr}">
        <span>${d}</span>
        <span class="cal-dots">
          ${hasLog ? '<i class="cal-dot"></i>' : ""}
          ${hasEvent ? '<i class="cal-dot event"></i>' : ""}
        </span>
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
      <div class="stat-tile-label">下次高光日</div>
      <div class="stat-tile-val" style="font-size:15.5px;">${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum - 2))} ~ ${formatCNDate(addDays(stats.lmpDate, stats.ovulationDayNum + 2))}</div>
      <div class="stat-tile-sub">精力与状态通常最好</div>
    </div>
  `;

  // 历史列表
  document.getElementById("cycleHistoryList").innerHTML = stats.historyRows
    .map(row => `
      <div class="history-row">
        <div>
          <strong>${formatCNDate(row.startDate)} ~ ${formatCNDate(row.endDate)}（${row.duration}天）</strong>
          <small>${row.cycleLen ? `间隔 ${row.cycleLen} 天` : "本次周期进行中"}${row.excluded ? " · 已忽略偶发波动" : ""}</small>
        </div>
        <div class="history-row-ops">
          <label class="exclude-label">
            <input type="checkbox" class="exclude-cycle-cb" data-cycle-id="${row.id}" ${row.excluded ? "checked" : ""} />
            忽略异常
          </label>
          <button type="button" class="chip-action delete-cycle-btn" data-cycle-id="${row.id}">删</button>
        </div>
      </div>
    `)
    .join("");
}

function renderCalendarDayDrawer(stats, stealth) {
  const drawer = document.getElementById("calendarDayDrawer");
  const dateStr = selectedDateStr;
  const inPeriod = isDateInLoggedPeriod(dateStr, stats.sortedCycles, stats.avgPeriodLen);
  const pred = getFutureDatePrediction(dateStr, stats);
  const dayLog = appState.logs[dateStr] || { tags: [], note: "" };
  const activeTags = new Set(dayLog.tags || []);
  const dayEvents = (appState.events || []).filter(e => e.date === dateStr);

  // 抽屉放 8 个最高频标签，方便在日历页原地随手点
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

  const phaseText = inPeriod
    ? (stealth ? "记过的小雨日" : "记过的经期")
    : pred.type === "predicted-period"
      ? (stealth ? "预计可能会下雨" : "预计会在这几天来")
      : (stealth ? pred.season.stealthTitle : pred.season.title);

  const eventBanner = dayEvents.length
    ? `<p class="drawer-phase-sub" style="color:var(--season-spring); margin-top:4px;">大事记：${dayEvents.map(e => escapeHtml(e.name)).join("、")}</p>`
    : "";

  drawer.innerHTML = `
    <div class="drawer-top">
      <div>
        <div class="drawer-date-title">${formatCNDate(dateStr)} ${dateStr === toDateStr(new Date()) ? "· 今天" : ""}</div>
        <div class="drawer-phase-sub">${escapeHtml(phaseText)}</div>
        ${eventBanner}
      </div>
      <button type="button" class="chip-action" id="drawerStartPeriodBtn">
        ${inPeriod ? "这天已记经期" : "设为这天开始"}
      </button>
    </div>
    <div class="drawer-quick-tags">${quickChipsHtml}</div>
    <textarea id="drawerNoteInput" class="journal-textarea" rows="2" placeholder="给 ${formatCNDate(dateStr)} 留一句手帐备注…">${escapeHtml(dayLog.note || "")}</textarea>
  `;
}

// ==================== Tab 3: 工具箱（基础壳子，Milestone 3 将全面升级出图/呼吸/多日程） ====================
function renderToolkitTab(stats, stealth, persona) {
  const s = stats.seasonInfo;
  const tone = appState.settings.partnerTone || "gentle";
  document.querySelectorAll("#receiptTonePills [data-partner-tone]").forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-partner-tone") === tone);
  });

  document.getElementById("partnerReceiptPreview").innerHTML = `
    <div class="receipt-head">
      <div class="receipt-store">TIDELOG 今日生存小票</div>
      <div class="receipt-meta">${toDateStr(new Date())} · 周期第 ${stats.cycleDay} 天</div>
    </div>
    <p class="receipt-quote">“${escapeHtml(s.note)}”</p>
    <div class="receipt-rows">
      <div class="receipt-row"><strong>当前状态</strong><span>${escapeHtml(s.title)}</span></div>
      <div class="receipt-row"><strong>今日建议</strong><span>${escapeHtml(s.work)}</span></div>
      <div class="receipt-row"><strong>身体照顾</strong><span>${escapeHtml(s.sport)}</span></div>
    </div>
    <div class="receipt-barcode">|||| ||| || |||| ||| TIDELOG</div>
  `;

  document.getElementById("monthlySlicePreview").innerHTML = `
    <div class="slice-top">
      <span>TIDELOG 月度身体切片</span>
      <span>${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, "0")}</span>
    </div>
    <div class="slice-title">这个月，也好好照顾了自己</div>
    <div class="slice-stats">
      <div class="slice-stat-box"><strong>${stats.avgPeriodLen}天</strong><span>安心休整</span></div>
      <div class="slice-stat-box"><strong>${Object.keys(appState.logs).length}次</strong><span>手帐记录</span></div>
      <div class="slice-stat-box"><strong>${stats.avgCycleLen}天</strong><span>身体节奏</span></div>
    </div>
    <div class="slice-footer-quote">“不是每天都要满格运转，允许自己跟着潮汐起伏。”</div>
  `;

  renderEventsPanel(stats);
  renderDoctorPanel(stats);
  renderReliefTips();
}

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
  document.getElementById("eventCollisionResult").innerHTML = `
    <div class="tip-card highlight">
      <div>
        <h4>${escapeHtml(cur.name)}（${formatCNDate(cur.date)}）</h4>
        <p style="margin-top:4px;">预计处于 <strong>${escapeHtml(s.title)}</strong>（周期约第 ${pred.modDay} 天）。</p>
        <p style="margin-top:6px;">${s.key === "winter" ? "大概率会撞上经期，建议提前备好卫生巾/棉条、止痛药和暖贴，行程留出休息空隙。" : s.key === "autumn" ? "临近经期，包里顺手塞一片护垫防提前来潮，别把日程排太满。" : "状态很好，基本避开了难受的那几天，放心享受吧！"}</p>
      </div>
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

  const rowsHtml = stats.historyRows
    .slice(0, 6)
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

function renderMineTab(stealth, persona, theme) {
  document.querySelectorAll("[data-persona]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-persona") === persona);
  });
  document.querySelectorAll("[data-theme-choice]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === theme);
  });
  document.getElementById("stealthSwitchMine").setAttribute("aria-checked", String(stealth));
  document.getElementById("settingCycleLen").value = appState.settings.defaultCycleLen || 29;
  document.getElementById("settingPeriodLen").value = appState.settings.defaultPeriodLen || 5;
}

// ==================== 交互事件绑定 ====================
function switchMainTab(targetId) {
  document.querySelectorAll(".nav-pill, .mnav-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === targetId);
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("active", p.id === targetId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchSubTab(subId) {
  document.querySelectorAll(".subtab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-subtab") === subId);
  });
  document.querySelectorAll(".subtab-panel").forEach(p => {
    p.classList.toggle("active", p.id === subId);
  });
}

function toggleTagForDate(dateStr, tagId) {
  if (!appState.logs[dateStr]) appState.logs[dateStr] = { tags: [], note: "" };
  const tags = appState.logs[dateStr].tags;
  const idx = tags.indexOf(tagId);
  if (idx >= 0) tags.splice(idx, 1);
  else tags.push(tagId);
  saveState("已悄悄记下");
}

function bindEvents() {
  // 主导航（桌面 + 手机底部同步）
  document.querySelectorAll(".nav-pill, .mnav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchMainTab(btn.getAttribute("data-tab")));
  });

  // 工具箱子导航
  document.querySelectorAll(".subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchSubTab(btn.getAttribute("data-subtab")));
  });

  // 快捷跳到电子布洛芬急救角
  document.getElementById("jumpReliefBtn").addEventListener("click", () => {
    switchMainTab("tab-toolkit");
    switchSubTab("sub-relief");
  });

  // 顶部快捷切换人设（温柔搭子 <-> 霸总模式）
  document.getElementById("personaQuickBtn").addEventListener("click", () => {
    appState.settings.persona = appState.settings.persona === "ceo" ? "gentle" : "ceo";
    lastCompanionOverride = null;
    saveState(appState.settings.persona === "ceo" ? "已切换为霸总模式" : "已切回温柔手帐搭子");
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
    const inPeriod = isDateInLoggedPeriod(todayStr, stats.sortedCycles, stats.avgPeriodLen);
    if (inPeriod) {
      const latest = appState.cycles[appState.cycles.length - 1];
      if (latest) {
        if (latest.startDate === todayStr) {
          appState.cycles.pop();
          saveState("已撤销今天的开始记录");
        } else {
          latest.endDate = addDays(todayStr, -1);
          saveState("好耶，这次结束啦，慢慢回血！");
        }
      }
    } else {
      const dur = Number(appState.settings.defaultPeriodLen) || 5;
      appState.cycles.push({ id: "c_" + Date.now(), startDate: todayStr, endDate: addDays(todayStr, dur - 1), excluded: false });
      saveState("记好啦，这几天好好照顾自己");
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

  // 补记弹窗
  const retroModal = document.getElementById("retroModal");
  const openRetro = () => {
    document.getElementById("retroStartDate").value = selectedDateStr;
    document.getElementById("retroEndDate").value = addDays(selectedDateStr, (Number(appState.settings.defaultPeriodLen) || 5) - 1);
    retroModal.classList.add("open");
  };
  const closeRetro = () => retroModal.classList.remove("open");
  document.getElementById("openRetroModalBtn").addEventListener("click", openRetro);
  document.getElementById("calendarAddRetroBtn").addEventListener("click", openRetro);
  document.getElementById("closeRetroModalBtn").addEventListener("click", closeRetro);
  document.getElementById("cancelRetroBtn").addEventListener("click", closeRetro);
  retroModal.addEventListener("click", e => { if (e.target === retroModal) closeRetro(); });

  document.getElementById("confirmRetroBtn").addEventListener("click", () => {
    const start = document.getElementById("retroStartDate").value;
    let end = document.getElementById("retroEndDate").value;
    if (!start) return showToast("先选一下来的第一天");
    const dur = Number(appState.settings.defaultPeriodLen) || 5;
    if (!end || end < start) end = addDays(start, dur - 1);
    appState.cycles.push({ id: "c_" + Date.now(), startDate: start, endDate: end, excluded: false });
    closeRetro();
    saveState("补记好了，预测已经跟着更新");
  });

  // 首页胶囊 & 笔记
  document.getElementById("capsuleGroupsContainer").addEventListener("click", e => {
    const btn = e.target.closest(".capsule-btn[data-tag-id]");
    if (btn) toggleTagForDate(selectedDateStr, btn.getAttribute("data-tag-id"));
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

  // 日历导航与原地抽屉交互
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

  document.getElementById("calendarGrid").addEventListener("click", e => {
    const cell = e.target.closest(".cal-day[data-date]");
    if (!cell) return;
    selectedDateStr = cell.getAttribute("data-date");
    renderAll();
  });

  document.getElementById("calendarDayDrawer").addEventListener("click", e => {
    const tagBtn = e.target.closest(".drawer-tag-btn[data-tag-id]");
    if (tagBtn) {
      toggleTagForDate(selectedDateStr, tagBtn.getAttribute("data-tag-id"));
      return;
    }
    if (e.target.id === "drawerStartPeriodBtn") {
      const stats = computeCycleStats(appState);
      if (isDateInLoggedPeriod(selectedDateStr, stats.sortedCycles, stats.avgPeriodLen)) {
        showToast("这一天已经在经期记录里啦");
        return;
      }
      const dur = Number(appState.settings.defaultPeriodLen) || 5;
      appState.cycles.push({ id: "c_" + Date.now(), startDate: selectedDateStr, endDate: addDays(selectedDateStr, dur - 1), excluded: false });
      saveState(`已把 ${formatCNDate(selectedDateStr)} 记为开始日`);
    }
  });

  document.getElementById("calendarDayDrawer").addEventListener("input", e => {
    if (e.target.id === "drawerNoteInput") {
      if (!appState.logs[selectedDateStr]) appState.logs[selectedDateStr] = { tags: [], note: "" };
      appState.logs[selectedDateStr].note = e.target.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
  });

  // 历史周期异常勾选与删除
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
    const delBtn = e.target.closest(".delete-cycle-btn");
    if (!delBtn) return;
    if (appState.cycles.length <= 1) return showToast("至少留 1 条记录作为参考哦");
    appState.cycles = appState.cycles.filter(c => c.id !== delBtn.getAttribute("data-cycle-id"));
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

  // 我的：人设、皮肤、参数与备份
  document.querySelectorAll("[data-persona]").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.settings.persona = btn.getAttribute("data-persona");
      lastCompanionOverride = null;
      saveState(appState.settings.persona === "ceo" ? "霸总已上线" : "温柔搭子已就位");
    });
  });

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

function runSelfChecks() {
  const sample = createDefaultState();
  const stats = computeCycleStats(sample);
  console.assert(stats.avgCycleLen >= 21 && stats.avgCycleLen <= 35, "avgCycleLen bounds");
  console.assert(stats.nextPredStart <= stats.nextPredCenter && stats.nextPredCenter <= stats.nextPredEnd, "window order");
  const w0 = evalWaveY(0.45);
  console.assert(w0.yEnergy >= 10 && w0.yEnergy <= 82, "wave y bounds");
  const migrated = normalizeState({ settings: { defaultCycleLen: 30 }, cycles: sample.cycles });
  console.assert(migrated.settings.persona === "gentle" && migrated.settings.theme === "paper", "migration defaults");
}

document.addEventListener("DOMContentLoaded", () => {
  runSelfChecks();
  bindEvents();
  renderAll();
});
