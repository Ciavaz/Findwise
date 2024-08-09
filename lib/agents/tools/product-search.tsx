import { tool, embed } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { productSearchSchema } from '@/lib/schema/product-search'
import { products, SelectProducts } from '@/lib/drizzle/schema'
import { ProductSearchSection } from '@/components/products-search-section'
import { getModelForEmbedding } from '../../utils'
import { desc, asc, sql, cosineDistance, gt, lte, gte, and, eq } from 'drizzle-orm'
import { db } from '@/lib/drizzle/db'
import { ProductSearchResult } from '@/lib/types'

import { ToolProps } from '.'

export const productSearchTool = ({ uiStream, fullResponse }: ToolProps) => tool({
    description: 'Search the Mediaworld Catalog for products',
    parameters: productSearchSchema,
    execute: async ({
      query,
      min_price,
      max_price,
      category,
      technical_specifications_needed,
      technical_specifications
    }) => {
      let hasError = false
      // Append the search section
      const streamResults = createStreamableValue<ProductSearchResult[]>()

      uiStream.update(
        <ProductSearchSection
          query={query}
          productsResults={streamResults.value}
        />
      )
      // Tavily API requires a minimum of 5 characters in the query
      let searchResult
      try {
        searchResult = await pgVectorSearch(query, 10, min_price, max_price, category ? category : '', technical_specifications_needed, technical_specifications)     
      } catch (error) {
        console.error('Search API error:', error)
        hasError = true
      }
      
      if (!searchResult) {
        console.log("Niente")
        fullResponse = `Nessun prodotto trovato per la ricerca "${query}.`
        uiStream.update(null)
        streamResults.done()
        return fullResponse
      }

      if (hasError) {
        fullResponse = `Mi dispiace abbiamo avuto un errore cercando "${query}.`
        uiStream.update(null)
        streamResults.done()
        return fullResponse
      }
      
      streamResults.done(searchResult as ProductSearchResult[])
      
      if (Array.isArray(searchResult)) {
        // Limit the number of results to 4, as it will enhance rapid response.
        searchResult = searchResult.slice(0, 4)
        // Remove the embedding from the response
        searchResult = searchResult.map((product) => {
          return {
            title: product.title,
            price: product.price,
            marketing_text: product.marketing_text,
            category: product.category,
            link: product.link,
            link_image: product.link_image,
            description: product.description,
            product_specification: technical_specifications_needed ? product.product_specification : '', // Return empty string if technical specifications are not needed
          }
        }
        )
      }
      return searchResult
    }
  })

async function generateEmbedding(raw: string) {
    // OpenAI recommends replacing newlines with spaces for best results
    const input = raw.replace(/\n/g, ' ')
    const { embedding } = await embed({
      model: getModelForEmbedding(),
      value: input,
    })
    return embedding
}

async function pgVectorSearch(
    query: string,
    maxResults: number = 10,
    min_price: number = 0,
    max_price: number = 4500,
    category: string = '',
    technical_specifications_needed: boolean = false,
    technical_specifications: string = ''
): Promise<ProductSearchResult[] | boolean> {

    try {
        if (query.trim().length === 0) return false

        if (technical_specifications != '') {
            query = `Prodotto Ricercato: ${query}. Specifiche del prodotto: ${technical_specifications}`
        }
        console.log(query)
        console.log(category)
        const embedding = await generateEmbedding(query)
        const vectorQuery = `[${embedding.join(',')}]`
        
        const similarity = sql<number>`1 - (${cosineDistance(
            products.embedding,
            vectorQuery
        )})`  

        console.log(category)
        const productsResults = await db
            .select({ 
                id: products.id,
                title: products.title,
                price: products.price,
                link: products.link,
                link_image: products.image_link,
                category: products.category,
                marketing_text: products.marketing_text,
                breadcrumb_all : products.breadcrumb_all,
                description: products.description,
                product_specification: products.product_specification,  
                similarity, 
              })
            .from(products)
            .where(and(gt(similarity, 0.4), gte(products.total_availability, 1), gte(products.price, min_price), lte(products.price, max_price), eq(products.category, category)))
            .orderBy((t) => desc(t.similarity))
            .limit(maxResults)
        
        
        if (productsResults.length === 0) {
          const productsResults = await db
            .select({ 
                id: products.id,
                title: products.title,
                price: products.price,
                link: products.link,
                link_image: products.image_link,
                category: products.category,
                marketing_text: products.marketing_text,
                breadcrumb_all : products.breadcrumb_all,
                description: products.description,
                product_specification: products.product_specification,  
                similarity, 
              })
            .from(products)
            .where(and(gt(similarity, 0.35), gte(products.total_availability, 1), gte(products.price, min_price), lte(products.price, max_price)))
            .orderBy((t) => desc(t.similarity))
            .limit(maxResults)

            if (productsResults.length === 0) {
              return false
            } else {
              return productsResults
            }
        }
      
        return productsResults

        } catch (error) {
            console.error(error)
            throw error
        }
    }

export function dataHelper(data: any) {
  // Helper function to help AI search efficiently in the dataå
    if (data) {
        return true
    } else {
        return false
    }
}