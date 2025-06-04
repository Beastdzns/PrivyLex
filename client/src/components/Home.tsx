"use client"
import { useState } from "react"
import { useAccount, useWalletClient } from "wagmi"
import { IExecDataProtector, createArrayBufferFromFile } from '@iexec/dataprotector'
import { EIP1193Provider } from "viem"

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  protected: boolean;
  protectedDataAddress?: string;
  fileData?: File;
}

export default function Home() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProtecting, setIsProtecting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

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
      const iexecDataProtector = new IExecDataProtector(providerToUse);
      
      // Find the file to protect
      const fileToProtect = uploadedFiles.find(file => file.id === fileId);
      if (!fileToProtect || !fileToProtect.fileData) {
        throw new Error('File not found');
      }
      
      // Convert file to buffer using the recommended helper function
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
      });
      
      // Update the file with protected data address
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId ? { 
            ...file, 
            protected: true,
            protectedDataAddress: protectedData.address
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
                      <div className="flex items-center space-x-3">
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
                        {file.protected ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => protectDocument(file.id)}
                            disabled={isProtecting}
                            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors duration-200 disabled:opacity-50"
                          >
                            {isProtecting ? 'Protecting...' : 'Protect'}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedFile(file)}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200"
                        >
                          Analyze
                        </button>
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
                </div>
                
                {/* Chat Messages Area */}
                <div className="h-96 bg-white/5 rounded-lg p-4 overflow-y-auto border border-white/10">
                  <div className="space-y-4">
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
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ask questions about your legal document..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                  />
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
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
