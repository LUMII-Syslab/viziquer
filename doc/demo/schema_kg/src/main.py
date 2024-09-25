import csv
import psycopg2
import os

from enum import Enum
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

#DB_SCHEMA_NAME = "abertosgaliciana"
#DB_SCHEMA_NAME = "mini_university"
DB_SCHEMA_NAME = "nobel_prizes_simple"
HOST = "127.0.0.1"

PORT = os.getenv('PORT')
DATA_BASE_NAME = os.getenv('DATA_BASE_NAME')
USER_NAME = os.getenv('USER_NAME')
USER_PSW = os.getenv('USER_PSW')

FPATH_TO_CLASS_MAPPINGS = 'Mappings_1.csv'
FPATH_TO_LINK_MAPPINGS = 'Mappings_links_1.csv'

RDF_SCHEMA_NS='http://schema.vq.app/'


def create_connection():
    return psycopg2.connect(
            dbname=DATA_BASE_NAME,
            user=USER_NAME,
            password=USER_PSW,
            host=HOST,
            port=PORT
        )


def print_constants():
    print("Following constants are being used: ")
    print("  DB_SCHEMA_NAME=", DB_SCHEMA_NAME)
    print("  HOST=",HOST)
    print("  PORT=",PORT)
    print("  DATA_BASE_NAME=",DATA_BASE_NAME)
    print("  USER_NAME=",USER_NAME)
    print("  USER_PSW=",USER_PSW)
    print("  FPATH_TO_CLASS_MAPPINGS=",FPATH_TO_CLASS_MAPPINGS)
    print("  FPATH_TO_LINK_MAPPINGS=",FPATH_TO_LINK_MAPPINGS)
    print("  RDF_SCHEMA_NS=",RDF_SCHEMA_NS)
    print()
    print()


class DataType(Enum):
    STRING = 'String'
    INTEGER = 'Integer'
    BOOLEAN = 'Boolean'
    DOUBLE = 'Double'

    @staticmethod
    def from_string(data_type_str):
        """
        Creates an enum member from a string.

        :param data_type_str: The string representation of the data type.
        :return: The corresponding DataType enum member, or raises ValueError if not found.
        """
        for data_type in DataType:
            if data_type.value == data_type_str:
                return data_type
        raise ValueError(f"'{data_type_str}' is not a valid DataType")

    def __str__(self):
        """
        Prints out the enum member.
        """
        print(f"DataType: {self.name}, Value: {self.value}")

class LinkMapping:
    def __init__(self, 
                sourceClassName, linkName, targetClassName, 
                sql_table_name, sql_column_name, sql_target_table_name
                ):
        
        self.sourceClassName = sourceClassName
        self.linkName = linkName
        self.targetClassName = targetClassName
        
        self.sql_table_name = sql_table_name
        self.sql_column_name = sql_column_name
        self.sql_target_table_name = sql_target_table_name
        
    def __repr__(self):
        return (f"LinkMapping(sourceClassName='{self.sourceClassName}', \r\n"
                f"linkName='{self.linkName}', \r\n"
                f"targetClassName='{self.targetClassName}', \r\n"
                f"sql_table_name='{self.sql_table_name}', \r\n"
                f"sql_column_name='{self.sql_column_name}')\r\n"
                f"sql_target_table_name='{self.sql_target_table_name}')\r\n")
    
    def generateLinkTriples(self):
        # for each row in table sql_table_name create the following triple:
        # <<class1_Name>_<objID>> <linkName> <owl_class_name_<sql_column_id>>
        table_name = DB_SCHEMA_NAME + "." + self.sql_table_name
        try:
            # Connect to the PostgreSQL database
            connection = create_connection()
            cursor = connection.cursor()

            # Execute the query to fetch all records from the table
            query = f"SELECT id,  { self.sql_column_name } FROM {table_name}"
            cursor.execute(query)

            # Fetch all rows from the executed query
            records = cursor.fetchall()

            with open(self.sourceClassName + "_"+self.linkName+".nt", mode='w') as file:

                # Print the fetched records
                for record in records:
                    print(record)
                    print(record[0])

                    res = LinkMapping.generate_link_triple(self.sourceClassName, record[0], self.linkName, self.targetClassName, record[1])
                    file.write(res)

        except (Exception, psycopg2.Error) as error:
            print("Error while fetching data from PostgreSQL", error)

        finally:
            # Close the database connection
            if connection:
                cursor.close()
                connection.close()
                print("PostgreSQL connection is closed")


    def generate_link_triple(sourceClassName, subjID, linkName, targetClassName, objID):
        return Class2Table.generate_rdf_id(subjID, sourceClassName) + " <" + RDF_SCHEMA_NS+linkName+"> " + Class2Table.generate_rdf_id(objID, targetClassName)+".\n"


# Class2Table represents two different kinds of mappings : mapping from class to table and mappping from attribute to column.
# We can distinguish class->table by the fact that only two fields, class_name and table_name, are filled - all the other fields will be empty.
class Class2Table:
    def __init__(self, 
                owl_class_name, owl_attribute_name, owl_attribute_type, owl_subclass_name,
                sql_table_name, sql_column_name, sql_expr,
                is_class_to_table, is_subclass_mapping
                ):
        
        self.owl_class_name = owl_class_name
        self.owl_attribute_name = owl_attribute_name
        self.owl_attribute_type = owl_attribute_type
        self.owl_subclass_name = owl_subclass_name
        
        self.sql_table_name = sql_table_name
        self.sql_column_name = sql_column_name
        self.sql_expr = sql_expr

        self.is_class_to_table = is_class_to_table
        self.is_subclass_mapping = is_subclass_mapping

    @staticmethod
    def generate_rdf_id(record_id, owl_class_name):
        return "<" + RDF_SCHEMA_NS + owl_class_name+"_" + str(record_id)+">"
    
    
    @staticmethod
    def generate_type_triple(record_id, owl_class_name):
        return Class2Table.generate_rdf_id(record_id, owl_class_name) + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> " + "<" +RDF_SCHEMA_NS + owl_class_name+ ">.\n"


    @staticmethod
    def generate_attr_triple(record_id, owl_class_name, owl_attribute_name, owl_attribute_type, attr_value):
        val_str_rep = "\"" + str(attr_value) + "\""
        
        if owl_attribute_type == "string":
            val_str_rep += "^^<http://www.w3.org/2001/XMLSchema#string>"
        elif owl_attribute_type == "integer":
            val_str_rep += "^^<http://www.w3.org/2001/XMLSchema#integer>"
        elif owl_attribute_type == "double":
            val_str_rep += "^^<http://www.w3.org/2001/XMLSchema#double>"
        elif owl_attribute_type == "boolean":
            val_str_rep += "^^<http://www.w3.org/2001/XMLSchema#boolean>"
        elif owl_attribute_type == "URI":
            val_str_rep = "<"+attr_value+">"# if attr_type is URI, then we do not need type specifier for it 

        return Class2Table.generate_rdf_id(record_id, owl_class_name) + " <" + RDF_SCHEMA_NS + owl_attribute_name +"> " + val_str_rep + ".\n"

    def generate_attribute_triples(self):
        
        table_name = DB_SCHEMA_NAME + "." + self.sql_table_name
        # Classifier;displayName;string;Classes;display_name;;
        try:
            # Connect to the PostgreSQL database
            connection = create_connection()
            cursor = connection.cursor()

            # Execute the query to fetch all records from the table
            query = f"SELECT id, {self.sql_column_name} FROM {table_name}"
            cursor.execute(query)

            # Fetch all rows from the executed query
            records = cursor.fetchall()

            with open(self.owl_class_name +"_"+self.owl_attribute_name + "_attr.nt", mode='w') as file:

                # Print the fetched records
                for record in records:
                    print(record)
                    print(record[0])

                    res = Class2Table.generate_attr_triple(record[0], self.owl_class_name, self.owl_attribute_name, self.owl_attribute_type, record[1])
                    file.write(res)

        except (Exception, psycopg2.Error) as error:
            print("Error while fetching data from PostgreSQL", error)

        finally:
            # Close the database connection
            if connection:
                cursor.close()
                connection.close()
                print("PostgreSQL connection is closed")


    def generate_class_type_triples(self):
        # for each row in table sql_table_name create the following triple:
        # <objID> <rdf:type> <owl_class_name>
        table_name = DB_SCHEMA_NAME + "." + self.sql_table_name
        try:
            # Connect to the PostgreSQL database
            connection = create_connection()
            cursor = connection.cursor()

            # Execute the query to fetch all records from the table
            query = f"SELECT id FROM {table_name}"
            cursor.execute(query)

            # Fetch all rows from the executed query
            records = cursor.fetchall()

            with open(self.owl_class_name + "_type.nt", mode='w') as file:

                # Print the fetched records
                for record in records:
                    print(record)
                    print(record[0])

                    res = Class2Table.generate_type_triple(record[0], self.owl_class_name)
                    file.write(res)

        except (Exception, psycopg2.Error) as error:
            print("Error while fetching data from PostgreSQL", error)

        finally:
            # Close the database connection
            if connection:
                cursor.close()
                connection.close()
                print("PostgreSQL connection is closed")


    def generate_triples_for_one_subclass(self):
        # table_name = DB_SCHEMA_NAME + "." + sub_cl_map['sql_table_name']
        try:
            # Connect to the PostgreSQL database
            connection = create_connection()
            cursor = connection.cursor()

            # Execute the query to fetch all records from the table
            # query = f"SELECT id FROM {table_name} where {subcl['where_expr']}"
            cursor.execute("SET search_path TO " + DB_SCHEMA_NAME)
            print(self.sql_expr)
            cursor.execute(self.sql_expr)

            # Fetch all rows from the executed query
            records = cursor.fetchall()

            # with open(subcl['name'] + "_type.nt", mode='w') as file:
            with open(self.owl_subclass_name + "_type.nt", mode='w') as file:

                # Print the fetched records
                for record in records:
                    print(record)
                    print(record[0])

                    res = Class2Table.generate_type_triple(record[0], self.owl_subclass_name)
                    file.write(res)

        except (Exception, psycopg2.Error) as error:
            print("Error while fetching data from PostgreSQL", error)

        finally:
            # Close the database connection
            if connection:
                cursor.close()
                connection.close()
                print("PostgreSQL connection is closed")


    def __repr__(self):
        return (f"Class2Table(owl_class_name='{self.owl_class_name}', \r\n"
                f"owl_attribute_name='{self.owl_attribute_name}', \r\n"
                f"owl_attribute_type='{self.owl_attribute_type}', \r\n"
                f"owl_subclass_name='{self.owl_subclass_name}', \r\n"
                f"sql_table_name='{self.sql_table_name}', \r\n"
                f"sql_column_name='{self.sql_column_name}')\r\n"
                f"sql_expr='{self.sql_expr}')\r\n"
                f"is_class_to_table='{self.is_class_to_table}')\r\n"
                f"is_subclass_mapping='{self.is_subclass_mapping}')\r\n")


def load_class_mappings(file_path):
    mappings = []

    with open(file_path, mode='r') as file:
        csv_reader = csv.reader(file, delimiter=';')
        # next(csv_reader)  # Skip the header row
        
        current_class = None
        current_table = None

        for row in csv_reader:
            # print(row)
            owl_attribute_name = None
            owl_attribute_type = None
            owl_subclass_name = None
            sql_table_name = None
            sql_column_name = None
            sql_expr = None
            isClass2Table = False
            isSubClassMapping = False
            
            if len(row[0]) == 0 and len(row[1]) == 0 and len(row[2]) == 0 and len(row[3]) == 0 and len(row[4]) == 0:
                #we are skipping this line - it is empty
                continue

            if row[0] and len(row[0])>0:  # Non-empty first element indicates class-to-table or subclass mapping
                # print("<a>")
                # print(row[0])
                # print("</a>")
                
                # subclas mappings values are in filled in 0,1,4
                # attr mapping - values are in filled in 2,3,4,5
                # class mapping - values are in filled in 0,4

                if row[1] and len(row[1]) and row[4] and len(row[4]):#it is subclass mappings
                    current_class = row[0]
                    owl_subclass_name = row[1]
                    sql_expr = row[4]
                    isSubClassMapping = True
                else:
                    current_class = row[0]
                    current_table = row[4]
                    isClass2Table = True
            
            else:  # Empty first element indicates attribute mapping
                owl_attribute_name = row[2]
                owl_attribute_type = row[3]
                sql_table_name = row[4]
                sql_column_name = row[5]
            
            mapping = Class2Table(current_class, 
                                    owl_attribute_name, owl_attribute_type, owl_subclass_name,
                                    current_table, sql_column_name, sql_expr,
                                    isClass2Table, isSubClassMapping)
            mappings.append(mapping)

    return mappings


def load_link_mappings(file_path):
    mappings = []

    with open(file_path, mode='r') as file:
        csv_reader = csv.reader(file, delimiter=';')
        # next(csv_reader)  # Skip the header row
        
        for row in csv_reader:
            print(row)
            sourceClassName = None
            linkName = None
            targetClassName = None
            
            sql_table_name = None
            sql_column_name = None
            sql_target_table_name = None
            
            if (len(row[0]) == 0 and len(row[1]) == 0 and len(row[2]) == 0 and len(row[3]) == 0 and 
                len(row[4]) == 0 and len(row[5]) == 0 and len(row[6]) == 0):
                #we are skipping this line - it is empty
                continue
            
            sourceClassName = row[0]
            linkName = row[1]
            targetClassName = row[2]

            sql_table_name = row[4]
            sql_column_name = row[5]
            sql_target_table_name = row[6]
            
            mapping = LinkMapping(sourceClassName, linkName, targetClassName,
                                sql_table_name,sql_column_name, sql_target_table_name)
            mappings.append(mapping)

    return mappings

#   {
#         "super_class":"ClassClassRel",
#         "sql_table_name": "cc_rels"
#         "sub_classes":[
#             {"name":"SubClass",
#              "where_expr" : "type_id = 1"},
#             {"name":"EqClass",
#              "where_expr" : "type_id = 2"}
#         ]
#     },

def generate_triples_for_one_subclass(sub_cl_map, subcl):
    table_name = DB_SCHEMA_NAME + "." + sub_cl_map['sql_table_name']
    try:
        # Connect to the PostgreSQL database
        connection = create_connection()
        cursor = connection.cursor()

        # Execute the query to fetch all records from the table
        query = f"SELECT id FROM {table_name} where {subcl['where_expr']}"
        cursor.execute(query)

        # Fetch all rows from the executed query
        records = cursor.fetchall()

        with open(subcl['name'] + "_type.nt", mode='w') as file:

            # Print the fetched records
            for record in records:
                print(record)
                print(record[0])

                res = Class2Table.generate_type_triple(record[0], subcl['name'])
                file.write(res)

    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL", error)

    finally:
        # Close the database connection
        if connection:
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")


def generate_subclass_type_triples():
    for sub_cl_map in subclass_mappings:
        print(sub_cl_map)
        for subcl in sub_cl_map['sub_classes']:
            generate_triples_for_one_subclass(sub_cl_map, subcl)


# Instances of class Tag are created from rows in two tables: property_annots, class_anots. 
# Now we traverse rows of the property_annots class.
# TODO: superclass links to Entity need to be added."

#TODO: not finished, additional testing is needed
def generateTriplesForTag():
    class_table_name = DB_SCHEMA_NAME + "." + "class_annots"
    try:
        # Connect to the PostgreSQL database
        
        connection = create_connection()
        cursor = connection.cursor()

        # Execute the query to fetch all records from the table
        query = f"SELECT id, annotation, language_code FROM {class_table_name}"
        cursor.execute(query)

        # Fetch all rows from the executed query
        records = cursor.fetchall()

        with open("Tag_class_anots_type.nt", mode='w') as file:

            # Print the fetched records
            for record in records:
                print(record)
                print(record[0])

                res =  "<http://myschema.org/Tag_classs_annots_" +  str(record[0]) + "> " + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> " +  " <http://myschema.org/Tag>.\n" 
                #TODO:generate triple for annotation, language_code
                file.write(res)
                #TODO:generate triple for annotation,
                res =  "<http://myschema.org/Tag_class_annots_" + str(record[0]) + "> " + " <http://myschema.org/value> \"" + str(record[1])+"\"^^<http://www.w3.org/2001/XMLSchema#string>.\n"
                file.write(res)
                #TODO:generate triple for language_code
                res =  "<http://myschema.org/Tag_class_annots_" + str(record[0]) + "> " + " <http://myschema.org/language> \"" + str(record[2])+"\"^^<http://www.w3.org/2001/XMLSchema#string>.\n"
                file.write(res)

    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL", error)

    finally:
        # Close the database connection
        if connection:
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")


print_constants()
mappings = load_class_mappings(FPATH_TO_CLASS_MAPPINGS)
linkMappings = load_link_mappings(FPATH_TO_LINK_MAPPINGS)

for mapping in mappings:
    # print(mapping)
    # print()
    if mapping.is_class_to_table:
        mapping.generate_class_type_triples()
    elif mapping.is_subclass_mapping:
        mapping.generate_triples_for_one_subclass()
    else:
        mapping.generate_attribute_triples()

for lm in linkMappings:
    print(lm)
    lm.generateLinkTriples()

# generateTriplesForTag()


# m = Class2Table("Classifier", None, None, "Classes", None, True)
# m.generate_class_type_triples()

# m = Class2Table("Classifier", "instanceCount", "integer", "Classes", "cnt", False)
# m.generate_attribute_triples()


