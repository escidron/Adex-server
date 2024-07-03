import Stripe from "stripe";
import { addDueInfo, getRejectedAccounts, setAccountIsAccepted } from "../queries/Users.js";
import { updateAdvertismentById } from "../queries/Advertisements.js";
import getFormattedDate from "./getFormattedDate.js";

export async function checkConnectAccountStatus() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const rejectedAccounts = await getRejectedAccounts();
    const accountsList = await stripe.accounts.list();
    const data = accountsList.data;
    const createdAt = new Date();
    const formattedCreatedAt = getFormattedDate(createdAt);
  
    rejectedAccounts.forEach((account) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].id === account.stripe_account) {
          if (data[i].payouts_enabled && data[i].charges_enabled && data[i].requirements.currently_due.length === 0) {
            setAccountIsAccepted(account.stripe_account);
            
            //make visible all the listing owned by the seller who was accepted by stripe
            const query = `UPDATE advertisement SET
                          status = '1',
                          updated_at = '${formattedCreatedAt}'
                        WHERE created_by = ${account.user_id} and status = '0' ${
              account.company_id ? `and company_id = ${account.company_id}` : ""
            }
                      `;
            updateAdvertismentById(query);
          }else if(data[i].requirements.currently_due.length > 0){
            const requirements = data[i].requirements.currently_due
            const requirementString = requirements.join(';');
            addDueInfo(account.stripe_account,requirementString)
            
            console.log('account',account)
          }
        }
      }
    });

    //console.log('data',data.data)
  } catch (error) {
    console.log("[checkExpiredListing]", error);
  }

  return null;
}
