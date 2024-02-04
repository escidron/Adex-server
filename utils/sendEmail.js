import dotenv from "dotenv";
import AWS from "aws-sdk";
import message from "aws-sdk/lib/maintenance_mode_message.js";
import * as fs from "fs";
import nodemailer from "nodemailer";

message.suppress = true;
dotenv.config();

export default async function sendEmail(sendTo, subject, template, listingId) {
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

 let info = await transporter.sendMail({
   from: process.env.EMAIL_ACCOUNT,
   to: sendTo,
   subject: subject,
   text: "",
   html: template ? template : "",
   attachments: attachmentData ? [
     {
       filename: `Listing_qrcode${listingId}.png`,
       content: attachmentData,
     },
   ] : '',
 });

 console.log("Message sent: %s", info.messageId);
 // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
 return info; 
}catch(error){
  console.log('[Email error] : '+ error)
}

}
