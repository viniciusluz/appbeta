import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue, set, get, query, orderByChild, limitToLast, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';

// ── SCREEN: LISTA (INPUT) ──
export const InputScreen = ({ s, setS, isAdmin }) => {
  const [text, setText] = useState(s.list.map(i => `${i.pt} = ${i.en}${i.ph ? ' = '+i.ph : ''}`).join('\n'));
  const [refName, setRefName] = useState(s.reference || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const lines = text.split('\n').filter(l => l.includes('='));
    const items = lines.map(l => {
      const parts = l.split('=').map(p => p.trim());
      return { pt: parts[0], en: parts[1], ph: parts[2] || '' };
    });
    try {
      await set(ref(db, 'sharedList'), { items, reference: refName, updatedAt: Date.now() });
      alert('Lista salva com sucesso para todos!');
    } catch (e) { alert('Erro: ' + e.message); }
    setLoading(false);
  };

  return (
    <div className="card">
      <span className="phase-badge badge-input">📋 Gerenciar Lista</span>
      <div className="field" style={{ marginBottom: '15px' }}>
        <label>Referência da Lista (Série/Filme)</label>
        <input type="text" value={refName} onChange={e => setRefName(e.target.value)} placeholder="Ex: Série: Todo Mundo Odeia o Chris" />
      </div>
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)} 
        placeholder="Português = Inglês = Fonética" 
      />
      <p className="input-hint">Formato: <strong>Português = Inglês = Fonética</strong> — uma frase por linha.</p>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? '⏳ Salvando...' : '☁️ Salvar para o grupo'}
        </button>
      </div>
    </div>
  );
};

// ── SCREEN: QUIZ ──
export const QuizScreen = ({ s, setS, addXP }) => {
  const [current, setCurrent] = useState(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState('');
  const [timer, setTimer] = useState(0);
  const [useTimer, setUseTimer] = useState(false);

  useEffect(() => {
    pickQuestion();
  }, []);

  const pickQuestion = () => {
    if (!s.list.length) return;
    const random = s.list[Math.floor(Math.random() * s.list.length)];
    setCurrent(random);
    setInput('');
    setFeedback(null);
    setHint('');
    if (useTimer) setTimer(15);
  };

  useEffect(() => {
    if (useTimer && timer > 0 && !feedback) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else if (useTimer && timer === 0 && !feedback) {
      checkAnswer(true);
    }
  }, [timer, useTimer, feedback]);

  const checkAnswer = (timeout = false) => {
    if (!current || feedback) return;
    const isCorrect = input.toLowerCase().trim() === current.en.toLowerCase().trim() && !timeout;
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      addXP(15);
      setS(prev => ({ ...prev, qOk: prev.qOk + 1 }));
    } else {
      setS(prev => ({ ...prev, qFail: prev.qFail + 1 }));
    }
  };

  const showHint = () => {
    const words = current.en.split(' ');
    setHint(words.map(w => w[0] + w.slice(1).replace(/[a-z]/gi, '_')).join(' '));
  };

  if (!current) return <div className="card text-center opacity-50">Carregando quiz...</div>;

  return (
    <div className="card">
      <span className="phase-badge badge-quiz">🧠 Fase 3 — Quiz</span>
      {useTimer && <div className={`timer-ring ${timer < 5 ? 'danger' : ''}`}>⏱ <span>{timer}</span>s</div>}
      <div className="flashcard">
        <span className="card-label">🇧🇷 Escreva em inglês:</span>
        <div className="card-pt">{current.pt}</div>
        {s.reference && <div className="card-ref" style={{ display: 'inline-flex' }}>{s.reference}</div>}
      </div>
      <div className="hint-text">{hint}</div>
      <input 
        type="text" 
        className={`answer-input ${feedback}`}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && checkAnswer()}
        placeholder="Digite em inglês…"
        disabled={!!feedback}
      />
      {feedback && (
        <div className={`answer-feedback feedback-${feedback}`} style={{ display: 'block', marginTop: '10px' }}>
          {feedback === 'correct' ? '✅ Excelente!' : `❌ Resposta: ${current.en}`}
        </div>
      )}
      <div className="btn-row">
        {!feedback ? (
          <button className="btn btn-primary" onClick={() => checkAnswer()}>✓ Verificar</button>
        ) : (
          <button className="btn btn-primary" onClick={pickQuestion}>Próxima →</button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={showHint}>💡 Dica</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setUseTimer(!useTimer)}>⏱ Timer {useTimer ? 'ON' : 'OFF'}</button>
      </div>
      <div className="stats-grid" style={{ marginTop: '16px' }}>
        <div className="stat-box"><span className="stat-val">{s.qOk}</span><span className="stat-label">Acertos</span></div>
        <div className="stat-box"><span className="stat-val red">{s.qFail}</span><span className="stat-label">Erros</span></div>
        <div className="stat-box"><span className="stat-val yellow">{Math.round((s.qOk / (s.qOk + s.qFail || 1)) * 100)}%</span><span className="stat-label">Taxa</span></div>
      </div>
    </div>
  );
};

// ── SCREEN: PRONUNCIA ──
export const PronunciaScreen = ({ s, addXP }) => {
  const [current, setCurrent] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    pickItem();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        evaluate(transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const pickItem = () => {
    const item = s.list[Math.floor(Math.random() * s.list.length)];
    setCurrent(item);
    setResult(null);
  };

  const toggleRec = () => {
    if (!recognitionRef.current) return alert('Reconhecimento de voz não suportado neste navegador.');
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setResult(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const evaluate = (transcript) => {
    const target = current.en.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const spoken = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    
    const words = target.split(' ');
    const spokenWords = spoken.split(' ');
    const correctCount = words.filter(w => spokenWords.includes(w)).length;
    const score = Math.round((correctCount / words.length) * 100);

    let type = 'fail';
    if (score >= 80) type = 'ok';
    else if (score >= 50) type = 'warn';

    setResult({ score, text: transcript, type });
    if (score >= 50) addXP(score >= 80 ? 10 : 5);
  };

  const speak = () => {
    const u = new SpeechSynthesisUtterance(current.en);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  if (!current) return <div className="card text-center">Carregando frases...</div>;

  return (
    <div className="card">
      <span className="phase-badge badge-input">🎙️ Modo Pronúncia</span>
      <div className="pronun-card">
        <div className="card-label">🇺🇸 Diga em inglês:</div>
        <div className="pronun-phrase">{current.en}</div>
        <div className="pronun-trans">{current.pt}</div>
        {current.ph && <div className="pronun-ph" style={{ display: 'block' }}>🗣️ {current.ph}</div>}
        <button className="speak-btn" style={{ margin: '0 auto 13px' }} onClick={speak}>🔊 Ouvir</button>
        <button className={`rec-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRec}>
          {isRecording ? '⏹ Parar' : '🎙️ Gravar'}
        </button>
      </div>
      {result && (
        <div className={`pronun-result pronun-${result.type}`} style={{ display: 'block' }}>
          <div className={`score-ring ${result.type === 'fail' ? 'low' : result.type === 'warn' ? 'mid' : ''}`}>
            {result.score}%
          </div>
          <p style={{ textAlign: 'center' }}>Você disse: "{result.text}"</p>
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={pickItem}>Próxima →</button>
      </div>
    </div>
  );
};

// ── SCREEN: RANKING ──
export const RankingScreen = () => {
  const [list, setList] = useState([]);

  useEffect(() => {
    const q = query(ref(db, 'leaderboard'), orderByChild('xp'), limitToLast(20));
    return onValue(q, snap => {
      const data = snap.val();
      if (data) {
        const sorted = Object.values(data).sort((a, b) => b.xp - a.xp);
        setList(sorted);
      }
    });
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <span className="phase-badge badge-rank">🏅 Ranking do Grupo</span>
      </div>
      <div id="lbBody">
        {list.map((u, i) => (
          <div key={i} className={`lb-row ${u.name === auth.currentUser?.displayName ? 'lb-self' : ''}`}>
            <div className="lb-rank">{i + 1}</div>
            <div className="lb-info">
              <span className="lb-name">{u.name}</span>
              <span className="lb-sub">Nv{u.level} • {u.streak} dias</span>
            </div>
            <div className="lb-xp">{u.xp} XP</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SCREEN: PROFILE ──
export const ProfileScreen = ({ user, s }) => {
  const [name, setName] = useState(user.displayName || '');
  const [avatar, setAvatar] = useState(user.photoURL || '');
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name, photoURL: avatar });
      await update(ref(db, `users/${user.uid}/profile`), { name, photo: avatar, updatedAt: Date.now() });
      alert('Perfil atualizado com foto!');
    } catch (e) { alert('Erro: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="card">
      <span className="phase-badge badge-study">👤 Seu Perfil</span>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--accent)', overflow: 'hidden', marginBottom: '10px' }}>
          {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>👤</div>}
        </div>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          📷 Escolher Foto
          <input type="file" hidden accept="image/*" onChange={handleFile} />
        </label>
      </div>

      <div className="field">
        <label>Seu nome de exibição</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como quer ser chamado?" />
      </div>
      
      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Salvando...' : '💾 Salvar Perfil'}
        </button>
      </div>
    </div>
  );
};

// ── REUSABLE REVIEW SCREEN (Updated) ──
export const ReviewScreen = ({ s, setS, addXP }) => {
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    pickReview();
  }, [s.list]);

  const pickReview = () => {
    if (!s.list.length) return;
    const item = s.list[Math.floor(Math.random() * s.list.length)];
    setCurrent(item);
    setFeedback(null);
    
    const cor = item.pt;
    const wr = s.list.filter(i => i.pt !== cor).sort(() => .5 - Math.random()).slice(0, 3).map(i => i.pt);
    setChoices([cor, ...wr].sort(() => .5 - Math.random()));
  };

  const handleAnswer = (c) => {
    if (feedback) return;
    const isCorrect = c === current.pt;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      addXP(10);
      setS(prev => ({ ...prev, revOk: prev.revOk + 1 }));
    } else {
      setS(prev => ({ ...prev, revFail: prev.revFail + 1 }));
    }
  };

  if (!current) return <div className="card text-center">Carregando...</div>;

  return (
    <div className="card">
      <span className="phase-badge badge-review">🔁 Fase 2 — Revisão</span>
      <div className="flashcard">
        <span className="card-label">🇺🇸 Tradução em português?</span>
        <div className="card-en">{current.en}</div>
      </div>
      <div className="choices-grid">
        {choices.map((c, i) => (
          <button key={i} className={`choice-btn ${feedback && c === current.pt ? 'correct-choice' : ''}`} onClick={() => handleAnswer(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="btn-row">
        {feedback && <button className="btn btn-primary" onClick={pickReview}>Próxima →</button>}
      </div>
    </div>
  );
};

export const ProgressScreen = ({ s }) => {
  const currentLevel = { name: 'Iniciante' }; // Simplificado para o exemplo
  const totalItems = s.list.length;
  const accuracy = Math.round((s.qOk / (s.qOk + s.qFail || 1)) * 100);

  return (
    <div className="card">
      <span className="phase-badge badge-study">📊 Seu Progresso</span>
      <h2 className="section-title">Estatísticas pessoais</h2>
      <div className="stats-grid">
        <div className="stat-box"><span className="stat-val">{s.qOk + s.revOk}</span><span className="stat-label">Acertos</span></div>
        <div className="stat-box"><span className="stat-val red">{s.qFail + s.revFail}</span><span className="stat-label">Erros</span></div>
        <div className="stat-box"><span className="stat-val yellow">{accuracy}%</span><span className="stat-label">Taxa</span></div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '.76rem', color: 'var(--muted)', lineHeight: '2.1' }}>
        <div>📋 Frases: <strong style={{ color: 'var(--text)' }}>{totalItems}</strong></div>
        <div>🔥 Streak: <strong style={{ color: 'var(--accent3)' }}>{s.streak} dias</strong></div>
        <div>⚡ XP Total: <strong style={{ color: 'var(--accent)' }}>{s.xp}</strong></div>
        <div>🏆 Nível: <strong style={{ color: 'var(--accent)' }}>{s.level}</strong></div>
      </div>
    </div>
  );
};
