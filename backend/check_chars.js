import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bibliophile';

const CharacterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String },
  description: { type: String },
  avatarUrl: { type: String }
});

const StorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  characters: [CharacterSchema]
});
const Story = mongoose.model('Story', StorySchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const story = await Story.findById('a64c0d9d-ef45-42b9-b9d3-f7945e9e7fe7');
    if (story) {
      console.log(`Story: "${story.title}"`);
      console.log("Characters in MongoDB:", story.characters.length);
      story.characters.forEach((c, idx) => {
        console.log(`- Character ${idx + 1}: ${c.name} (${c.role})`);
      });
    } else {
      console.log("Story not found in MongoDB");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
