import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import { checkAndBanMembers } from './checkAndBan.js';
import { importBans } from './importBans.js';
import { DataService } from './data.service.js';
import { BanClient } from './banClient.js';

// Load environment variables from .env file
config();

const banClient = await BanClient.getInstance();

const bans = banClient.banList;

console.table(bans);


// const dataService = await DataService.getInstance();

// // Read the ban list from a file and store it in a Set for fast lookups

// try {
//   bannedUserIds = await dataService.getBannedUsers();
//   console.log(`Loaded ${bannedUserIds.size} banned user IDs from banlist.txt`);
// } catch (error) {
//   console.error('Error reading banlist.txt:', error);
//   process.exit(1);
// }

// Create a new client instance with necessary intents
// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMembers, // Required for guildMemberAdd events
//   ],
// });

// client.on('ready', () => {
//   console.log(`Logged in as ${client.user.tag}! Running initial ban check...`);
//   checkAndBanMembers(client, bannedUserIds);
//   importBans(client, bannedUserIds);
//   const daily = 86400000;
//   setInterval(checkAndBanMembers, daily);
//   setInterval(importBans, daily);
// });

// client.on('guildMemberAdd', async (member) => {
//   // Check if the joining member is on the banned list
//   if (bannedUserIds.has(member.id)) {
//     try {
//       // Attempt to ban the member with a reason
//       await member.ban({ reason: 'User has been identified as an enemy to the resistance.' });
//       console.log(`Banned ${member.user.tag} (${member.id}) because they are on the ban list.`);
//     } catch (error) {
//       console.error(`Failed to ban ${member.user.tag} (${member.id}):`, error);
//     }
//   }
// });

// client.login(process.env.BAN_BOT_TOKEN);
