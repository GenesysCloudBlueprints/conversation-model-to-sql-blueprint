---
title: Design a SQL database for storing analytics JSON data
author: ronan.watkins
indextype: blueprint
icon: blueprint
image: images/erdiagram.png
category: 6
summary: |
  This Genesys Cloud Developer Blueprint provides an example of how to design a SQL database for storing JSON data, specifically data from the [POST /api/v2/analytics/conversations/details/query](https://developer.genesys.cloud/api/rest/v2/analytics/ "Opens the Genesys Cloud Analytics API page") endpoint. This blueprint includes a Dockerized PostgreSQL database and a Node.js TypeScript driver.
---
:::{"alert":"primary","title":"About Genesys Cloud Blueprints","autoCollapse":false} 
Genesys Cloud blueprints were built to help you jump-start building an application or integrating with a third-party partner. 
Blueprints are meant to outline how to build and deploy your solutions.
 
For more details on Genesys Cloud blueprint support and practices 
please see our Genesys Cloud blueprint [FAQ](https://developer.genesys.cloud/blueprints/faq)sheet.
:::

This Genesys Cloud Developer Blueprint provides an example of how to design a SQL database for storing JSON data, specifically data from the [POST /api/v2/analytics/conversations/details/query](https://developer.genesys.cloud/api/rest/v2/analytics/ "Opens the Genesys Cloud Analytics API page") endpoint. This blueprint includes a Dockerized PostgreSQL database and a Node.js TypeScript driver.

This blueprint explains how to get the TypeScript driver script running to map conversation responses or other non-flat JSON data to SQL. However, this logic is not limited to TypeScript. You can use the SQL queries with other drivers. To access the SQL queries, see the [db.ts](https://github.com/GenesysCloudBlueprints/conversation-model-to-sql-blueprint/blob/main/src/db.ts "Opens the db.ts file in the conversation-model-to-sql-blueprint repository in GitHub") file in the conversation-model-to-sql-blueprint repository in GitHub.

![Diagram for the design a SQL database to store analytics JSON data solution](images/erdiagram.png "Diagram for the design a SQL database to store analytics JSON data solution")

* [Solution components](#solution-components "Goes to the Solutions components section")
* [Software development kits (SDKs)](#software-development-kits--sdks- "Goes to the Software development kits (SDKs) section")
* [Prerequisites](#prerequisites "Goes to the Prerequisites section")
* [Database design](#database-design "Goes to the Database design section")
* [Implementation steps](#implementation-steps "Goes to the Implementation steps section")
* [Additional resources](#additional-resources "Goes to the Additional resources section")

## Solution components

* **Genesys Cloud** - A suite of Genesys cloud services for enterprise-grade communications, collaboration, and contact center management. You create and manage OAuth clients in Genesys Cloud.
* **PostgreSQL** - An open-source object-relational database system.
* **Docker** - An open-source platform for developing, shipping, and running applications in isolated environments called containers.
* **Docker Compose** - A tool for defining and running multi-container Docker applications.
* **Node.js** - An open-source, cross-platform JavaScript runtime environment.

## Software development kits (SDKs)

* **Genesys Cloud Platform API SDK** - Client libraries used to simplify application integration with Genesys Cloud by handling low-level HTTP requests. In this solution, used to send requests to the `/api/v2/analytics/conversations/details/query` endpoint to obtain data for writing to the database.

## Prerequisites

### Specialized knowledge

* Knowledge of PostgreSQL or any type of SQL
* Experience with TypeScript or JavaScript
* Familiarity with Docker
* Experience using the Genesys Cloud Platform API

### Genesys Cloud account

* A Genesys Cloud license. For more information, see [Genesys Cloud pricing](https://www.genesys.com/pricing "Opens the Genesys Cloud pricing page") on the Genesys website.

### Third-party software

* Docker installed. Recommended version: 19.0.0. For more information, see [Get Docker](https://docs.docker.com/get-docker "Opens the Get Docker page") on the Docker website.
* Docker Compose installed. Recommended version: 1.27.0. For more information, see [Install Docker Compose](https://docs.docker.com/compose/install 'Opens the Install Docker Compose page') on the Docker website.
* Node.js installed. Recommended version: 15.0.0. For more information, see [Node.js](https://nodejs.org/en/ "Opens the Node.js page") on the Node.js website.

## Database design

:::primary
**Note**: The database design used in this solution does not store the full schema from the `POST /api/v2/analytics/conversations/details/query` response; some of the response data was omitted to simplify the design. For the full schema, see the *200 - successful operation* response for `POST /api/v2/analytics/conversations/details/query` in the [Genesys Cloud Analytics API](https://developer.genesys.cloud/api/rest/v2/analytics/ "Opens the Genesys Cloud Analytics API page").
:::

To write nested JSON to a SQL database, the JSON structure must be flattened. This solution flattens the structure by extracting nested objects and saving them to individual object tables. Each object has a primary key (PK) and a foreign key (FK) that references the primary key of the parent object.

If a primary key does not exist in the `segments` and `metrics` object tables, then a primary key is created by combining a foreign key with two other values, for example, session_id_name_value for `metrics`. Arrays of strings, such as `divisionIds` and `requestedRoutings`, are stored in the database as single strings delimited by commas.

The following tables with primary and foreign keys are created to store the conversation data. See the diagram in the introduction for reference.

* `conversations` - PK: conversation_id
* `participants` - PK: participant_id, FK: conversation_id
* `sessions` - PK: session_id, FK: participant_id
* `segments` - PK: segment_id (session_id_segment_start_segment_end), FK: session_id
* `metrics` - PK: metric_id (session_id_name_value), FK: session_id

The following nested JSON object is an example of a `conversation` object that the database can accept.

```{"language":"json"}
{
    "conversationId": "1bc96a39-6725-40c4-9345-db72aa67b8c6",
    "conversationStart": "2021-04-01T12:27:53.386Z",
    "conversationEnd": "2021-04-01T12:43:23.306Z",
    "originatingDirection": "inbound",
    "divisionIds": [
        "1b6b98a6-3d70-47be-9406-61a5aa8cc570"
    ],
    "participants": [
        {
            "participantId": "8d4f84b1-3edb-4d4e-9665-4ae6a0af6147",
            "participantName": "John Doe",
            "purpose": "customer",
            "sessions": [
                {
                    "mediaType": "chat",
                    "sessionId": "4d3a7227-6fdc-4d60-97fe-99db88e00b51",
                    "direction": "inbound",
                    "segments": [
                        {
                            "segmentStart": "2021-04-01T12:27:53.386Z",
                            "segmentEnd": "2021-04-01T12:43:23.303Z",
                            "queueId": "a623d83c-96d7-4baa-af1f-d46ad6700d8b",
                            "disconnectType": "timeout",
                            "segmentType": "interact",
                            "conference": false
                        }
                    ],
                    "metrics": [
                        {
                            "name": "nConnected",
                            "value": 1,
                            "emitDate": "2021-04-01T12:27:53.386Z"
                        }
                    ],
                    "provider": "Webchat Provider",
                    "requestedRoutings": [
                        "Standard"
                    ],
                    "usedRouting": "Standard",
                    "selectedAgentId": "50fcd33c-f432-4726-abc9-979f3ca01555"
                }
            ]
        },
        {
            "participantId": "9791b7b2-8b76-40bb-8e8e-b218aacb3ea4",
            "participantName": "Yuri",
            "purpose": "acd",
            "sessions": [
                {
                    "mediaType": "chat",
                    "sessionId": "6acbee65-80be-4777-be03-8dacd07ee3f9",
                    "direction": "inbound",
                    "peerId": "4d3a7227-6fdc-4d60-97fe-99db88e00b51",
                    "segments": [
                        {
                            "segmentStart": "2021-04-01T12:27:53.388Z",
                            "segmentEnd": "2021-04-01T12:28:04.567Z",
                            "queueId": "a623d83c-96d7-4baa-af1f-d46ad6700d8b",
                            "disconnectType": "transfer",
                            "segmentType": "interact",
                            "conference": false
                        }
                    ],
                    "metrics": [
                        {
                            "name": "nOffered",
                            "value": 1,
                            "emitDate": "2021-04-01T12:27:53.388Z"
                        },
                        {
                            "name": "tAcd",
                            "value": 11179,
                            "emitDate": "2021-04-01T12:28:04.567Z"
                        }
                    ],
                    "provider": "Webchat Provider",
                    "remote": "John Doe",
                    "requestedRoutings": [
                        "Standard"
                    ],
                    "selectedAgentId": "50fcd33c-f432-4726-abc9-979f3ca01555"
                }
            ]
        },
        {
            "participantId": "ce60611f-07c6-4d57-9539-b8b26abe9f3a",
            "userId": "50fcd33c-f432-4726-abc9-979f3ca01555",
            "purpose": "agent",
            "sessions": [
                {
                    "mediaType": "chat",
                    "sessionId": "b9ea3521-176e-4916-af7d-240732fc4680",
                    "direction": "inbound",
                    "peerId": "4d3a7227-6fdc-4d60-97fe-99db88e00b51",
                    "segments": [
                        {
                            "segmentStart": "2021-04-01T12:27:53.519Z",
                            "segmentEnd": "2021-04-01T12:28:04.569Z",
                            "queueId": "a623d83c-96d7-4baa-af1f-d46ad6700d8b",
                            "segmentType": "alert",
                            "conference": false
                        },
                        {
                            "segmentStart": "2021-04-01T12:28:04.569Z",
                            "segmentEnd": "2021-04-01T12:34:19.130Z",
                            "queueId": "a623d83c-96d7-4baa-af1f-d46ad6700d8b",
                            "segmentType": "interact",
                            "conference": false
                        },
                        {
                            "segmentStart": "2021-04-01T12:34:19.130Z",
                            "segmentEnd": "2021-04-01T12:43:23.306Z",
                            "queueId": "a623d83c-96d7-4baa-af1f-d46ad6700d8b",
                            "disconnectType": "peer",
                            "segmentType": "hold",
                            "conference": false
                        }
                    ],
                    "metrics": [
                        {
                            "name": "tAlert",
                            "value": 11050,
                            "emitDate": "2021-04-01T12:28:04.569Z"
                        },
                        {
                            "name": "tAnswered",
                            "value": 11179,
                            "emitDate": "2021-04-01T12:28:04.569Z"
                        }
                    ],
                    "provider": "Webchat Provider",
                    "remote": "John Doe",
                    "requestedRoutings": [
                        "Standard"
                    ],
                    "usedRouting": "Standard",
                    "selectedAgentId": "50fcd33c-f432-4726-abc9-979f3ca01555"
                }
            ]
        }
    ]
}
```

## Implementation steps

* [Clone the repository containing the project files](#clone-the-repository-containing-the-project-files "Goes to the Clone the repository containing the project files section")
* [Create an OAuth client with Client Credentials in Genesys Cloud](#create-an-oauth-client-with-client-credentials-in-genesys-cloud "Goes to the Create an OAuth client with Client Credentials in Genesys Cloud section")
* [Start the Docker container](#start-the-docker-container "Goes to the Start the Docker container section")
* [Install the Node dependencies](#install-the-node-dependencies "Goes to the Install the Node dependencies section")
* [Create the database tables](#create-the-database-tables "Goes to the Create the database tables section")
* [Insert some sample data](#insert-some-sample-data "Goes to the Insert some sample data section")
* [Fetch the data and compare against the JSON files](#fetch-the-data-and-compare-against-the-json-files "Goes to the Fetch the data and compare against the JSON files section")
* [Invoke the analytics conversations details API](#invoke-the-analytics-conversations-details-api "Goes to the Invoke the analytics conversations details API section")
* [Fetch a conversation by ID](#fetch-a-conversation-by-id "Goes to the Fetch a conversation by ID section")

### Clone the repository containing the project files

* Clone the [conversation-model-to-sql-blueprint](https://github.com/GenesysCloudBlueprints/conversation-model-to-sql-blueprint "Opens the conversation-model-to-sql-blueprint repository in GitHub") repository from GitHub.

### Create an OAuth client with Client Credentials in Genesys Cloud

1. Log in to your Genesys Cloud organization and create a OAuth client that uses the Client Credentials grant type and is assigned a role with the required permission: Analytics > conversationDetail > View.

  :::primary
  **Tip**: You can use an existing OAuth client with the Client Credentials grant type as long as the role assigned to the client has the required permission.
  :::

  The OAuth client allows you to make requests to the Genesys Cloud Platform API. The permission allows you to make calls to `POST /api/v2/analytics/conversations/details/query`. For more information, see [Create an OAuth client](https://help.mypurecloud.com/?p=188023 "Opens the Create an OAuth client article") in the Genesys Cloud Resource Center.

2. In your local blueprint repository, open the **config.ts** file. Add the Client ID and Client Secret from your OAuth client and specify the region where your Genesys Cloud organization is located, for example, `mypurecloud.ie` or `mypurecloud.com.au`.

### Start the Docker container

1. Start **Docker**.
2. From the docker directory in your local blueprint repository, run the following command in a terminal window:

  ```
  docker-compose up
  ```

  The Docker container starts to run and logs are printed to your terminal window. A directory named **datadir** is created. The Docker container writes the database data to the **datadir** directory for use between invocations. Leave the Docker container running in this terminal window.

### Install the Node dependencies

1. If **ts-node** is not installed on your computer, then run the following command in a terminal window:

  ```
  npm i ts-node -g
  ```

2. From the root of the project, run the following command. This command installs the dependencies.

  ```
  npm i
  ```

### Create the database tables

1. Open the **config.ts** file in your local blueprint repository. Add your local IP address to the **postgreSQL.host** section. Instructions for obtaining your local IP address on macOS and Linux are available in a comment in the file.  

  :::primary
  **Important**: If you have chosen to change the `environment` or `ports` values in the **docker-compose.yml** file, then you must update their corresponding values in the **config.ts** file.
  :::

2. From the root of the project, run the following command to create the database tables:

  ```
  npm run create-tables
  ```

  If successful, the script indicates that the tables were created. If a database connection could not be established, the command returns an `ECONNREFUSED` error. This error occurs either because the Docker container isn't running or the IP address is incorrect.

### Insert some sample data

* Run the following command. This command inserts the sample conversations from the conversations directory in your local blueprint repository into the database.

  ```
  npm run insert-data
  ```

  If successful, the script indicates that conversations were inserted successfully.

### Fetch the data and compare against the JSON files

* Run the following command. This command fetches the conversations from the database and compares the conversations to the data in the JSON files.

  ```
  npm run compare-conversations
  ```

  The script indicates if the conversations in the database and the JSON files match.

### Invoke the analytics conversations details API

* Run the following command with a valid date range. This command makes an API call to `POST
/api/v2/analytics/conversations/details/query` and inserts the response data from the API call into the database.  

  :::primary
  **Important**: The dates must be in ISO-8601 format and no more than one week apart.
  :::

  ```
  npm run invoke-api 2021-03-03T00:00:00.000Z 2021-03-09T00:00:00.000Z
  ```

  The command either outputs all the `conversationId` of the conversations that the command writes to the database or indicates that no conversations were available for the specified date range.

  :::primary
  **Note**: Inserting conversations with duplicate `conversationId` results in a duplicate key value error.
  :::

### Fetch a conversation by ID

* Run the following command with a valid `conversationId`. This command fetches a conversation with this `conversationId` from the database.

  ```
  npm run fetch-conversation 1bc96a39-6725-40c4-9345-db72aa67b8c6
  ```

  The command either outputs the conversation or indicates that no conversation with that ID exists in the database.

## Additional resources

* [Docker overview](https://docs.docker.com/get-started/overview/ "Opens the Docker overview page") in the Docker documentation
* [Overview of Docker Compose](https://docs.docker.com/compose/ "Opens the Overview of Docker Compose page") in the Docker documentation
* [Genesys Cloud Analytics API](https://developer.genesys.cloud/api/rest/v2/analytics/ "Opens the Genesys Cloud Analytics API page")
* [Genesys Cloud Analytics Query Builder](https://developer.genesys.cloud/developer-tools/#/analytics-query-builder "Opens the Genesys Cloud Analytics Query Builder")
* The [conversation-model-to-sql-blueprint](https://github.com/GenesysCloudBlueprints/conversation-model-to-sql-blueprint "Opens the conversation-model-to-sql-blueprint repository in GitHub") repository in GitHub
