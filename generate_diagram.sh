#!/bin/bash

# Script to generate use case diagram from PlantUML file

echo "Generating use case diagram..."

# Check if PlantUML is installed
if ! command -v plantuml &> /dev/null; then
    echo "PlantUML is not installed. Installing..."
    # Try to install PlantUML
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y plantuml
    else
        echo "Please install PlantUML manually"
        exit 1
    fi
fi

# Generate the diagram
plantuml -tpng use_case_diagram.puml

if [ $? -eq 0 ]; then
    echo "Use case diagram generated successfully!"
    echo "Output file: use_case_diagram.png"
else
    echo "Failed to generate diagram"
    exit 1
fi