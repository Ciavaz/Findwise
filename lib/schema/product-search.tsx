import { DeepPartial } from 'ai'
import { z } from 'zod'

export const productSearchSchema = z.object({
  query: z.string().describe('Keywords that precisely identify the product to suggest to the user, ensuring no mismatch. For example, "iPhone 15 Pro Max 512GB" or "Fotocamera Reflex"'),
  min_price: z.number().optional().default(0).describe('The minimum price the user is willing to pay or relevant to the product being searched to filter the results.'),
  max_price: z.number().optional().describe('The maximum price the user is willing to pay for the product.'),
  category: z.enum([
    'TV e Home Cinema',
    'Audio, Cuffie e Navigatori',
    'Fitness e Tempo Libero',
    'Periferiche PC',
    'Telefonia',
    'Fotografia, Video e Droni',
    'Computer',
    'Mobilità Elettrica',
    'Grandi Elettrodomestici',
    'Piccoli Elettrodomestici da Cucina e Caffè',
    'Cura della Persona',
    'Clima e Riscaldamento',
    'Pulizia e Stiro',
    'Smart Home e Domotica',
    'Gaming',
    'Console e Videogiochi'
  ]).describe('The category of the product the user is searching for'),
  technical_specifications_needed: z.boolean().describe('Indicates whether detailed technical specifications are necessary to meet the user’s needs.'),
  technical_specifications: z.string().optional().describe('The relevant technical specifications required to satisfy the user’s query, focusing on what matters most to their needs. For example, if the user is searching for a laptop, you might specify "16GB RAM, 512GB SSD, Intel i7 processor, 15-inch display".'),
})

export type PartialInquiry = DeepPartial<typeof productSearchSchema>
