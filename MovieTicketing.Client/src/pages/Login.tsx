import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
            const payload = mode === 'login'
                ? { username, password }
                : { username, email, password };

            const res = await api.post(endpoint, payload);
            if (res.data.success) {
                if (res.data.token) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('userId', res.data.user_id);
                    localStorage.setItem('username', res.data.username);
                    localStorage.setItem('role', res.data.role);

                    if (res.data.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/');
                    }
                } else if (mode === 'register') {
                    setMode('login');
                    alert('Registration successful! Please login.');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

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
                className="container auth-container"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#E8BCB9'
                }}
            >
                {error && (
                    <div
                        className="auth-error"
                        style={{
                            background: 'rgba(29, 26, 57, 0.7)',
                            border: '1px solid rgba(245,159,89,0.4)',
                            color: '#F59F59',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '1rem',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    className="auth-card-single glass-panel"
                    style={{
                        width: '420px',
                        background: 'rgba(29, 26, 57, 0.65)',
                        border: '1px solid rgba(232,188,185,0.12)',
                        borderRadius: '18px',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                        padding: '2rem'
                    }}
                >
                    <div
                        className="auth-tabs"
                        style={{
                            display: 'flex',
                            gap: '8px',
                            background: 'rgba(17, 12, 34, 0.4)',
                            padding: '6px',
                            borderRadius: '12px',
                            marginBottom: '1.5rem'
                        }}
                    >
                        <button
                            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => setMode('login')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                background: mode === 'login'
                                    ? 'linear-gradient(135deg,#F59F59,#AF445A)'
                                    : 'transparent',
                                color: '#E8BCB9'
                            }}
                        >
                            Login
                        </button>

                        <button
                            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                            onClick={() => setMode('register')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                background: mode === 'register'
                                    ? 'linear-gradient(135deg,#F59F59,#662549)'
                                    : 'transparent',
                                color: '#E8BCB9'
                            }}
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="auth-form active">
                        <form onSubmit={handleSubmit}>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: '#E8BCB9' }}>Username</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(232,188,185,0.15)',
                                        background: 'rgba(17, 12, 34, 0.5)',
                                        color: '#E8BCB9'
                                    }}
                                />
                            </div>

                            {mode === 'register' && (
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label style={{ color: '#E8BCB9' }}>Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(232,188,185,0.15)',
                                            background: 'rgba(17, 12, 34, 0.5)',
                                            color: '#E8BCB9'
                                        }}
                                    />
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: '#E8BCB9' }}>Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(232,188,185,0.15)',
                                        background: 'rgba(17, 12, 34, 0.5)',
                                        color: '#E8BCB9'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg,#F59F59,#AF445A)',
                                    color: '#1D1A39',
                                    fontWeight: 600,
                                    boxShadow: '0 10px 25px rgba(245,159,89,0.25)'
                                }}
                            >
                                {mode === 'login' ? 'Log In' : 'Create Account'}
                            </button>
                        </form>

                        <p className="auth-switch" style={{ marginTop: '1rem', color: '#E8BCB9' }}>
                            {mode === 'login' ? (
                                <>
                                    Don't have an account?{' '}
                                    <span onClick={() => setMode('register')} style={{ color: '#F59F59', cursor: 'pointer' }}>
                                        Sign Up
                                    </span>
                                </>
                            ) : (
                                <>
                                    Already have an account?{' '}
                                    <span onClick={() => setMode('login')} style={{ color: '#F59F59', cursor: 'pointer' }}>
                                        Log In
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <Link
                        to="/"
                        style={{
                            color: '#E8BCB9',
                            textDecoration: 'none',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(232,188,185,0.2)',
                            background: 'rgba(29, 26, 57, 0.4)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </main>
        </>
    );
}