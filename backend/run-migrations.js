/* eslint-disable */
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { GenerationReport } = require('./models');

// Use the same database path as the backend in production
const userDataDir = path.join(os.homedir(), '.TimetableGenerator');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}
const dbFile = path.join(userDataDir, 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbFile,
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

async function runMigrations() {
  try {
    // Test connection
    await sequelize.authenticate();
    if (process.env.NODE_ENV !== 'production') console.log('Database connection established successfully');

    // Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to run in order

    if (process.env.NODE_ENV !== 'production') console.log(`Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      if (process.env.NODE_ENV !== 'production') console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      
      try {
        await migration.up(sequelize.getQueryInterface(), Sequelize);
        if (process.env.NODE_ENV !== 'production') console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error(`✗ Migration ${file} failed:`, error.message);
        // Continue with other migrations
      }
    }

    if (process.env.NODE_ENV !== 'production') console.log('All migrations completed!');
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

async function resetDatabase() {
  
  
}

if (process.env.NODE_ENV !== 'production') console.log('Using database file:', dbFile);
runMigrations(); 