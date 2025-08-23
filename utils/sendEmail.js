import dotenv from "dotenv";
import AWS from "aws-sdk";
import message from "aws-sdk/lib/maintenance_mode_message.js";
import * as fs from "fs";
import nodemailer from "nodemailer";

message.suppress = true;
dotenv.config();

export default async function sendEmail(sendTo, subject, template, listingId, customAttachments = []) {
  let attachmentData = ''

try{
  if (listingId) {
    attachmentData = fs.readFileSync(
     `./images/email/qr_code_images/listing_qrcode${listingId}.png`
   );
 }

 AWS.config.update({
   accessKeyId: process.env.AWS_SES_ACCESS_KEY,
   secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
   region: process.env.AWS_SES_REGION,
 });
 let transporter = nodemailer.createTransport({
   SES: new AWS.SES({
     region: process.env.AWS_SES_REGION,
     apiVersion: "2010-12-01",
   }),
 });

 // Prepare attachments
 let attachments = [];
 
 if (attachmentData) {
   attachments.push({
     filename: `Listing_qrcode${listingId}.png`,
     content: attachmentData,
   });
 }
 
 // Add custom attachments
 if (customAttachments && customAttachments.length > 0) {
   attachments = attachments.concat(customAttachments);
 }

 let info = await transporter.sendMail({
   from: process.env.EMAIL_ACCOUNT,
   to: sendTo,
   subject: subject,
   text: "",
   html: template ? template : "",
   attachments: attachments.length > 0 ? attachments : '',
 });

 console.log("Message sent: %s", info.messageId);
 // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
 return { info, transporter }; 
}catch(error){
  console.log('[Email error] : '+ error)
  throw error;
}

}
