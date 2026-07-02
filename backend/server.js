import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

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

// MongoDB Connection Setup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bibliophile';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Database Models with String IDs for legacy compatibility
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  nickname: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const CharacterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Nhân vật' },
  description: { type: String, default: '' },
  avatarUrl: { type: String, default: '' }
});

const ChapterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, default: 'published' },
  likes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  synopsis: { type: String, required: true },
  coverImage: { type: String, default: '' },
  genre: { type: String, default: 'Tự do' },
  tags: { type: [String], default: [] },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  status: { type: String, default: 'published' },
  characters: [CharacterSchema],
  chapters: [ChapterSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Story = mongoose.model('Story', StorySchema);

const CommentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  storyId: { type: String, required: true },
  chapterId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, default: 'Người dùng' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', CommentSchema);


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

  try {
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      _id: new mongoose.Types.ObjectId().toString(),
      username: username.toLowerCase(),
      password: hashedPassword,
      nickname
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, username: newUser.username, nickname: newUser.nickname }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: newUser._id, username: newUser.username, nickname: newUser.nickname }
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

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign({ id: user._id, username: user.username, nickname: user.nickname }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user._id, username: user.username, nickname: user.nickname }
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
app.get('/api/stories', async (req, res) => {
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

  try {
    const allStories = await Story.find({});
    const storiesSummary = allStories
      .filter(story => {
        const isPublished = story.status !== 'draft';
        const isAuthor = currentUser && (story.authorId === currentUser.id || currentUser.id === 'system');
        return isPublished || isAuthor;
      })
      .map(story => {
        return {
          id: story._id,
          title: story.title,
          synopsis: story.synopsis,
          coverImage: story.coverImage,
          genre: story.genre,
          tags: story.tags,
          authorId: story.authorId,
          authorName: story.authorName,
          status: story.status,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          chapterCount: story.chapters.length,
          publishedChapterCount: story.chapters.filter(c => c.status === 'published').length
        };
      });
    res.json(storiesSummary);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải danh sách truyện' });
  }
});

// Get a single story details with chapters list
app.get('/api/stories/:id', async (req, res) => {
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

  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const isPublished = story.status !== 'draft';
    const isAuthor = currentUser && (story.authorId === currentUser.id || currentUser.id === 'system');
    if (!isPublished && !isAuthor) {
      return res.status(403).json({ message: 'Truyện này chưa được xuất bản hoặc đang bị ẩn' });
    }

    const storyObj = story.toObject();
    storyObj.id = storyObj._id;
    storyObj.chapters = storyObj.chapters.map(c => ({ ...c, id: c._id }));
    storyObj.characters = storyObj.characters.map(c => ({ ...c, id: c._id }));

    res.json(storyObj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải thông tin truyện' });
  }
});

// Create story (auth required)
app.post('/api/stories', authenticateToken, async (req, res) => {
  const { title, synopsis, coverImage, genre, tags, status } = req.body;

  if (!title || !synopsis) {
    return res.status(400).json({ message: 'Tiêu đề và tóm tắt không được để trống' });
  }

  try {
    const newStory = new Story({
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      synopsis,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80',
      genre: genre || 'Tự do',
      tags: tags || [],
      authorId: req.user.id,
      authorName: req.user.nickname,
      status: status || 'published',
      characters: [],
      chapters: []
    });

    await newStory.save();
    
    const obj = newStory.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo truyện' });
  }
});

// Edit story (auth required, must be author)
app.put('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (story.authorId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa truyện này' });
    }

    const { title, synopsis, coverImage, genre, tags, characters, status } = req.body;

    if (title !== undefined) story.title = title;
    if (synopsis !== undefined) story.synopsis = synopsis;
    if (coverImage !== undefined) story.coverImage = coverImage;
    if (genre !== undefined) story.genre = genre;
    if (tags !== undefined) story.tags = tags;
    if (status !== undefined) story.status = status;
    if (characters !== undefined) {
      story.characters = characters.map(c => ({
        _id: c.id && c.id.length > 5 ? c.id : new mongoose.Types.ObjectId().toString(),
        name: c.name,
        role: c.role,
        description: c.description,
        avatarUrl: c.avatarUrl
      }));
    }
    story.updatedAt = new Date();

    await story.save();

    const obj = story.toObject();
    obj.id = obj._id;
    obj.chapters = obj.chapters.map(c => ({ ...c, id: c._id }));
    obj.characters = obj.characters.map(c => ({ ...c, id: c._id }));

    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật thông tin truyện' });
  }
});

// Delete story
app.delete('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (story.authorId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa truyện này' });
    }

    await Story.deleteOne({ _id: req.params.id });
    await Comment.deleteMany({ storyId: req.params.id });

    res.json({ message: 'Xóa truyện thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa truyện' });
  }
});

// CHAPTERS API ENDPOINTS
// Create chapter (must be author)
app.post('/api/stories/:id/chapters', authenticateToken, async (req, res) => {
  const { title, content, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Tiêu đề và nội dung chương không được để trống' });
  }

  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (story.authorId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền thêm chương cho truyện này' });
    }

    const newChapter = {
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      content,
      status: status || 'published',
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    story.chapters.push(newChapter);
    story.updatedAt = new Date();
    await story.save();

    const addedChapter = story.chapters[story.chapters.length - 1];
    const obj = addedChapter.toObject();
    obj.id = obj._id;

    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi thêm chương truyện' });
  }
});

// Edit chapter (must be author)
app.put('/api/stories/:id/chapters/:chapterId', authenticateToken, async (req, res) => {
  const { title, content, status } = req.body;

  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (story.authorId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa chương truyện này' });
    }

    const chapter = story.chapters.id(req.params.chapterId);
    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chương truyện' });

    if (title !== undefined) chapter.title = title;
    if (content !== undefined) chapter.content = content;
    if (status !== undefined) chapter.status = status;
    chapter.updatedAt = new Date();

    story.updatedAt = new Date();
    await story.save();

    const obj = chapter.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi chỉnh sửa chương truyện' });
  }
});

// Delete chapter (must be author)
app.delete('/api/stories/:id/chapters/:chapterId', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (story.authorId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa chương truyện này' });
    }

    const chapter = story.chapters.id(req.params.chapterId);
    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chương truyện' });

    story.chapters.pull(req.params.chapterId);
    story.updatedAt = new Date();
    await story.save();

    // Delete associated comments
    await Comment.deleteMany({ chapterId: req.params.chapterId });

    res.json({ message: 'Xóa chương truyện thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa chương truyện' });
  }
});

// Toggle like chapter (auth required)
app.post('/api/stories/:id/chapters/:chapterId/like', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const chapter = story.chapters.id(req.params.chapterId);
    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chương truyện' });

    if (!chapter.likes) chapter.likes = [];

    const userIndex = chapter.likes.indexOf(req.user.id);
    if (userIndex === -1) {
      chapter.likes.push(req.user.id);
    } else {
      chapter.likes.splice(userIndex, 1);
    }

    await story.save();
    res.json({ likes: chapter.likes });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi thích chương truyện' });
  }
});


// COMMENTS API ENDPOINTS
// Get all comments for a story or specific chapter
app.get('/api/stories/:id/comments', async (req, res) => {
  const { chapterId } = req.query;

  try {
    const query = { storyId: req.params.id };
    if (chapterId) query.chapterId = chapterId;

    const comments = await Comment.find(query).sort({ createdAt: -1 });
    const commentsObj = comments.map(c => {
      const obj = c.toObject();
      obj.id = obj._id;
      return obj;
    });

    res.json(commentsObj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải bình luận' });
  }
});

// Post comment (auth required)
app.post('/api/stories/:id/comments', authenticateToken, async (req, res) => {
  const { content, chapterId } = req.body;

  if (!content) return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });

  try {
    const newComment = new Comment({
      _id: new mongoose.Types.ObjectId().toString(),
      storyId: req.params.id,
      chapterId: chapterId || 'general',
      userId: req.user.id,
      userName: req.user.nickname,
      content
    });

    await newComment.save();

    const obj = newComment.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi gửi bình luận' });
  }
});

// Delete comment (auth required, must be author of comment or system)
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

    if (comment.userId !== req.user.id && req.user.id !== 'system') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này' });
    }

    await Comment.deleteOne({ _id: req.params.commentId });
    res.json({ message: 'Xóa bình luận thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa bình luận' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
