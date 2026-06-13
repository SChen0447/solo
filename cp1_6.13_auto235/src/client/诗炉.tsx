import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { 情绪标签, 诗句 as 诗句类型 } from '../server/炉心';

interface 诗炉属性 {
  诗句列表: 诗句类型[];
  悬停诗句ID: string | null;
}

type 颜色组 = {
  起始: string;
  结束: string;
};

const 情绪配色: Record<情绪标签, 颜色组> = {
  欢快: { 起始: '#ff6b6b', 结束: '#feca57' },
  忧郁: { 起始: '#48dbfb', 结束: '#54a0ff' },
  激昂: { 起始: '#ff9ff3', 结束: '#a29bfe' },
  宁静: { 起始: '#b2bec3', 结束: '#dfe6e9' },
  思念: { 起始: '#ff7675', 结束: '#fdcb6e' },
  幻梦: { 起始: '#a29bfe', 结束: '#74b9ff' },
  炽热: { 起始: '#e17055', 结束: '#fab1a0' },
  空灵: { 起始: '#81ecec', 结束: '#55efc4' }
};

interface 基础主粒子 {
  x: number;
  y: number;
  vx: number;
  vy: number;
  半径: number;
  透明度: number;
  寿命: number;
  最大寿命: number;
  颜色: string;
  诗句ID: string;
  类型: '主';
  情绪: 情绪标签;
}

interface 散落粒子 {
  x: number;
  y: number;
  vx: number;
  vy: number;
  半径: number;
  透明度: number;
  寿命: number;
  最大寿命: number;
  颜色: string;
  诗句ID: string;
  类型: '散落';
}

interface 心形粒子 extends 基础主粒子 {
  情绪: '思念';
  角度: number;
  缩放: number;
}

interface 螺旋粒子 extends 基础主粒子 {
  情绪: '幻梦';
  角度: number;
  半径增量: number;
}

interface 脉冲粒子 extends 基础主粒子 {
  情绪: '激昂';
  脉冲相位: number;
}

interface 光环粒子 extends 基础主粒子 {
  情绪: '空灵';
  环半径: number;
}

type 普通主粒子 = 基础主粒子 & { 情绪: '欢快' | '忧郁' | '宁静' | '炽热' };

type 粒子 = 散落粒子 | 普通主粒子 | 心形粒子 | 螺旋粒子 | 脉冲粒子 | 光环粒子;

const 十六进制转RGB = (hex: string): { r: number; g: number; b: number } => {
  const 结果 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return 结果
    ? {
        r: parseInt(结果[1], 16),
        g: parseInt(结果[2], 16),
        b: parseInt(结果[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
};

const 插值颜色 = (颜色1: string, 颜色2: string, t: number): string => {
  const c1 = 十六进制转RGB(颜色1);
  const c2 = 十六进制转RGB(颜色2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const 诗炉: React.FC<诗炉属性> = ({ 诗句列表, 悬停诗句ID }) => {
  const canvas引用 = useRef<HTMLCanvasElement>(null);
  const 粒子数组引用 = useRef<粒子[]>([]);
  const 动画帧引用 = useRef<number>(0);
  const 上次更新引用 = useRef<number>(0);
  const 容器引用 = useRef<HTMLDivElement>(null);
  const 已处理悬停引用 = useRef<Set<string>>(new Set());

  const 悬停集合 = useMemo(() => {
    const 映射 = new Map<string, 情绪标签>();
    诗句列表.forEach(v => 映射.set(v.id, v.情绪));
    return 映射;
  }, [诗句列表]);

  const 生成心形坐标 = (中心X: number, 中心Y: number, 角度: number, 缩放: number): { x: number; y: number } => {
    const x = 16 * Math.pow(Math.sin(角度), 3);
    const y = -(13 * Math.cos(角度) - 5 * Math.cos(2 * 角度) - 2 * Math.cos(3 * 角度) - Math.cos(4 * 角度));
    return {
      x: 中心X + x * 缩放,
      y: 中心Y + y * 缩放
    };
  };

  const 创建主粒子 = useCallback((诗句: 诗句类型, canvas宽: number, canvas高: number, 索引: number, 总数: number): 粒子 => {
    const 配色 = 情绪配色[诗句.情绪];
    const 颜色T = Math.random();
    const 颜色 = 插值颜色(配色.起始, 配色.结束, 颜色T);

    const 基础 = {
      x: canvas宽 * (0.1 + Math.random() * 0.8),
      y: canvas高 * (0.1 + Math.random() * 0.8),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      半径: 2 + Math.random() * 3,
      透明度: 0.5 + Math.random() * 0.4,
      寿命: 0,
      最大寿命: 300 + Math.random() * 300,
      颜色,
      诗句ID: 诗句.id,
      类型: '主' as const,
      情绪: 诗句.情绪
    };

    switch (诗句.情绪) {
      case '欢快':
        return { ...基础, 情绪: '欢快' as const, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 };
      case '忧郁':
        return { ...基础, 情绪: '忧郁' as const, vx: (Math.random() - 0.5) * 0.5, vy: 0.2 + Math.random() * 0.3, 半径: 1.5 + Math.random() * 2 };
      case '激昂': {
        const 脉冲: 脉冲粒子 = {
          ...基础,
          情绪: '激昂',
          半径: 3 + Math.random() * 4,
          脉冲相位: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5
        };
        return 脉冲;
      }
      case '宁静':
        return { ...基础, 情绪: '宁静' as const, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, 半径: 1.5 + Math.random() * 2 };
      case '思念': {
        const 中心X = canvas宽 * (0.25 + (索引 / Math.max(总数, 1)) * 0.5);
        const 中心Y = canvas高 * (0.3 + Math.random() * 0.4);
        const 心形: 心形粒子 = {
          ...基础,
          情绪: '思念',
          x: 中心X,
          y: 中心Y,
          角度: Math.random() * Math.PI * 2,
          缩放: 2 + Math.random() * 3,
          vx: 0,
          vy: 0
        };
        const 坐标 = 生成心形坐标(中心X, 中心Y, 心形.角度, 心形.缩放);
        心形.x = 坐标.x;
        心形.y = 坐标.y;
        return 心形;
      }
      case '幻梦': {
        const 中心X = canvas宽 * 0.5;
        const 中心Y = canvas高 * 0.5;
        const 螺旋: 螺旋粒子 = {
          ...基础,
          情绪: '幻梦',
          x: 中心X,
          y: 中心Y,
          角度: Math.random() * Math.PI * 2,
          半径增量: Math.random() * 0.5 + 0.2,
          vx: 0,
          vy: 0
        };
        const r = 螺旋.角度 * 10;
        螺旋.x = 中心X + Math.cos(螺旋.角度) * r;
        螺旋.y = 中心Y + Math.sin(螺旋.角度) * r;
        return 螺旋;
      }
      case '炽热':
        return { ...基础, 情绪: '炽热' as const, vx: (Math.random() - 0.5) * 0.8, vy: -(0.5 + Math.random() * 1.5), y: canvas高 * (0.7 + Math.random() * 0.3) };
      case '空灵': {
        const 中心X = canvas宽 * (0.2 + (索引 / Math.max(总数, 1)) * 0.6);
        const 中心Y = canvas高 * (0.3 + Math.random() * 0.4);
        const 光环: 光环粒子 = {
          ...基础,
          情绪: '空灵',
          x: 中心X,
          y: 中心Y,
          环半径: Math.random() * 40,
          vx: 0,
          vy: 0,
          半径: 1 + Math.random() * 2
        };
        return 光环;
      }
      default:
        return 基础 as 粒子;
    }
  }, []);

  const 创建散落粒子 = useCallback((诗句: 诗句类型, canvas宽: number, canvas高: number): 粒子[] => {
    const 粒子们: 粒子[] = [];
    const 数量 = 15 + Math.floor(Math.random() * 6);
    const 配色 = 情绪配色[诗句.情绪];
    const 中心X = canvas宽 * 0.5;
    const 中心Y = canvas高 * 0.5;

    for (let i = 0; i < 数量; i++) {
      const 角度 = (Math.PI * 2 * i) / 数量 + Math.random() * 0.3;
      const 速度 = 1.5 + Math.random() * 2.5;
      const 颜色T = Math.random();
      粒子们.push({
        x: 中心X + (Math.random() - 0.5) * 60,
        y: 中心Y + (Math.random() - 0.5) * 60,
        vx: Math.cos(角度) * 速度,
        vy: Math.sin(角度) * 速度,
        半径: 2 + Math.random() * 2,
        透明度: 0.7,
        寿命: 0,
        最大寿命: 60,
        颜色: 插值颜色(配色.起始, 配色.结束, 颜色T),
        诗句ID: 诗句.id,
        类型: '散落'
      });
    }
    return 粒子们;
  }, []);

  const 同步诗句粒子 = useCallback((canvas: HTMLCanvasElement) => {
    const 宽 = canvas.width;
    const 高 = canvas.height;
    const 最大粒子数 = 600;
    const 每首诗粒子数 = Math.floor(最大粒子数 / Math.max(诗句列表.length, 1));
    const 实际每首 = Math.min(每首诗粒子数, 60);

    const 现有ID映射 = new Map<string, 粒子[]>();
    粒子数组引用.current.forEach(p => {
      if (p.类型 === '主') {
        if (!现有ID映射.has(p.诗句ID)) 现有ID映射.set(p.诗句ID, []);
        现有ID映射.get(p.诗句ID)!.push(p);
      }
    });

    const 新粒子数组: 粒子[] = 粒子数组引用.current.filter(p => p.类型 === '散落');

    诗句列表.forEach((诗句, idx) => {
      const 现有 = 现有ID映射.get(诗句.id) || [];
      const 需要补充 = Math.max(0, 实际每首 - 现有.length);
      for (let i = 0; i < 需要补充; i++) {
        现有.push(创建主粒子(诗句, 宽, 高, idx, 诗句列表.length));
      }
      新粒子数组.push(...现有.slice(0, 实际每首));
    });

    粒子数组引用.current = 新粒子数组.slice(0, 最大粒子数);
  }, [诗句列表, 创建主粒子]);

  const 更新粒子 = useCallback((canvas: HTMLCanvasElement, 时间戳: number) => {
    const 宽 = canvas.width;
    const 高 = canvas.height;
    const 应更新 = 时间戳 - 上次更新引用.current >= 1000;
    if (应更新) {
      上次更新引用.current = 时间戳;
    }

    粒子数组引用.current = 粒子数组引用.current.filter(粒子 => {
      粒子.寿命++;
      if (粒子.寿命 >= 粒子.最大寿命) return false;

      const 生命比 = 粒子.寿命 / 粒子.最大寿命;
      const 淡出 = Math.max(0, 1 - Math.pow(生命比, 2));

      if (悬停诗句ID && 粒子.诗句ID === 悬停诗句ID && 粒子.类型 === '主') {
        粒子.透明度 = Math.max(0, 粒子.透明度 - 0.02);
        if (粒子.透明度 <= 0.01) return false;
      } else if (粒子.类型 === '散落') {
        粒子.透明度 = 0.7 * 淡出;
      }

      if (粒子.类型 === '主') {
        switch (粒子.情绪) {
          case '思念': {
            const p = 粒子 as 心形粒子;
            p.角度 += 0.008;
            const 中心X = 宽 * 0.5;
            const 中心Y = 高 * 0.5;
            const 坐标 = 生成心形坐标(中心X, 中心Y, p.角度, p.缩放);
            p.x += (坐标.x - p.x) * 0.05;
            p.y += (坐标.y - p.y) * 0.05;
            break;
          }
          case '幻梦': {
            const p = 粒子 as 螺旋粒子;
            p.角度 += 0.015;
            const 中心X = 宽 * 0.5;
            const 中心Y = 高 * 0.5;
            const r = (p.角度 % (Math.PI * 4)) * 25;
            const tx = 中心X + Math.cos(p.角度) * r;
            const ty = 中心Y + Math.sin(p.角度) * r;
            p.x += (tx - p.x) * 0.06;
            p.y += (ty - p.y) * 0.06;
            break;
          }
          case '激昂': {
            const p = 粒子 as 脉冲粒子;
            p.脉冲相位 += 0.1;
            p.x += p.vx;
            p.y += p.vy;
            break;
          }
          case '空灵': {
            const p = 粒子 as 光环粒子;
            p.环半径 += 0.3;
            if (p.环半径 > 80) p.环半径 = 5;
            const 中心X = 宽 * 0.5;
            const 中心Y = 高 * 0.5;
            const 角 = (Date.now() / 1000 + p.寿命 * 0.02) % (Math.PI * 2);
            p.x = 中心X + Math.cos(角) * p.环半径;
            p.y = 中心Y + Math.sin(角) * p.环半径;
            break;
          }
          case '炽热': {
            const p = 粒子;
            p.vy *= 0.995;
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) {
              p.y = 高 * (0.8 + Math.random() * 0.2);
              p.x = 宽 * (0.2 + Math.random() * 0.6);
              p.vy = -(0.5 + Math.random() * 1.5);
            }
            break;
          }
          default: {
            const p = 粒子;
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = 宽;
            if (p.x > 宽) p.x = 0;
            if (p.y < 0) p.y = 高;
            if (p.y > 高) p.y = 0;
          }
        }
      } else {
        const p = 粒子;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      return true;
    });
  }, [悬停诗句ID]);

  const 渲染 = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const 宽 = canvas.width;
    const 高 = canvas.height;
    ctx.clearRect(0, 0, 宽, 高);

    const 渐变 = ctx.createRadialGradient(宽 / 2, 高 / 2, 0, 宽 / 2, 高 / 2, Math.max(宽, 高) * 0.7);
    渐变.addColorStop(0, 'rgba(26, 26, 46, 0.3)');
    渐变.addColorStop(1, 'rgba(10, 11, 22, 0.8)');
    ctx.fillStyle = 渐变;
    ctx.fillRect(0, 0, 宽, 高);

    粒子数组引用.current.forEach(粒子 => {
      let 绘制半径 = 粒子.半径;

      if (粒子.类型 === '主' && 粒子.情绪 === '激昂') {
        const p = 粒子 as 脉冲粒子;
        绘制半径 = 粒子.半径 * (1 + 0.3 * Math.sin(p.脉冲相位));
      }

      ctx.save();
      ctx.globalAlpha = 粒子.透明度;

      const 光晕 = ctx.createRadialGradient(粒子.x, 粒子.y, 0, 粒子.x, 粒子.y, 绘制半径 * 3);
      光晕.addColorStop(0, 粒子.颜色);
      光晕.addColorStop(0.4, 粒子.颜色 + '66');
      光晕.addColorStop(1, 粒子.颜色 + '00');
      ctx.fillStyle = 光晕;
      ctx.beginPath();
      ctx.arc(粒子.x, 粒子.y, 绘制半径 * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 粒子.颜色;
      ctx.beginPath();
      ctx.arc(粒子.x, 粒子.y, 绘制半径, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvas引用.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const 调整尺寸 = () => {
      const 容器 = 容器引用.current;
      if (!容器) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 容器.clientWidth * dpr;
      canvas.height = 容器.clientHeight * dpr;
      canvas.style.width = 容器.clientWidth + 'px';
      canvas.style.height = 容器.clientHeight + 'px';
      ctx.scale(dpr, dpr);
      同步诗句粒子(canvas);
    };

    调整尺寸();
    window.addEventListener('resize', 调整尺寸);

    let 上次同步 = 0;
    const 循环 = (时间戳: number) => {
      if (时间戳 - 上次同步 > 2000) {
        上次同步 = 时间戳;
        同步诗句粒子(canvas);
      }
      更新粒子(canvas, 时间戳);
      渲染(ctx, canvas);
      动画帧引用.current = requestAnimationFrame(循环);
    };
    动画帧引用.current = requestAnimationFrame(循环);

    return () => {
      cancelAnimationFrame(动画帧引用.current);
      window.removeEventListener('resize', 调整尺寸);
    };
  }, [同步诗句粒子, 更新粒子, 渲染]);

  useEffect(() => {
    const canvas = canvas引用.current;
    if (!canvas || !悬停诗句ID) return;
    if (已处理悬停引用.current.has(悬停诗句ID)) return;

    const 诗句 = 诗句列表.find(v => v.id === 悬停诗句ID);
    if (诗句) {
      已处理悬停引用.current.add(悬停诗句ID);
      const 散落 = 创建散落粒子(诗句, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      粒子数组引用.current = [...粒子数组引用.current, ...散落].slice(0, 700);
      setTimeout(() => {
        已处理悬停引用.current.delete(悬停诗句ID);
      }, 3000);
    }
  }, [悬停诗句ID, 诗句列表, 创建散落粒子]);

  return (
    <div
      ref={容器引用}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        boxShadow: '0 0 40px rgba(102, 126, 234, 0.15), inset 0 0 60px rgba(102, 126, 234, 0.05)'
      }}
    >
      <canvas
        ref={canvas引用}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};

export default 诗炉;
