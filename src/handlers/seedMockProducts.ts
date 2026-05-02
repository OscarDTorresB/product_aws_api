import { Handler } from 'aws-lambda'
import db from '../utils/db'
import { buildCorsHeaders } from '../cors'
import type { ProductWithStock } from '../types/schemas'

const mockData: Omit<ProductWithStock, 'id'>[] = [
    {
        title: 'MacBook Pro M5',
        description: 'The new MacBook Pro with the enhanced M5 chip',
        price: 2000,
        count: 15,
    },
    {
        title: 'Apple Watch',
        description: 'Track your vital signals with the new Apple Watch',
        price: 250,
        count: 10,
    },
    {
        title: 'iPhone 18 Pro Max',
        description: null,
        price: 600,
        count: 20,
    },
    {
        title: 'iPhone 18',
        description: null,
        price: 500,
        count: 4,
    },
    {
        title: 'Apple TV',
        description: 'Enjoy TV again by using our renewed Apple TV',
        price: 200,
        count: 0,
    },
]

const upsertTables = async (): Promise<void> => {
    try {
        const createProductsTableQuery = `
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                description TEXT,
                price INT
            )
        `
        const createStockTableQuery = `
            CREATE TABLE IF NOT EXISTS stock (
                count INT,
                product_id UUID UNIQUE,
                CONSTRAINT fk_Product
                    FOREIGN KEY (product_id)
                    REFERENCES products(id)
                    ON DELETE CASCADE
            )
        `

        // Resets DB
        await db.query('DROP TABLE IF EXISTS stock')
        await db.query('DROP TABLE IF EXISTS products')
        await db.query(createProductsTableQuery)
        await db.query(createStockTableQuery)
    } catch (error) {
        console.error('Error trying to upsert tables: ', error)
        throw error
    }
}

const upsertProducts = async () => {
    const successProducts: ProductWithStock[] = []
    let failedProductsCount = 0

    for (const product of mockData) {
        try {
            const { rows } = await db.query(
                `
                WITH new_product AS (
                    INSERT INTO products (title, description, price)
                    VALUES ($1, $2, $3)
                    RETURNING id, title, description, price
                ),
                new_stock AS (
                    INSERT INTO stock (product_id, count)
                    SELECT id, $4
                    FROM new_product
                    ON CONFLICT (product_id) DO NOTHING
                    RETURNING product_id, count
                )
                SELECT p.id, p.title, p.description, p.price, s.count
                FROM new_product p
                LEFT JOIN new_stock s ON s.product_id = p.id
                `,
                [
                    product.title,
                    product.description,
                    product.price,
                    product.count,
                ],
            )

            successProducts.push(rows[0])
        } catch (error) {
            failedProductsCount++
            console.error(
                `An error happened trying to create product: ${product.title}`,
                error,
            )
        }
    }

    return { successProducts, failedProductsCount }
}

export const main: Handler = async () => {
    try {
        console.log('Starting seed')

        await upsertTables()
        console.log('Tables upsert success')

        const res = await upsertProducts()

        if (res.successProducts.length === 0) {
            throw new Error('An error occurred trying to seed the products')
        }

        console.log(
            `Products upsert success, ${res.successProducts.length} products created -- ${res.failedProductsCount} failed`,
        )

        console.log(`Seed succeed`)

        return {
            statusCode: 201,
            body: JSON.stringify(res),
            headers: buildCorsHeaders(),
        }
    } catch (error) {
        console.error('Error: ', error)

        return {
            statusCode: 500,
            body: 'An error has occurred when trying to seed the DB',
            headers: buildCorsHeaders(),
        }
    }
}
