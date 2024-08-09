'use client'

import { SearchSkeleton } from './search-skeleton'
import { Section } from './section'
import * as React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext
} from './ui/carousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowBigRightDash } from 'lucide-react';
import type { ProductSearchResult } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'

function titleCase(str: string) {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export type ProductsSearchSectionProps = {
  query?: string
  productsResults?: StreamableValue<ProductSearchResult[]>
}
  

export function ProductSearchSection({ query, productsResults }: ProductsSearchSectionProps) {
  const [data, error, pending] = useStreamableValue(productsResults)

  return (
    <div>
      {!pending && data ? (
        <>
          <Section title="Prodotti Per Te">
            <ProductCarousel productsResults={data} />

          </Section>
        </>
      ) : (
        <Section className="pt-2 pb-0">
          <SearchSkeleton />
        </Section>
      )}
    </div>
  )
}

import { EmblaOptionsType } from 'embla-carousel'

export function getLabelFromMarketingText(marketingText: string | null, category: string) {
  // if marketing text is not null, return the first part of the string
  // It is customised for the Mediaworld API
  // If the marketing text is null, return the category
  if (marketingText) {
    if (marketingText.includes(':')) {
      marketingText = marketingText.split(':')[0]
    }

    if (marketingText.includes('----')) {
      marketingText = marketingText.split('----')[0]
    }
    return marketingText.toUpperCase()
  }
  else {
    if(category) {
      return category.toUpperCase()
    }
    else {
      return "Consigliato"
    }
  }

  }

export function ProductCarousel(
  { productsResults }: { productsResults: ProductSearchResult[] }) {
  
    const OPTIONS: EmblaOptionsType = {
      align: 'start',
      dragFree: true,
      loop: true,
      slidesToScroll: 'auto'
    }
  
  // check if it is an array to prevent errors.
  if (!Array.isArray(productsResults)) {
    return null
  }

  return (
    <div className="mt-4">
    <Carousel className="relative" opts={OPTIONS}>
      <CarouselPrevious />
      <CarouselContent className='w-60'>
        {productsResults.map((product, index) => (
          <CarouselItem key={index} className='mr-4'>
            <div className="p-5 bg-white rounded-sm border border-gray-300">
            <div className="border rounded-full	 border-red-500 bg-white text-gray-700 text-xs font-semibold p-1 w-fit  text-[10px]">
              <span className='line-clamp-1'>{getLabelFromMarketingText(product.marketing_text , product.category)}</span>
            </div>

              <Image
                src={product.link_image}
                alt={product.title}
                className="object-contain mx-auto mt-4 mb-4 w-60 h-70"
                width={160}
                height={160}
              />
              <h2 className="text font-bold text-black mb-4 line-clamp-2">{product.title}</h2>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {product.description?.slice(0, 100)}
              </p>
              <div className="w-full">
              <span className="text-red-700 text-lg mt-4">{product?.price?.toFixed(2)} €</span>
                <Link target="_blank" href={product.link + "?utm=shopping_assistant" ?? ""} passHref>
                  <Button className="text-neutral-50 w-full rounded-md bg-red-500 hover:bg-red-700 px-4 py mt-4 font-bold flex items-center justify-between">
                    <div className="flex items-center" >
                      <ArrowBigRightDash size={22} className="mr-3" />
                      <span>Vai al prodotto</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselNext />
    </Carousel>
  </div>
  );
}