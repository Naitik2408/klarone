import nodemailer from "nodemailer";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

console.log("User:", process.env.SMTP_USER);
console.log("Pass:", process.env.SMTP_PASS ? "YES" : "NO");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  await transporter.verify();
  console.log("SUCCESS: SMTP connection verified!");
  const info = await transporter.sendMail({
    from: `"Klarone" <${process.env.SMTP_USER}>`,
    to: "naitikkumar2408@gmail.com",
    subject: "Klarone Test Email",
    text: "Your Klarone code is working!",
  });
  console.log("SUCCESS: Message sent! ID:", info.messageId);
}

test().catch(console.error);
