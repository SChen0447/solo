export interface Rule {
  id: string;
  keywords: string[];
  reply: string;
  priority: number;
  transferHuman?: boolean;
}

export interface MatchResult {
  ruleId: string | null;
  reply: string;
  transferHuman: boolean;
  matched: boolean;
}

export const rules: Rule[] = [
  {
    id: 'R001',
    keywords: ['退货', '退换', '退款', '退钱', '退回'],
    reply: '您好！我们支持7天无理由退换货。商品需保持原包装、未使用且不影响二次销售。退款将在收到退货后的3-5个工作日内原路退回。如有疑问可继续咨询。',
    priority: 1
  },
  {
    id: 'R002',
    keywords: ['物流', '快递', '发货', '多久到', '几天到', '配送', '送货'],
    reply: '您好！我们默认使用顺丰快递，下单后24小时内发货，一般3-5个工作日送达。您可以在"我的订单"中查看物流详情。偏远地区可能延迟1-2天。',
    priority: 2
  },
  {
    id: 'R003',
    keywords: ['价格', '多少钱', '优惠', '便宜', '打折', '优惠活动', '促销'],
    reply: '您好！我们的商品价格以页面显示为准，如有优惠活动会在首页和商品详情页标注。新用户首单可享9折优惠，满299元包邮。',
    priority: 3
  },
  {
    id: 'R004',
    keywords: ['尺码', '大小', '尺寸', '码数', '合身'],
    reply: '您好！商品页面有详细的尺码表，请参考尺码表选择合适的尺码。如有疑问，建议您提供身高体重，我来帮您推荐。',
    priority: 4
  },
  {
    id: 'R005',
    keywords: ['质量', '保修', '售后', '坏了', '故障', '维修'],
    reply: '您好！我们所有商品均为正品，享受全国联保服务。保修期内非人为损坏可免费维修，保修期外提供有偿维修服务。',
    priority: 5
  },
  {
    id: 'R006',
    keywords: ['人工', '客服', '转人工', '找客服'],
    reply: '正在为您转接人工客服，请稍候...',
    priority: 6,
    transferHuman: true
  }
];

const DEFAULT_REPLY = '请稍等，将为您转接人工客服';

export function matchRule(message: string): MatchResult {
  const lowerMessage = message.toLowerCase();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          ruleId: rule.id,
          reply: rule.reply,
          transferHuman: rule.transferHuman || false,
          matched: true
        };
      }
    }
  }

  return {
    ruleId: null,
    reply: DEFAULT_REPLY,
    transferHuman: true,
    matched: false
  };
}
