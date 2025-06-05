"use client"
import { useState, useEffect } from "react"
import { useAccount, useWalletClient } from "wagmi"
import { IExecDataProtector, createArrayBufferFromFile } from '@iexec/dataprotector'
import { EIP1193Provider } from "viem"
import { type ProcessProtectedDataParams } from "@iexec/dataprotector";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  protected: boolean;
  protectedDataAddress?: string;
  fileData?: File;
  accessGranted?: boolean;
  multiaddr?: string | null;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Home() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProtecting, setIsProtecting] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type === "application/pdf" || 
          file.type === "application/msword" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const newFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date(),
          protected: false,
          fileData: file // Store the file data for further processing
        };
        setUploadedFiles(prev => [...prev, newFile]);
      }
    });
  };

  const protectDocument = async (fileId: string) => {
    if (!walletClient) {
      console.error('Wallet not connected');
      return;
    }
    
    setIsProtecting(true);
    
    try {
      // Use walletClient directly as EIP1193Provider - similar to your reference
      const providerToUse = walletClient as unknown as EIP1193Provider;
      
      if (!providerToUse) {
        throw new Error("No valid Web3 provider found.");
      }

      console.log('Web3 Provider: ', providerToUse);
      
      // Initialize IExecDataProtector directly with the provider
      const iexecDataProtector = new IExecDataProtector(providerToUse, {
        iexecOptions: {
          smsURL: 'https://sms.labs.iex.ec',
        }
    });
      
      // Find the file to protect
      const fileToProtect = uploadedFiles.find(file => file.id === fileId);
      if (!fileToProtect || !fileToProtect.fileData) {
        throw new Error('File not found');
      }
      
      const fileAsArrayBuffer = await createArrayBufferFromFile(fileToProtect.fileData);
      
      // Protect the document using iExec DataProtector core
      const protectedData = await iexecDataProtector.core.protectData({
        data: {
          file: fileAsArrayBuffer
        },
        name: `Protected ${fileToProtect.name}`,
        onStatusUpdate: ({ title, isDone }) => {
            console.log(title, isDone);
        },
        allowDebug: true,
      });
      
      // Extract multiaddr from response if available
      const multiaddr = protectedData.multiaddr || null;
      
      // Update the file with protected data address and multiaddr
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId ? { 
            ...file, 
            protected: true,
            protectedDataAddress: protectedData.address,
            accessGranted: false,
            multiaddr: multiaddr
          } : file
        )
      );
      
      console.log('Document protected successfully:', protectedData);
      
    } catch (error) {
      console.error('Error protecting document:', error);
      // You might want to show an error message to the user
    } finally {
      setIsProtecting(false);
    }
  };

  const grantAccessToDocument = async (fileId: string) => {
    if (!walletClient || !address) {
      console.error('Wallet not connected');
      return;
    }
    
    setIsGrantingAccess(true);
    
    try {
      const providerToUse = walletClient as unknown as EIP1193Provider;
      const iexecDataProtector = new IExecDataProtector(providerToUse, {
        iexecOptions: {
          smsURL: 'https://sms.labs.iex.ec',
        }
    });
      
      // Find the file to grant access to
      const fileToGrant = uploadedFiles.find(file => file.id === fileId);
      if (!fileToGrant || !fileToGrant.protectedDataAddress) {
        throw new Error('Protected file not found');
      }
      
      const grantedAccess = await iexecDataProtector.core.grantAccess({
        protectedData: fileToGrant.protectedDataAddress,
        authorizedApp: '0xD6A86508B723Cc698AB83c0cA4FA6e8F0818B970',
        authorizedUser: address, // Use the user's wallet address
      });
      
      // Update the file with access granted status
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId ? { 
            ...file, 
            accessGranted: true
          } : file
        )
      );
    
      console.log('Access granted successfully:', grantedAccess);
      
    } catch (error) {
      console.error('Error granting access:', error);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const processProtectedData = async () => {
    if (!selectedFile || !selectedFile.protectedDataAddress || !userInput.trim() || !walletClient) {
      console.error('Missing required data for processing');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: userInput,
        sender: 'user',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      setUserInput(''); // Clear input field
      
      // Prepare AI processing message
      const processingMessage: ChatMessage = {
        id: 'processing-' + Date.now().toString(),
        text: 'Analyzing document, please wait...',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, processingMessage]);
      
      const providerToUse = walletClient as unknown as EIP1193Provider;
      const iexecDataProtector = new IExecDataProtector(providerToUse, {
        iexecOptions: {
          smsURL: 'https://sms.labs.iex.ec',
        }
      });
      
      // Build IPFS URL from multiaddr if available
      let inputFiles: string[] = [];
      if (selectedFile.multiaddr) {
        // Extract the address part from multiaddr
        const match = selectedFile.multiaddr.match(/\/p2p\/([^/]+)/);
        if (match && match[1]) {
          const ipfsAddress = match[1];
          const ipfsUrl = `https://ipfs-gateway.v8-bellecour.iex.ec/ipfs/${ipfsAddress}`;
          inputFiles = [ipfsUrl];
        }
      }
      
      const processProtectedDataResponse = await iexecDataProtector.core.processProtectedData({
        protectedData: selectedFile.protectedDataAddress,
        app: '0xD6A86508B723Cc698AB83c0cA4FA6e8F0818B970',
        args: userInput,
        inputFiles: inputFiles,
        workerpool: 'tdx-labs.pools.iexec.eth',
        onStatusUpdate: ({ title, isDone }) => {
          console.log(title, isDone);
        }
      });
      
      console.log('Process response:', processProtectedDataResponse);
      
      // Update the chat with the result directly from the response
      if (processProtectedDataResponse && processProtectedDataResponse.result) {
        // Extract result
        let resultText: string;
        if (processProtectedDataResponse.result instanceof ArrayBuffer) {
          // Convert ArrayBuffer to string using TextDecoder
          resultText = new TextDecoder().decode(processProtectedDataResponse.result);
          resultText = resultText.trim();
        } else if (processProtectedDataResponse.result) {
          resultText = typeof processProtectedDataResponse.result === 'object' && processProtectedDataResponse.result !== null
            ? JSON.stringify(processProtectedDataResponse.result)
            : String(processProtectedDataResponse.result) || 'Analysis completed. No specific insights found.';
        } else {
          resultText = 'Analysis completed. No specific insights found.';
        }
        
        // Update chat messages
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === processingMessage.id 
              ? {
                  ...msg,
                  id: 'result-' + Date.now().toString(),
                  text: resultText,
                  timestamp: new Date()
                }
              : msg
          )
        );
      } else if (processProtectedDataResponse && processProtectedDataResponse.taskId) {
        // If we have a taskId but no direct result, show the task ID as reference
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === processingMessage.id 
              ? {
                  ...msg,
                  id: 'result-' + Date.now().toString(),
                  text: `Analysis completed. Task ID: ${processProtectedDataResponse.taskId}`,
                  timestamp: new Date()
                }
              : msg
          )
        );
      } else {
        // Update the processing message if no result or taskId
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === processingMessage.id 
              ? {
                  ...msg,
                  id: 'error-' + Date.now().toString(),
                  text: 'Unable to process document. Please try again.',
                  timestamp: new Date()
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error processing protected data:', error);
      
      // Add error message to chat
      setChatMessages(prev => [
        ...prev.filter(msg => !msg.id.startsWith('processing-')), // Remove processing message
        {
          id: 'error-' + Date.now().toString(),
          text: 'Error analyzing document. Please try again later.',
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && userInput.trim()) {
      e.preventDefault();
      processProtectedData();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center backdrop-blur-md bg-white/5 p-10 rounded-xl shadow-2xl border border-white/10">
          <h2 className="text-4xl font-bold text-white mb-6">Connect Your Wallet</h2>
          <p className="text-white/70 mb-8 text-lg">Please connect your wallet to unlock the power of the Legal Document Assistant.</p>
          {/* Placeholder for w3m-button if you want to add it here too, or guide user to navbar */}
          <div className="inline-block">
             <w3m-button />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 pt-28 pb-12"> {/* Increased pt for navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
            AI Legal Document <span className="text-purple-400">Assistant</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Securely upload your legal documents, protect them with iExec, and gain AI-powered insights with unparalleled privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Upload Section */}
          <div className="space-y-8">
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-3xl font-semibold text-white mb-6">Upload & Protect Documents</h2>
              
              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-in-out group ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-500/10 scale-105' 
                    : 'border-white/20 hover:border-purple-400 hover:bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleChange}
                  accept=".pdf,.doc,.docx"
                  multiple
                />
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-white/5 group-hover:bg-purple-500/10 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out transform group-hover:scale-110">
                    <svg className="w-10 h-10 text-white group-hover:text-purple-400 transition-colors duration-300 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-xl font-medium">Drop your legal documents here</p>
                    <p className="text-white/60 text-md">or <span className="text-purple-400 font-semibold">click to browse</span></p>
                  </div>
                  <p className="text-white/50 text-sm">Supports PDF, DOC, DOCX files</p>
                </div>
              </div>

              {/* Data Protection Info */}
              <div className="mt-8 p-5 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mt-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-blue-300 font-semibold text-md">Powered by iExec DataProtector</h3>
                  <p className="text-white/70 text-sm">Your documents are encrypted and processed with cutting-edge confidential computing technology, ensuring your data remains private.</p>
                </div>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-2xl font-semibold text-white mb-6">My Documents</h3>
                <div className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ease-in-out hover:shadow-xl cursor-pointer
                                  ${selectedFile?.id === file.id ? 'bg-purple-500/20 border-purple-400 shadow-purple-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                                        ${selectedFile?.id === file.id ? 'bg-purple-500/30' : 'bg-red-500/10'}`}>
                          <svg className={`w-6 h-6 ${selectedFile?.id === file.id ? 'text-purple-300' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-md font-medium ${selectedFile?.id === file.id ? 'text-purple-200' : 'text-white'}`}>{file.name}</p>
                          <p className={`text-xs ${selectedFile?.id === file.id ? 'text-purple-300/80' : 'text-white/60'}`}>{formatFileSize(file.size)} - {file.uploadDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {file.accessGranted ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 shadow-sm">
                            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Access Granted
                          </span>
                        ) : file.protected ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); grantAccessToDocument(file.id); }}
                            disabled={isGrantingAccess}
                            className="px-4 py-2 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                          >
                            {isGrantingAccess ? 'Granting...' : 'Grant Access'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); protectDocument(file.id); }}
                            disabled={isProtecting}
                            className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                          >
                            {isProtecting ? 'Protecting...' : 'Protect Document'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col h-[calc(100vh-10rem)] max-h-[700px]"> {/* Adjusted height */}
            <h2 className="text-3xl font-semibold text-white mb-6">AI Legal Assistant</h2>
            
            {selectedFile ? (
              <div className="flex flex-col flex-grow space-y-6 overflow-hidden">
                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-md font-medium">Analyzing: <span className="text-white">{selectedFile.name}</span></p>
                  {!selectedFile.accessGranted && (
                    <p className="text-yellow-400 text-xs mt-1.5">
                      {selectedFile.protected ? 
                        "Please grant access to this document to interact with the AI assistant." : 
                        "This document must be protected before AI analysis."}
                    </p>
                  )}
                </div>
                
                {/* Chat Messages Area */}
                <div className="flex-grow bg-black/20 rounded-xl p-6 overflow-y-auto space-y-6 border border-white/10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`flex items-end space-x-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                        {message.sender === 'ai' && (
                          <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center border-2 border-purple-400 shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className={`max-w-xs lg:max-w-md p-4 rounded-2xl shadow-md ${
                          message.sender === 'user' 
                            ? 'bg-blue-600/50 text-white rounded-br-none ml-10' 
                            : 'bg-white/10 text-white/90 rounded-bl-none mr-10'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          <p className={`text-xs mt-2 opacity-60 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {message.sender === 'user' && (
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white/60">
                       <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-purple-400/30">
                        <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12c0-4.556 3.862-8.25 8.625-8.25S21 7.444 21 12z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium">Hello! I'm your AI Legal Assistant.</p>
                      <p className="text-sm">Ask me anything about the selected document once access is granted.</p>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex space-x-3 items-center pt-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedFile.accessGranted ? "Ask about your document..." : "Grant access to chat..."}
                    className="flex-1 bg-black/20 border border-white/20 rounded-xl px-5 py-3.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ease-in-out shadow-sm"
                    disabled={!selectedFile.accessGranted || isProcessing}
                  />
                  <button 
                    onClick={processProtectedData}
                    disabled={!userInput.trim() || !selectedFile.accessGranted || isProcessing}
                    className="p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                  >
                    {isProcessing ? (
                      <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center text-center">
                <div>
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/10">
                    <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <p className="text-white/70 text-xl font-medium">Select a Document</p>
                  <p className="text-white/50 text-md">Choose a document from the list to begin your AI-powered legal analysis.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
            