import Stripe from "stripe";
import { getRejectedAccounts, setAccountIsAccepted } from "../queries/Users.js";
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
          if (data[i].payouts_enabled && data[i].charges_enabled) {
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
