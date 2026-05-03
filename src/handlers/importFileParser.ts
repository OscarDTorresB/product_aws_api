import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    S3Client,
} from '@aws-sdk/client-s3'
import { S3Handler } from 'aws-lambda'
import { Readable } from 'stream'
import csv from 'csv-parser'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { ProductWithStock } from '../types/schemas'

const s3Client = new S3Client()
const sqsClient = new SQSClient()

interface ObjectLocation {
    bucket: string
    key: string
}

const moveFile = async (origin: ObjectLocation, dest: ObjectLocation) => {
    if (origin.key === dest.key) {
        throw new Error(
            'Moving file interrupted: destination and origin paths are equal',
        )
    }

    try {
        // Copy file to new directory
        await s3Client.send(
            new CopyObjectCommand({
                CopySource: `${origin.bucket}/${origin.key}`,
                Bucket: dest.bucket,
                Key: dest.key,
            }),
        )

        // Delete original file
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: origin.bucket,
                Key: origin.key,
            }),
        )
        console.log(
            `File moved from 's3://${origin.bucket}/${origin.key}' to 's3://${dest.bucket}/${dest.key}'`,
        )
    } catch (error) {
        console.error('Error moving file: ', error)
        throw error
    }
}

const sendRecordToSqs = async (record: Partial<ProductWithStock>) => {
    try {
        console.log('Sending SQS message')

        if (!record || !record.title || !record.price || !record.count) {
            throw new Error(
                "Record to send doesn't have the required product properties",
            )
        }

        const data = await sqsClient.send(
            new SendMessageCommand({
                MessageBody: JSON.stringify(record),
                QueueUrl: process.env.SQS_URL,
                MessageGroupId: 'import-file-parser',
                MessageDeduplicationId:
                    `title:${record.title}-price:${record.price}`.replaceAll(
                        ' ',
                        '_',
                    ),
            }),
        )
        console.log(`Message sent to SQS, MessageID: ${data.MessageId}`)
    } catch (error) {
        console.error(
            'An error occurred when trying to send SQS message, ',
            error,
        )
    }
}

const streamToSqs = async (key: string, webStream: ReadableStream) => {
    const records: object[] = []

    await new Promise<void>((resolve, reject) => {
        const readStream = Readable.fromWeb(webStream).pipe(csv())

        readStream.once('data', () => {
            console.log(`Read stream, key: ${key}`)
        })

        readStream.on('data', (data) => {
            records.push(data)
        })

        readStream.on('end', () => {
            resolve()
        })
        readStream.on('error', () => {
            reject()
        })
    })

    for (const record of records) {
        await sendRecordToSqs(record)
    }
}

const processFileObject = async (
    origin: ObjectLocation,
    fileObj: GetObjectCommandOutput,
) => {
    if (!fileObj.Body) {
        throw Error("File Object doesn't have a body")
    }

    console.log(`Processing file: s3://${origin.bucket}/${origin.key}`)

    // sends product records to SQS
    await streamToSqs(origin.key, fileObj.Body.transformToWebStream())

    const dest: ObjectLocation = {
        bucket: origin.bucket,
        key: origin.key.replace(
            process.env.UPLOAD_FILES_PREFIX!,
            process.env.PROCESS_FILES_PREFIX!,
        ),
    }

    // Move file to processed folder
    await moveFile(origin, dest)

    console.log(`File processed: s3://${dest.bucket}/${dest.key}`)
}

export const main: S3Handler = async (event) => {
    for (const record of event.Records) {
        const origin: ObjectLocation = {
            bucket: record.s3.bucket.name,
            key: decodeURIComponent(
                record.s3.object.key.replaceAll(/\+/g, ' '),
            ),
        }

        const fileObj = await s3Client.send(
            new GetObjectCommand({
                Bucket: origin.bucket,
                Key: origin.key,
            }),
        )

        try {
            await processFileObject(origin, fileObj)
        } catch (error) {
            console.error(
                `An error occurred trying to process file: s3://${origin.bucket}/${origin.key}`,
            )
            throw error
        }
    }
}
