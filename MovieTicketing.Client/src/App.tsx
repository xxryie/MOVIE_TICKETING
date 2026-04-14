import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Booking from './pages/Booking';
import Receipt from './pages/Receipt';
import Admin from './pages/Admin';
import QueueRoom from './pages/QueueRoom';

function App() {
  return (
    <Router>
        <Navbar />
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book/:movieId" element={<Booking />} />
            <Route path="/receipt/:token" element={<Receipt />} />
            <Route path="/queue/:showtimeId" element={<QueueRoom />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
  );
}

export default App;
