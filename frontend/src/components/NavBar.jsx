import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, PenTool, LogIn, LogOut, User } from 'lucide-react';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav} className="glass-panel">
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          <BookOpen size={28} color="#059669" />
          <span style={styles.logoText}>Bibliophile</span>
        </Link>

        <div style={styles.links}>
          <Link to="/" style={styles.link}>Trang chủ</Link>
          
          {user ? (
            <>
              <Link to="/studio" style={styles.link}>
                <PenTool size={18} />
                Studio sáng tác
              </Link>
              <div style={styles.userSection}>
                <div style={styles.userInfo}>
                  <User size={16} />
                  <span>{user.nickname}</span>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary">
              <LogIn size={16} />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    margin: '10px 20px',
    borderRadius: '16px',
    padding: '12px 24px',
    transition: 'all 0.3s ease',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  logoText: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.95rem',
    fontWeight: 500,
    opacity: 0.85,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    }
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderLeft: '1px solid var(--border-color)',
    paddingLeft: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.95rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  logoutBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }
};
