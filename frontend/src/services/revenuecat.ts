import { Purchases } from '@revenuecat/purchases-js'

let purchasesInstance: Purchases | null = null

/**
 * Initialize RevenueCat Purchases SDK for Web Billing
 */
export function initializeRevenueCat(apiKey: string, userId: string): void {
  if (!apiKey) {
    console.warn('[RevenueCat] No API key provided, skipping initialization')
    return
  }

  try {
    purchasesInstance = Purchases.configure(apiKey, userId)
    console.info('[RevenueCat] SDK initialized for user', userId, '| key prefix:', apiKey.substring(0, 8) + '...')
  } catch (error) {
    console.error('[RevenueCat] Failed to initialize:', error)
  }
}

/**
 * Get current offerings (available packages)
 */
export async function getOfferings() {
  if (!purchasesInstance) {
    console.warn('[RevenueCat] getOfferings called but SDK not initialized')
    return null
  }
  try {
    const offerings = await purchasesInstance.getOfferings()
    console.info('[RevenueCat] getOfferings raw:', JSON.parse(JSON.stringify(offerings)))
    console.info('[RevenueCat] getOfferings summary:', {
      allOfferingKeys: Object.keys(offerings?.all || {}),
      hasCurrentOffering: !!offerings?.current,
      currentIdentifier: offerings?.current?.identifier,
      availablePackages: offerings?.current?.availablePackages?.map(
        (p: any) => ({ id: p.identifier, product: p.rcBillingProduct?.identifier })
      ),
    })
    return offerings
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error)
    return null
  }
}

/**
 * Purchase a specific package
 */
export async function purchasePackage(rcPackage: any) {
  if (!purchasesInstance) throw new Error('RevenueCat not initialized')
  return purchasesInstance.purchase({ rcPackage })
}

/**
 * Get current customer info
 */
export async function getCustomerInfo() {
  if (!purchasesInstance) return null
  try {
    return await purchasesInstance.getCustomerInfo()
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error)
    return null
  }
}

/**
 * Reset RevenueCat on logout
 */
export function resetRevenueCat(): void {
  purchasesInstance = null
}

/**
 * Check if RevenueCat is initialized
 */
export function isRevenueCatReady(): boolean {
  return purchasesInstance !== null
}
