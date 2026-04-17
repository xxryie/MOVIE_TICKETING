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
  Ticket,
  Search,
  X,
  BarChart3,
  Users
} from 'lucide-react';
import api from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type Tab = 'dashboard' | 'movies' | 'showtimes' | 'reports';

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
    const [reports, setReports] = useState<any[]>([]);
    const [occupancyData, setOccupancyData] = useState<any[]>([]);
    const [selectedOccupancyShowtime, setSelectedOccupancyShowtime] = useState<any>(null);
    const [isOccupancyModalOpen, setIsOccupancyModalOpen] = useState(false);
    const [occupancyLoading, setOccupancyLoading] = useState(false);

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
            
            // Fetch reports too
            fetchReports();
        } catch (err: any) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        try {
            const res = await api.get('/admin/reports');
            if (res.data.success) setReports(res.data.data);
        } catch (err) {
            console.error("Error fetching reports", err);
        }
    };

    const fetchOccupancy = async (st: any) => {
        setOccupancyLoading(true);
        setSelectedOccupancyShowtime(st);
        setIsOccupancyModalOpen(true);
        try {
            const res = await api.get(`/admin/occupancy/${st.id}`);
            if (res.data.success) setOccupancyData(res.data.data);
        } catch (err) {
            console.error("Error fetching occupancy", err);
        } finally {
            setOccupancyLoading(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF() as any;
        const now = new Date().toLocaleString();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text("CINEMA SALES REPORT", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${now}`, 14, 30);
        doc.text(`Total Revenue: PHP ${reports.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}`, 14, 35);
        
        // Table
        const tableColumn = ["Date", "Customer", "Movie", "Amount", "Payment", "Ref #"];
        const tableRows = reports.map(r => [
            new Date(r.date).toLocaleDateString(),
            r.user,
            r.movie,
            `PHP ${r.amount.toLocaleString()}`,
            r.paymentMethod.toUpperCase(),
            r.paymentRef
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 8 },
        });

        doc.save(`Cinema_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
    <div className="admin-layout" style={{
        display: 'flex',
        height: '100vh',
      background: 'linear-gradient(135deg, #1D1A39 0%, #662549 25%, #AF445A 55%, #F59F59 80%, #E8BCB9 100%)',
        overflow: 'hidden'
    }}>
        
{/* Sidebar */}
<aside className="admin-sidebar" style={{
    width: '280px',
    borderRight: '1px solid rgba(232, 188, 185, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
    background: 'linear-gradient(180deg, #662549 0%, #451952 60%, #1D1A39 100%)',
    boxShadow: 'inset 0 0 25px rgba(0,0,0,0.35)'
}}>

    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        marginBottom: '3rem',
        padding: '0.5rem'
    }}>
        <div style={{
            background: 'linear-gradient(135deg, #AF445A 0%, #F59F59 100%)',
            padding: '0.5rem',
            borderRadius: '10px',
            boxShadow: '0 0 18px rgba(175, 68, 90, 0.35)'
        }}>
            <Film size={24} color="#E8BCB9" />
        </div>

        <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#E8BCB9',
            letterSpacing: '0.5px'
        }}>
            Cinema Admin
        </h2>
    </div>

    <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flex: 1
    }}>
        <SidebarLink active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
        <SidebarLink active={activeTab === 'movies'} icon={<Film size={20} />} label="Movies" onClick={() => setActiveTab('movies')} />
        <SidebarLink active={activeTab === 'showtimes'} icon={<Clock size={20} />} label="Showtimes" onClick={() => setActiveTab('showtimes')} />
        <SidebarLink active={activeTab === 'reports'} icon={<BarChart3 size={20} />} label="Reports" onClick={() => setActiveTab('reports')} />
    </nav>

    <button
        onClick={handleLogout}
        style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.25), rgba(175, 68, 90, 0.15))',
            border: '1px solid rgba(232, 188, 185, 0.15)',
            color: '#E8BCB9',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)'
        }}
    >
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

        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem'
        }}>

            <StatCard
                label="Total Revenue"
                value={`₱${stats.totalRevenue.toLocaleString()}`}
                icon={<TrendingUp color="#F59F59" />}
                trend="+12.5%"
            />

            <StatCard
                label="Tickets Sold"
                value={stats.totalBookings}
                icon={<Ticket color="#AF445A" />}
                trend="+5.2%"
            />

            <StatCard
                label="Now Showing"
                value={stats.activeMovies}
                icon={<Film color="#E8BCB9" />}
            />
        </div>

        {/* Visual Analytics Row */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem'
        }}>

            {/* Revenue Chart */}
            <div className="glass-panel" style={{
                padding: '1.5rem',
                borderRadius: '1.5rem',
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, rgba(29, 26, 57, 0.35), rgba(102, 37, 73, 0.2))',
                border: '1px solid rgba(232, 188, 185, 0.08)',
                boxShadow: '0 0 25px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(12px)'
            }}>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{
                        color: '#E8BCB9',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        letterSpacing: '0.3px'
                    }}>
                        Revenue Trends (14 Days)
                    </h3>

                    <TrendingUp size={18} color="#F59F59" />
                </div>

                <div style={{ flex: 1, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.revenueTrend}>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(232, 188, 185, 0.08)"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="date"
                                stroke="rgba(232, 188, 185, 0.5)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />

                            <YAxis
                                stroke="rgba(232, 188, 185, 0.5)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₱${value}`}
                            />

                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(29, 26, 57, 0.95)',
                                    border: '1px solid rgba(175, 68, 90, 0.2)',
                                    borderRadius: '10px',
                                    backdropFilter: 'blur(10px)'
                                }}
                                itemStyle={{ color: '#E8BCB9' }}
                                cursor={{ fill: 'rgba(175, 68, 90, 0.08)' }}
                            />

                            <Bar
                                dataKey="revenue"
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={20}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F59F59" />
                                    <stop offset="50%" stopColor="#AF445A" />
                                    <stop offset="100%" stopColor="#662549" />
                                </linearGradient>
                            </defs>

                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Top Grossing Hero Card */}
    {stats.topMovie && (
    <div className="glass-panel" style={{
        padding: '1.5rem',
        borderRadius: '1.5rem',
        background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.25) 0%, rgba(29, 26, 57, 0.6) 100%)',
        border: '1px solid rgba(232, 188, 185, 0.12)',
boxShadow: `
    0 20px 40px rgba(0,0,0,0.45),
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 -1px 0 rgba(102, 37, 73, 0.35)
`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
  
    }}>

        <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            opacity: 0.08
        }}>
            <TrendingUp size={200} color="#F59F59" />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>

            <div style={{
                background: 'linear-gradient(135deg, #AF445A 0%, #F59F59 100%)',
                color: '#1D1A39',
                display: 'inline-block',
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: 800,
                marginBottom: '1rem',
                boxShadow: '0 0 12px rgba(175, 68, 90, 0.25)'
            }}>
                TOP GROSSING
            </div>

            <h2 style={{
                color: '#E8BCB9',
                fontSize: '2.2rem',
                fontWeight: 900,
                marginBottom: '0.5rem',
                letterSpacing: '0.5px'
            }}>
                {stats.topMovie.title}
            </h2>

            <div style={{
                display: 'flex',
                gap: '2rem',
                marginTop: '1.5rem'
            }}>

                <div>
                    <div style={{
                        color: 'rgba(232, 188, 185, 0.6)',
                        fontSize: '0.8rem'
                    }}>
                        Total Revenue
                    </div>

                    <div style={{
                        color: '#F59F59',
                        fontSize: '1.5rem',
                        fontWeight: 800
                    }}>
                        ₱{stats.topMovie.revenue.toLocaleString()}
                    </div>
                </div>

                <div>
                    <div style={{
                        color: 'rgba(232, 188, 185, 0.6)',
                        fontSize: '0.8rem'
                    }}>
                        Tickets Sold
                    </div>

                    <div style={{
                        color: '#E8BCB9',
                        fontSize: '1.5rem',
                        fontWeight: 800
                    }}>
                        {stats.topMovie.ticketsSold}
                    </div>
                </div>

            </div>

            <button
                onClick={() => setActiveTab('reports')}
                className="btn btn-primary"
                style={{
                    marginTop: '2rem',
                    width: 'fit-content',
                    padding: '0.8rem 1.5rem',
                    background: 'linear-gradient(135deg, #662549 0%, #AF445A 100%)',
                    border: 'none',
                    color: '#E8BCB9',
                    fontWeight: 600,
                    borderRadius: '12px',
                    boxShadow: '0 0 18px rgba(102, 37, 73, 0.25)',
                    cursor: 'pointer'
                }}
            >
                View Analytics
                     </button>
                    </div>
                    </div>
                            )}
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

        <div style={{
            marginBottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
        }}>

            <div style={{
                position: 'relative',
                flex: 1,
                maxWidth: '400px'
            }}>

                <Search
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(232, 188, 185, 0.5)'
                    }}
                />

                <input
                    type="text"
                    placeholder="Search movies by title or genre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.8rem 1rem 0.8rem 3rem',
                        background: 'linear-gradient(135deg, rgba(29, 26, 57, 0.6), rgba(102, 37, 73, 0.25))',
                        border: '1px solid rgba(232, 188, 185, 0.12)',
                        borderRadius: '12px',
                        color: '#E8BCB9',
                        outline: 'none',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.35)'
                    }}
                />

            </div>

            {searchTerm && (
                <button
                    onClick={() => setSearchTerm('')}
                    style={{
                        color: '#F59F59',
                        fontSize: '0.85rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: '0.3s'
                    }}
                >
                    Clear
                </button>
            )}

        </div>

        <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem'
}}>

    {filteredMovies.map(movie => (
        <div
            key={movie.id}
            className="glass-panel"
            style={{
                padding: '1.2rem',
                borderRadius: '1.2rem',
                display: 'flex',
                gap: '1.2rem',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.25), rgba(29, 26, 57, 0.65))',
                border: '1px solid rgba(232, 188, 185, 0.10)',
                boxShadow: '0 20px 45px rgba(0,0,0,0.45)'
            }}
        >

            <img
                src={movie.posterUrl}
                style={{
                    width: '100px',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
            />

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>

                <div style={{ flex: 1 }}>

                    <h4 style={{
                        color: '#E8BCB9',
                        marginBottom: '0.4rem',
                        fontSize: '1.1rem',
                        fontWeight: 700
                    }}>
                        {movie.title}
                    </h4>

                    <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(232, 188, 185, 0.6)'
                    }}>
                        {movie.genre}
                    </div>

                    <div style={{
                        marginTop: '0.4rem',
                        fontSize: '1rem',
                        color: '#F59F59',
                        fontWeight: 700
                    }}>
                        ₱{movie.price?.toLocaleString()}
                    </div>

                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.7rem',
                        display: 'inline-block',
                        background: movie.status === 'now_showing'
                            ? '#E8BCB9'
                            : '#E8BCB9',
                        color: movie.status === 'now_showing'
                            ? '#AF445A'
                            : '#F59F59',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        border: '1px solid rgba(232, 188, 185, 0.10)'
                    }}>
                        {movie.status === 'now_showing' ? 'NOW SHOWING' : 'COMING SOON'}
                    </div>

                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem'
                }}>

                    <button
                        className="btn"
                        onClick={() => handleEditMovie(movie)}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            fontSize: '0.85rem',
                            background: 'linear-gradient(135deg, #662549 0%, #AF445A 100%)',
                            border: 'none',
                            color: '#E8BCB9',
                            borderRadius: '10px'
                        }}
                    >
                        <Edit size={14} /> Edit
                    </button>

                    <button
                        onClick={() => handleDeleteMovie(movie.id)}
                        style={{
                            padding: '0.5rem',
                            background: 'linear-gradient(135deg, rgba(175, 68, 90, 0.2), rgba(102, 37, 73, 0.2))',
                            color: '#E8BCB9',
                            border: '1px solid rgba(232, 188, 185, 0.15)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={14} />
                    </button>

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

        <div style={{
            background: 'linear-gradient(135deg, rgba(29, 26, 57, 0.6), rgba(102, 37, 73, 0.25))',
            padding: '2rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(232, 188, 185, 0.10)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)'
        }}>

            <div style={{ marginBottom: '2rem' }}>

                <h3 style={{
                    color: '#E8BCB9',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                }}>
                    Current Movie Schedules
                </h3>

                <p style={{
                    color: 'rgba(232, 188, 185, 0.6)',
                    fontSize: '0.9rem',
                    marginTop: '0.3rem'
                }}>
                    Select a movie to add more showtimes or remove existing ones.
                </p>

            </div>
                <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
}}>

    {movies.filter(m => m.status === 'now_showing').map(movie => (
        <div
            key={movie.id}
            style={{
                background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.25), rgba(29, 26, 57, 0.65))',
                padding: '1.2rem',
                borderRadius: '1rem',
                border: '1px solid rgba(232, 188, 185, 0.10)',
                boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
            }}
        >

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>

                <h4 style={{
                    color: '#E8BCB9',
                    fontSize: '1rem',
                    fontWeight: 700,
                    letterSpacing: '0.3px'
                }}>
                    {movie.title}
                </h4>

                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setTargetMovieId(movie.id);
                        setIsShowtimeModalOpen(true);
                    }}
                    style={{
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.75rem',
                        background: 'linear-gradient(135deg, #662549 0%, #AF445A 100%)',
                        border: 'none',
                        color: '#E8BCB9',
                        borderRadius: '8px',
                        boxShadow: '0 0 15px rgba(175, 68, 90, 0.25)',
                        cursor: 'pointer'
                    }}
                >
                    + Add Time
                </button>

            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {movie.showtimes && movie.showtimes.length > 0 ? (
                 Object.entries(movie.showtimes.reduce((acc: any, st: any) => {
                    const date = new Date(st.showTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                         if (!acc[date]) acc[date] = [];
                            acc[date].push(st);
                                return acc;
                                    }, {})
                            ).map(([date, times]: [string, any]) => (
                            <div key={date}>
                    <div style={{
    color: 'rgba(232, 188, 185, 0.6)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
}}>
    {date}
</div>

<div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
}}>

    {times.map((st: any) => (
        <div
            key={st.id}
            style={{
                background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.25), rgba(29, 26, 57, 0.6))',
                color: '#E8BCB9',
                border: '1px solid rgba(232, 188, 185, 0.12)',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                position: 'relative',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(8px)'
            }}
        >

            <Clock size={12} color="#F59F59" />

            {new Date(st.showTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })}

            <span style={{
                fontSize: '0.6rem',
                background:
                    st.cinemaType === 'IMAX'
                        ? 'linear-gradient(135deg, #AF445A, #F59F59)'
                        : st.cinemaType === 'Directors Club'
                            ? 'linear-gradient(135deg, #662549, #AF445A)'
                            : 'rgba(29, 26, 57, 0.8)',
                color: '#E8BCB9',
                padding: '0.1rem 0.3rem',
                borderRadius: '4px',
                marginLeft: '0.3rem',
                border: '1px solid rgba(232, 188, 185, 0.12)',
                fontWeight: 700
            }}>
                {st.cinemaType}
            </span>

            <button
                onClick={() => fetchOccupancy(st)}
                title="View Occupancy"
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#F59F59',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    marginLeft: '0.5rem'
                }}
            >
         <Users size={12} color="#F59F59" />

</button>

<button
    onClick={async () => {
        if (window.confirm("Delete this showtime?")) {
            await api.delete(`/admin/showtimes/${st.id}`);
            fetchInitialData();
        }
    }}
    style={{
        background: 'transparent',
        border: 'none',
        color: '#AF445A',
        cursor: 'pointer',
        padding: '0.2rem',
        display: 'flex',
        marginLeft: '0.2rem',
        transition: '0.2s ease'
    }}
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
                                                                  

    {/* Reports Tab Content */}
{activeTab === 'reports' && (
    <div className="fade-in">

        <div style={{
            background: 'linear-gradient(135deg, rgba(29, 26, 57, 0.65), rgba(102, 37, 73, 0.25))',
            padding: '1.5rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(232, 188, 185, 0.10)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)'
        }}>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>

                <h3 style={{
                    color: '#E8BCB9',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                }}>
                    Comprehensive Sales Report
                </h3>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>

                    <div style={{
                        color: '#F59F59',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        textShadow: '0 0 10px rgba(245, 159, 89, 0.25)'
                    }}>
                        Total: ₱{reports.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </div>

                    <button
                        onClick={downloadPDF}
                        className="btn"
                        style={{
                            background: 'linear-gradient(135deg, rgba(102, 37, 73, 0.6), rgba(175, 68, 90, 0.4))',
                            color: '#E8BCB9',
                            padding: '0.5rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '1px solid rgba(232, 188, 185, 0.15)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.35)'
                        }}
                    >
                        Download PDF
                    </button>

                </div>
            </div>
                            
    <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    color: '#E8BCB9'
}}>
    <thead>
        <tr style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            textAlign: 'left',
            borderBottom: '1px solid rgba(232, 188, 185, 0.12)',
            background: 'linear-gradient(135deg, rgba(29, 26, 57, 0.5), rgba(102, 37, 73, 0.2))'
        }}>

            <th style={{
                padding: '1rem',
                color: 'rgba(232, 188, 185, 0.7)',
                letterSpacing: '0.05em'
            }}>
                Date
            </th>

            <th style={{
                padding: '1rem',
                color: 'rgba(232, 188, 185, 0.7)',
                letterSpacing: '0.05em'
            }}>
                Customer
            </th>

            <th style={{
                padding: '1rem',
                color: 'rgba(232, 188, 185, 0.7)',
                letterSpacing: '0.05em'
            }}>
                Movie
            </th>

            <th style={{
                padding: '1rem',
                color: 'rgba(245, 159, 89, 0.8)',
                letterSpacing: '0.05em'
            }}>
                Amount
            </th>

            <th style={{
                padding: '1rem',
                color: 'rgba(232, 188, 185, 0.7)',
                letterSpacing: '0.05em'
            }}>
                Payment
            </th>

            <th style={{
                padding: '1rem',
                color: 'rgba(232, 188, 185, 0.7)',
                letterSpacing: '0.05em'
            }}>
                Ref #
            </th>

        </tr>
         </thead>
            <tbody>
        {reports.map((r: any) => (
    <tr
        key={r.id}
        style={{
            borderBottom: '1px solid rgba(232, 188, 185, 0.06)',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
        }}
    >

        <td style={{
            padding: '1rem',
            color: 'rgba(232, 188, 185, 0.6)'
        }}>
            {new Date(r.date).toLocaleDateString()}
        </td>

        <td style={{
            padding: '1rem',
            fontWeight: 700,
            color: '#E8BCB9'
        }}>
            {r.user}
        </td>

        <td style={{
            padding: '1rem',
            color: 'rgba(232, 188, 185, 0.85)'
        }}>
            {r.movie}
        </td>

        <td style={{
            padding: '1rem',
            color: '#F59F59',
            fontWeight: 800,
            textShadow: '0 0 10px rgba(245, 159, 89, 0.15)'
        }}>
            ₱{r.amount.toLocaleString()}
        </td>

        <td style={{ padding: '1rem' }}>

            <span style={{
                fontSize: '0.7rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                background: r.paymentMethod === 'gcash'
                    ? 'rgba(175, 68, 90, 0.15)'
                    : 'rgba(245, 159, 89, 0.12)',
                color: '#E8BCB9',
                textTransform: 'uppercase',
                border: '1px solid rgba(232, 188, 185, 0.10)',
                letterSpacing: '0.5px'
            }}>
                {r.paymentMethod}
            </span>

        
            </td>
            <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{r.paymentRef}</td>
                </tr>
                ))}
                {reports.length === 0 && (
             <tr>
             <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>No report data found.</td>
                </tr>
                 )}
            </tbody>
                </table>
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

            {/* Occupancy Modal */}
            {isOccupancyModalOpen && (
                <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-box glass-panel fade-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <h2 style={{ color: 'white', fontSize: '1.5rem' }}>Live Theater Occupancy</h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                    {selectedOccupancyShowtime?.cinemaType} Cinema • {new Date(selectedOccupancyShowtime?.showTime).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                                </p>
                            </div>
                            <button onClick={() => setIsOccupancyModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X /></button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', textAlign: 'center' }}>
                            {occupancyLoading ? (
                                <div style={{ padding: '4rem', color: 'white' }}>Loading map data...</div>
                            ) : (
                                <>
                                    <div className="screen-container" style={{ marginBottom: '4rem' }}>
                                        <div className="admin-screen-visual" style={{ margin: '0 auto', maxWidth: '400px', height: '6px', background: 'var(--primary)', boxShadow: '0 4px 20px var(--primary)', borderRadius: '10px' }}></div>
                                        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.7rem', letterSpacing: '4px' }}>SCREEN</p>
                                    </div>

                                    <div style={{ display: 'inline-grid', gap: '8px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                                        {Object.entries(
                                            occupancyData.reduce((acc: any, seat: any) => {
                                                if (!acc[seat.row]) acc[seat.row] = [];
                                                acc[seat.row].push(seat);
                                                return acc;
                                            }, {})
                                        ).map(([rowLabel, seats]: [string, any]) => (
                                            <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{ color: '#444c5a', fontSize: '0.7rem', width: '20px', fontWeight: 800 }}>{rowLabel}</span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {seats.map((seat: any) => (
                                                        <div 
                                                            key={seat.id} 
                                                            title={seat.bookedBy ? `Booked by: ${seat.bookedBy}` : "Available"}
                                                            style={{ 
                                                                width: '28px', 
                                                                height: '28px', 
                                                                borderRadius: '6px',
                                                                background: seat.status === 'reserved' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                                border: `1px solid ${seat.status === 'reserved' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.6rem',
                                                                color: seat.status === 'reserved' ? 'white' : '#475569',
                                                                cursor: seat.bookedBy ? 'pointer' : 'default',
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            {seat.bookedBy && <Users size={12} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}></div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Available</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reserved</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>
                                            {occupancyData.filter(s => s.status === 'reserved').length} / {occupancyData.length} Sold
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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
