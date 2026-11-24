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

// 阶段视觉元数据 + 双人设（温柔手帐搭子 / 霸总模式）活人感语料引擎
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

const PERSONA_COPY = {
  gentle: {
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
  },
  ceo: {
    name: "霸总管家",
    avatar: "总",
    defaultTag: "今日批示",
    reactTag: "霸总已接管",
    hugTitle: "霸总今日批示",
    lateHint: d => `晚了 ${d} 天而已，不许自己瞎琢磨。最近是不是又熬夜了？今晚十一点前乖乖睡觉，我盯着。`,
    startToast: "收到了。这几天准你合法躺平，不许硬扛。",
    endToast: "渡劫结束，大小姐准备满血回归。",
    seasons: {
      winter: {
        greeting: "女人，今天电量就剩 20% 了还想硬撑？准你提前躺平。热饮、暖贴和止痛药全部配齐，天塌下来今天也改天再说。",
        work: "不急的破事全部往后排，今天只准处理三件以内的小事，谁催你我替你挡回去。",
        sport: "高强度运动全部叫停！今天就允许散步和躺平，谁让你去卷腹的？",
        hug: "记住，你不是脆弱，是身体在每月升级系统。这几天别讲效率，舒服才是最高指令。"
      },
      spring: {
        greeting: "渡劫完毕，状态回来了？不错，这几天气色和脑子都在线，想买什么、想见谁尽管去，别委屈自己。",
        work: "脑子这么清楚，正好拿来推进你真正想做的事，顺手把之前欠的漂亮仗打回来。",
        sport: "体能涨回来了，想跑想练尽管上，但别忘了热身，伤着自己我可不批。",
        hug: "这几天的好状态是你应得的，大方享受，别老想着讨好别人。"
      },
      summer: {
        greeting: "全月高光期到了，今天的你气场两米八。重要谈判、面试、拍照约会统统安排上，全场你最亮眼。",
        work: "有底气的时候就要往前站，该要的功劳和条件今天直接提，气势稳赢。",
        sport: "电量满格，想突破记录就趁这两天，练完记得补蛋白和温水。",
        hug: "顺便提醒一句：如果不打算备孕，这几天安全措施必须 100% 到位，听见没有？"
      },
      autumn: {
        greeting: "提前给你提个醒：快来了。这两天看谁不顺眼直接拉黑，想吃甜食立刻去买。错的不是你，是激素，听懂了吗？",
        work: "把废话多的人都屏蔽掉，戴上降噪耳机专心收尾，重要决定等过几天再拍板。",
        sport: "这两天容易累是正常现象，别跟跑步机较劲，去做个拉伸泡泡脚，早点休息。",
        hug: "谁要是敢在这几天跟你讲大道理，直接把我的生存小票甩他脸上。今晚十点半前必须上床。"
      }
    }
  }
};

// 点胶囊后的活人感即时回应（多条轮换，不重样）
const SYMPTOM_REPLIES = {
  pain_cramps_heavy: {
    gentle: [
      "抱抱你，痛到难受千万别硬扛，布洛芬配温水、暖宝宝贴好，今天什么都不做也没关系。",
      "辛苦了，小腹发紧的时候可以蜷着侧躺一会儿，或者点上面「有点难受」跟着缓口气。"
    ],
    ceo: [
      "痛成这样还拿着手机？立刻放下！暖贴贴好、止痛药按时吃，今天所有待办全部作废。",
      "女人，不许硬扛痛经，去泡杯热的躺被窝里，剩下的事明天再说。"
    ]
  },
  pain_cramps_mild: {
    gentle: [
      "小腹坠坠的时候最磨人了，把脚踝和肚子捂暖一点，少喝冰的会舒服不少。",
      "收到信号啦，今天走路慢一点、别久站，晚上回家泡个热水脚吧。"
    ],
    ceo: [
      "有点发坠就老实坐着，冰美式今天没收，换成热红豆汤或者温开水。",
      "别不当回事，暖宝宝现在就贴上，防患于未然懂不懂？"
    ]
  },
  body_backache: {
    gentle: ["腰酸真的太消耗人了，找个靠垫垫在后腰，隔着衣服贴片暖贴在腰眼超管用。"],
    ceo: ["腰酸就别死坐着了，靠垫垫好，起身晃两分钟，今晚必须早点躺平。"]
  },
  body_breast: {
    gentle: ["胸胀敏感的时候，回家第一件事就是换上最松软的无钢圈内衣，给身体松松绑。"],
    ceo: ["敏感期别穿勒人的衣服，怎么舒服怎么来，谁爱看谁看，你舒服最重要。"]
  },
  body_headache: {
    gentle: ["头胀的时候屏幕亮度调低一点，闭眼深呼吸一分钟，喝口温水慢慢缓一缓。"],
    ceo: ["头都痛了还盯着屏幕干嘛？把亮度调暗，闭眼歇五分钟，这是命令。"]
  },
  body_acne: {
    gentle: ["下巴冒痘大多是周期前的小波动，千万别手痒去挤，早睡两天它自己会乖乖消下去。"],
    ceo: ["冒颗痘而已，丝毫不影响你的美貌，但手给我老实点，不许抠！"]
  },
  body_bloating: {
    gentle: ["这几天身体会多存一点水，体重涨一两斤都是假象！明天少吃点重盐，过两天秒消。"],
    ceo: ["水肿涨的那两斤不算数，体重秤今天直接打入冷宫，不准上称给自己添堵。"]
  },
  body_insomnia: {
    gentle: ["没睡好会放大所有疲惫，今天中午哪怕趴十分钟闭闭眼，也是在给大脑充电。"],
    ceo: ["昨晚没睡好？今天午休必须补二十分钟，晚上手机放远点，不准再刷到半夜。"]
  },
  mood_tired: {
    gentle: ["电量只剩 20% 啦，开启省电模式吧！今天能点外卖就不做饭，能躺着绝不坐着。"],
    ceo: ["电量都标红了还撑什么？立刻切省电模式，外卖点热的，家务谁爱干谁干。"]
  },
  mood_irritable: {
    gentle: [
      "烦躁是身体在拉警报呢，不用逼自己当情绪稳定的大人，今天戴上耳机离吵闹远一点。",
      "想发火很正常，把想骂的话丢进工具箱的「情绪树洞」冲进海里，别憋着自己。"
    ],
    ceo: [
      "谁惹你生气了？不用讲道理，这几天你脾气大天经地义。不想理的人直接冷处理。",
      "烦了就烦了，不用给任何人好脸色。工具箱里给你备了情绪树洞，去骂两句解解气。"
    ]
  },
  mood_sad: {
    gentle: [
      "想哭就哭一会儿吧，眼泪能帮身体把多余的压力排出去。你已经很努力了，今天我站在你这边。",
      "委屈的时候别急着振作，抱抱自己，点一杯热的甜饮，天黑了就早点钻被窝。"
    ],
    ceo: [
      "怎么突然委屈上了？过来，今天不准偷偷掉眼泪。不是你太敏感，是激素在欺负人。",
      "谁敢让你委屈？算了，激素惹的祸也算我账上。今晚早点睡，明天又是大小姐。"
    ]
  },
  mood_craving: {
    gentle: [
      "不是你嘴馋，是激素在提醒你补点快乐因子。去买杯热饮或小蛋糕吧，今天免责！",
      "想吃碳水就大大方方吃，温热的红豆汤、烤红薯或热奶茶，开心比热量表重要。"
    ],
    ceo: [
      "想吃甜的就立刻去买，别看配料表和热量表。这几天吃进去的全算在激素账上！",
      "批准碳水自由！去买你最想吃的那家甜品，不准犹豫。"
    ]
  },
  mood_focus: {
    gentle: ["脑子超清晰的一天！趁灵感在线把最想搞定的事一鼓作气拿下，晚上记得犒劳自己。"],
    ceo: ["脑子这么好使，今天谁也拦不住你。干完漂亮活记得准点收工，别透支。"]
  },
  mood_calm: {
    gentle: ["平静松弛的普通一天，其实最珍贵啦。祝你今天顺顺当当，微风正好。"],
    ceo: ["状态稳得很，继续保持这股从容劲儿，今天诸事皆宜。"]
  },
  med_painkiller: {
    gentle: ["按时吃止痛药是对自己负责，别有心理负担。配温水，等药效上来好好歇一会儿。"],
    ceo: ["乖，难受就该吃药，硬扛才最傻。喝口温水靠着，等会儿就舒服了。"]
  },
  med_iron: {
    gentle: ["暖暖的舒服多啦，记得隔着衣服贴防低温烫伤，手边再放杯温水。"],
    ceo: ["暖贴备上了还算听话，别直接贴皮肤，小心烫着。"]
  }
};

// 今日生存小票 3 种语气文案（温柔搭子风 / 霸总下令风 / 发疯梗王风）
const RECEIPT_COPY = {
  winter: {
    gentle: {
      title: "温柔照顾清单 · 经期休整",
      quote: "她这几天电量只剩 20%，身体正在悄悄换新，比平时更容易累和怕冷。",
      feeding: "热红豆汤、温热鲜奶、烤红薯、清淡热汤面",
      dos: "顺手接管洗碗和跑腿、准备暖水袋、安安静静抱一抱",
      donts: "别敷衍说“多喝热水”、别催赶时间、别在这几天争论复杂问题"
    },
    ceo: {
      title: "霸总最高指令 · 休养日",
      quote: "通知：此人今日护甲归零、电量告急，本人已批准她全天合法躺平，请配合执行。",
      feeding: "热的甜饮、温补热汤、她点名想吃的任何热食",
      dos: "主动包揽杂活、提供人肉暖手宝、无条件顺毛",
      donts: "严禁说教、严禁问“怎么又累了”、严禁安排高体力暴走"
    },
    witty: {
      title: "赛博渡劫小票 · 掉血期",
      quote: "一级警报！正在经历每月一次的物理掉血，当前痛感放大 200%，闲人免惹。",
      feeding: "热奶茶、布洛芬、热腾腾外卖、电子布洛芬搞笑视频",
      dos: "默默递上暖贴和热饮、负责拿快递和洗碗、夸她今天也很可爱",
      donts: "严禁讲大道理、严禁惹毛、严禁建议“去跑两圈就好了”"
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
    ceo: {
      title: "霸总出行通知 · 回春期",
      quote: "大小姐已满血复活，智商、颜值与好脾气重新占领高地，速速安排行程。",
      feeding: "好吃的漂亮饭、心仪已久的小甜品、鲜花一支",
      dos: "带她出门晒太阳、认真拍照不敷衍、支持她的每个决定",
      donts: "不许宅着发霉、不许敷衍回消息"
    },
    witty: {
      title: "复活节小票 · 满血中",
      quote: "渡劫成功！本人已从咸鱼形态切换回人类形态，现限时开放约饭名额。",
      feeding: "火锅、烧烤、冰美式（终于解禁了！）",
      dos: "约逛街、看电影、一起干点新鲜好玩的事",
      donts: "别浪费我这几天难得的好脾气"
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
    ceo: {
      title: "霸总高光令 · 满格日",
      quote: "全月气场巅峰时刻，今日份赞美和约会请按最高规格安排，不许敷衍。",
      feeding: "高颜值餐厅、微醺小酒（看心情）、精致甜点",
      dos: "大方夸她好看、认真安排约会、安全措施 100% 到位",
      donts: "禁止敷衍、禁止走神、禁止忘了安全措施"
    },
    witty: {
      title: "限时福利小票 · 高光期",
      quote: "全月看谁都顺眼的限时黄金窗口！错过这几天可就要进入秋日炸毛结界了。",
      feeding: "漂亮饭 + 饭后小甜水",
      dos: "疯狂夸夸、赶紧提想一起玩的事、安全措施拉满",
      donts: "别不识抬举，且行且珍惜"
    }
  },
  autumn: {
    gentle: {
      title: "温柔预警清单 · 经前敏感期",
      quote: "离大姨妈很近啦，这几天她容易累、想吃甜食、情绪也更敏感，需要多一点偏爱。",
      feeding: "热可可、小蛋糕、烤红薯、一切能带来安全感的碳水",
      dos: "先拥抱再说话、给她独处和早睡的空间、备好小零食",
      donts: "千万别把情绪波动说成“无理取闹”、别挑起敏感争吵"
    },
    ceo: {
      title: "霸总戒严令 · 敏感结界",
      quote: "警告：已进入暴风雨前夕！快乐激素正在滑坡，此阶段我方拥有无限免责权。",
      feeding: "高甜小蛋糕、热奶茶、立刻送达的贴心投喂",
      dos: "无条件站她这边、听她吐槽、帮她挡掉糟心事",
      donts: "严禁顶嘴、严禁冷战、严禁问“你怎么又生气了”"
    },
    witty: {
      title: "易燃易爆小票 · PMS预警",
      quote: "体内的疯狂星期四已提前开启！前一秒想哭后一秒想吵架，错在激素不在我。",
      feeding: "甜食！碳水！热汤！电子布洛芬！",
      dos: "顺毛摸、夸她没错、主动递上小零食和拥抱",
      donts: "严禁讲道理、严禁挑刺、严禁呼吸太大声（开玩笑的）"
    }
  }
};

let replyPickCounter = 0;
function pickSymptomReply(tagId, persona) {
  const entry = SYMPTOM_REPLIES[tagId];
  if (!entry) return null;
  const list = entry[persona] || entry.gentle;
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

// 自动发现个人身体小规律（纯本地统计，关联经前 1~4 天与经期第 1~2 天的高频信号）
function discoverPersonalInsight(state, stats, persona) {
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
    return persona === "ceo"
      ? `我翻了你的记录，发现个小规律：你每次来之前 1~4 天最容易出现 ${names}。下次撞见这信号，立刻把包里备齐，不许打无准备的仗。`
      : `翻了翻你之前的记录，发现一个专属小规律：你通常在来之前 1~4 天容易出现 ${names}。下次同时遇到它们，记得包里顺手塞一片卫生巾、早点休息哦。`;
  }
  if (topPeriod.length) {
    const names = topPeriod.map(([id]) => `「${labelMap[id] || id}」`).join("、");
    return persona === "ceo"
      ? `看你过往记录，刚来前两天最常打卡 ${names}。下次快到日子时，热饮和止痛药提前备到伸手就能拿的地方。`
      : `从你之前的记录来看，刚来的前两天最常出现 ${names}，下次快到窗口期时提前备好暖贴和止痛药会安心很多。`;
  }
  return null;
}

// 隐私脱敏月度身体切片数据（绝不包含具体日期与私密/用药标签）
function getMonthlySliceData(state, stats, persona) {
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
  const quote =
    persona === "ceo"
      ? "“女人，这世上最该被偏爱的是你自己的身体节奏，下个月也继续按舒服的来。”"
      : "“不是每天都要满格运转，允许自己跟着潮汐起伏，本身就是很棒的照顾。”";

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
  const persona = appState.settings.persona || "gentle";
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

  const personaBtn = document.getElementById("personaQuickBtn");
  personaBtn.classList.toggle("is-ceo", persona === "ceo");
  document.getElementById("personaQuickText").textContent = persona === "ceo" ? "霸总模式" : "温柔搭子";
  document.getElementById("stealthBtn").classList.toggle("active", stealth);

  renderTodayTab(stats, stealth, persona);
  renderPersonalInsightCard(stats, stealth, persona);
  renderCapsuleLogger(stealth);
  renderCalendarTab(stats, stealth);
  renderToolkitTab(stats, stealth, persona);
  renderMineTab(stealth, persona, theme);
}

function renderPersonalInsightCard(stats, stealth, persona) {
  const card = document.getElementById("personalInsightCard");
  if (!card) return;
  if (stealth) {
    card.style.display = "none";
    return;
  }
  const insight = discoverPersonalInsight(appState, stats, persona);
  if (!insight) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  card.innerHTML = `
    <div class="insight-banner-head">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>
      <span>${persona === "ceo" ? "霸总帮你盯出的身体规律" : "我发现你的一个小规律"}</span>
    </div>
    <p>${escapeHtml(insight)}</p>
  `;
}

function renderTodayTab(stats, stealth, persona) {
  const s = stats.seasonInfo;
  const p = PERSONA_COPY[persona] || PERSONA_COPY.gentle;
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
    nextHintEl.innerHTML = stealth
      ? `下次小雨约 ${daysUntilNext} 天后`
      : `离下次大概还有 ${daysUntilNext} 天<br><span style="white-space:nowrap;">${formatCNDate(stats.nextPredStart)} 前后</span>`;
  } else if (daysUntilNext === 0) {
    nextHintEl.textContent = stealth ? "今明两天可能会变天" : "差不多就在这两天，包里记得备一片";
  } else {
    const late = Math.abs(daysUntilNext);
    nextHintEl.textContent = stealth
      ? `比平时晚了 ${late} 天，别着急`
      : `晚点了 ${late} 天，先别慌`;
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

  // 活人感搭子 / 霸总对话气泡（经期推迟时自动换成安抚话术）
  const bubble = document.getElementById("companionBubble");
  bubble.classList.toggle("is-ceo", persona === "ceo");
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

  const rData = RECEIPT_COPY[s.key]?.[tone] || RECEIPT_COPY.winter.gentle;
  document.getElementById("partnerReceiptPreview").innerHTML = `
    <div class="receipt-head">
      <div class="receipt-store">TIDELOG · ${escapeHtml(rData.title)}</div>
      <div class="receipt-meta">${toDateStr(new Date())} · 周期第 ${stats.cycleDay} 天 · 剩余电量 ${s.battery}</div>
    </div>
    <p class="receipt-quote">“${escapeHtml(rData.quote)}”</p>
    <div class="receipt-rows">
      <div class="receipt-row"><strong>投喂推荐</strong><span>${escapeHtml(rData.feeding)}</span></div>
      <div class="receipt-row"><strong>今天宜做</strong><span>${escapeHtml(rData.dos)}</span></div>
      <div class="receipt-row"><strong>避雷提醒</strong><span>${escapeHtml(rData.donts)}</span></div>
    </div>
    <div class="receipt-barcode">|||| ||| || |||| ||| TIDELOG</div>
  `;

  const slice = getMonthlySliceData(appState, stats, persona);
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

  const persona = appState.settings.persona || "gentle";
  let toastText = adding ? "已悄悄记下" : "已取消这个标记";
  if (adding) {
    const reply = pickSymptomReply(tagId, persona);
    if (reply) {
      lastCompanionOverride = reply;
      toastText = persona === "ceo" ? "霸总已收到信号" : "搭子接住你的信号啦";
    }
  }
  saveState(toastText);
  if (adding && lastCompanionOverride) triggerBubblePop();
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
    const persona = appState.settings.persona || "gentle";
    const p = PERSONA_COPY[persona] || PERSONA_COPY.gentle;
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
      appState.cycles.push({ id: "c_" + Date.now(), startDate: todayStr, endDate: addDays(todayStr, dur - 1), excluded: false });
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
    const persona = appState.settings.persona || "gentle";
    setTimeout(() => {
      ta.value = "";
      box.classList.remove("dissolving");
      reply.textContent = persona === "ceo"
        ? "碎掉了，沉海底了。谁让你不爽的都翻篇，深吸一口气，咱们不跟他们一般见识。"
        : "已经跟着潮水飘走啦，不留一点痕迹。心里有没有松快了一点点？";
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
  const persona = appState.settings.persona || "gentle";
  const slice = getMonthlySliceData(appState, stats, persona);
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
  stats.historyRows.slice(0, 6).forEach(r => {
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
  const migrated = normalizeState({ settings: { defaultCycleLen: 30 }, cycles: sample.cycles });
  console.assert(migrated.settings.persona === "gentle" && migrated.settings.theme === "paper", "migration defaults");
  const insight = discoverPersonalInsight(sample, stats, "gentle");
  console.assert(Boolean(insight && insight.includes("狂想吃甜食")), "pattern discovery detects pre-period craving");
  sample.logs[toDateStr(new Date())].tags.push("intimate_protected");
  const slice = getMonthlySliceData(sample, stats, "gentle");
  console.assert(!slice.topTags.some(t => t.includes("亲密")), "monthly slice must exclude intimate tags");
}

document.addEventListener("DOMContentLoaded", () => {
  runSelfChecks();
  bindEvents();
  renderAll();
});
