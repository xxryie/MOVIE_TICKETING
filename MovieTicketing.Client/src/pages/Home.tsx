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

    // Generate 7 days for the calendar
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
        <main className="container">
            <section className="step-section active">
                <div className="main-tabs-container">
                    <div className="main-tabs">
                        <button className={`main-tab ${activeTab === 'now_showing' ? 'active' : ''}`} onClick={() => setActiveTab('now_showing')}>Now showing</button>
                        <button className={`main-tab ${activeTab === 'coming_soon' ? 'active' : ''}`} onClick={() => setActiveTab('coming_soon')}>Coming soon</button>
                    </div>
                </div>

                {activeTab === 'now_showing' && (
                    <div className="calendar-wrapper">
                        <button 
                            className="calendar-nav" 
                            disabled={dateOffset <= 0} 
                            onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
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
                                    >
                                        <span className="day-name">{dayName}</span>
                                        <span className="day-number">{d.getDate()}</span>
                                        <span className="month-name">{d.toLocaleDateString('en-PH', { month: 'short' })}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button 
                            className="calendar-nav" 
                            onClick={() => setDateOffset(dateOffset + 7)}
                        >
                            &#10095;
                        </button>
                    </div>
                )}

                <div className="main-tab-content active">
                    {filteredMovies.length === 0 ? (
                        <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <p style={{ fontSize: '1.2rem' }}>No movies available for this date. 🎬</p>
                        </div>
                    ) : (
                        <div className="movie-grid">
                            {filteredMovies.map(movie => (
                                <div key={movie.id} className="movie-card" onClick={() => navigate(`/book/${movie.id}?date=${selectedDate}`)}>
                                    <div className="movie-poster">
                                        <img src={movie.posterUrl} alt={movie.title} />
                                        <div className={`badge ${activeTab === 'now_showing' ? 'badge-showing' : 'badge-soon'}`}>
                                            {activeTab === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                                        </div>
                                    </div>
                                    <div className="movie-info">
                                        <h3>{movie.title}</h3>
                                        <div className="movie-meta">
                                            <span>{movie.durationMinutes} mins</span>
                                            <span className="dot">•</span>
                                            <span>{movie.genre}</span>
                                        </div>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={(e) => { e.stopPropagation(); navigate(`/book/${movie.id}?date=${selectedDate}`); }}
                                            style={{ marginTop: 'auto' }}
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
    );
}
