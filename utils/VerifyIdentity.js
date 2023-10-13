import Stripe from "stripe";


export async function verifyIdentity(accountId, isCompanyAccount,personId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    
    let accountRetrieved = "";
    let verifiedStatus = "";
    let errorDetails = "";

    while (true) {
      
      if (isCompanyAccount) {
        const person = await stripe.accounts.retrievePerson(
          accountId,
          personId
        );
        verifiedStatus = person.verification.status;
        errorDetails = person.verification.details;

      }else{
        accountRetrieved = await stripe.accounts.retrieve(accountId);
        verifiedStatus = accountRetrieved.individual.verification.status;
        errorDetails = accountRetrieved.individual.verification.document.details;

      }

      if (verifiedStatus !== "pending") {
        return {
          status: verifiedStatus == "verified",
          error: errorDetails ? errorDetails : "",
        };
      }
      await delay(2000);
    }
  }

  