import type { AttributeValue } from "@aws-sdk/client-dynamodb"
import type { Product, ProductWithStock, Stock } from "../types/schemas"

export const combineProductAndStock = (product: Product, stock: Stock | null): ProductWithStock => {
    return {
        ...product,
        count: stock?.count ?? 0,
    }
}

export const isDbProductInstance = (item: Record<string, AttributeValue>): boolean => {
    /* Check for required properties that belongs to product's schema */
    return Object.hasOwn(item, 'id') && Object.hasOwn(item, 'title') && Object.hasOwn(item, 'price')
}