import {
    boolean,
    index,
    integer,
    serial,
    real,
    pgTable,
    text,
    vector,
  } from 'drizzle-orm/pg-core'

  export const products = pgTable(
    'products',
    {
      id: serial('id')
        .primaryKey()
        .notNull(),
      title: text('title').notNull(),
      brand: text('brand').notNull(),
      availability: text('availability').notNull(),
      price: real('price').notNull(),
      online_recommended_retail_price: real('online_recommended_retail_price'),
      online_strike_price: real('online_strike_price'),
      breadcrumb_all: text('breadcrumb_all'),
      description: text('description'),
      gtin: text('gtin'),
      mpn: text('mpn'),
      size: text('size'),
      color: text('color'),
      link: text('link').notNull(),
      image_link: text('image_link').notNull(),
      product_specification: text('product_specification'),
      energy_efficiency_class: text('energy_efficiency_class'),
      shipping_costs: real('shipping_costs'),
      total_availability: integer('total_availability'),
      delivery_time_indicator: text('delivery_time_indicator'),
      marketing_text: text('marketing_text'),
      image_link_additional: text('image_link_additional'),
      transport_advice: text('transport_advice'),
      recommendation_score: real('recommendation_score'),
      recommendation_number: integer('recommendation_number'),
      list_of_other_services: text('list_of_other_services'),
      list_of_accessory_bundle: text('list_of_accessory_bundle'),
      item_group_id: text('item_group_id'),
      embedding: vector('embedding', { dimensions: 1536 }),
    },
    (table) => ({
      embeddingIndex: index().using(
        'hnsw',
        table.embedding.op('vector_cosine_ops')
      ),
    })
  )
  
  export type SelectProducts = typeof products.$inferSelect