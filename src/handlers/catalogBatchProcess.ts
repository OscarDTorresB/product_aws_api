import { SQSHandler } from 'aws-lambda'
import { createProduct } from './createProduct'
import { ProductWithStock } from '../types/schemas'

export const main: SQSHandler = async (event) => {
    for (const record of event.Records) {
        try {
            console.log(
                'Processing record from SQS for product inclusion. Record: ',
                record,
            )

            if (!record.body) {
                throw new Error('Record body is empty')
            }

            const product = JSON.parse(record.body) as object
            const requiredProperties = ['title', 'price', 'count']

            if (
                requiredProperties.some(
                    (reqProperty) =>
                        !Object.prototype.hasOwnProperty.call(
                            product,
                            reqProperty,
                        ),
                )
            ) {
                throw new Error(
                    'Product record is missing required properties from the product schema',
                )
            }

            console.log(
                `Creating product ${(product as ProductWithStock).title}`,
            )
            const res = await createProduct(product as ProductWithStock)
            console.log(`Product created successfully, productId: ${res.id}`)
        } catch (error) {
            console.log(
                'An error has occurred when trying to process the record.',
                error,
            )
            continue
        }
    }
}
