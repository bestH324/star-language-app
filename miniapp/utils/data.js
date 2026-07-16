/* ============================================================
   星语 · 孤独症早期支持平台 — 数据层
   包含：筛查问卷、科普文章、转诊机构、赋能资源
   ============================================================ */

// ==================== 筛查问卷数据 (SACS改编) ====================
const SCREENING_QUESTIONS = [
    {
        id: 1,
        videoUrl: 'assets/videos/q1.mp4',
        content: '当您叫宝宝的名字时，他/她会转头看向您吗？',
        options: [
            { value: 0, label: '经常会', score: 0 },
            { value: 1, label: '有时会', score: 1 },
            { value: 2, label: '很少会', score: 2 },
            { value: 3, label: '从不会', score: 3 }
        ]
    },
    {
        id: 2,
        videoUrl: 'assets/videos/q2.mp4',
        content: '宝宝会用手指指向他/她感兴趣的物品（如玩具、食物）给您看吗？',
        options: [
            { value: 0, label: '经常这样做', score: 0 },
            { value: 1, label: '有时这样做', score: 1 },
            { value: 2, label: '很少这样做', score: 2 },
            { value: 3, label: '从不这样做', score: 3 }
        ]
    },
    {
        id: 3,
        videoUrl: 'assets/videos/q3.mp4',
        content: '宝宝会和您进行目光对视吗？（如玩耍时会看您的眼睛）',
        options: [
            { value: 0, label: '经常对视', score: 0 },
            { value: 1, label: '有时对视', score: 1 },
            { value: 2, label: '很少对视', score: 2 },
            { value: 3, label: '从不/回避对视', score: 3 }
        ]
    },
    {
        id: 4,
        videoUrl: 'assets/videos/q4.mp4',
        content: '当您对宝宝微笑时，他/她会回应微笑吗？',
        options: [
            { value: 0, label: '总是回应', score: 0 },
            { value: 1, label: '有时回应', score: 1 },
            { value: 2, label: '很少回应', score: 2 },
            { value: 3, label: '从不回应', score: 3 }
        ]
    },
    {
        id: 5,
        videoUrl: 'assets/videos/q5.mp4',
        content: '宝宝会模仿您的动作或表情吗？（如拍手、做鬼脸）',
        options: [
            { value: 0, label: '经常模仿', score: 0 },
            { value: 1, label: '有时模仿', score: 1 },
            { value: 2, label: '很少模仿', score: 2 },
            { value: 3, label: '从不模仿', score: 3 }
        ]
    },
    {
        id: 6,
        videoUrl: 'assets/videos/q6.mp4',
        content: '宝宝会玩"假装"游戏吗？（如假装喂娃娃、假装打电话）',
        options: [
            { value: 0, label: '经常玩', score: 0 },
            { value: 1, label: '有时玩', score: 1 },
            { value: 2, label: '很少玩', score: 2 },
            { value: 3, label: '从不玩', score: 3 }
        ]
    },
    {
        id: 7,
        videoUrl: 'assets/videos/q7.mp4',
        content: '宝宝会对其他小朋友表现出兴趣吗？（如看别的孩子玩）',
        options: [
            { value: 0, label: '很感兴趣', score: 0 },
            { value: 1, label: '有点兴趣', score: 1 },
            { value: 2, label: '不太感兴趣', score: 2 },
            { value: 3, label: '完全不感兴趣', score: 3 }
        ]
    },
    {
        id: 8,
        videoUrl: 'assets/videos/q8.mp4',
        content: '宝宝会把自己喜欢的东西拿给您看吗？（不是为了求助）',
        options: [
            { value: 0, label: '经常这样做', score: 0 },
            { value: 1, label: '有时这样做', score: 1 },
            { value: 2, label: '很少这样做', score: 2 },
            { value: 3, label: '从不这样做', score: 3 }
        ]
    },
    {
        id: 9,
        videoUrl: 'assets/videos/q9.mp4',
        content: '宝宝能听懂简单的指令吗？（如"把球给妈妈"）',
        options: [
            { value: 0, label: '能听懂多个指令', score: 0 },
            { value: 1, label: '能听懂一些', score: 1 },
            { value: 2, label: '很少能听懂', score: 2 },
            { value: 3, label: '完全听不懂', score: 3 }
        ]
    },
    {
        id: 10,
        videoUrl: 'assets/videos/q10.mp4',
        content: '宝宝会发出不同的声音来表达需求吗？（如饿了、要抱抱）',
        options: [
            { value: 0, label: '经常发出声音', score: 0 },
            { value: 1, label: '有时发出声音', score: 1 },
            { value: 2, label: '很少发出声音', score: 2 },
            { value: 3, label: '几乎不发声', score: 3 }
        ]
    },
    {
        id: 11,
        videoUrl: 'assets/videos/q11.mp4',
        content: '宝宝对声音的反应正常吗？（如突然的声音会转头看）',
        options: [
            { value: 0, label: '反应正常', score: 0 },
            { value: 1, label: '有时反应弱', score: 1 },
            { value: 2, label: '经常反应弱', score: 2 },
            { value: 3, label: '对声音无反应', score: 3 }
        ]
    },
    {
        id: 12,
        videoUrl: 'assets/videos/q12.mp4',
        content: '宝宝会有重复的、刻板的行为吗？（如反复转圈、摆手、排列物品）',
        options: [
            { value: 0, label: '没有', score: 3 },
            { value: 1, label: '偶尔有', score: 2 },
            { value: 2, label: '经常有', score: 1 },
            { value: 3, label: '非常频繁', score: 0 }
        ]
    },
    {
        id: 13,
        videoUrl: 'assets/videos/q13.mp4',
        content: '宝宝会对某些感官刺激异常敏感或迟钝吗？（如对声音、触觉、光线）',
        options: [
            { value: 0, label: '没有异常', score: 0 },
            { value: 1, label: '偶尔异常', score: 1 },
            { value: 2, label: '经常异常', score: 2 },
            { value: 3, label: '明显异常', score: 3 }
        ]
    },
    {
        id: 14,
        videoUrl: 'assets/videos/q14.mp4',
        content: '宝宝有语言发育方面的问题吗？（相比同龄儿童说话明显少）',
        options: [
            { value: 0, label: '语言发育正常', score: 0 },
            { value: 1, label: '稍微落后', score: 1 },
            { value: 2, label: '明显落后', score: 2 },
            { value: 3, label: '几乎没有语言', score: 3 }
        ]
    },
    {
        id: 15,
        videoUrl: 'assets/videos/q15.mp4',
        content: '宝宝喜欢按照固定的方式做事吗？（改变常规会哭闹）',
        options: [
            { value: 0, label: '灵活适应变化', score: 0 },
            { value: 1, label: '偶尔抗拒变化', score: 1 },
            { value: 2, label: '经常抗拒变化', score: 2 },
            { value: 3, label: '极度抗拒变化', score: 3 }
        ]
    },
    {
        id: 16,
        videoUrl: 'assets/videos/q16.mp4',
        content: '宝宝玩玩具的方式是否正常？（如只转轮子而不是推小车）',
        options: [
            { value: 0, label: '玩法正常', score: 0 },
            { value: 1, label: '偶尔玩法异常', score: 1 },
            { value: 2, label: '经常玩法异常', score: 2 },
            { value: 3, label: '玩法明显异常', score: 3 }
        ]
    },
    {
        id: 17,
        videoUrl: 'assets/videos/q17.mp4',
        content: '宝宝的情绪变化是否突然且难以安抚？',
        options: [
            { value: 0, label: '情绪平稳', score: 0 },
            { value: 1, label: '偶尔情绪波动', score: 1 },
            { value: 2, label: '经常情绪波动', score: 2 },
            { value: 3, label: '频繁且难以安抚', score: 3 }
        ]
    },
    {
        id: 18,
        videoUrl: 'assets/videos/q18.mp4',
        content: '宝宝的大运动发育是否正常？（如坐、爬、走的时间）',
        options: [
            { value: 0, label: '发育正常', score: 0 },
            { value: 1, label: '稍微落后', score: 1 },
            { value: 2, label: '明显落后', score: 2 },
            { value: 3, label: '严重落后', score: 3 }
        ]
    },
    {
        id: 19,
        videoUrl: 'assets/videos/q19.mp4',
        content: '宝宝是否会主动寻求您的安慰？（如摔倒后找您抱）',
        options: [
            { value: 0, label: '经常主动寻求', score: 0 },
            { value: 1, label: '有时寻求', score: 1 },
            { value: 2, label: '很少寻求', score: 2 },
            { value: 3, label: '从不寻求安慰', score: 3 }
        ]
    },
    {
        id: 20,
        videoUrl: 'assets/videos/q20.mp4',
        content: '整体来看，您对宝宝的社交沟通能力是否感到担忧？',
        options: [
            { value: 0, label: '完全不担心', score: 0 },
            { value: 1, label: '略微担心', score: 1 },
            { value: 2, label: '比较担心', score: 2 },
            { value: 3, label: '非常担心', score: 3 }
        ]
    }
];

// ==================== 科普文章数据 ====================
const SCIENCE_ARTICLES = [
    {
        id: 1,
        category: 'knowledge',
        title: '什么是孤独症谱系障碍（ASD）？',
        summary: '孤独症谱系障碍是一种神经发育障碍，影响儿童的社交沟通和行为模式。早期识别和干预对改善预后至关重要。',
        content: '孤独症谱系障碍（Autism Spectrum Disorder, ASD）是一组以社交沟通障碍、兴趣狭窄和重复刻板行为为核心特征的神经发育障碍。症状通常在生命早期出现，但可能在社交需求超出能力范围时才完全显现。\n\nASD的"谱系"意味着症状表现和严重程度存在极大个体差异。有些儿童可能完全不说话，而有些则语言能力正常但社交困难。\n\n核心特征包括：\n1. 社交沟通和互动的持续性困难\n2. 受限的、重复的行为模式、兴趣或活动\n3. 症状在发育早期出现\n4. 症状导致临床显著的功能损害',
        date: '2026-06-15',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 2,
        category: 'knowledge',
        title: '孤独症的早期流行病学数据',
        summary: '了解孤独症的发生率、男女比例、遗传因素等关键数据，帮助家长建立科学的认知。',
        content: '根据美国CDC 2023年数据，孤独症发生率约为1/36（8岁儿童），男孩患病率约为女孩的4倍。在中国，孤独症的患病率约为1%，且有逐年上升趋势。\n\n重要发现：\n• 孤独症可见于所有种族、民族和社会经济群体\n• 约40%的孤独症儿童伴有智力障碍\n• 早期筛查和干预可以显著改善预后\n• 兄弟姐妹中有孤独症的儿童患病风险更高（约18.7%）',
        date: '2026-06-10',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 3,
        category: 'early',
        title: '2岁前需要警惕的早期信号',
        summary: '孤独症的早期行为标志，帮助家长及早发现异常并寻求专业评估。',
        content: '以下是不同月龄阶段需要关注的早期信号：\n\n**6个月：**\n• 没有灿烂的笑容或其他温暖愉快的表情\n• 眼神接触有限或缺失\n\n**9个月：**\n• 对声音、微笑或其他面部表情没有回应\n• 很少或没有咿呀学语\n\n**12个月：**\n• 对自己的名字没有反应\n• 没有或很少有手势（如指物、展示、伸手够）\n• 没有咿呀学语\n\n**16个月：**\n• 没有有意义的单词\n\n**24个月：**\n• 没有有意义的双词短语（不包括模仿或重复）\n• 任何年龄段的语言或社交能力倒退',
        date: '2026-05-28',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 4,
        category: 'early',
        title: '社交沟通发育里程碑对照表',
        summary: '从出生到5岁的社交沟通发育里程碑，帮助家长了解各年龄段儿童应该具备的能力。',
        content: '以下是各年龄段的社交沟通发育里程碑：\n\n**0-6个月：**对声音有反应，会注视人脸，会发出咕咕声\n**6-12个月：**对自己的名字有反应，理解"不"，会使用手势\n**12-18个月：**会说第一个词，会用手指物，会玩简单的社交游戏\n**18-24个月：**词汇量快速增长，开始组合词语，模仿他人行为\n**2-3岁：**使用2-3词句，理解简单指令，参与平行游戏\n**3-4岁：**能讲简单故事，能回答"谁""什么""哪里"问题\n**4-5岁：**能清晰表达复杂想法，理解幽默，能遵守规则玩游戏\n\n如果孩子明显落后于同龄儿童的发育里程，建议尽早进行专业评估。',
        date: '2026-05-20',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 5,
        category: 'intervene',
        title: '应用行为分析（ABA）简介',
        summary: 'ABA是目前最具循证依据支持的孤独症干预方法之一，了解其基本原理和实施方式。',
        content: '应用行为分析（Applied Behavior Analysis, ABA）是一门基于行为学习理论的科学方法，通过系统地应用行为原理来改善有意义的行为。\n\n核心策略包括：\n1. **分解技能**：将复杂技能分解为小的、可教的单元\n2. **正向强化**：使用奖励来增加期望行为\n3. **提示与消退**：提供帮助并逐步减少\n4. **泛化**：确保技能在不同环境中都能应用\n\n早期密集行为干预（EIBI）通常建议：\n• 每周20-40小时\n• 一对一的个性化教学\n• 家庭参与至关重要\n• 定期评估和调整个别化教育计划',
        date: '2026-05-15',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 6,
        category: 'intervene',
        title: '家庭干预：在日常生活中帮助孩子',
        summary: '家长可以在日常生活中采用简单有效的策略促进孩子的社交沟通发展。',
        content: '家庭是儿童最重要的学习环境。以下是在家中可以帮助孩子的策略：\n\n1. **跟随孩子的兴趣**：观察孩子感兴趣的事物，加入他们的活动\n2. **创造沟通机会**：把玩具放在看得见但够不着的地方，鼓励孩子求助\n3. **使用视觉支持**：制作图片时间表，帮助孩子理解日常安排\n4. **模仿和扩展**：模仿孩子的发音和行为，然后扩展它们\n5. **轮流游戏**：玩球类、积木等需要轮流互动的游戏\n6. **减少屏幕时间**：限制电子设备使用，增加面对面互动\n\n记住：家长不需要成为治疗师，关键是创造温暖、互动丰富的家庭环境。',
        date: '2026-05-08',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 7,
        category: 'knowledge',
        title: '孤独症的成因：科学怎么说？',
        summary: '了解孤独症的科学成因，消除常见误区，建立正确的认知。',
        content: '目前科学研究表明，孤独症的发生是遗传因素和环境因素共同作用的结果：\n\n**遗传因素：**\n• 孤独症具有高度遗传性（遗传度约80%）\n• 多个基因的变异增加患病风险\n• 兄弟姐妹患病风险更高\n\n**环境风险因素：**\n• 父母高龄生育\n• 孕期感染和某些药物暴露\n• 极低出生体重和早产\n\n**重要纠正——孤独症与以下因素无关：**\n• 疫苗（大量研究已证实疫苗不会导致孤独症）\n• 养育方式（"冰箱母亲"理论已被完全否定）\n• 饮食因素（如麸质、酪蛋白）',
        date: '2026-04-22',
        author: '南开大学儿童发育行为研究中心'
    },
    {
        id: 8,
        category: 'intervene',
        title: '感觉统合与孤独症儿童',
        summary: '大多数孤独症儿童存在感觉处理差异，了解感觉统合训练可以帮助改善日常生活质量。',
        content: '约90%的孤独症儿童存在感觉处理异常，可能表现为：\n\n**感觉过敏：**\n• 对特定声音（如吸尘器、吹风机）过度反应\n• 对衣物标签、特定材质强烈排斥\n• 挑食（与食物质地有关）\n\n**感觉迟钝：**\n• 对疼痛反应减弱\n• 寻求强烈的前庭刺激（旋转、跳跃）\n• 对叫名字缺乏反应\n\n感觉统合策略：\n1. 提供感觉"饮食"——安排满足感觉需求的活动\n2. 使用加重毯、压缩衣等触觉工具\n3. 设置安静的"冷静角"\n4. 渐进性地引入不喜欢的刺激',
        date: '2026-04-15',
        author: '南开大学儿童发育行为研究中心'
    }
];

// ==================== 转诊机构数据 ====================
const REFERRAL_INSTITUTIONS = [
    {
        id: 1,
        name: '北京大学第六医院（北医六院）',
        region: '北京',
        department: '儿童心理卫生中心',
        address: '北京市海淀区花园北路51号',
        phone: '010-82801936',
        description: '国家级精神卫生专科医院，设有国内一流的儿童孤独症诊疗中心，提供全面评估和干预服务。'
    },
    {
        id: 2,
        name: '首都儿科研究所附属儿童医院',
        region: '北京',
        department: '保健科/神经科',
        address: '北京市朝阳区雅宝路2号',
        phone: '010-85695555',
        description: '儿童专科医院，开展孤独症早期筛查、诊断和干预指导，设有发育行为儿科门诊。'
    },
    {
        id: 3,
        name: '复旦大学附属儿科医院',
        region: '上海',
        department: '儿童保健科',
        address: '上海市闵行区万源路399号',
        phone: '021-64931990',
        description: '全国知名的儿童专科医院，设有发育行为儿科和儿童心理科，提供多学科联合诊疗。'
    },
    {
        id: 4,
        name: '上海交通大学医学院附属新华医院',
        region: '上海',
        department: '发育行为儿童保健科',
        address: '上海市杨浦区控江路1665号',
        phone: '021-25078999',
        description: '设有发育行为儿科重点专科，开展孤独症早期筛查、诊断及早期干预。'
    },
    {
        id: 5,
        name: '广州市妇女儿童医疗中心',
        region: '广州',
        department: '儿童保健部/心理科',
        address: '广州市天河区金穗路9号',
        phone: '020-38076001',
        description: '华南地区最大的妇儿专科医院，设有儿童早期发展中心和发育行为门诊。'
    },
    {
        id: 6,
        name: '中山大学附属第三医院',
        region: '广州',
        department: '儿童发育行为中心',
        address: '广州市天河区天河路600号',
        phone: '020-85253333',
        description: '国内最早成立儿童发育行为中心的医院之一，由邹小兵教授领衔，提供系统化诊疗。'
    },
    {
        id: 7,
        name: '重庆医科大学附属儿童医院',
        region: '重庆',
        department: '儿童保健科/康复科',
        address: '重庆市渝中区中山二路136号',
        phone: '023-63632114',
        description: '西南地区最大的儿童专科医院，设有儿童心理卫生中心和发育行为门诊。'
    },
    {
        id: 8,
        name: '南京市妇幼保健院',
        region: '南京',
        department: '儿童保健科',
        address: '南京市秦淮区莫愁路天妃巷123号',
        phone: '025-52226111',
        description: '江苏省孤独症筛查和干预技术指导单位，提供从筛查到干预的全程服务。'
    },
    {
        id: 9,
        name: '天津市儿童医院',
        region: '天津',
        department: '心理科/康复科',
        address: '天津市北辰区龙岩道238号',
        phone: '022-87787101',
        description: '设有儿童心理行为门诊和康复训练中心，与南开大学有科研合作关系。'
    },
    {
        id: 10,
        name: '浙江大学医学院附属儿童医院',
        region: '杭州',
        department: '发育行为儿科',
        address: '杭州市滨江区滨盛路3333号',
        phone: '0571-86670000',
        description: '浙江省孤独症诊治中心，提供多学科协作诊疗和家庭指导服务。'
    },
    {
        id: 11,
        name: '四川大学华西第二医院',
        region: '成都',
        department: '儿童保健科/心理卫生中心',
        address: '成都市武侯区人民南路三段20号',
        phone: '028-85503960',
        description: '西部地区综合实力最强的妇幼专科医院，开展孤独症诊疗和家庭指导。'
    },
    {
        id: 12,
        name: '武汉儿童医院（武汉市妇幼保健院）',
        region: '武汉',
        department: '儿童保健科/康复医学科',
        address: '武汉市江岸区香港路100号',
        phone: '027-82433350',
        description: '中部地区大型儿童专科医院，设有儿童发育行为中心和早期干预基地。'
    }
];

// ==================== 赋能资源数据 ====================
const EMPOWERMENT_RESOURCES = [
    {
        id: 1,
        icon: '📖',
        title: '家长指南手册',
        desc: '为孤独症儿童家长编写的系统指南，涵盖从诊断到干预的全流程支持。',
        url: '#'
    },
    {
        id: 2,
        icon: '🎬',
        title: '家庭干预视频教程',
        desc: '系列教学视频，示范如何在家中开展有效的早期干预活动。',
        url: '#'
    },
    {
        id: 3,
        icon: '💬',
        title: '家长交流社区',
        desc: '与其他孤独症儿童家长分享经验、互相支持的线上社区。',
        url: '#'
    },
    {
        id: 4,
        icon: '🎮',
        title: '亲子互动游戏指南',
        desc: '精选促进社交沟通的亲子游戏，附详细操作说明和示范。',
        url: '#'
    },
    {
        id: 5,
        icon: '📊',
        title: '发育追踪工具',
        desc: '定期记录孩子发育进展的工具，帮助发现变化趋势。',
        url: '#'
    },
    {
        id: 6,
        icon: '🎵',
        title: '音乐与韵律资源',
        desc: '利用音乐促进社交互动和语言发展的资源合集。',
        url: '#'
    },
    {
        id: 7,
        icon: '📱',
        title: '辅助沟通工具推荐',
        desc: '推荐适合无语言或语言受限儿童的AAC辅助沟通应用。',
        url: '#'
    },
    {
        id: 8,
        icon: '🏠',
        title: '居家环境改造建议',
        desc: '如何在家中设置有利于孤独症儿童发展的结构化环境。',
        url: '#'
    }
];

module.exports = {
    SCREENING_QUESTIONS,
    SCIENCE_ARTICLES,
    REFERRAL_INSTITUTIONS,
    EMPOWERMENT_RESOURCES
};
