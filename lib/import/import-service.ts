import {
    aws_apigateway,
    aws_lambda,
    aws_s3,
    Duration,
    RemovalPolicy,
} from 'aws-cdk-lib'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { HttpMethods } from 'aws-cdk-lib/aws-s3'
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

        /* Lambda functions */
        const importProductsFileLambda = new aws_lambda.Function(
            this,
            'ImportProductsFileLambda',
            {
                description: 'Generates signed url for files upload',
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset('dist'),
                handler: 'handlers/importProductsFile.main',
                environment: {
                    BUCKET_NAME: bucket.bucketName,
                },
            },
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
        bucket.grantPut(importProductsFileLambda)
    }
}
