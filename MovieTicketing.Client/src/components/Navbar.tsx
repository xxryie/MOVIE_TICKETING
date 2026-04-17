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
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.1rem 2.2rem',
                background: 'rgba(29,26,57,0.75)',
                borderBottom: '1px solid rgba(232,188,185,0.08)',
                backdropFilter: 'blur(18px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Link
                    to="/"
                    style={{
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        color: '#F59F59',
                        textDecoration: 'none'
                    }}
                >
                   𝐒𝐭𝐞𝐥𝐥𝐚𝐫 𝐂𝐢𝐧𝐞𝐦𝐚𝐬
                </Link>

                <span
                    style={{
                        fontSize: '0.75rem',
                        opacity: 0.65,
                        marginTop: '2px',
                        color: '#E8BCB9'
                    }}
                >
                    Your portal to infinite stories.
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {isLoggedIn ? (
                    <>
                        <span
                            style={{
                                fontSize: '0.85rem',
                                color: '#E8BCB9',
                                padding: '6px 12px',
                                borderRadius: '999px',
                                background: 'rgba(17,12,34,0.45)',
                                border: '1px solid rgba(232,188,185,0.08)'
                            }}
                        >
                            👤 <strong style={{ color: '#F59F59' }}>{username}</strong>
                        </span>

                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(245,159,89,0.25)',
                                background: 'linear-gradient(135deg, rgba(69,25,82,0.6), rgba(102,37,73,0.4))',
                                color: '#F59F59',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: '0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(175,68,90,0.35), rgba(102,37,73,0.6))';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(69,25,82,0.6), rgba(102,37,73,0.4))';
                            }}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <Link
                        to="/login"
                        style={{
                            padding: '9px 16px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg,#F59F59,#AF445A)',
                            color: '#1D1A39',
                            fontWeight: 800,
                            textDecoration: 'none',
                            letterSpacing: '0.5px'
                        }}
                    >
                        Login
                    </Link>
                )}
            </div>
        </header>
    );
}