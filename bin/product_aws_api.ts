import * as cdk from 'aws-cdk-lib/core'
import { ProductServiceStack } from '../lib/product/product-service-stack'
import { ImportServiceStack } from '../lib/import/import-service-stack'
import { AuthorizerServiceStack } from '../lib/authorizer/authorizer-service-stack'

const app = new cdk.App()

const productServiceStack = new ProductServiceStack(
    app,
    'ProductServiceStack',
    {
        prefix: 'ProductService',
    },
)
const importServiceStack = new ImportServiceStack(app, 'ImportServiceStack', {
    prefix: 'ImportService',
    catalogItemsSqs: productServiceStack.catalogItemsSqs,
})
new AuthorizerServiceStack(app, 'AuthorizerServiceStack', {
    prefix: 'AuthorizerService',
})

importServiceStack.addDependency(productServiceStack)
