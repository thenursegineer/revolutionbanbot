import { Client, GatewayIntentBits } from "discord.js";
import { DataService } from "./data.service.js";

export class BanClient {
    banList;
    client;
    dataService;

    get banData() {
        return this.dataService.banData;
    }

    constructor(client, dataService) {
        this.banList = new Set();
        this.client = client;
        this.dataService = dataService;
        this.registerHandlers();
    }

    static async getInstance() {
        const discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers, // Needed to detect member updates
            ],
        });

        const dataService = await DataService.getInstance();
        const banClient = new BanClient(discordClient, dataService);
        await banClient.#loadBans();
        await banClient.login(process.env.BAN_BOT_TOKEN);
        return banClient;
    }

    async #loadBans() {
        try {
            this.banList = await this.dataService.getBannedUsers();
            console.log(`Loaded ${this.banList.size} banned user IDs from CouchDB`);
        } catch (error) {
            console.error('Error reading banlist:', error);
            process.exit(1);
        }
    }

    async #addBan(bannedMemberId, reason, server) {
        if (!bannedMemberId) {
            console.error('User ID is required to add a banned user.');
            return;
        }
        if(this.banList.has(bannedMemberId)) {
            console.error('User is already on ban list.');
            return;
        }
        await this.dataService.addBannedUser(bannedMemberId, reason, server);
        this.banList.add(bannedMemberId);
        await this.propagateBan(bannedMemberId);
    }

    async #checkAndBanMembers() {
        for (const guild of this.client.guilds.cache.values()) {
            try {
                // Fetch all members in the guild
                const members = await guild.members.fetch();
                for (const member of members.values()) {
                    if (this.banList.has(member.id)) {
                        const defaultReason = 'User is on the ban list (daily check).';
                        const reason = this.banData.get(member.id)?.reason ?? defaultReason;
                        try {
                            await this.banUser(member, reason, guild);
                            //await member.ban({ reason: 'User is on the ban list (daily check).' });
                            // Post a success message to the designated channel
                            const channel = await guild.channels.fetch(process.env.ACTION_CHANNEL_ID);
                            if (channel && channel.isTextBased()) {
                                channel.send(`Banned **${member.user.tag}** (${member.id}) due to ban list (daily check).`);
                            }
                            console.info(`Banned ${member.user.tag} (${member.id}) in guild ${guild.name}`);
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

    registerHandlers() {
        // Register event handlers

        // Run the initial ban check and import bans when the bot is ready
        this.client.on('ready', () => {
            console.info(`Logged in as ${this.client.user.tag}! Running initial ban check...`);
            const daily = 86400000;
            setInterval(this.#checkAndBanMembers, daily);
            setInterval(this.importBans, daily);
        });

        // Run the initial ban check and import bans when the bot is added to a server
        this.client.on('guildCreate', (server) => {
            
        });

        this.client.on('guildMemberAdd', async (user) => {
            const { id: userId } = user;
            // Check if the joining member is on the banned list
            if (this.banList.has(userId)) {
              this.banUser(user);
            }
        });

        // Add member to banlist on ban
        this.client.on('guildBanAdd', ({guild: server, user, reason}) => {
            const { name, id } = server;
            this.banUser(user, reason, {name, id});
        });
    }

    async importBans() {
        for(const [guildId, guild] of this.client.guilds.cache) {
            const bans = await guild.bans.fetch();
            if(!bans.size) continue;
            bans.map(ban => {
                const bannedUserId = ban.user.id;
                this.banList.add(bannedUserId);
                this.dataService.addBannedUser(bannedUserId, ban.reason, {name: guild.name, id: guildId});
                console.log(`Added ${bannedUserId} to ban list from guild ${guild.name}`);
            });
        }
    }

    async banUser(member, message, guild) {
        const defaultReason = 'User has been identified as an enemy to the resistance.';
        message = message ?? this.banData.get(member.id)?.reason ?? defaultReason;
        try {
            await this.#addBan(member.id, message, guild);
            member.ban({ reason: `Revolution Banbot: ${message}` });
            console.log(`Banned ${member.user.tag} (${member.id}) because they are on the ban list.`);
        } catch (error) {
            console.error(`Failed to ban ${member.user.tag} (${member.id}):`, error);
        }
    }

    async propagateBan(userId) {
        // Ban across guilds
        console.info(`Propagating ban for ${userId} across guilds...`);
        try {
            for(const guild of this.client.guilds.cache.values()) {
                const defaultReason = 'Banbot: User has been identified as an enemy to the resistance.';
                const reason = this.dataService.banData.get(userId)?.reason ?? defaultReason;
                try {
                    console.info(`Attempting to ban ${userId} in guild ${guild.name}...`);
                    await guild.members.ban(userId, { reason });
                    console.info(`Successfully banned ${userId} in guild ${guild.name}`);
                } catch (error) {
                    console.error(`Failed to ban ${userId} in guild ${guild.name}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error(`Failed to propagate ban for ${userId}:`, error);
        }
    }

    login(token) {
        this.client.login(token);
    }
}