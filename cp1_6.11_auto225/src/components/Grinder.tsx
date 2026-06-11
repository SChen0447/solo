import { useRef, useEffect, useMemo } from 'react';
import type { Spice, Particle, AromaMolecule, DustParticle } from '../types';

interface GrinderProps {
  spice: Spice;
  grindDuration: number;
  grindSpeed: number;
  isGrinding: boolean;
  grindTime: number;
  aromaIntensity: number;
}

function Grinder({ spice, grindSpeed, isGrinding, grindTime, aromaIntensity }: GrinderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const moleculesRef = useRef<AromaMolecule[]>([]);
  const dustRef = useRef<DustParticle[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const bowlRotationRef = useRef<number>(0);

  const bowlCenterX = 150;
  const bowlCenterY = 130;
  const bowlRadius = 110;
  const bowlInnerRadius = 85;

  const currentLevel = useMemo(() => {
    return Math.min(4, Math.floor((grindSpeed - 100) / 200));
  }, [grindSpeed]);

  const generateParticles = (level: number) => {
    const particles: Particle[] = [];
    let id = 0;
    const baseCount = 7;
    
    const totalLevel = Math.floor(level);
    const count = Math.min(Math.floor(baseCount * Math.pow(1.8, totalLevel)), 60);
    const sizeFactor = 1 / Math.pow(1.6, totalLevel);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (bowlInnerRadius - 15);
      const x = bowlCenterX + Math.cos(angle) * dist * 0.7;
      const y = bowlCenterY + Math.sin(angle) * dist * 0.4;
      
      const width = (18 + Math.random() * 12) * sizeFactor;
      const height = (8 + Math.random() * 8) * sizeFactor;
      const rotation = Math.random() * 360;

      particles.push({
        id: id++,
        x,
        y,
        width,
        height,
        rotation,
        level: totalLevel
      });
    }

    particlesRef.current = particles;
  };

  useEffect(() => {
    generateParticles(currentLevel);
  }, [currentLevel, spice.id]);

  const spawnMolecule = () => {
    const spreadRadius = 30 + (aromaIntensity / 100) * 120;
    const speedBase = 0.5 + ((grindSpeed - 100) / 900) * 1.5;
    
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
    const startX = bowlCenterX + (Math.random() - 0.5) * 30;
    const startY = bowlCenterY - 20;

    const molecule: AromaMolecule = {
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speedBase * (0.5 + Math.random() * 0.5),
      vy: Math.sin(angle) * speedBase * (0.5 + Math.random() * 0.5) - 0.5,
      size: 3 + Math.random() * 5,
      opacity: 0.9,
      life: 1
    };
    moleculesRef.current.push(molecule);
  };

  const spawnDust = () => {
    const dust: DustParticle = {
      id: Date.now() + Math.random(),
      x: bowlCenterX + (Math.random() - 0.5) * 70,
      y: bowlCenterY + (Math.random() - 0.3) * 30,
      vx: (Math.random() - 0.5) * 1,
      vy: -0.3 - Math.random() * 1,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.5,
      life: 1
    };
    dustRef.current.push(dust);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bowlGradient = ctx.createRadialGradient(
        bowlCenterX, bowlCenterY - 20, 0,
        bowlCenterX, bowlCenterY + 20, bowlRadius
      );
      bowlGradient.addColorStop(0, '#4a2c16');
      bowlGradient.addColorStop(0.6, '#3d2410');
      bowlGradient.addColorStop(1, '#2b1a0e');
      
      ctx.beginPath();
      ctx.ellipse(bowlCenterX, bowlCenterY + 15, bowlRadius, bowlRadius * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = bowlGradient;
      ctx.fill();
      
      ctx.strokeStyle = '#6b4423';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(bowlCenterX, bowlCenterY, bowlInnerRadius, bowlInnerRadius * 0.5, 0, 0, Math.PI * 2);
      const innerGradient = ctx.createRadialGradient(
        bowlCenterX, bowlCenterY - 15, 0,
        bowlCenterX, bowlCenterY + 5, bowlInnerRadius
      );
      innerGradient.addColorStop(0, '#5c3a21');
      innerGradient.addColorStop(1, '#2b1a0e');
      ctx.fillStyle = innerGradient;
      ctx.fill();
      
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isGrinding) {
        bowlRotationRef.current += deltaTime * grindSpeed * 0.01;
        
        const speedFactor = grindSpeed / 500;
        const timeFactor = grindTime / 120;
        
        moleculesRef.current.forEach((mol) => {
          mol.x += mol.vx * 60 * deltaTime;
          mol.y += mol.vy * 60 * deltaTime;
          mol.life -= deltaTime * 0.4 * (0.5 + speedFactor * 0.5);
          mol.opacity = Math.max(0, mol.life * 0.9);
          mol.vx += (Math.random() - 0.5) * 0.15;
          mol.vy -= 0.03;
        });
        moleculesRef.current = moleculesRef.current.filter(m => m.life > 0);

        const maxMolecules = Math.floor(20 + aromaIntensity * 0.3);
        if (moleculesRef.current.length < maxMolecules && Math.random() < 0.4) {
          spawnMolecule();
        }

        dustRef.current.forEach(d => {
          d.x += d.vx * 30 * deltaTime;
          d.y += d.vy * 30 * deltaTime;
          d.life -= deltaTime * 0.7;
          d.opacity = Math.max(0, d.life * 0.5);
        });
        dustRef.current = dustRef.current.filter(d => d.life > 0);

        if (dustRef.current.length < 10 && Math.random() < 0.25) {
          spawnDust();
        }
      }

      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (isGrinding) {
          const shake = (grindSpeed / 1000) * 3;
          ctx.translate(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
          );
          
          const orbitRadius = 0.5 + (grindSpeed / 1000) * 0.5;
          const orbitAngle = bowlRotationRef.current + p.id * 0.7;
          ctx.translate(
            Math.cos(orbitAngle) * orbitRadius,
            Math.sin(orbitAngle) * orbitRadius * 0.5
          );
        }

        const particleGradient = ctx.createRadialGradient(
          -p.width * 0.2, -p.height * 0.2, 0,
          0, 0, Math.max(p.width, p.height) / 2
        );
        particleGradient.addColorStop(0, spice.color);
        particleGradient.addColorStop(0.6, spice.color + 'dd');
        particleGradient.addColorStop(1, spice.color + '66');

        ctx.beginPath();
        ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = particleGradient;
        ctx.fill();
        
        ctx.strokeStyle = spice.color + '33';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });

      dustRef.current.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${d.opacity * 0.35})`;
        ctx.fill();
      });

      moleculesRef.current.forEach(mol => {
        const gradient = ctx.createRadialGradient(
          mol.x, mol.y, 0,
          mol.x, mol.y, mol.size * 1.5
        );
        const alpha = Math.floor(mol.opacity * 255).toString(16).padStart(2, '0');
        gradient.addColorStop(0, spice.color + alpha);
        gradient.addColorStop(0.5, spice.color + Math.floor(mol.opacity * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, spice.color + '00');
        
        ctx.beginPath();
        ctx.arc(mol.x, mol.y, mol.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [spice, isGrinding, grindSpeed, grindTime, aromaIntensity]);

  return (
    <div className="grinder-section">
      <div className="bowl-container">
        <canvas
          ref={canvasRef}
          width={300}
          height={260}
          style={{ 
            width: '100%', 
            height: '100%',
          }}
        />
      </div>
    </div>
  );
}

export default Grinder;
