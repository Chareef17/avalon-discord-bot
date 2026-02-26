require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} = require('discord.js');
const { createAvalonCommands } = require('./commands/avalonCommands');
const { AvalonGameManager } = require('./game/AvalonGameManager');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN ยังไม่ถูกตั้งค่าในไฟล์ .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const avalonGameManager = new AvalonGameManager();

async function registerCommands(appId) {
  const { data, execute } = createAvalonCommands();
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('กำลังลงทะเบียน Slash Commands (/avalon ...)');
    await rest.put(Routes.applicationCommands(appId), {
      body: [data.toJSON()],
    });
    console.log('ลงทะเบียน Slash Commands สำเร็จ');
  } catch (error) {
    console.error('ลงทะเบียนคำสั่งไม่สำเร็จ', error);
  }
}

client.once('ready', async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้ว พร้อมใช้งาน!`);

  const appId = client.application && client.application.id ? client.application.id : client.user.id;
  await registerCommands(appId);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'avalon') return;

  const { execute } = createAvalonCommands();
  try {
    await execute(interaction, avalonGameManager);
  } catch (error) {
    console.error(error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'เกิดข้อผิดพลาดในการทำงานของคำสั่งนี้',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการทำงานของคำสั่งนี้',
          ephemeral: true,
        });
      }
    } catch (_) {}
  }
});

client.login(token);
