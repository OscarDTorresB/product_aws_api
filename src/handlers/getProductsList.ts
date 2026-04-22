import { buildCorsHeaders } from "../cors";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { normalizeDbProduct, normalizeDbStock } from "../utils/normalizers";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { Product, ProductWithStock, Stock } from "../types/schemas";

const dynamoDB = new DynamoDBClient();
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

const getAllProducts = async (): Promise<Product[]> => {
    const getProductsCommand = new ScanCommand({
        TableName: productsTableName,
    })
    const result = await dynamoDB.send(getProductsCommand)

    if (!result.Items?.length) {
        throw new Error("An error occurred when fetching all products")
    }

    return result.Items.map<Product>(normalizeDbProduct)
}

const getAllStocks = async (): Promise<Stock[]> => {
    const getStockCommand = new ScanCommand({
        TableName: stockTableName,
    })
    const result = await dynamoDB.send(getStockCommand)

    if (!result.Items?.length) {
        throw new Error("An error occurred when fetching all product stocks")
    }

    return result.Items.map<Stock>(normalizeDbStock)
}

const mergeProductsAndStocks = (products: Product[], stocks: Stock[]): ProductWithStock[] => {
    return products.map((product) => ({
        ...product,
        count: stocks.find((s) => s.product_id === product.id)?.count ?? 0
    }))
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin;

    try {
        const products = await getAllProducts()
        const stocks = await getAllStocks()
        const mergedProducts = mergeProductsAndStocks(products, stocks)

        return {
            body: JSON.stringify(mergedProducts),
            statusCode: 200,
            headers: buildCorsHeaders({ reqOrigin: requestOrigin })
        }
    } catch (error) {
        console.error('Error: ', error);
        return {
            body: "An error has occurred, please contact Oscar xd",
            statusCode: 500,
            headers: buildCorsHeaders({ reqOrigin: requestOrigin })
        }
    }
}