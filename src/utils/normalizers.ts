import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { Product, Stock } from "../types/schemas";

export const normalizeDbProduct = (item: Record<string, AttributeValue>): Product => {
    return {
        id: item.id.S!,
        title: item.title.S!,
        price: Number.parseInt(item.price.N!, 10),
        description: item.description.S ?? null
    }
}

export const normalizeDbStock = (item: Record<string, AttributeValue>): Stock => {
    return {
        product_id: item.product_id.S!,
        count: Number.parseInt(item.count.N!, 10)
    }
}