# product_aws_api

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js%2024-0E7C86?style=flat-square&logo=nodedotjs&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS%20CDK%20v2-E0762E?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/Aurora%20PostgreSQL-0E7C86?style=flat-square&logo=postgresql&logoColor=white)

A products CRUD and CSV import API built while learning AWS serverless. It is a hands-on course project, deployed entirely as infrastructure as code with the AWS CDK, and the focus was on wiring real AWS services together rather than shipping a production service.

## What it does

- Serves a products catalog through a REST API: list products, fetch one by id, create a product.
- Accepts CSV product uploads via a pre-signed S3 URL, then parses each row and fans the records out asynchronously.
- Creates products from the queue in batches and sends email notifications based on product price.
- Protects the import endpoint with an HTTP Basic authorizer backed by Secrets Manager.

## Architecture

The project is split into three CDK stacks under `lib/`, wired together in `bin/product_aws_api.ts`.

**Product service** (`lib/product/product-service-stack.ts`)
- API Gateway REST API fronting Lambda functions for the products endpoints.
- Aurora PostgreSQL Serverless v2 cluster running inside a private isolated VPC (no NAT gateways).
- VPC endpoints for S3, Secrets Manager, and SNS so Lambdas reach AWS services without leaving the VPC.
- An SQS FIFO queue that feeds a batch processor Lambda, plus an SNS topic with price-filtered email subscriptions.
- Database credentials generated and stored in Secrets Manager, read at runtime by the Lambdas.

**Import service** (`lib/import/import-service-stack.ts`)
- A versioned S3 bucket with CORS for browser uploads.
- A Lambda that returns a pre-signed PUT URL, and a second Lambda triggered by S3 object-created events that streams the CSV and pushes each row to the shared SQS queue.
- The import endpoint is guarded by a token authorizer that reuses the authorizer Lambda.

**Authorizer service** (`lib/authorizer/authorizer-service-stack.ts`)
- A Basic auth Lambda used as an API Gateway token authorizer. It reads the expected credentials from Secrets Manager.

AWS services provisioned by the CDK code: API Gateway, Lambda, Aurora PostgreSQL (RDS), VPC and VPC endpoints, SQS, SNS, S3, Secrets Manager, IAM, and CloudWatch Logs.

## Tech stack

- TypeScript on Node.js 24 Lambdas
- AWS CDK v2 for all infrastructure
- AWS SDK v3 clients: S3, SQS, SNS, Secrets Manager, plus the S3 request presigner
- `pg` for PostgreSQL access and `csv-parser` for import parsing
- esbuild for bundling, Jest for tests, ESLint and Prettier for linting and formatting
- pnpm as the package manager

## API endpoints

Product service:

| Method | Path               | Description                     |
| ------ | ------------------ | ------------------------------- |
| GET    | `/products`        | List all products with stock    |
| POST   | `/products`        | Create a product                |
| GET    | `/products/{productId}` | Get a single product by id |

Import service:

| Method | Path                  | Description                                        |
| ------ | --------------------- | -------------------------------------------------- |
| GET    | `/import?name={file}` | Get a pre-signed S3 URL to upload a CSV (Basic auth) |

`POST /products` expects a body shaped like `{ "product": { "title", "price", "count", "description?" } }`. Uploading a CSV to the returned URL triggers the parser, which queues each row for the batch processor to insert.

A Postman collection documenting the endpoints is available here: https://documenter.getpostman.com/view/21472177/2sBXqFNNjJ

## Getting started

Install dependencies:

```bash
pnpm install
```

Common scripts (from `package.json`):

```bash
pnpm run build   # bundle the Lambda handlers into dist/ with esbuild
pnpm run watch   # type-check in watch mode
pnpm run test    # run the Jest test suite
pnpm run lint    # lint src/ and lib/
```

### Deploy

The Lambda code is loaded from the `dist/` folder, so build before you deploy.

```bash
pnpm run build
pnpm cdk deploy --all
```

Other CDK commands:

```bash
pnpm cdk diff    # compare deployed stack with current state
pnpm cdk synth   # emit the synthesized CloudFormation template
```

The Basic authorizer reads a Secrets Manager secret named `basic-auth-credentials` with `username` and `password` fields, so create that secret before hitting the import endpoint. The Aurora credentials secret is generated automatically by the CDK. After the first deploy, invoke the seed Lambda to create the `products` and `stock` tables and load sample data.

### Local database

A `docker-compose.yml` is included to run PostgreSQL and pgAdmin locally for development:

```bash
docker compose up
```

## Project structure

```
bin/                     CDK app entry point
lib/
  product/               product service stack (API, Aurora, SQS, SNS, VPC)
  import/                import service stack (S3, parser, pre-signed URLs)
  authorizer/            Basic auth authorizer stack
src/
  handlers/              Lambda handlers
  utils/                 DB pool and helpers
  types/                 shared TypeScript types
  cors.ts                CORS header helpers
test/                    Jest tests
```

## Course context

This was built to practice AWS serverless patterns end to end: API Gateway to Lambda integrations, running Aurora Serverless v2 inside a private VPC, decoupling work with SQS and SNS, handling S3 uploads with pre-signed URLs and event triggers, custom Lambda authorizers, and managing secrets with Secrets Manager. Everything is defined in code with the CDK, which was the part I most wanted to get comfortable with.

## Author

Oscar Torres, Senior Software Engineer.
