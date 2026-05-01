import { buildCorsHeaders } from '../cors'
import { combineProductAndStock } from '../utils/utilities'
import db from '../utils/db'

import type { APIGatewayProxyEvent, Handler } from 'aws-lambda'
import type { ProductWithStock } from '../types/schemas'

const createProduct = async (product: ProductWithStock) => {
    const dbClient = await db.getClient()

    try {
        await dbClient.query('BEGIN')

        const productRes = await dbClient.query(
            'INSERT INTO products (title, description, price) VALUES ($1, $2, $3) RETURNING *',
            [product.title, product.description, product.price],
        )
        const stockRes = await dbClient.query(
            'INSERT INTO stock (product_id, count) VALUES ($1, $2) RETURNING *',
            [productRes.rows[0].id, product.count],
        )

        await dbClient.query('COMMIT')

        return combineProductAndStock(productRes.rows[0], stockRes.rows[0])
    } catch (error) {
        console.error(
            'An error occurred when trying to create a product: ',
            error,
        )
        await dbClient.query('ROLLBACK')
        throw error
    } finally {
        dbClient.release()
    }
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    if (!event.body) {
        return {
            body: 'Body must be provided to create a product',
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    const { product: bodyProduct } = JSON.parse(event.body)

    if (!bodyProduct) {
        return {
            body: 'A product must be provided in the body',
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    if (!bodyProduct.title || !bodyProduct.price || !bodyProduct.count) {
        return {
            body: "Product to create doesn't meet the required schema",
            statusCode: 400,
            headers: buildCorsHeaders(),
        }
    }

    try {
        const productCreated = await createProduct(bodyProduct)

        return {
            body: JSON.stringify(productCreated),
            statusCode: 200,
            headers: buildCorsHeaders(),
        }
    } catch (error) {
        console.error('Error when creating product: ', error)

        return {
            body: 'An error occurred when creating the product',
            statusCode: 500,
            headers: buildCorsHeaders(),
        }
    }
}
