import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQAState, getQAMessages, startQA, submitAnswer, generateReport } from '../api';
import { Send, CheckCircle, AlertCircle, Loader, Trophy } from 'lucide-react';

const COVERAGE_AREA_NAMES = {
  PROBLEM:'Problem Clarity', MARKET:'Market Sizing', SOLUTION:'Solution Differentiation',
  BUSINESS_MODEL:'Revenue Logic', GTM:'Go-To-Market', TRACTION:'Traction & Validation',
  TEAM:'Team-Market Fit', COMPETITION:'Competitive Moat', ASK:'The Ask',
};

function AreaProgress({ areas }) {
  const covered = areas.filter(a => a.status === 'COVERED').length;
  const total = areas.length;
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Areas Covered</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: covered === total ? 'var(--green)' : 'var(--accent-hi)' }}>{covered} / {total}</span>
      </div>
      <div className="progress-bar mb-3">
        <div className="progress-fill" style={{ width: `${(covered / total) * 100}%` }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {areas.map((a) => (
          <div key={a.areaId} title={a.areaName || COVERAGE_AREA_NAMES[a.areaId] || a.areaId}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: a.status === 'COVERED' ? 'rgba(34,197,94,0.1)' : a.status === 'IN_PROGRESS' ? 'rgba(124,58,237,0.12)' : 'var(--bg-hover)', border: `1px solid ${a.status === 'COVERED' ? 'rgba(34,197,94,0.25)' : a.status === 'IN_PROGRESS' ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px' }}>
            <div className={`area-dot area-${a.status}`} style={{ width: 7, height: 7 }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: a.status === 'COVERED' ? 'var(--green)' : a.status === 'IN_PROGRESS' ? 'var(--accent-hi)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              {(a.areaName || COVERAGE_AREA_NAMES[a.areaId] || a.areaId).split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QA() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [qaState, setQAState] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentArea, setCurrentArea] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [complete, setComplete] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchState = async () => {
    const [stateRes, msgRes] = await Promise.all([getQAState(sessionId), getQAMessages(sessionId)]);
    setQAState(stateRes.data);
    setMessages(msgRes.data.messages);
    setCurrentArea(stateRes.data.currentAreaId);
    if (stateRes.data.isComplete) setComplete(true);
  };

  useEffect(() => {
    fetchState().then(async () => {
      // If no messages yet, kick off the first question
      const msgRes = await getQAMessages(sessionId);
      if (msgRes.data.messages.length === 0) {
        const startRes = await startQA(sessionId);
        if (startRes.data.complete) { setComplete(true); return; }
        setMessages([startRes.data.message]);
        setCurrentArea(startRes.data.areaId);
        setLastQuestion(startRes.data.message.content);
      } else {
        // Find last AI question
        const aiMsgs = msgRes.data.messages.filter(m => m.role === 'ai');
        if (aiMsgs.length > 0) setLastQuestion(aiMsgs[aiMsgs.length - 1].content);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { scrollBottom(); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const answer = input.trim();
    setInput('');
    setSending(true);

    // Optimistic: add user message
    const optimistic = { id: 'opt', role: 'user', content: answer, areaId: currentArea, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await submitAnswer(sessionId, currentArea, answer, lastQuestion);
      const data = res.data;

      // Replace optimistic + add AI response
      const feedbackMsg = data.message;
      setMessages(prev => {
        const withoutOpt = prev.filter(m => m.id !== 'opt');
        const real = { id: Date.now(), role: 'user', content: answer, areaId: currentArea, createdAt: new Date().toISOString() };
        return [...withoutOpt, real, feedbackMsg];
      });

      if (data.sessionComplete) {
        setComplete(true);
      } else if (data.areaComplete && data.nextQuestion) {
        const nextMsg = { id: Date.now() + 1, role: 'ai', content: data.nextQuestion, areaId: data.nextArea?.areaId, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, nextMsg]);
        setCurrentArea(data.nextArea?.areaId);
        setLastQuestion(data.nextQuestion);
      } else if (!data.areaComplete) {
        setLastQuestion(data.pushback || '');
      }

      await fetchState();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'opt'));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await generateReport(sessionId);
      navigate(`/report/${sessionId}`);
    } catch (err) { console.error(err); setGeneratingReport(false); }
  };

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingTop: 60, background: 'var(--bg)' }}>
      {/* Area Progress Header */}
      {qaState && <AreaProgress areas={qaState.qaAreas} />}

      {/* Current area label */}
      {currentArea && !complete && (
        <div style={{ padding: '10px 20px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="area-dot area-IN_PROGRESS" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-hi)' }}>
            Now covering: {COVERAGE_AREA_NAMES[currentArea] || currentArea}
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
            <p className="text-muted">Getting your first question ready...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`chat-bubble ${msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`} style={{ alignSelf: msg.role === 'ai' ? 'flex-start' : 'flex-end' }}>
            {msg.role === 'ai' && msg.aiVerdict && (
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: msg.aiVerdict === 'COVERED' ? 'var(--green)' : msg.aiVerdict === 'PARTIAL' ? 'var(--yellow)' : 'var(--orange)' }}>
                {msg.aiVerdict === 'COVERED' ? '✓ Covered' : msg.aiVerdict === 'PARTIAL' ? '◐ Partial — push back' : '✗ Insufficient — try again'}
              </div>
            )}
            {msg.content}
          </div>
        ))}

        {sending && (
          <div className="chat-bubble chat-bubble-ai flex gap-2 items-center">
            <div className="spinner" /> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Evaluating...</span>
          </div>
        )}

        {/* Complete State */}
        {complete && (
          <div className="card" style={{ textAlign: 'center', padding: '40px', alignSelf: 'stretch', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
            <Trophy size={40} color="var(--green)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8, color: 'var(--green)' }}>All areas covered!</h3>
            <p className="text-muted mb-6">You've addressed every weakness the AI found. Time to see your full improvement report.</p>
            <button id="generate-report-btn" onClick={handleGenerateReport} className="btn btn-primary btn-lg" disabled={generatingReport} style={{ margin: '0 auto' }}>
              {generatingReport ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating Report...</> : <>Generate My Report <Trophy size={16} /></>}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!complete && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10 }}>
            <textarea
              id="qa-answer-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Answer the question... (Enter to send, Shift+Enter for new line)"
              style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '12px 16px', fontSize: '0.9rem', resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none', minHeight: 52, maxHeight: 160 }}
              rows={2}
              disabled={sending}
            />
            <button id="qa-send-btn" onClick={handleSend} disabled={!input.trim() || sending} className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '12px 18px' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
