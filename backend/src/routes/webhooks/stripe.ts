import { Router, Request, Response } from 'express';
import { StripeService } from '../../services/stripeService';
import logger from '../../utils/logger';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * Note: This route uses raw body parsing, configured in index.ts
 */
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    logger.warn('Stripe webhook received without signature');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    // Ensure we have raw body (Buffer)
    const payload = req.body as Buffer;

    if (!Buffer.isBuffer(payload)) {
      logger.error('Webhook payload is not a Buffer. Check body parsing configuration.');
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const result = await StripeService.handleWebhookEvent(payload, signature);

    logger.info(`Webhook processed successfully: ${result.type}`);
    return res.status(200).json({ received: true, type: result.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook processing failed:', { error: message });

    // Return 400 for signature errors, 500 for processing errors
    const statusCode = message.includes('signature') ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

export default router;
