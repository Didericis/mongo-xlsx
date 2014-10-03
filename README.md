#WARNING#
###This app has not been completed#

mongo-xlsx
==========

Command line app for querying mongo collections, adding fields and storing results via an xlsx file.

Description
----
This command line app allows you to perform complicated queries on a mongodb collection via an xlsx file. For each query, you can also specify fields you wish to add to the results that match those queries. The results are stored in a new collection by the name of the xlsx file. This program is currently only compatible with Unix systems.

Installation
----
```sh
git clone https://github.com/Didericis/mongo-xlsx.git
```

Usage
----
To start, type node mongo-xlsx.js. A menu will pop up with all the xlsx files in the default directory, which is set to $HOME/Documents. To change these settings, type node mongo-xlsx.js -c and select "MAKE DEFAULT" when finished.

To perform a valid query, the xlsx file should have the following format:
  - Each column has a header. If a header is not found in the query object, it is treated as an added field.
  - Each row other than the header row corresponds to a query. The criteria for the query are found under the query columns, and the values to be added for the results of that query are found under the added field columns.
  - The title of the xlsx file is the name of the result collection.
  - The title of the worksheet is the name of the collection being searched.

Once you select a valid xlsx file, you will be prompted for a username and password for each database. If you have none, simply press enter to skip through the field inputs. Mongo-xlsx will then perform the query in each row. If a result corresponds to multiple queries, it will be ommited from the results because of possible conflicts in added fields (this behavior will likely be customizable in future versions)

Example
----

Consider the following xlsx sheet called "SummerTexts", in a file called "SummerTextQuery":

```
query.text.contains | query.text.contains | query.date.after | query.date.before | disposition
--------------------------------------------------------------------------------------------------
bummer              | sad                 | 7/1/14           | 7/31/14           | July Joykill
awesome             | rad                 | 6/1/14           | 6/30/14           | June Joybug
awesome             | sad                 | 6/1/14           | 7/31/14           | Fickle Foe
ice cream           |                     |                  |                   | Hungry

```

Selecting this document in mongo-xlsx will perform the following queries:
  - If a document in the collection "SummerTexts" has both "bummer" and "sad" in the text fields, and was created on a date between 7/1/14 and 7/31/14, it will be added to the collection "SummerTextQuery", and will have a new field "addedFields.disposition" with a value "July Joykill".
  - If a document in the collection "SummerTexts" has both "awesome" and "rad" in the text fields, and was created on a date between 6/1/14 and 6/30/14, it will be added to the collection "SummerTextQuery", and will have a new field "addedFields.disposition" with a value "June Joybug".
  - If a document in the collection "SummerTexts" has both "awesome" and "sad" in the text fields, and was created on a date between 6/1/14 and 7/31/14, it will be added to the collection "SummerTextQuery", and will have a new field "addedFields.disposition" with a value "Fickle Foe".
  - If a document in the collection "SummerTexts" has both "ice cream" in the text fields, it will be added to the collection "SummerTextQuery", and will have a new field "addedFields.disposition" with a value "Fickle Foe".

Documents that would be added to the results include:
  - text = "What a bummer. I'm so sad", date = 7/14/14
  - text = "That's awesome; really rad", date = 6/14/14
  - text = "That's awesome, but I'm sad", date = 7/4/14
  - text = "I like ice cream", date = 5/5/40
  - text = "It's totally awesome and rad that I got ice cream", date = 5/5/40

Documents that wouldn't be added to the results include:
  - text = "It's totally awesome and rad that I got ice cream", date = 6/14/14
  - text = "It's a bummer that I'm awesome and sad", date = 6/14/14
  - text = "That's a bummer", date = 7/14/14
    
Valid Queries
----

  - query.text.contains
  - query.text.equals
  - query.geotag.equals
  - query.geotag.within
  - query.geotag.city
  - query.date.date
  - query.date.before
  - query.date.after
