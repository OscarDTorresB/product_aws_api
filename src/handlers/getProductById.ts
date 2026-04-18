import type { APIGatewayProxyEvent } from "aws-lambda";
import { buildCorsHeaders } from "../cors";
import products from "../mock_data/mock_products.json";

export const main = (event: APIGatewayProxyEvent) => {
    const productIdStr = event.pathParameters?.productId ?? "";
    const productId = Number.parseInt(productIdStr, 10);

    if (Number.isNaN(productId)) {
        return {
            body: "Product ID is needed",
            headers: buildCorsHeaders(),
            statusCode: 400,
        }
    }

    const product = products.find((product) => product.id === productId);

    return {
        body: JSON.stringify(product),
        headers: buildCorsHeaders(),
        statusCode: 200
    }
}