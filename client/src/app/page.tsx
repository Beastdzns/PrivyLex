"use client"
import { useAccount } from "wagmi"
import Navbar from "@/components/Navbar";
import Home from "@/components/Home";
export default function App() {
  const { isConnected } = useAccount();
  
  return(
    <div>
      <Navbar />
      <Home />
    </div>
  )
}