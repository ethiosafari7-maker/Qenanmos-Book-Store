const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const app = express();

// --- የእርስዎ መረጃዎች ---
const BOT_TOKEN = '8225238440:AAHTxMQPOsfJ5Eq6b1DaAt3We39NwE4--Ao';
// MongoDB Connection String ከእርስዎ Username እና Password ጋር
const MONGO_URI = 'mongodb+srv://Qenanmos_Book_Store:Ma122344..@cluster0.zicjr05.mongodb.net/BookDB?retryWrites=true&w=majority&appName=Cluster0';

const bot = new Telegraf(BOT_TOKEN);

// --- MongoDB ግንኙነት ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('ዳታቤዙ በተሳካ ሁኔታ ተገናኝቷል!'))
  .catch(err => console.error('የዳታቤዝ ግንኙነት ስህተት:', err));

// --- ዳታቤዝ ሞዴል (Schema) ---
const Book = mongoose.model('Book', {
  title: String,
  fileId: String,
  author: String,
  createdAt: { type: Date, default: Date.now }
});

app.set('view engine', 'ejs');
app.use(express.static('public')); // ለወደፊቱ CSS ፋይሎች ካስፈለጉ

// --- ዌብሳይት - የመጽሐፍት ዝርዝር እና ፍለጋ ---
app.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    // በስም መፈለጊያ (Case-insensitive)
    const books = await Book.find({ 
      title: new RegExp(searchQuery, 'i') 
    }).sort({ createdAt: -1 }); // አዳዲስ መጽሐፍት መጀመሪያ እንዲወጡ
    
    res.render('index', { books });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// --- ቦት - ፋይል መላኪያ (Deep Linking) ---
bot.start(async (ctx) => {
  const fileId = ctx.startPayload; // ከዌብሳይቱ ሊንክ የሚመጣው ID
  if (fileId) {
    await ctx.reply('መጽሐፉን በመላክ ላይ ነኝ... ይቆዩ።');
    try {
      await ctx.sendDocument(fileId);
    } catch (err) {
      await ctx.reply('ይቅርታ፣ ፋይሉን መላክ አልተቻለም። ፋይሉ ተሰርዞ ሊሆን ይችላል።');
    }
  } else {
    ctx.reply('እንኳን ወደ Qenanmos Book Store በሰላም መጡ! መጽሐፍት ለመፈለግ ዌብሳይታችንን ይጠቀሙ።');
  }
});

// --- ቦት - አዲስ መጽሐፍ መመዝገቢያ ---
// መጽሐፍ (PDF) ሲላክለት ወዲያው ዳታቤዝ ውስጥ ይጨምረዋል
bot.on('document', async (ctx) => {
  try {
    const { file_name, file_id } = ctx.message.document;
    
    // ዳታቤዝ ውስጥ ካለ በድጋሚ እንዳይመዘገብ ማረጋገጥ
    const existingBook = await Book.findOne({ fileId: file_id });
    if (existingBook) {
      return ctx.reply('ይህ መጽሐፍ ቀድሞውኑ ተመዝግቧል።');
    }

    await Book.create({ 
      title: file_name, 
      fileId: file_id, 
      author: "Qenanmos Store" 
    });
    
    ctx.reply(`✅ '${file_name}' በተሳካ ሁኔታ ተመዝግቧል። አሁን ዌብሳይቱ ላይ ማግኘት ይቻላል።`);
  } catch (error) {
    console.error(error);
    ctx.reply('መጽሐፉን መመዝገብ አልተቻለም።');
  }
});

// --- ሰርቨሩን ማስነሳት ---
bot.launch();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ሰርቨሩ በፖርት ${PORT} ላይ ስራ ጀምሯል...`);
});

// ለ Render ደህንነት ሲባል ቦቱ በሰላም እንዲዘጋ
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
