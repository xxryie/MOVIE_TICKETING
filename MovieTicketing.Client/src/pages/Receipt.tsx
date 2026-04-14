import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

export default function Receipt() {
    const { token } = useParams();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/reservations/receipt/${token}`)
            .then(res => {
                if (res.data.success) {
                    setBooking(res.data.data);
                }
            })
            .catch(err => console.error("Error fetching receipt:", err))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="container" style={{textAlign: 'center', color: 'white', marginTop: '5rem'}}>Validating receipt...</div>;

    if (!booking) return (
        <main className="container" style={{ textAlign: 'center', marginTop: '5rem', color: 'white' }}>
            <h2 style={{color: '#ef4444'}}>Receipt Not Found</h2>
            <p style={{marginTop: '1rem'}}>The token provided is invalid or has expired.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '2rem', display: 'inline-block', textDecoration: 'none' }}>Back to Home</Link>
        </main>
    );

    return (
        <main className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', marginTop: '3rem' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 450, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.8rem 1.5rem', borderRadius: '30px', marginBottom: '1.5rem' }}>
                    <h1 style={{ color: '#a855f7', fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>✓ Booking Confirmed!</h1>
                </div>
                
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>Please present this QR code at the cinema entrance.</p>
                
                <div style={{ background: 'white', padding: '1.2rem', display: 'inline-block', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginBottom: '2.5rem' }}>
                    <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : `https://movie-ticketing-vwdq.vercel.app/receipt/${token}`} size={200} />
                </div>

                <div className="receipt-details" style={{ width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Movie</label>
                        <h3 style={{ margin: '0.2rem 0', color: 'white', fontSize: '1.2rem' }}>{booking.movieTitle}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Showtime</label>
                            <p style={{ margin: '0.2rem 0', color: '#e2e8f0', fontSize: '0.9rem' }}>
                                {new Date(booking.showTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Seats</label>
                            <p style={{ margin: '0.2rem 0', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 700 }}>{booking.seats.join(', ')}</p>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount</label>
                        <p style={{ margin: '0.2rem 0', color: '#a855f7', fontSize: '1.5rem', fontWeight: 800 }}>₱{booking.totalAmount.toLocaleString()}</p>
                    </div>
                </div>
                
                <p style={{ fontFamily: 'monospace', color: '#475569', fontSize: '0.65rem', wordBreak: 'break-all', marginBottom: '1.5rem' }}>Ref: {token}</p>
                
                <Link to="/" className="btn btn-primary" style={{ width: '100%', padding: '1rem', textDecoration: 'none', fontWeight: 700, letterSpacing: '1px' }}>Back to Home</Link>
            </div>
        </main>
    );
}
