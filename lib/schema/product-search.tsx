import { DeepPartial } from 'ai'
import { z } from 'zod'

export const productSearchSchema = z.object({
  query: z.string().describe('The query to search for'),
  max_price: z.number().optional().describe('The maximum price of the product the user is willing to pay'),
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
    'PC Gaming',
    'Console e Videogiochi'
  ]).describe('The category of the product the user is searching for'),
  technical_specifications_needed: z.boolean().describe('Whether technical specifications for the products are relavant to anwer the user query'),
})

export type PartialInquiry = DeepPartial<typeof productSearchSchema>
