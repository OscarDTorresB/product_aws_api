import { buildCorsHeaders } from "../cors";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { normalizeDbProduct, normalizeDbStock } from "../utils/normalizers";
import { combineProductAndStock } from "../utils/utilities";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { Product, Stock } from "../types/schemas";

const dynamoDB = new DynamoDBClient();
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

const searchStock = async (productId: string): Promise<Stock | null> => {
    const command = new GetItemCommand({
        TableName: stockTableName,
        Key: {
            product_id: { S: productId }
        }
    })
    const result = await dynamoDB.send(command)

    return result.Item ? normalizeDbStock(result.Item) : null;
}

const searchProduct = async (productId: string): Promise<Product | null> => {
    const command = new GetItemCommand({
        TableName: productsTableName,
        Key: {
            id: { S: productId }
        },
    })
    const result = await dynamoDB.send(command)

    return result.Item ? normalizeDbProduct(result.Item) : null;
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    const productId = event.pathParameters?.productId ?? "";

    if (!productId) {
        return {
            body: "Product ID is needed",
            headers: buildCorsHeaders(),
            statusCode: 400,
        }
    }

    const product = await searchProduct(productId)

    if (!product) {
        return {
            body: null,
            headers: buildCorsHeaders(),
            statusCode: 200,
        }
    }

    const stock = await searchStock(productId)
    const productWithStock = combineProductAndStock(product, stock)

    return {
        body: JSON.stringify(productWithStock),
        headers: buildCorsHeaders(),
        statusCode: 200
    }
}