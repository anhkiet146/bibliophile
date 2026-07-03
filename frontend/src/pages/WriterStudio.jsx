import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { BookOpen, Plus, Edit, Trash2, BookMarked, Save, X, Eye, FileText, ArrowLeft, PlusCircle, User, Award, Settings } from 'lucide-react';

const cleanVietnameseText = (text) => {
  if (typeof text !== 'string') return text;
  
  let clean = text
    .replace(/\u00B4/g, '\u0301') // spacing acute -> combining acute
    .replace(/\u0060/g, '\u0300') // spacing grave -> combining grave
    .replace(/\u02DC/g, '\u0303'); // spacing tilde -> combining tilde
    
  clean = clean.normalize('NFC');
  
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
};

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

export default function WriterStudio() {
  const { user, loading: authLoading, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // States
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation states inside studio
  // 'list' | 'create-story' | 'manage-story' | 'write-chapter' | 'edit-chapter'
  const [view, setView] = useState('list'); 
  const [activeStory, setActiveStory] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);

  // Forms states
  const [storyForm, setStoryForm] = useState({
    title: '', synopsis: '', coverImage: '', genre: '', tags: '', status: 'published'
  });
  
  const [chapterForm, setChapterForm] = useState({
    title: '', content: '', status: 'published'
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [charForm, setCharForm] = useState({ name: '', role: '', description: '', avatarUrl: '' });
  const [showCharForm, setShowCharForm] = useState(false);

  const handleFileChange = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      alert('Kích thước ảnh phải nhỏ hơn 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Fetch stories
  const fetchMyStories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stories?t=${Date.now()}`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        // Filter stories owned by current user (or show all if admin/system)
        const myStories = data.filter(s => s.authorId === user.id || user.id === 'system');
        setStories(myStories);

        // If managing a story, update activeStory state with fresh details
        if (activeStory) {
          const freshActive = myStories.find(s => s.id === activeStory.id);
          if (freshActive) {
            // Need to fetch full story (with chapters)
            const fullRes = await fetch(`${API_BASE_URL}/stories/${freshActive.id}?t=${Date.now()}`, {
              headers: getAuthHeader()
            });
            if (fullRes.ok) {
              const fullStory = await fullRes.json();
              setActiveStory(fullStory);
              setCharacters(fullStory.characters || []);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyStories();
  }, [user]);

  useEffect(() => {
    if (stories.length > 0) {
      const params = new URLSearchParams(location.search);
      const storyId = params.get('storyId');
      if (storyId) {
        const targetStory = stories.find(s => s.id === storyId);
        if (targetStory) {
          // Open managing mode immediately
          handleManageStory(targetStory);
        }
      }
    }
  }, [location.search, stories]);

  // Story CRUD operations
  const handleCreateStory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          ...storyForm,
          tags: storyForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          characters: []
        })
      });

      if (response.ok) {
        setStoryForm({ title: '', synopsis: '', coverImage: '', genre: '', tags: '', status: 'published' });
        setView('list');
        fetchMyStories();
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi tạo truyện');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${activeStory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: activeStory.title,
          synopsis: activeStory.synopsis,
          coverImage: activeStory.coverImage,
          genre: activeStory.genre,
          tags: Array.isArray(activeStory.tags) ? activeStory.tags : activeStory.tags.split(',').map(t => t.trim()),
          characters: characters,
          status: activeStory.status || 'published'
        })
      });

      if (response.ok) {
        alert('Cập nhật truyện thành công!');
        fetchMyStories();
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi cập nhật truyện');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN truyện này cùng toàn bộ chương và bình luận?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        setView('list');
        setActiveStory(null);
        fetchMyStories();
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi xóa truyện');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chapter operations
  const handleOpenWriteChapter = () => {
    setChapterForm({ title: '', content: '', status: 'published' });
    setIsPreviewMode(false);
    setView('write-chapter');
  };

  const handleOpenEditChapter = (chap) => {
    setActiveChapter(chap);
    setChapterForm({
      title: chap.title,
      content: chap.content,
      status: chap.status
    });
    setIsPreviewMode(false);
    setView('edit-chapter');
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!chapterForm.title.trim() || !chapterForm.content.trim()) {
      alert('Vui lòng điền tiêu đề và nội dung chương');
      return;
    }

    const isEditing = view === 'edit-chapter';
    const url = isEditing 
      ? `${API_BASE_URL}/stories/${activeStory.id}/chapters/${activeChapter.id}`
      : `${API_BASE_URL}/stories/${activeStory.id}/chapters`;

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          ...chapterForm,
          title: cleanVietnameseText(chapterForm.title),
          content: cleanVietnameseText(chapterForm.content)
        })
      });

      if (response.ok) {
        setView('manage-story');
        setActiveChapter(null);
        fetchMyStories(); // Reload chapters list
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi lưu chương');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChapter = async (chapId) => {
    if (!window.confirm('Bạn có chắc muốn xóa chương này?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/stories/${activeStory.id}/chapters/${chapId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        fetchMyStories();
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi xóa chương');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Character operations
  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!charForm.name.trim()) return;

    const newChar = {
      id: Math.random().toString(36).substring(2, 9),
      ...charForm
    };

    const updatedChars = [...characters, newChar];
    setCharacters(updatedChars);
    
    // Auto-save story characters to backend immediately!
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${activeStory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: activeStory.title,
          synopsis: activeStory.synopsis,
          coverImage: activeStory.coverImage,
          genre: activeStory.genre,
          tags: Array.isArray(activeStory.tags) ? activeStory.tags : activeStory.tags.split(',').map(t => t.trim()),
          characters: updatedChars,
          status: activeStory.status || 'published'
        })
      });
      if (response.ok) {
        fetchMyStories();
      } else {
        console.error('Lỗi tự động lưu nhân vật');
      }
    } catch (err) {
      console.error(err);
    }

    setCharForm({ name: '', role: '', description: '', avatarUrl: '' });
    setShowCharForm(false);
  };

  const handleDeleteCharacter = async (charId) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhân vật này?')) return;
    const updatedChars = characters.filter(c => c.id !== charId);
    setCharacters(updatedChars);

    // Auto-save story characters to backend immediately!
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${activeStory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: activeStory.title,
          synopsis: activeStory.synopsis,
          coverImage: activeStory.coverImage,
          genre: activeStory.genre,
          tags: Array.isArray(activeStory.tags) ? activeStory.tags : activeStory.tags.split(',').map(t => t.trim()),
          characters: updatedChars,
          status: activeStory.status || 'published'
        })
      });
      if (response.ok) {
        fetchMyStories();
      } else {
        console.error('Lỗi tự động lưu sau khi xóa nhân vật');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Story View Trigger
  const handleManageStory = async (story) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${story.id}?t=${Date.now()}`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setActiveStory(data);
        setCharacters(data.characters || []);
        setView('manage-story');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div style={styles.loadingText}>Đang kiểm tra tài khoản...</div>;
  if (!user) return null;

  return (
    <div style={styles.container} className="fade-in">
      {/* View A: Stories List */}
      {view === 'list' && (
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h1 style={styles.title}>Studio Sáng Tác</h1>
              <p style={styles.subtitle}>Quản lý các câu chuyện và chương viết của bạn.</p>
            </div>
            <button 
              onClick={() => setView('create-story')} 
              className="btn btn-primary"
            >
              <Plus size={18} /> Viết tác phẩm mới
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingText}>Đang tải danh sách tác phẩm...</div>
          ) : stories.length === 0 ? (
            <div style={styles.emptyStudio} className="glass-panel">
              <BookOpen size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>Bạn chưa viết tác phẩm nào. Hãy ấn nút phía trên để bắt đầu!</p>
            </div>
          ) : (
            <div style={styles.storiesList}>
              {stories.map(story => (
                <div key={story.id} style={styles.storyRow} className="glass-panel studio-story-row">
                  <img src={story.coverImage} alt={story.title} style={styles.storyRowCover} />
                  <div style={styles.storyRowInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={styles.rowGenre}>{story.genre}</span>
                      {story.status === 'draft' && (
                        <span style={{
                          fontSize: '0.72rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: '500'
                        }}>
                          Bản nháp / Ẩn
                        </span>
                      )}
                    </div>
                    <h3 style={styles.rowTitle}>{story.title}</h3>
                    <p style={styles.rowChapters}>
                      <BookMarked size={14} /> {story.chapterCount} chương ({story.publishedChapterCount} xuất bản)
                    </p>
                    <p style={styles.rowSynopsis}>{story.synopsis}</p>
                  </div>
                  <div style={styles.rowActions}>
                    <button 
                      onClick={() => handleManageStory(story)} 
                      className="btn btn-secondary"
                    >
                      <Edit size={16} /> Quản lý
                    </button>
                    <Link to={`/story/${story.id}`} className="btn btn-secondary">
                      <Eye size={16} /> Xem trang truyện
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* View B: Create Story Form */}
      {view === 'create-story' && (
        <section style={styles.formContainer} className="glass-panel fade-in">
          <div style={styles.formHeader}>
            <button onClick={() => setView('list')} style={styles.backBtn}>
              <ArrowLeft size={18} /> Quay lại danh sách
            </button>
            <h2 style={styles.formTitle}>Tạo Tác Phẩm Mới</h2>
          </div>

          <form onSubmit={handleCreateStory} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tên truyện *</label>
              <input
                type="text"
                placeholder="Nhập tên tác phẩm..."
                value={storyForm.title}
                onChange={e => setStoryForm({ ...storyForm, title: e.target.value })}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Thể loại (Ví dụ: Fantasy, Lãng mạn, Đời thường, Trinh thám...)</label>
              <input
                type="text"
                placeholder="Nhập thể loại..."
                value={storyForm.genre}
                onChange={e => setStoryForm({ ...storyForm, genre: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Từ khóa / Tags (Phân tách bằng dấu phẩy)</label>
              <input
                type="text"
                placeholder="Ví dụ: Phiêu lưu, Phép thuật, Trùng sinh..."
                value={storyForm.tags}
                onChange={e => setStoryForm({ ...storyForm, tags: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Ảnh bìa tác phẩm</label>
              <div style={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileChange(e, (base64) => setStoryForm({ ...storyForm, coverImage: base64 }))}
                  style={styles.fileInput}
                  id="story-cover-upload"
                />
                <label htmlFor="story-cover-upload" style={styles.uploadBox} className="glass-panel">
                  {storyForm.coverImage ? (
                    <div style={styles.uploadPreviewWrapper}>
                      <img src={storyForm.coverImage} alt="Cover Preview" style={styles.uploadPreview} />
                      <span style={styles.uploadBtnText}>Thay đổi ảnh</span>
                    </div>
                  ) : (
                    <div style={styles.uploadPlaceholder}>
                      <Plus size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                      <span>Chọn ảnh từ máy tính...</span>
                    </div>
                  )}
                </label>
                <div style={styles.uploadOr}>hoặc dán đường dẫn ảnh:</div>
                <input
                  type="text"
                  placeholder="Dán link ảnh bìa trực tuyến..."
                  value={storyForm.coverImage.startsWith('data:') ? '' : storyForm.coverImage}
                  onChange={e => setStoryForm({ ...storyForm, coverImage: e.target.value })}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Tóm tắt truyện *</label>
              <textarea
                placeholder="Mô tả ngắn gọn về cốt truyện, các xung đột chính..."
                value={storyForm.synopsis}
                onChange={e => setStoryForm({ ...storyForm, synopsis: e.target.value })}
                required
                rows={5}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Trạng thái hiển thị</label>
              <select
                value={storyForm.status}
                onChange={e => setStoryForm({ ...storyForm, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="published" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Công khai (Xuất bản ngay)</option>
                <option value="draft" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Ẩn / Lưu nháp (Chỉ tác giả thấy)</option>
              </select>
            </div>

            <div style={styles.formButtons}>
              <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Hủy bỏ</button>
              <button type="submit" className="btn btn-primary">Tạo tác phẩm</button>
            </div>
          </form>
        </section>
      )}

      {/* View C: Manage Story Panel (Chapters, Characters, Settings) */}
      {view === 'manage-story' && activeStory && (
        <section className="fade-in">
          {/* Back Header */}
          <div style={styles.formHeader}>
            <button onClick={() => setView('list')} style={styles.backBtn}>
              <ArrowLeft size={18} /> Quay lại danh sách
            </button>
            <h2 style={styles.formTitle}>Quản lý: {activeStory.title}</h2>
          </div>

          <div style={styles.manageLayout} className="studio-manage-layout">
            {/* Left Column: Chapters & Characters */}
            <div style={styles.manageMainCol}>
              {/* Chapters Subsection */}
              <div style={styles.manageSection} className="glass-panel">
                <div style={styles.sectionHeader}>
                  <h3 style={styles.subSectionTitle}><BookMarked size={18} /> Danh sách chương</h3>
                  <button onClick={handleOpenWriteChapter} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    <Plus size={14} /> Thêm chương mới
                  </button>
                </div>

                {activeStory.chapters.length === 0 ? (
                  <p style={styles.emptyMetaText}>Tác phẩm chưa viết chương nào.</p>
                ) : (
                  <div style={styles.studioChaptersList}>
                    {activeStory.chapters.map((chap, idx) => (
                      <div key={chap.id} style={styles.studioChapterRow}>
                        <div style={styles.studioChapterInfo}>
                          <span style={styles.studioChapterIndex}>{getChapterLabel(activeStory.chapters, chap.id)}</span>
                          <span style={styles.studioChapterTitle}>{chap.title}</span>
                          <span style={{
                            ...styles.statusBadge, 
                            background: chap.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: chap.status === 'published' ? 'var(--success)' : 'var(--warning)'
                          }}>
                            {chap.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                          </span>
                        </div>
                        <div style={styles.studioChapterActions}>
                          <button onClick={() => handleOpenEditChapter(chap)} style={styles.rowIconBtn} title="Sửa chương">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteChapter(chap.id)} style={{...styles.rowIconBtn, color: 'var(--error)'}} title="Xóa chương">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Characters Subsection (REQUIRED LAYOUT REQUIREMENT FOR CHARACTER MANAGEMENT) */}
              <div style={styles.manageSection} className="glass-panel">
                <div style={styles.sectionHeader}>
                  <h3 style={styles.subSectionTitle}><User size={18} /> Thông tin Nhân vật</h3>
                  <button 
                    onClick={() => setShowCharForm(!showCharForm)} 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    {showCharForm ? 'Đóng form' : 'Thêm nhân vật'}
                  </button>
                </div>

                {/* Character Creation Mini-form */}
                {showCharForm && (
                  <form onSubmit={handleAddCharacter} style={styles.charMiniForm}>
                    <div style={styles.charFormGrid}>
                      <input
                        type="text"
                        placeholder="Tên nhân vật..."
                        value={charForm.name}
                        onChange={e => setCharForm({ ...charForm, name: e.target.value })}
                        required
                        style={styles.charInput}
                      />
                      <input
                        type="text"
                        placeholder="Vai trò (VD: Nhân vật chính, Hộ vệ...)..."
                        value={charForm.role}
                        onChange={e => setCharForm({ ...charForm, role: e.target.value })}
                        style={styles.charInput}
                      />
                      <div style={{...styles.charInput, gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <label style={{fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)'}}>Ảnh đại diện Nhân vật</label>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileChange(e, (base64) => setCharForm({ ...charForm, avatarUrl: base64 }))}
                            style={{display: 'none'}}
                            id="char-avatar-upload"
                          />
                          <label htmlFor="char-avatar-upload" className="btn btn-secondary" style={{fontSize: '0.85rem', padding: '6px 12px'}}>
                            Tải ảnh nhân vật
                          </label>
                          {charForm.avatarUrl && (
                            <img 
                              src={charForm.avatarUrl} 
                              alt="Char Avatar Preview" 
                              style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)'}} 
                            />
                          )}
                          <span style={{fontSize: '0.82rem', color: 'var(--text-muted)'}}>hoặc dán URL:</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Dán URL ảnh nhân vật..."
                          value={charForm.avatarUrl.startsWith('data:') ? '' : charForm.avatarUrl}
                          onChange={e => setCharForm({ ...charForm, avatarUrl: e.target.value })}
                          style={{width: '100%'}}
                        />
                      </div>
                      <textarea
                        placeholder="Mô tả tính cách, năng lực hoặc lý lịch..."
                        value={charForm.description}
                        onChange={e => setCharForm({ ...charForm, description: e.target.value })}
                        rows={2}
                        style={{...styles.charInput, gridColumn: 'span 2'}}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'fit-content', alignSelf: 'flex-end' }}>
                      <PlusCircle size={14} /> Thêm nhân vật vào danh sách
                    </button>
                  </form>
                )}

                {characters.length === 0 ? (
                  <p style={styles.emptyMetaText}>Chưa có nhân vật nào được tạo. Nhấn "Thêm nhân vật" ở trên.</p>
                ) : (
                  <div style={styles.studioCharsGrid}>
                    {characters.map(char => (
                      <div key={char.id} style={styles.studioCharCard}>
                        <img 
                          src={char.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
                          alt={char.name} 
                          style={styles.studioCharAvatar} 
                        />
                        <div style={styles.studioCharInfo}>
                          <div style={styles.studioCharHeader}>
                            <strong>{char.name}</strong>
                            <span style={styles.studioCharRole}>{char.role || 'Nhân vật'}</span>
                          </div>
                          <p style={styles.studioCharDesc}>{char.description}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleDeleteCharacter(char.id)} 
                          style={styles.charDeleteBtn}
                          title="Xóa nhân vật"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Story Settings Form */}
            <div style={styles.manageSideCol}>
              <div style={styles.manageSection} className="glass-panel">
                <h3 style={{...styles.subSectionTitle, marginBottom: '20px'}}><Settings size={18} /> Cài đặt truyện</h3>
                
                <form onSubmit={handleUpdateStory} style={styles.sideForm}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tên truyện</label>
                    <input
                      type="text"
                      value={activeStory.title}
                      onChange={e => setActiveStory({ ...activeStory, title: e.target.value })}
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Thể loại</label>
                    <input
                      type="text"
                      value={activeStory.genre}
                      onChange={e => setActiveStory({ ...activeStory, genre: e.target.value })}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tags (Phân tách bằng dấu phẩy)</label>
                    <input
                      type="text"
                      value={Array.isArray(activeStory.tags) ? activeStory.tags.join(', ') : activeStory.tags}
                      onChange={e => setActiveStory({ ...activeStory, tags: e.target.value })}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Ảnh bìa tác phẩm</label>
                    <div style={styles.uploadArea}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (base64) => setActiveStory({ ...activeStory, coverImage: base64 }))}
                        style={styles.fileInput}
                        id="edit-cover-upload"
                      />
                      <label htmlFor="edit-cover-upload" style={styles.uploadBox} className="glass-panel">
                        {activeStory.coverImage ? (
                          <div style={styles.uploadPreviewWrapper}>
                            <img src={activeStory.coverImage} alt="Cover Preview" style={styles.uploadPreview} />
                            <span style={styles.uploadBtnText}>Thay đổi ảnh</span>
                          </div>
                        ) : (
                          <div style={styles.uploadPlaceholder}>
                            <Plus size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                            <span>Chọn ảnh từ máy tính...</span>
                          </div>
                        )}
                      </label>
                      <div style={styles.uploadOr}>hoặc dán đường dẫn ảnh:</div>
                      <input
                        type="text"
                        value={activeStory.coverImage.startsWith('data:') ? '' : activeStory.coverImage}
                        onChange={e => setActiveStory({ ...activeStory, coverImage: e.target.value })}
                        placeholder="Dán link ảnh bìa trực tuyến..."
                      />
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tóm tắt truyện</label>
                    <textarea
                      value={activeStory.synopsis}
                      onChange={e => setActiveStory({ ...activeStory, synopsis: e.target.value })}
                      required
                      rows={6}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Trạng thái hiển thị</label>
                    <select
                      value={activeStory.status || 'published'}
                      onChange={e => setActiveStory({ ...activeStory, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer',
                        marginBottom: '15px'
                      }}
                    >
                      <option value="published" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Công khai (Xuất bản ngay)</option>
                      <option value="draft" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Ẩn / Lưu nháp (Chỉ tác giả thấy)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <Save size={16} /> Lưu các chỉnh sửa
                  </button>
                </form>

                <div style={styles.dangerZone}>
                  <h4 style={styles.dangerTitle}>Vùng nguy hiểm</h4>
                  <button 
                    onClick={() => handleDeleteStory(activeStory.id)} 
                    className="btn btn-danger" 
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                  >
                    <Trash2 size={14} /> Xóa tác phẩm này
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* View D: Chapter Editor (Write / Edit Chapter) */}
      {(view === 'write-chapter' || view === 'edit-chapter') && activeStory && (
        <section style={styles.editorView} className="fade-in">
          <div style={styles.editorHeader} className="glass-panel">
            <div style={styles.editorHeaderLeft}>
              <button onClick={() => setView('manage-story')} style={styles.backBtn}>
                <ArrowLeft size={16} /> Quay lại
              </button>
              <span style={styles.editorTitle}>
                {view === 'write-chapter' ? 'Viết chương mới' : `Chỉnh sửa: ${activeChapter.title}`}
              </span>
            </div>

            <div style={styles.editorHeaderRight}>
              <button 
                type="button" 
                onClick={() => setIsPreviewMode(!isPreviewMode)} 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {isPreviewMode ? <Edit size={14} /> : <Eye size={14} />}
                {isPreviewMode ? 'Quay lại soạn thảo' : 'Xem trước bản in'}
              </button>
              <button 
                onClick={handleSaveChapter} 
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                <Save size={14} /> Lưu chương sách
              </button>
            </div>
          </div>

          {isPreviewMode ? (
            <div style={styles.previewContainer} className="glass-panel">
              <h1 style={styles.previewTitle}>{cleanVietnameseText(chapterForm.title) || 'Chương không có tiêu đề'}</h1>
              <div style={styles.previewDivider}></div>
              <div 
                className="preview-body"
                style={styles.previewBody} 
                dangerouslySetInnerHTML={{ __html: cleanVietnameseText(chapterForm.content) }} 
              />
            </div>
          ) : (
            <form style={styles.editorForm}>
              <div style={styles.editorMetaRow}>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề chương... (Ví dụ: Chương 1: Sự khởi đầu bí ẩn)"
                  value={chapterForm.title}
                  onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })}
                  required
                  style={styles.editorTitleInput}
                />
                
                <select
                  value={chapterForm.status}
                  onChange={e => setChapterForm({ ...chapterForm, status: e.target.value })}
                  style={styles.editorSelect}
                >
                  <option value="published">Xuất bản ngay</option>
                  <option value="draft">Lưu nháp</option>
                </select>
              </div>

              <div style={styles.editorTips}>
                <strong>Mẹo viết:</strong> Hỗ trợ mã HTML đơn giản để định dạng đoạn văn: dùng <code>&lt;p&gt;Nội dung đoạn văn&lt;/p&gt;</code> để xuống dòng thụt lề, hoặc dùng <code>&lt;strong&gt;in đậm&lt;/strong&gt;</code>.
              </div>

              <textarea
                placeholder="Nhập nội dung chương truyện tại đây..."
                value={chapterForm.content}
                onChange={e => setChapterForm({ ...chapterForm, content: e.target.value })}
                required
                style={styles.editorTextarea}
              />
            </form>
          )}
        </section>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px 80px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  loadingText: {
    textAlign: 'center',
    padding: '80px 0',
    color: 'var(--text-secondary)',
  },
  emptyStudio: {
    padding: '80px 0',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  storiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  storyRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: '20px',
    borderRadius: '16px',
    alignItems: 'center',
    gap: '24px',
  },
  storyRowCover: {
    width: '90px',
    height: '126px',
    objectFit: 'cover',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  },
  storyRowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  rowGenre: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--primary)',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  rowTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '6px',
  },
  rowChapters: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '8px',
  },
  rowSynopsis: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  rowActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  formContainer: {
    padding: '30px',
    borderRadius: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '28px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  formTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  manageLayout: {
    display: 'grid',
    gridTemplateColumns: '7fr 4fr',
    gap: '24px',
  },
  manageMainCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  manageSideCol: {},
  manageSection: {
    padding: '24px',
    borderRadius: '20px',
  },
  subSectionTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emptyMetaText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    padding: '20px 0',
  },
  studioChaptersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  studioChapterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
  },
  studioChapterInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  studioChapterIndex: {
    fontWeight: '600',
    color: 'var(--primary)',
    fontSize: '0.88rem',
  },
  studioChapterTitle: {
    fontWeight: '500',
    fontSize: '0.92rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  studioChapterActions: {
    display: 'flex',
    gap: '8px',
  },
  rowIconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'background 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.05)',
      color: 'var(--text-primary)',
    }
  },
  charMiniForm: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  charFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  charInput: {
    padding: '8px 12px',
    fontSize: '0.88rem',
  },
  studioCharsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginTop: '16px',
  },
  studioCharCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px',
  },
  studioCharAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1.5px solid var(--primary)',
  },
  studioCharInfo: {
    flex: 1,
    minWidth: 0,
  },
  studioCharHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    marginBottom: '2px',
  },
  studioCharRole: {
    fontSize: '0.72rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  studioCharDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  charDeleteBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px',
    '&:hover': {
      color: 'var(--error)',
    }
  },
  sideForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dangerZone: {
    marginTop: '32px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
  },
  dangerTitle: {
    color: 'var(--error)',
    fontSize: '0.88rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  editorView: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderRadius: '16px',
    marginBottom: '20px',
  },
  editorHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  editorTitle: {
    fontWeight: '700',
    fontSize: '1.1rem',
  },
  editorHeaderRight: {
    display: 'flex',
    gap: '10px',
  },
  editorForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  editorMetaRow: {
    display: 'flex',
    gap: '16px',
  },
  editorTitleInput: {
    flex: 1,
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  editorSelect: {
    width: '180px',
    fontWeight: '500',
  },
  editorTips: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    background: 'rgba(255, 255, 255, 0.03)',
    borderLeft: '3px solid var(--primary)',
    padding: '8px 12px',
    borderRadius: '0 6px 6px 0',
  },
  editorTextarea: {
    minHeight: '60vh',
    fontSize: '1.05rem',
    lineHeight: '1.8',
    resize: 'vertical',
  },
  previewContainer: {
    padding: '40px',
    borderRadius: '20px',
    minHeight: '70vh',
    background: 'rgba(11, 15, 25, 0.95)',
    color: '#ffffff',
  },
  previewTitle: {
    fontSize: '2.2rem',
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'var(--font-serif)',
    color: '#ffffff',
  },
  previewDivider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '30px 0',
  },
  previewBody: {
    fontSize: '1.15rem',
    lineHeight: '1.85',
    fontFamily: 'var(--font-serif)',
    textAlign: 'justify',
    color: '#f1f5f9',
    '& p': {
      marginBottom: '1.5em',
    }
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  fileInput: {
    display: 'none',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '220px',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '2px dashed var(--border-color)',
    padding: '16px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'var(--primary)',
      boxShadow: '0 0 10px var(--primary-glow)',
    }
  },
  uploadPreviewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  uploadPreview: {
    maxWidth: '180px',
    maxHeight: '252px',
    objectFit: 'cover',
    borderRadius: '10px',
    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.15)',
  },
  uploadBtnText: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--primary)',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  uploadOr: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center',
    margin: '4px 0',
  }
};
