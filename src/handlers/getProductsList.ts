import { buildCorsHeaders } from '../cors'
import db from '../utils/db'
import type { APIGatewayProxyEvent, Handler } from 'aws-lambda'
import type { Product } from '../types/schemas'

const getAllProducts = async (): Promise<Product[]> => {
    const { rows } = await db.query(
        `SELECT p.id, p.title, p.description, p.price, s.count
        FROM products p
        JOIN stock s ON s.product_id = p.id
        `,
    )

    return rows ?? []
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin

    try {
        const products = await getAllProducts()

        return {
            body: JSON.stringify(products),
            statusCode: 200,
            headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
        }
    } catch (error) {
        console.error('Error: ', error)
        return {
            body: 'An error has occurred, please contact Oscar xd',
            statusCode: 500,
            headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
        }
    }
}
