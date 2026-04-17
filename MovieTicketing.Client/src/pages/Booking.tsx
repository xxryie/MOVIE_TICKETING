import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function Booking() {
    const { movieId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const filterDate = searchParams.get('date');
    const queueShowtimeId = searchParams.get('queue_showtime');

    const [movie, setMovie] = useState<any>(null);
    const [showtimes, setShowtimes] = useState<any[]>([]);
    const [selectedShowtime, setSelectedShowtime] = useState<any>(null);
    const [seats, setSeats] = useState<any[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('gcash');
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        api.get('/movies').then(res => {
            const found = res.data.data.find((m: any) => m.id === Number(movieId));
            if (found) {
                setMovie(found);
                let availableShowtimes = found.showtimes || [];

                if (filterDate) {
                    availableShowtimes = availableShowtimes.filter((st: any) =>
                        st.showTime.startsWith(filterDate)
                    );
                }

                setShowtimes(availableShowtimes);
            }
        });
    }, [movieId, filterDate]);

    const loadSeats = (stId: number) => {
        api.get(`/seats/${stId}`).then(res => {
            setSeats(res.data.data);
            setStep(2);
        });
    };

    useEffect(() => {
        if (showtimes.length > 0 && queueShowtimeId && !selectedShowtime) {
            const st = showtimes.find((s: any) => s.id === Number(queueShowtimeId));
            if (st) {
                setSelectedShowtime(st);
                loadSeats(st.id);
            }
        }
    }, [showtimes, queueShowtimeId, selectedShowtime]);

    const handleShowtimeClick = async (st: any) => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const res = await api.post(`/queue/join/${st.id}`);
            if (res.data.status === 'Waiting') {
                navigate(`/queue/${st.id}`);
                return;
            }
            setSelectedShowtime(st);
            loadSeats(st.id);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to join booking queue.");
        }
    };

    useEffect(() => {
        if (step === 2 && selectedShowtime) {
            const interval = setInterval(() => {
                api.post(`/queue/heartbeat/${selectedShowtime.id}`).catch(() => {
                    alert("Your booking session has expired.");
                    setStep(1);
                    setSelectedShowtime(null);
                });
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [step, selectedShowtime]);

    const toggleSeat = (seatId: number, status: string) => {
        if (status !== 'available') return;
        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(selectedSeats.filter(id => id !== seatId));
        } else {
            setSelectedSeats([...selectedSeats, seatId]);
        }
    };

    const submitPayment = async () => {
        try {
            const res = await api.post('/reservations', {
                showtimeId: selectedShowtime.id,
                seatIds: selectedSeats,
                paymentMethod,
                paymentRef
            });

            if (res.data.success) {
                api.post(`/queue/exit/${selectedShowtime.id}`).catch(() => {});
                navigate(`/receipt/${res.data.receipt_token}`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Booking failed');
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        let videoId = "";

        if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1].split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        } else if (url.includes("youtube.com/embed/")) {
            videoId = url.split("embed/")[1].split("?")[0];
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;
        }
        return url;
    };

    if (!movie) return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E8BCB9',
            background: 'linear-gradient(135deg,#1D1A39,#451952,#662549)'
        }}>
            Loading movie details...
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

            <main className="container" style={{ color: '#E8BCB9' }}>

                {step === 1 && (
                    <section className="step-section active">

                        <button
                            className="btn btn-back"
                            onClick={() => navigate('/')}
                            style={{
                                color: '#F59F59',
                                border: '1px solid rgba(245,159,89,0.3)',
                                background: 'rgba(29,26,57,0.5)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            ← Back
                        </button>

                        <div
                            className="movie-details-container glass-panel"
                            style={{
                                background: 'rgba(29,26,57,0.65)',
                                border: '1px solid rgba(232,188,185,0.12)',
                                backdropFilter: 'blur(16px)',
                                borderRadius: '18px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                                padding: '1.5rem'
                            }}
                        >

                            <div className="movie-details-grid">

                                <div className="movie-poster-large">
                                    <img src={movie.posterUrl} />
                                </div>

                                <div className="movie-info-large">

                                    <h2 style={{ color: '#F59F59', marginBottom: '0.8rem' }}>
                                        {movie.title}
                                    </h2>

                                    {/* PREMIUM META LINE */}
                                    <div
                                        className="movie-meta"
                                        style={{
                                            fontSize: '0.95rem',
                                            opacity: 0.9,
                                            lineHeight: '1.8',
                                            letterSpacing: '0.3px',
                                            marginBottom: '1rem'
                                        }}
                                    >
                                        {movie.durationMinutes} mins • {movie.genre} {movie.director ? `• Dir: ${movie.director}` : ''}
                                    </div>

                                    {/* SYNOPSIS SPACED */}
                                    <p
                                        style={{
                                            lineHeight: '1.8',
                                            fontSize: '0.95rem',
                                            opacity: 0.95,
                                            marginBottom: '1.2rem'
                                        }}
                                    >
                                        {movie.synopsis}
                                    </p>

                                    {/* CAST SECTION CLEAN */}
                                    <div
                                        style={{
                                            paddingTop: '0.8rem',
                                            borderTop: '1px solid rgba(232,188,185,0.12)',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <strong style={{ color: '#F59F59' }}>Cast:</strong>{' '}
                                        <span style={{ opacity: 0.9 }}>
                                            {movie.cast || 'N/A'}
                                        </span>
                                    </div>

                                </div>

                                <div className="movie-trailer-container">
                                    {movie.trailerUrl ? (
                                        <iframe
                                            src={getEmbedUrl(movie.trailerUrl)}
                                            allowFullScreen
                                            style={{
                                                borderRadius: '12px',
                                                border: '1px solid rgba(232,188,185,0.15)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ color: '#F59F59' }}>
                                            No Trailer Available
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                        <h3 style={{
                            marginTop: '2.5rem',
                            color: '#F59F59',
                            borderBottom: '1px solid rgba(232,188,185,0.1)',
                            paddingBottom: '0.8rem'
                        }}>
                            Select Showtime
                        </h3>

                        {['Standard', 'IMAX', 'Directors Club'].map(type => {
                            const typeShowtimes = showtimes.filter(s => (s.cinemaType || 'Standard') === type);
                            if (!typeShowtimes.length) return null;

                            return (
                                <div key={type} style={{ marginBottom: '2rem' }}>
                                    <h4 style={{
                                        color: '#E8BCB9',
                                        borderLeft: '4px solid #F59F59',
                                        paddingLeft: '10px'
                                    }}>
                                        {type}
                                    </h4>

                                    <div className="showtime-grid">

                                        {typeShowtimes.map(st => (
                                            <div
                                                key={st.id}
                                                className="showtime-card available"
                                                onClick={() => handleShowtimeClick(st)}
                                                style={{
                                                    background: 'rgba(29,26,57,0.55)',
                                                    border: '1px solid rgba(232,188,185,0.12)',
                                                    borderRadius: '16px',
                                                    backdropFilter: 'blur(12px)',
                                                    padding: '1.5rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ color: '#F59F59', fontSize: '1.5rem' }}>
                                                    {new Date(st.showTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                <div>
                                                    {new Date(st.showTime).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}

                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

            </main>
        </>
    );
}