import { getNearingExpiryListings, getRecentExpiredListings } from "../queries/Advertisements.js"
import renderEmail from "./emailTamplates/emailTemplate.js"
import sendEmail from "./sendEmail.js"

export async function sendExpiredListingEmail (){

    try{
        const nearingExpiry = await getNearingExpiryListings()
        const recentExpired = await getRecentExpiredListings()

        if(nearingExpiry.length > 0){
            let emailData
            let emailContent
            nearingExpiry.map(listing=>{
                const imageName = listing.image.split(";");

                emailData = {
                    title: "ADEX Listings",
                    subTitle: "",
                    message: 'Your listing is nearing expiration. Please update the date to ensure it remains active.',
                    icon: "warning-expire",
                    advertisement: {
                      title: listing.title,
                      address: listing.address,
                      description: listing.description,
                      image: imageName[0],
                      price: listing.price,
                    },
                  };
                  emailContent = renderEmail(emailData);
                  sendEmail(listing.email, "Listing expire soon", emailContent);
            })

        }
        if(recentExpired.length > 0){
            let emailData
            let emailContent
            recentExpired.map(listing=>{
                const imageName = listing.image.split(";");

                emailData = {
                    title: "ADEX Listings",
                    subTitle: "",
                    message: 'Your listing has expired. Please update the date to ensure it remains active.',
                    icon: "listing-expired",
                    advertisement: {
                      title: listing.title,
                      address: listing.address,
                      description: listing.description,
                      image: imageName[0],
                      price: listing.price,
                    },
                  };
                  emailContent = renderEmail(emailData);
                  sendEmail(listing.email, "Listing expired", emailContent);
            })

        }
    } catch(error){
        console.log('[checkExpiredListing]',error)
    }

    return null
}