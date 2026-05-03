import * as cdk from 'aws-cdk-lib/core'
import { ProductServiceStack } from '../lib/product/product-service-stack'
import { ImportServiceStack } from '../lib/import/import-service-stack'

const app = new cdk.App()

const productApiStack = new ProductServiceStack(app, 'ProductApiStack', {
    prefix: 'ProductService',
})
const importApiStack = new ImportServiceStack(app, 'ImportApiStack', {
    prefix: 'ImportService',
    catalogItemsSqs: productApiStack.catalogItemsSqs,
})

importApiStack.addDependency(productApiStack)
