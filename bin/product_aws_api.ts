import * as cdk from 'aws-cdk-lib/core'
import { ProductApiStack } from '../lib/product/product-api-stack'

const app = new cdk.App()

new ProductApiStack(app, 'ProductApiStack', {})
