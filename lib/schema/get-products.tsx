import { DeepPartial } from 'ai'
import { z } from 'zod'

export const searchProductsSchema = z.object({
  product_description: z.string().describe('The description of the product the customer is looking for, e.g. "smartphone"'),
  product_name: z.string().optional().describe('The name of the product the customer is looking for, if known. e.g. "iPhone 15 Pro Max"'),
  max_price: z.number().optional().describe('The maximum price of the products the customer wants to pay'),
})

export type PartialProductsSearch = DeepPartial<typeof searchProductsSchema>
