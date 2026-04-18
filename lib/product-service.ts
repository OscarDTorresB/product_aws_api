import { Construct } from "constructs";
import { aws_apigateway, aws_lambda, Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { ALLOWED_ORIGIN } from "../src/cors";

export class ProductService extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id)

        /* Lambda functions */
        const getProductsListLambda = new aws_lambda.Function(
            this,
            "getProductsList",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/getProductsList.main"
            }
        )
        const getProductByIdLambda = new aws_lambda.Function(
            this,
            "getProductById",
            {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset("dist"),
                handler: "handlers/getProductById.main"
            }
        )

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

        /*  Resources */
        const productResource = apiGateway.root.addResource("products");
        const productByIdResource = productResource.addResource("{productId}");

        /* Endpoints */
        productResource.addMethod("GET", getProductsListIntegration)
        productByIdResource.addMethod("GET", getProductByIdIntegration)

        /* CORS */
        productResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, "http://localhost:3000"],
            allowMethods: ["GET"]
        })
        productByIdResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, "http://localhost:3000"],
            allowMethods: ["GET"]
        })
    }
}