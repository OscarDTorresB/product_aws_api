import * as cdk from 'aws-cdk-lib/core'
import { ProductServiceStack } from '../lib/product/product-service-stack'
import { ImportServiceStack } from '../lib/import/import-service-stack'

const app = new cdk.App()

new ProductServiceStack(app, 'ProductApiStack', { prefix: 'ProductService' })
new ImportServiceStack(app, 'ImportApiStack', { prefix: 'ImportService' })
