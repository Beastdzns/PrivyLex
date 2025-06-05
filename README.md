# PrivyLex

## 📄 Project Description

PrivyLex is an innovative **AI-powered legal assistant** designed to simplify legal inquiries, streamline document analysis, and provide reliable legal guidance. Built with a strong emphasis on privacy and data security, PrivyLex leverages cutting-edge technology to offer a secure and intelligent solution for legal assistance.

The folder, **PrivyLex**, specifically contains the **iApp (iExec Application)** component of the project, which is central to its secure and privacy-preserving operations. The client-side frontend, built with Next.js, is present in the **client** folder.

## ✨ Features

* **AI-Powered Legal Assistance**: Intelligently responds to legal queries and assists with understanding complex legal documents.
* **Secure Document Analysis**: Utilizes iExec's Data Protector to ensure the privacy and confidentiality of user data during document processing.
* **Guided Legal Insights**: Provides helpful guidance and information on various legal topics.
* **Privacy-First Design**: Built with user privacy as a core principle, ensuring sensitive legal data remains protected.
* **Secure Document Vault**: Using the IExec's Data Protector core, this vault contains your document and only you can access it, nobody else not even IExec.

## 🚀 Technologies Used

### PrivyLex (iApp)
* **iExec**: For secure confidential computing and data protection, enabling the AI models to process sensitive legal data without exposing it.
* **Python**: Likely used for the backend logic, AI model integration, and handling iExec worker tasks.
* **TypeScript**: (Based on initial GitHub analysis) Could be used for parts of the iApp logic or helper scripts.
* **Docker**: For containerization

### Client (Frontend)
* **Next.js**: A React framework for building the user interface, handling user interactions, and displaying legal information.

## ⚙️ Setup and Installation (for PrivyLex iApp)

To set up and run the PrivyLex iApp locally, you'll need to have the necessary iExec development environment configured.

**Prerequisites:**

* Node.js (for iExec SDK tools)
* Python (for backend logic and AI models)
* Git
* Docker

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/beastdzns/PrivyLex.git](https://github.com/beastdzns/PrivyLex.git)
    cd PrivyLex
    ```
2.  **Configure iExec (if applicable):**
    * Set up your iExec wallet and environment variables as per iExec documentation.
    * You might need to build your iApp image and push it to a registry. Refer to the iExec documentation for detailed steps on deploying and running iApps.

3.  **Run the iApp (conceptual):**

    ```bash
    EXPERIMENTAL_TDX_APP=true iapp run --args "prompt to the AI Model*" --inputFile *url*
    ```

    *Please refer to your project's specific iExec integration for precise execution instructions.*



## Working ##

![diagram](https://github.com/user-attachments/assets/98c50957-ff9e-4d0b-96bc-e1391acd7d74)

## 📖 Usage

Once the PrivyLex iApp is deployed and accessible (e.g., via the iExec marketplace or a private setup), it will serve as the confidential computing backend for the Next.js frontend. Users will interact with the legal assistant through the separate client application, which will send data to the iApp for secure processing.

## ⚖️ License

This project is licensed under the [Your Chosen License, e.g., MIT License]. See the `LICENSE` file for more details.
*(Remember to add a `LICENSE` file to your repository if you haven't already).*
