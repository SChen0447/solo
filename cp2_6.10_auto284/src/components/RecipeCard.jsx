import { useState } from 'react';
import { ChefHat, Clock, Package, ChevronDown, ChevronUp, DollarSign, TrendingUp } from 'lucide-react';

const RecipeCard = ({ recipe }) => {
  const [expanded, setExpanded] = useState(false);

  if (!recipe) {
    return (
      <div className="recipe-card empty">
        <p className="empty-text">请选择一个配方查看详情</p>
      </div>
    );
  }

  const grossMargin = recipe.sellingPrice - (recipe.unitCost || 0);
  const grossMarginPercent = recipe.sellingPrice > 0
    ? ((grossMargin / recipe.sellingPrice) * 100).toFixed(1)
    : 0;

  return (
    <div className={`recipe-card ${expanded ? 'expanded' : ''}`}>
      <div className="recipe-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="recipe-header-main">
          <h2 className="recipe-name">{recipe.name}</h2>
          <span className="profit-badge">
            <TrendingUp size={14} />
            预估毛利 ¥{grossMargin.toFixed(2)} ({grossMarginPercent}%)
          </span>
        </div>
        <p className="recipe-description">{recipe.description}</p>
        <div className="recipe-meta">
          <span className="meta-item">
            <Package size={16} />
            预估产量：{recipe.estimatedYield} 个/批次
          </span>
          <span className="meta-item">
            <Clock size={16} />
            制作时间：{recipe.productionTime} 分钟
          </span>
          <span className="meta-item">
            <DollarSign size={16} />
            售价：¥{recipe.sellingPrice}/个
          </span>
        </div>
        <div className="expand-toggle">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span>{expanded ? '收起详情' : '展开详情'}</span>
        </div>
      </div>

      <div className="recipe-details">
        <div className="cost-summary">
          <div className="cost-item">
            <span className="cost-label">批次总成本</span>
            <span className="cost-value">¥{(recipe.totalCost || 0).toFixed(2)}</span>
          </div>
          <div className="cost-item">
            <span className="cost-label">单件成本</span>
            <span className="cost-value">¥{(recipe.unitCost || 0).toFixed(2)}</span>
          </div>
          <div className="cost-item highlight">
            <span className="cost-label">单件毛利</span>
            <span className="cost-value profit">¥{grossMargin.toFixed(2)}</span>
          </div>
        </div>

        <h3 className="details-title">
          <ChefHat size={18} />
          配料清单
        </h3>
        <table className="ingredients-table">
          <thead>
            <tr>
              <th>原料名称</th>
              <th>用量</th>
              <th>单位</th>
              <th>单价</th>
              <th>成本</th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredientDetails?.map((ing) => (
              <tr key={ing.id}>
                <td className="ing-name">{ing.name}</td>
                <td className="ing-amount">{ing.amount}</td>
                <td className="ing-unit">{ing.unit}</td>
                <td className="ing-price">¥{ing.costPerUnit.toFixed(2)}/{ing.unit}</td>
                <td className="ing-cost">¥{ing.ingredientCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipeCard;
