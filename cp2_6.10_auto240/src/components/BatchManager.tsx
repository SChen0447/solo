import { useState, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import type { Batch, DrawRecord, Rarity } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  batches: Batch[];
  drawRecords: DrawRecord[];
  onCreateBatch: (params: {
    name: string;
    totalQuantity: number;
    prizes: Array<{
      name: string;
      rarity: Rarity;
      ratio: number;
      isPhysical: boolean;
    }>;
    startTime: number;
    maxDrawsPerUser: number;
  }) => void;
  onRedeemCode: (code: string) => DrawRecord | null;
  onUpdateRecord: (record: DrawRecord) => void;
}

interface PrizeForm {
  name: string;
  rarity: Rarity;
  ratio: number;
  isPhysical: boolean;
}

function maskInviteCode(code: string): string {
  return code.slice(0, 4) + '********';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function rarityLabel(r: Rarity): string {
  switch (r) {
    case 'hidden': return '隐藏款';
    case 'normal': return '普通款';
    case 'participation': return '谢谢参与';
  }
}

function rarityColor(r: Rarity): string {
  switch (r) {
    case 'hidden': return '#d4a373';
    case 'normal': return '#8b9a46';
    case 'participation': return '#a8a8a8';
  }
}

export default function BatchManager({
  batches,
  drawRecords,
  onCreateBatch,
  onRedeemCode,
  onUpdateRecord
}: Props) {
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'redeem'>('list');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [totalQuantity, setTotalQuantity] = useState(100);
  const [maxDraws, setMaxDraws] = useState(3);
  const [startTimeStr, setStartTimeStr] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toISOString().slice(0, 16);
  });
  const [prizeForms, setPrizeForms] = useState<PrizeForm[]>([
    { name: '隐藏款商品', rarity: 'hidden', ratio: 5, isPhysical: true },
    { name: '普通款商品', rarity: 'normal', ratio: 60, isPhysical: true },
    { name: '谢谢参与', rarity: 'participation', ratio: 35, isPhysical: false }
  ]);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string; record?: DrawRecord } | null>(null);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const filteredRecords = useMemo(
    () => (selectedBatch ? drawRecords.filter((r) => r.batchId === selectedBatch.id) : []),
    [drawRecords, selectedBatch]
  );

  const stats = useMemo(() => {
    const map = new Map<string, { name: string; rarity: Rarity; count: number; total: number; remaining: number }>();
    if (!selectedBatch) return [];
    selectedBatch.prizes.forEach((p) => {
      map.set(p.id, { name: p.name, rarity: p.rarity, count: 0, total: p.total, remaining: p.remaining });
    });
    filteredRecords.forEach((r) => {
      if (r.prizeId && map.has(r.prizeId)) {
        const item = map.get(r.prizeId)!;
        item.count++;
      }
    });
    return Array.from(map.values());
  }, [selectedBatch, filteredRecords]);

  const chartData = useMemo(() => {
    const hiddenData = stats.filter((s) => s.rarity === 'hidden').reduce((a, b) => a + b.count, 0);
    const normalData = stats.filter((s) => s.rarity === 'normal').reduce((a, b) => a + b.count, 0);
    const partData = stats.filter((s) => s.rarity === 'participation').reduce((a, b) => a + b.count, 0);
    return {
      labels: ['隐藏款', '普通款', '谢谢参与'],
      datasets: [{
        data: [hiddenData, normalData, partData],
        backgroundColor: ['#d4a373', '#8b9a46', '#c8c8c8'],
        borderWidth: 0
      }]
    };
  }, [stats]);

  const totalRatio = prizeForms.reduce((s, p) => s + p.ratio, 0);
  const totalRemaining = selectedBatch
    ? selectedBatch.prizes.reduce((s, p) => s + p.remaining, 0)
    : 0;
  const totalBatchQty = selectedBatch ? selectedBatch.totalQuantity : 0;
  const progressPct = totalBatchQty > 0 ? ((totalBatchQty - totalRemaining) / totalBatchQty) * 100 : 0;

  const handleAddPrize = () => {
    setPrizeForms([...prizeForms, { name: '新奖品', rarity: 'normal', ratio: 0, isPhysical: true }]);
  };

  const handleRemovePrize = (idx: number) => {
    setPrizeForms(prizeForms.filter((_, i) => i !== idx));
  };

  const handleUpdatePrize = (idx: number, field: keyof PrizeForm, value: string | number | boolean) => {
    const next = [...prizeForms];
    next[idx] = { ...next[idx], [field]: value };
    setPrizeForms(next);
  };

  const handleSubmitCreate = () => {
    if (!batchName.trim()) return alert('请输入批次名称');
    if (totalQuantity <= 0) return alert('总数量必须大于 0');
    if (Math.abs(totalRatio - 100) > 0.01) return alert(`奖品比例总和必须为 100%，当前 ${totalRatio}%`);
    if (prizeForms.some((p) => !p.name.trim())) return alert('请填写所有奖品名称');

    onCreateBatch({
      name: batchName.trim(),
      totalQuantity,
      prizes: prizeForms,
      startTime: new Date(startTimeStr).getTime(),
      maxDrawsPerUser: maxDraws
    });

    setBatchName('');
    setTotalQuantity(100);
    setMaxDraws(3);
    setPrizeForms([
      { name: '隐藏款商品', rarity: 'hidden', ratio: 5, isPhysical: true },
      { name: '普通款商品', rarity: 'normal', ratio: 60, isPhysical: true },
      { name: '谢谢参与', rarity: 'participation', ratio: 35, isPhysical: false }
    ]);
    setView('list');
  };

  const handleRedeem = () => {
    if (!redeemInput.trim()) return;
    const result = onRedeemCode(redeemInput.trim().toUpperCase());
    if (result) {
      setRedeemResult({ success: true, message: `核销成功：${result.prizeName}`, record: result });
    } else {
      setRedeemResult({ success: false, message: '兑奖码无效或已过期/已使用' });
    }
    setRedeemInput('');
  };

  const handleMarkRedeemed = (record: DrawRecord) => {
    if (!record.redeemed) {
      onUpdateRecord({
        ...record,
        redeemed: true,
        redeemedAt: Date.now()
      });
    }
  };

  const handleExportJSON = () => {
    if (!selectedBatch) return;
    const data = {
      batch: selectedBatch,
      records: filteredRecords
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${selectedBatch.inviteCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (view === 'create') {
    return (
      <div className="batch-manager">
        <div className="section-header">
          <button className="back-btn" onClick={() => setView('list')}>← 返回列表</button>
          <h2>创建新批次</h2>
        </div>
        <div className="form-card">
          <div className="form-row">
            <label>批次名称</label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="如：京都联名咖啡豆盲盒第3弹"
            />
          </div>
          <div className="form-row-grid">
            <div className="form-row">
              <label>总数量</label>
              <input
                type="number"
                min="1"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-row">
              <label>每人限抽次数</label>
              <input
                type="number"
                min="1"
                value={maxDraws}
                onChange={(e) => setMaxDraws(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="form-row">
              <label>开售时间</label>
              <input
                type="datetime-local"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="prize-header">
              <label>奖品配置（比例总和：{totalRatio}%）</label>
              <button className="add-btn" onClick={handleAddPrize}>+ 添加奖品</button>
            </div>
          </div>

          {prizeForms.map((p, idx) => (
            <div key={idx} className="prize-form-row">
              <input
                type="text"
                value={p.name}
                onChange={(e) => handleUpdatePrize(idx, 'name', e.target.value)}
                placeholder="奖品名称"
              />
              <select
                value={p.rarity}
                onChange={(e) => handleUpdatePrize(idx, 'rarity', e.target.value as Rarity)}
              >
                <option value="hidden">隐藏款</option>
                <option value="normal">普通款</option>
                <option value="participation">谢谢参与</option>
              </select>
              <input
                type="number"
                min="0"
                max="100"
                value={p.ratio}
                onChange={(e) => handleUpdatePrize(idx, 'ratio', parseInt(e.target.value) || 0)}
                placeholder="比例%"
                style={{ width: '80px' }}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={p.isPhysical}
                  onChange={(e) => handleUpdatePrize(idx, 'isPhysical', e.target.checked)}
                />
                实物
              </label>
              <button className="remove-btn" onClick={() => handleRemovePrize(idx)}>删除</button>
            </div>
          ))}

          <button className="submit-btn" onClick={handleSubmitCreate}>创建批次并生成邀请码</button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedBatch) {
    return (
      <div className="batch-manager">
        <div className="section-header">
          <button className="back-btn" onClick={() => setView('list')}>← 返回列表</button>
          <h2>{selectedBatch.name}</h2>
        </div>

        <div className="detail-info">
          <div className="info-grid">
            <div>
              <span className="info-label">邀请码：</span>
              <span className="info-code">{selectedBatch.inviteCode}</span>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(selectedBatch.inviteCode)}
              >
                复制
              </button>
            </div>
            <div>
              <span className="info-label">参与人数：</span>
              <span>{selectedBatch.participantCount}</span>
            </div>
            <div>
              <span className="info-label">开售时间：</span>
              <span>{formatDate(selectedBatch.startTime)}</span>
            </div>
            <div>
              <span className="info-label">每人限抽：</span>
              <span>{selectedBatch.maxDrawsPerUser} 次</span>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-label">
              <span>剩余 {totalRemaining} / {totalBatchQty}</span>
              <span>{progressPct.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h3>已开出奖品分布</h3>
          <div className="stats-row">
            <div className="chart-wrap">
              <Doughnut data={chartData} options={{ maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
            <div className="stats-list">
              {stats.map((s, idx) => (
                <div key={idx} className="stat-item">
                  <div className="stat-dot" style={{ background: rarityColor(s.rarity) }} />
                  <div className="stat-info">
                    <div className="stat-name">
                      {s.name}
                      <span className={`rarity-tag rarity-${s.rarity}`}>{rarityLabel(s.rarity)}</span>
                    </div>
                    <div className="stat-count">
                      已开出 {s.count} / 总库存 {s.total}（剩余 {s.remaining}）
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="export-btn" onClick={handleExportJSON}>导出数据为 JSON</button>
        </div>

        <div className="records-section">
          <h3>抽签记录（{filteredRecords.length}）</h3>
          <div className="records-table">
            <div className="record-row record-head">
              <div>时间</div>
              <div>奖品</div>
              <div>稀有度</div>
              <div>兑奖码</div>
              <div>状态</div>
              <div>操作</div>
            </div>
            {filteredRecords.length === 0 ? (
              <div className="empty-state">暂无抽签记录</div>
            ) : (
              filteredRecords.map((r) => (
                <div key={r.id} className={`record-row ${r.redeemed ? 'redeemed' : ''}`}>
                  <div>{formatDate(r.createdAt)}</div>
                  <div>{r.prizeName}</div>
                  <div><span className={`rarity-tag rarity-${r.rarity}`}>{rarityLabel(r.rarity)}</span></div>
                  <div>{r.redeemCode || '-'}</div>
                  <div>
                    {r.redeemed
                      ? `已兑换 · ${formatDate(r.redeemedAt!)}`
                      : r.isWin
                        ? '待兑换'
                        : '-'}
                  </div>
                  <div>
                    {r.isWin && !r.redeemed && (
                      <button
                        className="mark-redeem-btn"
                        onClick={() => handleMarkRedeemed(r)}
                      >
                        标记已兑换
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'redeem') {
    return (
      <div className="batch-manager">
        <div className="section-header">
          <button className="back-btn" onClick={() => { setView('list'); setRedeemResult(null); }}>← 返回列表</button>
          <h2>兑奖码核销</h2>
        </div>
        <div className="form-card redeem-card">
          <div className="form-row">
            <label>输入 8 位兑奖码</label>
            <input
              type="text"
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="如：A3K9X2P7"
              maxLength={8}
              style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '20px', textAlign: 'center' }}
            />
          </div>
          <button className="submit-btn" onClick={handleRedeem}>立即核销</button>
          {redeemResult && (
            <div className={`redeem-result ${redeemResult.success ? 'success' : 'fail'}`}>
              {redeemResult.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="batch-manager">
      <div className="section-header">
        <h2>批次管理</h2>
        <div className="header-actions">
          <button className="action-btn" onClick={() => setView('redeem')}>🎟 兑奖核销</button>
          <button className="action-btn primary" onClick={() => setView('create')}>+ 创建新批次</button>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="empty-state">
          <p>暂无批次，点击"创建新批次"开始吧</p>
        </div>
      ) : (
        <div className="batch-grid">
          {batches.map((b) => {
            const remaining = b.prizes.reduce((s, p) => s + p.remaining, 0);
            const pct = b.totalQuantity > 0 ? ((b.totalQuantity - remaining) / b.totalQuantity) * 100 : 0;
            return (
              <div key={b.id} className="batch-card" onClick={() => { setSelectedBatchId(b.id); setView('detail'); }}>
                <h3 className="batch-card-name">{b.name}</h3>
                <div className="batch-card-code">
                  邀请码：{maskInviteCode(b.inviteCode)}
                  <button
                    className="copy-btn"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(b.inviteCode); }}
                  >
                    复制
                  </button>
                </div>
                <div className="batch-card-meta">
                  <span>👥 {b.participantCount} 人参与</span>
                  <span>🎁 剩余 {remaining}/{b.totalQuantity}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="batch-card-time">开售：{formatDate(b.startTime)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
