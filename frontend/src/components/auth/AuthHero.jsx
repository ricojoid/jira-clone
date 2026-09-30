import { useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Zap, MousePointer2, Sparkles } from 'lucide-react';

// Purely decorative illustration for the auth screens.

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#a1a1aa' },
  { key: 'progress', label: 'In Progress', color: '#f87171' },
  { key: 'done', label: 'Done', color: '#34d399' },
];

const STATIC_CARDS = {
  todo: [{ w: '78%', tag: '#818cf8' }, { w: '56%', tag: '#fbbf24' }],
  progress: [{ w: '64%', tag: '#f87171' }],
  done: [{ w: '70%', tag: '#34d399' }, { w: '48%', tag: '#818cf8' }],
};

const BARS = [38, 52, 44, 68, 60, 82, 94];

const ease = [0.22, 1, 0.36, 1];

function Aurora() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-15%', left: '-10%', width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.45) 0%, transparent 65%)', filter: 'blur(40px)',
        }}
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 20, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-20%', right: '-15%', width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 65%)', filter: 'blur(50px)',
        }}
      />
      <motion.div
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '35%', left: '40%', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 65%)', filter: 'blur(50px)',
        }}
      />
    </div>
  );
}

function Skeleton({ w, h = 6, o = 0.18 }) {
  return <div style={{ width: w, height: h, borderRadius: 4, backgroundColor: `rgba(255,255,255,${o})` }} />;
}

function MiniCard({ w, tag, highlight }) {
  return (
    <div
      style={{
        padding: '9px 10px',
        borderRadius: 9,
        backgroundColor: highlight ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
        border: highlight ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: highlight ? '0 10px 24px -6px rgba(220,38,38,0.55)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 14, height: 5, borderRadius: 3, backgroundColor: tag }} />
        {highlight && <Skeleton w={18} h={5} o={0.25} />}
      </div>
      <Skeleton w={w} o={highlight ? 0.55 : 0.2} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton w="30%" h={4} o={0.12} />
        <div
          style={{
            width: 12, height: 12, borderRadius: '50%',
            background: highlight ? 'linear-gradient(135deg,#f87171,#dc2626)' : 'rgba(255,255,255,0.18)',
          }}
        />
      </div>
    </div>
  );
}

function BoardIllustration() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 2400);
    return () => clearInterval(id);
  }, []);

  const movingCol = COLUMNS[step].key;

  return (
    <div className="glass-dark" style={{ borderRadius: 20, padding: 16, width: '100%' }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#f87171', '#fbbf24', '#34d399'].map((c) => (
              <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c, opacity: 0.85 }} />
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0' }}>Sprint 14 · Board</span>
        </div>
        <div style={{ display: 'flex' }}>
          {['#f87171', '#818cf8', '#fbbf24', '#34d399'].map((c, i) => (
            <span
              key={c}
              style={{
                width: 20, height: 20, borderRadius: '50%', marginLeft: i === 0 ? 0 : -6,
                background: `linear-gradient(135deg, ${c}, rgba(0,0,0,0.25))`,
                border: '2px solid #151a27',
              }}
            />
          ))}
        </div>
      </div>

      <LayoutGroup>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {COLUMNS.map((col) => {
            const count = STATIC_CARDS[col.key].length + (movingCol === col.key ? 1 : 0);
            return (
              <div
                key={col.key}
                style={{
                  borderRadius: 12,
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  minHeight: 196,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: col.color }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {col.label}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={count}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8' }}
                    >
                      {count}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {movingCol === col.key && (
                  <motion.div
                    layoutId="moving-card"
                    transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                    style={{ position: 'relative', zIndex: 5 }}
                  >
                    <MiniCard w="82%" tag="#f87171" highlight />
                  </motion.div>
                )}
                {STATIC_CARDS[col.key].map((c, i) => (
                  <motion.div key={i} layout transition={{ type: 'spring', stiffness: 200, damping: 26 }}>
                    <MiniCard {...c} />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

function VelocityCard() {
  return (
    <div className="glass-dark" style={{ borderRadius: 16, padding: '12px 14px', width: 190 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(220,38,38,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} />
        </div>
        <div>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Team Velocity</div>
          <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 800 }}>
            +18% <span style={{ color: '#34d399', fontSize: '0.65rem' }}>this sprint</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 46 }}>
        {BARS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 1, 0.35, 1] }}
            transition={{ duration: 5, times: [0, 0.2, 0.75, 0.85, 1], delay: 0.6 + i * 0.07, repeat: Infinity, repeatDelay: 1.5, ease }}
            style={{
              flex: 1,
              height: `${h}%`,
              borderRadius: 4,
              transformOrigin: 'bottom',
              background: i === BARS.length - 1 ? 'linear-gradient(180deg,#f87171,#dc2626)' : 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ToastCard() {
  return (
    <div className="glass-dark" style={{ borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CheckCircle2 size={16} />
      </motion.div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 800 }}>Task moved to Done</div>
        <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600 }}>24 tasks resolved this week</div>
      </div>
    </div>
  );
}

function CollaboratorCursor() {
  return (
    <motion.div
      animate={{ x: [0, 90, 150, 40, 0], y: [0, 40, -20, -50, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', top: '46%', left: '18%', zIndex: 20, pointerEvents: 'none' }}
    >
      <MousePointer2 size={18} fill="#818cf8" color="#c7d2fe" style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.6))' }} />
      <div
        style={{
          marginLeft: 14, marginTop: -2, padding: '3px 8px', borderRadius: 8, backgroundColor: '#6366f1',
          fontSize: '0.62rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
          boxShadow: '0 6px 14px -4px rgba(99,102,241,0.7)',
        }}
      >
        Rina · PM
      </div>
    </motion.div>
  );
}

const float = (delay, dist = 10, duration = 6) => ({
  animate: { y: [0, -dist, 0] },
  transition: { duration, repeat: Infinity, ease: 'easeInOut', delay },
});

export default function AuthHero({ title, highlight, subtitle }) {
  return (
    <div
      className="login-hero-panel"
      style={{
        flex: 1.1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '44px 52px',
        background: 'linear-gradient(160deg, #0c0f1a 0%, #07090f 60%, #0a0b14 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
      }}
    >
      <Aurora />
      <div className="auth-hero-grid" />
      <div className="auth-hero-noise" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div
          style={{
            width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px -6px rgba(220,38,38,0.5)',
          }}
        >
          <img src="/Logo.png" alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Jired
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>
            Project Management Platform
          </div>
        </div>
      </motion.div>

      {/* Illustration */}
      <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0', padding: '28px 0' }}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          style={{ position: 'relative', width: '100%', maxWidth: 460, margin: '0 auto' }}
        >
          <motion.div {...float(0, 6, 7)}>
            <BoardIllustration />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.55 }}
            style={{ position: 'absolute', top: -34, right: -28, zIndex: 10 }}
          >
            <motion.div {...float(0.5, 12, 6)}>
              <VelocityCard />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.75 }}
            style={{ position: 'absolute', bottom: -26, left: -30, zIndex: 10 }}
          >
            <motion.div {...float(1.2, 10, 5.5)}>
              <ToastCard />
            </motion.div>
          </motion.div>

          <CollaboratorCursor />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } } }}
          style={{ textAlign: 'center', maxWidth: 460, margin: '56px auto 0' }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.7rem', fontWeight: 700, color: '#fca5a5', marginBottom: 14,
            }}
          >
            <Sparkles size={12} /> Plan · Track · Deliver
          </motion.div>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.2 }}
          >
            {title} {highlight && <span className="text-gradient-brand">{highlight}</span>}
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}
          >
            {subtitle}
          </motion.p>
        </motion.div>
      </div>

      {/* Hero Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        style={{
          position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Enterprise Grade Security</span>
        </div>
        <div>&copy; 2026 Jired Platform</div>
      </motion.div>
    </div>
  );
}
