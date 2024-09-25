# Project Name

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/downloads/)

## Table of Contents

- [Project Overview](#project-overview)
- [Installation](#installation)
- [Usage](#usage)


## Project Overview

Generally speaking, this python script allows generating RDF triples from SQL database by using simple mappings. 

In this specific case, the script is used to generate RDF triples from a database containing SPARQL endpoint schema descriptions.

This repository also shows the mappings used for generating the triples for the task mentioned above.

## Installation

### Prerequisites

- Python 3.8 or higher
- [Optional dependencies, e.g., `pip`]

### Installation Steps

1. Install the required packages:

    ```bash
    pip install -r requirements.txt
    ```
2. Create .env file. This file must contain values for the following variables : 
- USER_NAME
- USER_PSW
- PORT
- DATA_BASE_NAME

3. Set appropriate values for the following constants in python code (top part of the main.py file):
- DB_SCHEMA_NAME
- HOST
- FPATH_TO_CLASS_MAPPINGS
- FPATH_TO_LINK_MAPPINGS
- RDF_SCHEMA_NS

## Usage

To run the project, execute the following command:

```bash
python ./main.py
