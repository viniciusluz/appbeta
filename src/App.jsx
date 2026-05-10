import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, onValue, get, set, update, serverTimestamp } from 'firebase/database';
import { auth, db, ADMIN_UID } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import TravelMode from './components/TravelMode';
import { ReviewScreen, QuizScreen, InputScreen, PronunciaScreen, RankingScreen, ProfileScreen, ProgressScreen } from './components/Screens';

const LEVELS = [
  { name: 'Iniciante', xp: 0 }, { name: 'Aprendiz', xp: 100 },
  { name: 'Intermediário', xp: 300 }, { name: 'Avançado', xp: 600 },
  { name: 'Fluente', xp: 1000 }, { name: 'Mestre', xp: 1500 }, { name: 'Lendário', xp: 2500 }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('study');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [xpToast, setXpToast] = useState(null);
  
  const [s, setS] = useState({
    list: [],
    prog: {},
    reference: '',
    revOk: 0,
    revFail: 0,
    qOk: 0,
    qFail: 0,
    xp: 0,
    level: 1,
    streak: 0,
    dates: [],
    unlocked: false,
    studyIdx: 0
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(u.uid === ADMIN_UID);
        loadUserProgress(u.uid);
        listenSharedList();
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  const loadUserProgress = async (uid) => {
    const snap = await get(ref(db, `users/${uid}/progress`));
    if (snap.exists()) {
      setS(prev => ({ ...prev, ...snap.val() }));
    }
  };

  const listenSharedList = () => {
    onValue(ref(db, 'sharedList'), snap => {
      const data = snap.val();
      if (data && data.items) {
        setS(prev => {
          const newList = data.items;
          const newProg = { ...prev.prog };
          newList.forEach((_, i) => {
            if (!newProg[i]) newProg[i] = { seen: 0, correct: 0, wrong: 0, weight: 5 };
          });
          return { ...prev, list: newList, reference: data.reference || '', prog: newProg };
        });
      }
    });
  };

  const saveProgress = async () => {
    if (!user) return;
    const payload = {
      prog: s.prog, revOk: s.revOk, revFail: s.revFail,
      qOk: s.qOk, qFail: s.qFail, xp: s.xp, level: s.level,
      streak: s.streak, dates: s.dates, unlocked: s.unlocked, studyIdx: s.studyIdx
    };
    await set(ref(db, `users/${user.uid}/progress`), payload);
    await set(ref(db, `leaderboard/${user.uid}`), {
      name: user.displayName || user.email.split('@')[0],
      xp: s.xp, level: s.level, streak: s.streak, updatedAt: Date.now()
    });
  };

  const addXP = (amount) => {
    setS(prev => {
      const newXP = prev.xp + amount;
      let newLevel = prev.level;
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (newXP >= LEVELS[i].xp) { newLevel = i + 1; break; }
      }
      return { ...prev, xp: newXP, level: newLevel };
    });
    setXpToast(`+${amount} XP ⚡`);
    setTimeout(() => setXpToast(null), 1500);
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => saveProgress(), 1000);
      return () => clearTimeout(timer);
    }
  }, [s]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const handleLogout = async () => { if (confirm('Sair da sua conta?')) await signOut(auth); };

  if (!user) return <AuthScreen />;

  const currentLevel = LEVELS[s.level - 1] || LEVELS[0];
  const nextLevel = LEVELS[s.level] || { xp: s.xp + 1 };
  const levelProgress = Math.min(100, Math.round(((s.xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100));

  return (
    <div id="appShell">
      <header>
        <div className="logo">Lingua<span>Forge</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="hud hud-btn" onClick={() => setActiveTab('progress')}>
            <div className="hud-item"><span>🔥</span><span className="hud-val">{s.streak}</span><span>dias</span></div>
            <div className="hud-item"><span>⚡</span><span className="hud-val">{s.xp}</span><span>XP</span></div>
            <div className="hud-item"><span>🏆</span><span className="hud-val">Nv{s.level}</span></div>
          </div>
          <div className="user-bar">
            <button onClick={toggleTheme} className="btn btn-secondary" style={{ padding: '4px', fontSize: '1.1rem', borderRadius: '10px', background: 'transparent', borderColor: 'transparent' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setActiveTab('ranking')} className="btn btn-secondary" style={{ padding: '5px 9px', fontSize: '.7rem', borderColor: 'var(--accent3)', color: 'var(--accent3)', background: 'rgba(255,209,102,.08)' }}>
              🏅 Ranking
            </button>
            <span className="user-name" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              {user.displayName || user.email.split('@')[0]}
            </span>
            {isAdmin && <span className="admin-badge" style={{ display: 'inline-flex' }}>ADMIN</span>}
            <button className="logout-btn" onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </header>

      <div className="level-bar-wrap">
        <div className="level-row"><span>Nível</span><strong>Nível {s.level} — {currentLevel.name}</strong></div>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${levelProgress}%` }}></div></div>
      </div>

      <div className="tabs">
        <TabButton id="input" active={activeTab} onClick={setActiveTab} label="📋 Lista" />
        <TabButton id="study" active={activeTab} onClick={setActiveTab} label="📖 Estudo" />
        <TabButton id="review" active={activeTab} onClick={setActiveTab} label="🔁 Revisão" />
        <TabButton id="quiz" active={activeTab} onClick={setActiveTab} label="🧠 Quiz" />
        <TabButton id="pronun" active={activeTab} onClick={setActiveTab} label="🎙️ Pronúncia" />
        <TabButton id="travel" active={activeTab} onClick={setActiveTab} label="✈️ Viagem" />
      </div>

      <main style={{ width: '100%', maxWidth: '720px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'input' && <InputScreen s={s} setS={setS} isAdmin={isAdmin} />}
            {activeTab === 'study' && <StudyScreen s={s} setS={setS} addXP={addXP} />}
            {activeTab === 'review' && <ReviewScreen s={s} setS={setS} addXP={addXP} />}
            {activeTab === 'quiz' && <QuizScreen s={s} setS={setS} addXP={addXP} />}
            {activeTab === 'pronun' && <PronunciaScreen s={s} addXP={addXP} />}
            {activeTab === 'travel' && <TravelMode addXP={addXP} />}
            {activeTab === 'ranking' && <RankingScreen />}
            {activeTab === 'profile' && <ProfileScreen user={user} s={s} />}
            {activeTab === 'progress' && <ProgressScreen s={s} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="danger-zone">
        <button className="btn btn-danger btn-sm" onClick={() => alert('Reset via Settings coming soon')}>🗑 Resetar meu progresso</button>
      </div>

      <AnimatePresence>
        {xpToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="xp-toast show">
            {xpToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ id, active, onClick, label }) => (
  <button onClick={() => onClick(id)} className={`tab ${active === id ? 'active' : ''}`}>{label}</button>
);

const StudyScreen = ({ s, setS, addXP }) => {
  const item = s.list[s.studyIdx];
  if (!item) return <EmptyState />;
  const next = () => setS(prev => ({ ...prev, studyIdx: Math.min(prev.list.length - 1, prev.studyIdx + 1) }));
  const prev = () => setS(prev => ({ ...prev, studyIdx: Math.max(0, prev.studyIdx - 1) }));

  return (
    <div className="card">
      <span className="phase-badge badge-study">📖 Fase 1 — Estudo</span>
      <div className="flashcard pop" key={s.studyIdx}>
        <span className="card-label">🇧🇷 Português</span>
        <div className="card-pt">{item.pt}</div>
        <div style={{ width: '36px', height: '1px', background: 'var(--border)' }}></div>
        <span className="card-label">🇺🇸 Inglês</span>
        <div className="card-en">{item.en}</div>
        {s.reference && <div className="card-ref" style={{ display: 'inline-flex' }}>{s.reference}</div>}
        <div className="seen-badge">visto {s.prog[s.studyIdx]?.seen || 1}×</div>
      </div>
      <div className="nav-row">
        <button className="btn btn-secondary" onClick={prev} disabled={s.studyIdx === 0}>← Anterior</button>
        <span className="card-counter">{s.studyIdx + 1} / {s.list.length}</span>
        <button className="btn btn-secondary" onClick={next} disabled={s.studyIdx === s.list.length - 1}>Próximo →</button>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setErr(''); setMsg('');
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) { setErr(e.message); }
  };

  const handleForgot = async () => {
    if (!email) return setErr('Por favor, digite seu e-mail no campo acima antes de clicar em Esqueceu.');
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('Link de recuperação enviado com sucesso! Verifique sua caixa de entrada e o SPAM.');
      setErr('');
    } catch (e) { 
      console.error("Firebase Reset Error:", e.code, e.message);
      if (e.code === 'auth/user-not-found') setErr('Este e-mail não está cadastrado.');
      else if (e.code === 'auth/invalid-email') setErr('E-mail inválido.');
      else setErr('Erro ao enviar: ' + e.message);
    }
  };

  return (
    <div id="authScreen">
      <div className="auth-box">
        <div className="auth-logo">Lingua<span>Forge</span></div>
        <div className="auth-sub">Estude inglês junto com seus amigos</div>
        <div className="auth-title">{isRegister ? 'Criar conta' : 'Entrar'}</div>
        {err && <div className="auth-err" style={{ display: 'block' }}>{err}</div>}
        {msg && <div className="auth-msg" style={{ display: 'block' }}>{msg}</div>}
        {isRegister && (
          <div className="field">
            <label>Seu nome</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como quer ser chamado?" />
          </div>
        )}
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        </div>
        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label>Senha</label>
            {!isRegister && <button onClick={handleForgot} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '.7rem', cursor: 'pointer' }}>Esqueceu?</button>}
          </div>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary" onClick={submit} style={{ width: '100%', justifyContent: 'center' }}>
          {isRegister ? 'Criar Conta' : 'Entrar'}
        </button>
        <div className="auth-toggle">
          {isRegister ? 'Já tem conta?' : 'Novo aqui?'} <button onClick={() => setIsRegister(!isRegister)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>{isRegister ? 'Entrar' : 'Criar conta'}</button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
    Nenhuma frase disponível.
  </div>
);

export default App;
