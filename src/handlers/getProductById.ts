import { buildCorsHeaders } from "../cors";
import { DynamoDBClient, GetItemCommand, TransactGetItemsCommand } from "@aws-sdk/client-dynamodb";
import { normalizeDbProduct, normalizeDbStock } from "../utils/normalizers";
import { combineProductAndStock } from "../utils/utilities";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { ProductWithStock } from "../types/schemas";

const dynamoDB = new DynamoDBClient();
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

const searchProduct = async (productId: string): Promise<ProductWithStock | null> => {
    const command = new TransactGetItemsCommand({
        TransactItems: [
            {
                Get: {
                    TableName: productsTableName,
                    Key: { id: { S: productId } }
                }
            },
            {
                Get: {
                    TableName: stockTableName,
                    Key: { product_id: { S: productId } }
                }
            }
        ]
    })

    const result = await dynamoDB.send(command)

    if (!result.Responses) {
        throw new Error("Something happened when trying to fetch product and stock")
    }

    const [dbProduct, dbStock] = result.Responses;
    
    if (!dbProduct.Item) {
        return null
    }

    if (!dbStock.Item) {
        console.warn("No stock was found for the product")
    }

    return combineProductAndStock(
        normalizeDbProduct(dbProduct.Item),
        dbStock.Item ? normalizeDbStock(dbStock.Item) : null
    )
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

    try {
        const productWithStock = await searchProduct(productId)

        return {
            body: JSON.stringify(productWithStock),
            headers: buildCorsHeaders(),
            statusCode: 200
        }
    } catch (error) {
        console.error("Error getting a product by its ID: ", error)
        return {
            body: JSON.stringify("An error has occurred"),
            headers: buildCorsHeaders(),
            statusCode: 500
        }
    }
}