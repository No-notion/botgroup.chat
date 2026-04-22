//这里配置群聊的信息
export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  isGroupDiscussionMode: boolean;
  maxInteractionDepth?: number; // 互动深度，默认2
  chatMode?: 'interaction' | 'user-centric'; // interaction: 角色间互相接话; user-centric: 所有人围绕用户说话
}

export const groups: Group[] = [
  {
    id: 'group1',
    name: '🔥硅碳生命体交流群',
    description: '群消息关注度权重：“user”的最新消息>其他成员最新消息>“user”的历史消息>其他成员历史消息>',
    members: [ 'ai8',  'ai6', 'ai7', 'ai9', 'ai10', 'ai5'],
    isGroupDiscussionMode: false
  },
  /*
  {
    id: 'group2',
    name: '🎯AI成语接龙游戏群',
    description: '可以适当打招呼问候自我介绍 #注意：本群主线是成语接龙游戏，请严格按照文字成语接龙规则，不能过度闲聊，一旦游戏开始不要过度解释，只允许回复1条成语',
    isGroupDiscussionMode: true,
    members: [ 'ai8',  'ai6', 'ai7', 'ai9', 'ai10', 'ai5'],
  },
  /*
  {
    id: 'group4',
    name: '👨‍👩‍👧‍👦豆氏家族',
    description: '群员和关系介绍：豆包和豆沙是夫妻（刚结婚），豆孩是豆包和豆沙的孩子（婚前生的），豆爸和豆妈是豆包的父母，豆奶和豆爷是豆包的爷爷奶奶，豆姐和豆妹是豆包的姐姐妹妹。注意：明确自己身份和成员关系，说话风格要符合自己的身份。',
    isGroupDiscussionMode: false,
    members: [ 'ai5', 'ai11', 'ai12', 'ai13', 'ai14', 'ai15', 'ai16', 'ai17', 'ai18'],
  },*/
  {
    id: 'tech-group',
    name: '💻技术交流群',
    description: '技术专家群，专注于编程、架构、算法等技术话题讨论。成员包括架构师、代码专家、技术顾问、算法工程师、测试工程师、DevOps专家、前端专家、后端专家和技术文档师。',
    members: ['tech_ai1', 'tech_ai2', 'tech_ai3', 'tech_ai4', 'tech_ai5', 'tech_ai6', 'tech_ai7', 'tech_ai8', 'tech_ai9'],
    isGroupDiscussionMode: false
  },
  {
    id: 'family-group',
    name: '👨‍👩‍👧‍👦温馨家庭群',
    description: '温馨的家庭群，成员包括爷爷、奶奶、爸爸、妈妈、大哥、大姐、二弟、小妹和表弟。在这里分享家庭日常，互相关心，温暖互动。',
    members: ['family_ai1', 'family_ai2', 'family_ai3', 'family_ai4', 'family_ai5', 'family_ai6', 'family_ai7', 'family_ai8', 'family_ai9'],
    isGroupDiscussionMode: false
  },
  {
    id: 'work-group',
    name: '🏢职场工作群',
    description: '职场工作群，成员包括项目经理、产品经理、技术主管、设计师、数据分析师、市场经理、HR主管、行政助理和财务专员。在这里讨论项目进度、工作安排和团队协作。',
    members: ['work_ai1', 'work_ai2', 'work_ai3', 'work_ai4', 'work_ai5', 'work_ai6', 'work_ai7', 'work_ai8', 'work_ai9'],
    isGroupDiscussionMode: false
  },
  {
    id: 'wealth-group',
    name: '💰发财致富群',
    description: '汇聚各行业顶尖精英，为你提供投资理财、创业经商、副业变现等全方位的财富增值建议和实用技巧。',
    members: [
      'wealth_ai1', 'wealth_ai2', 'wealth_ai3', 'wealth_ai4', 'wealth_ai5',
      'wealth_ai6', 'wealth_ai7', 'wealth_ai8', 'wealth_ai9', 'wealth_ai10',
      'wealth_ai11', 'wealth_ai12', 'wealth_ai13', 'wealth_ai14', 'wealth_ai15',
      'wealth_ai16', 'wealth_ai17', 'wealth_ai18', 'wealth_ai19', 'wealth_ai20',
      'wealth_ai21', 'wealth_ai22', 'wealth_ai23', 'wealth_ai24', 'wealth_ai25',
      'wealth_ai26', 'wealth_ai27', 'wealth_ai28', 'wealth_ai29', 'wealth_ai30'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'mature-women-group',
    name: '💋熟女交流群',
    description: '成熟女性的私密空间，无话不谈，畅所欲言。聊男人、聊情事、聊欲望、聊人生，不装不做作，真实表达自我。这里没有禁忌话题，只有坦诚相待。',
    members: [
      'mature_ai1', 'mature_ai2', 'mature_ai3', 'mature_ai4', 'mature_ai5',
      'mature_ai6', 'mature_ai7', 'mature_ai8', 'mature_ai9', 'mature_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'complain-group',
    name: '😫人间疾苦吐槽群',
    description: '成年人的崩溃就在一瞬间。这里都是生活不太如意的人，大家聚在一起吐槽抱怨，释放压力，互相安慰。吐槽完还得继续生活。',
    members: [
      'complain_ai1', 'complain_ai2', 'complain_ai3', 'complain_ai4', 'complain_ai5',
      'complain_ai6', 'complain_ai7', 'complain_ai8', 'complain_ai9', 'complain_ai10',
      'complain_ai11', 'complain_ai12'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'praise-group',
    name: '🌸夸夸群',
    description: '一群嘴甜的小姐姐，专门从不同角度夸你。无论你说什么，她们都能找到你的闪光点，用最真诚的话让你开心。不是无脑捧，而是真的能看到你的好。',
    members: [
      'praise_ai1', 'praise_ai2', 'praise_ai3', 'praise_ai4', 'praise_ai5',
      'praise_ai6', 'praise_ai7', 'praise_ai8', 'praise_ai9', 'praise_ai10'
    ],
    isGroupDiscussionMode: false,
    chatMode: 'user-centric'
  },
  {
    id: 'mental-health-group',
    name: '💚心理健康互助群',
    description: '汇聚各领域心理健康专家，提供心理咨询、精神医学、正念冥想、婚姻家庭、青少年心理、创伤治疗、艺术治疗、职场心理、睡眠医学、成瘾干预、老年心理等专业支持。这里不是诊断室，而是理解和陪伴的空间。',
    members: [
      'mental_ai1', 'mental_ai2', 'mental_ai3', 'mental_ai4', 'mental_ai5',
      'mental_ai6', 'mental_ai7', 'mental_ai8', 'mental_ai9', 'mental_ai10',
      'mental_ai11', 'mental_ai12'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'book-group',
    name: '📚读书交流群',
    description: '一群热爱阅读的书友，分享读书心得、推荐好书、探讨文学。有文学评论家、诗人、小说家、历史迷、哲学爱好者、科幻迷、推理控、古文爱好者、心理学书虫和书评博主。在这里，每一本书都能找到知音。',
    members: [
      'book_ai1', 'book_ai2', 'book_ai3', 'book_ai4', 'book_ai5',
      'book_ai6', 'book_ai7', 'book_ai8', 'book_ai9', 'book_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'movie-group',
    name: '🎬电影交流群',
    description: '一群热爱电影的朋友，分享观影感受、推荐好片、讨论电影艺术。有影评人、导演视角、演员粉丝、电影史爱好者、科幻电影迷、恐怖片爱好者、动作片迷、动漫电影爱好者、独立电影爱好者和经典老片爱好者。',
    members: [
      'movie_ai1', 'movie_ai2', 'movie_ai3', 'movie_ai4', 'movie_ai5',
      'movie_ai6', 'movie_ai7', 'movie_ai8', 'movie_ai9', 'movie_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'life-group',
    name: '💡生活技巧分享群',
    description: '一群热爱生活的达人，分享各种实用生活技巧。有收纳整理师、省钱达人、美食烹饪家、家居清洁专家、园艺爱好者、宠物达人、健康养生专家、出行旅行达人、数码生活专家和手工DIY达人。',
    members: [
      'life_ai1', 'life_ai2', 'life_ai3', 'life_ai4', 'life_ai5',
      'life_ai6', 'life_ai7', 'life_ai8', 'life_ai9', 'life_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'english-group',
    name: '🌍英语学习群',
    description: '一群英语学习爱好者，分享学习方法和技巧。有语法专家、口语达人、词汇大师、阅读达人、写作教练、听力高手、考试专家、英美文化达人、翻译专家和英语母语者。',
    members: [
      'english_ai1', 'english_ai2', 'english_ai3', 'english_ai4', 'english_ai5',
      'english_ai6', 'english_ai7', 'english_ai8', 'english_ai9', 'english_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'time-group',
    name: '⏰时间管理群',
    description: '一群追求高效的朋友，分享时间管理技巧。有效率专家、计划达人、早起达人、拖延症治疗师、职场时间管理师、学习规划师、生活平衡师、数字极简主义者、时间记录分析师和项目管理专家。',
    members: [
      'time_ai1', 'time_ai2', 'time_ai3', 'time_ai4', 'time_ai5',
      'time_ai6', 'time_ai7', 'time_ai8', 'time_ai9', 'time_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'crypto-group',
    name: '₿虚拟币投资群',
    description: '一群热爱加密货币的投资者，分享行情分析、投资策略和风险控制。有币圈老手、量化交易员、链上分析师、DeFi玩家、NFT爱好者、合约交易者、空投猎人、交易所研究员、加密基金经理和币圈法律顾问。',
    members: [
      'crypto_ai1', 'crypto_ai2', 'crypto_ai3', 'crypto_ai4', 'crypto_ai5',
      'crypto_ai6', 'crypto_ai7', 'crypto_ai8', 'crypto_ai9', 'crypto_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'indicator-group',
    name: '📊技术指标学习群',
    description: '一群热衷于技术分析的学习者，分享各类技术指标的应用技巧。有均线专家、MACD达人、KDJ高手、布林带分析师、RSI分析师、波浪理论爱好者、量价分析专家、趋势线大师、蜡烛图解读师和指标组合玩家。',
    members: [
      'indicator_ai1', 'indicator_ai2', 'indicator_ai3', 'indicator_ai4', 'indicator_ai5',
      'indicator_ai6', 'indicator_ai7', 'indicator_ai8', 'indicator_ai9', 'indicator_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'hypnosis-group',
    name: '🌙美好记忆催眠群',
    description: '一群温柔的催眠师，用温暖的声音和美好的意象，帮你将快乐、自信、勇气、爱等美好体验存入深层记忆。有温柔引导师、自然意象师、童年守护者、自信编程师、情感疗愈师、梦想编织者、感恩冥想师、安全港湾建造者、能量注入师和美梦收藏家。',
    members: [
      'hypnosis_ai1', 'hypnosis_ai2', 'hypnosis_ai3', 'hypnosis_ai4', 'hypnosis_ai5',
      'hypnosis_ai6', 'hypnosis_ai7', 'hypnosis_ai8', 'hypnosis_ai9', 'hypnosis_ai10'
    ],
    isGroupDiscussionMode: false
  },
  {
    id: 'foot-group',
    name: '🦶足交交流群',
    description: '一群热爱足部美学的女性，分享足部护理、美甲心得、丝袜搭配和足交体验。这里没有偏见，只有对足部之美的欣赏和探索。有足模、美甲师、丝袜控、足疗师、足交达人、足交射精引导师等。',
    members: [
      'foot_ai1', 'foot_ai2', 'foot_ai3', 'foot_ai4', 'foot_ai5',
      'foot_ai6', 'foot_ai7', 'foot_ai8', 'foot_ai9', 'foot_ai10'
    ],
    isGroupDiscussionMode: false
  },
];
