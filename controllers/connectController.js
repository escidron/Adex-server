import asyncHandler from "express-async-handler";
import database from "../db.js";
import Stripe from "stripe";

const CustomersConnect = asyncHandler(async (req, res) => {
  const stripe = new Stripe('sk_test_51NHvGXEPsNRBDePlhGRiMamYmeEYvOlfeXWzbxY2TiIJ2NxMMv2kLGWRTUjm3AKKbK7KGhy3Peyp4deXoDMOAlZ000GCYWlp4T');

  // const account = await stripe.accounts.create({
  //   type: 'custom',
  //   country: 'US',
  //   email: 'eduardo.rosen@example.com',
  //   capabilities: {
  //     card_payments: {requested: true},
  //     transfers: {requested: true},
  //   },
  // });

  //create the account and enable the charge option
  // const account = await stripe.accounts.update("acct_1NK79FEQnyQLGMMC", {
  //   capabilities: {
  //     card_payments: { requested: true },
  //     transfers: { requested: true },
  //   },
  //   individual: {
  //     email: "email@teste.com",
  //     first_name:'eduardo',
  //     last_name:'sanchez',
  //     id_number:'24311594852',
  //     phone:'+5511948808454',
  //     address:{
  //       country:'BR',
  //       city:'São Paulo',
  //       line1:  'Rua cirino de abreu',
  //       postal_code:'03630010',
  //       state:'São Paulo'
  //     },
  //     political_exposure:'none',
  //     dob: {
  //       day: 2,
  //       month: 7,
  //       year: 1993,
  //     },
  //   },
  // });

  //create the external account and enables the payouts
  const bankAccount = await stripe.accounts.createExternalAccount(
    'acct_1NK79FEQnyQLGMMC',
    {
      external_account: {
        object:'bank_account',
        country: 'BR',
        currency:'brl',
        account_number:'0001234',
        routing_number:'110-0000'
      },
    }
  );
  //create a customer in a connect account
  // const paymentMethodConnect = await stripe.paymentMethods.create({
  //     customer: 'cus_O633RiO5c8Ln8r',
  //     payment_method: 'pm_1NJqxWEPsNRBDePl5e9GQMFZ',
  //   }, {
  //     stripeAccount: 'acct_1NJnx02Rmejhtg33',
  //   });

  // const customer = await stripe.customers.create({
  //     email: 'xxxx@yyyy.zzz',
  //     payment_method: paymentMethodConnect.id,
  //     invoice_settings: {
  //       default_payment_method: paymentMethodConnect.id,
  //     }
  //   }, {
  //     stripeAccount: 'acct_1NJnx02Rmejhtg33',
  //   });

  res.status(200).json({ Message: bankAccount });
});

export { CustomersConnect };
