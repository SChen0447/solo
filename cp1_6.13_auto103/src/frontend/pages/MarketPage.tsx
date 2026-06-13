import React, { useEffect, useMemo, useState } from 'react';
import StickerBadge from '../components/StickerBadge';
import { useApp } from '../App';
import { CURRENT_USER_ID, executeTrade, fetchMarket } from '../api';
import type { Sticker, TradePackage } from '../types';
import '../styles/market.scss';

function MarketPage(): JSX.Element {
  const { user, refreshUser, updateScore, addStickers, showConfetti, triggerScoreDelta } = useApp();
  void triggerScoreDelta;
  const [packages, setPackages] = useState<TradePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<{ target: TradePackage | null } | null>(null);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    stickers: Sticker[];
    fromName: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchMarket();
        if (mounted) setPackages(data.filter((p) => p.userId !== CURRENT_USER_ID));
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const myEligibleStickers = useMemo(() => {
    const used = new Set<string>();
    user?.tradePackages
      .filter((p) => p.status === 'open')
      .forEach((p) => p.stickers.forEach((s) => used.add(s.id));
    return (user?.unlockedStickers.filter((s) => !used.has(s.id)) ?? [];
  }, [user]);

  const [myStickerChoice, setMyStickerChoice] = useState<string | null>(null);
  const handleFlip = (id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  };

  const handleSelect = (pkg: TradePackage) => {
    setSelectedTarget({ target: pkg });
    setShowTradeDialog(true);
    setMyStickerChoice(null);
  };

  const handleExecute = async () => {
    if (!selectedTarget?.target || !myStickerChoice) return;
    setSubmitting(true);
    try {
      const result = await executeTrade(
        CURRENT_USER_ID,
        selectedTarget.target.id,
        myStickerChoice
      );
      if (result.success) {
        updateScore(result.newScore);
        triggerScoreDelta(-5);
        if (result.receivedStickers.length > 0) {
          addStickers(result.receivedStickers);
        }
        showConfetti();
        setSuccessDialog({
          open: true,
          stickers: result.receivedStickers,
          fromName: result.fromUser.name,
        });
        setPackages((prev) => prev.filter((p) => p.id !== selectedTarget!.target.id));
        await refreshUser();
      }
    } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } } | undefined;
        showToast(msg?.response?.data?.error ?? '交换失败');
    } finally {
      setSubmitting(false);
      setShowTradeDialog(false);
      setSelectedTarget(null);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="market-page">
      <header className="page-header fade-in-up">
        <div className="page-header__text">
          <p className="breadcrumb">
            首页 / <span>交换市场</span>
          </p>
          <h2 className="page-title">
            <span className="title-icon">📦</span>
            交换市场
          </h2>
          <p className="page-subtitle">
            共 <strong>{packages.length}</strong> 个交换包 · 交换消耗 5 积分 ·
            选中对方包且对方选中你的包即完成交换
          </p>
        </div>
      </header>

      {loading ? (
        <div className="market-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-pkg fade-in-up"
              style={{ animationDelay: `${0.05 * i}s` }}
            />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="empty-state fade-in-up">
          <div className="empty-state__icon">📭</div>
          <h3>市场暂无交换包</h3>
          <p>成为第一个发布交换包的人吧</p>
        </div>
      ) : (
        <div className="market-grid">
          {packages.map((pkg, i) => (
            <div
              key={pkg.id} className="market-card fade-in-up"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="card-scene">
                <div
                  className={`card-inner ${flippedId === pkg.id ? 'is-flipped' : ''}`}
                  onClick={() => handleFlip(pkg.id)}
                >
                    <div className="card-face card-face--front">
                      <div className="card-face__sticker-wrap">
                        {pkg.stickers.slice(0, 1).map((s) => (
                          <StickerBadge key={s.id} sticker={s} size="md" />
                        ))}
                      </div>
                      <div className="card-face__count">
                        <span className="count-num">{pkg.stickers.length}</span>
                        <span className="count-label">张</span>
                      </div>
                      <div className="card-face__user">
                        <span className="user-avatar">{pkg.userAvatar}</span>
                        <span className="user-name">{pkg.userName}</span>
                      </div>
                    </div>

                    <div className="card-face card-face--back">
                      <div className="back-vinyl">
                        <div className="back-vinyl__grooves" />
                        <div className="back-vinyl__label">
                          <div className="vinyl-label__title">Side B</div>
                          <div className="vinyl-label__text">{pkg.stickers.length} Stickers</div>
                          <div className="vinyl-label__hole" />
                        </div>
                      </div>
                      <div className="back-stickers">
                        {pkg.stickers.map((s) => (
                        <StickerBadge key={s.id} sticker={s} size="sm" />
                    ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="market-card__action"
                  onClick={() => handleSelect(pkg)}
                  disabled={user?.score !== undefined && user.score < 5}
                >
                  {flippedId === pkg.id ? '再次查看' : '查看详情'}
                </button>
                {user?.score !== undefined && user.score < 5 && (
                  <div className="market-card__hint">积分不足</div>
                )}
              </div>
        </div>
          ))}
        </div>
      )}

      {showTradeDialog && selectedTarget?.target && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowTradeDialog(false);
          }}
        >
          <div className="trade-dialog">
            <h3>发起交换请求</h3>
            <div className="trade-dialog__preview">
              <div className="trade-side">
                <div className="trade-side__label">对方包</div>
                <div className="trade-side__user">
                  <span className="trade-avatar">{selectedTarget.target.userAvatar}</span>
                  <span>{selectedTarget.target.userName}</span>
                </div>
                <div className="trade-side__stickers">
                  {selectedTarget.target.stickers.map((s) => (
                    <StickerBadge key={s.id} sticker={s} size="sm" />
                  ))}
                </div>
              </div>

              <div className="trade-dialog__arrow">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 5l-5 7 5 7" />
                  <path d="M3 12h16" />
                  <path d="M16 5l5 7-5 7" />
                </svg>
                <div className="trade-dialog__cost">-5积分</div>
              </div>

              <div className="trade-side">
                <div className="trade-side__label">选择您的标签</div>
                {myEligibleStickers.length === 0 ? (
                  <div className="trade-side__empty">
                  <span>您还没有可交换的标签</span>
                </div>
              </div>
                ) : (
                  <div className="trade-side__list">
                    {myEligibleStickers.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={`trade-sticker-choice ${myStickerChoice === s.id ? 'is-selected' : ''}`}
                        onClick={() => setMyStickerChoice((prev) => (prev === s.id ? null : s.id)}
                      >
                        <StickerBadge sticker={s} size="md" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="trade-dialog__footer">
              <button type="button" className="btn-ghost" onClick={() => setShowTradeDialog(false)} disabled={submitting}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExecute}
                disabled={!myStickerChoice || submitting}
              >
                {submitting ? '交换中…' : '确认交换 (-5分)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successDialog?.open && (
        <div className="modal-backdrop" onClick={() => setSuccessDialog(null)}>
          <div className="success-dialog">
            <div className="success-dialog__icon">🎊</div>
            <h3>交换成功！</h3>
            <p className="success-dialog__sub">获得来自 <strong>{successDialog.fromName}</strong> 的标签：</p>
            <div className="success-dialog__stickers">
              {successDialog.stickers.map((s) => (
                <StickerBadge key={s.id} sticker={s} size="md" />
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={() => setSuccessDialog(null)}>
              太棒了
            </button>
          </div>
        </div>
      )}

      {toast && <div className="app-toast">{toast}</div>}
    </div>
  );
}

export default MarketPage;
