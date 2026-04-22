import { buildCorsHeaders } from "../cors";
import { DynamoDBClient, PutItemCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { mapToDbProduct, mapToDbStock } from "../utils/mapper";
import { combineProductAndStock } from "../utils/utilities";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { Product, Stock } from "../types/schemas";

const dynamoDB = new DynamoDBClient()
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

const createProduct = async (product: Product, stock: Stock) => {
    const createCommand = new TransactWriteItemsCommand({
        TransactItems: [
            { Put: { TableName: productsTableName, Item: mapToDbProduct(product) } },
            { Put: { TableName: stockTableName, Item: mapToDbStock(stock) } },
        ]
    })
    const result = await dynamoDB.send(createCommand)

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
        const stock: Stock = { product_id: product.id, count: product.count };
        const { product: productCreated } = await createProduct(product, stock)

        return {
            body: JSON.stringify(combineProductAndStock(productCreated, stock)),
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