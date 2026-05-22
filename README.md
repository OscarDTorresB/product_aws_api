# Welcome to your CDK TypeScript project

### Frontend URL

https://dsnj73sfotids.cloudfront.net

### Backend URLs

#### API Documentation with Postman

https://documenter.getpostman.com/view/21472177/2sBXqFNNjJ

#### List all products -> GET /products

https://d8c4czr6ee.execute-api.us-east-1.amazonaws.com/prod/products

#### Create product -> POST /products

https://d8c4czr6ee.execute-api.us-east-1.amazonaws.com/prod/products

#### Query one product by its ID -> GET /products/{id}

https://d8c4czr6ee.execute-api.us-east-1.amazonaws.com/prod/products/70ea14ee-f9f6-4331-8b97-cb87e315b673

#### Get signed URL for uploading products file -> GET /import?filename={filename}

This endpoints requires Basic Authentication. Credentials are provided internally or you can check the task requirements for more details.

https://sacavh29kd.execute-api.us-east-1.amazonaws.com/prod/import?name=product-file.csv

## Useful commands

- `pnpm run build` compile typescript to js
- `pnpm run watch` watch for changes and compile
- `pnpm run test` perform the jest unit tests
- `pnpm cdk deploy` deploy this stack to your default AWS account/region
- `pnpm cdk diff` compare deployed stack with current state
- `pnpm cdk synth` emits the synthesized CloudFormation template
