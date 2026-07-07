/**
 * RWA Fund Agent
 * LangChain-powered agent for managing the RWA Fund
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, create_openai_functions_agent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ethers } from 'ethers';
import { allTools } from './tools/index.js';
import { DinariClient } from './dinari.js';
import { BaseClient } from './base.js';
import { CasperClient } from './casper.js';

const FUNDED_SYMBOLS = ['TSLA', 'NVDA', 'AAPL'];

/**
 * System prompt for the RWA Fund Agent
 */
const SYSTEM_PROMPT = `You are an AI agent managing an RWA Fund that tokenizes real-world assets (dShares from Dinari).

Your responsibilities:
1. Monitor the fund's portfolio value by reading from Dinari API and the agent's wallet
2. Calculate the NAV (Net Asset Value) based on holdings and prices
3. Push NAV updates to the Casper Fund contract
4. Report holdings and prices to the Base AgentPortfolioReporter contract
5. Reconcile Dinari orders to ensure accurate holdings

The fund holds:
- dTSLA (Tesla shares via Dinari)
- dNVDA (Nvidia shares via Dinari) 
- dAAPL (Apple shares via Dinari)
- USDC (stablecoin)

Key workflows:
1. NAV Update Cycle:
   - Fetch current holdings from Dinari API
   - Fetch current prices from Dinari
   - Calculate total portfolio value
   - Push NAV to Casper Fund
   - Report to Base AgentPortfolioReporter

2. Order Reconciliation:
   - Check Dinari for filled/pending orders
   - Update reported holdings if needed
   - Alert on discrepancies

Always be accurate with numbers. 
- dShares have 18 decimals, USDC has 6 decimals
- Prices are scaled by 1e8 ($1 = 100,000,000)
- Contract calculates NAV from holdings × prices

If asked about performing actions, use the appropriate tools to execute them.`;

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', '{input}'],
  new MessagesPlaceholder({ variableName: 'agent_scratchpad' }),
]);

/**
 * Create and configure the agent
 */
export async function createAgent(config = {}) {
  const {
    openaiApiKey = process.env.OPENAI_API_KEY,
    modelName = 'gpt-4-turbo',
    temperature = 0,
  } = config;

  const llm = new ChatOpenAI({
    openaiApiKey,
    modelName,
    temperature,
    streaming: true,
  });

  const agent = await create_openai_functions_agent({
    llm,
    tools: allTools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools: allTools,
    verbose: true,
    maxIterations: 10,
  });

  return executor;
}

/**
 * Run the NAV update cycle (simplified, no LangChain)
 */
export async function runNavUpdateCycle(config) {
  const {
    dinariApiKey,
    agentPrivateKey,
    baseRpcUrl,
    reporterAddress,
  } = config;

  console.log('🔄 Starting NAV Update Cycle...\n');

  const dinari = new DinariClient(dinariApiKey);
  const base = new BaseClient(baseRpcUrl, agentPrivateKey, reporterAddress);

  // 1. Get holdings from Dinari
  console.log('📊 Fetching holdings from Dinari...');
  const holdings = {};
  for (const symbol of FUNDED_SYMBOLS) {
    try {
      const balance = await dinari.getBalances(agentPrivateKey);
      const token = balance?.find(b => b.symbol === symbol);
      if (token) {
        holdings[symbol] = BigInt(token.available);
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch ${symbol}: ${error.message}`);
    }
  }
  console.log('Holdings:', holdings);

  // 2. Get prices from Dinari
  console.log('\n💰 Fetching prices from Dinari...');
  const prices = await dinari.getPrices(FUNDED_SYMBOLS);
  console.log('Prices:', prices);

  // 3. Get USDC balance from agent wallet
  console.log('\n💵 Fetching USDC balance...');
  const usdcBalance = await base.getWalletUsdcBalance();
  console.log('USDC Balance:', usdcBalance.toString());

  // 4. Report to Base
  console.log('\n📝 Reporting to Base AgentPortfolioReporter...');
  
  // Report holdings
  const stockIds = [];
  const shareAmounts = [];
  for (const symbol of FUNDED_SYMBOLS) {
    stockIds.push(ethers.keccak256(ethers.toUtf8Bytes(symbol)));
    shareAmounts.push(holdings[symbol] || 0n);
  }
  
  try {
    await base.reportBatchHoldings(stockIds, shareAmounts);
  } catch (error) {
    console.log('⚠️ Could not report holdings:', error.message);
  }

  // Report prices
  const priceEntries = {};
  for (const [symbol, data] of Object.entries(prices)) {
    priceEntries[symbol] = data.price;
  }
  
  try {
    await base.setBatchPrices(priceEntries);
  } catch (error) {
    console.log('⚠️ Could not report prices:', error.message);
  }

  // Report USDC balance
  try {
    await base.reportUsdcBalance(usdcBalance);
  } catch (error) {
    console.log('⚠️ Could not report USDC balance:', error.message);
  }

  // 5. Get total value from Base
  const totalValue = await base.getTotalValue();
  console.log('\n💎 Total Portfolio Value:', totalValue.toString());

  // Return result for Casper push
  const result = {
    holdings,
    prices,
    usdcBalance: Number(usdcBalance),
    totalValue: totalValue.toString(),
  };

  console.log('\n✅ NAV Update Cycle Complete!');
  console.log('Note: Push to Casper requires signing key - use pushNavToCasper tool');
  
  return result;
}

/**
 * Push NAV to Casper Fund contract
 */
export async function pushNavToCasper(config) {
  const {
    casperRpcUrl,
    fundContractHash,
    oraclePrivateKey,
    holdings,
    prices,
    usdcBalance,
  } = config;

  console.log('📤 Pushing NAV to Casper...\n');

  const casper = new CasperClient(casperRpcUrl);

  // Build arrays for Casper
  const symbols = [];
  const quantities = [];
  const priceValues = [];
  
  for (const symbol of FUNDED_SYMBOLS) {
    if (holdings[symbol] || prices[symbol]) {
      symbols.push(symbol);
      // Convert BigInt to number for JSON serialization
      quantities.push(Number(holdings[symbol] || 0n));
      priceValues.push(Number(prices[symbol]?.price || 0n));
    }
  }

  // Note: Actual deploy signing would happen here
  // For now, return the data that would be sent
  console.log('Would push to Casper:');
  console.log({
    symbols,
    quantities,
    prices: priceValues,
    usdcBalance: Number(usdcBalance),
  });

  return {
    symbols,
    quantities,
    prices: priceValues,
    usdcBalance: Number(usdcBalance),
    note: 'Deploy signing requires Casper SDK - implement with casper-js-sdk',
  };
}

/**
 * Main entry point
 */
async function main() {
  // Check for required env vars
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  const command = process.argv[2] || 'agent';

  if (command === 'nav-update') {
    // Run NAV update cycle
    await runNavUpdateCycle({
      dinariApiKey: process.env.DINARI_API_KEY,
      agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
      baseRpcUrl: process.env.BASE_RPC_URL,
      reporterAddress: process.env.AGENT_PORTFOLIO_REPORTER_ADDRESS,
    });
  } else if (command === 'push-casper') {
    // Push NAV to Casper
    const navData = await runNavUpdateCycle({
      dinariApiKey: process.env.DINARI_API_KEY,
      agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
      baseRpcUrl: process.env.BASE_RPC_URL,
      reporterAddress: process.env.AGENT_PORTFOLIO_REPORTER_ADDRESS,
    });

    await pushNavToCasper({
      casperRpcUrl: process.env.CASPER_RPC_URL,
      fundContractHash: process.env.FUND_CONTRACT_HASH,
      oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY,
      holdings: navData.holdings,
      prices: navData.prices,
      usdcBalance: navData.usdcBalance,
    });
  } else if (command === 'agent') {
    // Start interactive agent
    console.log('🤖 Starting RWA Fund Agent...\n');
    
    const executor = await createAgent();
    
    // Simple CLI loop
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    console.log('RWA Fund Agent initialized. Type your queries or "exit" to quit.\n');

    while (true) {
      const input = await question('You: ');
      if (input.toLowerCase() === 'exit') break;
      
      try {
        const result = await executor.invoke({ input });
        console.log('\nAgent:', result.output);
      } catch (error) {
        console.error('Error:', error.message);
      }
    }

    rl.close();
  } else {
    console.log('Usage: node src/agent.js [nav-update|push-casper|agent]');
  }
}

// Export for use as module
export { runNavUpdateCycle, pushNavToCasper };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
