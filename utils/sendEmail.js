import nodemailer from 'nodemailer'

export default function sendEmail (sendTo,subject,template){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'eduardosanchezcidron@gmail.com',
          pass: 'drtmmfzofbofyhpu'
        }
      });

      var mailOptions = {
        from: 'eduardosanchezcidron@gmail.com',
        to: sendTo,
        subject: subject,
        text: '',
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