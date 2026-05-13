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
const authorizerServiceStack = new AuthorizerServiceStack(
    app,
    'AuthorizerServiceStack',
    {
        prefix: 'AuthorizerService',
    },
)
const importServiceStack = new ImportServiceStack(app, 'ImportServiceStack', {
    prefix: 'ImportService',
    catalogItemsSqs: productServiceStack.catalogItemsSqs,
    authorizer: authorizerServiceStack.authorizer,
})

importServiceStack.addDependency(productServiceStack)
importServiceStack.addDependency(authorizerServiceStack)
