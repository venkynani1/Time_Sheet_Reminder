// Stores members, weekly statuses, reminder logs, and editable settings in JSON.
const fs = require('fs/promises');
const path = require('path');

const databaseFile = path.join(__dirname, '../data/database.json');
const emptyDatabase = { members: [], weeklyStatuses: [], reminderLogs: [] };
let writeQueue = Promise.resolve();

async function readDatabase() {
  try {
    return JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(emptyDatabase);
    throw error;
  }
}

function updateDatabase(updater) {
  writeQueue = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await updater(database);
    await fs.writeFile(databaseFile, `${JSON.stringify(database, null, 2)}\n`);
    return result;
  });
  return writeQueue;
}

async function getDatabase() {
  await writeQueue;
  return readDatabase();
}

module.exports = { getDatabase, updateDatabase };
