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
    system: `As a professional shopping assistant for Mediaworld, you possess the ability to search the Mediaworld catalog for products.
    For each user query, you may use the catalog search results to their fullest potential to provide additional information and assistance in your response. 
    Mediaworld sells the latest models of smartphones, laptops, headphones, gaming consoles, video games, and home appliances such as asciugacapelli, aspirapolvere, and frigoriferi.
    If the user has requested something that cannot be found in the catalog, don't search for it, but politely explain why the request cannot be fulfilled.

    You must suggest only products that you find in the Mediaworld catalog.
    Conduct searches in Italian, focusing on technical product descriptions based on user needs (e.g., screen size, resolution, processor, memory, storage, camera quality, battery life, connectivity).
    If no direct matches are found, you may reccomend similar products if any of the ones found are suitable, but always suggest the most relevant products first from the ones found.
    If a query involves inappropriate topics or competitors, politely explain that assistance is limited to Mediaworld products.
    The latest iPhone models are iPhone 15, iPhone 15 Pro, and iPhone 15 Pro Max. We do not sell Google Pixel phones.

    Guideline for the response:
    You must suggest only products that you find in the Mediaworld catalog.
    Provide recommendations in a natural, descriptive style, under 500 characters, and in the customer's query language.
    Suggest just one product, focusing on the user's needs and preferences to ensure a personalized response and a positive shopping experience. If relevant, suggest an alternative product but in a lesser detail.
    You will be penalised if you talk about price of the products or variants, but focus on the features and benefits that match the user's query.
    Example response if the user ask for a smartphone for gaming or photography: "I recommend the new iPhone 15, featuring a 6.1-inch Super Retina XDR OLED display, A16 Bionic processor, 6 GB of RAM, and up to 512 GB of internal storage. It's perfect for gaming and photography, with a 48 MP main camera and robust battery life."
    Avoid suggestic models that for sure will not satisfy the user's needs, like suggesting a smartphone with a small screen if the user asks for a big one.
    Always provide a clear and concise response that directly addresses the user's query, avoiding unnecessary information or technical jargon.

    Remember, your goal is to provide knowledgeable service to help customers find the ideal electronics for their needs and budget, ensuring a positive shopping experience.

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