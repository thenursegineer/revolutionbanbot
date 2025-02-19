export async function checkAndBanMembers(client, bannedUserIds) {
  for (const guild of client.guilds.cache.values()) {
    try {
      // Fetch all members in the guild
      const members = await guild.members.fetch();
      for (const member of members.values()) {
        if (bannedUserIds.has(member.id)) {
          try {
            await member.ban({ reason: 'User is on the ban list (daily check).' });
            // Post a success message to the designated channel
            const channel = await guild.channels.fetch(process.env.ACTION_CHANNEL_ID);
            if (channel && channel.isTextBased()) {
              channel.send(`Banned **${member.user.tag}** (${member.id}) due to ban list (daily check).`);
            }
            console.log(`Banned ${member.user.tag} (${member.id}) in guild ${guild.name}`);
          } catch (banError) {
            console.error(`Failed to ban ${member.user.tag} (${member.id}) in guild ${guild.name}:`, banError);
            // Post a failure message to the designated channel
            const channel = await guild.channels.fetch(process.env.ACTION_CHANNEL_ID);
            if (channel && channel.isTextBased()) {
              channel.send(`Failed to ban **${member.user.tag}** (${member.id}) in guild ${guild.name}. Error: ${banError.message}`);
            }
          }
        }
      }
    } catch (fetchError) {
      console.error(`Error fetching members for guild ${guild.name}:`, fetchError);
    }
  }
}
