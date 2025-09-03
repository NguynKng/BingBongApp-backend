const { translate } = require("@vitalets/google-translate-api");
const userModel = require("../models/userModel");

const translateText = async (text, to) => {
  try {
    if (!text || !to) throw new Error("No text or target language specified");
    const translatedText = await translate(text, { to });

    return translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Translation failed");
  }
};

const translate_text = async (req, res) => {
  try {
    const { text, to } = req.body;
    if (!text || !to)
      return res
        .status(400)
        .json({ error: "No text or target language specified" });

    const translateRes = await translate(text, { to });
    const translatedText = translateRes.text;

    return res.status(200).json({
      success: true,
      translated_text: translatedText,
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error });
  }
};

module.exports = { translateText, translate_text };
