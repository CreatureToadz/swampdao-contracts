import '@nomiclabs/hardhat-waffle'
import '@atixlabs/hardhat-time-n-mine'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-abi-exporter'
import 'hardhat-gas-reporter'
import '@typechain/hardhat'
import 'hardhat-deploy'
import * as dotenv from 'dotenv'

dotenv.config()

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
      gasMultiplier: 1.1,
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

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'usd',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    gasPrice:
      process.env.GAS_PRICE !== undefined
        ? parseInt(process.env.GAS_PRICE)
        : undefined,
  },

  abiExporter: {
    path: './abi',
    clear: false,
    flat: true,
    runOnCompile: true,
    // only: [':ERC20$'],
    only: [':Flyz*', ':sFlyz*'],
    except: [':*Mock$', ':*Test$'],
    spacing: 2,
    pretty: false,
  },

  typechain: {
    outDir: './types',
    target: 'ethers-v5',
  },

  namedAccounts: {
    deployer: {
      default: 0,
      4: '0xAeD9A2acFdFAC17AFF3c6ecf20D412E601d13A90',
      1: '0xAeD9A2acFdFAC17AFF3c6ecf20D412E601d13A90',
    },
  },
}
