import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, ToolCallPart, ToolResultPart, streamText, tool } from 'ai'
import { getTools } from './tools'
import { getModel, transformToolMessages } from '../utils'
import { AnswerSection } from '@/components/answer-section'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamableText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[]
) {
  let fullResponse = ''
  let hasError = false
  let finishReason = ''

  // Transform the messages if using Ollama provider
  let processedMessages = messages
  const useOllamaProvider = !!(
    process.env.OLLAMA_MODEL && process.env.OLLAMA_BASE_URL
  )
  const useAnthropicProvider = !!process.env.ANTHROPIC_API_KEY
  if (useOllamaProvider) {
    processedMessages = transformToolMessages(messages)
  }
  const includeToolResponses = messages.some(message => message.role === 'tool')
  const useSubModel = useOllamaProvider && includeToolResponses

  const streambleAnswer = createStreamableValue<string>('')
  const answerSection = <AnswerSection result={streambleAnswer.value} hasHeader={true} />

  const currentDate = new Date().toLocaleString()
  const result = await streamText({
    model: getModel(useSubModel),
    maxTokens: 1500,
    temperature: 0.2,
    system: `As a useful and professional shopping assistant and product finder for Mediaworld, you possess the ability to search the Mediaworld catalog for products.
    For each user query, you may use the catalog search results to their fullest potential to provide additional information, assistance and suggest products in your response. 
    
    For good research, focus on precise keywords related to the product's features and needs, the more keywords you the more likely to find relevant products. Include price range and technical description, if relevant, to ensure the query retrieves detailed product information and relevant pricing data.


    Mediaworld offers the latest models of smartphones, laptops, headphones, gaming consoles, video games, and home/kitchen appliances. If a user requests something outside the catalog, politely explain why it can't be fulfilled. For inappropriate or competitor-related queries, clarify that assistance is limited to Mediaworld products.

    Provide recommendations under 500 characters in the user's language, focusing on features, not prices. Suggest only catalog items, avoid unnecessary details, and respond clearly.
    In your responses, avoid using bullet points. Write in a natural, descriptive style. Do not mention variants of a model, as it's uncertain if all are covered in the Mediaworld catalog. Focus on distinct models that meet the user's needs found on your research if you decided to research in the catalog.

    If nothing matches the query, politely suggest trying a different search.

    ### Examples of good suggestions ###
    - The user asks for a smartphone for photography raccomendation:
    "I recommend the new iPhone 15, featuring a 6.1-inch Super Retina XDR OLED display, A16 Bionic processor, 6 GB of RAM, and up to 512 GB of internal storage. It's perfect for gaming and photography, with a 48 MP main camera and robust battery life. ![image](image_url) [Scopri di più](https://www.mediaworld.it/...)"
    - The user asks for an iPhone:
    "I recommend the iPhone 15 Pro Max, the latest flagship model from Apple. It features a 6.7-inch Super Retina XDR display, A16 Bionic chip, 6 GB of RAM, and up to 1 TB of storage. With a 48 MP camera, 5G support, and a long-lasting battery, it's perfect for users seeking top-tier performance and features. ![image](image_url) [Scopri di più](https://www.mediaworld.it/...) In case you are looking for a more affordable option, the iPhone 15 is also a great choice. [Scopri di più](https://www.mediaworld.it/...)"
    - The user asks for a asciugacapelli:
    "I recommend the Dyson Supersonic, a premium hair dryer that combines powerful airflow with intelligent heat control for fast drying and styling. It features a digital motor, magnetic attachments, and a sleek design that reduces frizz and enhances shine. ![image](image_url) [Scopri di più](https://www.mediaworld.it/...) For a more budget-friendly option, consider the Remington Pro-Air Turbo. [Scopri di più](https://www.mediaworld.it/...)"

    Remember, your goal is to provide knowledgeable service to help customers find the ideal electronics for their needs and budget, ensuring a positive shopping experience. Remember that you work for Mediaworld and can only provide information on products available in the catalog, you will not be able to provide information on products not available in the catalog or from competitors.

    Current date and time: ${currentDate}
    `,
    messages: processedMessages,
    tools: getTools({
      uiStream,
      fullResponse
    }),
    onFinish: async event => {
      finishReason = event.finishReason
      fullResponse = event.text
      streambleAnswer.done()
    }
  }).catch(err => {
    hasError = true
    fullResponse = 'Error: ' + err.message
    streamableText.update(fullResponse)
  })

  // If the result is not available, return an error response
  if (!result) {
    return { result, fullResponse, hasError, toolResponses: [] }
  }

  const hasToolResult = messages.some(message => message.role === 'tool')
  if (!useAnthropicProvider || hasToolResult) {
    uiStream.append(answerSection)
  }

  // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          fullResponse += delta.textDelta
          if (useAnthropicProvider && !hasToolResult) {
            streamableText.update(fullResponse)
          } else {
            streambleAnswer.update(fullResponse)
          }
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        if (!delta.result) {
          hasError = true
        }
        toolResponses.push(delta)
        break
      case 'error':
        console.log('Error: ' + delta.error)
        hasError = true
        fullResponse += `\nError occurred while executing the tool`
        break
    }
  }

  cleanResponse(fullResponse)
  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    // Add tool responses to the messages
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses, finishReason }
}

export function cleanResponse(response: string): string {
  // A support function responsible for cleaning the response, it can be customized based on the response structure to solve common AI typos
  // remove "inquiry: " from the response
  response = response.replace(/inquiry: /g, '')
  // remove any links markdown format from the response
  // response = response.replace(/\[.*?\]\(.*?\)/g, '')

  // if it finds a link in the response check if it is a link to a product of MediaWorld, if yes we add the utm parameters otherway we remove
  response = response.replace(/\[.*?\]\(.*?\)/g, (match) => {
    if (match.includes('mediaworld')) {
      return match
    } else {
      return ''
    }
  })

  // remove price in euro from the response (e.g. Prezzo: €1399.99.)
  response = response.replace(/Prezzo: €\d+\.\d+\./g, '')
  // remove price in euro from the response (e.g. Prezzo: €1399.99)
  response = response.replace(/Prezzo: €\d+\.\d+/g, '')

  return response
}