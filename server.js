 HEAD
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 تخزين مؤقت للأكواد مع وقت الانتهاء
let otpStore = {};

// ✅ route للتأكد أن السيرفر شغال
app.get("/", (req, res) => {
  res.send("OTP Server is running ✅");
});

//  إرسال OTP عبر Brevo
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // نخزن OTP مع وقت انتهاء (5 دقائق)
  otpStore[email] = {
    code: otp,
    expires: Date.now() + 5 * 60 * 1000,
  };

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Medical Complaints",
          email: "saraalsultan918@gmail.com", // 👈 نفس إيميلك في Brevo
        },
        to: [{ email }],
        subject: "OTP Code",
        htmlContent: `<h2>رمز التحقق الخاص بك: ${otp}</h2>`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OTP sent to:", email);

    res.json({ success: true });
  } catch (err) {
    console.error("Brevo error:", err.response?.data || err.message);
    res.json({ success: false });
  }
});

// 🔥 التحقق من OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore[email];

  if (!record) {
    return res.json({ success: false, message: "No OTP found" });
  }

  // تحقق من انتهاء الوقت
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired" });
  }

  if (record.code === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  }

  res.json({ success: false, message: "Invalid OTP" });
});

// 🔥 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 تخزين مؤقت للأكواد
let otpStore = {};

// 📧 إعداد الإيميل (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔥 إرسال OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[email] = otp;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Code",
      text: `Your OTP code is: ${otp}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// 🔥 التحقق من OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// 🔥 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
 07a6fb9 (first upload)
});