import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AlertTriangle, Clock, ChefHat, CheckCircle, ShoppingCart, TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { getProductionPlans, updateProductionPlan, reorderProductionPlans, getInventoryAlerts, getWeeklyStats } from '../api/bakeryApi.js';
import { format } from 'date-fns';

const STATUS_LABELS = {
  pending: { text: '待准备', className: 'status-pending', icon: Clock },
  'in-progress': { text: '进行中', className: 'status-progress', icon: ChefHat },
  completed: { text: '已完成', className: 'status-completed', icon: CheckCircle },
};

const Dashboard = ({ recipes, onSelectRecipe, selectedRecipeId }) => {
  const [plans, setPlans] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState({ alerts: [], suggestions: [] });
  const [weeklyStats, setWeeklyStats] = useState({ daily: [], totalRevenue: 0, totalCost: 0 });
  const [animatingCard, setAnimatingCard] = useState(null);

  const recipeMap = recipes.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [plansRes, alertsRes, statsRes] = await Promise.all([
      getProductionPlans(today),
      getInventoryAlerts(),
      getWeeklyStats(),
    ]);
    setPlans(plansRes.data);
    setInventoryAlerts(alertsRes.data);
    setWeeklyStats(statsRes.data);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(plans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setPlans(updatedItems);

    const orders = updatedItems.map((p) => ({ id: p.id, order: p.order }));
    await reorderProductionPlans(orders);
  };

  const handleStatusChange = async (planId, currentStatus) => {
    const statusOrder = ['pending', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    setAnimatingCard(planId);
    setTimeout(() => setAnimatingCard(null), 500);

    const { data } = await updateProductionPlan(planId, { prepStatus: nextStatus });
    setPlans(plans.map((p) => (p.id === planId ? data.plan : p)));
  };

  const handleProgressChange = async (planId, delta) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const newProgress = Math.max(0, Math.min(100, plan.progress + delta));
    const { data } = await updateProductionPlan(planId, { progress: newProgress });
    setPlans(plans.map((p) => (p.id === planId ? data.plan : p)));
  };

  const maxSales = Math.max(
    ...weeklyStats.daily.flatMap((d) => d.sales.map((s) => s.quantity + s.returns)),
    1
  );

  return (
    <div className="dashboard">
      {inventoryAlerts.alerts.length > 0 && (
        <div className="inventory-alert">
          <div className="alert-header">
            <AlertTriangle size={20} />
            <span>库存预警：{inventoryAlerts.alerts.length} 种原料不足</span>
          </div>
          <div className="alert-content">
            <div className="alert-items">
              {inventoryAlerts.alerts.map((a) => (
                <span key={a.ingredient.id} className="alert-item">
                  {a.ingredient.name} 缺 {a.shortage.toFixed(2)} {a.ingredient.unit}
                </span>
              ))}
            </div>
            {inventoryAlerts.suggestions.length > 0 && (
              <div className="suggestions">
                <strong>建议补料：</strong>
                {inventoryAlerts.suggestions.map((s) => (
                  <span key={s.ingredient.id} className="suggestion-item">
                    {s.ingredient.name} +{s.recommendedOrder.toFixed(2)} {s.ingredient.unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h2 className="section-title">
          <Calendar size={20} />
          今日生产计划
        </h2>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="plans">
            {(provided) => (
              <div className="plans-grid" {...provided.droppableProps} ref={provided.innerRef}>
                {plans.map((plan, index) => {
                  const recipe = recipeMap[plan.recipeId];
                  const statusConfig = STATUS_LABELS[plan.prepStatus];
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selectedRecipeId === plan.recipeId;
                  const isAnimating = animatingCard === plan.id;

                  return (
                    <Draggable key={plan.id} draggableId={plan.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`plan-card ${isSelected ? 'selected' : ''} ${
                            snapshot.isDragging ? 'dragging' : ''
                          } ${isAnimating ? 'bounce' : ''}`}
                          onClick={() => onSelectRecipe(recipe)}
                        >
                          <div className="plan-card-header">
                            <h3 className="plan-name">{recipe?.name}</h3>
                            <span className={`status-badge ${statusConfig.className}`}>
                              <StatusIcon size={14} />
                              {statusConfig.text}
                            </span>
                          </div>
                          <div className="plan-meta">
                            <span className="plan-time">
                              <Clock size={14} />
                              {plan.startTime}
                            </span>
                            <span className="plan-quantity">
                              <ChefHat size={14} />
                              {plan.plannedQuantity} 个
                            </span>
                          </div>
                          <div className="progress-section">
                            <div className="progress-label">
                              <span>完成进度</span>
                              <span className="progress-value">{plan.progress}%</span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${plan.progress}%` }}
                              />
                            </div>
                            <div className="progress-controls">
                              <button
                                className="progress-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProgressChange(plan.id, -10);
                                }}
                              >
                                -10%
                              </button>
                              <button
                                className="status-toggle-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(plan.id, plan.prepStatus);
                                }}
                              >
                                切换状态
                              </button>
                              <button
                                className="progress-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProgressChange(plan.id, 10);
                                }}
                              >
                                +10%
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="dashboard-section stats-section">
        <h2 className="section-title">
          <BarChart3 size={20} />
          过去7天销售统计
        </h2>
        <div className="stats-container">
          <div className="chart-container">
            <div className="chart-bars">
              {weeklyStats.daily.map((day) => (
                <div key={day.date} className="chart-day">
                  <div className="bar-group">
                    {day.sales.map((sale) => (
                      <div key={sale.recipeId} className="bar-pair">
                        <div
                          className="bar bar-sales"
                          style={{ height: `${(sale.quantity / maxSales) * 100}%` }}
                          title={`${sale.recipeName}: 售出 ${sale.quantity}`}
                        />
                        <div
                          className="bar bar-returns"
                          style={{ height: `${(sale.returns / maxSales) * 100}%` }}
                          title={`${sale.recipeName}: 退货 ${sale.returns}`}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="day-label">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color legend-sales" /> 售出
              </span>
              <span className="legend-item">
                <span className="legend-color legend-returns" /> 退货
              </span>
            </div>
          </div>
          <div className="stats-summary">
            <div className="stat-card">
              <TrendingUp size={24} className="stat-icon revenue" />
              <div className="stat-content">
                <span className="stat-label">总收入</span>
                <span className="stat-value revenue">¥{weeklyStats.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="stat-card">
              <ShoppingCart size={24} className="stat-icon cost" />
              <div className="stat-content">
                <span className="stat-label">总成本</span>
                <span className="stat-value cost">¥{weeklyStats.totalCost.toLocaleString()}</span>
              </div>
            </div>
            <div className="stat-card">
              <BarChart3 size={24} className="stat-icon profit" />
              <div className="stat-content">
                <span className="stat-label">总利润</span>
                <span className="stat-value profit">
                  ¥{(weeklyStats.totalRevenue - weeklyStats.totalCost).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
