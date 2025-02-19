export const importBans(async (client, currentBanSet) => {
  let banListTxt = '';
  try {
    for(const [guildId, guild] of client.guilds.cache) {
      const bans = await guild.bans.fetch();
      if(!bans.size) continue;
      banListTxt += bans.map(ban => {
        const bannedUserId = ban.user.id;
        currentBanSet.add(bannedUserId);
      }).join('\n');
    }
    return currentBanSet
  } catch(err) {
    console
  }

  // Write to banlist.txt
  try {
    fs.writeFileSync('banlist.txt', banListTxt, 'utf8');
  } catch(err) {
    console.error('Error writing to banlist');
    return currentBanSet;
  }
});
