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
                    if (res.data.movieId) {
                        navigate(`/book/${res.data.movieId}?queue_showtime=${showtimeId}`, { replace: true });
                    } else {
                        console.warn("Turn active but MovieId missing. Retrying...");
                    }
                }
            } catch (err) {
                console.error("Queue check failed", err);
            } finally {
                setLoading(false);
            }
        };

        const interval = setInterval(checkStatus, 5000);
        checkStatus();

        return () => clearInterval(interval);
    }, [showtimeId, navigate]);

    if (loading) return (
        <div
            className="container"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E8BCB9',
                background: 'linear-gradient(135deg,#1D1A39,#451952,#662549)'
            }}
        >
            Entering waiting room...
        </div>
    );

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -1,
                    background: 'linear-gradient(135deg,#1D1A39 0%,#2a1033 25%,#451952 50%,#662549 75%,#AF445A 100%)'
                }}
            />

            <main
                className="container"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E8BCB9'
                }}
            >
                <div
                    className="glass-panel"
                    style={{
                        maxWidth: '520px',
                        width: '100%',
                        padding: '3rem',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'rgba(29,26,57,0.65)',
                        border: '1px solid rgba(232,188,185,0.12)',
                        backdropFilter: 'blur(18px)',
                        borderRadius: '20px',
                        boxShadow: '0 25px 70px rgba(0,0,0,0.5)'
                    }}
                >

                    {/* glow effect */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '-50%',
                            background: 'radial-gradient(circle, rgba(245,159,89,0.15), transparent 60%)',
                            animation: 'pulse 4s infinite'
                        }}
                    />

                    <h1
                        style={{
                            fontSize: '1.8rem',
                            marginBottom: '1.5rem',
                            color: '#F59F59',
                            letterSpacing: '1px'
                        }}
                    >
                        Virtual Waiting Room
                    </h1>

                    <div className="queue-progress-container">
                        <div
                            className="queue-progress-ring"
                            style={{
                                width: '140px',
                                height: '140px',
                                margin: '0 auto',
                                borderRadius: '50%',
                                border: '2px solid rgba(245,159,89,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(17,12,34,0.4)',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 0 30px rgba(245,159,89,0.15)'
                            }}
                        >
                            <div
                                className="queue-number"
                                style={{
                                    fontSize: '2.2rem',
                                    fontWeight: '800',
                                    color: '#F59F59'
                                }}
                            >
                                #{status?.position || '?'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <p style={{ color: '#E8BCB9', opacity: 0.7, fontSize: '1rem' }}>
                            You are currently in line
                        </p>

                        <h2
                            style={{
                                fontSize: '1.4rem',
                                color: '#F59F59',
                                marginTop: '0.5rem',
                                marginBottom: '1.5rem'
                            }}
                        >
                            {status?.usersAhead === 0
                                ? "You're next"
                                : `${status?.usersAhead} users ahead of you`}
                        </h2>
                    </div>

                    <div
                        className="queue-meta-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            marginTop: '1.5rem'
                        }}
                    >
                        <div
                            className="queue-meta-item"
                            style={{
                                background: 'rgba(17,12,34,0.5)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(232,188,185,0.12)'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>EST. WAIT</span>
                            <div style={{ color: '#F59F59', fontSize: '1.2rem', fontWeight: 700 }}>
                                {status?.estimatedWaitMinutes || '0'} mins
                            </div>
                        </div>

                        <div
                            className="queue-meta-item"
                            style={{
                                background: 'rgba(17,12,34,0.5)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(232,188,185,0.12)'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>STATUS</span>
                            <div style={{ color: '#10b981', fontWeight: 700 }}>
                                QUEUEING
                            </div>
                        </div>
                    </div>

                    <p
                        style={{
                            marginTop: '2rem',
                            fontSize: '0.85rem',
                            color: '#E8BCB9',
                            opacity: 0.6,
                            fontStyle: 'italic'
                        }}
                    >
                        Please don't close this window. You'll be redirected automatically.
                    </p>

                    <button
                        className="btn btn-back"
                        style={{
                            marginTop: '2rem',
                            opacity: 0.9,
                            color: '#E8BCB9',
                            border: '1px solid rgba(232,188,185,0.2)',
                            background: 'rgba(29,26,57,0.4)',
                            backdropFilter: 'blur(10px)'
                        }}
                        onClick={() => navigate('/')}
                    >
                        Leave Queue
                    </button>

                </div>
            </main>
        </>
    );
}