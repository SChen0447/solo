export interface SkillData {
  id: string;
  name: string;
  element: string;
  colorStart: string;
  colorEnd: string;
  description: string;
  particleCount: number;
  duration: number;
}

export interface ParticleConfig {
  skillId: string;
  color: number;
  colorEnd: number;
  particleCount: number;
  size: number;
  speed: number;
  lifetime: number;
  emissionRate: number;
  spread: number;
  gravity: number;
  glow: boolean;
  trail: boolean;
  shape: 'sphere' | 'cone' | 'ring' | 'burst';
}

export interface ComboEffect {
  ids: string[];
  name: string;
  description: string;
  particleCount: number;
  duration: number;
  primaryColor: number;
  secondaryColor: number;
}

export class SkillManager {
  private skills: Map<string, SkillData> = new Map();
  private combos: Map<string, ComboEffect> = new Map();
  private selectedSkills: string[] = [];
  private maxSlots: number = 3;

  constructor() {
    this.initializeSkills();
    this.initializeCombos();
  }

  private initializeSkills(): void {
    const skillList: SkillData[] = [
      {
        id: 'fireball',
        name: '火球术',
        element: 'fire',
        colorStart: '#FF4500',
        colorEnd: '#FFD700',
        description: '召唤灼热的火球，造成高额火焰伤害',
        particleCount: 600,
        duration: 5000
      },
      {
        id: 'frost',
        name: '冰霜新星',
        element: 'ice',
        colorStart: '#00BFFF',
        colorEnd: '#FFFFFF',
        description: '释放寒冰能量，冻结范围内的敌人',
        particleCount: 550,
        duration: 5000
      },
      {
        id: 'heal',
        name: '生命祝福',
        element: 'nature',
        colorStart: '#32CD32',
        colorEnd: '#98FB98',
        description: '神圣的自然之力，恢复生命值',
        particleCount: 500,
        duration: 5000
      },
      {
        id: 'shield',
        name: '能量护盾',
        element: 'arcane',
        colorStart: '#9370DB',
        colorEnd: '#E6E6FA',
        description: '生成魔法护盾，吸收伤害',
        particleCount: 450,
        duration: 5000
      },
      {
        id: 'lightning',
        name: '雷霆一击',
        element: 'lightning',
        colorStart: '#FFFF00',
        colorEnd: '#FFFFFF',
        description: '召唤雷电，对单体造成暴击伤害',
        particleCount: 650,
        duration: 5000
      },
      {
        id: 'poison',
        name: '剧毒之雾',
        element: 'poison',
        colorStart: '#9ACD32',
        colorEnd: '#556B2F',
        description: '释放毒雾，持续造成毒素伤害',
        particleCount: 500,
        duration: 5000
      },
      {
        id: 'shadow',
        name: '暗影突袭',
        element: 'shadow',
        colorStart: '#4B0082',
        colorEnd: '#8A2BE2',
        description: '从暗影中袭来，降低敌人防御',
        particleCount: 550,
        duration: 5000
      },
      {
        id: 'earth',
        name: '岩石崩塌',
        element: 'earth',
        colorStart: '#8B4513',
        colorEnd: '#D2691E',
        description: '召唤巨石从天而降，造成范围伤害',
        particleCount: 500,
        duration: 5000
      },
      {
        id: 'wind',
        name: '疾风斩',
        element: 'wind',
        colorStart: '#E0FFFF',
        colorEnd: '#AFEEEE',
        description: '锋利的风刃，快速切割敌人',
        particleCount: 480,
        duration: 5000
      },
      {
        id: 'arcane',
        name: '奥术飞弹',
        element: 'magic',
        colorStart: '#00CED1',
        colorEnd: '#40E0D0',
        description: '追踪型奥术能量弹，多段伤害',
        particleCount: 520,
        duration: 5000
      }
    ];

    skillList.forEach(skill => {
      this.skills.set(skill.id, skill);
    });
  }

  private initializeCombos(): void {
    const comboList: ComboEffect[] = [
      {
        ids: ['fireball', 'frost'],
        name: '蒸汽迷雾',
        description: '火球+冰霜 = 蒸汽迷雾：减速敌人并造成持续伤害',
        particleCount: 1200,
        duration: 3000,
        primaryColor: 0x87CEEB,
        secondaryColor: 0xFFFFFF
      },
      {
        ids: ['fireball', 'lightning'],
        name: '等离子爆发',
        description: '火球+雷电 = 等离子爆发：超高伤害的能量爆炸',
        particleCount: 1400,
        duration: 3000,
        primaryColor: 0xFF6347,
        secondaryColor: 0xFFFF00
      },
      {
        ids: ['frost', 'shield'],
        name: '冰晶壁垒',
        description: '冰霜+护盾 = 冰晶壁垒：强力防御并反伤近战敌人',
        particleCount: 1000,
        duration: 3000,
        primaryColor: 0x00BFFF,
        secondaryColor: 0xE6E6FA
      },
      {
        ids: ['heal', 'shield'],
        name: '圣结界',
        description: '治疗+护盾 = 圣结界：持续回血的保护领域',
        particleCount: 900,
        duration: 3000,
        primaryColor: 0x98FB98,
        secondaryColor: 0xE6E6FA
      },
      {
        ids: ['poison', 'shadow'],
        name: '腐蚀黑暗',
        description: '剧毒+暗影 = 腐蚀黑暗：剧毒加深，持续削弱敌人',
        particleCount: 1100,
        duration: 3000,
        primaryColor: 0x556B2F,
        secondaryColor: 0x4B0082
      },
      {
        ids: ['earth', 'fireball'],
        name: '熔岩喷发',
        description: '岩石+火球 = 熔岩喷发：地面喷射岩浆，范围灼烧',
        particleCount: 1300,
        duration: 3000,
        primaryColor: 0xFF4500,
        secondaryColor: 0x8B4513
      },
      {
        ids: ['wind', 'lightning'],
        name: '雷暴风暴',
        description: '疾风+雷电 = 雷暴风暴：大范围雷电风暴，群体伤害',
        particleCount: 1350,
        duration: 3000,
        primaryColor: 0xFFFF00,
        secondaryColor: 0xE0FFFF
      },
      {
        ids: ['arcane', 'shadow'],
        name: '虚空裂隙',
        description: '奥术+暗影 = 虚空裂隙：打开异次元通道，吸取生命',
        particleCount: 1150,
        duration: 3000,
        primaryColor: 0x4B0082,
        secondaryColor: 0x00CED1
      },
      {
        ids: ['fireball', 'frost', 'lightning'],
        name: '元素风暴',
        description: '火球+冰霜+雷电 = 元素风暴：三元素融合的毁灭之力',
        particleCount: 1450,
        duration: 3000,
        primaryColor: 0xFF4500,
        secondaryColor: 0x00BFFF
      },
      {
        ids: ['heal', 'shield', 'arcane'],
        name: '神圣庇护',
        description: '治疗+护盾+奥术 = 神圣庇护：完全免疫伤害的终极防御',
        particleCount: 1200,
        duration: 3000,
        primaryColor: 0xFFFFFF,
        secondaryColor: 0x00CED1
      }
    ];

    comboList.forEach(combo => {
      const key = this.getComboKey(combo.ids);
      this.combos.set(key, combo);
    });
  }

  private getComboKey(ids: string[]): string {
    return [...ids].sort().join('+');
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  getAllSkills(): SkillData[] {
    return Array.from(this.skills.values());
  }

  getSkill(id: string): SkillData | undefined {
    return this.skills.get(id);
  }

  getSelectedSkills(): string[] {
    return [...this.selectedSkills];
  }

  addSkillToSlot(skillId: string, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) return false;
    if (!this.skills.has(skillId)) return false;
    
    if (this.selectedSkills.includes(skillId)) {
      const existingIndex = this.selectedSkills.indexOf(skillId);
      if (existingIndex !== slotIndex) {
        return false;
      }
    }
    
    this.selectedSkills[slotIndex] = skillId;
    this.selectedSkills = this.selectedSkills.filter(Boolean);
    return true;
  }

  removeSkillFromSlot(slotIndex: number): void {
    if (slotIndex >= 0 && slotIndex < this.selectedSkills.length) {
      this.selectedSkills.splice(slotIndex, 1);
    }
  }

  clearAllSlots(): void {
    this.selectedSkills = [];
  }

  getCombo(): ComboEffect | null {
    if (this.selectedSkills.length === 0) return null;
    if (this.selectedSkills.length === 1) {
      const skill = this.skills.get(this.selectedSkills[0]);
      if (!skill) return null;
      return {
        ids: [skill.id],
        name: skill.name,
        description: skill.description,
        particleCount: skill.particleCount,
        duration: skill.duration,
        primaryColor: this.hexToNumber(skill.colorStart),
        secondaryColor: this.hexToNumber(skill.colorEnd)
      };
    }
    
    const key = this.getComboKey(this.selectedSkills);
    return this.combos.get(key) || null;
  }

  getParticleConfig(skillId: string): ParticleConfig {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return this.getDefaultParticleConfig();
    }

    const configs: Record<string, Partial<ParticleConfig>> = {
      fireball: {
        size: 0.15,
        speed: 2.5,
        lifetime: 1.5,
        emissionRate: 80,
        spread: 0.8,
        gravity: -0.3,
        glow: true,
        trail: true,
        shape: 'burst'
      },
      frost: {
        size: 0.1,
        speed: 1.5,
        lifetime: 2.0,
        emissionRate: 60,
        spread: 1.0,
        gravity: -0.1,
        glow: true,
        trail: false,
        shape: 'ring'
      },
      heal: {
        size: 0.12,
        speed: 1.0,
        lifetime: 2.5,
        emissionRate: 50,
        spread: 0.6,
        gravity: 0.2,
        glow: true,
        trail: false,
        shape: 'sphere'
      },
      shield: {
        size: 0.08,
        speed: 0.8,
        lifetime: 3.0,
        emissionRate: 40,
        spread: 1.5,
        gravity: 0,
        glow: true,
        trail: true,
        shape: 'ring'
      },
      lightning: {
        size: 0.1,
        speed: 4.0,
        lifetime: 0.8,
        emissionRate: 100,
        spread: 0.3,
        gravity: 0,
        glow: true,
        trail: true,
        shape: 'burst'
      },
      poison: {
        size: 0.13,
        speed: 0.6,
        lifetime: 3.0,
        emissionRate: 45,
        spread: 1.2,
        gravity: -0.05,
        glow: false,
        trail: false,
        shape: 'sphere'
      },
      shadow: {
        size: 0.11,
        speed: 1.8,
        lifetime: 1.8,
        emissionRate: 55,
        spread: 0.9,
        gravity: -0.1,
        glow: false,
        trail: true,
        shape: 'cone'
      },
      earth: {
        size: 0.2,
        speed: 3.0,
        lifetime: 1.2,
        emissionRate: 35,
        spread: 0.5,
        gravity: -2.0,
        glow: false,
        trail: true,
        shape: 'cone'
      },
      wind: {
        size: 0.06,
        speed: 3.5,
        lifetime: 1.0,
        emissionRate: 90,
        spread: 1.3,
        gravity: 0,
        glow: false,
        trail: true,
        shape: 'cone'
      },
      arcane: {
        size: 0.09,
        speed: 2.0,
        lifetime: 1.6,
        emissionRate: 65,
        spread: 0.7,
        gravity: 0,
        glow: true,
        trail: true,
        shape: 'burst'
      }
    };

    const baseConfig = configs[skillId] || {};
    
    return {
      skillId,
      color: this.hexToNumber(skill.colorStart),
      colorEnd: this.hexToNumber(skill.colorEnd),
      particleCount: skill.particleCount,
      size: baseConfig.size || 0.1,
      speed: baseConfig.speed || 1.5,
      lifetime: baseConfig.lifetime || 1.5,
      emissionRate: baseConfig.emissionRate || 50,
      spread: baseConfig.spread || 0.5,
      gravity: baseConfig.gravity || 0,
      glow: baseConfig.glow || false,
      trail: baseConfig.trail || false,
      shape: baseConfig.shape || 'sphere'
    };
  }

  private getDefaultParticleConfig(): ParticleConfig {
    return {
      skillId: 'default',
      color: 0xffffff,
      colorEnd: 0xcccccc,
      particleCount: 500,
      size: 0.1,
      speed: 1.5,
      lifetime: 1.5,
      emissionRate: 50,
      spread: 0.5,
      gravity: 0,
      glow: false,
      trail: false,
      shape: 'sphere'
    };
  }
}
