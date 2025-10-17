const nodemailer = require("nodemailer");

/*
// ✅ Use environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: MAILGUN_USER,
    pass: MAILGUN_PASSWORD,
  },
});
*/

console.log("MAILGUN_USER: ", process.env.MAILGUN_USER);
console.log("MAILGUN_PASSWORD: ", process.env.MAILGUN_PASSWORD);


// ✅ Configure Mailgun SMTP (port 2525 works on your server)
const transporter = nodemailer.createTransport({
  host: "smtp.mailgun.org",
  port: 2525,
  secure: false, // STARTTLS upgrade (2525 supports it)
  auth: {
    user: process.env.MAILGUN_USER,      // e.g. postmaster@mg.yourdomain.com
    pass: process.env.MAILGUN_PASSWORD,  // your Mailgun SMTP password
  },
  requireTLS: true,                      // ensure TLS upgrade
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
      from: `"IBD Contracting" <brad@ibdc.com>`,
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
