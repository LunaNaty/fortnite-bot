/**
 * Methods to get Fortnite data from fortnite.js and Firebase cache
 */

require('dotenv').config();

const firebase = require('firebase/app');
require('firebase/database');
const app = firebase.initializeApp({
  apiKey: process.env.FIREBASE_KEY,
  authDomain: process.env.FIREBASE_DOMAIN,
  databaseURL: process.env.FIREBASE_URL,
  projectId: process.env.FIREBASE_ID,
  storageBucket: process.env.FIREBASE_BUCKET
});
const database = firebase.database();

const fortnite = require('fortnite.js');
const client = new fortnite(process.env.FORTNITE_KEY);

// Methods for formatting the messages are in writeMsg.js
const writeMsg = require('./writeMsg');
const writeGlobalMsg = writeMsg.writeGlobalMsg;
const writeModesMsg = writeMsg.writeModesMsg;
const writeRecentMsg = writeMsg.writeRecentMsg;
const writeRoldMsg = writeMsg.writeRoldMsg;
const writeSeasonMsg = writeMsg.writeSeasonMsg;
const writeRatingMsg = writeMsg.writeRatingMsg;

const constants = require('./constants');

// Temporary cache
const tempCache = {};
resetCache();

module.exports = {
  // Get global stats
  getGlobalData: (user, platform) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeGlobalMsg(info));
        }).catch(err => {
          return reject(handleError(err));
        });
    });
  },

  // Get solo/duo/squad lifetime/season3 stats
  getModesData: (user, mode, nums, platform, season) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeModesMsg(info, season, mode, nums));
        }).catch(err => {
          return reject(handleError(err));
        });
    });
  },

  // Get recent matches stats
  getRecentData: (user, platform) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeRecentMsg(info));
        }).catch(err => {
          return reject(handleError(err));
        });
    });
  },

  // Get recent matches stats (old format)
  getRoldData: (user, platform) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeRoldMsg(info));
        }).catch(err => {
          return reject(handleError(err));
        });
    });
  },

  // Get all season stats
  getSeasonData: (user, season, platform) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeSeasonMsg(info, season));
        }).catch(err => {
          return reject(handleError(err));
        });
    });
  },

  // Get TRN rating stats
  getRatingData: (user, platform) => {
    return new Promise((resolve, reject) => {
      getFortniteInfo(user, platform)
        .then(info => {
          return resolve(writeRatingMsg(info));
        }).catch(err => {
          return reject(handleError(err));
        });
    })
  },

  // Map Telegram or Discord user ID to Fortnite username
  setIdCache: (user, id, isTelegram = true) => {
    let path = isTelegram ? 'telegram/' : 'discord/';
    database.ref(path + id).set({ username: user });
  },

  // Get username from user ID
  getIdCache: (id, isTelegram = true) => {
    return new Promise((resolve, reject) => {
      let path = isTelegram ? 'telegram/' : 'discord/';
      database.ref(path + id).once('value').then(snapshot => {
        if (snapshot.val() == null)
          return reject(constants.NOT_FOUND_ERROR);
        return resolve(snapshot.val().username);
      });
    });
  }
};

// Gets the user's Fortnite info from cache or fortnite.js
function getFortniteInfo(user, platform) {
  return new Promise((resolve, reject) => {
    // Look for user in cache
    if (user in tempCache[platform])
      return resolve(tempCache[platform][user]);
    // If not found in cache, use fortnite.js to get the user
    client.get(user, platform, true)
      .then(info => {
        // Store user's info in the temporary cache
        tempCache[platform][user] = info;
        return resolve(info);
      }).catch(err => {
        return reject(err);
      });
  });
}

// Handle error from getting fortnite.js data
function handleError(err) {
  console.error('[Fortnite Tracker]', err);
  if (err in constants.ERRORS)
    return constants.ERRORS[err];
  else
    return constants.GENERIC_ERROR;
}

// Debug logs for Firebase
firebase.database.enableLogging(message => {
  console.log('[FIREBASE]', message);
});

// Hashcode for strings, used for caching data, taken from answer in link below
// stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
String.prototype.hashCode = function () {
  let hash = 0;
  if (this.length === 0) {
    return hash;
  }
  for (let i = 0; i < this.length; i++) {
    let char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Reset the temporary cache every 5 minutes
setInterval(resetCache, 300000);
function resetCache() {
  console.log(`[TEMP CACHE] Resetting at ${new Date().toString()}`);
  // Temporary cache
  tempCache[constants.PC] = {};
  tempCache[constants.XBOX] = {};
  tempCache[constants.PS4] = {};
}