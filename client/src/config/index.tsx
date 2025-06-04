'use client';
import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { defineChain } from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if(!projectId) {
    throw new Error('Project Id is not defined.')
}

export const bellecour = defineChain({
  id: 0x86, // Bellecour Chain ID
  caipNetworkId: "eip155:134", // CAIP-2 compliant network ID
  chainNamespace: "eip155",
  name: "iExec Sidechain",
  nativeCurrency: {
    decimals: 18,
    name: "xRLC",
    symbol: "xRLC",
  },
  rpcUrls: {
    default: {
      http: ["https://bellecour.iex.ec"],
      webSocket: ["wss://bellecour.iex.ec/ws"], // WebSocket support
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout-bellecour.iex.ec" },
  },
});

export const networks = [mainnet, sepolia, bellecour];

export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage
    }),
    ssr: true,
    networks,
    projectId
})

export const config = wagmiAdapter.wagmiConfig