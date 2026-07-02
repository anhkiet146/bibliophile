import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, UserPlus, Lock, FileText, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, nickname, invitationCode);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer} className="fade-in">
      <div style={styles.authBox} className="glass-panel">
        <div style={styles.tabs}>
          <button 
            type="button" 
            style={{...styles.tab, ...(isLogin ? styles.activeTab : {})}} 
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Đăng nhập
          </button>
          <button 
            type="button" 
            style={{...styles.tab, ...(!isLogin ? styles.activeTab : {})}} 
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.title}>{isLogin ? 'Chào mừng quay trở lại' : 'Trở thành Người Kể Chuyện'}</h2>
          <p style={styles.subtitle}>
            {isLogin ? 'Đăng nhập để tiếp tục sáng tác và thảo luận cùng bạn bè.' : 'Tạo tài khoản để chia sẻ những câu chuyện của bạn.'}
          </p>

          {error && (
            <div style={styles.errorAlert}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Tên đăng nhập</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bút danh / Biệt danh</label>
              <div style={styles.inputWrapper}>
                <FileText size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Bút danh hiển thị..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required={!isLogin}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mã mời (Chỉ dành cho bạn bè)</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="Nhập mã mời bí mật..."
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  required={!isLogin}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập ngay' : 'Đăng ký tài khoản')}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    padding: '20px',
  },
  authBox: {
    width: '100%',
    maxWidth: '450px',
    padding: '30px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  tabs: {
    display: 'flex',
    borderRadius: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '4px',
    marginBottom: '28px',
    border: '1px solid var(--border-color)',
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: '10px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    paddingLeft: '44px',
  },
  submitBtn: {
    marginTop: '10px',
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
  }
};
