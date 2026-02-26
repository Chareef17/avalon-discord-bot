/**
 * Slice entry สำหรับใช้กับ discord-games-bot (vertical slice)
 * ใช้ร่วมกับบอทรวม: require('avalon-discord-bot/src/slice') หรือคัดลอกโฟลเดอร์ slices/avalon
 */
const { AvalonGameManager } = require('./game/AvalonGameManager');
const { createAvalonCommands } = require('./commands/avalonCommands');

const gameManager = new AvalonGameManager();
const { data, execute } = createAvalonCommands();

async function handleInteraction(client, interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'avalon') {
    return false;
  }
  await execute(interaction, gameManager);
  return true;
}

module.exports = {
  name: 'avalon',
  getCommands: () => [data],
  handleInteraction,
};
