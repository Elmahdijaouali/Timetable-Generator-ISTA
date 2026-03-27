'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

if (config.dialect === 'sqlite') {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  
  if (process.env.NODE_ENV === 'production') {
    const userDataDir = path.join(os.homedir(), '.TimetableGenerator');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    config.storage = path.join(userDataDir, 'database.sqlite');
  } else {
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }
    config.storage = path.join(dbDir, 'database.sqlite');
  }
}
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

sequelize.options.logging = false 

db.sequelize = sequelize;
db.Sequelize = Sequelize;

const GenerationReport = require('./generationreport')(sequelize);
const GlobalGenerationReport = require('./globalgenerationreport')(sequelize);

module.exports = {
  ...db,
  GenerationReport,
  GlobalGenerationReport,
};
