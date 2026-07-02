import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../context/AuthContext';
import { Search, BookOpen, User, BookMarked, Tag } from 'lucide-react';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [genres, setGenres] = useState(['All']);

  useEffect(() => {
    async function fetchStories() {
      try {
        const response = await fetch(`${API_BASE_URL}/stories`);
        if (response.ok) {
          const data = await response.json();
          setStories(data);
          
          // Extract unique genres
          const allGenres = ['All', ...new Set(data.map(story => story.genre).filter(Boolean))];
          setGenres(allGenres);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách truyện:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStories();
  }, []);

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          story.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          story.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === 'All' || story.genre === selectedGenre;

    return matchesSearch && matchesGenre;
  });

  const featuredStory = stories.length > 0 ? stories[0] : null;

  return (
    <div style={styles.container} className="fade-in">
      {/* Hero Section */}
      <header className="hero">
        <h1 style={styles.heroTitle} className="glow-text">Thư Viện Bibliophile</h1>
        <p style={styles.heroSub}>Nơi cất giữ những chương sách của tình bạn, trí tưởng tượng và thế giới vô tận.</p>
        
        {/* Search Bar */}
        <div style={styles.searchWrapper} className="glass-panel">
          <Search size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm kiếm tác phẩm, tác giả hoặc tóm tắt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </header>

      {/* Featured / Banner Story */}
      {featuredStory && !searchQuery && selectedGenre === 'All' && (
        <section style={styles.featuredSection}>
          <h2 style={styles.sectionTitle}>Tác phẩm nổi bật</h2>
          <div style={styles.featuredCard} className="glass-panel featured-story-card">
            <img src={featuredStory.coverImage} alt={featuredStory.title} style={styles.featuredCover} />
            <div style={styles.featuredDetails}>
              <span style={styles.genreBadge}>{featuredStory.genre}</span>
              <h3 style={styles.featuredTitle}>{featuredStory.title}</h3>
              <div style={styles.featuredMeta}>
                <span style={styles.metaItem}><User size={14} />{featuredStory.authorName}</span>
                <span style={styles.metaItem}><BookMarked size={14} />{featuredStory.publishedChapterCount} chương</span>
              </div>
              <p style={styles.featuredSynopsis}>{featuredStory.synopsis}</p>
              <div style={styles.tagsContainer}>
                {featuredStory.tags.map((tag, idx) => (
                  <span key={idx} style={styles.tag}><Tag size={12} /> {tag}</span>
                ))}
              </div>
              <Link to={`/story/${featuredStory.id}`} className="btn btn-primary" style={styles.readBtn}>
                <BookOpen size={16} /> Đọc ngay
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Genres / Filters */}
      <section style={styles.filterSection}>
        <div style={styles.genreTabs}>
          {genres.map(genre => (
            <button
              key={genre}
              style={{
                ...styles.genreTab,
                ...(selectedGenre === genre ? styles.activeGenreTab : {})
              }}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre === 'All' ? 'Tất cả thể loại' : genre}
            </button>
          ))}
        </div>
      </section>

      {/* Stories Grid */}
      <main style={styles.gridSection}>
        <h2 style={styles.sectionTitle}>
          {selectedGenre !== 'All' ? `Truyện thuộc thể loại: ${selectedGenre}` : 'Tất cả truyện'}
          <span style={styles.storyCount}>({filteredStories.length})</span>
        </h2>

        {loading ? (
          <div style={styles.loadingState}>Đang tải danh sách tác phẩm...</div>
        ) : filteredStories.length === 0 ? (
          <div style={styles.emptyState}>
            <BookOpen size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>Không tìm thấy truyện nào phù hợp với yêu cầu của bạn.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredStories.map(story => (
              <article key={story.id} className="glass-card" style={styles.card}>
                <div style={styles.cardCoverWrapper}>
                  <img src={story.coverImage} alt={story.title} style={styles.cardCover} />
                  <span style={styles.cardGenre}>{story.genre}</span>
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{story.title}</h3>
                  <div style={styles.cardMeta}>
                    <span style={styles.cardMetaItem}><User size={12} /> {story.authorName}</span>
                    <span style={styles.cardMetaItem}><BookMarked size={12} /> {story.publishedChapterCount} chương</span>
                  </div>
                  <p style={styles.cardSynopsis}>{story.synopsis}</p>
                  <Link to={`/story/${story.id}`} className="btn btn-secondary" style={styles.cardBtn}>
                    Chi tiết tác phẩm
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 80px',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: '800',
    marginBottom: '16px',
    letterSpacing: '-1px',
  },
  heroSub: {
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    marginBottom: '32px',
    maxWidth: '600px',
    margin: '0 auto 32px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '6px 16px',
    borderRadius: '100px',
    background: '#ffffff',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 20px rgba(5, 150, 105, 0.08), 0 0 1px rgba(5, 150, 105, 0.1)',
  },
  searchIcon: {
    color: 'var(--primary)',
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    boxShadow: 'none',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    padding: '8px 0',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  storyCount: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    fontWeight: 'normal',
  },
  featuredSection: {
    marginBottom: '48px',
  },
  featuredCard: {
    display: 'flex',
    flexDirection: 'row',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 30px rgba(0,0,0,0.3)',
    gap: '30px',
    padding: '30px',
  },
  featuredCover: {
    width: '200px',
    height: '280px',
    objectFit: 'cover',
    borderRadius: '16px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
  },
  featuredDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  genreBadge: {
    background: 'var(--primary-glow)',
    color: '#a78bfa',
    border: '1px solid var(--border-color)',
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  featuredTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '10px',
  },
  featuredMeta: {
    display: 'flex',
    gap: '20px',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  featuredSynopsis: {
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    marginBottom: '20px',
    display: '-webkit-box',
    WebkitLineClamp: '3',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '24px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
  },
  readBtn: {
    padding: '12px 24px',
  },
  filterSection: {
    marginBottom: '32px',
  },
  genreTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    paddingBottom: '8px',
  },
  genreTab: {
    background: 'none',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '8px 16px',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '0.9rem',
  },
  activeGenreTab: {
    background: 'var(--primary)',
    color: 'white',
    borderColor: 'var(--primary)',
    boxShadow: '0 4px 12px var(--primary-glow)',
  },
  gridSection: {
    minHeight: '400px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '0',
    overflow: 'hidden',
  },
  cardCoverWrapper: {
    position: 'relative',
    height: '260px',
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
    '&:hover': {
      transform: 'scale(1.05)',
    }
  },
  cardGenre: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(11, 15, 25, 0.8)',
    backdropFilter: 'blur(4px)',
    color: 'var(--text-primary)',
    padding: '3px 10px',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid var(--border-color)',
  },
  cardContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  cardMeta: {
    display: 'flex',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    marginBottom: '12px',
  },
  cardMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  cardSynopsis: {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    lineHeight: '1.6',
    marginBottom: '20px',
    display: '-webkit-box',
    WebkitLineClamp: '3',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardBtn: {
    width: '100%',
    textAlign: 'center',
  },
  loadingState: {
    textAlign: 'center',
    padding: '80px 0',
    color: 'var(--text-secondary)',
    fontSize: '1.1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 0',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }
};
