"use client"
import { useAccount } from "wagmi"

export default function Navbar() {
  const { isConnected, address } = useAccount();
  
  return(
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">
                Privy<span className="text-purple-300">Lex</span>
              </h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#" className="text-white/90 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-white/10">
                Dashboard
              </a>
              <a href="#" className="text-white/90 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-white/10">
                Compute
              </a>
              <a href="#" className="text-white/90 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-white/10">
                Marketplace
              </a>
              <a href="#" className="text-white/90 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-white/10">
                About
              </a>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}
            
            <div className="flex items-center">
              <w3m-button />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white/90 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors duration-200">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}