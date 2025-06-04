# Comparing endpoint latency between deployments

This repo contains two scripts designed to compare latency of a set endpoints. There are two deployments, one in an Azure Kubernetes Cluster and another in [Choreo](https://choreo.dev/). 
There are two main test scenarios considered. 
1. Test with concurrent traffic using [k6](https://k6.io/)
2. Test with sequential traffic using a custom script

## How to run the tests

### Environment Variables
The following env variables need to be set for the scripts to run
1. `FRONTEND_AUTH_TOKEN` - Auth token from Ballerina Central website
2. `AUTH_TOKEN` - Ballerina CLI Token
3. `ORG_NAME` - Name of an organization that the owner has admin access to
4. `USER_UUID` - Token user's uuid

### k6 Concurrent Testing

1. Install k6 ([follow the installation guide](https://grafana.com/docs/k6/latest/set-up/install-k6/))
2. Run the script with following command
```sh
k6 run --summary-trend-stats "min,avg,max,p(99)" k6_concurrent_test.js
```
> **Note:** The `--summary-trend-stats` is passed here because we need the p(99) stat. 

### Sequential Testing

1. Requires python3 
2. Run the script
```
python3 sequential.py
```
