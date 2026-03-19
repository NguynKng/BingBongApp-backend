const { translate } = require("@vitalets/google-translate-api");
const axios = require("axios");

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

const translateText2 = async (req, res) => {
  const { text, source, to } = req.body;

  try {
    const response = await axios.post(
      "http://localhost:2109/translate",
      {
        q: text,
        source: source,
        target: to,
        format: "text",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // tránh treo request khi model load
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data.translatedText,
    });
  } catch (error) {
    console.error("LibreTranslate error:", error?.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Translation failed",
    });
  }
};

module.exports = { translateText, translate_text, translateText2 };
