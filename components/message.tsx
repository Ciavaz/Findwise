'use client'

import { MemoizedReactMarkdown } from './ui/markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import rehypeRaw from 'rehype-raw';



export function BotMessage({ content }: { content: string }) {
  // Check if the content contains LaTeX patterns
  const containsLaTeX = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/.test(
    content || ''
  )

  // Modify the content to render LaTeX equations if LaTeX patterns are found
  const processedData = preprocessLaTeX(content || '')

  // Process content to handle links and CTA buttons
  const processedContent = processLinksAndButtons(processedData || '')

  if (containsLaTeX) {
    return (
      <MemoizedReactMarkdown
        rehypePlugins={[
          [rehypeExternalLinks, { target: '_blank' }],
          rehypeKatex,
          rehypeRaw
        ]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
      >
        {processedContent}
      </MemoizedReactMarkdown>
    )
  }

  return (
    <MemoizedReactMarkdown
      rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }], rehypeRaw ]}
      remarkPlugins={[remarkGfm]}
      className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
    >
      {processedContent}
    </MemoizedReactMarkdown>
  )
}

// Preprocess LaTeX equations to be rendered by KaTeX
// ref: https://github.com/remarkjs/react-markdown/issues/785
const preprocessLaTeX = (content: string) => {
  const blockProcessedContent = content.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, equation) => `$$${equation}$$`
  )
  const inlineProcessedContent = blockProcessedContent.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_, equation) => `$${equation}$`
  )
  return inlineProcessedContent
}

// Process content to add UTM parameters and create CTA buttons
const processLinksAndButtons = (content: string) => {
  // Add UTM parameters to all links
  const addUTMParameters = (url: string) => {
    const urlObj = new URL(url)
    urlObj.searchParams.set('utm_source', 'ai_sales_assistant')
    urlObj.searchParams.set('utm_medium', 'bot_message')
    return urlObj.toString()
  }

  // Convert specific link to CTA button
  const convertToCTAButton = (url: string, text: string = 'Vai al prodotto') => {
    return `<a href="${url}" target="_blank" className="flex items-center justify-center px-6 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-700 transition-colors duration-300">
    <svg className="w-6 h-6 text-white mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
    </svg>
      <span className="text-white">${text}</span>
    </a>`;
  };

  // Regex to find all links
  const linkRegex = /\[(.*?)\]\((.*?)\)/g
  let match
  let updatedContent = content

  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, linkText, url] = match
    const updatedURL = addUTMParameters(url)

    // Check if the link is a CTA link
    if (url.includes('product')) {
      const ctaButton = convertToCTAButton(updatedURL)
      updatedContent = updatedContent.replace(fullMatch, ctaButton)
    } else {
      const updatedLink = `[${linkText}](${updatedURL})`
      updatedContent = updatedContent.replace(fullMatch, updatedLink)
    }
  }

  return updatedContent
}
