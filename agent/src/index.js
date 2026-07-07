/**
 * RWA Fund Agent - Main Entry Point
 */
import 'dotenv/config';
import { runNavUpdateCycle } from './agent.js';

async function main() {
  console.log('🚀 RWA Fund Agent\n');

  // Check required env vars
  const required = ['OPENAI_API_KEY', 'DINARI_API_KEY', 'AGENT_PRIVATE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\nCopy .env.example to .env and fill in your values.');
    console.log('For demo mode, run with limited functionality.\n');
  }

  const config = {
    dinariApiKey: process.env.DINARI_API_KEY || 'demo-key',
    agentPrivateKey: process.env.AGENT_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    reporterAddress: process.env.AGENT_PORTFOLIO_REPORTER_ADDRESS || '0x0000000000000000000000000000000000000000',
    casperRpcUrl: process.env.CASPER_RPC_URL || 'https://rpc.mainnet.casperlabs.io',
    fundContractHash: process.env.FUND_CONTRACT_HASH || 'demo-hash',
  };

  // Run NAV update cycle
  await runNavUpdateCycle(config);
}

main().catch(console.error);
