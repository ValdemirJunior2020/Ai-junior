export const dynamic = "force-dynamic"; // defaults to auto-dynamic
import db from "@/utils/db";
import Transaction from "@/models/transaction";
import stripe from "@/utils/stripe";

export async function POST(req: Request) {
  await db();

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  try {
    // verify the webhook signature and parse the event
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      console.log("STRIPE WEBHOOK SESSION RESPONSE => ", session);

      const transaction = await new Transaction({
        sessionId: session.id,
        customerId: session.customer,
        invoiceId: session.invoice,
        subscriptionId: session.subscription,
        mode: session.mode,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        status: session.status,
      });

      await transaction.save();

      return Response.json({
        message: "Webhook received: Checkout session completed",
      });
    }
  } catch (err) {
    console.error(err);
    return new Response("Webhook Error", { status: 400 });
  }
}
