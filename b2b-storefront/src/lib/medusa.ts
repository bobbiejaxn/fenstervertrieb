import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9002",
  debug: process.env.NODE_ENV === "development",
})

// Auth helpers
export async function login(email: string, password: string) {
  return sdk.auth.login("customer", "emailpass", { email, password })
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  return sdk.auth.register("customer", "emailpass", {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  })
}

export async function getCurrentCustomer() {
  return sdk.store.customer.retrieve()
}

// Product helpers
export async function getProducts(limit = 20, offset = 0) {
  return sdk.store.product.list({ limit, offset })
}

export async function getProduct(handle: string) {
  return sdk.store.product.list({ handle }).then(r => r.products?.[0])
}

// Cart helpers
export async function createCart(regionId: string) {
  return sdk.store.cart.create({ region_id: regionId })
}

export async function addToCart(cartId: string, variantId: string, quantity: number) {
  return sdk.store.cart.lineItem.create(cartId, { variant_id: variantId, quantity })
}

// Order helpers
export async function getOrders(limit = 20, offset = 0) {
  return sdk.store.order.list({ limit, offset })
}