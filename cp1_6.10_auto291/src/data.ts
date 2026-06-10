export type Theme = 'physics' | 'chemistry' | 'biology' | 'history';

export interface KnowledgeNode {
  id: string;
  name: string;
  theme: Theme;
  description: string;
  detailedDescription: string;
  source: string;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  strength: 'weak' | 'medium' | 'strong';
}

export const THEME_COLORS: Record<Theme, string> = {
  physics: '#4fc3f7',
  chemistry: '#81c784',
  biology: '#ffd54f',
  history: '#ce93d8'
};

export const THEME_NAMES: Record<Theme, string> = {
  physics: '物理学',
  chemistry: '化学',
  biology: '生物学',
  history: '历史学'
};

export const knowledgeNodes: KnowledgeNode[] = [
  {
    id: 'relativity',
    name: '相对论',
    theme: 'physics',
    description: '爱因斯坦提出的时空与引力理论',
    detailedDescription: '相对论是爱因斯坦在20世纪初提出的两大理论（狭义相对论和广义相对论）的合称。狭义相对论颠覆了牛顿的绝对时空观，提出时间与空间是相对的，质能等价公式E=mc²是其核心成果。广义相对论则重新解释了引力，认为引力是时空弯曲的表现。',
    source: '《相对论的意义》，阿尔伯特·爱因斯坦，1922年'
  },
  {
    id: 'quantum',
    name: '量子力学',
    theme: 'physics',
    description: '研究微观粒子运动规律的物理学分支',
    detailedDescription: '量子力学是描述微观世界（原子、亚原子粒子）行为的物理学理论。它引入了波粒二象性、不确定性原理、量子纠缠等革命性概念，彻底改变了人类对物质基本组成和相互作用的理解，是现代电子技术和信息技术的理论基础。',
    source: '《量子力学原理》，保罗·狄拉克，1930年'
  },
  {
    id: 'newton',
    name: '经典力学',
    theme: 'physics',
    description: '牛顿三大运动定律为基础的力学体系',
    detailedDescription: '经典力学以牛顿三大运动定律和万有引力定律为核心，描述宏观物体在低速条件下的运动规律。它是人类历史上第一个完整的科学理论体系，成功解释了从地面物体运动到天体运行的广泛现象，是工程技术的重要基础。',
    source: '《自然哲学的数学原理》，艾萨克·牛顿，1687年'
  },
  {
    id: 'electromagnetism',
    name: '电磁学',
    theme: 'physics',
    description: '研究电与磁现象及其相互作用的理论',
    detailedDescription: '电磁学研究电荷、电流、电场和磁场的性质与相互作用。麦克斯韦方程组统一了电学和磁学，预言了电磁波的存在，揭示了光的电磁本质。电磁学是现代电力工业、电子通信和信息技术的基础。',
    source: '《电磁通论》，詹姆斯·克拉克·麦克斯韦，1873年'
  },
  {
    id: 'thermodynamics',
    name: '热力学',
    theme: 'physics',
    description: '研究热现象中能量转化规律的学科',
    detailedDescription: '热力学研究热、功、温度和能量之间的关系，其四大定律（第零到第三定律）描述了系统的平衡态和能量转换规律。熵的概念是热力学的核心贡献，它揭示了自然界过程的方向性，对理解时间箭头具有重要意义。',
    source: '《热的动力理论》，鲁道夫·克劳修斯，1865年'
  },
  {
    id: 'periodic_table',
    name: '元素周期表',
    theme: 'chemistry',
    description: '按原子序数排列的化学元素分类表',
    detailedDescription: '元素周期表是根据元素的原子序数、电子构型和化学性质周期性排列的表格。门捷列夫在1869年首次发表，成功预言了当时未知元素的存在和性质。周期表揭示了元素性质的周期性规律，是化学研究最重要的工具之一。',
    source: '《化学原理》，德米特里·门捷列夫，1869年'
  },
  {
    id: 'organic_chem',
    name: '有机化学',
    theme: 'chemistry',
    description: '研究碳及其化合物的化学分支',
    detailedDescription: '有机化学研究含碳化合物的结构、性质、合成和反应。碳的独特成键能力（形成四个共价键）使得有机化合物种类极其丰富，包括生命体内的蛋白质、核酸、碳水化合物等生物分子，以及塑料、药物、燃料等人造材料。',
    source: '《有机化学》，路易斯·费塞尔，1944年'
  },
  {
    id: 'chemical_bond',
    name: '化学键',
    theme: 'chemistry',
    description: '原子间通过电子相互作用形成的连接',
    detailedDescription: '化学键是原子间通过电子转移或共享形成的相互作用力，主要类型包括离子键、共价键和金属键。化学键理论解释了原子如何结合成分子和晶体，是理解物质结构和化学反应的基础，对材料科学和药物设计具有重要指导意义。',
    source: '《化学键的本质》，莱纳斯·鲍林，1939年'
  },
  {
    id: 'reaction_kinetics',
    name: '化学反应动力学',
    theme: 'chemistry',
    description: '研究化学反应速率及其机理的学科',
    detailedDescription: '化学反应动力学研究化学反应进行的速率、影响速率的因素（温度、浓度、催化剂等）以及反应进行的微观机理。通过速率方程和活化能的测定，可以深入理解反应的本质，为工业生产中优化反应条件提供理论依据。',
    source: '《化学动力学》，基思·J·莱因勒，1972年'
  },
  {
    id: 'acid_base',
    name: '酸碱理论',
    theme: 'chemistry',
    description: '描述酸碱本质与反应的化学理论',
    detailedDescription: '酸碱理论经历了多个发展阶段：阿仑尼乌斯理论（水溶液中H+和OH-）、布朗斯特-劳里理论（质子给体与受体）、路易斯理论（电子对接受体与给体）。酸碱反应是最常见的化学反应类型之一，在生物、环境和工业过程中普遍存在。',
    source: '《酸碱原理》，拉尔夫·皮尔逊，1963年'
  },
  {
    id: 'dna',
    name: 'DNA双螺旋',
    theme: 'biology',
    description: '遗传信息的分子载体结构',
    detailedDescription: 'DNA（脱氧核糖核酸）双螺旋结构由沃森和克里克在1953年发现。两条反向平行的多核苷酸链通过碱基配对（A-T、G-C）缠绕形成双螺旋。DNA携带生物体的全部遗传信息，通过复制将遗传信息传递给后代，是分子生物学的核心发现。',
    source: '《核酸的分子结构》，詹姆斯·沃森和弗朗西斯·克里克，1953年'
  },
  {
    id: 'evolution',
    name: '进化论',
    theme: 'biology',
    description: '物种通过自然选择逐渐演变的理论',
    detailedDescription: '进化论由达尔文在1859年系统提出，认为所有生物都由共同祖先经过自然选择（适者生存）逐渐演化而来。进化论解释了生物的多样性和适应性，是现代生物学的统一理论框架，对遗传学、生态学和医学都有深远影响。',
    source: '《物种起源》，查尔斯·达尔文，1859年'
  },
  {
    id: 'cell',
    name: '细胞学说',
    theme: 'biology',
    description: '认为细胞是生物体基本结构单位的理论',
    detailedDescription: '细胞学说由施莱登和施旺在19世纪提出，主要内容包括：所有生物体由一个或多个细胞组成；细胞是生命的基本结构和功能单位；所有细胞都来自先前存在的细胞。细胞学说揭示了生命的统一性，是现代生物学的基石之一。',
    source: '《动植物结构和生长一致性的显微研究》，西奥多·施旺，1839年'
  },
  {
    id: 'photosynthesis',
    name: '光合作用',
    theme: 'biology',
    description: '植物利用光能将无机物转化为有机物的过程',
    detailedDescription: '光合作用是绿色植物、藻类和某些细菌利用光能将二氧化碳和水转化为有机物（主要是葡萄糖）并释放氧气的过程。它是地球上几乎所有生命的能量来源，同时维持着大气中的氧气含量，对全球碳循环和气候变化至关重要。',
    source: '《植物生理学》，弗里茨·温特，1960年'
  },
  {
    id: 'genetics',
    name: '遗传学',
    theme: 'biology',
    description: '研究基因与遗传规律的生物学分支',
    detailedDescription: '遗传学研究基因的结构、功能、变异和遗传规律。从孟德尔的遗传定律到现代基因编辑技术（如CRISPR），遗传学揭示了性状从亲代传递给后代的分子机制，对理解遗传性疾病、改良作物品种和生物进化都有重要意义。',
    source: '《植物杂交实验》，格雷戈尔·孟德尔，1866年'
  },
  {
    id: 'renaissance',
    name: '文艺复兴',
    theme: 'history',
    description: '14-17世纪欧洲的思想文化运动',
    detailedDescription: '文艺复兴起源于14世纪的意大利，随后蔓延到整个欧洲。它以复兴古典文化为名义，实质是新兴资产阶级的思想解放运动，核心是人文主义精神。文艺复兴在文学、艺术、科学等领域取得了辉煌成就，是欧洲中世纪和近代的分水岭。',
    source: '《文艺复兴史研究》，雅各布·布克哈特，1860年'
  },
  {
    id: 'industrial_rev',
    name: '工业革命',
    theme: 'history',
    description: '18-19世纪从手工生产到机器生产的转变',
    detailedDescription: '工业革命始于18世纪60年代的英国，以蒸汽机的发明和广泛使用为标志，实现了从手工工场到机器大工业的历史性跨越。工业革命极大地提高了生产力，改变了社会结构和世界格局，推动了城市化和全球化进程，是现代社会形成的关键转折点。',
    source: '《工业革命演讲集》，阿诺德·汤因比，1884年'
  },
  {
    id: 'french_rev',
    name: '法国大革命',
    theme: 'history',
    description: '1789年爆发的法国资产阶级革命',
    detailedDescription: '法国大革命是1789年在法国爆发的资产阶级革命，推翻了波旁王朝的封建统治，发表了《人权宣言》，确立了自由、平等、博爱的原则。大革命深刻影响了欧洲和世界的政治发展，推动了民主思想的传播和民族国家的形成。',
    source: '《法国大革命史》，托马斯·卡莱尔，1837年'
  },
  {
    id: 'silk_road',
    name: '丝绸之路',
    theme: 'history',
    description: '古代连接东西方的贸易与文化通道',
    detailedDescription: '丝绸之路是公元前2世纪至公元15世纪间连接欧亚大陆的商业贸易路线网络，以丝绸贸易最为著名。它不仅是商品贸易的通道，更是东西方文化、技术、宗教和思想交流的桥梁，促进了四大发明、佛教、伊斯兰教等的传播，对世界文明发展影响深远。',
    source: '《中国和罗马人的东方》，费迪南·冯·李希霍芬，1877年'
  },
  {
    id: 'age_of_discovery',
    name: '地理大发现',
    theme: 'history',
    description: '15-17世纪欧洲航海家探索世界的时期',
    detailedDescription: '地理大发现（大航海时代）是15世纪至17世纪欧洲航海家开辟新航路和发现新大陆的历史时期。哥伦布发现美洲、达伽马开辟印度航路、麦哲伦环球航行等壮举，打破了世界各地相对隔绝的状态，开启了全球化进程，深刻改变了世界格局。',
    source: '《航海与发现》，塞缪尔·艾略特·莫里森，1942年'
  }
];

export const knowledgeEdges: KnowledgeEdge[] = [
  { source: 'relativity', target: 'quantum', strength: 'strong' },
  { source: 'relativity', target: 'newton', strength: 'medium' },
  { source: 'relativity', target: 'electromagnetism', strength: 'medium' },
  { source: 'quantum', target: 'electromagnetism', strength: 'medium' },
  { source: 'quantum', target: 'chemical_bond', strength: 'strong' },
  { source: 'newton', target: 'thermodynamics', strength: 'weak' },
  { source: 'electromagnetism', target: 'thermodynamics', strength: 'weak' },
  { source: 'periodic_table', target: 'chemical_bond', strength: 'strong' },
  { source: 'periodic_table', target: 'organic_chem', strength: 'medium' },
  { source: 'organic_chem', target: 'chemical_bond', strength: 'strong' },
  { source: 'organic_chem', target: 'acid_base', strength: 'medium' },
  { source: 'organic_chem', target: 'dna', strength: 'strong' },
  { source: 'reaction_kinetics', target: 'thermodynamics', strength: 'medium' },
  { source: 'reaction_kinetics', target: 'acid_base', strength: 'medium' },
  { source: 'chemical_bond', target: 'acid_base', strength: 'medium' },
  { source: 'dna', target: 'genetics', strength: 'strong' },
  { source: 'dna', target: 'cell', strength: 'medium' },
  { source: 'evolution', target: 'genetics', strength: 'strong' },
  { source: 'evolution', target: 'cell', strength: 'weak' },
  { source: 'cell', target: 'photosynthesis', strength: 'medium' },
  { source: 'genetics', target: 'cell', strength: 'medium' },
  { source: 'photosynthesis', target: 'thermodynamics', strength: 'weak' },
  { source: 'renaissance', target: 'age_of_discovery', strength: 'medium' },
  { source: 'renaissance', target: 'silk_road', strength: 'weak' },
  { source: 'renaissance', target: 'french_rev', strength: 'medium' },
  { source: 'industrial_rev', target: 'french_rev', strength: 'medium' },
  { source: 'industrial_rev', target: 'age_of_discovery', strength: 'medium' },
  { source: 'industrial_rev', target: 'electromagnetism', strength: 'medium' },
  { source: 'industrial_rev', target: 'thermodynamics', strength: 'strong' },
  { source: 'silk_road', target: 'age_of_discovery', strength: 'medium' },
  { source: 'french_rev', target: 'evolution', strength: 'weak' },
  { source: 'quantum', target: 'genetics', strength: 'weak' },
  { source: 'periodic_table', target: 'biology', strength: 'weak' }
];
