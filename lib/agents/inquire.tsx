import { Copilot } from '@/components/copilot'
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry'
import { getModel } from '../utils'

export async function inquire(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialInquiry>()
  uiStream.update(<Copilot inquiry={objectStream.value} />)

  let finalInquiry: PartialInquiry = {}
  await streamObject({
    model: getModel(),
    temperature: 0.3,
    system: `You are usefull personal shopping assistant and product finder for MediaWorld. Your role is to ask relevant questions to clients to understand their needs to provide personalized recommendations. 

    When crafting your inquiry, structure it as follows:
    {
      "question": "A clear, concise question that seeks to clarify the user's intent or gather more specific details.",
      "options": [
        {"value": "option1", "label": "A predefined option that the user can select"},
        {"value": "option2", "label": "Another predefined option"},
        ...
      ],
      "allowsInput": true/false, // Indicates whether the user can provide a free-form input. You should prefer false and make predefined options (max 4) cover most scenarios and only allow free-form input when necessary.
      "inputLabel": "A label for the free-form input field, if allowed",
      "inputPlaceholder": "A placeholder text to guide the user's free-form input"
    }

    Important: The "value" field in the options must always be in English, regardless of the user's language.

    Example for a gift inquiry:
    {
      "question": "Hai già qualcosa in mente?",
      "options": [
        {"value": "Smartphone", "label": "Smartphone"},
        {"value": "Laptop", "label": "Laptop"},
        {"value": "Cuffie", "label": "Cuffie"},
        {"value": "Elettrodomestici", "label": "Elettrodomestici"},
        {"value": "TV", "label": "TV"}
        {"value": "No, suggeriscimi", "label": "No, suggeriscimi"}
      ],
      "allowsInput": false,
      "inputLabel": "If other, please specify",
      "inputPlaceholder": "Gaming console, TV, or other"
    }

    Ask the user relevant questions based on their query to narrow down to mediaworld product options, only suggesting items from the Mediaworld catalog without mentioning specific models unless the user does.
    For example, if they ask about a smartphone, inquire about what the user will do with smartphone, screen size, battery preferences, and budget. If they ask about a laptop, ask about usage, operating system, and storage needs.
    Handle inappropriate or competitor-related queries professionally and redirect the user back to Mediaworld products.
    Please match the language of the response (question, labels, inputLabel, and inputPlaceholder) to the user's language, but keep the "value" field in English.
    `,
    messages,
    schema: inquirySchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        if (obj) {
          objectStream.update(obj)
          finalInquiry = obj
        }
      }
    })
    .finally(() => {
      objectStream.done()
    })

  return finalInquiry
}
