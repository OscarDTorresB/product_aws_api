import { SQSHandler, SQSRecord } from 'aws-lambda'
import { createProduct } from './createProduct'
import { ProductWithStock } from '../types/schemas'
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'

const sendProductsCreationNotification = async (
    products: ProductWithStock[],
) => {
    try {
        const snsClient = new SNSClient()

        if (!process.env.ITEMS_CREATED_SNS_ARN) {
            throw new Error('Missing SNS arn for sending notification')
        }

        const maxPrice = Math.max(...products.map((p) => p.price))

        const data = await snsClient.send(
            new PublishCommand({
                Message: `${products.length} products has been created: ${products.map((p) => p.title).join(', ')}`,
                TopicArn: process.env.ITEMS_CREATED_SNS_ARN,
                MessageAttributes: {
                    price: {
                        DataType: 'Number',
                        StringValue: String(maxPrice),
                    },
                },
            }),
        )

        console.log(
            `Notification for product creation sent with MessageId: ${data.MessageId}`,
        )
    } catch (error) {
        console.error(
            'An error occurred when trying to send product creation notification: ',
            error,
        )
        throw error
    }
}

const processRecords = async (records: SQSRecord[]) => {
    const productsCreated: ProductWithStock[] = []

    for (const record of records) {
        try {
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

            const productCreated = await createProduct(
                product as ProductWithStock,
            )
            productsCreated.push(productCreated)
            console.log(
                `Product created successfully - (#${productCreated.id}) productTitle: ${productCreated.title}`,
            )
        } catch (error) {
            console.log(
                'An error has occurred when trying to process the record.',
                error,
            )
            continue
        }
    }

    return productsCreated
}

export const main: SQSHandler = async (event) => {
    console.log(`Starting process of ${event.Records.length} records.`)

    const productsCreated = await processRecords(event.Records)

    // Send notifications
    await sendProductsCreationNotification(productsCreated)
}
