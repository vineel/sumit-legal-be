const nodemailer = require("nodemailer");

// ✅ Use environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "developer.expinator@gmail.com",
    pass: process.env.GMAIL_PASS || "jjhj xmtn xevz bqpa",
  },
});


 
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ SMTP Server is ready to send messages");
  }
});

const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"IBD Contracting" <${process.env.GMAIL_USER || "developer.expinator@gmail.com"}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email error:", error);
    throw error;
  }
};

module.exports = sendMail;
