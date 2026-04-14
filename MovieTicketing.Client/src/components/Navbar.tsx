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
        <header className="glass-header navbar-flex">
            <div className="navbar-brand">
                <Link to="/" className="navbar-title">🎬 Stellar Cinemas</Link>
                <span className="navbar-subtitle">Your portal to infinite stories.</span>
            </div>
            <div className="navbar-actions">
                {isLoggedIn ? (
                    <>
                        <span className="navbar-user">👤 <strong>{username}</strong></span>
                        <button onClick={handleLogout} className="btn btn-back navbar-btn">Logout</button>
                    </>
                ) : (
                    <Link to="/login" className="btn btn-primary navbar-btn">Login</Link>
                )}
            </div>
        </header>
    );
}
