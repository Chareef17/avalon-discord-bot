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
const {
  createTeamSelectRow,
  createTeamVoteRow,
  createMissionPromptRow,
  createMissionVoteRow,
  createAssassinSelectRow,
} = require('./ui/components');

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

const gameManager = new AvalonGameManager();

// ---------------------------------------------------------------------------
// Helper: send phase-specific UI into a channel
// ---------------------------------------------------------------------------

async function sendTeamProposalUI(channel, game) {
  const quest = game.getCurrentQuest();
  if (!quest) return;
  const leader = game.getLeader();
  const questNo = game.currentQuestIndex + 1;

  const row = createTeamSelectRow(game.players, quest.teamSize);

  const rejectInfo =
    game.consecutiveRejectedTeams > 0
      ? `⚠️ ทีมถูกปฏิเสธติดต่อกัน: ${game.consecutiveRejectedTeams}/5\n`
      : '';

  await channel.send({
    content:
      `⚔️ **ภารกิจที่ ${questNo}** — ต้องการทีม **${quest.teamSize} คน**\n` +
      `👑 หัวหน้าทีม: <@${leader.id}>\n` +
      rejectInfo +
      `\nกรุณาเลือกสมาชิกทีม ${quest.teamSize} คนจากเมนูด้านล่าง`,
    components: [row],
  });
}

async function sendTeamVoteUI(channel, game) {
  const teamList = game.selectedTeam.map((id) => `<@${id}>`).join(', ');
  const questNo = game.currentQuestIndex + 1;
  const quest = game.getCurrentQuest();

  const row = createTeamVoteRow();

  await channel.send({
    content:
      `🗳️ **โหวตทีม — ภารกิจที่ ${questNo}** (ทีม ${quest.teamSize} คน)\n` +
      `ทีมที่เสนอ: ${teamList}\n\n` +
      'ผู้เล่นทุกคนกดปุ่มด้านล่างเพื่อลงคะแนน',
    components: [row],
  });
}

async function sendMissionPromptUI(channel, game) {
  const questNo = game.currentQuestIndex + 1;
  const quest = game.getCurrentQuest();
  const teamList = game.selectedTeam.map((id) => `<@${id}>`).join(', ');
  const row = createMissionPromptRow();

  await channel.send({
    content:
      `🗡️ **ภารกิจที่ ${questNo}** (ทีม ${quest.teamSize} คน)\n` +
      `สมาชิกทีม: ${teamList}\n\n` +
      'สมาชิกทีมกดปุ่มด้านล่างเพื่อโหวตผลภารกิจ (เฉพาะสมาชิกทีมเท่านั้น)',
    components: [row],
  });
}

async function sendAssassinUI(channel, game) {
  const goodPlayers = game.players.filter((p) => p.role.side === 'good');
  const row = createAssassinSelectRow(goodPlayers);
  const assassin = game.players.find((p) => p.role.key === 'ASSASSIN');

  await channel.send({
    content:
      `🎯 **ฝ่ายดีชนะภารกิจครบ 3 ครั้ง!**\n` +
      `Assassin (<@${assassin.id}>) กรุณาเลือกผู้เล่นที่คิดว่าเป็น Merlin`,
    components: [row],
  });
}

// ---------------------------------------------------------------------------
// Register slash commands on ready
// ---------------------------------------------------------------------------

async function registerCommands(appId) {
  const { data } = createAvalonCommands();
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
  const appId =
    client.application && client.application.id
      ? client.application.id
      : client.user.id;
  await registerCommands(appId);
});

// ---------------------------------------------------------------------------
// Interaction router
// ---------------------------------------------------------------------------

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'avalon') {
      const { execute } = createAvalonCommands();
      await execute(interaction, gameManager, { sendTeamProposalUI });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'เกิดข้อผิดพลาดในการทำงาน',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการทำงาน',
          ephemeral: true,
        });
      }
    } catch (_) {}
  }
});

// ---------------------------------------------------------------------------
// Select menu handler (team proposal + assassin guess)
// ---------------------------------------------------------------------------

async function handleSelectMenu(interaction) {
  const { customId } = interaction;

  // ---- เลือกทีมภารกิจ ----
  if (customId === 'avalon_team_select') {
    const channelId = interaction.channelId;
    const game = gameManager.getGame(channelId);
    if (!game) {
      await interaction.reply({ content: 'ไม่พบเกมในช่องนี้', ephemeral: true });
      return;
    }

    const memberIds = interaction.values;
    const result = game.proposeTeam(interaction.user.id, memberIds);

    if (!result.ok) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }

    await interaction.update({
      content: interaction.message.content + '\n\n✅ หัวหน้าทีมได้เลือกทีมแล้ว',
      components: [],
    });

    await sendTeamVoteUI(interaction.channel, game);
    return;
  }

  // ---- Assassin เดา Merlin ----
  if (customId === 'avalon_assassin_select') {
    const channelId = interaction.channelId;
    const game = gameManager.getGame(channelId);
    if (!game) {
      await interaction.reply({ content: 'ไม่พบเกมในช่องนี้', ephemeral: true });
      return;
    }

    const targetId = interaction.values[0];
    const result = game.assassinGuess(interaction.user.id, targetId);

    if (!result.ok) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }

    await interaction.update({
      content: interaction.message.content + '\n\n🗡️ Assassin ได้ทำการเดาแล้ว',
      components: [],
    });

    if (result.broadcast) {
      await interaction.channel.send(result.broadcast);
    }
    return;
  }
}

// ---------------------------------------------------------------------------
// Button handler (team vote + mission vote)
// ---------------------------------------------------------------------------

async function handleButton(interaction) {
  const { customId } = interaction;

  // ---- โหวตทีม (Approve / Reject) ----
  if (customId === 'avalon_team_approve' || customId === 'avalon_team_reject') {
    const channelId = interaction.channelId;
    const game = gameManager.getGame(channelId);
    if (!game) {
      await interaction.reply({ content: 'ไม่พบเกมในช่องนี้', ephemeral: true });
      return;
    }

    const approve = customId === 'avalon_team_approve';
    const result = game.voteTeam(interaction.user.id, approve);

    if (!result.ok) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }

    await interaction.reply({ content: result.message, ephemeral: true });

    if (result.allVotesIn) {
      try {
        await interaction.message.edit({ components: [] });
      } catch (_) {}

      if (result.broadcast) {
        await interaction.channel.send(result.broadcast);
      }

      if (game.phase === 'mission') {
        await sendMissionPromptUI(interaction.channel, game);
      } else if (game.phase === 'team_proposal') {
        await sendTeamProposalUI(interaction.channel, game);
      }
    }
    return;
  }

  // ---- ปุ่มเปิดโหวตภารกิจ (สาธารณะในช่อง) ----
  if (customId === 'avalon_mission_prompt') {
    const channelId = interaction.channelId;
    const game = gameManager.getGame(channelId);
    if (!game) {
      await interaction.reply({ content: 'ไม่พบเกมในช่องนี้', ephemeral: true });
      return;
    }
    if (game.phase !== 'mission') {
      await interaction.reply({ content: 'ตอนนี้ไม่ใช่ช่วงโหวตภารกิจ', ephemeral: true });
      return;
    }
    if (!game.selectedTeam.includes(interaction.user.id)) {
      await interaction.reply({
        content: 'เฉพาะสมาชิกทีมภารกิจเท่านั้นที่สามารถโหวตได้',
        ephemeral: true,
      });
      return;
    }
    if (game.missionVotes.has(interaction.user.id)) {
      await interaction.reply({ content: 'คุณได้โหวตไปแล้ว', ephemeral: true });
      return;
    }

    const player = game.players.find((p) => p.id === interaction.user.id);
    const isEvil = player && player.role.side === 'evil';
    const row = createMissionVoteRow(isEvil);

    await interaction.reply({
      content: '🗡️ กรุณาเลือกผลภารกิจ',
      components: [row],
      ephemeral: true,
    });
    return;
  }

  // ---- โหวตภารกิจจริง (ephemeral ในช่อง) ----
  if (customId === 'avalon_mission_success' || customId === 'avalon_mission_fail') {
    const channelId = interaction.channelId;
    const game = gameManager.getGame(channelId);
    if (!game) {
      await interaction.reply({ content: 'ไม่พบเกมในช่องนี้', ephemeral: true });
      return;
    }

    const choice = customId === 'avalon_mission_success' ? 'success' : 'fail';
    const result = game.voteMission(interaction.user.id, choice);

    if (!result.ok) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }

    await interaction.update({
      content: `คุณโหวต **${choice === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}** แล้ว ✅`,
      components: [],
    });

    if (result.allVotesIn) {
      if (result.broadcast) {
        await interaction.channel.send(result.broadcast);
      }

      if (game.phase === 'team_proposal') {
        await sendTeamProposalUI(interaction.channel, game);
      } else if (game.phase === 'assassin_guess') {
        await sendAssassinUI(interaction.channel, game);
      }
    }
    return;
  }
}

client.login(token);
