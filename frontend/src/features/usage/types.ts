export interface CurrentUsageResponse {
  totalTokens: number;
  monthlyTokens: number;
  limits: {
    globalLimit: number;
    monthlyLimit: number;
  };
  percentUsed: {
    global: number;
    monthly: number;
  };
  remaining: {
    global: number;
    monthly: number;
  };
}
