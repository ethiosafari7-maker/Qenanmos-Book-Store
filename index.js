const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const app = express();

// --- ማስተካከያዎች ---
app.use(cors());
app.use(express.json());

// --- መረጃዎች ---
const BOT_TOKEN = '8225238440:AAHTxMQPOsfJ5Eq6b1DaAt3We39NwE4--Ao';
const MONGO_URI = 'mongodb+srv://Qenanmos_Book_Store:Ma122344..@cluster0.zicjr05.mongodb.net/BookDB?retryWrites=true&w=majority&appName=Cluster0';

const bot = new Telegraf(BOT_TOKEN);

// --- MongoDB ግንኙነት ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('ዳታቤዙ በተሳካ ሁኔታ ተገናኝቷል!'))
  .catch(err => console.error('የዳታቤዝ ግንኙነት ስህተት:', err));

const Book = mongoose.model('Book', {
  title: String,
  fileId: String,
  author: String,
  createdAt: { type: Date, default: Date.now }
});

// --- 1. የጤና ምርመራ (Health Check) ለ Koyeb ---
app.get('/', (req, res) => {
  res.send('Qenanmos Book Store Server is Running!');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- 2. ለ GitHub Pages መጽሐፍቱን የሚልክ API ---
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "መረጃ ማግኘት አልተቻለም" });
  }
});

// --- 3. የቴሌግራም ቦት ስራዎች ---
bot.start(async (ctx) => {
  const fileId = ctx.startPayload;
  if (fileId) {
    await ctx.reply('መጽሐፉን በመላክ ላይ ነኝ... ይቆዩ።');
    try {
      await ctx.sendDocument(fileId);
    } catch (err) {
      await ctx.reply('ይቅርታ፣ ፋይሉን መላክ አልተቻለም።');
    }
  } else {
    // እዚህ ጋር የ GitHub Pages ሊንክህን አስገባ
    const websiteUrl = 'https://qenanmos.github.io/'; 
    
    await ctx.reply(
      `እንኳን ወደ Qenanmos Book Store በሰላም መጡ! 📚\n\nሁሉንም መጽሐፍት ለመፈለግ ከታች ያለውን ቁልፍ ተጭነው ዌብሳይታችንን ይጎብኙ።`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 ዌብሳይቱን ክፈት", url: websiteUrl }]
          ]
        }
      }
    );
  }
});

bot.on('document', async (ctx) => {
  try {
    const { file_name, file_id } = ctx.message.document;
    await Book.create({ title: file_name, fileId: file_id, author: "Qenanmos Store" });
    ctx.reply(`✅ '${file_name}' በተሳካ ሁኔታ በዌብሳይቱ ላይ ተመዝግቧል።`);
  } catch (err) {
    ctx.reply('❌ ፋይሉን መመዝገብ አልተቻለም።');
  }
});

// --- 4. ሰርቨሩን ማስነሳት ---
bot.launch();

// Koyeb እንዲያገኘው Port 8000 እንጠቀማለን
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ሰርቨሩ በፖርት ${PORT} ላይ ስራ ጀምሯል`);
});

// ደህንነቱ የተጠበቀ መዝጊያ
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
