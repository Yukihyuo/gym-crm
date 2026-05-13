import mongoose from 'mongoose';
import '../config/db.config.js';
import Client from '../models/Client.js';

const printIndexes = async (title) => {
  const indexes = await Client.collection.indexes();
  console.log(title);
  console.table(indexes.map(({ name, key, unique, partialFilterExpression }) => ({
    name,
    key: JSON.stringify(key),
    unique: Boolean(unique),
    partialFilterExpression: partialFilterExpression ? JSON.stringify(partialFilterExpression) : ''
  })));
  return indexes;
};

const dropIndexIfExists = async (name) => {
  const indexes = await Client.collection.indexes();
  const exists = indexes.some((idx) => idx.name === name);
  if (!exists) return;

  await Client.collection.dropIndex(name);
  console.log(`Dropped index: ${name}`);
};

const ensureClientEmailPhoneIndexes = async () => {
  try {
    await printIndexes('Client indexes before fix:');

    // Remove stale indexes from older schema versions.
    await dropIndexIfExists('email_1');
    await dropIndexIfExists('profile.phone_1');
    await dropIndexIfExists('brandId_1_email_1');
    await dropIndexIfExists('brandId_1_profile.phone_1');

    // Recreate only the indexes needed for this fix.
    await Client.collection.createIndex(
      { brandId: 1, email: 1 },
      {
        name: 'brandId_1_email_1',
        unique: true,
        partialFilterExpression: { email: { $type: 'string', $gt: '' } }
      }
    );

    await Client.collection.createIndex(
      { brandId: 1, 'profile.phone': 1 },
      {
        name: 'brandId_1_profile.phone_1',
        unique: true,
        partialFilterExpression: { 'profile.phone': { $type: 'string', $gt: '' } }
      }
    );

    await printIndexes('Client indexes after fix:');
    console.log('Client email/phone indexes fixed successfully.');
  } catch (error) {
    console.error('Error fixing Client email/phone indexes:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

ensureClientEmailPhoneIndexes();
