import type { Flower, Order } from '../types';
import { format } from 'date-fns';

export default function Dashboard({ flowers, orders }: { flowers: Flower[]; orders: Order[] }) {
  const totalVarieties = flowers.length;
  const totalStock = flowers.reduce((sum, f) => sum + f.stock, 0);

  const now = new Date();
  const thisMonthOrders = orders.filter((o) => {
    const d = new Date(o.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const flowerCounts = new Map<string, { name: string; count: number }>();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = flowerCounts.get(item.flowerId);
      if (existing) {
        existing.count += item.quantity;
      } else {
        flowerCounts.set(item.flowerId, { name: item.name, count: item.quantity });
      }
    });
  });

  const popular = Array.from(flowerCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCount = popular.length > 0 ? popular[0].count : 1;

  return (
    <div className="dashboard">
      <h1 className="page-title">📊 仪表盘</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">花材品种</div>
          <div className="stat-value">{totalVarieties}</div>
          <div className="stat-sub">种不同花卉</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总库存量</div>
          <div className="stat-value">{totalStock}</div>
          <div className="stat-sub">枝花材</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">本月订单</div>
          <div className="stat-value">{thisMonthOrders.length}</div>
          <div className="stat-sub">
            共 ¥{thisMonthOrders.reduce((s, o) => s + o.total, 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">🏆 最受欢迎花材 TOP 5</div>
        {popular.length === 0 ? (
          <p style={{ color: 'var(--text-light)', fontSize: 14, padding: '20px 0' }}>
            暂无订单数据
          </p>
        ) : (
          <div className="bar-chart">
            {popular.map((item) => (
              <div className="bar-row" key={item.name}>
                <div className="bar-label">{item.name}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="bar-value">{item.count}枝</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-title">📅 最近订单</div>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-light)', fontSize: 14, padding: '20px 0' }}>
            暂无订单
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {o.items.map((i) => i.name).join('、')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    {format(new Date(o.date), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`status-badge ${o.status}`}>{o.status}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    ¥{o.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
