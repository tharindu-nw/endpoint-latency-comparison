import http, { url } from 'k6/http';
import { check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics for detailed analysis - per endpoint
const endpointMetrics = {};

const query = `
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
`;

const headers = {
  'Content-Type': 'text/json',
};

// Initialize metrics for each endpoint pair
function initializeMetrics() {
  endpointPairs.forEach(pair => {
    endpointMetrics[pair.name] = {
      aksLatency: new Trend(`aks_latency_${pair.name}`, true),
      choreoLatency: new Trend(`choreo_latency_${pair.name}`, true),
      aksErrorRate: new Rate(`aks_errors_${pair.name}`),
      choreoErrorRate: new Rate(`choreo_errors_${pair.name}`)
    };
  });
}

// Configuration
const BASE_URL_AKS = 'https://api.central.ballerina.io/2.0';
const BASE_URL_CHOREO = 'https://choreo.api.central.ballerina.io/2.0';
const USER_UUID = __ENV.USER_UUID || ''; 
const ORG_NAME = __ENV.ORG_NAME || ''; 
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''; 
const FRONTEND_AUTH_TOKEN = __ENV.FRONTEND_AUTH_TOKEN || ''; 

// Define your endpoint pairs
const endpointPairs = [
  {
    name: 'get_package_versions',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/registry/packages/ballerina/http` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/registry/packages/ballerina/http` }
  },
  {
    name: 'get_package_details',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/registry/packages/ballerina/http/*` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/registry/packages/ballerina/http/*` }
  },
  {
    name: 'resove_package_dependencies',
    aks: {
      method: 'POST',
      url: `${BASE_URL_AKS}/registry/packages/resolve-dependencies`,
      body: JSON.stringify({"packages":[{"org":"ballerina","name":"file","version":"1.7.1","mode":"medium"},{"org":"ballerina","name":"observe","version":"1.0.7","mode":"medium"},{"org":"ballerina","name":"task","version":"2.3.2","mode":"medium"},{"org":"ballerina","name":"jwt","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"os","version":"1.6.0","mode":"medium"},{"org":"ballerina","name":"mime","version":"2.7.1","mode":"medium"},{"org":"ballerina","name":"io","version":"1.4.1","mode":"medium"},{"org":"ballerina","name":"log","version":"2.7.1","mode":"medium"},{"org":"ballerina","name":"time","version":"2.2.4","mode":"medium"},{"org":"ballerina","name":"constraint","version":"1.2.0","mode":"medium"},{"org":"ballerina","name":"cache","version":"3.5.0","mode":"medium"},{"org":"ballerina","name":"auth","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"http","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"websocket","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"oauth2","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"crypto","version":"2.3.1","mode":"medium"},{"org":"ballerina","name":"url","version":"2.2.4","mode":"medium"}]}),
      headers: { 'Content-Type': 'application/json' }
    },
    choreo: {
      method: 'POST',
      url: `${BASE_URL_CHOREO}/registry/packages/resolve-dependencies`,
      body: JSON.stringify({"packages":[{"org":"ballerina","name":"file","version":"1.7.1","mode":"medium"},{"org":"ballerina","name":"observe","version":"1.0.7","mode":"medium"},{"org":"ballerina","name":"task","version":"2.3.2","mode":"medium"},{"org":"ballerina","name":"jwt","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"os","version":"1.6.0","mode":"medium"},{"org":"ballerina","name":"mime","version":"2.7.1","mode":"medium"},{"org":"ballerina","name":"io","version":"1.4.1","mode":"medium"},{"org":"ballerina","name":"log","version":"2.7.1","mode":"medium"},{"org":"ballerina","name":"time","version":"2.2.4","mode":"medium"},{"org":"ballerina","name":"constraint","version":"1.2.0","mode":"medium"},{"org":"ballerina","name":"cache","version":"3.5.0","mode":"medium"},{"org":"ballerina","name":"auth","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"http","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"websocket","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"oauth2","version":"2.8.0","mode":"medium"},{"org":"ballerina","name":"crypto","version":"2.3.1","mode":"medium"},{"org":"ballerina","name":"url","version":"2.2.4","mode":"medium"}]}),
      headers: { 'Content-Type': 'application/json' }
    },
  },
  {
    name: 'search_packages',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/registry/search-packages?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/registry/search-packages?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC` }
  },
  {
    name: 'search_package_symbols',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/registry/search-symbols?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/registry/search-symbols?q=org:ballerina&offset=0&limit=10&readme=false&sort=relevance,DESC` }
  },
  {
    name: 'package_search_suggestions',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/registry/search-suggestions?q=goog&mode=all` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/registry/search-suggestions?q=goog&mode=all` }
  },
  {
    name: 'get_organizations_of_user',
    aks: {
      method: 'GET',
      url: `${BASE_URL_AKS}/users/${USER_UUID}/organizations`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    },
    choreo: {
      method: 'GET',
      url: `${BASE_URL_CHOREO}/users/${USER_UUID}/organizations`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    }
  },
  {
    name: 'get_asgardeo_organizations_of_user',
    aks: {
      method: 'GET',
      url: `${BASE_URL_AKS}/users/${USER_UUID}/organizations/asgardeo`,
      params: { headers: { Authorization: `Bearer ${FRONTEND_AUTH_TOKEN}` } }
    },
    choreo: {
      method: 'GET',
      url: `${BASE_URL_CHOREO}/users/${USER_UUID}/organizations/asgardeo`,
      params: { headers: { Authorization: `Bearer ${FRONTEND_AUTH_TOKEN}` } }
    }
  },
  {
    name: 'get_users_of_organization',
    aks: {
      method: 'GET',
      url: `${BASE_URL_AKS}/organizations/${ORG_NAME}/users`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    },
    choreo: {
      method: 'GET',
      url: `${BASE_URL_CHOREO}/organizations/${ORG_NAME}/users`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    }
  },
  {
    name: 'get_invitations_of_organization',
    aks: {
      method: 'GET',
      url: `${BASE_URL_AKS}/organizations/${ORG_NAME}/invitations`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    },
    choreo: {
      method: 'GET',
      url: `${BASE_URL_CHOREO}/organizations/${ORG_NAME}/invitations`,
      params: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    }
  },
  {
    name: 'graphql_package_details',
    aks: {
      method: 'POST',
      url: `${BASE_URL_AKS}/graphql`,
      body: JSON.stringify({ query, variables: { orgName: "ballerina", packageName: "graphql", version: "1.16.0" } }),
      params: { headers: { 'Content-Type': 'application/json' } }
    },
    choreo: {
      method: 'POST',
      url: `${BASE_URL_CHOREO}/graphql`,
      body: JSON.stringify({ query, variables: { orgName: "ballerina", packageName: "graphql", version: "1.16.0" } }),
      params: { headers: { 'Content-Type': 'application/json' } }
    }
  },
  {
    name: 'get_latest_stdlib',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/docs/stdlib/latest` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/docs/stdlib/latest` }
  },
  {
    name: 'get_package_docs',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/docs/ballerina/http/2.14.1` },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/docs/ballerina/http/2.14.1` }
  },
  {
    name: 'get_list_of_distributions',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/update-tool/distributions`, params: { headers: { 'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1' } } },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/update-tool/distributions`, params: { headers: { 'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1' } } }
  },
  {
    name: 'get_update_versions',
    aks: { method: 'GET', url: `${BASE_URL_AKS}/update-tool/update/versions`, headers: { 'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1' } },
    choreo: { method: 'GET', url: `${BASE_URL_CHOREO}/update-tool/update/versions`, headers: { 'User-Agent': 'ballerina/slalpha5 (linux-64) Updater/1.3.1' } }
  },
];

// Initialize metrics after defining endpoint pairs
initializeMetrics();

// Test configuration
export const options = {
  scenarios: {
    // Warm-up phase
    warmup: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      tags: { test_type: 'warmup' },
    },
    comparison_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m30s',
      startTime: '30s',
      tags: { test_type: 'main' },
    },
    // Load spike test (optional)
    // spike_test: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '30s', target: 50 },
    //     { duration: '1m', target: 50 },
    //     { duration: '30s', target: 0 },
    //   ],
    //   startTime: '3m',
    //   tags: { test_type: 'spike' },
    // },
  },
};

export default function () {
  // Test each endpoint pair
  endpointPairs.forEach((pair, index) => {
    group(`Endpoint Pair: ${pair.name}`, function () {
      // Test AKS endpoint
      group('AKS', function () {
        const aksResponse = http.request(pair.aks.method, pair.aks.url, pair.aks.body || null, {
          tags: { 
            platform: 'aks', 
            endpoint: pair.name,
            test_type: __ITER < 10 ? 'warmup' : 'main' // First 10 iterations are warmup
          },
          headers: pair.aks.params ? pair.aks.params.headers : {},
        });
        // console.log(` AKS response: `, JSON.stringify(aksResponse, null, 2));

        const aksSuccess = check(aksResponse, {
          'AKS status is 200': (r) => r.status === 200,
        });
        
        if (aksSuccess) {
          endpointMetrics[pair.name].aksLatency.add(aksResponse.timings.duration);
        }
        endpointMetrics[pair.name].aksErrorRate.add(!aksSuccess);
      });
      
      // Test Choreo endpoint
      group('Choreo', function () {
        const choreoResponse = http.request(pair.choreo.method, pair.choreo.url, pair.choreo.body || null, {
          tags: { 
            platform: 'choreo', 
            endpoint: pair.name,
            test_type: __ITER < 10 ? 'warmup' : 'main'
          },
          headers: pair.choreo.params ? pair.choreo.params.headers : {},
        });
        // console.log(` Choreo response: `, JSON.stringify(choreoResponse, null, 2));
        const choreoSuccess = check(choreoResponse, {
          'Choreo status is 200': (r) => r.status === 200,
        });
        
        if (choreoSuccess) {
          endpointMetrics[pair.name].choreoLatency.add(choreoResponse.timings.duration);
        }
        endpointMetrics[pair.name].choreoErrorRate.add(!choreoSuccess);
      });
    });
  });
}

export function handleSummary(data) {
  // Generate detailed comparison report
  const report = generateComparisonReport(data);
  
  return {
    'stdout': '\n' + report,
    'performance-comparison.json': JSON.stringify(data, null, 2),
    'performance-summary.txt': report,
  };
}

function generateComparisonReport(data) {
  let report = '\n=== ENDPOINT-BY-ENDPOINT PERFORMANCE COMPARISON ===\n\n';
  
  // Overall statistics
  report += '📊 OVERALL TEST METRICS:\n';
  report += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  report += `Test Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s\n`;
  report += `Average RPS: ${(data.metrics.http_reqs.values.rate || 0).toFixed(2)}\n`;
  report += `Overall Avg Duration: ${(data.metrics.http_req_duration.values.avg / 1000).toFixed(3)}s\n`;
  report += `Overall p95: ${(data.metrics.http_req_duration.values['p(95)'] / 1000).toFixed(3)}s\n`;
  report += `Overall p99: ${(data.metrics.http_req_duration.values['p(99)'] / 1000).toFixed(3)}s\n\n`;
  
  // Per-endpoint comparison
  report += '🎯 ENDPOINT PERFORMANCE COMPARISON:\n';
  report += ''.padEnd(80, '=') + '\n';
  
  let totalImprovement = 0;
  let improvedEndpoints = 0;
  let degradedEndpoints = 0;
  
  endpointPairs.forEach((pair, index) => {
    const aksMetricName = `aks_latency_${pair.name}`;
    const choreoMetricName = `choreo_latency_${pair.name}`;
    const aksErrorMetricName = `aks_errors_${pair.name}`;
    const choreoErrorMetricName = `choreo_errors_${pair.name}`;
    
    report += `\n${index + 1}. ${pair.name.toUpperCase().replace(/_/g, ' ')}  ${pair.aks.url.replace(BASE_URL_AKS, '')}\n`;
    report += ''.padEnd(50, '-') + '\n';
    
    if (data.metrics[aksMetricName] && data.metrics[choreoMetricName]) {
      const aksAvg = data.metrics[aksMetricName].values.avg / 1000;
      const aksMin = data.metrics[aksMetricName].values.min / 1000;
      const aksMax = data.metrics[aksMetricName].values.max / 1000;
      const aksp99 = (data.metrics[aksMetricName].values['p(99)'] || 0) / 1000;
      
      const choreoAvg = data.metrics[choreoMetricName].values.avg / 1000;
      const choreoMin = data.metrics[choreoMetricName].values.min / 1000;
      const choreoMax = data.metrics[choreoMetricName].values.max / 1000;
      const choreop99 = (data.metrics[choreoMetricName].values['p(99)'] || 0) / 1000;
      
      // Calculate improvement/degradation
      const avgDiff = choreoAvg - aksAvg;
      const avgPercent = (avgDiff / aksAvg * 100);
      
      report += `AKS Latency:     Avg: ${aksAvg.toFixed(3)}s | Min: ${aksMin.toFixed(3)}s | Max: ${aksMax.toFixed(3)}s | p99: ${aksp99.toFixed(3)}s\n`;
      report += `Choreo Latency:  Avg: ${choreoAvg.toFixed(3)}s | Min: ${choreoMin.toFixed(3)}s | Max: ${choreoMax.toFixed(3)}s | p99: ${choreop99.toFixed(3)}s\n`;
      
      // Performance verdict with detailed comparisons
      report += `\nComparison:\n`;
      report += `  Avg: ${avgDiff >= 0 ? '+' : ''}${avgDiff.toFixed(3)}s (${avgPercent >= 0 ? '+' : ''}${avgPercent.toFixed(1)}%)\n`;
      report += `  Min: ${choreoMin >= aksMin ? '+' : ''}${(choreoMin - aksMin).toFixed(3)}s (${((choreoMin - aksMin) / aksMin * 100).toFixed(1)}%)\n`;
      report += `  Max: ${choreoMax >= aksMax ? '+' : ''}${(choreoMax - aksMax).toFixed(3)}s (${((choreoMax - aksMax) / aksMax * 100).toFixed(1)}%)\n`;
      report += `  p99: ${choreop99 >= aksp99 ? '+' : ''}${(choreop99 - aksp99).toFixed(3)}s (${((choreop99 - aksp99) / aksp99 * 100).toFixed(1)}%)\n`;
      
      if (avgPercent < -5) {
        report += `✅ IMPROVED: ${Math.abs(avgDiff).toFixed(3)}s faster avg (${Math.abs(avgPercent).toFixed(1)}% better)\n`;
        improvedEndpoints++;
        totalImprovement += avgPercent;
      } else if (avgPercent > 5) {
        report += `❌ DEGRADED: ${avgDiff.toFixed(3)}s slower avg (${avgPercent.toFixed(1)}% worse)\n`;
        degradedEndpoints++;
        totalImprovement += avgPercent;
      } else {
        report += `⚖️  SIMILAR: Avg difference of ${avgDiff.toFixed(3)}s (${avgPercent.toFixed(1)}%)\n`;
      }
      
      // Error rate comparison
      if (data.metrics[aksErrorMetricName] && data.metrics[choreoErrorMetricName]) {
        const aksErrors = (data.metrics[aksErrorMetricName].values.rate * 100);
        const choreoErrors = (data.metrics[choreoErrorMetricName].values.rate * 100);
        report += `Error Rates:     AKS: ${aksErrors.toFixed(2)}% | Choreo: ${choreoErrors.toFixed(2)}%\n`;
      }
      
      report += `URLs Tested:\n`;
      report += `  AKS:    ${pair.aks.url}\n`;
      report += `  Choreo: ${pair.choreo.url}\n`;
      
    } else {
      report += `❌ No data available for this endpoint pair\n`;
    }
  });
  
  // Summary section
  report += '\n' + ''.padEnd(80, '=') + '\n';
  report += '📈 MIGRATION SUMMARY:\n';
  report += `Improved Endpoints: ${improvedEndpoints}/${endpointPairs.length}\n`;
  report += `Degraded Endpoints: ${degradedEndpoints}/${endpointPairs.length}\n`;
  report += `Similar Performance: ${endpointPairs.length - improvedEndpoints - degradedEndpoints}/${endpointPairs.length}\n`;
  
  if (endpointPairs.length > 0) {
    const avgImprovement = totalImprovement / endpointPairs.length;
    if (avgImprovement < -2) {
      report += `\n🎉 OVERALL VERDICT: Choreo shows ${Math.abs(avgImprovement).toFixed(1)}% better performance on average\n`;
      report += `✅ RECOMMENDATION: Proceed with migration to Choreo\n`;
    } else if (avgImprovement > 2) {
      report += `\n⚠️  OVERALL VERDICT: AKS shows ${avgImprovement.toFixed(1)}% better performance on average\n`;
      report += `🤔 RECOMMENDATION: Investigate Choreo performance issues before migration\n`;
    } else {
      report += `\n⚖️  OVERALL VERDICT: Performance is similar between platforms\n`;
      report += `💡 RECOMMENDATION: Consider other factors (cost, features, ops complexity)\n`;
    }
  }
  
  report += '\n' + ''.padEnd(80, '=') + '\n';
  return report;
}
