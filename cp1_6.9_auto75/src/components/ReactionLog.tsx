import React, { useState } from 'react';

export type LogType = 'add-reagent' | 'reaction-start' | 'reaction-complete' | 'reaction-fail';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  equipmentType?: string;
  reagentName?: string;
  reactionEquation?: string;
  reactionDescription?: string;
  success: boolean;
}

interface ReactionLogProps {
  logs: LogEntry[];
}

const ReactionLog: React.FC<ReactionLogProps> = ({ logs }) => {
  const [expanded, setExpanded] = useState(false);

  const formatType = (type: LogType): string => {
    switch (type) {
      case 'add-reagent': return '加入试剂';
      case 'reaction-start': return '开始反应';
      case 'reaction-complete': return '反应完成';
      case 'reaction-fail': return '无反应';
    }
  };

  return (
    <div className="reaction-log-container">
      <div
        className="reaction-log-header"
        onClick={() => setExpanded(!expanded)}
      >
        <h3>实验记录 ({logs.length})</h3>
        <span className={`toggle-icon ${expanded ? 'expanded' : ''}`}>▼</span>
      </div>
      <div className={`reaction-log-body ${expanded ? 'expanded' : ''}`}>
        <div className="reaction-log-scroll">
          <table className="reaction-log-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>时间</th>
                <th style={{ width: 120 }}>操作类型</th>
                <th>详情</th>
                <th style={{ width: 80 }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>
                    暂无实验记录
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.timestamp}</td>
                    <td>
                      <span className={`log-dot ${log.success ? 'success' : 'error'}`} />
                      {formatType(log.type)}
                    </td>
                    <td>
                      {log.type === 'add-reagent' && log.reagentName && log.equipmentType && (
                        <>向{log.equipmentType}中加入 {log.reagentName}</>
                      )}
                      {log.type === 'reaction-start' && log.reactionEquation && (
                        <>开始反应：{log.reactionEquation}</>
                      )}
                      {log.type === 'reaction-complete' && log.reactionDescription && (
                        <>反应完成：{log.reactionDescription}</>
                      )}
                      {log.type === 'reaction-fail' && (
                        <>试剂未发生反应</>
                      )}
                    </td>
                    <td>
                      {log.success ? '成功' : '失败'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReactionLog;
