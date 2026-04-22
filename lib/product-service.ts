import { Construct } from "constructs";
import { aws_apigateway, aws_dynamodb, aws_lambda, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { ALLOWED_ORIGIN } from "../src/cors";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";

const PRODUCTS_TABLE = "Products"
const STOCK_TABLE = "Stock"

export class ProductService extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id)

        /* DynamoDB tables */
        const productsTable = new aws_dynamodb.Table(
            this,
            "Products",
            {
                tableName: PRODUCTS_TABLE,
                partitionKey: {
                    name: "id",
                    type: AttributeType.STRING,
                },
                removalPolicy: RemovalPolicy.DESTROY
            }
        )
        const stockTable = new aws_dynamodb.Table(
            this,
            "Stock",
            {
                tableName: STOCK_TABLE,
                partitionKey: {
                    name: "product_id",
                    type: AttributeType.STRING,
                },
                removalPolicy: RemovalPolicy.DESTROY
            }
        )

        /* Seed lambda function */
        const seedProductsLambda = new aws_lambda.Function(
            this,
            "seedProducts",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/seedMockProducts.main",
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE,
                    STOCK_TABLE_NAME: STOCK_TABLE,
                },
            }
        )

        /* Lambda functions */
        const getProductsListLambda = new aws_lambda.Function(
            this,
            "getProductsList",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/getProductsList.main",
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE,
                    STOCK_TABLE_NAME: STOCK_TABLE,
                },
            }
        )
        const getProductByIdLambda = new aws_lambda.Function(
            this,
            "getProductById",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/getProductById.main",
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE,
                    STOCK_TABLE_NAME: STOCK_TABLE,
                },
            }
        )
        const createProductLambda = new aws_lambda.Function(
            this,
            "createProduct",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/createProduct.main",
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE,
                    STOCK_TABLE_NAME: STOCK_TABLE,
                }
            }
        )

        /* Seed permissions */
        productsTable.grantWriteData(seedProductsLambda)
        stockTable.grantWriteData(seedProductsLambda)

        /* Products lambda permissions (READ) */
        productsTable.grantReadData(getProductsListLambda)
        stockTable.grantReadData(getProductsListLambda)
        productsTable.grantReadData(getProductByIdLambda)
        stockTable.grantReadData(getProductByIdLambda)
        /* Products lambda permissions (WRITE) */
        productsTable.grantWriteData(createProductLambda)
        stockTable.grantWriteData(createProductLambda)

        /* Gateway */
        const apiGateway = new aws_apigateway.RestApi(
            this,
            "products-api",
            {
                restApiName: "Products API Gateway",
                description: "This API serves lambda functions related to products"
            }
        )

        const getProductsListIntegration = new aws_apigateway.LambdaIntegration(getProductsListLambda)
        const getProductByIdIntegration = new aws_apigateway.LambdaIntegration(getProductByIdLambda)
        const createProductIntegration = new aws_apigateway.LambdaIntegration(createProductLambda)

        /*  Resources */
        const productResource = apiGateway.root.addResource("products");
        const productByIdResource = productResource.addResource("{productId}");

        /* Endpoints */
        productResource.addMethod("GET", getProductsListIntegration)
        productResource.addMethod("POST", createProductIntegration)
        productByIdResource.addMethod("GET", getProductByIdIntegration)

        /* CORS */
        productResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, "http://localhost:3000"],
            allowMethods: ["GET", "POST"]
        })
        productByIdResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, "http://localhost:3000"],
            allowMethods: ["GET"]
        })
    }
}