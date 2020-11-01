***********************************************************************************************************************************************************
***********************************************************************************************************************************************************
### Session 1
Lancer le single node

```bash
# Lancer le single node
docker run -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:7.9.1

# Insérer
curl -Method POST -Uri http://localhost:9200/doc/1 -ContentType "application/json" -Body '{"a":"b"}'
```

Each shard is an an inverted index of document
Format de requête: localhost:9200/index/type/uniqueId

chercher tags avec ElasticSearch
GET localhost:9200/tags/_search?pretty
-

### Logical concepts of elasticsearch

- documents = structured JSON => can be of any type
    every document has a unique ID (predefined or not) and a type
- types : define the schema and mapping shared by documents that represent the same thing
    a type is a complex type (!= array, int, double), log entry or wikipedia article
- index : contain inverted indexes that let you search across all types in one request

An index contains a collection of types, and a type contains a collection of documents
Index = database
Types = table of all the individual fields that a document contains
Document = row


TF-IDF = term-frequency * inverse document-frequency
       = term-frequency / document-frequency
       = measure the relevance of a term in a document
       = how special is this term in this document


An index is split into shards
When Elastic finds what document you want, it can find the specific shard you want because indexes are distributed into different shards


Settings => number_of_shards et number_of_replicas

number_of_replicas can be +++ to augment READ capacity
number_of_shards cannot be changed

WRITE REQUEST doivent être exécutées sur un shard then all of its replica
READ REQUEST sont exécutées uniquement sur un shard ou any of its replica

```bash
curl -Method POST http://localhost:9200/accounts/person/1/_update -ContentType "application/json" -Body '{
    "doc": {
        "job_description" : "Systems administrator and Linux specialist"
    }
}'
```

***********************************************************************************************************************************************************
***********************************************************************************************************************************************************

### Session 2

docker
```bash
docker pull sebp/elk
docker run -p 5601:5601 -p 9200:9200 -p 5044:5044 -it --name elk sebp/elk
```
Ports :
    5601 (Kibana web interface).
    9200 (Elasticsearch JSON interface).
    5044 (Logstash Beats interface, receives logs from Beats/Filebeats)


  