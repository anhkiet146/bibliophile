import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { BookOpen, User, Calendar, BookMarked, MessageSquare, ChevronRight, Users, MessageCircle, Heart, Star, Download } from 'lucide-react';

const getChapterLabel = (chapters, currentChapterId) => {
  let mainChapterIndex = 0;
  let sideStoryIndex = 0;
  
  for (const chap of chapters) {
    const isSideStory = chap.title.toLowerCase().includes('ngoại truyện');
    if (isSideStory) {
      sideStoryIndex++;
      if (chap.id === currentChapterId) {
        return `Ngoại truyện ${sideStoryIndex}`;
      }
    } else {
      mainChapterIndex++;
      if (chap.id === currentChapterId) {
        return `Chương ${mainChapterIndex}`;
      }
    }
  }
  return '';
};

export default function StoryDetails() {
  const { id } = useParams();
  const { user, getAuthHeader } = useAuth();
  const [story, setStory] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    async function fetchStoryAndComments() {
      try {
        const storyRes = await fetch(`${API_BASE_URL}/stories/${id}?t=${Date.now()}`, {
          headers: getAuthHeader ? getAuthHeader() : {}
        });
        if (!storyRes.ok) throw new Error('Không tìm thấy truyện');
        const storyData = await storyRes.json();
        setStory(storyData);

        const commentsRes = await fetch(`${API_BASE_URL}/stories/${id}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin truyện:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStoryAndComments();
  }, [id]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    setCommentError('');

    try {
      const response = await fetch(`${API_BASE_URL}/stories/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ content: newComment })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể gửi bình luận');
      }

      setComments([data, ...comments]);
      setNewComment('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này không?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi xóa bình luận');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadFullStory = () => {
    if (!story) return;

    const htmlToPlainText = (html) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };

    let fileContent = `Tác phẩm: ${story.title}
Tác giả: ${story.authorName}
Thể loại: ${story.genre}
Tóm tắt: ${story.synopsis}
==================================================
`;

    visibleChapters.forEach((chap) => {
      const plainText = htmlToPlainText(chap.content);
      fileContent += `\n\n--------------------------------------------------
${chap.title}
--------------------------------------------------\n\n${plainText}\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeStoryTitle = story.title.replace(/[^a-zA-Z0-9 Tiếng Việt]/g, '').trim();
    link.download = `${safeStoryTitle} - Toàn bộ.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={styles.loadingState}>Đang tải thông tin truyện...</div>;
  }

  if (!story) {
    return (
      <div style={styles.errorState}>
        <h2>Không tìm thấy tác phẩm</h2>
        <p>Đường dẫn có thể không chính xác hoặc truyện đã bị xóa.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Quay về trang chủ</Link>
      </div>
    );
  }

  const isAuthor = user && story.authorId === user.id;
  const visibleChapters = story.chapters.filter(chap => chap.status === 'published' || isAuthor);
  const firstChapterId = visibleChapters.length > 0 ? visibleChapters[0].id : null;

  return (
    <div style={styles.container} className="fade-in">
      {/* Back Button */}
      <Link to="/" style={styles.backLink}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
        <span>Quay lại trang chủ</span>
      </Link>

      {/* Story Info Header Card */}
      <section style={styles.headerCard} className="glass-panel details-header-card">
        <div style={styles.coverWrapper}>
          <img src={story.coverImage} alt={story.title} style={styles.coverImage} />
        </div>
        
        <div style={styles.infoWrapper}>
          <div style={styles.genreRow}>
            <span style={styles.genreBadge}>{story.genre}</span>
            <span style={styles.dateBadge}>
              <Calendar size={14} /> 
              {new Date(story.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>

          <h1 style={styles.title}>{story.title}</h1>
          
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              <User size={16} /> 
              <span>Tác giả: <strong>{story.authorName}</strong></span>
            </span>
            <span style={styles.metaItem}>
              <BookMarked size={16} /> 
              <span>{visibleChapters.length} chương</span>
            </span>
          </div>

          <p style={styles.synopsis}>{story.synopsis}</p>

          <div style={styles.tagsRow}>
            {story.tags.map((tag, idx) => (
              <span key={idx} style={styles.tag}>#{tag}</span>
            ))}
          </div>

          <div style={styles.actionRow}>
            {firstChapterId ? (
              <>
                <Link to={`/story/${story.id}/read/${firstChapterId}`} className="btn btn-primary" style={styles.readBtn}>
                  <BookOpen size={18} />
                  Bắt đầu đọc truyện
                </Link>
                <button onClick={handleDownloadFullStory} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} />
                  Tải toàn bộ (.txt)
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" disabled style={styles.readBtn}>
                Truyện chưa có chương
              </button>
            )}
            {isAuthor && (
              <Link to={`/studio?storyId=${story.id}`} className="btn btn-secondary">
                Chỉnh sửa tác phẩm
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CHARACTERS SECTION (REQUIRED TO BE ABOVE CHAPTERS LIST) */}
      <section style={styles.section} className="fade-in">
        <div style={styles.sectionTitleRow}>
          <Users size={22} color="#8b5cf6" />
          <h2 style={styles.sectionTitle}>Thông tin Nhân vật</h2>
        </div>
        
        {!story.characters || story.characters.length === 0 ? (
          <div style={styles.emptyCharacters} className="glass-panel">
            <p>Tác phẩm này chưa được giới thiệu nhân vật.</p>
          </div>
        ) : (
          <div style={styles.charactersGrid}>
            {story.characters.map(char => (
              <div key={char.id} className="glass-card" style={styles.characterCard}>
                <div style={styles.charAvatarWrapper}>
                  <img 
                    src={char.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                    alt={char.name} 
                    style={styles.charAvatar} 
                  />
                </div>
                <div style={styles.charInfo}>
                  <div style={styles.charHeader}>
                    <h3 style={styles.charName}>{char.name}</h3>
                    <span style={styles.charRoleBadge}>{char.role || 'Nhân vật'}</span>
                  </div>
                  <p style={styles.charDesc}>{char.description || 'Chưa có tiểu sử chi tiết.'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CHAPTERS LIST SECTION (MUST BE BELOW CHARACTERS) */}
      <section style={styles.section} className="fade-in">
        <div style={styles.sectionTitleRow}>
          <BookMarked size={22} color="#8b5cf6" />
          <h2 style={styles.sectionTitle}>Danh sách Chương</h2>
        </div>

        {visibleChapters.length === 0 ? (
          <div style={styles.emptyChapters} className="glass-panel">
            <p>Tác giả chưa xuất bản chương nào cho tác phẩm này.</p>
          </div>
        ) : (
          <div style={styles.chaptersList} className="glass-panel">
            {visibleChapters.map((chapter, index) => (
              <Link 
                key={chapter.id} 
                to={`/story/${story.id}/read/${chapter.id}`}
                style={styles.chapterItem}
                className="details-chapter-item"
              >
                <div style={styles.chapterIndex}>{getChapterLabel(visibleChapters, chapter.id)}</div>
                <div style={styles.chapterTitleWrapper}>
                  <span style={styles.chapterTitle}>{chapter.title}</span>
                  {chapter.status === 'draft' && <span style={styles.draftBadge}>Bản nháp</span>}
                </div>
                <div style={styles.chapterMeta}>
                  <span style={styles.chapterLikes}><Heart size={14} style={{ fill: chapter.likes.length > 0 ? '#ef4444' : 'none', color: chapter.likes.length > 0 ? '#ef4444' : 'var(--text-secondary)' }} /> {chapter.likes.length}</span>
                  <span style={styles.chapterDate}>{new Date(chapter.createdAt).toLocaleDateString('vi-VN')}</span>
                  <ChevronRight size={18} style={styles.chapterArrow} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* STORY DISCUSSIONS / COMMENTS */}
      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <MessageCircle size={22} color="#8b5cf6" />
          <h2 style={styles.sectionTitle}>Thảo luận ({comments.length})</h2>
        </div>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handlePostComment} style={styles.commentForm} className="glass-panel">
            <textarea
              placeholder="Chia sẻ cảm nghĩ của bạn về tác phẩm này..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
              rows={3}
              style={styles.textarea}
            />
            {commentError && <p style={styles.commentError}>{commentError}</p>}
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={styles.postCommentBtn}
              disabled={commentLoading}
            >
              {commentLoading ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </form>
        ) : (
          <div style={styles.loginToComment} className="glass-panel">
            <p>Vui lòng <Link to="/auth" style={styles.loginLink}>đăng nhập</Link> để tham gia thảo luận cùng mọi người.</p>
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsList}>
          {comments.length === 0 ? (
            <p style={styles.noComments}>Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} style={styles.commentItem} className="glass-panel">
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{comment.username}</span>
                  <div style={styles.commentMeta}>
                    <span style={styles.commentDate}>{new Date(comment.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(comment.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                    {(user && (comment.userId === user.id || isAuthor || user.id === 'system')) && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)} 
                        style={styles.deleteCommentBtn}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
                <p style={styles.commentContent}>{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px 20px 80px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    fontSize: '0.95rem',
  },
  loadingState: {
    textAlign: 'center',
    padding: '100px 0',
    color: 'var(--text-secondary)',
  },
  errorState: {
    textAlign: 'center',
    padding: '100px 20px',
  },
  headerCard: {
    display: 'flex',
    flexDirection: 'row',
    padding: '30px',
    borderRadius: '24px',
    gap: '30px',
    marginBottom: '40px',
  },
  coverWrapper: {
    flexShrink: 0,
  },
  coverImage: {
    width: '220px',
    height: '308px',
    objectFit: 'cover',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-hover)',
  },
  infoWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  genreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  genreBadge: {
    background: 'var(--primary-glow)',
    color: '#a78bfa',
    border: '1px solid var(--border-color)',
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '800',
    marginBottom: '12px',
    lineHeight: '1.2',
  },
  metaRow: {
    display: 'flex',
    gap: '20px',
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    marginBottom: '16px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  synopsis: {
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    marginBottom: '20px',
    fontSize: '0.98rem',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '28px',
  },
  tag: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  readBtn: {
    padding: '12px 28px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  emptyCharacters: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    borderRadius: '16px',
  },
  charactersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  characterCard: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    alignItems: 'center',
    padding: '16px',
  },
  charAvatarWrapper: {
    flexShrink: 0,
  },
  charAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--primary)',
    boxShadow: 'var(--shadow-main)',
  },
  charInfo: {
    flex: 1,
    minWidth: 0,
  },
  charHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '4px',
  },
  charName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  charRoleBadge: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500',
  },
  charDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  chaptersList: {
    padding: '8px',
    borderRadius: '16px',
  },
  chapterItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderRadius: '10px',
    borderBottom: '1px solid var(--border-color)',
  },
  chapterIndex: {
    width: '90px',
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--primary)',
  },
  chapterTitleWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  chapterTitle: {
    fontWeight: '500',
    fontSize: '0.98rem',
  },
  draftBadge: {
    background: 'var(--warning)',
    color: 'black',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  chapterMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
  },
  chapterLikes: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  chapterDate: {
    color: 'var(--text-muted)',
  },
  chapterArrow: {
    color: 'var(--text-muted)',
  },
  commentForm: {
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
  },
  textarea: {
    width: '100%',
    resize: 'vertical',
    minHeight: '80px',
  },
  commentError: {
    alignSelf: 'flex-start',
    color: 'var(--error)',
    fontSize: '0.9rem',
  },
  postCommentBtn: {
    padding: '10px 20px',
  },
  loginToComment: {
    padding: '20px',
    textAlign: 'center',
    borderRadius: '16px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },
  loginLink: {
    color: 'var(--primary)',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  noComments: {
    textAlign: 'center',
    padding: '40px 0',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  commentItem: {
    padding: '20px',
    borderRadius: '16px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '0.88rem',
  },
  commentAuthor: {
    fontWeight: '700',
    color: 'var(--primary)',
  },
  commentMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  commentDate: {
    color: 'var(--text-muted)',
  },
  deleteCommentBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--error)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    '&:hover': {
      textDecoration: 'underline',
    }
  },
  commentContent: {
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  }
};
