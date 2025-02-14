import * as dynamodb from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ITranslateDbObject } from "@sff/shared-types";

export class TranslationTable {
  tableName: string;
  partitionKey: string;
  sortKey: string;
  dynamodbClient: dynamodb.DynamoDBClient;
  constructor({
    tableName,
    partitionKey,
    sortKey,
  }: {
    tableName: string;
    partitionKey: string;
    sortKey: string;
  }) {
    this.tableName = tableName;
    this.partitionKey = partitionKey;
    this.sortKey = sortKey;
    this.dynamodbClient = new dynamodb.DynamoDBClient({});
  }

  async insert(data: ITranslateDbObject) {
    const tableInsertCmd: dynamodb.PutItemCommandInput = {
      TableName: this.tableName,
      Item: marshall(data), // marshal converts tableObj to format suitable for our db
    };

    await this.dynamodbClient.send(new dynamodb.PutItemCommand(tableInsertCmd));
  }

  async query({ username }: { username: string }) {
    const queryCmd: dynamodb.QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: "#PARTITION_KEY = :username",
      ExpressionAttributeNames: {
        "#PARTITION_KEY": "username",
      },
      ExpressionAttributeValues: {
        ":username": { S: username },
      },
      ScanIndexForward: true,
    };

    const { Items } = await this.dynamodbClient.send(
      new dynamodb.QueryCommand(queryCmd)
    );
    if (!Items) {
      return [];
    }

    const rtnData = Items.map((item) => unmarshall(item) as ITranslateDbObject);
    return rtnData;
  }

  async delete({
    username,
    requestId,
  }: {
    username: string;
    requestId: string;
  }) {
    const deleteCmd: dynamodb.DeleteItemCommandInput = {
      TableName: this.tableName,
      Key: {
        [this.partitionKey]: { S: username },
        [this.sortKey]: { S: requestId },
      },
    };

    await this.dynamodbClient.send(new dynamodb.DeleteItemCommand(deleteCmd));
    return this.query({username});
  }

  async getAll() {
    const ScanCmd: dynamodb.ScanCommandInput = {
      TableName: this.tableName,
    };

    const { Items } = await this.dynamodbClient.send(
      new dynamodb.ScanCommand(ScanCmd)
    );

    if (!Items) {
      return [];
    }

    const rtnData = Items.map((item) => unmarshall(item) as ITranslateDbObject);
    return rtnData;
  }
}
