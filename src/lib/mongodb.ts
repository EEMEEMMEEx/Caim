import { MongoClient, Db } from "mongodb"

const options = {
  maxPoolSize: 2,
  minPoolSize: 0,
  maxIdleTimeMS: 5000,
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
  socketTimeoutMS: 5000,
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export function getMongoUri(): string {
  return process.env.MONGODB_URI || ""
}

/**
 * Check if MONGODB_URI is provided and does not contain unresolved placeholders
 */
export function isMongoConfigured(): boolean {
  const uri = getMongoUri()
  return Boolean(
    uri &&
      !uri.includes("<db_username>") &&
      !uri.includes("<USERNAME>") &&
      !uri.includes("<password>")
  )
}

/**
 * Get cached MongoClient instance for connection pooling in Next.js
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null
  }

  const uri = getMongoUri()

  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect().catch((err) => {
        global._mongoClientPromise = undefined
        throw err
      })
    }
    return await global._mongoClientPromise
  } catch (error) {
    console.error("Failed to connect to MongoDB Atlas:", error)
    global._mongoClientPromise = undefined
    return null
  }
}

/**
 * Get MongoDB Database instance (default: 'caim')
 */
export async function getDb(dbName = "caim"): Promise<Db | null> {
  const client = await getMongoClient()
  if (!client) return null
  return client.db(dbName)
}

