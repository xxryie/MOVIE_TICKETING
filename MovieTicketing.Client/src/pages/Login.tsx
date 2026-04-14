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
                // For login, token is returned. For register, they must login afterwards or we auto-login if token is provided.
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
                    setMode('login'); // auto switch to login
                    alert('Registration successful! Please login.');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    return (
        <main className="container auth-container">
            {error && <div className="auth-error">{error}</div>}
            
            <div className="auth-card-single glass-panel">
                <div className="auth-tabs">
                    <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
                    <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Sign Up</button>
                </div>

                <div className="auth-form active">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>
                        {mode === 'register' && (
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block">
                            {mode === 'login' ? 'Log In' : 'Create Account'}
                        </button>
                    </form>
                    <p className="auth-switch">
                        {mode === 'login' ? (
                            <>Don't have an account? <span style={{cursor:'pointer', color:'#a855f7'}} onClick={() => setMode('register')}>Sign Up</span></>
                        ) : (
                            <>Already have an account? <span style={{cursor:'pointer', color:'#a855f7'}} onClick={() => setMode('login')}>Log In</span></>
                        )}
                    </p>
                </div>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link to="/" className="btn btn-back" style={{ textDecoration: 'none' }}>← Back to Home</Link>
            </div>
        </main>
    );
}
