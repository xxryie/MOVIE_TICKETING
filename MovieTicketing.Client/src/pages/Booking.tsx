import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function Booking() {
    const { movieId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const filterDate = searchParams.get('date');

    const [movie, setMovie] = useState<any>(null);
    const [showtimes, setShowtimes] = useState<any[]>([]);
    const [selectedShowtime, setSelectedShowtime] = useState<any>(null);
    const [seats, setSeats] = useState<any[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [step, setStep] = useState(1); // 1 = Showtime, 2 = Seats, 3 = Payment Modal
    const [paymentMethod, setPaymentMethod] = useState('gcash');
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        // Fetch specific movie data
        api.get('/movies').then(res => {
            const found = res.data.data.find((m: any) => m.id === Number(movieId));
            if (found) {
                setMovie(found);
                let availableShowtimes = found.showtimes || [];
                
                // If a date filter is passed from homepage, filter showtimes
                if (filterDate) {
                    availableShowtimes = availableShowtimes.filter((st: any) => st.showTime.startsWith(filterDate));
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

    const handleShowtimeClick = async (st: any) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in or create an account to continue with reservation.");
            navigate('/login');
            return;
        }

        try {
            const res = await api.post(`/queue/join/${st.id}`);
            if (res.data.status === 'Waiting') {
                navigate(`/queue/${st.id}`);
                return;
            }
            // If Active, proceed
            setSelectedShowtime(st);
            loadSeats(st.id);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to join booking queue.");
        }
    };

    // Queue Heartbeat while in seat selection
    useEffect(() => {
        if (step === 2 && selectedShowtime) {
            const interval = setInterval(() => {
                api.post(`/queue/heartbeat/${selectedShowtime.id}`).catch(() => {
                    alert("Your booking session has expired.");
                    setStep(1);
                    setSelectedShowtime(null);
                });
            }, 30000); // Heartbeat every 30s
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
                // Release queue session
                api.post(`/queue/exit/${selectedShowtime.id}`).catch(() => {});
                
                alert('Booking Confirmed!');
                navigate(`/receipt/${res.data.receipt_token}`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Booking failed');
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        let videoId = "";
        
        // Handle standard youtube.com/watch?v=ID
        if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1].split("&")[0];
        } 
        // Handle youtu.be/ID
        else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        }
        // Handle already-embed links but ensure params
        else if (url.includes("youtube.com/embed/")) {
            videoId = url.split("embed/")[1].split("?")[0];
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;
        }
        return url; // fallback
    };

    if (!movie) return <div className="container" style={{color:'white', padding: '5rem', textAlign: 'center'}}>Loading movie details...</div>;

    return (
        <main className="container">
            {step === 1 && (
                <section className="step-section active">
                    <button className="btn btn-back" onClick={() => navigate('/')}>← Back</button>
                    <div className="movie-details-container glass-panel">
                        <div className="movie-details-grid">
                            <div className="movie-poster-large">
                                <img id="detail-poster" src={movie.posterUrl} alt="Movie Poster" />
                            </div>
                            <div className="movie-info-large">
                                <h2 id="detail-title">{movie.title}</h2>
                                <div className="movie-meta" id="detail-meta">
                                    {movie.durationMinutes} mins • {movie.genre} {movie.director ? `• Dir: ${movie.director}` : ''}
                                </div>
                                <p className="movie-desc" id="detail-desc">{movie.synopsis}</p>
                                <div className="movie-cast" id="detail-cast">
                                    <strong>Cast:</strong> <span>{movie.cast || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="movie-trailer-container">
                                {movie.trailerUrl ? (
                                    <iframe 
                                        id="detail-trailer" 
                                        src={getEmbedUrl(movie.trailerUrl)} 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <div style={{color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px solid #334155', borderRadius: '12px'}}>No Trailer Available</div>
                                )}
                            </div>
                        </div>
                    </div>
                    <h3 style={{marginTop: '2.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', fontSize: '1.5rem', fontWeight: 'bold'}}>Select Showtime</h3>
                    
                    {['Standard', 'IMAX', 'Directors Club'].map(type => {
                        const typeShowtimes = showtimes.filter(s => (s.cinemaType || 'Standard') === type);
                        if (typeShowtimes.length === 0) return null;

                        return (
                            <div key={type} style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                                    <h4 style={{ color: type === 'IMAX' ? '#60a5fa' : type === 'Directors Club' ? '#fbbf24' : '#94a3b8', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: `4px solid ${type === 'IMAX' ? '#60a5fa' : type === 'Directors Club' ? '#fbbf24' : '#64748b'}`, paddingLeft: '0.8rem' }}>
                                        {type === 'Directors Club' ? "Director's Club" : type}
                                    </h4>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                </div>
                                
                                <div className="showtime-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.2rem' }}>
                                    {typeShowtimes.map(st => (
                                        <div 
                                            key={st.id} 
                                            className="showtime-card available" 
                                            onClick={() => handleShowtimeClick(st)}
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '16px',
                                                padding: '1.5rem 1rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-5px)';
                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(216, 180, 254, 0.15)';
                                                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                                                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)';
                                            }}
                                        >
                                            <div className="st-time" style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.4rem', letterSpacing: '1px' }}>
                                                {new Date(st.showTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                            <div className="st-date" style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600' }}>
                                                {new Date(st.showTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div style={{ marginTop: '1rem', fontSize: '0.75rem', background: 'rgba(216, 180, 254, 0.15)', color: '#e9d5ff', padding: '0.3rem 0.8rem', borderRadius: '20px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                                AVAILABLE
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {step === 2 && (
                <section className="step-section active">
                    <button className="btn btn-back" onClick={() => setStep(1)}>← Back to Showtimes</button>
                    
                    <div className="booking-header">
                        <h2>Select Your Seats</h2>
                        <div className="stats">
                            <span id="remaining-seats-badge" className="badge">{seats.filter(s => s.status === 'available').length} Seats Available</span>
                        </div>
                    </div>

                    <div className={`cinema-room ${selectedShowtime?.cinemaType === 'IMAX' ? 'imax-room' : selectedShowtime?.cinemaType === 'Directors Club' ? 'directors-club-room' : 'standard-room'}`}>
                        <div className="screen-curve">
                            {selectedShowtime?.cinemaType === 'IMAX' ? 'IMAX SCREEN' : selectedShowtime?.cinemaType === 'Directors Club' ? "DIRECTOR'S SCREEN" : 'Screen'}
                        </div>
                        <div className="seat-map-scroll-container">
                            <div className="seat-map" id="seat-map" style={{ 
                                gridTemplateColumns: selectedShowtime?.cinemaType === 'IMAX' 
                                    ? `repeat(6, 1fr) 40px repeat(6, 1fr)` 
                                    : `repeat(${Math.max(...seats.map(s => s.seatCol), 1)}, 1fr)` 
                            }}>
                                {Array.from(new Set(seats.map(s => s.seatRow))).map(row => (
                                    <div key={row} style={{display: 'contents'}}>
                                        <div className="seat-row-label">Row {row}</div>
                                        {seats.filter(s => s.seatRow === row).map((seat) => {
                                            const isSelected = selectedSeats.includes(seat.id);
                                            const isImax = selectedShowtime?.cinemaType === 'IMAX';
                                            return (
                                                <>
                                                    {/* Add aisle spacer after column 6 for IMAX */}
                                                    {isImax && seat.seatCol === 7 && <div key={`aisle-${row}`} className="aisle-spacer"></div>}
                                                    <div 
                                                        key={seat.id} 
                                                        className={`seat ${seat.status} ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => toggleSeat(seat.id, seat.status)}
                                                    >
                                                        {seat.seatCol}
                                                    </div>
                                                </>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="legend">
                        <div className="legend-item"><div className="seat available"></div> Available</div>
                        <div className="legend-item"><div className="seat selected"></div> Selected</div>
                        <div className="legend-item"><div className="seat reserved"></div> Reserved</div>
                    </div>

                    <div className="action-bar glass-panel sticky-action-bar">
                        <p>Selected: <strong>{selectedSeats.length}</strong> seat(s) &nbsp;|&nbsp; Total: <strong style={{color:'var(--primary)'}}>₱{(selectedSeats.length * (movie.price || 250)).toFixed(2)}</strong></p>
                        <button id="btn-reserve" className="btn btn-primary" onClick={() => setStep(3)} disabled={selectedSeats.length === 0}>Confirm Reservation →</button>
                    </div>
                </section>
            )}


            {step === 3 && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box glass-panel">
                        <h2>💳 Payment Summary</h2>
                        <div className="payment-details" style={{ textAlign: 'left', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ margin: '0.5rem 0' }}><strong>Movie:</strong> <span>{movie.title}</span></p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Showtime:</strong> <span>{new Date(selectedShowtime.showTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Seats:</strong> <span>{selectedSeats.length} seat(s)</span></p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Total Amount:</strong> <span style={{color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700}}>₱{(selectedSeats.length * (movie.price || 250)).toFixed(2)}</span></p>
                        </div>
                        <div className="form-group" style={{marginTop: '1rem'}}>
                            <label>Payment Method</label>
                            <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="gcash">GCash</option>
                                <option value="credit_card">Credit Card</option>
                            </select>
                        </div>
                        {paymentMethod === 'gcash' && (
                            <div className="form-group">
                                <label>Reference No.</label>
                                <input type="text" className="form-control" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
                            </div>
                        )}
                        <div className="modal-actions" style={{marginTop: '1rem'}}>
                            <button className="btn btn-back" onClick={() => setStep(2)}>Cancel</button>
                            <button className="btn btn-primary" onClick={submitPayment}>Pay Now</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
