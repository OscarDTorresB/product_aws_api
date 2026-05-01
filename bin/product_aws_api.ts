import * as cdk from 'aws-cdk-lib/core';
import { ProductAwsApiStack } from '../lib/product/product-api-stack';

const app = new cdk.App();

new ProductAwsApiStack(app, 'ProductAwsApiStack', {});
