/**
 * AgentPortfolioReporter ABI
 * ABI for the on-chain reporter contract on Base
 */
export const AgentPortfolioReporter = {
  abi: [
    {
      "type": "constructor",
      "inputs": [
        { "name": "_agent", "type": "address", "internalType": "address" },
        { "name": "_priceSetter", "type": "address", "internalType": "address" },
        { "name": "initialOwner", "type": "address", "internalType": "address" }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "MAX_STALENESS",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "PRICE_SCALE",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "agent",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "priceSetter",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "reportedUsdcBalance",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "holdings",
      "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "prices",
      "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "priceUpdatedAt",
      "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "isSupportedStock",
      "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "allStockIds",
      "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "addStock",
      "inputs": [{ "name": "stockId", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "removeStock",
      "inputs": [{ "name": "stockId", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "reportHoldings",
      "inputs": [
        { "name": "stockId", "type": "bytes32", "internalType": "bytes32" },
        { "name": "shares", "type": "uint256", "internalType": "uint256" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "reportBatchHoldings",
      "inputs": [
        { "name": "stockIds", "type": "bytes32[]", "internalType": "bytes32[]" },
        { "name": "shares", "type": "uint256[]", "internalType": "uint256[]" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "reportUsdcBalance",
      "inputs": [{ "name": "balance", "type": "uint256", "internalType": "uint256" }],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setPrice",
      "inputs": [
        { "name": "stockId", "type": "bytes32", "internalType": "bytes32" },
        { "name": "priceScaled", "type": "uint256", "internalType": "uint256" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setBatchPrices",
      "inputs": [
        { "name": "stockIds", "type": "bytes32[]", "internalType": "bytes32[]" },
        { "name": "priceScaleds", "type": "uint256[]", "internalType": "uint256[]" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "latestPrice",
      "inputs": [{ "name": "stockId", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [
        { "name": "priceScaled", "type": "uint256", "internalType": "uint256" },
        { "name": "updatedAt", "type": "uint256", "internalType": "uint256" },
        { "name": "stale", "type": "bool", "internalType": "bool" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getPrices",
      "inputs": [{ "name": "stockIds", "type": "bytes32[]", "internalType": "bytes32[]" }],
      "outputs": [
        { "name": "pricesOut", "type": "uint256[]", "internalType": "uint256[]" },
        { "name": "updatedAts", "type": "uint256[]", "internalType": "uint256[]" },
        { "name": "stales", "type": "bool[]", "internalType": "bool[]" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "isFresh",
      "inputs": [{ "name": "stockId", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "totalValueUsdScaled",
      "inputs": [],
      "outputs": [{ "name": "value", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getStockValue",
      "inputs": [{ "name": "stockId", "type": "bytes32", "internalType": "bytes32" }],
      "outputs": [{ "name": "valueUsdScaled", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getAllStocks",
      "inputs": [],
      "outputs": [{ "name": "", "type": "bytes32[]", "internalType": "bytes32[]" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getAllHoldings",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256[]", "internalType": "uint256[]" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "setAgent",
      "inputs": [{ "name": "newAgent", "type": "address", "internalType": "address" }],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setPriceSetter",
      "inputs": [{ "name": "newSetter", "type": "address", "internalType": "address" }],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "owner",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "event",
      "name": "StockAdded",
      "inputs": [{ "name": "stockId", "type": "bytes32", "indexed": true, "indexed": true }],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "StockRemoved",
      "inputs": [{ "name": "stockId", "type": "bytes32", "indexed": true }],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "HoldingsUpdated",
      "inputs": [
        { "name": "stockId", "type": "bytes32", "indexed": true },
        { "name": "shares", "type": "uint256", "indexed": false },
        { "name": "agent_", "type": "address", "indexed": false }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "UsdcBalanceUpdated",
      "inputs": [
        { "name": "balance", "type": "uint256", "indexed": false },
        { "name": "agent_", "type": "address", "indexed": false }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "PriceUpdated",
      "inputs": [
        { "name": "stockId", "type": "bytes32", "indexed": true },
        { "name": "price", "type": "uint256", "indexed": false },
        { "name": "timestamp", "type": "uint256", "indexed": false }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "AgentUpdated",
      "inputs": [
        { "name": "oldAgent", "type": "address", "indexed": false },
        { "name": "newAgent", "type": "address", "indexed": false }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "PriceSetterUpdated",
      "inputs": [
        { "name": "oldSetter", "type": "address", "indexed": false },
        { "name": "newSetter", "type": "address", "indexed": false }
      ],
      "anonymous": false
    }
  ]
};
