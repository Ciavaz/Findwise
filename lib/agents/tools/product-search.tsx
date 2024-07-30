import { tool, embed } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { productSearchSchema } from '@/lib/schema/product-search'
import { products, SelectProducts } from '@/lib/drizzle/products'
import { SearchSection } from '@/components/search-section'
import { getModelForEmbedding } from '../../utils'
import { desc, sql, cosineDistance, gt, lte, like, and } from 'drizzle-orm'
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
      category
    }) => {
      let hasError = false
      // Append the search section
      const streamResults = createStreamableValue<string>()

      uiStream.update(
        <SearchSection
          result={streamResults.value}
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
  
      streamResults.done(JSON.stringify(searchResult))
  
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
    max_price: number = 3000,
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
    
        const productsResults = await db
            .select({ 
                id: products.id,
                title: products.title,
                price: products.price,
                link: products.link,
                link_image: products.image_link,
                marketing_text: products.marketing_text,
                breadcrumb_all : products.breadcrumb_all,
                description: products.description,
                product_specification: products.product_specification,  
                similarity })
            .from(products)
            .where(and(gt(similarity, 0.4), lte(products.price, max_price), like(products.breadcrumb_all, category ? `%${category}%` : '%%')))
            .orderBy((t) => desc(t.similarity))

            .limit(maxResults)
        return productsResults

        } catch (error) {
            console.error(error)
            throw error
        }
    }


    

async function tavilySearch(
    query: string,
    maxResults: number = 10,
    searchDepth: 'basic' | 'advanced' = 'basic',
    includeDomains: string[] = [],
    excludeDomains: string[] = []
  ): Promise<any> {
    const apiKey = process.env.TAVILY_API_KEY
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults < 5 ? 5 : maxResults,
        search_depth: searchDepth,
        include_images: true,
        include_answers: true,
        include_domains: includeDomains,
        exclude_domains: excludeDomains
      })
    })
  
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
  
    const data = await response.json()
    return data
  }
  