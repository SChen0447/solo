import React from 'react';
import { Customer } from '../types';
import { DRINKS } from '../utils/gameLogic';

interface CustomerQueueProps {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  selectedCustomerId: string | null;
}

export const CustomerQueue: React.FC<CustomerQueueProps> = ({
  customers,
  onSelectCustomer,
  selectedCustomerId,
}) => {
  const waitingCustomers = customers.filter(c => c.tableId === null);

  return (
    <div style={{
      width: '220px',
      background: 'linear-gradient(180deg, #4A2C0A 0%, #6B4423 100%)',
      borderRadius: '12px',
      padding: '12px',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
      height: '100%',
      overflowY: 'auto',
    }}>
      <h3 style={{
        color: '#F5DEB3',
        margin: '0 0 12px 0',
        textAlign: 'center',
        fontSize: '16px',
        borderBottom: '1px solid #8B4513',
        paddingBottom: '8px',
      }}>
        👥 排队顾客 ({waitingCustomers.length})
      </h3>

      {waitingCustomers.length === 0 ? (
        <div style={{
          color: '#D2B48C',
          textAlign: 'center',
          padding: '20px 0',
          fontSize: '13px',
          fontStyle: 'italic',
        }}>
          暂无顾客等待...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {waitingCustomers.map(customer => {
            const drink = DRINKS[customer.drinkId];
            const isSelected = selectedCustomerId === customer.id;
            const timeRatio = customer.timeLeft / customer.totalTime;

            return (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                style={{
                  background: isSelected ? '#8B4513' : 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #FFD700' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '28px',
                    filter: customer.isAngry ? 'hue-rotate(0deg) saturate(2)' : 'none',
                  }}>
                    {customer.avatar}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: isSelected ? '#FFF8DC' : '#F5DEB3',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}>
                      {customer.name}
                    </div>
                    <div style={{
                      width: '100%',
                      height: '5px',
                      background: '#3a1f08',
                      borderRadius: '3px',
                      marginTop: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${timeRatio * 100}%`,
                        height: '100%',
                        background: timeRatio > 0.5 ? '#2E8B57' : timeRatio > 0.25 ? '#DAA520' : '#CD5C5C',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                  <span style={{
                    color: timeRatio < 0.3 ? '#FF6347' : isSelected ? '#FFF8DC' : '#D2B48C',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}>
                    {Math.ceil(customer.timeLeft)}s
                  </span>
                </div>

                <div style={{
                  background: 'rgba(255, 248, 220, 0.95)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  position: 'relative',
                  fontSize: '12px',
                  color: '#4A2C0A',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '20px',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid rgba(255, 248, 220, 0.95)',
                  }} />
                  <div style={{ fontWeight: 'bold' }}>
                    ☕ {drink.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '4px',
                    fontSize: '10px',
                  }}>
                    {drink.steps.map((step, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '2px 5px',
                          borderRadius: '3px',
                          background: idx < customer.currentStep ? '#2E8B57' : '#8B4513',
                          color: '#fff',
                          fontWeight: 'bold',
                        }}
                      >
                        {step.key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
