import { buildCorsHeaders } from "../cors";
import db from "../utils/db";

import type { APIGatewayProxyEvent, Handler } from "aws-lambda";
import type { ProductWithStock } from "../types/schemas";

const searchProduct = async (productId: string): Promise<ProductWithStock | null> => {
    const { rows } = await db.query(
        `SELECT p.id, p.title, p.description, p.price, s.count
        FROM products p
        JOIN stock s ON s.product_id = p.id
        WHERE p.id = $1
        `,
        [productId]
    )

    if (!rows) {
        throw new Error("Something happened when trying to fetch product and stock")
    }

    return rows[0] ?? null
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