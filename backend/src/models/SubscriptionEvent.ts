import { pool } from '../database/connection';
import { SubscriptionEvent } from '../types';

export class SubscriptionEventModel {
  /**
   * Create a new subscription event (webhook audit log)
   */
  static async create(data: {
    user_id?: string;
    revenuecat_customer_id: string;
    event_type: string;
    product_id?: string;
    price?: number;
    currency?: string;
    raw_payload: any;
  }): Promise<SubscriptionEvent> {
    const query = `
      INSERT INTO subscription_events (user_id, revenuecat_customer_id, event_type, product_id, price, currency, raw_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.user_id || null,
      data.revenuecat_customer_id,
      data.event_type,
      data.product_id || null,
      data.price || null,
      data.currency || null,
      JSON.stringify(data.raw_payload),
    ]);

    return result.rows[0];
  }

  /**
   * Get subscription events for a user
   */
  static async findByUserId(userId: string, limit: number = 50): Promise<SubscriptionEvent[]> {
    const query = `
      SELECT * FROM subscription_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
}
