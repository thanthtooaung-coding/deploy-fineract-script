import { Client } from 'pg'
import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Database connection strings
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.qwcxfoibfeumnclxjgin:u7SXJ7FDkukBjaxL@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
const MONGODB_URL = process.env.MONGODB_DATABASE_URL || 'mongodb+srv://thanthtoo1285_db_user:hThx1iJAg9oq2i1C@vinn.cxkep87.mongodb.net/payload?appName=vinn'

// Payload CMS collection names (these will be table names in PostgreSQL and collection names in MongoDB)
const PAYLOAD_COLLECTIONS = [
  'users',
  'media',
  'authors',
  'blogs',
  'presses',
  'laconic-blogs',
  'jobonic-testing-blogs',
  'jobonic-production-blogs',
  'prompts',
  'events',
  // Payload internal collections
  'payload-locked-documents',
  'payload-preferences',
  'payload-migrations',
]

interface MigrationStats {
  [collectionName: string]: {
    total: number
    migrated: number
    errors: number
  }
}

/**
 * Convert PostgreSQL row to MongoDB document
 * Handles common data type conversions
 */
function convertRowToDocument(row: any): any {
  const doc: any = {}
  
  for (const [key, value] of Object.entries(row)) {
    // Handle null values
    if (value === null) {
      doc[key] = null
      continue
    }
    
    // Handle dates
    if (value instanceof Date) {
      doc[key] = value
      continue
    }
    
    // Handle arrays (PostgreSQL arrays come as strings sometimes)
    if (Array.isArray(value)) {
      doc[key] = value
      continue
    }
    
    // Handle JSON/JSONB fields
    if (typeof value === 'object' && value !== null) {
      doc[key] = value
      continue
    }
    
    // Handle numeric strings that should be numbers
    if (typeof value === 'string' && /^-?\d+\.?\d*$/.test(value) && value.trim() !== '') {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        doc[key] = num
        continue
      }
    }
    
    // Handle boolean-like values
    if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
      doc[key] = value.toLowerCase() === 'true'
      continue
    }
    
    // Default: keep as is
    doc[key] = value
  }
  
  return doc
}

/**
 * Get all table names from PostgreSQL that match Payload CMS pattern
 */
async function getPayloadTables(pgClient: Client): Promise<string[]> {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `
  
  const result = await pgClient.query(query)
  const allTables = result.rows.map((row: any) => row.table_name)
  
  // Filter to Payload CMS tables (exact match or pluralized)
  const payloadTables = allTables.filter((table: string) => {
    // Check if it's an exact match
    if (PAYLOAD_COLLECTIONS.includes(table)) return true
    
    // Check if it's a pluralized version (e.g., 'users' -> 'users', 'blog' -> 'blogs')
    const singular = table.replace(/s$/, '')
    const plural = table + 's'
    if (PAYLOAD_COLLECTIONS.includes(singular) || PAYLOAD_COLLECTIONS.includes(plural)) return true
    
    // Check Payload internal tables
    if (table.startsWith('payload-')) return true
    
    return false
  })
  
  return payloadTables
}

/**
 * Migrate a single table/collection
 */
async function migrateCollection(
  pgClient: Client,
  mongoClient: MongoClient,
  tableName: string,
  collectionName: string,
  stats: MigrationStats
): Promise<void> {
  try {
    console.log(`\n📦 Migrating ${tableName} -> ${collectionName}...`)
    
    // Get all rows from PostgreSQL
    const query = `SELECT * FROM "${tableName}" ORDER BY id;`
    const result = await pgClient.query(query)
    
    if (result.rows.length === 0) {
      console.log(`   ⚠️  No data found in ${tableName}`)
      stats[collectionName] = { total: 0, migrated: 0, errors: 0 }
      return
    }
    
    console.log(`   📊 Found ${result.rows.length} records`)
    
    // Get MongoDB collection
    const db = mongoClient.db()
    const collection = db.collection(collectionName)
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    // await collection.deleteMany({})
    
    // Convert and insert documents
    const documents = result.rows.map(convertRowToDocument)
    
    // Insert in batches to avoid memory issues
    const batchSize = 100
    let migrated = 0
    let errors = 0
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      
      try {
        // Use insertMany with ordered: false to continue on errors
        const insertResult = await collection.insertMany(batch, { ordered: false })
        migrated += insertResult.insertedCount
        console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertResult.insertedCount} documents`)
      } catch (error: any) {
        // Handle duplicate key errors (if IDs already exist)
        if (error.code === 11000) {
          // Try inserting one by one to skip duplicates
          for (const doc of batch) {
            try {
              await collection.insertOne(doc)
              migrated++
            } catch (err: any) {
              if (err.code !== 11000) {
                console.error(`   ❌ Error inserting document:`, err.message)
                errors++
              }
            }
          }
        } else {
          console.error(`   ❌ Error inserting batch:`, error.message)
          errors += batch.length
        }
      }
    }
    
    stats[collectionName] = {
      total: result.rows.length,
      migrated,
      errors
    }
    
    console.log(`   ✨ Completed: ${migrated}/${result.rows.length} migrated, ${errors} errors`)
    
  } catch (error: any) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message)
    stats[collectionName] = { total: 0, migrated: 0, errors: 1 }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const pgClient = new Client({
    connectionString: SUPABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })
  
  const mongoClient = new MongoClient(MONGODB_URL)
  
  const stats: MigrationStats = {}
  
  try {
    console.log('🚀 Starting migration from Supabase (PostgreSQL) to MongoDB Atlas...\n')
    
    // Connect to databases
    console.log('📡 Connecting to Supabase...')
    await pgClient.connect()
    console.log('✅ Connected to Supabase')
    
    console.log('📡 Connecting to MongoDB Atlas...')
    await mongoClient.connect()
    console.log('✅ Connected to MongoDB Atlas\n')
    
    // Get all Payload CMS tables
    console.log('🔍 Discovering Payload CMS tables...')
    const tables = await getPayloadTables(pgClient)
    console.log(`✅ Found ${tables.length} tables: ${tables.join(', ')}\n`)
    
    if (tables.length === 0) {
      console.log('⚠️  No Payload CMS tables found. Please verify your database connection.')
      return
    }
    
    // Migrate each table
    for (const tableName of tables) {
      // Use table name as collection name (Payload CMS uses same names)
      const collectionName = tableName
      await migrateCollection(pgClient, mongoClient, tableName, collectionName, stats)
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    
    let totalRecords = 0
    let totalMigrated = 0
    let totalErrors = 0
    
    for (const [collection, stat] of Object.entries(stats)) {
      console.log(`\n${collection}:`)
      console.log(`  Total records: ${stat.total}`)
      console.log(`  Migrated: ${stat.migrated}`)
      console.log(`  Errors: ${stat.errors}`)
      
      totalRecords += stat.total
      totalMigrated += stat.migrated
      totalErrors += stat.errors
    }
    
    console.log('\n' + '-'.repeat(60))
    console.log(`TOTAL: ${totalRecords} records, ${totalMigrated} migrated, ${totalErrors} errors`)
    console.log('='.repeat(60))
    
    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log(`\n⚠️  Migration completed with ${totalErrors} errors. Please review the logs above.`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    // Close connections
    await pgClient.end()
    await mongoClient.close()
    console.log('\n🔌 Database connections closed')
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
