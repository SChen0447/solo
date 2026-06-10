import React, { useState, useRef, useCallback } from 'react';
import { drawArtQR, downloadTicket } from './qrGenerator';
import {
  verifyTicket,
  computeHashFromTicketId,
  extractHashFromImage,
  type VerifyResponse
} from './verification';

type TabType = 'generate' | 'verify';

interface UserInfo {
  name: string;
  session: string;
  seat: string;
}

interface TicketData {
  ticketId: string;
  hash: string;
  userInfo: UserInfo;
}

function CheckIcon(): React.ReactElement {
  return (
    <svg
      className="modal-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon(): React.ReactElement {
  return (
    <svg
      className="modal-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function DownloadIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UploadIcon(): React.ReactElement {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', session: '', seat: '' });
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [verifyTicketId, setVerifyTicketId] = useState('');
  const [verifyImage, setVerifyImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modalData, setModalData] = useState<VerifyResponse | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async (): Promise<void> => {
    if (!userInfo.name || !userInfo.session || !userInfo.seat) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-ticket');
      const data = await response.json();

      if (data.success) {
        const ticketData: TicketData = {
          ticketId: data.ticketId,
          hash: data.hash,
          userInfo: { ...userInfo }
        };
        setTicket(ticketData);

        setTimeout(() => {
          if (canvasRef.current) {
            drawArtQR(canvasRef.current, data.ticketId, userInfo);
          }
        }, 0);
      }
    } catch (error) {
      console.error('Failed to generate ticket:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [userInfo]);

  const handleDownload = useCallback((): void => {
    if (canvasRef.current && ticket) {
      downloadTicket(canvasRef.current, ticket.ticketId);
    }
  }, [ticket]);

  const handleImageUpload = useCallback(async (file: File): Promise<void> => {
    const reader = new FileReader();
    reader.onload = (e): void => {
      setVerifyImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const result = await extractHashFromImage(file);
    if (result) {
      console.log('Extracted hash:', result.hash);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((): void => {
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>): void => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file);
          break;
        }
      }
    }
  }, [handleImageUpload]);

  const handleVerify = useCallback(async (): Promise<void> => {
    if (!verifyTicketId.trim()) {
      return;
    }

    setIsVerifying(true);
    try {
      const hash = computeHashFromTicketId(verifyTicketId.trim().toUpperCase());
      const result = await verifyTicket(verifyTicketId.trim().toUpperCase(), hash);
      setModalData(result);
    } catch (error) {
      setModalData({
        success: false,
        message: '验证失败，请重试'
      });
    } finally {
      setIsVerifying(false);
    }
  }, [verifyTicketId]);

  const closeModal = useCallback((): void => {
    setModalData(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">艺术门票系统</h1>
        <p className="app-subtitle">Artistic QR Ticket Generator & Verifier</p>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          生成门票
        </button>
        <button
          className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          核销验证
        </button>
      </nav>

      <div className="page-container">
        {activeTab === 'generate' && (
          <div className="generate-page">
            <div className="input-panel">
              <h2>参观者信息</h2>
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入参观者姓名"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">展览场次</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="如：2024春季展 · A场"
                  value={userInfo.session}
                  onChange={(e) => setUserInfo({ ...userInfo, session: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">座位号</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="如：A-12"
                  value={userInfo.seat}
                  onChange={(e) => setUserInfo({ ...userInfo, seat: e.target.value })}
                />
              </div>
              <button
                className="primary-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !userInfo.name || !userInfo.session || !userInfo.seat}
              >
                {isGenerating ? (
                  <>
                    <span className="loading-spinner"></span>
                    生成中...
                  </>
                ) : (
                  '生成艺术门票'
                )}
              </button>
            </div>

            <div className="preview-panel">
              <h2>门票预览</h2>
              {ticket ? (
                <>
                  <div className="qr-card">
                    <canvas
                      ref={canvasRef}
                      className="qr-canvas"
                      width={200}
                      height={200}
                    />
                  </div>
                  <div className="ticket-id">{ticket.ticketId}</div>
                  <div className="ticket-info">
                    <div>姓名：{ticket.userInfo.name}</div>
                    <div>场次：{ticket.userInfo.session}</div>
                    <div>座位：{ticket.userInfo.seat}</div>
                  </div>
                  <button className="download-btn" onClick={handleDownload}>
                    <DownloadIcon />
                    下载门票
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <UploadIcon />
                  <p>填写左侧信息后点击生成按钮</p>
                  <p className="drop-hint">系统将为您生成独特的艺术化二维码门票</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="verify-panel">
            <h2>门票核销验证</h2>
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onPaste={handlePaste}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              {verifyImage ? (
                <img src={verifyImage} alt="二维码预览" className="preview-image" />
              ) : (
                <>
                  <UploadIcon />
                  <p>拖放二维码图片到此处，或点击选择文件</p>
                  <p className="drop-hint">也可直接粘贴图片 (Ctrl+V)</p>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">或手动输入门票ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="TKT-XXXX-XXXX"
                value={verifyTicketId}
                onChange={(e) => setVerifyTicketId(e.target.value.toUpperCase())}
              />
            </div>

            <button
              className="primary-btn"
              onClick={handleVerify}
              disabled={isVerifying || !verifyTicketId.trim()}
            >
              {isVerifying ? (
                <>
                  <span className="loading-spinner"></span>
                  验证中...
                </>
              ) : (
                '验证门票'
              )}
            </button>
          </div>
        )}
      </div>

      {modalData && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-content ${modalData.success && modalData.verified ? 'success' : 'error'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {modalData.success && modalData.verified ? <CheckIcon /> : <CrossIcon />}
            <h3 className="modal-title">
              {modalData.success && modalData.verified ? '验证成功' : '验证失败'}
            </h3>
            <p className="modal-message">{modalData.message}</p>
            <button className="modal-btn" onClick={closeModal}>
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
