require('@nomiclabs/hardhat-waffle')
require('@atixlabs/hardhat-time-n-mine')
require('@nomiclabs/hardhat-etherscan')
require('dotenv').config()

const deployer = process.env.DEPLOYER_PRIVATE_KEY
const etherscanApiKey = process.env.ETHERSCAN_API_KEY
const chainId = Number(process.env.FORK_CHAIN_ID) || 31337
const rinkebyRPC = process.env.RINKEBY_RPC
const mainnetRPC = process.env.MAINNET_RPC

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
      {
        version: '0.7.5',
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId,
      gas: 'auto',
      forking: { url: mainnetRPC },
    },
    mainnet: {
      url: mainnetRPC,
      accounts: deployer ? [deployer] : deployer,
    },
    rinkeby: {
      url: rinkebyRPC,
      accounts: deployer ? [deployer] : deployer,
    },
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  mocha: {
    timeout: 5 * 60 * 10000,
  },
}
