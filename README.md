# Static Asset Management Microservice (SAMM)

This repository contains the implementation for a plug-and-play microservice
that provides endpoints for basic static asset management. The microservice is
intended to be deployed privately within the ecosystem and should not be exposed
publicly as its authentication capabilities are based on a very simple JWT flow.
However, the user can easily override the authentication flow in order to
integrate their preferred approach.

## Functionalities

The microservice implements the following functionalities:

- **Asset Upload**: clients can upload base64 encoded assets to the service which
  performs the following operations:

  - Asset metadata is extracted from the file buffer

  - Asset is scanned for malware and NSFW content

  - Asset is optimized for storage (e.g. resize, compression)

  - Asset is encrypted using a simple cypher

  - Asset is uploaded to external storage provider (e.g. AWS S2)

  - Metadata and asset path on external bucket are stored in the service
    database

- **Asset Download**:
