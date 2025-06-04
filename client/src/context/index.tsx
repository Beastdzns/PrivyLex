'use client';

import { wagmiAdapter, projectId, bellecour } from "@/config";
import { createAppKit } from "@reown/appkit";
import { mainnet, sepolia } from "@reown/appkit/networks";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

const queryClient = new QueryClient();

if(!projectId) {
    throw new Error('Project Id is not defined.');  
}

const metadata = {
    name: "privylex",
    description: "legal AI agent with secure data storage",
    url: "https://privylex.com",
    icons: ["https://privylex.com/favicon.ico"],
}

const modal = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [mainnet, sepolia, bellecour],
    defaultNetwork: bellecour,
    features: {
        analytics: true,
        email: false,
        socials: false,
        emailShowWallets: true,
    },
    themeMode: "dark",
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null}) {
    const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)
    
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default ContextProvider;
