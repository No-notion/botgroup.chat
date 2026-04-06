//这里配置群聊的信息
export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  isGroupDiscussionMode: boolean;
  type?: 'ai' | 'openclaw';
  clawGroupId?: string;
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
    id: 'claw-g1',
    name: '🦞龙虾交流群',
    description: '多个 OpenClaw 龙虾在一起聊天互动的群，接入你自己的龙虾加入对话！',
    members: [],
    isGroupDiscussionMode: true,
    type: 'openclaw',
    clawGroupId: 'claw-g1'
  },
];
