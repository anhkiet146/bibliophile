import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bibliophile_secret_key';
const INVITATION_CODE = process.env.INVITATION_CODE || 'friends2026';

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global NFC Unicode normalization middleware for Vietnamese diacritics
app.use((req, res, next) => {
  if (req.body) {
    const normalizeObject = (obj) => {
      if (typeof obj === 'string') {
        let clean = obj
          .replace(/\u00B4/g, '\u0301') // spacing acute -> combining acute
          .replace(/\u0060/g, '\u0300') // spacing grave -> combining grave
          .replace(/\u02DC/g, '\u0303') // spacing tilde -> combining tilde
          .normalize('NFC');
        
        // Remove duplicate combining marks trailing after precomposed vowels
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
        for (const key in obj) {
          obj[key] = normalizeObject(obj[key]);
        }
      }
      return obj;
    };
    req.body = normalizeObject(req.body);
  }
  next();
});

const dbPath = path.join(__dirname, 'data', 'db.json');

// Helper functions for reading/writing DB
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, creating a fresh one', err);
    const initialData = { users: [], stories: [], comments: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to database file', err);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Không tìm thấy token xác thực' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token hết hạn hoặc không hợp lệ' });
    req.user = user;
    next();
  });
}

// AUTH API ENDPOINTS
app.post('/api/auth/register', async (req, res) => {
  const { username, password, nickname, invitationCode } = req.body;

  if (!username || !password || !nickname || !invitationCode) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (invitationCode !== INVITATION_CODE) {
    return res.status(400).json({ message: 'Mã mời không chính xác. Chỉ dành cho bạn bè!' });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      username,
      nickname,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign({ id: newUser.id, username: newUser.username, nickname: newUser.nickname }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, nickname: newUser.nickname }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký tài khoản' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu' });
  }

  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, nickname: user.nickname }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// STORIES API ENDPOINTS
// Get all stories (metadata only, no full chapter text)
app.get('/api/stories', (req, res) => {
  const db = readDB();
  
  // Optional token check to allow authors to see their own drafts
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let currentUser = null;
  if (token) {
    try {
      currentUser = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // ignore invalid token, treat as anonymous
    }
  }

  const storiesSummary = db.stories
    .filter(story => {
      const isPublished = story.status !== 'draft';
      const isAuthor = currentUser && (story.authorId === currentUser.id || currentUser.id === 'system');
      return isPublished || isAuthor;
    })
    .map(story => {
      const { chapters, ...meta } = story;
      return {
        ...meta,
        chapterCount: chapters.length,
        publishedChapterCount: chapters.filter(c => c.status === 'published').length
      };
    });
  res.json(storiesSummary);
});

// Get a single story details with chapters list
app.get('/api/stories/:id', (req, res) => {
  const db = readDB();
  const story = db.stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  // Optional token check
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let currentUser = null;
  if (token) {
    try {
      currentUser = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // ignore
    }
  }

  // Deny access if story is draft and requester is not the author
  const isPublished = story.status !== 'draft';
  const isAuthor = currentUser && (story.authorId === currentUser.id || currentUser.id === 'system');
  if (!isPublished && !isAuthor) {
    return res.status(403).json({ message: 'Truyện này chưa được xuất bản hoặc đang bị ẩn' });
  }

  res.json(story);
});

// Create story (auth required)
app.post('/api/stories', authenticateToken, (req, res) => {
  const { title, synopsis, coverImage, genre, tags, characters, status } = req.body;

  if (!title || !synopsis) {
    return res.status(400).json({ message: 'Tiêu đề và tóm tắt không được để trống' });
  }

  const db = readDB();
  const newStory = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    title,
    synopsis,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80',
    genre: genre || 'Tự do',
    tags: tags || [],
    authorId: req.user.id,
    authorName: req.user.nickname,
    characters: characters || [],
    chapters: [],
    status: status || 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.stories.push(newStory);
  writeDB(db);
  res.status(201).json(newStory);
});

// Edit story (auth required, must be author)
app.put('/api/stories/:id', authenticateToken, (req, res) => {
  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];

  // Author authorization check
  if (story.authorId !== req.user.id && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa truyện này' });
  }

  const { title, synopsis, coverImage, genre, tags, characters, status } = req.body;

  db.stories[storyIndex] = {
    ...story,
    title: title !== undefined ? title : story.title,
    synopsis: synopsis !== undefined ? synopsis : story.synopsis,
    coverImage: coverImage !== undefined ? coverImage : story.coverImage,
    genre: genre !== undefined ? genre : story.genre,
    tags: tags !== undefined ? tags : story.tags,
    characters: characters !== undefined ? characters : story.characters,
    status: status !== undefined ? status : story.status,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json(db.stories[storyIndex]);
});

// Delete story
app.delete('/api/stories/:id', authenticateToken, (req, res) => {
  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];

  if (story.authorId !== req.user.id && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền xóa truyện này' });
  }

  db.stories.splice(storyIndex, 1);

  // Also delete associated comments
  db.comments = db.comments.filter(c => c.storyId !== req.params.id);

  writeDB(db);
  res.json({ message: 'Xóa truyện thành công' });
});

// CHAPTERS API ENDPOINTS
// Create a chapter
app.post('/api/stories/:id/chapters', authenticateToken, (req, res) => {
  const { title, content, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Tiêu đề và nội dung chương không được để trống' });
  }

  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];
  if (story.authorId !== req.user.id && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền thêm chương cho truyện này' });
  }

  const newChapter = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    title,
    content,
    status: status || 'published', // 'published' or 'draft'
    likes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.stories[storyIndex].chapters.push(newChapter);
  db.stories[storyIndex].updatedAt = new Date().toISOString();

  writeDB(db);
  res.status(201).json(newChapter);
});

// Edit a chapter
app.put('/api/stories/:id/chapters/:chapId', authenticateToken, (req, res) => {
  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];
  if (story.authorId !== req.user.id && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa chương này' });
  }

  const chapIndex = story.chapters.findIndex(c => c.id === req.params.chapId);
  if (chapIndex === -1) return res.status(404).json({ message: 'Không tìm thấy chương' });

  const { title, content, status } = req.body;
  const chapter = story.chapters[chapIndex];

  db.stories[storyIndex].chapters[chapIndex] = {
    ...chapter,
    title: title !== undefined ? title : chapter.title,
    content: content !== undefined ? content : chapter.content,
    status: status !== undefined ? status : chapter.status,
    updatedAt: new Date().toISOString()
  };
  db.stories[storyIndex].updatedAt = new Date().toISOString();

  writeDB(db);
  res.json(db.stories[storyIndex].chapters[chapIndex]);
});

// Delete a chapter
app.delete('/api/stories/:id/chapters/:chapId', authenticateToken, (req, res) => {
  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];
  if (story.authorId !== req.user.id && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền xóa chương này' });
  }

  const chapIndex = story.chapters.findIndex(c => c.id === req.params.chapId);
  if (chapIndex === -1) return res.status(404).json({ message: 'Không tìm thấy chương' });

  db.stories[storyIndex].chapters.splice(chapIndex, 1);
  db.stories[storyIndex].updatedAt = new Date().toISOString();

  // Clean up comments for this specific chapter
  db.comments = db.comments.filter(c => c.chapterId !== req.params.chapId);

  writeDB(db);
  res.json({ message: 'Xóa chương thành công' });
});

// Toggle Like on a chapter
app.post('/api/stories/:id/chapters/:chapId/like', authenticateToken, (req, res) => {
  const db = readDB();
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const story = db.stories[storyIndex];
  const chapIndex = story.chapters.findIndex(c => c.id === req.params.chapId);
  if (chapIndex === -1) return res.status(404).json({ message: 'Không tìm thấy chương' });

  const chapter = story.chapters[chapIndex];
  const userId = req.user.id;
  const likeIndex = chapter.likes.indexOf(userId);

  if (likeIndex === -1) {
    // Like
    chapter.likes.push(userId);
  } else {
    // Unlike
    chapter.likes.splice(likeIndex, 1);
  }

  db.stories[storyIndex].chapters[chapIndex] = chapter;
  writeDB(db);
  res.json({ likes: chapter.likes });
});

// COMMENTS API
// Get comments for a story/chapter
app.get('/api/stories/:id/comments', (req, res) => {
  const { chapterId } = req.query;
  const db = readDB();
  let comments = db.comments.filter(c => c.storyId === req.params.id);

  if (chapterId) {
    comments = comments.filter(c => c.chapterId === chapterId);
  }

  // Sort by newest first
  comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(comments);
});

// Post a comment
app.post('/api/stories/:id/comments', authenticateToken, (req, res) => {
  const { content, chapterId } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Bình luận không được để trống' });
  }

  const db = readDB();
  const story = db.stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

  const newComment = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    storyId: req.params.id,
    chapterId: chapterId || null,
    userId: req.user.id,
    username: req.user.nickname,
    content,
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  writeDB(db);
  res.status(201).json(newComment);
});

// Delete a comment
app.delete('/api/comments/:commentId', authenticateToken, (req, res) => {
  const db = readDB();
  const commentIndex = db.comments.findIndex(c => c.id === req.params.commentId);

  if (commentIndex === -1) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

  const comment = db.comments[commentIndex];

  // Comment owner or system or story author can delete comments
  const story = db.stories.find(s => s.id === comment.storyId);
  const isStoryAuthor = story && story.authorId === req.user.id;

  if (comment.userId !== req.user.id && !isStoryAuthor && req.user.id !== 'system') {
    return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này' });
  }

  db.comments.splice(commentIndex, 1);
  writeDB(db);
  res.json({ message: 'Xóa bình luận thành công' });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
