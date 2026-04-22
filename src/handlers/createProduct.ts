import { buildCorsHeaders } from "../cors";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { mapToDbProduct, mapToDbStock } from "../utils/mapper";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { Product, Stock } from "../types/schemas";
import { combineProductAndStock } from "../utils/utilities";

const dynamoDB = new DynamoDBClient()
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

const createProductStock = async (productId: string, count: number) => {
    const stock: Stock = {
        product_id: productId,
        count,
    }
    const command = new PutItemCommand({
        TableName: stockTableName,
        Item: mapToDbStock(stock),
    })
    const result = await dynamoDB.send(command)

    return { stock, result }
}

const createProduct = async (product: Product) => {
    const command = new PutItemCommand({
        TableName: productsTableName,
        Item: mapToDbProduct(product),
    })
    const result = await dynamoDB.send(command)

    return { product, result }
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    if (!event.body) {
        return {
            body: "Body must be provided to create a product",
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    const { product } = JSON.parse(event.body);

    if (!product) {
        return {
            body: "A product must be provided in the body",
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    if (!product.id || !product.title || !product.price || !product.count) {
        return {
            body: "Product to create doesn't meet the required schema",
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    try {
        const { product: productCreated } = await createProduct(product)
        const { stock: stockCreated } = await createProductStock(productCreated.id, product.count)
        const productWithStock = combineProductAndStock(productCreated, stockCreated)

        return {
            body: JSON.stringify(productWithStock),
            statusCode: 200,
            headers: buildCorsHeaders(),
        }
    } catch (error) {
        console.error("Error when creating product: ", error)

        return {
            body: "An error occurred when creating the product",
            statusCode: 500,
            headers: buildCorsHeaders()
        }
    }
}