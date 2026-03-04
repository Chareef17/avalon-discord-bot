const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

function createTeamSelectRow(players, teamSize) {
  const options = players.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('avalon_team_select')
    .setPlaceholder(`เลือกสมาชิกทีม ${teamSize} คน`)
    .setMinValues(teamSize)
    .setMaxValues(teamSize)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function createTeamVoteRow() {
  const approve = new ButtonBuilder()
    .setCustomId('avalon_team_approve')
    .setLabel('เห็นด้วย (Approve)')
    .setStyle(ButtonStyle.Success);

  const reject = new ButtonBuilder()
    .setCustomId('avalon_team_reject')
    .setLabel('ไม่เห็นด้วย (Reject)')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(approve, reject);
}

// channelId encoded in custom ID so DM button clicks can route back to the game
function createMissionVoteRow(isEvil, channelId) {
  const success = new ButtonBuilder()
    .setCustomId(`avalon_mission_success_${channelId}`)
    .setLabel('สำเร็จ (Success)')
    .setStyle(ButtonStyle.Success);

  const components = [success];

  if (isEvil) {
    const fail = new ButtonBuilder()
      .setCustomId(`avalon_mission_fail_${channelId}`)
      .setLabel('ล้มเหลว (Fail)')
      .setStyle(ButtonStyle.Danger);
    components.push(fail);
  }

  return new ActionRowBuilder().addComponents(...components);
}

function createAssassinSelectRow(goodPlayers) {
  const options = goodPlayers.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('avalon_assassin_select')
    .setPlaceholder('เลือกผู้เล่นที่คิดว่าเป็น Merlin')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  createTeamSelectRow,
  createTeamVoteRow,
  createMissionVoteRow,
  createAssassinSelectRow,
};
