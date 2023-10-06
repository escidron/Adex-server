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
            <img
              src="http://test.adexconnect.com/email/email-logo.png"
              alt="Company Logo"
            />
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
                <img
                style="width: 150px;height: 150px;border-radius: 10px;"
                src="http://test.adexconnect.com/email/{{ advertisement.image }}"
                alt={{ advertisement.image }}
                />
                <div style="margin-left: 20px;height: 100%;">
                <h1 style="margin: 0;font-size: 22px;">{{ advertisement.title }}</h1>
                <div style="display: flex;gap: 5px;margin-top: 5px;">
    
                <svg fill="none" height="18" viewBox="0 0 48 48" width="18" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m23.4236 41.8172c.0004.0002.0007.0004.5764-.8172zm1.1528 0 .0036-.0026.0091-.0064.0318-.0228c.0273-.0196.0666-.048.117-.085.1008-.0741.2463-.1826.4302-.3239.3676-.2827.889-.6971 1.513-1.2306 1.2466-1.0659 2.9097-2.6131 4.5754-4.54 3.3074-3.826 6.7435-9.2864 6.7435-15.529 0-3.7315-1.4736-7.3114-4.0984-9.9518-2.6251-2.64056-6.1867-4.1251-9.9016-4.1251s-7.2765 1.48454-9.9016 4.1251c-2.6248 2.6404-4.0984 6.2203-4.0984 9.9518 0 6.2426 3.4361 11.703 6.7435 15.529 1.6657 1.9269 3.3288 3.4741 4.5754 4.54.624.5335 1.1454.9479 1.513 1.2306.1839.1413.3294.2498.4302.3239.0504.037.0897.0654.117.085l.0318.0228.0091.0064.0036.0026c.3453.2431.8075.2431 1.1528 0zm-.5764-.8172.5764.8172c-.0004.0002-.0007.0004-.5764-.8172zm5-21c0 2.7614-2.2386 5-5 5s-5-2.2386-5-5 2.2386-5 5-5 5 2.2386 5 5z" fill="#7b6d6d" fill-rule="evenodd"/></svg>            
                <h3 style="color: #7b6d6d;margin: 0;font-weight: 600;font-size: 14px;">{{ advertisement.address }}</h3>
                </div>
                <p style="font-size: 15px;">{{ advertisement.description }}</p>
    
                <h1 style="margin: 0;font-size: 24px;margin-top: auto;margin-left: auto;">$ {{ advertisement.price }}</h1>
    
                </div>
            </div>
          `
          :''
          }
          
          
          <a href="http://localhost:5000/login" target="_blank" id="login-button" class="login-button"
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
          <img
            src="http://test.adexconnect.com/email/{{ icon }}.png"
            alt="{{ icon }}"
            class="message-image"
            style="margin-top: 40px;display: block;margin-left: auto;margin-right: auto;"
          />
          <h1 class="footer-text" style="color:black;width: 80%;font-size: 14px;text-align: center;margin-top: 50px;display: block;margin-left: auto;margin-right: auto;">
            Thank you for choosing ADEX for your advertising needs. If you are having issues with your booking, please contact us.
          </h1>
          <h1 class="unsubscribe-text" style="color:black;text-align:center;text-decoration: underline;font-size: 14px;cursor: pointer;">Unsubscribe</h1>
        </div>
        <div class="social-icons" style="text-align: center;margin-top: 20px;">
          <h5 style="color:black;text-decoration: none;margin: 0 10px;">info@adexconnect.com</h5>
          <div class="icons-group" style="margin-left: auto;margin-right: auto;width: 100px;margin-top: 10px;">
            <a href="https://facebook.com"
              ><img
                src="http://test.adexconnect.com/email/facebook-logo.png"
                alt="Facebook"
                class="social-media-icons"
                style="height: 16px;"
            /></a>
            <a href="https://instagram.com"
              ><img
                src="http://test.adexconnect.com/email/instagram-logo.png"
                alt="Instagram"
                class="social-media-icons"
                style="height: 16px;"
            /></a>
            <a href="https://youtube.com"
              ><img
                src="http://test.adexconnect.com/email/youtube-logo.jpg"
                alt="Instagram"
                class="social-media-icons"
                style="height: 16px;"
            /></a>
          </div>
        </div>
      </body>
    </html>
    `;  
  const compiledTemplate = Handlebars.compile(emailTemplate);
  const renderedEmail = compiledTemplate(data);
  return renderedEmail;
}
