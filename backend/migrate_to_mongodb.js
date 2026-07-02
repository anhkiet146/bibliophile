import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error("No db.json found at:", dbPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bibliophile';

// User Schema
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  nickname: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Character / Chapter Schemas
const CharacterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String },
  description: { type: String },
  avatarUrl: { type: String }
});
const ChapterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String },
  likes: { type: [String] },
  createdAt: { type: Date },
  updatedAt: { type: Date }
});

// Story Schema
const StorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  synopsis: { type: String, required: true },
  coverImage: { type: String },
  genre: { type: String },
  tags: { type: [String] },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  status: { type: String },
  characters: [CharacterSchema],
  chapters: [ChapterSchema],
  createdAt: { type: Date },
  updatedAt: { type: Date }
});
const Story = mongoose.model('Story', StorySchema);

// Comment Schema
const CommentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  storyId: { type: String, required: true },
  chapterId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, default: 'Người dùng' },
  content: { type: String, required: true },
  createdAt: { type: Date }
});
const Comment = mongoose.model('Comment', CommentSchema);

async function run() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // Migrate Users
    console.log("\nMigrating users...");
    for (const u of db.users || []) {
      const exists = await User.findById(u.id);
      if (!exists) {
        const newUser = new User({
          _id: u.id,
          username: u.username.toLowerCase(),
          password: u.password,
          nickname: u.nickname,
          createdAt: u.createdAt
        });
        await newUser.save();
        console.log(`- Created user: ${u.username}`);
      } else {
        console.log(`- User already exists: ${u.username}`);
      }
    }

    // Migrate Stories
    console.log("\nMigrating stories...");
    for (const s of db.stories || []) {
      const exists = await Story.findById(s.id);
      if (!exists) {
        const newStory = new Story({
          _id: s.id,
          title: s.title,
          synopsis: s.synopsis,
          coverImage: s.coverImage,
          genre: s.genre,
          tags: s.tags,
          authorId: s.authorId,
          authorName: s.authorName,
          status: s.status || 'published',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          characters: (s.characters || []).map(c => ({
            _id: c.id,
            name: c.name,
            role: c.role,
            description: c.description,
            avatarUrl: c.avatarUrl
          })),
          chapters: (s.chapters || []).map(ch => ({
            _id: ch.id,
            title: ch.title,
            content: ch.content,
            status: ch.status || 'published',
            likes: ch.likes || [],
            createdAt: ch.createdAt,
            updatedAt: ch.updatedAt
          }))
        });
        await newStory.save();
        console.log(`- Created story: ${s.title}`);
      } else {
        console.log(`- Story already exists: ${s.title}`);
      }
    }

    // Migrate Comments
    console.log("\nMigrating comments...");
    for (const c of db.comments || []) {
      const exists = await Comment.findById(c.id);
      if (!exists) {
        const newComment = new Comment({
          _id: c.id,
          storyId: c.storyId,
          chapterId: c.chapterId,
          userId: c.userId,
          userName: c.userName || c.username || 'Người dùng',
          content: c.content,
          createdAt: c.createdAt
        });
        await newComment.save();
        console.log(`- Created comment: "${c.content.substring(0, 20)}..."`);
      } else {
        console.log(`- Comment already exists: ${c.id}`);
      }
    }

    console.log("\nMigration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

run();
