import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { ProductService } from './product-service'

export class ProductApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        new ProductService(this, 'product-service')
    }
}
