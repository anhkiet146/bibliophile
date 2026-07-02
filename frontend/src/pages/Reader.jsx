import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Settings, Heart, MessageSquare, ArrowLeft, BookOpen, Lock, FolderOpen, Download } from 'lucide-react';
import CovenantBackground from '../components/CovenantBackground';

export default function Reader() {
  const { id, chapterId } = useParams();
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Reader Settings
  const [theme, setTheme] = useState(localStorage.getItem('reader-theme') || 'light');
  const [fontSize, setFontSize] = useState(localStorage.getItem('reader-font-size') || '18px');
  const [fontFamily, setFontFamily] = useState(localStorage.getItem('reader-font-family') || 'serif');
  const [showSettings, setShowSettings] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [countdown, setCountdown] = useState('00:00:00:00:00');

  useEffect(() => {
    if (theme !== 'covenant') return;

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(24, 0, 0, 0); // End of day
      
      let diff = target - now;
      if (diff < 0) diff = 0;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      const ms = Math.floor((diff % 1000) / 10);
      
      setCountdown(`00:${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(2, '0')}`);
    }, 50);

    return () => clearInterval(interval);
  }, [theme]);

  useEffect(() => {
    // Apply theme to document data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-font-family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    async function fetchStoryAndChapter() {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/stories/${id}?t=${Date.now()}`, {
          headers: getAuthHeader ? getAuthHeader() : {}
        });
        if (response.ok) {
          const rawStoryData = await response.json();
          
          // Recursively normalize all strings to NFC (precomposed Vietnamese diacritics)
          const normalizeObject = (obj) => {
            if (typeof obj === 'string') {
              let clean = obj
                .replace(/\u00B4/g, '\u0301') // spacing acute -> combining acute
                .replace(/\u0060/g, '\u0300') // spacing grave (backtick) -> combining grave
                .replace(/\u02DC/g, '\u0303') // spacing small tilde -> combining tilde
                .normalize('NFC');
              
              // Strip duplicate combining marks trailing after precomposed vowels
              clean = clean.replace(/([áéíóúýắấếốớứ])\u0301/gi, '$1');
              clean = clean.replace(/([àèìòùỳằầềồờừ])\u0300/gi, '$1');
              clean = clean.replace(/([ảẻỉỏủỷẩểổởử])\u0309/gi, '$1');
              clean = clean.replace(/([ãẽõũỹẫễỗỡữ])\u0303/gi, '$1');
              clean = clean.replace(/([ạẹịọụỵặậệộợự])\u0323/gi, '$1');
              
              // Remove adjacent duplicate diacritics
              clean = clean.replace(/(\u0301)\u0301+/g, '$1');
              clean = clean.replace(/(\u0300)\u0300+/g, '$1');
              clean = clean.replace(/(\u0303)\u0303+/g, '$1');
              clean = clean.replace(/(\u0309)\u0309+/g, '$1');
              clean = clean.replace(/(\u0323)\u0323+/g, '$1');
              
              return clean;
            } else if (Array.isArray(obj)) {
              return obj.map(normalizeObject);
            } else if (obj !== null && typeof obj === 'object') {
              const newObj = {};
              for (const key in obj) {
                newObj[key] = normalizeObject(obj[key]);
              }
              return newObj;
            }
            return obj;
          };
          
          const storyData = normalizeObject(rawStoryData);
          setStory(storyData);
          
          const chap = storyData.chapters.find(c => c.id === chapterId);
          if (chap) {
            setChapter(chap);
            setLikes(chap.likes || []);
            
            // Save bookmark
            localStorage.setItem(`bookmark_${id}`, chapterId);
          } else {
            setChapter(null);
          }

          // Fetch chapter-specific comments
          const commentsRes = await fetch(`${API_BASE_URL}/stories/${id}/comments?chapterId=${chapterId}`);
          if (commentsRes.ok) {
            const rawComments = await commentsRes.json();
            // Recursively normalize comments to NFC
            const normalizeObject = (obj) => {
              if (typeof obj === 'string') {
                let clean = obj
                  .replace(/\u00B4/g, '\u0301')
                  .replace(/\u0060/g, '\u0300')
                  .replace(/\u02DC/g, '\u0303')
                  .normalize('NFC');
                
                clean = clean.replace(/([áéíóúýắấếốớứ])\u0301/gi, '$1');
                clean = clean.replace(/([àèìòùỳằầềồờừ])\u0300/gi, '$1');
                clean = clean.replace(/([ảẻỉỏủỷẩểổởử])\u0309/gi, '$1');
                clean = clean.replace(/([ãẽõũỹẫễỗỡữ])\u0303/gi, '$1');
                clean = clean.replace(/([ạẹịọụỵặậệộợự])\u0323/gi, '$1');
                
                clean = clean.replace(/(\u0301)\u0301+/g, '$1');
                clean = clean.replace(/(\u0300)\u0300+/g, '$1');
                clean = clean.replace(/(\u0303)\u0303+/g, '$1');
                clean = clean.replace(/(\u0309)\u0309+/g, '$1');
                clean = clean.replace(/(\u0323)\u0323+/g, '$1');
                
                return clean;
              } else if (Array.isArray(obj)) {
                return obj.map(normalizeObject);
              } else if (obj !== null && typeof obj === 'object') {
                const newObj = {};
                for (const key in obj) {
                  newObj[key] = normalizeObject(obj[key]);
                }
                return newObj;
              }
              return obj;
            };
            setComments(normalizeObject(rawComments));
          }
        }
      } catch (err) {
        console.error('Error fetching reader details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStoryAndChapter();
  }, [id, chapterId]);

  const handleLike = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích chương này!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}/chapters/${chapterId}/like`, {
        method: 'POST',
        headers: getAuthHeader()
      });

      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ content: newComment, chapterId })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data, ...comments]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDownloadChapter = () => {
    if (!chapter || !story) return;
    
    const htmlToPlainText = (html) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };
    
    const plainText = htmlToPlainText(chapter.content);
    const fileContent = `Tác phẩm: ${story.title}
Tác giả: ${story.authorName}
Thể loại: ${story.genre}
--------------------------------------------------
${chapter.title}
--------------------------------------------------

${plainText}
`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeStoryTitle = story.title.replace(/[^a-zA-Z0-9 Tiếng Việt]/g, '').trim();
    const safeChapterTitle = chapter.title.replace(/[^a-zA-Z0-9 Tiếng Việt]/g, '').trim();
    link.download = `${safeStoryTitle} - ${safeChapterTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={styles.loadingState}>Đang mở sách...</div>;
  }

  if (!story || !chapter) {
    return (
      <div style={styles.errorState}>
        <h2>Không tìm thấy chương này</h2>
        <p>Có thể chương này chưa được xuất bản hoặc đã bị gỡ.</p>
        <Link to={`/story/${id}`} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Quay lại chi tiết truyện
        </Link>
      </div>
    );
  }

  const isAuthor = user && story.authorId === user.id;
  const visibleChapters = story.chapters.filter(c => c.status === 'published' || isAuthor);
  const currentIdx = visibleChapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? visibleChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < visibleChapters.length - 1 ? visibleChapters[currentIdx + 1] : null;

  const hasLiked = user && likes.includes(user.id);

  const renderDivider = () => {
    if (theme === 'covenant') {
      return (
        <div className="occult-divider">
          <div className="occult-divider-line"></div>
          <div className="occult-divider-diamond">
            <div className="occult-divider-diamond-inner"></div>
          </div>
          <div className="occult-divider-line"></div>
        </div>
      );
    }
    return <div style={styles.divider}></div>;
  };

  return (
    <div style={styles.pageWrapper} className="fade-in">
      {theme === 'covenant' && (
        <>
          <CovenantBackground />
          <div className="film-grain"></div>
        </>
      )}
      {/* Top Header Navigation */}
      <header 
        style={{
          ...styles.readerHeader,
          borderBottom: theme === 'covenant' ? '1px solid var(--border-color)' : styles.readerHeader.borderBottom,
          background: theme === 'covenant' ? 'rgba(20, 19, 19, 0.4)' : styles.readerHeader.background,
        }} 
        className="glass-panel"
      >
        <div style={styles.headerLeft}>
          <Link to={`/story/${story.id}`} style={{...styles.backBtn, color: theme === 'covenant' ? 'var(--primary)' : 'inherit'}}>
            <ArrowLeft size={18} />
            <span style={{
              ...styles.backText,
              fontFamily: theme === 'covenant' ? 'var(--font-sans)' : 'inherit',
              letterSpacing: theme === 'covenant' ? '1px' : 'normal',
            }}>
              {theme === 'covenant' ? 'QUAY LẠI HỒ SƠ' : story.title}
            </span>
          </Link>
        </div>

        {theme === 'covenant' && (
          <div style={styles.covenantHeaderCenter} className="hidden md:flex">
            <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style={{ width: '32px', height: '32px', marginRight: '10px' }}>
              <g fill="none" stroke="#eac07b" strokeOpacity="0.3" strokeWidth="0.8">
                <circle cx="200" cy="200" r="180" />
                <circle cx="200" cy="200" r="120" />
              </g>
              <g transform="translate(150, 150) scale(0.25)">
                <path d="M200,80 L220,150 L280,150 L230,190 L250,260 L200,220 L150,260 L170,190 L120,150 L180,150 Z" fill="#eac07b" />
              </g>
              <g>
                <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="60s" repeatCount="indefinite" />
                <circle cx="200" cy="20" fill="#141313" r="10" stroke="#eac07b" strokeWidth="1" />
                <circle cx="380" cy="200" fill="#141313" r="10" stroke="#eac07b" strokeWidth="1" />
                <circle cx="200" cy="380" fill="#141313" r="10" stroke="#eac07b" strokeWidth="1" />
                <circle cx="20" cy="200" fill="#141313" r="10" stroke="#eac07b" strokeWidth="1" />
              </g>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                HỒ SƠ: {story.title.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                BẢO MẬT CẤP CAO // UMBRA
              </span>
            </div>
          </div>
        )}

        <div style={styles.headerRight}>
          {theme === 'covenant' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '16px' }} className="hidden sm:flex">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  {Math.round(((currentIdx + 1) / visibleChapters.length) * 100)}% HOÀN THÀNH
                </span>
                <div style={{ width: '80px', height: '3px', background: 'rgba(255,255,255,0.1)', marginTop: '2px' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', width: `${((currentIdx + 1) / visibleChapters.length) * 100}%`, boxShadow: '0 0 4px var(--primary)' }}></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>{countdown}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>EVENT HORIZON</span>
              </div>
            </div>
          )}

          <button onClick={handleDownloadChapter} className="btn btn-secondary" title="Tải chương truyện (.txt)" style={{
            ...styles.iconBtn,
            borderColor: theme === 'covenant' ? 'var(--primary)' : styles.iconBtn.borderColor,
            color: theme === 'covenant' ? 'var(--primary)' : 'inherit',
            marginRight: '8px'
          }}>
            <Download size={18} />
          </button>

          <button onClick={() => setShowSettings(!showSettings)} className="btn btn-secondary" style={{
            ...styles.iconBtn,
            borderColor: theme === 'covenant' ? 'var(--primary)' : styles.iconBtn.borderColor,
            color: theme === 'covenant' ? 'var(--primary)' : 'inherit',
          }}>
            <Settings size={18} />
          </button>
          
          {showSettings && (
            <div style={styles.settingsMenu} className="glass-panel fade-in">
              <div style={styles.settingsGroup}>
                <label style={styles.settingsLabel}>Giao diện</label>
                <div style={styles.themeOptions}>
                  <button 
                    onClick={() => setTheme('light')} 
                    style={{...styles.themeBtn, background: '#f8fafc', color: '#0f172a', border: theme === 'light' ? '2px solid var(--primary)' : '1px solid #ccc'}}
                  >
                    Sáng
                  </button>
                  <button 
                    onClick={() => setTheme('sepia')} 
                    style={{...styles.themeBtn, background: '#f4edd8', color: '#5c4033', border: theme === 'sepia' ? '2px solid var(--primary)' : '1px solid #c8b99d'}}
                  >
                    Sepia
                  </button>
                  <button 
                    onClick={() => setTheme('dark')} 
                    style={{...styles.themeBtn, background: '#0b0f19', color: '#f3f4f6', border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid #334155'}}
                  >
                    Tối
                  </button>
                  <button 
                    onClick={() => setTheme('covenant')} 
                    style={{
                      ...styles.themeBtn, 
                      background: '#141313', 
                      color: '#eac07b', 
                      border: theme === 'covenant' ? '2px solid var(--primary)' : '1px solid #521d24',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Covenant
                  </button>
                </div>
              </div>

              <div style={styles.settingsGroup}>
                <label style={styles.settingsLabel}>Cỡ chữ: {fontSize}</label>
                <div style={styles.fontSizeOptions}>
                  <button onClick={() => setFontSize('15px')} style={{...styles.sizeBtn, fontWeight: fontSize === '15px' ? 'bold' : 'normal'}}>Nhỏ</button>
                  <button onClick={() => setFontSize('18px')} style={{...styles.sizeBtn, fontWeight: fontSize === '18px' ? 'bold' : 'normal'}}>Vừa</button>
                  <button onClick={() => setFontSize('21px')} style={{...styles.sizeBtn, fontWeight: fontSize === '21px' ? 'bold' : 'normal'}}>Lớn</button>
                  <button onClick={() => setFontSize('24px')} style={{...styles.sizeBtn, fontWeight: fontSize === '24px' ? 'bold' : 'normal'}}>Rất lớn</button>
                </div>
              </div>

              <div style={styles.settingsGroup}>
                <label style={styles.settingsLabel}>Phông chữ</label>
                <div style={styles.fontOptions}>
                  <button 
                    onClick={() => setFontFamily('serif')} 
                    style={{...styles.fontBtn, fontFamily: 'var(--font-serif)', border: fontFamily === 'serif' ? '2px solid var(--primary)' : '1px solid var(--border-color)'}}
                  >
                    Playfair Serif
                  </button>
                  <button 
                    onClick={() => setFontFamily('sans')} 
                    style={{...styles.fontBtn, fontFamily: 'var(--font-sans)', border: fontFamily === 'sans' ? '2px solid var(--primary)' : '1px solid var(--border-color)'}}
                  >
                    Inter Sans
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Chapter Text Area */}
      <main style={styles.readerBody}>
        <div style={styles.titleArea}>
          <div style={styles.chapSubtitle}>Chương {currentIdx + 1} của {visibleChapters.length}</div>
          <h1 style={{...styles.chapTitle, fontFamily: fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)'}}>{chapter.title}</h1>
          {renderDivider()}
        </div>

        <article className="reader-text-body"
          style={{
            ...styles.textBody, 
            fontSize: fontSize, 
            fontFamily: theme === 'covenant' 
              ? (fontFamily === 'serif' ? '"Source Serif 4", Georgia, serif' : 'var(--font-sans)')
              : (fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)')
          }}
          dangerouslySetInnerHTML={{ __html: chapter.content }}
        />

        {renderDivider()}

        {/* Footer Navigation within book */}
        <div style={styles.footerNav}>
          {prevChapter ? (
            <button 
              onClick={() => navigate(`/story/${story.id}/read/${prevChapter.id}`)}
              className="btn btn-secondary"
              style={styles.navBtn}
            >
              <ChevronLeft size={18} />
              Chương trước
            </button>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}

          <Link to={`/story/${story.id}`} style={styles.tocBtn}>
            <BookOpen size={16} />
            Mục lục
          </Link>

          {nextChapter ? (
            <button 
              onClick={() => navigate(`/story/${story.id}/read/${nextChapter.id}`)}
              className="btn btn-primary"
              style={styles.navBtn}
            >
              Chương sau
              <ChevronRight size={18} />
            </button>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}
        </div>
      </main>

      {/* Bottom Sticky Toolbar (Likes / Comment toggle) */}
      <div 
        style={{
          ...styles.bottomToolbar,
          maxWidth: theme === 'covenant' ? '460px' : '400px'
        }} 
        className="glass-panel"
      >
        <button onClick={handleLike} style={{color: hasLiked ? '#ef4444' : 'inherit'}} className="reader-toolbar-action">
          <Heart size={20} style={{ fill: hasLiked ? '#ef4444' : 'none' }} />
          <span>{likes.length} Thích</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="reader-toolbar-action">
          <MessageSquare size={20} />
          <span>Bình luận ({comments.length})</span>
        </button>
        {story.characters && story.characters.length > 0 && (
          <button 
            onClick={() => setShowDossier(!showDossier)} 
            className="reader-toolbar-action"
            style={{ color: theme === 'covenant' ? 'var(--primary)' : 'inherit' }}
          >
            <FolderOpen size={20} />
            <span>Hồ sơ mật</span>
          </button>
        )}
      </div>

      {/* Slide-out or Bottom Comments Section */}
      {showComments && (
        <section style={styles.commentsSection} className="glass-panel fade-in">
          <div style={styles.commentsHeader}>
            <h3>Bình luận Chương</h3>
            <button onClick={() => setShowComments(false)} style={styles.closeCommentsBtn}>Đóng</button>
          </div>

          {user ? (
            <form onSubmit={handlePostComment} style={styles.commentForm}>
              <input
                type="text"
                placeholder="Để lại bình luận của bạn tại đây..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={styles.commentInput}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={commentLoading} style={styles.commentSubmit}>
                Gửi
              </button>
            </form>
          ) : (
            <p style={styles.loginHint}>Vui lòng đăng nhập để bình luận chương.</p>
          )}

          <div style={styles.commentsList}>
            {comments.length === 0 ? (
              <p style={styles.noComments}>Chưa có bình luận nào cho chương này.</p>
            ) : (
              comments.map(c => (
                <div key={c.id} style={styles.commentCard}>
                  <div style={styles.commentMeta}>
                    <span style={styles.commentAuthor}>{c.username}</span>
                    <span style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p style={styles.commentContent}>{c.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Slide-out or overlay Character Dossier Section */}
      {showDossier && (
        <div style={styles.dossierOverlay} className="fade-in">
          <div style={styles.dossierHeader}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              UMBRA PRIME CLASSIFIED // REF: PC-CHAR-COLL
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary)', fontSize: '1.8rem', marginTop: '4px' }}>
              Hồ sơ Nhân vật Cận vệ (Character Files)
            </h2>
            <button onClick={() => setShowDossier(false)} style={styles.closeDossierBtn} className="btn btn-secondary">
              Đóng hồ sơ
            </button>
          </div>

          <div style={styles.dossierContent}>
            {theme === 'covenant' ? (
              <div className="covenant-bento-grid">
                {story.characters.map((char, index) => {
                  // Determine if locked
                  const isLocked = ['covenant-char-kingjonas', 'covenant-char-raiki', 'covenant-char-wanglam'].includes(char.id);
                  const isLarge = index === 0 || index === 1; // JinMuto and Seki are large cards
                  
                  return (
                    <div 
                      key={char.id} 
                      className={`covenant-case-card ${isLarge ? 'covenant-case-card-large' : 'covenant-case-card-small'}`}
                    >
                      <div style={{ position: 'relative', height: '240px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img 
                          src={char.avatarUrl} 
                          alt={char.name} 
                          className={`w-full h-full object-cover ${isLocked ? 'covenant-avatar-locked' : 'covenant-avatar-unlocked'}`}
                        />
                        {isLocked && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', flexDirection: 'column', gap: '8px' }}>
                            <Lock size={32} color="var(--primary)" />
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', color: 'var(--primary)', letterSpacing: '1px' }}>MÃ HÓA</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                          <span className={isLarge ? 'covenant-classified-chip-main' : 'covenant-classified-chip'}>
                            {isLarge ? 'ĐỐI TƯỢNG CHÍNH' : 'ĐỐI TƯỢNG PHỤ'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '4px' }}>
                            MÃ SỐ: #GH-1984-{char.name.substring(0, 3).toUpperCase()}
                          </div>
                          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            {isLocked ? (
                              <span className="covenant-redacted-bar">REDACTED</span>
                            ) : char.name}
                          </h3>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
                            {char.role}
                          </p>
                          
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                              CHI TIẾT GIÁM SÁT
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {char.description}
                            </p>
                          </div>
                        </div>

                        {!isLocked && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }} onClick={() => alert(`Đang truy xuất hồ sơ đầy đủ của ${char.name}...`)}>
                              XEM CHI TIẾT DOSSIER
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback default character display style */
              <div style={styles.defaultCharGrid}>
                {story.characters.map((char) => (
                  <div key={char.id} style={styles.defaultCharCard} className="glass-panel">
                    <img src={char.avatarUrl} alt={char.name} style={styles.defaultCharAvatar} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{char.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '6px' }}>{char.role}</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{char.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {theme === 'covenant' && (
        <footer style={styles.covenantFooter}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            MỖI VỊ KHÁCH ĐỀU ĐỂ LẠI ĐIỀU GÌ ĐÓ PHÍA SAU.
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.7rem', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>ÂM THANH: BẬT</span>
            <span>DI CHUYỂN: THẤP</span>
            <span style={{ color: 'var(--primary)' }}>© 1984 HỒ SƠ LƯU TRỮ GREYHAVEN</span>
          </div>
        </footer>
      )}
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '120px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '100px 0',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
  },
  errorState: {
    textAlign: 'center',
    padding: '100px 20px',
  },
  readerHeader: {
    position: 'sticky',
    top: '10px',
    width: '95%',
    maxWidth: '800px',
    margin: '10px auto',
    padding: '10px 20px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 90,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    maxWidth: '250px',
  },
  backText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '0.92rem',
  },
  headerRight: {
    position: 'relative',
  },
  iconBtn: {
    padding: '8px',
    borderRadius: '8px',
  },
  settingsMenu: {
    position: 'absolute',
    right: 0,
    top: '46px',
    width: '280px',
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    zIndex: 100,
  },
  settingsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingsLabel: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  themeOptions: {
    display: 'flex',
    gap: '8px',
  },
  themeBtn: {
    flex: 1,
    padding: '6px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textAlign: 'center',
  },
  fontSizeOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  sizeBtn: {
    padding: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  fontOptions: {
    display: 'flex',
    gap: '8px',
  },
  fontBtn: {
    flex: 1,
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textAlign: 'center',
  },
  readerBody: {
    width: '95%',
    maxWidth: '720px',
    margin: '40px auto 20px',
    padding: '0 15px',
  },
  titleArea: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  chapSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  chapTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    lineHeight: '1.25',
    color: 'var(--text-primary)',
  },
  divider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '30px 0',
  },
  textBody: {
    color: 'var(--text-primary)',
    textAlign: 'justify',
  },
  footerNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
  },
  navBtn: {
    padding: '10px 18px',
    fontSize: '0.9rem',
    flex: 1,
    maxWidth: '160px',
  },
  tocBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    fontSize: '0.9rem',
  },
  bottomToolbar: {
    position: 'fixed',
    bottom: '20px',
    width: '90%',
    maxWidth: '400px',
    padding: '10px 24px',
    borderRadius: '100px',
    display: 'flex',
    justifyContent: 'space-around',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    zIndex: 90,
  },
  toolbarAction: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  commentsSection: {
    position: 'fixed',
    bottom: '85px',
    width: '92%',
    maxWidth: '500px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 95,
  },
  commentsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
  },
  closeCommentsBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  commentForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  commentInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.9rem',
  },
  commentSubmit: {
    padding: '8px 16px',
    fontSize: '0.9rem',
  },
  loginHint: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '10px 0',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  noComments: {
    textAlign: 'center',
    padding: '20px 0',
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    fontStyle: 'italic',
  },
  commentCard: {
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
  },
  commentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginBottom: '4px',
  },
  commentAuthor: {
    fontWeight: '600',
    color: 'var(--primary)',
  },
  commentDate: {},
  commentContent: {
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  covenantHeaderCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  covenantFooter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '60px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
    paddingBottom: '40px',
    textAlign: 'center',
    width: '100%',
  },
  dossierOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(20, 19, 19, 0.95)',
    backdropFilter: 'blur(15px)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    padding: '30px',
    overflowY: 'auto',
  },
  dossierHeader: {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '20px',
    marginBottom: '20px',
    position: 'relative',
  },
  closeDossierBtn: {
    position: 'absolute',
    top: '10px',
    right: '0',
  },
  dossierContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  defaultCharGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    width: '100%',
    padding: '10px 0',
  },
  defaultCharCard: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    alignItems: 'center',
  },
  defaultCharAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
  }
};
