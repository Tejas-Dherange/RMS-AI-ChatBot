import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendMail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskManager.com/",
    },
  });

  const emailBody = mailGenerator.generate(options.mailgenContent);
  const emailText = mailGenerator.generatePlaintext(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  const mail = {
    from: process.env.MIALTRAP_SENDER_EMAIL,
    to: options.email,
    subject: options.subject,
    text: emailText,
    html: emailBody,
  };

  try {
    const info = await transporter.sendMail(mail);
    console.log("mail sent successfully✅", info);
  } catch (error) {
    console.error("Error in sending mail", error);
  }
};

const emailVerificationMailgenContent = (username, verficationUrl) => {
  return {
    body: {
      name: username,
      intro:
        "Welcome to Task Manager! We're very excited to have you on board.",
      action: {
        instructions: "To get started with Task Manager, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Verify your mail",
          link: verficationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};
const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro:
        "Welcome to Task Manager! We're very excited to have you on board.",
      action: {
        instructions: "To get started with Task Manager, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Verify your mail",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export {
  sendMail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
};
