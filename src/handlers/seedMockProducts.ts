import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";

interface MockProduct {
    id: string;
    title: string;
    description?: string;
    price: number;
}

const mockData: MockProduct[] = [
    {
        id: "b0593931-af98-44cb-b2f8-76e0fc24155b",
        title: "MacBook Pro M5",
        description: "The new MacBook Pro with the enhanced M5 chip",
        price: 2000,
    },
    {
        id: "4e3ff674-f41d-4754-9ce9-0cc2dffdc1a4",
        title: "Apple Watch",
        description: "Track your vital signals with the new Apple Watch",
        price: 250,
    },
    {
        id: "70ea14ee-f9f6-4331-8b97-cb87e315b673",
        title: "iPhone 18 Pro Max",
        price: 600,
    },
    {
        id: "05b2cb7c-f286-4043-bad0-2663fac12b4f",
        title: "iPhone 18",
        price: 500,
    },
    {
        id: "bdf466e8-10cc-4f3b-ab25-062c20a87813",
        title: "Apple TV",
        description: "Enjoy TV again by using our renewed Apple TV",
        price: 200,
    },
]

const dynamoDB = new DynamoDBClient();
const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event) => {
    try {
        let consumedWCU = 0;
        for (const mockProduct of mockData) {
            const productCommand = new PutItemCommand({
                TableName: productsTableName,
                Item: {
                    id: { S: mockProduct.id },
                    title: { S: mockProduct.title },
                    description: mockProduct.description
                        ? { S: mockProduct.description }
                        : { NULL: true },
                    price: { N: String(mockProduct.price) },
                }
            });
            const stockCommand = new PutItemCommand({
                TableName: stockTableName,
                Item: {
                    product_id: { S: mockProduct.id },
                    count: { N: String(10) },
                }
            })
            
            const productResult = await dynamoDB.send(productCommand)
            const mockResult = await dynamoDB.send(stockCommand)

            consumedWCU += productResult.ConsumedCapacity?.WriteCapacityUnits || 0
            consumedWCU += mockResult.ConsumedCapacity?.WriteCapacityUnits || 0
        };

        console.log(`Seed succeed - WCU: ${consumedWCU}`);
    } catch (error) {
        console.error("Error: ", error);
        throw new Error("Error seeding items to DynamoDB")
    }
}