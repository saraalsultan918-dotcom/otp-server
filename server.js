const express = require("express");
const cors = require("cors");
const axios = require("axios");

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(
  process.env.FIREBASE_KEY.replace(/\\n/g, '\n')
);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ route للتأكد أن السيرفر شغال
app.get("/", (req, res) => {
  res.send("OTP Server is running ✅");
});

// 🔥 إرسال OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // 🔥 نخزن في Firebase بدل RAM
    await db.collection("otp").doc(email).set({
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    // إرسال عبر Brevo
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Medical Complaints",
          email: "saraalsultan918@gmail.com",
        },
        to: [{ email }],
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

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// 🔥 التحقق من OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const doc = await db.collection("otp").doc(email).get();

    if (!doc.exists) {
      return res.json({ success: false });
    }

    const data = doc.data();

    // انتهى الوقت
    if (Date.now() > data.expires) {
      await db.collection("otp").doc(email).delete();
      return res.json({ success: false });
    }

    // تحقق
    if (data.code.toString() === otp.toString()) {
      await db.collection("otp").doc(email).delete();
      return res.json({ success: true });
    }

    res.json({ success: false });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// 🔥 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});