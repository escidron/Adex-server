import dotenv from "dotenv";
import AWS from "aws-sdk";
import message from "aws-sdk/lib/maintenance_mode_message.js";
message.suppress = true;
dotenv.config();

export default function sendEmail(sendTo, subject, template) {
  AWS.config.update({
    accessKeyId: process.env.AWS_SES_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    region: process.env.AWS_SES_REGION,
  });

  const ses = new AWS.SES({ apiVersion: "2010-12-01" });

  const params = {
    Destination: {
      ToAddresses: [sendTo],
    },
    Message: {
      Body: {
        Html: {
          Data: template
        }
      },
      Subject: {
        Data: subject,
      },
    },
    Source: process.env.EMAIL_ACCOUNT,
  };

  ses.sendEmail(params, (err, data) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("E-mail sended successfully", data.MessageId);
    }
  });
}
