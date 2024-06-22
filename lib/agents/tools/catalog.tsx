import { createStreamableValue } from 'ai/rsc'
import { searchProductsSchema } from '@/lib/schema/get-products'
import { ToolProps } from '.'
import { Pinecone, Index } from '@pinecone-database/pinecone'
import { embed, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CohereClient, CohereError, CohereTimeoutError } from "cohere-ai";
import type { CatalogSearchResults } from '@/lib/types'

export const searchProductsTool = ({ uiStream, fullResponse }: ToolProps) => ({
    // The function search on the ecommerce catalog using vector db (RAG)
    description: 'Search products on the catalog',
    parameters: searchProductsSchema,
    execute: async ({
        product_description,
        product_name,
        max_price
    }: {
        product_description: string
        product_name?: string
        max_price?: number
    }) => {
        let hasError = false
        // Append the search section
        const streamResults = createStreamableValue<string>()

        uiStream.append(
            <Description
                result={streamResults.value}
                productDescription={product_description}
            />
        )

        let searchResult
        try {
            searchResult = await searchProducts(
                product_description,
                product_name,
                max_price
            )
        } catch (error) {
            console.error('Search Products on The Catalog error:', error)
            hasError = true
        }


        if (hasError) {
            fullResponse = `An error occurred while searching for "${product_description}".`
            uiStream.update(null)
            streamResults.done()
            return searchResult;
            }

        streamResults.update(searchResult)
        return searchResult
    }
});

async function getProductsBox(
    products: CatalogSearchResults
): Promise<string> {
    return products.map((product: any) => {
        return (
            <ProductBox
                key={product.link}
                product={product}
            />
        )
    })
}

async function searchProducts(
    product_description: string,
    product_name?: string,
    max_price?: number
): Promise<any> {
    const topK = 10;

    let embedding
    try {
        embedding = await getEmbedding(product_description, product_name)
    } catch (error) {
        throw new Error('Error while embedding the product description')
    }

    let searchedProducts
    try {
        searchedProducts = await getProductsFromPinecone(embedding, max_price)
    } catch (error: any) {
        console.error('Error while searching the product in the catalog: ', error)
        throw new Error('Error while searching the product in the catalog: ', error)
    }

    if (searchedProducts.length === 0) {
        console.warn('No products found in the catalog')
        throw new Error('No products found in the catalog')
    }

    try {
        searchedProducts = await reRankProducts(searchedProducts, product_description, product_name)
    } catch (error: any) {
        console.error('Error while reranking the products: ', error)
        throw new Error('Error while reranking the products: ', error)
    }

    let summary
    try {
        const summary = await getSummary(product_description, searchedProducts)
    } catch (error: any) {
        console.error('Error while generating the summary: ', error)
        throw new Error('Error while generating the summary: ', error)
    }

    return summary
}

async function getProductsFromPinecone(
    embedding: any, 
    max_price?: number
): Promise<CatalogSearchResults> {
    const topK = 10;
    const minScore = 0.1;

    const apiKey: string = process.env.PINECONE_API_KEY ?? ''
    const indexName: string = process.env.PINECONE_INDEX ?? ''

    const pinecone = new Pinecone();
    if (indexName === '') {
        throw new Error('PINECONE_INDEX environment variable not set')
        }
        // Retrieve the list of indexes to check if expected index exists
    const indexes = (await pinecone.listIndexes())?.indexes;

    if (!indexes || indexes.filter(i => i.name === indexName).length !== 1) {
        throw new Error(`Index ${indexName} does not exist`)
    }

    // Get the Pinecone index
    const index = pinecone!.Index(indexName);

    // Get the namespace
    const pineconeNamespace = index.namespace('')

    let searchResults
    if (max_price === undefined) {
        searchResults = await pineconeNamespace.query({
            vector: embedding,
            topK,
            includeMetadata: true,
        })
    }
    else {
        searchResults = await pineconeNamespace.query({
            vector: embedding,
            topK,
            includeMetadata: true,
            filter: { $and: [{ prezzo :  {$lte: max_price * 1.1 } }, { prezzo: {$gte: max_price * 0.3 }}] },
        })
    }

    if (!searchResults.matches) {
        throw new Error('No results found in Pinecone index / namespace / query')
    }

    let searchProducts = searchResults.matches
        .filter(
            (match: any) => match.score > minScore
        ).sort(
            // sort by algorithm score: 0.3 for price, 0.7 for score. Use logaritmic scale for price
            (a: any, b: any) => 0.7 * b.score - 0.7 * a.score + 0.3 * Math.log(b.prezzo) - 0.3 * Math.log(a.prezzo)
        ).map((match: any) => match.metadata).filter(
            (product: any) => product.prezzo && product.text && product.link && product.link_immagine && product.nome && product.marchio
        ).filter(
            (product: any) => product.prezzo > 0 && product.prezzo < 10000 && product.text.length > 0 && product.link.length > 0 && product.link_immagine.length > 0 && product.nome.length > 0 && product.marchio.length > 0
        ).filter(
            // regex for link e.g. https://www.mediaworld.it/it/product/_mestolo-lagostina-mestolo-172443.html
            (product: any) => product.link.match(/https:\/\/www.mediaworld.it\/it\/product\/_.*-\d+.html/)
        ).filter(
            // regex for link_immagine e.g.  https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_92638119/fee_786_587_png
            (product: any) => product.link_immagine.match(/https:\/\/assets.mmsrg.com\/isr\/\d+\/c1\/-\/ASSET_MMS_\d+\/fee_\d+_\d+_png/)
        )

    if (searchProducts.length === 0) {
        throw new Error('No valid products found in Pinecone index / namespace / query')
    }

    return searchProducts
}

async function getEmbedding(
    product_description: string,
    product_name?: string,
): Promise<any> {
    // 'embedding' is a single embedding object (number[])

    const textToEmbed = `${product_description}${product_name ? `\nSpecifically the product is ${product_name}` : ''}`;

    const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-large'),
        value: textToEmbed,
    });

    return embedding
}

async function reRankProducts(
    searchProducts: CatalogSearchResults,
    product_description: string,
    product_name?: string,
): Promise<CatalogSearchResults> {

    const cohere = new CohereClient({
        token: process.env.COHERE_API_KEY,
    });

    const query = `${product_description}${product_name ? `\nSpecifically the product is ${product_name}` : ''}`;
    
    let reRankIndex: Array<any> = [];
    
    (async () => {
        try {
            reRankIndex = (await cohere.rerank({
                documents: searchProducts,
                query: query,
                topN: 6,
                model: 'rerank-multilingual-v3.0',
                rankFields: ['text', 'tipologia_prodotto', 'nome', 'marchio'],
            }))
            .results
            .filter(
                (product: any) => product.relevance_score > 0.05
            ).sort(
                (a: any, b: any) => b.relevance_score - a.relevance_score
            )


        } catch (err) {
            if (err instanceof CohereTimeoutError) {
                console.log("Rerank - Request timed out", err);
                throw new Error('Rerank - Request timed out');
            } else if (err instanceof CohereError) {
                // catch all errors
                console.log(err.statusCode);
                console.log(err.message);
                console.log(err.body);
                throw new Error('Rerank - Request error');
            }
        }
    })();

    // mapping and sorting the products based on the relevance_score
    const reRankedProducts = reRankIndex.map((product: any) => searchProducts[product.index])

    if (reRankedProducts.length === 0) {
        console.warn('After reranking zero products found - returning the original search results')
        return searchProducts
    }
    return reRankedProducts
}

async function getSummary(
    userQuery: string,
    products: CatalogSearchResults
): Promise<string> {

    let {text, usage} = await generateText({
        model: openai('gpt-3.5-turbo'), 
        temperature: 0.1,
        maxTokens: 600,
        system: 'You are a professional search expert who has been tasked with summarizing the products found in the catalog of Mediaworld that are relevant to the user query. You must only use the information provided in the catalog and generate a summary that is relevant to the user query. The summary should be concise and informative.',
        prompt: `Write a summary for the products found in the catalog of Mediaworld that it is relevant to the query of the user '${userQuery }'.
        Your goal is to highlight the most common themes and features of the products found in the catalog that are relevant to the user query.
        Try to use natural language and keep the summary concise.
        Use a maximum of six sentences and one hundred words. 
        The first sentence should be a general introduction to the first product found in the catalog.
        The second sentence should be a general introduction to the second product found in the catalog.

        for example:
        if the user query is "smartphone with good camera" and the products found in the catalog are "iPhone 15 Pro Max, Samsung Galaxy S22 Ultra, Google Pixel 7 Pro" with all the information on it,
        you should generate a summary like:
        "Il sistema di fotocamere pro dell'iPhone 15 Pro include sette obiettivi professionali, con una fotocamera principale da 48MP per foto ad altissima risoluzione e un teleobiettivo 3x per primi piani nitidissimi.
        Il Samsung Galaxy S22 Ultra è dotato di un sistema di fotocamere professionali con un obiettivo grandangolare da 108MP per foto nitide e dettagliate e un obiettivo teleobiettivo 5x per primi piani nitidissimi.
        Il Google Pixel 7 Pro è dotato di un sistema di fotocamere professionali con un obiettivo grandangolare da 48MP per foto nitide e dettagliate e un obiettivo teleobiettivo 3x per primi piani nitidissimi."
        "
        The products found in the catalog are:\n${products.map((product: any) => '---' + product.nome + ":\n" + product.text + '\n---').join('\n\n')}.`,
      });

    text = text
    .trim()
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/[\[\(]\d+ words[\]\)]/g, "")

    if (text.length === 0) {
        throw new Error('No summary generated')
    }
 
    return text;
}