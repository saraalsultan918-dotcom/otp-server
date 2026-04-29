const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Firebase
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ check
app.get("/", (req, res) => {
  res.send("OTP Server is running ✅");
});


// =============================
// 🔥 إرسال OTP + فحص الإيميل
// =============================
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 🔥 تحقق إذا الإيميل موجود في Firebase Auth
    try {
      await admin.auth().getUserByEmail(normalizedEmail);

      // ❌ الإيميل موجود
      return res.json({
        success: false,
        error: "EMAIL_ALREADY_EXISTS",
      });

    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        throw err;
      }
      // ✅ الإيميل غير موجود → كمل
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = uuidv4();

    await db.collection("otp").doc(otpId).set({
      email: normalizedEmail,
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    // ✉️ إرسال الإيميل
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Medical Complaints",
          email: "saraalsultan918@gmail.com",
        },
        to: [{ email: normalizedEmail }],
        subject: "OTP Code",
        htmlContent: `<h2>رمز التحقق: ${otp}</h2>`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OTP:", otp);

    res.json({
      success: true,
      otpId: otpId,
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});


// =============================
// 🔥 تحقق OTP
// =============================
app.post("/verify-otp", async (req, res) => {
  const { otpId, otp } = req.body;

  if (!otpId || !otp) {
    return res.json({ success: false });
  }

  try {
    const doc = await db.collection("otp").doc(otpId).get();

    if (!doc.exists) {
      return res.json({ success: false });
    }

    const data = doc.data();

    // ⏰ انتهى الوقت
    if (Date.now() > data.expires) {
      await db.collection("otp").doc(otpId).delete();
      return res.json({ success: false });
    }

    // ✅ تحقق الكود
    if (data.code.toString() === otp.toString()) {
      await db.collection("otp").doc(otpId).delete();
      return res.json({ success: true });
    }

    res.json({ success: false });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});


// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});