import './PreviewPage.css';

interface PreviewPageProps {
  isModified: boolean;
}

export function PreviewPage({ isModified }: PreviewPageProps) {
  return (
    <main className="preview-page">
      {isModified && <div className="modified-badge">✎ 已修改</div>}
      <div className="preview-container">
        <nav className="preview-nav">
          <div className="nav-logo">BrandLogo</div>
          <div className="nav-links">
            <button className="nav-link active">首页</button>
            <button className="nav-link">产品</button>
            <button className="nav-link">解决方案</button>
            <button className="nav-link">关于我们</button>
          </div>
          <div className="nav-actions">
            <button className="btn btn-secondary">登录</button>
            <button className="btn btn-primary">注册</button>
          </div>
        </nav>

        <section className="preview-section">
          <h2 className="section-title">数据卡片</h2>
          <div className="cards-grid">
            <div className="preview-card">
              <div className="card-icon">👥</div>
              <h3 className="card-title">总用户数</h3>
              <p className="card-desc">平台累计注册用户</p>
              <div className="card-value">128,456</div>
            </div>
            <div className="preview-card">
              <div className="card-icon">📈</div>
              <h3 className="card-title">本月营收</h3>
              <p className="card-desc">较上月增长 12.5%</p>
              <div className="card-value">¥89,234</div>
            </div>
            <div className="preview-card">
              <div className="card-icon">🎯</div>
              <h3 className="card-title">转化率</h3>
              <p className="card-desc">访客到用户转化</p>
              <div className="card-value">3.8%</div>
            </div>
            <div className="preview-card">
              <div className="card-icon">⭐</div>
              <h3 className="card-title">满意度</h3>
              <p className="card-desc">用户平均评分</p>
              <div className="card-value">4.8/5</div>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="section-title">按钮样式</h2>
          <div className="buttons-row">
            <button className="btn btn-primary">主要按钮</button>
            <button className="btn btn-secondary">次要按钮</button>
            <button className="btn btn-success">成功按钮</button>
            <button className="btn btn-warning">警告按钮</button>
            <button className="btn btn-danger">危险按钮</button>
            <button className="btn btn-outline">边框按钮</button>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="section-title">表单元素</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input type="text" className="form-input" placeholder="请输入用户名" defaultValue="demo_user" />
            </div>
            <div className="form-group">
              <label className="form-label">邮箱地址</label>
              <input type="email" className="form-input" placeholder="请输入邮箱" defaultValue="demo@example.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">搜索</label>
              <input type="text" className="form-input" placeholder="搜索内容..." />
            </div>
            <div className="form-group">
              <label className="form-label">备注</label>
              <input type="text" className="form-input" placeholder="请输入备注信息" />
            </div>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="section-title">进度条</h2>
          <div className="progress-item">
            <div className="progress-label-row">
              <span className="progress-label">项目开发进度</span>
              <span className="progress-value">75%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill primary" style={{ width: '75%' }} />
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-label-row">
              <span className="progress-label">任务完成率</span>
              <span className="progress-value">92%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill success" style={{ width: '92%' }} />
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-label-row">
              <span className="progress-label">存储空间</span>
              <span className="progress-value">45%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill warning" style={{ width: '45%' }} />
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-label-row">
              <span className="progress-label">风险预警</span>
              <span className="progress-value">18%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill danger" style={{ width: '18%' }} />
            </div>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="section-title">数据表格</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>负责人</th>
                <th>状态</th>
                <th>进度</th>
                <th>截止日期</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>官网重构项目</td>
                <td>张三</td>
                <td><span className="status-badge success">进行中</span></td>
                <td>75%</td>
                <td>2024-12-31</td>
              </tr>
              <tr>
                <td>移动端 App v2.0</td>
                <td>李四</td>
                <td><span className="status-badge warning">待审核</span></td>
                <td>60%</td>
                <td>2024-11-15</td>
              </tr>
              <tr>
                <td>用户增长计划</td>
                <td>王五</td>
                <td><span className="status-badge success">已完成</span></td>
                <td>100%</td>
                <td>2024-10-01</td>
              </tr>
              <tr>
                <td>系统性能优化</td>
                <td>赵六</td>
                <td><span className="status-badge danger">已延期</span></td>
                <td>35%</td>
                <td>2024-09-30</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
