'use client'

import { SearchSkeleton } from './search-skeleton'
import { Section } from './section'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext
} from './ui/Carousel';

import { ToolBadge } from './tool-badge'
import type { ProductSearchResult } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { KeenSliderPlugin } from 'keen-slider/react';
import { LangfuseWeb } from 'langfuse-web'; 
import { json } from 'drizzle-orm/mysql-core'


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

  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    slides: { perView: 1.3, spacing: 5 },
    loop: false,
    breakpoints: {
      "(min-width: 640px)": {
        slides: { perView: 1.6, spacing: 10 },
      },
      "(min-width: 1024px)": {
        slides: { perView: 1.8, spacing: 15 },
      },
      "(min-width: 1280px)": {
        slides: { perView: 2.2, spacing: 20 },
      },
    },
  });

  return (
    <div ref={sliderRef} className="keen-slider my-4">
      {productsResults?.map((product, index) => (
        <div key={index} className="keen-slider__slide flex justify-center py-5">
          <Card className="flex flex-col h-max py-4 bg-white shadow-lg rounded-lg overflow-hidden relative w-80">
            <div className="absolute top-2 left-2 bg-yellow-200 text-yellow-700 text-xs font-semibold uppercase rounded-full px-2.5 py-0.5">
              {product?.label}
            </div>
            <Image
              src={product?.image_link ?? ""}
              alt={product?.name ?? "Mediaworld Product"}
              className="object-contain mx-auto mt-4 w-40 h-40"
              width={160}
              height={160}
            />
            <CardContent className="p-4 flex flex-col items-start">
              <h3 className="text-lg font-bold text-black mb-2">
                {titleCase(product?.name ?? "")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product?.short_description}
              </p>
              <div className="w-full">
                <Link target="_blank" href={product?.buy_link ?? ""} passHref>
                  <Button className="text-white w-full bg-red-500 hover:bg-red-600 px-4 py-2 font-bold flex items-center justify-between" onClick={() => handleClickTracking(1)}>
                    <div className="flex items-center" >
                      <ArrowBigRightDash size={16} className="mr-3" />
                      <span>Vai al prodotto</span>
                    </div>
                    <span className="text-white text-base">{product?.price?.toFixed(2)} €</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}