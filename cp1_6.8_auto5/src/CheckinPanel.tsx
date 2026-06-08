import { useMemo } from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import type { TodayData, CheckinRecord, TeamMember } from './App';

interface CheckinPanelProps {
  data: TodayData | null;
  hasCheckedIn: boolean;
  currentUserId: string;
  onCheckin: () => Promise<any>;
  onUserChange: (userId: string) => void;
}

const CheckinPanel = ({
  data,
  hasCheckedIn,
  currentUserId,
  onCheckin,
  onUserChange,
}: CheckinPanelProps) => {
  const calculateWorkHours = (checkinTime: string): string => {
    const now = new Date();
    const checkinDate = parseISO(checkinTime);
    const minutes = differenceInMinutes(now, checkinDate);
    
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分钟`;
  };

  const formatCheckinTime = (timeStr: string): string => {
    return format(parseISO(timeStr), 'HH:mm:ss');
  };

  const sortedMembers = useMemo(() => {
    if (!data) return [];

    const checkinMap = new Map<string, CheckinRecord>();
    data.checkins.forEach((record) => {
      checkinMap.set(record.userId, record);
    });

    const checkedInMembers: Array<{ member: TeamMember; record: CheckinRecord }> = [];
    const notCheckedMembers: Array<{ member: TeamMember; record: null }> = [];

    data.members.forEach((member) => {
      const record = checkinMap.get(member.id);
      if (record) {
        checkedInMembers.push({ member, record });
      } else {
        notCheckedMembers.push({ member, record: null });
      }
    });

    checkedInMembers.sort(
      (a, b) =>
        new Date(a.record.checkinTime).getTime() -
        new Date(b.record.checkinTime).getTime()
    );

    return [
      ...checkedInMembers.map((item) => ({
        ...item,
        isCheckedIn: true,
      })),
      ...notCheckedMembers.map((item) => ({
        ...item,
        isCheckedIn: false,
      })),
    ];
  }, [data]);

  const currentMember = data?.members.find((m) => m.id === currentUserId);

  return (
    <div className="card checkin-panel">
      <h2 className="panel-title">📋 今日签到</h2>
      
      <div className="checkin-button">
        <button
          className="checkin-btn"
          onClick={onCheckin}
          disabled={hasCheckedIn}
        >
          <span className="checkin-icon">
            {hasCheckedIn ? '✅' : '👆'}
          </span>
          {hasCheckedIn ? '已签到' : '立即签到'}
        </button>
        <p className="checkin-hint">
          {hasCheckedIn
            ? `${currentMember?.name || '您'}今日已完成签到`
            : `当前用户：${currentMember?.name || '选择用户'}`}
        </p>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {data?.members.map((member) => (
            <button
              key={member.id}
              onClick={() => onUserChange(member.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: currentUserId === member.id
                  ? '2px solid #3b82f6'
                  : '1px solid #e2e8f0',
                borderRadius: '6px',
                background: currentUserId === member.id
                  ? '#eff6ff'
                  : '#ffffff',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {member.avatar} {member.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '12px',
          }}
        >
          团队签到状态（{data?.checkins.length || 0}/{data?.members.length || 0}）
        </h3>
        
        <div className="member-list">
          {sortedMembers.map((item, index) => (
            <div
              key={item.member.id}
              className={`member-item ${
                item.isCheckedIn ? 'checked-in' : 'not-checked'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="member-info">
                <div
                  className={`member-avatar ${
                    item.isCheckedIn ? 'checked-in' : ''
                  }`}
                >
                  {item.member.avatar}
                </div>
                <div>
                  <div className="member-name">{item.member.name}</div>
                  {item.record && (
                    <div className="member-time">
                      {formatCheckinTime(item.record.checkinTime)} 签到
                    </div>
                  )}
                  {!item.record && (
                    <div className="member-time">尚未签到</div>
                  )}
                </div>
              </div>
              <div
                className={`work-hours ${
                  item.isCheckedIn ? '' : 'placeholder'
                }`}
              >
                {item.record
                  ? calculateWorkHours(item.record.checkinTime)
                  : '--'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CheckinPanel;
