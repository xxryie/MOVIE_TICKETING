import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Home() {
    const navigate = useNavigate();
    const [movies, setMovies] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'now_showing' | 'coming_soon'>('now_showing');
    const [dateOffset, setDateOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        api.get('/movies').then(res => {
            if (res.data.success) {
                setMovies(res.data.data);
            }
        });
    }, []);

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dateOffset);
    const today = new Date();
    today.setHours(0,0,0,0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        dates.push(d);
    }

    const filteredMovies = movies.filter(m => {
        if (m.status !== activeTab) return false;
        if (activeTab === 'now_showing') {
            return m.showtimes && m.showtimes.some((st: any) => st.showTime.startsWith(selectedDate));
        }
        return true;
    });

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -1,
                    background: 'linear-gradient(135deg, #1D1A39 0%, #2a1033 25%, #451952 50%, #662549 75%, #AF445A 100%)'
                }}
            />

            <main
                className="container"
                style={{
                    minHeight: '100vh',
                    color: '#E8BCB9'
                }}
            >
                <section className="step-section active">

                    <div className="main-tabs-container">
                        <div className="main-tabs" style={{ background: 'rgba(29, 26, 57, 0.55)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '6px' }}>
                            <button
                                className={`main-tab ${activeTab === 'now_showing' ? 'active' : ''}`}
                                onClick={() => setActiveTab('now_showing')}
                                style={{
                                    background: activeTab === 'now_showing' ? 'linear-gradient(135deg,#F59F59,#AF445A)' : 'transparent',
                                    color: '#E8BCB9',
                                    border: '1px solid rgba(232,188,185,0.15)'
                                }}
                            >
                                Now showing
                            </button>

                            <button
                                className={`main-tab ${activeTab === 'coming_soon' ? 'active' : ''}`}
                                onClick={() => setActiveTab('coming_soon')}
                                style={{
                                    background: activeTab === 'coming_soon' ? 'linear-gradient(135deg,#F59F59,#662549)' : 'transparent',
                                    color: '#E8BCB9',
                                    border: '1px solid rgba(232,188,185,0.15)'
                                }}
                            >
                                Coming soon
                            </button>
                        </div>
                    </div>

                    {activeTab === 'now_showing' && (
                        <div className="calendar-wrapper">

                            <button
                                className="calendar-nav"
                                disabled={dateOffset <= 0}
                                onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
                                style={{ color: '#F59F59' }}
                            >
                                &#10094;
                            </button>

                            <div className="date-picker-list">
                                {dates.map((d, index) => {
                                    const dStr = d.toISOString().split('T')[0];
                                    const isTodayDate = d.toDateString() === today.toDateString();
                                    const dayName = isTodayDate && dateOffset === 0 ? 'TODAY' : d.toLocaleDateString('en-PH', { weekday: 'short' });

                                    const hasMovies = movies.some(m => m.status === 'now_showing' && m.showtimes && m.showtimes.some((st: any) => st.showTime.startsWith(dStr)));
                                    const isDimmed = !hasMovies && selectedDate !== dStr;
                                    const isActive = selectedDate === dStr;

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedDate(dStr)}
                                            className={`date-item ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}`}
                                            style={{
                                                background: isActive
                                                    ? 'linear-gradient(135deg,#F59F59,#AF445A)'
                                                    : 'rgba(29, 26, 57, 0.55)',
                                                border: '1px solid rgba(232,188,185,0.12)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#E8BCB9'
                                            }}
                                        >
                                            <span className="day-name">{dayName}</span>
                                            <span className="day-number" style={{ color: '#F59F59' }}>{d.getDate()}</span>
                                            <span className="month-name">{d.toLocaleDateString('en-PH', { month: 'short' })}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className="calendar-nav"
                                onClick={() => setDateOffset(dateOffset + 7)}
                                style={{ color: '#F59F59' }}
                            >
                                &#10095;
                            </button>
                        </div>
                    )}

                    <div className="main-tab-content active">

                        {filteredMovies.length === 0 ? (
                            <div
                                className="empty-state"
                                style={{
                                    gridColumn: '1/-1',
                                    textAlign: 'center',
                                    padding: '3rem',
                                    color: '#E8BCB9'
                                }}
                            >
                                <p style={{ fontSize: '1.2rem', color: '#F59F59' }}>
                                    No movies available for this date. 🎬
                                </p>
                            </div>
                        ) : (
                            <div className="movie-grid">

                                {filteredMovies.map(movie => (
                                    <div
                                        key={movie.id}
                                        className="movie-card"
                                        onClick={() => navigate(`/book/${movie.id}?date=${selectedDate}`)}
                                        style={{
                                            background: 'rgba(29, 26, 57, 0.65)',
                                            border: '1px solid rgba(232,188,185,0.12)',
                                            backdropFilter: 'blur(14px)',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                                            color: '#E8BCB9'
                                        }}
                                    >

                                        <div className="movie-poster">
                                            <img src={movie.posterUrl} alt={movie.title} />
                                            <div
                                                className={`badge ${activeTab === 'now_showing' ? 'badge-showing' : 'badge-soon'}`}
                                                style={{
                                                    background: activeTab === 'now_showing'
                                                        ? 'linear-gradient(135deg,#F59F59,#AF445A)'
                                                        : 'linear-gradient(135deg,#662549,#451952)',
                                                    color: '#1D1A39'
                                                }}
                                            >
                                                {activeTab === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                                            </div>
                                        </div>

                                        <div className="movie-info">
                                            <h3 style={{ color: '#E8BCB9' }}>{movie.title}</h3>

                                            <div className="movie-meta" style={{ color: '#E8BCB9' }}>
                                                <span>{movie.durationMinutes} mins</span>
                                                <span className="dot" style={{ color: '#F59F59' }}>•</span>
                                                <span>{movie.genre}</span>
                                            </div>

                                            <button
                                                className="btn btn-primary"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/book/${movie.id}?date=${selectedDate}`); }}
                                                style={{
                                                    marginTop: 'auto',
                                                    background: 'linear-gradient(135deg,#F59F59,#AF445A)',
                                                    border: 'none',
                                                    color: '#1D1A39',
                                                    boxShadow: '0 8px 20px rgba(245,159,89,0.25)'
                                                }}
                                            >
                                                Book Ticket
                                            </button>
                                        </div>

                                    </div>
                                ))}

                            </div>
                        )}

                    </div>
                </section>
            </main>
        </>
    );
}