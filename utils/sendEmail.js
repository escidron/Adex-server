import nodemailer from 'nodemailer'

export default function sendEmail (sendTo,subject,text,template){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'eduardosanchezcidron@gmail.com',
          pass: 'tdtetpgbvfzelfey'
        }
      });
      
      var mailOptions = {
        from: 'eduardosanchezcidron@gmail.com',
        to: sendTo,
        subject: subject,
        text: text,
        html:template?template:''
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
  };