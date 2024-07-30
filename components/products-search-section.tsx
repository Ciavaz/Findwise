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
import { ShoppingBag, ArrowBigRightDash } from 'lucide-react';
import { ToolBadge } from './tool-badge'
import type { ProductSearchResult } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { json } from 'drizzle-orm/mysql-core'


function titleCase(str: string) {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}



export type ProductsSearchSectionProps = {
  query: string
  productsResults?: StreamableValue<ProductSearchResult[]>
}

export function SearchSection({ query, productsResults }: ProductsSearchSectionProps) {
  const [data, error, pending] = useStreamableValue(productsResults)

  return (
    <div>
      {!pending && data ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="search">{`${query}`}</ToolBadge>
          </Section>

          <Section title="Sources">
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

export function ProductCarousel(
  { productsResults }: { productsResults: ProductSearchResult[] }) {

  return (
    <div className="mt-4">
    <Carousel className="relative">
      <CarouselPrevious />
      <CarouselContent>
        {productsResults.map((product, index) => (
          <CarouselItem key={index}>
            <div className="p-4 bg-white shadow rounded">
              <Image
                src={product.link_image}
                alt={product.title}
                className="object-contain mx-auto mt-4 w-40 h-40"
                width={160}
                height={160}
              />
              <h2 className="text-lg font-bold">{product.title}</h2>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product.description}
              </p>
              <div className="w-full">
                <Link target="_blank" href={product.link ?? ""} passHref>
                  <Button className="text-white w-full bg-red-500 hover:bg-red-600 px-4 py-2 font-bold flex items-center justify-between">
                    <div className="flex items-center" >
                      <ArrowBigRightDash size={16} className="mr-3" />
                      <span>Vai al prodotto</span>
                    </div>
                    <span className="text-white text-base">{product?.price?.toFixed(2)} €</span>
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