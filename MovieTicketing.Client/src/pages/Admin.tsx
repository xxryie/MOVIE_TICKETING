import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Film, 
  Clock, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  Users, 
  Ticket,
  Search,
  X,
  Calendar
} from 'lucide-react';
import api from '../services/api';

type Tab = 'dashboard' | 'movies' | 'showtimes';

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
    const [editingMovie, setEditingMovie] = useState<any>(null);
    const [isShowtimeModalOpen, setIsShowtimeModalOpen] = useState(false);
    const [targetMovieId, setTargetMovieId] = useState<number | null>(null);

    // Form State
    const [movieForm, setMovieForm] = useState({
        title: '',
        synopsis: '',
        genre: '',
        durationMinutes: 120,
        posterUrl: '',
        status: 'now_showing',
        language: 'English',
        rating: 'PG-13',
        cast: '',
        trailerUrl: '',
        price: 250
    });

    const [showtimeForm, setShowtimeForm] = useState({
        showTime: new Date(new Date().getTime() + 86400000).toISOString().slice(0, 16),
        cinemaType: 'Standard'
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [statsRes, moviesRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/movies')
            ]);
            if (statsRes.data.success) setStats(statsRes.data.data);
            if (moviesRes.data.success) setMovies(moviesRes.data.data);
        } catch (err: any) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleMovieSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMovie) {
                await api.put(`/admin/movies/${editingMovie.id}`, movieForm);
            } else {
                await api.post('/admin/movies', movieForm);
            }
            setIsMovieModalOpen(false);
            setEditingMovie(null);
            fetchInitialData();
        } catch (err: any) {
            console.error("Save error:", err);
            const msg = err.response?.data?.message || err.message || "Error saving movie";
            alert(`Error: ${msg}`);
        }
    };

    const handleEditMovie = (movie: any) => {
        setEditingMovie(movie);
        setMovieForm({
            title: movie.title,
            synopsis: movie.synopsis || '',
            genre: movie.genre || '',
            durationMinutes: movie.durationMinutes,
            posterUrl: movie.posterUrl || '',
            status: movie.status,
            language: movie.language || 'English',
            rating: movie.rating || 'PG-13',
            cast: movie.cast || '',
            trailerUrl: movie.trailerUrl || '',
            price: movie.price || 250
        });
        setIsMovieModalOpen(true);
    };

    const handleAddNewMovie = () => {
        setEditingMovie(null);
        setMovieForm({
            title: '',
            synopsis: '',
            genre: '',
            durationMinutes: 120,
            posterUrl: '',
            status: 'now_showing',
            language: 'English',
            rating: 'PG-13',
            cast: '',
            trailerUrl: '',
            price: 250
        });
        setIsMovieModalOpen(true);
    };

    const handleDeleteMovie = async (id: number) => {
        if (!window.confirm("Delete this movie? All associated showtimes will be removed.")) return;
        try {
            await api.delete(`/admin/movies/${id}`);
            fetchInitialData();
        } catch (err) {
            alert("Error deleting movie");
        }
    };

    const handleAddShowtime = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/showtimes', {
                movieId: targetMovieId,
                showTime: showtimeForm.showTime,
                cinemaType: showtimeForm.cinemaType
            });
            setIsShowtimeModalOpen(false);
            fetchInitialData();
            alert("Showtime generated along with 32 seats!");
        } catch (err) {
            alert("Error adding showtime");
        }
    };

    const filteredMovies = (movies || []).filter(m => 
        (m.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (m.genre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    if (loading && !stats) return <div className="loader-container"><div className="loader"></div></div>;

    return (
        <div className="admin-layout" style={{ display: 'flex', height: '100vh', background: '#020617', overflow: 'hidden' }}>
            
            {/* Sidebar */}
            <aside className="admin-sidebar" style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: '#0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '3rem', padding: '0.5rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '10px' }}>
                        <Film size={24} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Cinema Admin</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <SidebarLink active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
                    <SidebarLink active={activeTab === 'movies'} icon={<Film size={20} />} label="Movies" onClick={() => setActiveTab('movies')} />
                    <SidebarLink active={activeTab === 'showtimes'} icon={<Clock size={20} />} label="Showtimes" onClick={() => setActiveTab('showtimes')} />
                </nav>

                <button onClick={handleLogout} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.3s' }}>
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div>
                        <h1 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 700 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Welcome back, Admin</p>
                    </div>
                    {activeTab === 'movies' && (
                        <button className="btn btn-primary" onClick={handleAddNewMovie} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={18} /> Add Movie
                        </button>
                    )}
                </header>

                {/* Dashboard Tab Content */}
                {activeTab === 'dashboard' && stats && (
                    <div className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} icon={<TrendingUp color="#d8b4fe" />} trend="+12.5%" />
                            <StatCard label="Tickets Sold" value={stats.totalBookings} icon={<Ticket color="#d8b4fe" />} trend="+5.2%" />
                            <StatCard label="Now Showing" value={stats.activeMovies} icon={<Film color="#d8b4fe" />} />
                        </div>

                        <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Top Revenue Movies</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                                <thead>
                                    <tr style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '1rem' }}>Movie Title</th>
                                        <th style={{ padding: '1rem' }}>Tickets Sold</th>
                                        <th style={{ padding: '1rem' }}>Gross Revenue</th>
                                        <th style={{ padding: '1rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.movieSales.map((m: any) => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{m.title}</td>
                                            <td style={{ padding: '1rem' }}>{m.ticketsSold}</td>
                                            <td style={{ padding: '1rem', color: '#10b981' }}>₱{m.revenue.toLocaleString()}</td>
                                            <td style={{ padding: '1rem' }}><button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Details</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Movies Grid Tab */}
                {activeTab === 'movies' && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search movies by title or genre..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.8rem 1rem 0.8rem 3rem', 
                                        background: '#0f172a', 
                                        border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '12px', 
                                        color: 'white',
                                        outline: 'none'
                                    }} 
                                />
                            </div>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} style={{ color: '#94a3b8', fontSize: '0.85rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>Clear</button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {filteredMovies.map(movie => (
                                <div key={movie.id} className="glass-panel" style={{ padding: '1.2rem', borderRadius: '1.2rem', display: 'flex', gap: '1.2rem', transition: 'transform 0.3s' }}>
                                    <img src={movie.posterUrl} style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ color: 'white', marginBottom: '0.4rem', fontSize: '1.1rem' }}>{movie.title}</h4>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{movie.genre}</div>
                                            <div style={{ marginTop: '0.4rem', fontSize: '1rem', color: '#10b981', fontWeight: 700 }}>₱{movie.price?.toLocaleString()}</div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', display: 'inline-block', background: movie.status === 'now_showing' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)', color: movie.status === 'now_showing' ? '#4ade80' : '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                                                {movie.status === 'now_showing' ? 'NOW SHOWING' : 'COMING SOON'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                            <button className="btn" onClick={() => handleEditMovie(movie)} style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}><Edit size={14}/> Edit</button>
                                            <button className="btn" onClick={() => handleDeleteMovie(movie.id)} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Showtimes Management Tab */}
                {activeTab === 'showtimes' && (
                    <div className="fade-in">
                        <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ marginBottom: '2rem' }}>
                                 <h3 style={{ color: 'white' }}>Current Movie Schedules</h3>
                                 <p style={{ color: '#64748b' }}>Select a movie to add more showtimes or remove existing ones.</p>
                             </div>
                             
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                 {movies.filter(m => m.status === 'now_showing').map(movie => (
                                     <div key={movie.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                             <h4 style={{ color: 'white' }}>{movie.title}</h4>
                                             <button className="btn btn-primary" onClick={() => { setTargetMovieId(movie.id); setIsShowtimeModalOpen(true); }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>+ Add Time</button>
                                         </div>
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                             {movie.showtimes && movie.showtimes.length > 0 ? (
                                                 Object.entries(
                                                     movie.showtimes.reduce((acc: any, st: any) => {
                                                         const date = new Date(st.showTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                                         if (!acc[date]) acc[date] = [];
                                                         acc[date].push(st);
                                                         return acc;
                                                     }, {})
                                                 ).map(([date, times]: [string, any]) => (
                                                     <div key={date}>
                                                         <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date}</div>
                                                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                             {times.map((st: any) => (
                                                                 <div key={st.id} style={{ background: 'rgba(216, 180, 254, 0.05)', color: 'var(--primary)', border: '1px solid rgba(216, 180, 254, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                                                                     <Clock size={12} />
                                                                     {new Date(st.showTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                     <span style={{ fontSize: '0.6rem', background: st.cinemaType === 'IMAX' ? '#2563eb' : st.cinemaType === 'Directors Club' ? '#ca8a04' : '#475569', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px', marginLeft: '0.3rem' }}>{st.cinemaType}</span>
                                                                     <button 
                                                                        onClick={async () => {
                                                                            if(window.confirm("Delete this showtime?")) {
                                                                                await api.delete(`/admin/showtimes/${st.id}`);
                                                                                fetchInitialData();
                                                                            }
                                                                        }}
                                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', display: 'flex', marginLeft: '0.2rem' }}
                                                                     >
                                                                         <X size={12} />
                                                                     </button>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 ))
                                             ) : (
                                                 <span style={{color: '#475569', fontSize: '0.8rem'}}>No showtimes set</span>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Movie Modal */}
            {isMovieModalOpen && (
                <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-box glass-panel fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ color: 'white' }}>{editingMovie ? 'Edit Movie' : 'Add New Movie'}</h2>
                            <button onClick={() => setIsMovieModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X /></button>
                        </div>
                        <form onSubmit={handleMovieSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Movie Title</label>
                                <input type="text" className="form-control" value={movieForm.title} onChange={e => setMovieForm({...movieForm, title: e.target.value})} required placeholder="e.g. Inception" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Synopsis</label>
                                <textarea className="form-control" value={movieForm.synopsis} onChange={e => setMovieForm({...movieForm, synopsis: e.target.value})} style={{ height: '80px', paddingTop: '0.8rem' }} />
                            </div>
                            <div className="form-group">
                                <label>Genre</label>
                                <input type="text" className="form-control" value={movieForm.genre} onChange={e => setMovieForm({...movieForm, genre: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Duration (mins)</label>
                                <input type="number" className="form-control" value={movieForm.durationMinutes} onChange={e => setMovieForm({...movieForm, durationMinutes: parseInt(e.target.value)})} />
                            </div>
                            <div className="form-group">
                                <label>Language</label>
                                <input type="text" className="form-control" value={movieForm.language} onChange={e => setMovieForm({...movieForm, language: e.target.value})} />
                            </div>
                             <div className="form-group">
                                <label>Rating</label>
                                <input type="text" className="form-control" value={movieForm.rating} onChange={e => setMovieForm({...movieForm, rating: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Ticket Price (₱)</label>
                                <input type="number" className="form-control" value={movieForm.price} onChange={e => setMovieForm({...movieForm, price: parseFloat(e.target.value)})} required />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Poster URL</label>
                                <input type="text" className="form-control" value={movieForm.posterUrl} onChange={e => setMovieForm({...movieForm, posterUrl: e.target.value})} />
                            </div>
                             <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Trailer Embed URL</label>
                                <input type="text" className="form-control" value={movieForm.trailerUrl} onChange={e => setMovieForm({...movieForm, trailerUrl: e.target.value})} placeholder="https://www.youtube.com/embed/..." />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Cast (Separate by commas)</label>
                                <textarea className="form-control" value={movieForm.cast} onChange={e => setMovieForm({...movieForm, cast: e.target.value})} style={{ height: '60px', paddingTop: '0.8rem' }} placeholder="e.g. Robert Downey Jr., Chris Evans" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Status</label>
                                <select className="form-control" value={movieForm.status} onChange={e => setMovieForm({...movieForm, status: e.target.value})}>
                                    <option value="now_showing">Now Showing</option>
                                    <option value="coming_soon">Coming Soon</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>{editingMovie ? 'Update Movie Data' : 'Save New Movie'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Showtime Modal */}
            {isShowtimeModalOpen && (
                 <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div className="modal-box glass-panel fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ color: 'white' }}>Add Showtime</h2>
                            <button onClick={() => setIsShowtimeModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X /></button>
                        </div>
                        <form onSubmit={handleAddShowtime}>
                            <div className="form-group">
                                <label>Select Date & Time</label>
                                <input type="datetime-local" className="form-control" value={showtimeForm.showTime} onChange={e => setShowtimeForm({ ...showtimeForm, showTime: e.target.value })} required />
                            </div>
                            <div className="form-group" style={{marginTop: '1.2rem'}}>
                                <label>Cinema Type</label>
                                <select className="form-control" value={showtimeForm.cinemaType} onChange={e => setShowtimeForm({...showtimeForm, cinemaType: e.target.value})}>
                                    <option value="Standard">Standard Cinema</option>
                                    <option value="IMAX">IMAX Cinema</option>
                                    <option value="Directors Club">Director's Club</option>
                                </select>
                            </div>
                            <div style={{ marginTop: '2rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>Generate Schedule</button>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', marginTop: '1rem' }}>* This will automatically create 32 available seats for this time slot.</p>
                            </div>
                        </form>
                     </div>
                 </div>
            )}

        </div>
    );
}

function SidebarLink({ active, icon, label, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.8rem', 
                padding: '1rem', 
                background: active ? 'rgba(216, 180, 254, 0.1)' : 'transparent', 
                border: 'none', 
                color: active ? 'var(--primary)' : '#94a3b8', 
                textAlign: 'left', 
                borderRadius: '12px', 
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
                transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function StatCard({ label, value, icon, trend }: any) {
    return (
        <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(216, 180, 254, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>{icon}</div>
                {trend && <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>{trend}</div>}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>{value}</div>
        </div>
    );
}
