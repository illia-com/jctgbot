const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://illiatasminskyi:BpoVkbvlRuhQBD1D@cluster0.bav0d4t.mongodb.net/magazine', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  userId: { type: Number, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  isAdmin: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

const passwordSchema = new mongoose.Schema({
  userId: { type: Number },
  password: String,
  createdAt: { type: Date, default: Date.now },
});

const Password = mongoose.model('Password', passwordSchema);

const counterSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    count: { type: Number, default: 0 },
  });
  
const Counter = mongoose.model('Counter', counterSchema);

const token = '6728831510:AAHnttahWhyiy9h9RJAItUGjvB2_fKKIRe4';
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;

  try {
    const newUser = new User({
      userId,
      username,
      firstName,
      lastName,
    });

    await newUser.save();
    bot.sendMessage(chatId, 'Ваши данные успешно сохранены в базе данных.');
  } catch (error) {
    console.error('Error saving user to MongoDB:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при сохранении ваших данных.');
  }
});

bot.onText(/\/newpassword/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.isAdmin) {
        bot.sendMessage(chatId, 'Вы не являетесь администратором. Доступ запрещен.');
        return;
      }
  
      bot.sendMessage(chatId, 'Введите новый пароль:').then(() => {
        bot.once('text', async (msg) => {
          const newPassword = msg.text;
  
          try {
            const newPasswordEntry = new Password({
              userId,
              password: newPassword,
            });
  
            await newPasswordEntry.save();
            bot.sendMessage(chatId, 'Пароль успешно сохранен.');
          } catch (error) {
            console.error('Error saving password to MongoDB:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при сохранении пароля.');
          }
        });
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при проверке статуса администратора.');
    }
});

bot.onText(/\/password/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.isAdmin) {
        bot.sendMessage(chatId, 'Вы не являетесь администратором. Доступ запрещен.');
        return;
      }
  
      const lastPasswordEntry = await Password.findOne({ userId }, {}, { sort: { createdAt: -1 } });
  
      if (lastPasswordEntry) {
        bot.sendMessage(chatId, `Последний сохраненный пароль: ${lastPasswordEntry.password}`);
      } else {
        bot.sendMessage(chatId, 'Пароли не найдены.');
      }
    } catch (error) {
      console.error('Error checking admin status or fetching last password:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при проверке статуса администратора или поиске последнего пароля.');
    }
});

bot.onText(/\/inputpassword/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    try {
      const lastPasswordEntry = await Password.findOne({ userId }, {}, { sort: { createdAt: -1 } });
  
      if (!lastPasswordEntry) {
        bot.sendMessage(chatId, 'Пароли не найдены.');
        return;
      }
  
      bot.sendMessage(chatId, 'Введите пароль:').then(() => {
        bot.once('text', async (msg) => {
          const enteredPassword = msg.text;
  
          if (enteredPassword === lastPasswordEntry.password) {
            const counter = await Counter.findOneAndUpdate(
              { userId },
              { $inc: { count: 1 } },
              { upsert: true, new: true }
            );
  
            bot.sendMessage(chatId, `Пароль верный. Ваш счетчик увеличен: ${counter.count}`);
          } else {
            bot.sendMessage(chatId, 'Неверный пароль.');
          }
        });
      });
    } catch (error) {
      console.error('Error checking last password or updating counter:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при проверке последнего пароля или обновлении счетчика.');
    }
});
  
bot.on('callback_query', (callbackQuery) => {
  // Обработка нажатий на кнопки
});

console.log('Bot is running...');
