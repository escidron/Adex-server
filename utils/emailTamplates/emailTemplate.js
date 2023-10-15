import Handlebars from "handlebars";

export default function renderEmail(data) {
  
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Template</title>
      </head>
      <body style="margin: 0;padding: 0;font-family: Optimistic Text, Helvetica, sans-serif">
        <div style="background-color: #e5e5e3;max-width: 600px;margin: 20px auto;padding: 20px;align-items: center;border-radius: 10px;font-family: Optimistic Text, Helvetica, sans-serif">
          <div class="header" style="text-align: center;margin-top: 20px">

          </div>
          <h1 class="title" style="color:black;font-size:32px;margin: 20px 0 0 0;text-align:center">{{ title }}</h1>
          <h1 class="sub-title" style="color:black;font-size:32px;margin: 0;font-weight: 500;text-align:center;">{{ subTitle }}</h1>
          <p class="email-text" style="font-size:16px;margin: 0;margin-top: 40px;font-family: Optimistic Text, Helvetica, sans-serif;font-size: 16px;letter-spacing: none;line-height: 1.4;color: #313131;">
            {{ message }}
          </p>
          <p class="email-text" style="font-size:16px;margin: 0;margin-top: 40px;font-family: Optimistic Text, Helvetica, sans-serif;font-size: 16px;letter-spacing: none;line-height: 1.4;color: #313131;">Sincerely,</p>
          <p style="font-size:16px;margin: 0;font-family: Optimistic Text, Helvetica, sans-serif;font-size: 16px;letter-spacing: none;line-height: 1.4;color: #313131;">ADEX Team</p>
          
          ${data.advertisement ? `
          <div style="background-color: whitesmoke;
                    display: flex;
                    align-items: center;
                    padding: 20px;
                    border-radius: 10px;
                    margin-top: 20px;
                    width: 80%;
                    margin-left: auto;
                    margin-right: auto;
                    height: 180px;
                    box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
                    ">

                <div style="margin-left: 20px;height: 100%;">
                <h1 style="margin: 0;font-size: 22px;">{{ advertisement.title }}</h1>
                <div style="display: flex;gap: 5px;margin-top: 5px;">
    
                <h3 style="color: #7b6d6d;margin: 0;font-weight: 600;font-size: 14px;">{{ advertisement.address }}</h3>
                </div>
                <p style="font-size: 15px;">{{ advertisement.description }}</p>
    
                <h1 style="margin: 0;font-size: 24px;margin-top: auto;margin-left: auto;">$ {{ advertisement.price }}</h1>
    
                </div>
            </div>
          `
          :''
          }
          
          
          <a href="https://adexconnect.com/login" target="_blank" id="login-button" class="login-button"
            style="color: black;
                    margin-top: 20px;
                    text-decoration: none;
                    background-color: #f3cb00;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                    margin-inline: auto;
                    width: 120px;
                    font-size: 16px;
                    display: block;
                    text-align:center;
                    margin-left: auto;
                    margin-right: auto;">
            ADEX Login
          </a>

          <h1 class="footer-text" style="color:black;width: 80%;font-size: 14px;text-align: center;margin-top: 50px;display: block;margin-left: auto;margin-right: auto;">
            Thank you for choosing ADEX for your advertising needs. If you are having issues with your booking, please contact us.
          </h1>
          <h1 class="unsubscribe-text" style="color:black;text-align:center;text-decoration: underline;font-size: 14px;cursor: pointer;">Unsubscribe</h1>
        </div>
        <div class="social-icons" style="text-align: center;margin-top: 20px;">
          <h5 style="color:black;text-decoration: none;margin: 0 10px;">info@adexconnect.com</h5>
          <div class="icons-group" style="margin-left: auto;margin-right: auto;width: 100px;margin-top: 10px;">



          </div>
        </div>
      </body>
    </html>
    `;  
  const compiledTemplate = Handlebars.compile(emailTemplate);
  const renderedEmail = compiledTemplate(data);
  return renderedEmail;
}
