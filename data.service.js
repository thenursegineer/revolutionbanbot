import nano from 'nano';
import { config } from 'dotenv';

config();

const couchdb = nano(process.env.COUCHDB_URL);

export class DataService {
    banData;
    db;
    constructor(database) {
        if(!database) {
            throw new Error('Database is required');
        }
        this.db = database;
    }

    static async getInstance() {
        let db;
        try {
            await DataService.createDatabase();
            db = couchdb.db.use(process.env.COUCHDB_DB);
        } catch (error) {
            console.error('Error initially connecting to CouchDB:', error.message);
            db = couchdb.db.use(process.env.COUCHDB_DB);
        }
        console.log('Connected to CouchDB successfully.');
        return new DataService(db);
    }

    static async createDatabase() {
        try {
            await couchdb.db.create(process.env.COUCHDB_DB);
            console.info('Database created successfully.');
        } catch (error) {
            if (error.statusCode === 412) {
                console.info('Database already exists.');
                couchdb.db.use(process.env.COUCHDB_DB);
                return;
            }
            console.error('Error creating database:', error.message);
            process.exit(1);
        }
    }

    async getBannedUsers() {
        try {
            const response = await this.db.list({ include_docs: true });
            console.log('Fetched banned users from CouchDB:', response.rows);
            const activeBans = response.rows.filter(row => row.doc.banned);
            if (activeBans.length === 0) {
                console.log('No banned users found.');
                return new Set();
            }
            this.banData = new Map(activeBans.map(row => [row.id, row.doc]));
            return new Set(activeBans.map(row => row.id));
        } catch (error) {
            console.error('Error fetching banned users:', error);
            return new Set();
        }
    }

    async addBannedUser(userId, reason, originalServer) {
        if (!userId) {
            console.error('User ID is required to add a banned user.');
            return;
        }
        if (!reason) {
            console.warn('No reason provided for banning user. Using default reason.');
        }
        if (!originalServer) {
            console.warn(`No original server provided for banned user ${userId}. Using default value.`);
        }
        const defaultReason = 'User has been identified as an enemy to the resistance.';
        try {
            const state = await this.db.insert({
                _id: userId,
                banned: true,
                reason: reason ?? defaultReason,
                originalServer: originalServer
            });
            console.log('Added banned user to CouchDB:', state);
        } catch (error) {
            console.error('Error adding banned user:', error.message);
        }
    }

    async removeBannedUser(userId) {
        try {
            await this.db.destroy(userId, '1-1');
        } catch (error) {
            console.error('Error removing banned user:', error);
        }
    }
    
    async isUserBanned(userId) {
        try {
            const response = await this.db.get(userId);
            return response.banned === true;
        } catch (error) {
            if (error.statusCode === 404) {
                return false;
            }
            console.error('Error checking if user is banned:', error.message);
            return false;
        }
    }
    async getAllBannedUsers() {
        try {
            const response = await this.db.view('bans', 'allBannedUsers');
            return response.rows.map(row => row.value);
        } catch (error) {
            console.error('Error fetching all banned users:', error.message);
            return [];
        }
    }
    async addBannedUserToList(userId) {
        try {
            await this.db.insert({ _id: userId, banned: true });
        } catch (error) {
            console.error('Error adding banned user to list:', error.message);
        }
    }
}