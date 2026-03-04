const { SlashCommandBuilder } = require('discord.js');

function createAvalonCommands() {
  const data = new SlashCommandBuilder()
    .setName('avalon')
    .setDescription('เล่นเกม Avalon ในช่องนี้')
    .addSubcommand((sub) =>
      sub.setName('setup').setDescription('สร้างเกม Avalon ใหม่ในช่องนี้'),
    )
    .addSubcommand((sub) =>
      sub.setName('join').setDescription('เข้าร่วมเกม Avalon ที่เปิดอยู่'),
    )
    .addSubcommand((sub) =>
      sub.setName('leave').setDescription('ออกจากเกม Avalon ที่เข้าร่วมอยู่'),
    )
    .addSubcommand((sub) =>
      sub.setName('start').setDescription('เริ่มเกม Avalon (สุ่มบทบาท)'),
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('เช็คสถานะเกม Avalon ในช่องนี้'),
    )
    .addSubcommand((sub) =>
      sub.setName('cancel').setDescription('ยกเลิกเกม Avalon ในช่องนี้ (เฉพาะเจ้าห้อง)'),
    );

  async function execute(interaction, gameManager, helpers) {
    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channelId;

    if (sub === 'setup') {
      gameManager.createGame(channelId, interaction.user.id);
      await interaction.reply({
        content:
          '⚔️ สร้างเกม Avalon ใหม่แล้ว! ใช้คำสั่ง `/avalon join` เพื่อเข้าร่วม\n' +
          '(ผู้เล่นขั้นต่ำ 5 คน สูงสุด 10 คน)',
      });
      return;
    }

    if (sub === 'join') {
      const game = gameManager.getGame(channelId);
      if (!game) {
        await interaction.reply({
          content: 'ยังไม่มีเกม Avalon ในช่องนี้ ใช้คำสั่ง `/avalon setup` ก่อน',
          ephemeral: true,
        });
        return;
      }
      const result = game.addPlayer(
        interaction.user.id,
        interaction.user.displayName || interaction.user.username,
      );
      await interaction.reply({
        content: result.message,
        ephemeral: result.ephemeral === true,
      });
      return;
    }

    if (sub === 'leave') {
      const game = gameManager.getGame(channelId);
      if (!game) {
        await interaction.reply({
          content: 'ยังไม่มีเกม Avalon ในช่องนี้',
          ephemeral: true,
        });
        return;
      }
      const result = game.removePlayer(interaction.user.id);
      await interaction.reply({
        content: result.message,
        ephemeral: result.ephemeral === true,
      });
      return;
    }

    if (sub === 'start') {
      const game = gameManager.getGame(channelId);
      if (!game) {
        await interaction.reply({
          content: 'ยังไม่มีเกม Avalon ในช่องนี้',
          ephemeral: true,
        });
        return;
      }
      const canStart = game.canStart();
      if (!canStart.ok) {
        await interaction.reply({ content: canStart.reason, ephemeral: true });
        return;
      }

      const roleInfos = game.assignRoles();

      const questTable = game.getQuestTable();

      await interaction.reply({
        content:
          `⚔️ **เริ่มเกม Avalon แล้ว!** มีผู้เล่น ${game.players.length} คน\n\n` +
          `📋 **ตารางภารกิจ**\n${questTable}\n\n` +
          'ระบบจะส่งบทบาทให้ผู้เล่นทาง DM...',
      });

      for (const info of roleInfos) {
        try {
          const member = await interaction.guild.members.fetch(info.id);
          const dm = await member.createDM();
          await dm.send(
            `คุณได้รับบทบาท **${info.roleName}**\n\n${info.description}`,
          );
        } catch (err) {
          console.error('ส่ง DM ไม่สำเร็จให้ผู้เล่น', info.id, err);
        }
      }

      if (helpers && helpers.sendTeamProposalUI) {
        await helpers.sendTeamProposalUI(interaction.channel, game);
      }
      return;
    }

    if (sub === 'status') {
      const game = gameManager.getGame(channelId);
      if (!game) {
        await interaction.reply({
          content: 'ยังไม่มีเกม Avalon ในช่องนี้',
          ephemeral: true,
        });
        return;
      }
      const playerList = game.players
        .map((p, i) => `${i + 1}. <@${p.id}>`)
        .join('\n');
      const status = game.getStatus();
      await interaction.reply({
        content:
          `**สถานะเกม Avalon**\n` +
          `เจ้าห้อง: <@${game.hostId}>\n` +
          `จำนวนผู้เล่น: ${game.players.length}\n` +
          `สถานะปัจจุบัน: ${status.phaseText}\n` +
          (status.leaderId ? `หัวหน้าทีม: <@${status.leaderId}>\n` : '') +
          `\n📋 **แถบภารกิจ**\n${status.questIcons}\n\n` +
          `**ผู้เล่น**\n` +
          (playerList || 'ยังไม่มีผู้เล่นเข้าร่วม'),
      });
      return;
    }

    if (sub === 'cancel') {
      const game = gameManager.getGame(channelId);
      if (!game) {
        await interaction.reply({
          content: 'ยังไม่มีเกม Avalon ในช่องนี้',
          ephemeral: true,
        });
        return;
      }
      if (interaction.user.id !== game.hostId) {
        await interaction.reply({
          content: 'มีเพียงเจ้าห้องเท่านั้นที่สามารถยกเลิกเกมได้',
          ephemeral: true,
        });
        return;
      }
      gameManager.removeGame(channelId);
      await interaction.reply({
        content: '🛑 เกม Avalon ในช่องนี้ถูกยกเลิกแล้ว',
      });
    }
  }

  return { data, execute };
}

module.exports = { createAvalonCommands };
