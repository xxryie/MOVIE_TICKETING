import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <header className="glass-header" style={{ position: 'relative' }}>
            <h1><Link to="/" style={{color:'white', textDecoration:'none'}}>Stellar Cinemas</Link></h1>
            <p>Your portal to infinite stories.</p>
            <div className="auth-links" style={{ position: 'absolute', top: '50%', right: '2rem', transform: 'translateY(-50%)' }}>
                {isLoggedIn ? (
                    <>
                        <span style={{ marginRight: '1rem' }}>Welcome, <strong>{username}</strong>!</span>
                        <button onClick={handleLogout} className="btn btn-back" style={{ textDecoration: 'none', padding: '0.5rem 1rem', marginBottom: 0 }}>Logout</button>
                    </>
                ) : (
                    <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Login / Sign Up</Link>
                )}
            </div>
        </header>
    );
}
