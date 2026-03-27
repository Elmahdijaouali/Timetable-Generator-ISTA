const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

// Setup logging
const userDataDir = path.join(os.homedir(), '.TimetableGenerator');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}
const logPath = path.join(userDataDir, 'backend-startup.log');

function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
}

// Global mute for console logs as requested
console.log = () => { };
console.warn = () => { };

function killProcessesOnPort(port) {
  return new Promise((resolve, reject) => {
    const command = `lsof -ti:${port} | xargs -r kill -9`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // If no processes found, that's actually fine
        if (error.message.includes('No such file or directory') || error.code === 1) {
          log(`No processes found on port ${port}`);
          resolve();
        } else {
          log(`Error killing processes on port ${port}: ${error.message}`);
          reject(error);
        }
      } else {
        log(`Successfully killed processes on port ${port}`);
        resolve();
      }
    });
  });
}



async function main() {
  try {
    // Check sqlite3
    const sqlite3Path = require.resolve('sqlite3');

    const dotenv = require("dotenv");
    dotenv.config();


    // Load Express modules
    const express = require("express");
    const compression = require("compression");
    const helmet = require("helmet");
    const rateLimit = require("express-rate-limit");
    const cors = require("cors");


    // Determine database path
    let dbFile;
    if (process.env.NODE_ENV === 'production') {
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      dbFile = path.join(userDataDir, 'database.sqlite');
    } else {
      const dbDir = path.join(__dirname, 'database');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir);
      }
      dbFile = path.join(dbDir, 'database.sqlite');
    }
    log(`Database file path: ${dbFile}`);

    // Migration function
    async function ensureMigrations() {
      let needMigration = false;

      if (!fs.existsSync(dbFile)) {
        log('Database file does not exist. Running migrations...');
        needMigration = true;
      } else {
        // Check if Administrators table exists
        try {
          const sqlite3 = require('sqlite3').verbose();
          const db = new sqlite3.Database(dbFile);

          needMigration = await new Promise((resolve, reject) => {
            db.get(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='Administrators'",
              (err, row) => {
                // Close database connection first
                db.close((closeErr) => {
                  if (closeErr) {
                    log(`Error closing database: ${closeErr.message}`);
                  }
                });

                if (err) {
                  log(`Error checking tables: ${err.message}`);
                  return resolve(true); // Need migration on error
                }

                resolve(!row); // Need migration if table doesn't exist
              }
            );
          });

        } catch (e) {
          log(`Error checking tables: ${e.stack}`);
          needMigration = true;
        }
      }

      if (needMigration) {
        log('Running migrations...');

        const migrationPath = path.join(__dirname, 'run-migrations.js');

        if (!fs.existsSync(migrationPath)) {
          const error = `Migration script not found at: ${migrationPath}`;
          log(error);
          throw new Error(error);
        }

        await new Promise((resolve, reject) => {
          const child = require('child_process').spawn('node', [migrationPath], {
            stdio: 'inherit',
            cwd: __dirname
          });

          child.on('error', (error) => {
            log(`Migration spawn error: ${error.message}`);
            reject(error);
          });

          child.on('exit', code => {
            if (code === 0) {
              log('Migrations completed successfully.');
              resolve();
            } else {
              log(`Migration failed with exit code: ${code}`);
              reject(new Error(`Migration failed with exit code ${code}`));
            }
          });
        });
      } else {
        log('Database and tables exist. Skipping migrations.');
      }
    }

    // Run migrations first, before importing models
    await ensureMigrations();
    log('Migrations check completed.');

    // NOW import routes and services (after migrations)
    log('Importing routes and services...');
    const authRouter = require("./routes/api/v1/auth.js");
    const importDataRouter = require("./routes/api/v1/importData.js");
    const generateRouter = require("./routes/api/v1/generate.js");
    const testRouter = require("./routes/api/v1/test.js");
    const classroomRouter = require("./routes/api/v1/classroom.js");
    const timetableFormateurRouter = require("./routes/api/v1/timetableFormateur.js");
    const groupRouter = require('./routes/api/v1/group.js');
    const branchRouter = require('./routes/api/v1/branch.js');
    const mergeRouter = require('./routes/api/v1/merge.js');
    const timetableGroupRouter = require('./routes/api/v1/timetableGroup.js');
    const timetableActiveFormateurRouter = require("./routes/api/v1/timetableActiveFormateur.js");
    const timetableActiveClassroomRouter = require("./routes/api/v1/timetableClassroom.js");
    const historicTimetablesRouter = require("./routes/api/v1/timetableHistoric.js");
    const groupsEnStageRouter = require("./routes/api/v1/groupsEnStage.js");
    const formateurRouter = require("./routes/api/v1/formateur.js");
    const settingRouter = require("./routes/api/v1/setting.js");
    const databaseService = require("./services/databaseService.js");
    const { initializeDefaults } = require('./controllers/SettingController.js');
    const { sequelize } = require("./models/index.js");
    log('Routes and services imported successfully.');

    const startTime = Date.now();
    const app = express();

    // Middleware setup
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    const corsOptions = {
      origin: "http://localhost:5173",
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use(express.json({
      limit: '10mb',
      strict: true
    }));

    app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Static files for uploads (permissive CORS and no-cache for updates)
    app.use('/uploads/admin-images', cors({ origin: '*' }), express.static(path.resolve(__dirname, 'uploads/admin-images'), {
      setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }));

    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
      });
      next();
    });

    // Health endpoints
    app.get('/health', async (req, res) => {
      try {
        const dbHealth = await databaseService.healthCheck();
        const uptime = Date.now() - startTime;
        res.json({
          status: 'healthy',
          uptime: `${Math.floor(uptime / 1000)}s`,
          database: dbHealth,
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    app.get('/metrics', (req, res) => {
      const metrics = databaseService.getMetrics();
      res.json({
        database: metrics,
        memory: process.memoryUsage(),
        uptime: Date.now() - startTime
      });
    });

    app.post('/optimize', async (req, res) => {
      try {
        await databaseService.optimize();
        res.json({ message: 'Database optimization completed' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Import authentication middleware
    const { authenticateJWT } = require('./middleware/auth.js');

    // API routes
    const PORT = process.env.PORT || 8002;
    const fix_path = "/api/v1";

    // Public routes (no authentication required)
    app.use(fix_path, authRouter); // Auth router has its own middleware protection
    app.use(fix_path, branchRouter);
    app.use(fix_path, settingRouter);

    // Protected routes (authentication required)
    app.use(fix_path, authenticateJWT, importDataRouter);
    app.use(fix_path, authenticateJWT, generateRouter);
    app.use(fix_path, authenticateJWT, testRouter);
    app.use(fix_path, authenticateJWT, classroomRouter);
    app.use(fix_path, authenticateJWT, timetableFormateurRouter);
    app.use(fix_path, authenticateJWT, groupRouter);
    app.use(fix_path, authenticateJWT, mergeRouter);
    app.use(fix_path, authenticateJWT, timetableGroupRouter);
    app.use(fix_path, authenticateJWT, timetableActiveFormateurRouter);
    app.use(fix_path, authenticateJWT, timetableActiveClassroomRouter);
    app.use(fix_path, authenticateJWT, historicTimetablesRouter);
    app.use(fix_path, authenticateJWT, groupsEnStageRouter);
    app.use(fix_path, authenticateJWT, formateurRouter);



    // Error handlers
    app.use((error, req, res, next) => {
      log(`Error: ${error.stack}`);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });

    // Start server
    const startServer = async () => {
      try {
        // Kill any existing processes on the port before starting
        log(`Checking for processes on port ${PORT}...`);
        await killProcessesOnPort(PORT);

        await sequelize.authenticate();
        log('Database authenticated.');

        await databaseService.initializeOptimizations();
        log('Database optimizations applied.');

        try {
          await initializeDefaults();
          log('Default settings initialized.');
        } catch (error) {
          log('Warning: Could not initialize default settings - will retry on first access:', error.message);
        }

        app.listen(PORT, () => {
          const startupTime = Date.now() - startTime;
          log(`Server is running on port ${PORT} (startup time: ${startupTime}ms)`);
        });
      } catch (error) {
        log(`Startup error: ${error.stack}`);
        process.exit(1);
      }
    };

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      log('SIGTERM received, closing server...');
      await sequelize.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      log('SIGINT received, closing server...');
      await sequelize.close();
      process.exit(0);
    });

    // Start the server
    await startServer();

  } catch (err) {
    log(`Fatal error: ${err.stack}`);
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Run main
main().catch(err => {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] Unhandled error: ${err.stack}\n`);
  console.error('Unhandled error:', err);
  process.exit(1);
});