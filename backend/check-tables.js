const { sequelize } = require("./src/config/database");

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("Tables:", results.map((row) => Object.values(row)[0]));
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
