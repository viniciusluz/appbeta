import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MISSIONS } from '../data/missions';
import { callAI, getCorrections } from '../services/aiService';

const TravelMode = ({ addXP }) => {
  const [mission, setMission] = useState(null);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('travel_api_key') || '');
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('ai_provider') || 'gemini');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const startMission = (m) => {
    setMission(m);
    const initialHistory = [
      { role: 'system', content: m.prompt },
      { role: 'npc', content: 'Hello! Welcome. How can I help you today?' }
    ];
    setHistory(initialHistory);
    setFeedback(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) {
      alert('Por favor, configure sua API Key nas configurações.');
      return;
    }

    const userMessage = { role: 'user', content: input };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await callAI(aiProvider, apiKey, newHistory, mission.prompt);
      setHistory(prev => [...prev, { role: 'npc', content: response }]);
    } catch (e) {
      setHistory(prev => [...prev, { role: 'npc', content: `Erro: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const endMission = async () => {
    if (!confirm('Deseja encerrar a missão e ver as correções?')) return;
    setLoading(true);
    try {
      const corrections = await getCorrections(aiProvider, apiKey, history);
      setFeedback(corrections);
      addXP(50);
    } catch (e) {
      alert('Erro ao gerar correções: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = (key, provider) => {
    setApiKey(key);
    setAiProvider(provider);
    localStorage.setItem('travel_api_key', key);
    localStorage.setItem('ai_provider', provider);
  };

  if (feedback) return (
    <div className="card">
      <span className="phase-badge badge-review">✈️ Relatório da Viagem</span>
      <div className="feedback-card">
        {feedback.map((f, i) => (
          <div key={i} className="feedback-item">
            <div className="original-text">Você disse: "{f.original}"</div>
            <div className="native-text">Como um nativo diria: "{f.native}"</div>
            <div className="feedback-expl">{f.explanation}</div>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button onClick={() => setMission(null)} className="btn btn-primary">Voltar ao Início</button>
      </div>
    </div>
  );

  if (mission) return (
    <div className="card">
      <span className="phase-badge badge-review">✈️ Modo Viagem</span>
      <div className="travel-mission-card">
        <div className="mission-obj-badge">{mission.city}, {mission.country}</div>
        <div className="mission-title" style={{ fontFamily: 'var(--mono)', letterSpacing: '1px', fontSize: '1.4rem' }}>{mission.title}</div>
        <div className="mission-desc">{mission.scenario}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <span className={`difficulty-pill diff-${mission.diff.toLowerCase()}`}>{mission.diff}</span>
          <button className="btn btn-danger btn-sm" onClick={endMission}>🏁 Encerrar Missão</button>
        </div>
      </div>

      <div className="chat-container" id="travelChat">
        {history.filter(h => h.role !== 'system').map((h, i) => (
          <div key={i} className={`chat-bubble ${h.role === 'npc' ? 'bubble-npc' : 'bubble-user'}`}>
            <span className="bubble-meta">{h.role === 'npc' ? 'Personagem' : 'Você'}</span>
            {h.content}
          </div>
        ))}
        {loading && <div className="chat-bubble bubble-npc"><span className="bubble-meta">Personagem</span>...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="travel-input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="Digite sua resposta em inglês..."
          className="travel-input"
        />
        <button onClick={handleSendMessage} className="btn btn-primary" disabled={loading}>Enviar ➔</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <span className="phase-badge badge-review">✈️ Modo Viagem (Beta)</span>
      <h2 className="section-title">Escolha sua missão</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {MISSIONS.map(m => (
          <div key={m.id} className="travel-mission-card" style={{ cursor: 'pointer' }} onClick={() => startMission(m)}>
            <div className="mission-obj-badge">{m.city}, {m.country}</div>
            <div className="mission-title" style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem' }}>{m.title}</div>
            <div className="mission-desc">{m.scenario}</div>
            <div style={{ marginTop: '12px' }}><span className={`difficulty-pill diff-${m.diff.toLowerCase()}`}>{m.diff}</span></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '8px' }}>CONFIGURAÇÃO DE IA</label>
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <select value={aiProvider} onChange={e => saveSettings(apiKey, e.target.value)} className="voice-select" style={{ maxWidth: '100%' }}>
            <option value="gemini">Google Gemini (Flash)</option>
            <option value="groq">Groq (Llama 3.1)</option>
          </select>
          <input 
            type="password" 
            value={apiKey}
            onChange={e => saveSettings(e.target.value, aiProvider)}
            placeholder="Sua API Key..." 
            className="field input" 
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TravelMode;
