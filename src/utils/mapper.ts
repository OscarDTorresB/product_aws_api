import type { Product, Stock } from "../types/schemas";

export const mapToDbProduct = (product: Product) => {
    return {
        id: { S: product.id },
        title: { S: product.title },
        description: product.description
            ? { S: product.description }
            : { NULL: true },
        price: { N: String(product.price) },
    }
}

export const mapToDbStock = (stock: Stock) => {
    return {
        product_id: { S: stock.product_id },
        count: { N: String(stock.count) },
    }
}