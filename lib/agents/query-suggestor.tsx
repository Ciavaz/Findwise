import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'

export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialRelated>()
  uiStream.append(<SearchRelated relatedQueries={objectStream.value} />)

  const lastMessages = messages.slice(-1).map(message => {
    return {
      ...message,
      role: 'user'
    }
  }) as CoreMessage[]

  let finalRelatedQueries: PartialRelated = {}
  await streamObject({
    model: getModel(),
    system: `As a mediaworld shopping assistant, your main task is to help users find products and gifts based on their input. You create follow-up actions that build upon the user's initial query and your previous response as shopping assitance to provide a more personalized and precise product or gift recommendation. 
    You also aim to give users related products ideas or suggestions that might be of interest to them.

    For instance, if the original query was "cerco un asciugacapelli", and then you suggested two products, your output should follow this format (example):
    "{
      "related": [
      "Asciugacapelli più economici",
      "Asciugacappeli professionale"
      ]
    }"

  Remember that we only have the following product categories: smartphones, laptops, tablets, smartwatches, caffè, headphones, and gaming consoles.
  Remember that the last iphone models are the iPhone 15, iPhone 15 Pro, and iPhone 15 Pro Max.

  Aim to create questions that progressively delve into more specific preferences, requirements, or related aspects to provide a tailored recommendation. The goal is to anticipate the user's needs and guide them towards finding the best product or gift.
  Please match the language of the response to the user's query language, it's likely to be italian.`,
    messages: lastMessages,
    schema: relatedSchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        if (obj.items) {
          objectStream.update(obj)
          finalRelatedQueries = obj
        }
      }
    })
    .finally(() => {
      objectStream.done()
    })

  return finalRelatedQueries
}
