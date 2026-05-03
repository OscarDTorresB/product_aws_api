import * as cdk from 'aws-cdk-lib/core'
import { ProductApiStack } from '../lib/product/product-api-stack'
import { ImportApiStack } from '../lib/import/import-api-stack'

const app = new cdk.App()

const productApiStack = new ProductApiStack(app, 'ProductApiStack', {})
const importApiStack = new ImportApiStack(app, 'ImportApiStack', {
    catalogItemsSqs: productApiStack.catalogItemsSqs,
})

importApiStack.addDependency(productApiStack)
