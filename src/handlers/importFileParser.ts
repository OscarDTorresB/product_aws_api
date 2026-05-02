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

const s3Client = new S3Client()

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

const logWebStream = async (key: string, webStream: ReadableStream) => {
    return new Promise<void>((resolve, reject) => {
        const readStream = Readable.fromWeb(webStream).pipe(csv())

        readStream.once('data', () => {
            console.group(`Read stream, key: ${key}`)
        })

        readStream.on('data', (data) => {
            console.log(`[STREAM-RECORD]: `, data)
        })

        readStream.on('end', () => {
            console.groupEnd()
            resolve()
        })
        readStream.on('error', () => {
            console.groupEnd()
            reject()
        })
    })
}

const processFileObject = async (
    origin: ObjectLocation,
    fileObj: GetObjectCommandOutput,
) => {
    if (!fileObj.Body) {
        throw Error("File Object doesn't have a body")
    }

    console.log(`Processing file: s3://${origin.bucket}/${origin.key}`)

    // Logging for CloudWatch
    await logWebStream(origin.key, fileObj.Body.transformToWebStream())

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
