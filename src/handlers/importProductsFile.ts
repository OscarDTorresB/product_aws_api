import { APIGatewayProxyHandler } from 'aws-lambda'
import { buildCorsHeaders } from '../cors'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client()

export const main: APIGatewayProxyHandler = async (event) => {
    const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin

    if (!event.queryStringParameters?.name) {
        return {
            statusCode: 400,
            body: 'A file name must be provided in query parameters',
            headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
        }
    }

    const { name } = event.queryStringParameters
    const filename = decodeURIComponent(name)
    const BUCKET_NAME = process.env.BUCKET_NAME!

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `uploaded/${filename}`,
        ContentType: 'text/csv',
    })
    const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
    })

    return {
        statusCode: 200,
        body: JSON.stringify({ signedUrl }),
        headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
    }
}
