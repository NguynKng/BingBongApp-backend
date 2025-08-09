const axios = require('axios');
const { PERSPECTIVE_API_KEY } = require('../../config/envVars');
const vision = require('@google-cloud/vision');

// Khởi tạo client
const client = new vision.ImageAnnotatorClient({
    keyFilename: "./services/client_id/bingbong-project-ff12f2021cd6.json"
});

const analyzeComment = async (text) => {
  try {
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`,
      {
        comment: { text },
        languages: ["en"],
        requestedAttributes: {
          TOXICITY: {},
          INSULT: {},
          THREAT: {},
          IDENTITY_ATTACK: {},
          SEXUALLY_EXPLICIT: {},
        },
      }
    );

    console.log("Analysis result:");
    for (const [attribute, value] of Object.entries(response.data.attributeScores)) {
      console.log(
        `${attribute}: ${(value.summaryScore.value * 100).toFixed(2)}%`
      );
    }
  } catch (error) {
    console.error("Error analyzing text:", error.response?.data || error.message);
  }
};

async function analyzeImageContent(imagePath) {
  try {
    const [result] = await client.labelDetection(imagePath);
    const detections = result.safeSearchAnnotation;

    console.log("SafeSearch Results:");
    console.log(`Adult: ${detections.adult}`);
    console.log(`Violence: ${detections.violence}`);
    console.log(`Racy: ${detections.racy}`);
    console.log(`Medical: ${detections.medical}`);
    console.log(`Spoof: ${detections.spoof}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Gọi hàm với ảnh bạn muốn kiểm tra
analyzeComment("You're fucking suck");
//analyzeImageContent("./public/images/images-test/avatar-6.jpg");