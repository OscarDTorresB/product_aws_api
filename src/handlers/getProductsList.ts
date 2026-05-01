import type { APIGatewayProxyEvent } from "aws-lambda";
import { buildCorsHeaders } from "../cors";
import products from "../mock_data/mock_products.json";

export const main = async (event: APIGatewayProxyEvent) => {
    const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin;

    return {
        body: JSON.stringify(products),
        statusCode: 200,
        headers: buildCorsHeaders({ reqOrigin: requestOrigin })
    }
}