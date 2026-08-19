import { Client, Account, Databases, ID, Query } from "appwrite";

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a7e81b30035b5cc7d2d";
export const DATABASE_ID = "leads_database";
export const COLLECTION_ID = "leads_collection";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID, Query };
