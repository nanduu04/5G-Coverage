import { MongoClient, Db } from 'mongodb';

class MongoDBService {
  private static instance: MongoDBService;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly uri: string;
  private readonly dbName: string;

  private constructor() {
    this.uri = process.env.MONGODB_URI || '';
    this.dbName = '5g-coverage';
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  public async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      
      // Create 2dsphere index if it doesn't exist
      await this.db.collection('gcoverage').createIndex({ geometry: '2dsphere' });
      
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  public getDb(): Db | null {
    return this.db;
  }
}

export const mongodbService = MongoDBService.getInstance(); 