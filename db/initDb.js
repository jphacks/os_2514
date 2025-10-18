require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'soccer_game',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
});

async function initDatabase() {
    let client;
    try {
        console.log('🔄 Connecting to database...');
        client = await pool.connect();
        console.log('✅ Connected to database');

        console.log('🔄 Reading schema file...');
        const schemaPath = path.join(__dirname, 'schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('✅ Schema file loaded');

        console.log('🔄 Applying schema...');
        await client.query(schema);
        console.log('✅ Schema applied successfully');

        // テーブル確認
        const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        console.log('\n📊 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        console.log('\n✅ Database initialization completed successfully!');
    } catch (error) {
        console.error('\n❌ Database initialization failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

initDatabase();
