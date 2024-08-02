import { tool, embed } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { productSearchSchema } from '@/lib/schema/product-search'
import { products, SelectProducts } from '@/lib/drizzle/products'
import { ProductSearchSection } from '@/components/products-search-section'
import { getModelForEmbedding } from '../../utils'
import { desc, asc, sql, cosineDistance, gt, lte, like, and, max, eq } from 'drizzle-orm'
import { db } from '@/lib/drizzle/db'
import { ProductSearchResult } from '@/lib/types'

import { ToolProps } from '.'
import { ZodEnum } from 'zod'

export const productSearchTool = ({ uiStream, fullResponse }: ToolProps) => tool({
    description: 'Search the Mediaworld Catalog for products',
    parameters: productSearchSchema,
    execute: async ({
      query,
      max_price,
      category,
      technical_specifications_needed
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
        searchResult = await pgVectorSearch(query, 10, max_price, category ? category : '')     
      } catch (error) {
        console.error('Search API error:', error)
        hasError = true
      }
      
      if (!searchResult) {
        fullResponse = `Nessun prodotto trovato per la ricerca "${query}.`
        uiStream.update(null)
        streamResults.done()
        return searchResult
      }

      if (hasError) {
        fullResponse = `An error occurred while searching for "${query}.`
        uiStream.update(null)
        streamResults.done()
        return searchResult
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
    max_price: number = 4500,
    category: string = ''
): Promise<ProductSearchResult[] | boolean> {

    try {
        if (query.trim().length === 0) return false
    
        const embedding = await generateEmbedding(query)
        const vectorQuery = `[${embedding.join(',')}]`
    
        const similarity = sql<number>`1 - (${cosineDistance(
            products.embedding,
            vectorQuery
        )})`  
        
        console.log(category)

        // if category is gaming then search for PC Gaming
        if (category === 'Gaming') {
            category = 'PC Gaming'
        }

        console.log(query)
        console.log(max_price)
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
                similarity })
            .from(products)
            .where(and(gt(similarity, 0.3), lte(products.price, max_price), eq(products.category, category)))
            .orderBy((t) => desc(t.similarity))
            .limit(maxResults)

        return productsResults

        } catch (error) {
            console.error(error)
            throw error
        }
    }

export function dataHelper(data: any) {
  // Helper function to help AI search efficiently in the data
   
    if (data) {
        return true
    } else {
        return false
    }
}