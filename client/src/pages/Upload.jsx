import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadDeck, startAnalysis } from '../api';
import { Upload as UploadIcon, FileText, X, CheckCircle, Loader, ArrowRight, AlertCircle } from 'lucide-react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle|uploading|segmenting|analyzing|error
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setDeckName(f.name.replace('.pdf', ''));
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, maxSize: 20 * 1024 * 1024,
    onDropRejected: () => setError('Please upload a PDF under 20MB'),
  });

  const handleSubmit = async () => {
    if (!file) return;
    setError('');
    try {
      setStage('uploading');
      const uploadRes = await uploadDeck(file, deckName || file.name, setProgress);
      const { sessionId } = uploadRes.data;

      setStage('analyzing');
      await startAnalysis(sessionId);

      navigate(`/analysis/${sessionId}`);
    } catch (err) {
      setStage('error');
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  const stageLabel = { uploading: 'Uploading & parsing PDF...', segmenting: 'Gemini is segmenting your slides...', analyzing: 'AI is analyzing each slide...' };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 8 }}>Upload Your Deck</h2>
          <p>Drop in your pitch deck PDF. Gemini will segment and analyze it slide by slide.</p>
        </div>

        {/* Dropzone */}
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} id="deck-dropzone">
          <input {...getInputProps()} id="deck-file-input" />
          {file ? (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '12px 20px', marginBottom: 12 }}>
                <FileText size={20} color="var(--accent-hi)" />
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setDeckName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
              <p className="text-muted text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB — click to swap file</p>
            </div>
          ) : (
            <>
              <div style={{ width: 56, height: 56, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <UploadIcon size={24} color="var(--accent-hi)" />
              </div>
              <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
                {isDragActive ? 'Drop it here' : 'Drag & drop your pitch deck'}
              </p>
              <p className="text-muted text-sm">PDF up to 20MB · or click to browse</p>
            </>
          )}
        </div>

        {/* Deck Name */}
        {file && (
          <div className="mt-4 fade-up">
            <label className="label">Deck Name</label>
            <input
              id="deck-name-input"
              className="input" value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="e.g. Hive Seed Round Deck v3"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px' }}>
            <AlertCircle size={15} color="var(--red)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>{error}</span>
          </div>
        )}

        {/* Progress / Submit */}
        {stage !== 'idle' && stage !== 'error' ? (
          <div className="card mt-6" style={{ textAlign: 'center' }}>
            <div className="flex items-center gap-3 justify-center" style={{ marginBottom: 16 }}>
              <Loader size={18} color="var(--accent-hi)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: 600, color: 'var(--accent-hi)' }}>{stageLabel[stage]}</span>
            </div>
            {stage === 'uploading' && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}
            {(stage === 'segmenting' || stage === 'analyzing') && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
          </div>
        ) : (
          file && (
            <button id="upload-submit" onClick={handleSubmit} className="btn btn-primary btn-lg w-full mt-6" style={{ justifyContent: 'center' }}>
              Analyze Deck <ArrowRight size={18} />
            </button>
          )
        )}

        {/* What happens next */}
        <div className="card mt-6" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
          <p className="label">What happens next</p>
          {['Gemini reads your PDF and intelligently segments it into slides', 'Each slide is scored using a VC/PM evaluation framework', 'Weak areas trigger a structured Q&A grilling session', 'You get a prioritized action report at the end'].map((step, i) => (
            <div key={i} className="flex gap-3 items-center" style={{ marginTop: 12 }}>
              <span style={{ width: 22, height: 22, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-hi)', flexShrink: 0 }}>{i+1}</span>
              <span className="text-sm text-muted">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
