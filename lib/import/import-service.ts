import {
    aws_apigateway,
    aws_lambda,
    aws_s3,
    Duration,
    RemovalPolicy,
} from 'aws-cdk-lib'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { HttpMethods } from 'aws-cdk-lib/aws-s3'
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications'
import { Construct } from 'constructs'

export class ImportService extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id)

        /* S3 Bucket */
        const bucket = new aws_s3.Bucket(this, 'ProductsFileBucket', {
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
                    allowedOrigins: [
                        'https://dsnj73sfotids.cloudfront.net',
                        'http://localhost',
                    ],
                    allowedHeaders: [
                        'Content-Type',
                        'X-Amz-Date',
                        'Authorization',
                        'X-Api-Key',
                        'X-Amz-Security-Token',
                        'X-Amz-User-Agent',
                    ],
                },
            ],
        })

        /* Common env variables */
        const COMMON_ENV = {
            BUCKET_NAME: bucket.bucketName,
            UPLOAD_FILES_PREFIX: 'uploaded',
            PROCESS_FILES_PREFIX: 'processed',
        } as const

        /* Lambda functions */
        const makeLambda = (
            id: string,
            description: string,
            handler: string,
        ) => {
            return new aws_lambda.Function(this, id, {
                description,
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset('dist'),
                handler,
                environment: COMMON_ENV,
            })
        }

        const importProductsFileLambda = makeLambda(
            'ImportProductsFileLambda',
            'Generates signed url for files upload',
            'handlers/importProductsFile.main',
        )
        const importFileParserLambda = makeLambda(
            'ImportFileParserLambda',
            'Processes and logs uploaded objects to S3',
            'handlers/importFileParser.main',
        )

        /* API Gateway */
        const restApi = new aws_apigateway.RestApi(this, 'ImportApiGateway', {
            restApiName: 'Import API Gateway',
            description:
                'This API serves lambda functions related to imports of product files',
        })
        const importProductsFileIntegration =
            new aws_apigateway.LambdaIntegration(importProductsFileLambda)

        /* Resources  */
        const importResource = restApi.root.addResource('import')
        importResource.addMethod('GET', importProductsFileIntegration)

        /* Permissions */
        bucket.grants.put(
            importProductsFileLambda,
            `${COMMON_ENV.UPLOAD_FILES_PREFIX}/*`,
        )
        bucket.grants.read(
            importFileParserLambda,
            `${COMMON_ENV.UPLOAD_FILES_PREFIX}/*`,
        )
        bucket.grants.delete(
            importFileParserLambda,
            `${COMMON_ENV.UPLOAD_FILES_PREFIX}/*`,
        )
        bucket.grants.write(
            importFileParserLambda,
            `${COMMON_ENV.PROCESS_FILES_PREFIX}/*`,
        )

        /* S3 Event event propagation */
        bucket.addObjectCreatedNotification(
            new LambdaDestination(importFileParserLambda),
            { prefix: `${COMMON_ENV.UPLOAD_FILES_PREFIX}/`, suffix: '.csv' },
        )
    }
}
