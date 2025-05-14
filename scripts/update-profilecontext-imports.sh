#!/bin/bash

# Update import references from profileContextV2 to profileContext
find src tests -type f -name "*.ts" -exec sed -i 's/@\/contexts\/profiles\/profileContextV2/@\/contexts\/profiles\/profileContext/g' {} \;
find src tests -type f -name "*.ts" -exec sed -i 's/\.\/profileContextV2/\.\/profileContext/g' {} \;

# Update class names from ProfileContextV2 to ProfileContext
find src tests -type f -name "*.ts" -exec sed -i 's/ProfileContextV2/ProfileContext/g' {} \;

# Exclude the files that should keep ProfileContextV2 in their name
find src tests -type f -name "*V2*" -exec sed -i 's/ProfileContext\([^V]\)/ProfileContextV2\1/g' {} \;
find src tests -type f -path "*/messaging/*" -exec sed -i 's/ProfileContext\(Messaging\)/ProfileContextV2\1/g' {} \;