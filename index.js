import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import { checkAndBanMembers } from './checkAndBan.js';

// Load environment variables from .env file
config();

// Read the ban list from a file and store it in a Set for fast lookups
let bannedUserIds = new Set();

try {
  const data = fs.readFileSync('banlist.txt', 'utf-8');
  bannedUserIds = new Set(
    data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  );
  console.log(`Loaded ${bannedUserIds.size} banned user IDs from banlist.txt`);
  if(!bannedUserIds.size)
      throw new Error('No banned userIds in banlist.txt');
} catch (error) {
  console.error('Error reading banlist.txt:', error);
  process.exit(1);
}

// Create a new client instance with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for guildMemberAdd events
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}! Running initial ban check...`);
  checkAndBanMembers(client, bannedUserIds);
  // Run daily (24 hours = 86400000 ms)
  setInterval(checkAndBanMembers, 86400000);
  });

client.on('guildMemberAdd', async (member) => {
  // Check if the joining member is on the banned list
  if (bannedUserIds.has(member.id)) {
    try {
      // Attempt to ban the member with a reason
      await member.ban({ reason: 'User has been identified as an enemy to the resistance.' });
      console.log(`Banned ${member.user.tag} (${member.id}) because they are on the ban list.`);
    } catch (error) {
      console.error(`Failed to ban ${member.user.tag} (${member.id}):`, error);
    }
  }
});

client.login(process.env.BAN_BOT_TOKEN);
