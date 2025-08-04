#!/bin/bash

DB_HOST="localhost"
DB_PORT="27017"
DB_NAME="linkychain_chat"

/usr/bin/mongo --host "$DB_HOST" --port "$DB_PORT" "$DB_NAME" --eval "db.dropDatabase();"

echo "Attempted to drop database $DB_NAME at $(date)"
