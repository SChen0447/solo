import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CONSTELLATION_TYPES, getConstellationColors, generateWishText, getUnlockedConstellations } from '../utils/starData';
interface StarWishBottleProps {
 collectCount: number;
 maxCount: number;
 bottleRef?: React.RefObject<HTMLDivElement>;
}
export function StarWishBottle({ collectCount, maxCount, bottleRef }: StarWishBottleProps) {
 const [rotation, setRotation] = useState({ x: 0, y: 0 });
 const [isDragging, setIsDragging] = useState(false);
 const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
 const [showWish, setShowWish] = useState(false);
 const [wishText, setWishText] = useState('');
 const [isFull, setIsFull] = useState(false);
 const bottleInnerRef = useRef<HTMLDivElement>(null);
 const fillHeight = Math.min((collectCount / maxCount) * 200, 200);
 const colors = getConstellationColors(collectCount);
 const unlockedConstellations = getUnlockedConstellations(collectCount);
 useEffect(() => {
 setIsFull(collectCount >= maxCount);
 }, [collectCount, maxCount]);
 const handleMouseDown = useCallback((e: React.MouseEvent) => {
 setIsDragging(true);
 setLastPos({ x: e.clientX, y: e.clientY });
 }, []);
 const handleMouseMove = useCallback((e: React.MouseEvent) => {
 if (!isDragging)
 return;
 const deltaX = e.clientX - lastPos.x;
 const deltaY = e.clientY - lastPos.y;
 setRotation(prev => ({
 x: Math.max(-30, Math.min(30, prev.x - deltaY * 0.5)),
 y: prev.y + deltaX * 0.5,
 }));
 setLastPos({ x: e.clientX, y: e.clientY });
 }, [isDragging, lastPos]);
 const handleMouseUp = useCallback(() => {
 setIsDragging(false);
 }, []);
 const handleBottleClick = useCallback((e: React.MouseEvent) => {
 e.stopPropagation();
 if (collectCount < 1)
 return;
 const duration = 2000;
 const end = Date.now() + duration;
 const colorsArray = CONSTELLATION_TYPES.map(c => c.color);
 const frame = () => {
 confetti({
 particleCount: 3,
 angle: 90,
 spread: 55,
 origin: { x: 0.85, y: 0.55 },
 colors: colorsArray,
 gravity: 0.8,
 scalar: 0.8 + Math.random() * 0.8,
 });
 if (Date.now() < end) {
 requestAnimationFrame(frame);
 }
 };
 frame();
 setWishText(generateWishText(collectCount));
 setShowWish(true);
 setTimeout(() => setShowWish(false), 4000);
 }, [collectCount]);
 const handleNeckClick = useCallback((e: React.MouseEvent) => {
 e.stopPropagation();
 if (collectCount < 1)
 return;
 const colorsArray = CONSTELLATION_TYPES.map(c => c.color);
 for (let i = 0; i < 3; i++) {
 setTimeout(() => {
 confetti({
 particleCount: 20,
 angle: 90 + (Math.random() - 0.5) * 40,
 spread: 30,
 origin: { x: 0.85, y: 0.45 },
 colors: colorsArray,
 gravity: 1,
 scalar: 0.8 + Math.random() * 0.6,
 });
 }, i * 100);
 }
 }, [collectCount]);
 const gradientId = 'bottle-liquid-gradient';
 const glowGradientId = 'bottle-glow-gradient';
 return (<div ref={bottleRef || bottleInnerRef} className="relative" style={{
 perspective: '800px',
 cursor: isDragging ? 'grabbing' : 'grab',
 width: '160px',
 height: '300px',
 }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
 <motion.div style={{
 transformStyle: 'preserve-3d',
 transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
 }} animate={isFull
 ? {
 boxShadow: [
 '0 0 20px rgba(136, 170, 255, 0.6)',
 '0 0 60px rgba(136, 170, 255, 1)',
 '0 0 20px rgba(136, 170, 255, 0.6)',
 ],
 }
 : {}} transition={{
 duration: 0.8,
 repeat: isFull ? Infinity : 0,
 ease: 'easeInOut',
 }}>
 <svg width="160" height="300" viewBox="0 0 160 300" style={{ filter: isFull ? 'drop-shadow(0 0 15px rgba(136, 170, 255, 0.8))' : 'none', }}>
 <defs>
 <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
 {colors.map((color, index) => (<stop key={index} offset={`${(index / Math.max(colors.length - 1, 1)) * 100}%`} stopColor={color} stopOpacity="0.7"/>))}
 </linearGradient>

 <linearGradient id="glass-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)"/>
 <stop offset="30%" stopColor="rgba(255, 255, 255, 0.05)"/>
 <stop offset="70%" stopColor="rgba(255, 255, 255, 0.1)"/>
 <stop offset="100%" stopColor="rgba(255, 255, 255, 0.25)"/>
 </linearGradient>

 <radialGradient id={glowGradientId} cx="50%" cy="30%" r="60%">
 <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)"/>
 <stop offset="100%" stopColor="rgba(255, 255, 255, 0)"/>
 </radialGradient>

 <clipPath id="bottle-clip">
 <path d="M55 20 
 L55 60 
 Q30 70 25 100 
 L25 240 
 Q25 275 60 280 
 L100 280 
 Q135 275 135 240 
 L135 100 
 Q130 70 105 60 
 L105 20 Z"/>
 </clipPath>

 <filter id="blur-filter">
 <feGaussianBlur stdDeviation="3"/>
 </filter>
 </defs>

 {isFull && (<g className="constellation-halo">
 <motion.circle cx="80" cy="55" r="35" fill="none" stroke="url(#glass-gradient)" strokeWidth="1" opacity="0.6" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '80px 55px' }}/>
 {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
 const rad = (angle * Math.PI) / 180;
 const x = 80 + Math.cos(rad) * 35;
 const y = 55 + Math.sin(rad) * 35;
 const color = colors[i % colors.length];
 return (<motion.circle key={i} cx={x} cy={y} r="3" fill={color} animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}/>);
 })}
 </g>)}

 <path d="M55 20 
 L55 60 
 Q30 70 25 100 
 L25 240 
 Q25 275 60 280 
 L100 280 
 Q135 275 135 240 
 L135 100 
 Q130 70 105 60 
 L105 20 Z" fill="rgba(200, 220, 255, 0.15)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" onClick={handleBottleClick}/>

 <g clipPath="url(#bottle-clip)">
 <motion.rect x="25" y={280 - fillHeight} width="110" height={fillHeight} fill={`url(#${gradientId})`} initial={false} transition={{ duration: 0.5, ease: 'easeOut' }}/>
 
 <motion.rect x="25" y={280 - fillHeight} width="110" height="20" fill={`url(#${glowGradientId})`} initial={false} transition={{ duration: 0.5, ease: 'easeOut' }} opacity="0.6"/>

 {unlockedConstellations.map((c, i) => {
 const x = 45 + (i % 4) * 25;
 const y = 260 - Math.floor(i / 4) * 25 - (collectCount % 5) * 2;
 return (<motion.circle key={c.id} cx={x} cy={y} r="4" fill={c.color} animate={{ y: [y, y - 5, y], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}/>);
 })}
 </g>

 <path d="M55 20 
 L55 60 
 Q30 70 25 100 
 L25 240 
 Q25 275 60 280 
 L100 280 
 Q135 275 135 240 
 L135 100 
 Q130 70 105 60 
 L105 20 Z" fill="url(#glass-gradient)" style={{ mixBlendMode: 'overlay' }} onClick={handleBottleClick}/>

 <ellipse cx="65" cy="150" rx="8" ry="80" fill="rgba(255, 255, 255, 0.15)" transform="rotate(-5 65 150)"/>

 <rect x="52" y="12" width="56" height="18" rx="4" fill="rgba(200, 220, 255, 0.3)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" onClick={handleNeckClick} style={{ cursor: 'pointer' }}/>
 <rect x="55" y="15" width="50" height="12" rx="2" fill="rgba(136, 170, 255, 0.4)"/>

 <text x="80" y="210" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" style={{
 filter: `drop-shadow(0 0 8px ${colors[0] || '#88aaff'})`,
 fontFamily: "'Inter', sans-serif",
 }}>
 {collectCount}
 </text>

 <text x="80" y="235" textAnchor="middle" fill="rgba(255, 255, 255, 0.7)" fontSize="12" style={{ fontFamily: "'Inter', sans-serif" }}>
 碎片
 </text>
 </svg>
 </motion.div>

 <AnimatePresence>
 {showWish && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8, ease: 'easeInOut' }} style={{
 position: 'absolute',
 top: '50%',
 left: '50%',
 transform: 'translate(-50%, -50%)',
 width: '400px',
 textAlign: 'center',
 pointerEvents: 'none',
 fontFamily: "'Ma Shan Zheng', cursive",
 fontSize: '24px',
 color: '#ffffff',
 textShadow: '0 0 20px rgba(136, 170, 255, 0.8), 0 0 40px rgba(136, 170, 255, 0.4)',
 zIndex: 100,
 }}>
 {wishText}
 </motion.div>)}
 </AnimatePresence>
 </div>);
}

