import { Construct } from 'constructs'
import {
    aws_apigateway,
    aws_ec2,
    aws_lambda,
    aws_rds,
    Duration,
    RemovalPolicy,
} from 'aws-cdk-lib'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { ALLOWED_ORIGIN } from '../../src/cors'
import { AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds'
import {
    GatewayVpcEndpointAwsService,
    InterfaceVpcEndpointAwsService,
    Peer,
    Port,
    SubnetType,
} from 'aws-cdk-lib/aws-ec2'

export class ProductService extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id)

        /* Networking */
        const vpc = new aws_ec2.Vpc(this, 'ProductsVPC', {
            vpcName: 'Products VPC',
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'private',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ],
        })

        /* VPC endpoints - Creates net interface for AWS services */
        vpc.addGatewayEndpoint('S3Endpoint', {
            service: GatewayVpcEndpointAwsService.S3,
        })
        vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        })

        /* Security Groups */
        const sgProductsRDS = new aws_ec2.SecurityGroup(this, 'SgProductsRDS', {
            description: 'Security group for RDS Cluster - Products',
            vpc,
            allowAllOutbound: false,
        })
        const sgRDSProxy = new aws_ec2.SecurityGroup(this, 'SgRDSProxy', {
            description: 'Security group for RDS Proxy',
            vpc,
            allowAllOutbound: false,
        })
        const sgProductsLambdas = new aws_ec2.SecurityGroup(
            this,
            'SgProductsLambdas',
            {
                description: 'Security group for Lambda functions',
                vpc,
                allowAllOutbound: true,
            },
        )

        // Lambda can talk to the Proxy
        sgRDSProxy.addIngressRule(
            Peer.securityGroupId(sgProductsLambdas.securityGroupId),
            Port.tcp(5432),
            'Allows RDS proxy ingress from lambda functions',
        )
        sgProductsRDS.addIngressRule(
            Peer.securityGroupId(sgRDSProxy.securityGroupId),
            Port.tcp(5432),
            'Allows RDS ingress from RDS proxy',
        )

        /* Aurora Postgres Cluster */
        const rdsCluster = new aws_rds.DatabaseCluster(this, 'ProductsDB', {
            defaultDatabaseName: 'productsDB',
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [sgProductsRDS],
            engine: aws_rds.DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.VER_17_7,
            }),
            credentials: aws_rds.Credentials.fromGeneratedSecret('postgres', {
                secretName: 'aurora-serverless-credentials',
            }),
            writer: aws_rds.ClusterInstance.serverlessV2('writerInstance'),
            backup: {
                retention: Duration.days(1),
            },
            removalPolicy: RemovalPolicy.DESTROY,
        })

        const rdsProxy = new aws_rds.DatabaseProxy(this, 'ProductsDbProxy', {
            dbProxyName: 'products-db-proxy',
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            proxyTarget: aws_rds.ProxyTarget.fromCluster(rdsCluster),
            secrets: [rdsCluster.secret!],
            securityGroups: [sgRDSProxy],
            requireTLS: true,
        })

        /* Common env variables */
        const commonENV = {
            DB_PROXY_ENDPOINT: rdsProxy.endpoint,
            DB_NAME: 'productsDB',
            DB_SECRET_ARN: rdsCluster.secret!.secretArn,
        }

        const makeLambda = (id: string, handler: string) => {
            return new aws_lambda.Function(this, id, {
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(5),
                code: aws_lambda.Code.fromAsset('dist'),
                handler,
                vpc,
                securityGroups: [sgProductsLambdas],
                environment: commonENV,
            })
        }

        /* Lambda functions */
        const seedProductsLambda = makeLambda(
            'seedProducts',
            'handlers/seedMockProducts.main',
        )
        const getProductsListLambda = makeLambda(
            'getProductsList',
            'handlers/getProductsList.main',
        )
        const getProductByIdLambda = makeLambda(
            'getProductById',
            'handlers/getProductById.main',
        )
        const createProductLambda = makeLambda(
            'createProduct',
            'handlers/createProduct.main',
        )

        const allLambdas = [
            seedProductsLambda,
            getProductsListLambda,
            getProductByIdLambda,
            createProductLambda,
        ]

        /* RDS permissions */
        allLambdas.forEach((lambda) => {
            rdsProxy.grantConnect(lambda, 'postgres')
            rdsCluster.secret!.grantRead(lambda)
        })

        /* Gateway */
        const apiGateway = new aws_apigateway.RestApi(this, 'products-api', {
            restApiName: 'Products API Gateway',
            description: 'This API serves lambda functions related to products',
        })

        const getProductsListIntegration = new aws_apigateway.LambdaIntegration(
            getProductsListLambda,
        )
        const getProductByIdIntegration = new aws_apigateway.LambdaIntegration(
            getProductByIdLambda,
        )
        const createProductIntegration = new aws_apigateway.LambdaIntegration(
            createProductLambda,
        )

        /*  Resources */
        const productResource = apiGateway.root.addResource('products')
        const productByIdResource = productResource.addResource('{productId}')

        /* Endpoints */
        productResource.addMethod('GET', getProductsListIntegration)
        productResource.addMethod('POST', createProductIntegration)
        productByIdResource.addMethod('GET', getProductByIdIntegration)

        /* CORS */
        productResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, 'http://localhost:3000'],
            allowMethods: ['GET', 'POST'],
        })
        productByIdResource.addCorsPreflight({
            allowOrigins: [ALLOWED_ORIGIN, 'http://localhost:3000'],
            allowMethods: ['GET'],
        })
    }
}
