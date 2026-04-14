import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function QueueRoom() {
    const { showtimeId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get(`/queue/status/${showtimeId}`);
                setStatus(res.data);
                if (res.data.status === 'Active') {
                    // Turn granted! Move to booking
                    navigate(`/book/${res.data.movieId || 'active'}`, { replace: true });
                    // Wait, navigate to the specific booking page but we need movie ID.
                    // Actually, I'll update the API to return the MovieId too.
                }
            } catch (err) {
                console.error("Queue check failed", err);
            } finally {
                setLoading(false);
            }
        };

        const interval = setInterval(checkStatus, 5000); // Check every 5s
        checkStatus();

        return () => clearInterval(interval);
    }, [showtimeId, navigate]);

    if (loading) return <div className="container" style={{color: 'white', padding: '5rem', textAlign: 'center'}}>Entering waiting room...</div>;

    return (
        <main className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div className="queue-glow"></div>
                
                <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#fff' }}>Virtual Waiting Room</h1>
                
                <div className="queue-progress-container">
                    <div className="queue-progress-ring">
                        <div className="queue-number">#{status?.position || '?'}</div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '0.5rem' }}>You are currently in line.</p>
                    <h2 style={{ fontSize: '1.5rem', color: '#60a5fa', marginBottom: '1.5rem' }}>
                        {status?.usersAhead === 0 ? "You're next!" : `${status?.usersAhead} users ahead of you`}
                    </h2>
                </div>

                <div className="queue-meta-grid">
                    <div className="queue-meta-item">
                        <span className="label">ESTIMATED WAIT</span>
                        <span className="value">{status?.estimatedWaitMinutes || '0'} mins</span>
                    </div>
                    <div className="queue-meta-item">
                        <span className="label">STATUS</span>
                        <span className="value" style={{ color: '#10b981' }}>QUEUEING</span>
                    </div>
                </div>

                <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                    Please don't close this window. We'll automatically redirect you when it's your turn.
                </p>

                <button className="btn btn-back" style={{ marginTop: '2rem', opacity: 0.6 }} onClick={() => navigate('/')}>
                    Leave Queue
                </button>
            </div>
        </main>
    );
}
