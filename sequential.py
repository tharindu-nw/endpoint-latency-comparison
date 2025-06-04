#!/usr/bin/env python3
"""
API Response Time Comparison Script
Compares response times between AKS and Choreo API endpoints
"""

import urllib.request
import urllib.parse
import urllib.error
import requests
import time
import json
import statistics
from typing import Dict, List, Tuple, Any
import os

class APITester:
    def __init__(self, num_calls: int = 20):
        self.num_calls = num_calls
        self.timeout = 30
    
    def test_endpoint(self, endpoint_config: Dict[str, Any]) -> Dict[str, float]:
        """
        Test a single endpoint multiple times and return timing statistics
        
        Args:
            endpoint_config: Dictionary containing method, url, and optional body/headers
            
        Returns:
            Dictionary with timing statistics
        """
        response_times = []
        successful_calls = 0
        failed_calls = 0
        
        method = endpoint_config.get('method', 'GET').upper()
        url = endpoint_config.get('url')
        body = endpoint_config.get('body')
        headers = endpoint_config.get('headers', {})
        
        print(f"  Testing {method} {url}")
        print(f"  Making {self.num_calls} calls...")
        
        for i in range(self.num_calls):
            try:
                start_time = time.time()
                
                # Prepare request
                if method == 'GET':
                    req = urllib.request.Request(url, headers=headers)
                elif method in ['POST', 'PUT']:
                    data = body.encode('utf-8') if body else None
                    req = urllib.request.Request(url, data=data, headers=headers)
                    req.get_method = lambda: method
                elif method == 'DELETE':
                    req = urllib.request.Request(url, headers=headers)
                    req.get_method = lambda: 'DELETE'
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Make request
                response = urllib.request.urlopen(req, timeout=self.timeout)
                end_time = time.time()
                
                # Calculate response time in milliseconds
                response_time = (end_time - start_time) * 1000
                
                # Check if response is successful (status code 2xx)
                status_code = response.getcode()
                if 200 <= status_code < 300:
                    response_times.append(response_time)
                    successful_calls += 1
                else:
                    print(f"    Call {i+1}: HTTP {status_code}")
                    failed_calls += 1
                    
            except urllib.error.HTTPError as e:
                print(f"    Call {i+1}: HTTP {e.code} - {e.reason}")
                failed_calls += 1
            except urllib.error.URLError as e:
                print(f"    Call {i+1}: Failed - {str(e.reason)}")
                failed_calls += 1
            except Exception as e:
                print(f"    Call {i+1}: Error - {str(e)}")
                failed_calls += 1
        
        if not response_times:
            return {
                'avg_response_time': float('inf'),
                'min_response_time': float('inf'),
                'max_response_time': float('inf'),
                'median_response_time': float('inf'),
                'std_dev': float('inf'),
                'successful_calls': successful_calls,
                'failed_calls': failed_calls,
                'success_rate': 0.0
            }
        
        return {
            'avg_response_time': statistics.mean(response_times),
            'min_response_time': min(response_times),
            'max_response_time': max(response_times),
            'median_response_time': statistics.median(response_times),
            'std_dev': statistics.stdev(response_times) if len(response_times) > 1 else 0,
            'successful_calls': successful_calls,
            'failed_calls': failed_calls,
            'success_rate': (successful_calls / self.num_calls) * 100,
            'raw_times': response_times
        }
    
    def compare_endpoints(self, pair: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare AKS vs Choreo endpoints for a given pair
        
        Args:
            pair: Dictionary containing name, aks, and choreo configurations
            
        Returns:
            Dictionary with comparison results
        """
        name = pair.get('name', 'Unknown')
        print(f"\n{'='*60}")
        print(f"Testing Pair: {name}")
        print(f"{'='*60}")
        
        # Test AKS endpoint
        print(f"\nTesting AKS endpoint:")
        aks_results = self.test_endpoint(pair['aks'])
        
        # Test Choreo endpoint
        print(f"\nTesting Choreo endpoint:")
        choreo_results = self.test_endpoint(pair['choreo'])
        
        # Determine winner
        aks_avg = aks_results['avg_response_time']
        choreo_avg = choreo_results['avg_response_time']
        
        if aks_avg < choreo_avg:
            winner = 'AKS'
            improvement = ((choreo_avg - aks_avg) / choreo_avg) * 100
        elif choreo_avg < aks_avg:
            winner = 'Choreo'
            improvement = ((aks_avg - choreo_avg) / aks_avg) * 100
        else:
            winner = 'Tie'
            improvement = 0
        
        return {
            'name': name,
            'aks_results': aks_results,
            'choreo_results': choreo_results,
            'winner': winner,
            'improvement_percentage': improvement
        }
    
    def print_detailed_results(self, comparison: Dict[str, Any]):
        """Print detailed comparison results"""
        name = comparison['name']
        aks = comparison['aks_results']
        choreo = comparison['choreo_results']
        winner = comparison['winner']
        improvement = comparison['improvement_percentage']
        
        print(f"\n{'-'*60}")
        print(f"RESULTS FOR: {name}")
        print(f"{'-'*60}")
        
        print(f"\nAKS Performance:")
        print(f"  Average Response Time: {aks['avg_response_time']/1000:.3f} s")
        print(f"  Min/Max: {aks['min_response_time']/1000:.3f} / {aks['max_response_time']/1000:.3f} s")
        print(f"  Median: {aks['median_response_time']/1000:.3f} s")
        print(f"  Standard Deviation: {aks['std_dev']/1000:.3f} s")
        print(f"  Success Rate: {aks['success_rate']:.1f}% ({aks['successful_calls']}/{self.num_calls})")
        
        print(f"\nChoreo Performance:")
        print(f"  Average Response Time: {choreo['avg_response_time']/1000:.3f} s")
        print(f"  Min/Max: {choreo['min_response_time']/1000:.3f} / {choreo['max_response_time']/1000:.3f} s")
        print(f"  Median: {choreo['median_response_time']/1000:.3f} s")
        print(f"  Standard Deviation: {choreo['std_dev']/1000:.3f} s")
        print(f"  Success Rate: {choreo['success_rate']:.1f}% ({choreo['successful_calls']}/{self.num_calls})")
        
        print(f"\n🏆 WINNER: {winner}")
        if winner != 'Tie':
            print(f"   Performance improvement: {improvement:.1f}%")


def main():
    # Configuration
    BASE_URL_AKS = 'https://api.central.ballerina.io/2.0'
    BASE_URL_CHOREO = 'https://choreo.api.central.ballerina.io/2.0'
    USER_UUID = os.environ.get('USER_UUID', '')
    ORG_NAME = os.environ.get('ORG_NAME', '')
    AUTH_TOKEN = os.environ.get('AUTH_TOKEN', '')
    FRONTEND_AUTH_TOKEN = os.environ.get('FRONTEND_AUTH_TOKEN', '')
    graphql_query = """
    query package($orgName: String!, $packageName: String!, $version: String!) {
        package(orgName: $orgName, packageName: $packageName, version: $version) {
            totalPullCount
            packageDependencies {
                organization
                name
                version
            },
            dependentPackages {
                organization
                name
                version
            }
            dailyPullCount {
                pullDate
                pullCount
            }
        }
    }
    """
    
    # Common headers for GraphQL requests
    graphql_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Define API pairs to test
    api_pairs = [
        # {
        #     'name': 'get_package_versions',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/registry/packages/ballerina/http'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/registry/packages/ballerina/http'
        #     }
        # },
        # {
        #     'name': 'get_package_details',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/registry/packages/ballerina/http/2.8.0'  # Replaced * with specific version
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/registry/packages/ballerina/http/2.8.0'  # Replaced * with specific version
        #     }
        # },
        # {
        #     'name': 'resolve_package_dependencies',  # Fixed typo
        #     'aks': {
        #         'method': 'POST',
        #         'url': f'{BASE_URL_AKS}/registry/packages/resolve-dependencies',
        #         'body': json.dumps({
        #             "packages": [
        #                 {"org": "ballerina", "name": "file", "version": "1.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "observe", "version": "1.0.7", "mode": "medium"},
        #                 {"org": "ballerina", "name": "task", "version": "2.3.2", "mode": "medium"},
        #                 {"org": "ballerina", "name": "jwt", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "os", "version": "1.6.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "mime", "version": "2.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "io", "version": "1.4.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "log", "version": "2.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "time", "version": "2.2.4", "mode": "medium"},
        #                 {"org": "ballerina", "name": "constraint", "version": "1.2.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "cache", "version": "3.5.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "auth", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "http", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "websocket", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "oauth2", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "crypto", "version": "2.3.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "url", "version": "2.2.4", "mode": "medium"}
        #             ]
        #         }),
        #         'headers': {'Content-Type': 'application/json'}
        #     },
        #     'choreo': {
        #         'method': 'POST',
        #         'url': f'{BASE_URL_CHOREO}/registry/packages/resolve-dependencies',
        #         'body': json.dumps({
        #             "packages": [
        #                 {"org": "ballerina", "name": "file", "version": "1.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "observe", "version": "1.0.7", "mode": "medium"},
        #                 {"org": "ballerina", "name": "task", "version": "2.3.2", "mode": "medium"},
        #                 {"org": "ballerina", "name": "jwt", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "os", "version": "1.6.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "mime", "version": "2.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "io", "version": "1.4.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "log", "version": "2.7.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "time", "version": "2.2.4", "mode": "medium"},
        #                 {"org": "ballerina", "name": "constraint", "version": "1.2.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "cache", "version": "3.5.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "auth", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "http", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "websocket", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "oauth2", "version": "2.8.0", "mode": "medium"},
        #                 {"org": "ballerina", "name": "crypto", "version": "2.3.1", "mode": "medium"},
        #                 {"org": "ballerina", "name": "url", "version": "2.2.4", "mode": "medium"}
        #             ]
        #         }),
        #         'headers': {'Content-Type': 'application/json'}
        #     }
        # },
        # {
        #     'name': 'search_packages',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/registry/search-packages?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/registry/search-packages?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC'
        #     }
        # },
        # {
        #     'name': 'search_package_symbols',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/registry/search-symbols?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/registry/search-symbols?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC'
        #     }
        # },
        # {
        #     'name': 'package_search_suggestions',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/registry/search-suggestions?q=goog&mode=all'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/registry/search-suggestions?q=goog&mode=all'
        #     }
        # },
        # {
        #     'name': 'get_organizations_of_user',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/users/{USER_UUID}/organizations',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/users/{USER_UUID}/organizations',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     }
        # },
        # {
        #     'name': 'get_asgardeo_organizations_of_user',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/users/{USER_UUID}/organizations/asgardeo',
        #         'headers': {'Authorization': f'Bearer {FRONTEND_AUTH_TOKEN}'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/users/{USER_UUID}/organizations/asgardeo',
        #         'headers': {'Authorization': f'Bearer {FRONTEND_AUTH_TOKEN}'}
        #     }
        # },
        # {
        #     'name': 'get_users_of_organization',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/organizations/{ORG_NAME}/users',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/organizations/{ORG_NAME}/users',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     }
        # },
        # {
        #     'name': 'get_invitations_of_organization',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/organizations/{ORG_NAME}/invitations',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/organizations/{ORG_NAME}/invitations',
        #         'headers': {'Authorization': f'Bearer {AUTH_TOKEN}'}
        #     }
        # },
        {
            'name': 'graphql_package_details',
            'aks': {
                'method': 'POST',
                'url': f'{BASE_URL_AKS}/graphql',
                'body': json.dumps({
                    'query': graphql_query,
                    'variables': {
                        'orgName': 'ballerina',
                        'packageName': 'graphql',
                        'version': '1.16.0'
                    }
                }),
                'headers': {'Content-Type': 'application/json'}
            },
            'choreo': {
                'method': 'POST',
                'url': f'{BASE_URL_CHOREO}/graphql',
                'body': json.dumps({
                    'query': graphql_query,
                    'variables': {
                        'orgName': 'ballerina',
                        'packageName': 'graphql',
                        'version': '1.16.0'
                    }
                }),
                'headers': {'Content-Type': 'application/json'}
            }
        },
        # {
        #     'name': 'get_latest_stdlib',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/docs/stdlib/latest'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/docs/stdlib/latest'
        #     }
        # },
        # {
        #     'name': 'get_package_docs',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/docs/ballerina/http/2.14.1'
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/docs/ballerina/http/2.14.1'
        #     }
        # },
        # {
        #     'name': 'get_list_of_distributions',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/update-tool/distributions',
        #         'headers': {'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/update-tool/distributions',
        #         'headers': {'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1'}
        #     }
        # },
        # {
        #     'name': 'get_update_versions',
        #     'aks': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_AKS}/update-tool/update/versions',
        #         'headers': {'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1'}
        #     },
        #     'choreo': {
        #         'method': 'GET',
        #         'url': f'{BASE_URL_CHOREO}/update-tool/update/versions',
        #         'headers': {'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1'}
        #     }
        # }
    ]
    
    # Initialize tester
    tester = APITester(num_calls=20)
    
    print("🚀 Starting API Performance Comparison")
    print(f"📊 Each endpoint will be called {tester.num_calls} times")
    
    # Store all results for summary
    all_results = []
    
    # Test each pair
    for pair in api_pairs:
        try:
            result = tester.compare_endpoints(pair)
            tester.print_detailed_results(result)
            all_results.append(result)
        except Exception as e:
            print(f"❌ Error testing pair {pair.get('name', 'Unknown')}: {str(e)}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("📋 SUMMARY")
    print(f"{'='*60}")
    
    aks_wins = sum(1 for r in all_results if r['winner'] == 'AKS')
    choreo_wins = sum(1 for r in all_results if r['winner'] == 'Choreo')
    ties = sum(1 for r in all_results if r['winner'] == 'Tie')
    
    print(f"Total pairs tested: {len(all_results)}")
    print(f"AKS wins: {aks_wins}")
    print(f"Choreo wins: {choreo_wins}")
    print(f"Ties: {ties}")
    
    if aks_wins > choreo_wins:
        print(f"\n🏆 Overall Winner: AKS")
    elif choreo_wins > aks_wins:
        print(f"\n🏆 Overall Winner: Choreo")
    else:
        print(f"\n🤝 Overall Result: Tie")
    
    print(f"\n📈 Individual Results:")
    for result in all_results:
        aks_avg = result['aks_results']['avg_response_time']
        choreo_avg = result['choreo_results']['avg_response_time']
        print(f"  {result['name']}: AKS {aks_avg/1000:.3f}s vs Choreo {choreo_avg/1000:.3f}s → {result['winner']} wins")


if __name__ == "__main__":
    main()
