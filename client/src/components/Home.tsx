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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-white/70">Please connect your wallet to access the Legal Document Assistant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Legal Document Assistant</h1>
          <p className="text-xl text-white/80">Upload your legal documents securely and get AI-powered insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-white mb-4">Upload Legal Documents</h2>
              
              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-500/20' 
                    : 'border-white/30 hover:border-white/50'
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
                  <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-lg">Drop your legal documents here</p>
                    <p className="text-white/60 text-sm">or click to browse</p>
                  </div>
                  <p className="text-white/50 text-xs">Supports PDF, DOC, DOCX files</p>
                </div>
              </div>

              {/* Data Protection Info */}
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <h3 className="text-blue-400 font-semibold text-sm">iExec Data Protection</h3>
                    <p className="text-white/70 text-xs">Your documents will be encrypted and protected using iExec's DataProtector before processing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Uploaded Documents</h3>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setSelectedFile(file)}>
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{file.name}</p>
                          <p className="text-white/60 text-xs">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.accessGranted ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Access Granted
                          </span>
                        ) : file.protected ? (
                          <button
                            onClick={() => grantAccessToDocument(file.id)}
                            disabled={isGrantingAccess}
                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors duration-200 disabled:opacity-50"
                          >
                            {isGrantingAccess ? 'Granting...' : 'Grant Access'}
                          </button>
                        ) : (
                          <button
                            onClick={() => protectDocument(file.id)}
                            disabled={isProtecting}
                            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors duration-200 disabled:opacity-50"
                          >
                            {isProtecting ? 'Protecting...' : 'Protect'}
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
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">AI Legal Assistant</h2>
            
            {selectedFile ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                  <p className="text-blue-400 text-sm font-medium">Analyzing: {selectedFile.name}</p>
                  {!selectedFile.accessGranted && (
                    <p className="text-yellow-400 text-xs mt-1">
                      {selectedFile.protected ? 
                        "Please grant access to this document to use the AI assistant." : 
                        "Please protect this document to use the AI assistant."}
                    </p>
                  )}
                </div>
                
                {/* Chat Messages Area */}
                <div className="h-96 bg-white/5 rounded-lg p-4 overflow-y-auto border border-white/10">
                  <div className="space-y-4">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((message) => (
                        <div key={message.id} className={`flex items-start space-x-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                          {message.sender === 'ai' && (
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className={`flex-1 p-3 rounded-lg ${
                            message.sender === 'user' 
                              ? 'bg-blue-600/40 ml-12' 
                              : 'bg-white/10'
                          }`}>
                            <p className="text-white/90 text-sm">{message.text}</p>
                          </div>
                          {message.sender === 'user' && (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-white/90 text-sm">Hello! I'm ready to help you analyze your legal document. What would you like to know about it?</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask questions about your legal document..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                    disabled={!selectedFile.accessGranted || isProcessing}
                  />
                  <button 
                    onClick={processProtectedData}
                    disabled={!userInput.trim() || !selectedFile.accessGranted || isProcessing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-center">
                <div>
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-white/60">Select a document to start analyzing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
