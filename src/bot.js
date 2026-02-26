import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
} from 'discord.js';
import { createAvalonCommands } from './commands/avalonCommands.js';
import { AvalonGameManager } from './game/AvalonGameManager.js';

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

client.commands = new Collection();
const avalonGameManager = new AvalonGameManager();

async function registerCommands(appId) {
  const commands = createAvalonCommands();
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('กำลังลงทะเบียน Slash Commands (/avalon ...)');
    await rest.put(Routes.applicationCommands(appId), {
      body: commands.map((c) => c.data.toJSON()),
    });
    console.log('ลงทะเบียน Slash Commands สำเร็จ');

    for (const command of commands) {
      client.commands.set(command.data.name, command);
    }
  } catch (error) {
    console.error('ลงทะเบียนคำสั่งไม่สำเร็จ', error);
  }
}

client.once('ready', async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้ว พร้อมใช้งาน!`);

  const appId = client.application?.id || client.user.id;
  await registerCommands(appId);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, avalonGameManager);
  } catch (error) {
    console.error(error);
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
  }
});

client.login(token);

