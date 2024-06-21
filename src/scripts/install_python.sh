#!/bin/bash

# Update the package list
sudo apt-get update

# Install Python3 and pip
sudo apt-get install -y python3 python3-pip

# Install WeasyPrint and PyPDF2
pip3 install weasyprint==62.2 PyPDF2==3.0.1

# Verify installations
python3 --version
pip3 --version
pip3 show weasyprint
pip3 show PyPDF2

echo "Installation completed successfully."
