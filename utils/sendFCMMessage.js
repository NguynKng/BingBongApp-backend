const admin = require("firebase-admin");
const serviceAccount = require("../services/firebase/demofcm.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendFCMToTopic = async ({ title, body, data }) => {
  const message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    topic: "all_users",
  };

  await admin.messaging().send(message);
};

module.exports = { sendFCMToTopic };