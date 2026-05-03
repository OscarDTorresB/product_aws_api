import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { ProductService } from './product-service'
import { aws_sqs } from 'aws-cdk-lib'

export class ProductApiStack extends cdk.Stack {
    public readonly catalogItemsSqs: aws_sqs.Queue

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const service = new ProductService(this, 'product-service')
        this.catalogItemsSqs = service.catalogItemsSqs
    }
}
