import type { Product, ProductWithStock, Stock } from "../types/schemas"

export const combineProductAndStock = (product: Product, stock: Stock | null): ProductWithStock => {
    return {
        ...product,
        count: stock?.count ?? 0,
    }
}