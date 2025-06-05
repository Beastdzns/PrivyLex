## Getting Started

Install the packages

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Create environment variable:
```bash
touch .env
nano .env
NEXT_PUBLIC_PROJECT_ID=YOUR_PROJECT_ID
```

## ✨ Key Features

This frontend application is built around a core workflow for handling sensitive legal data:

* **Secure Image/Document Upload**: Users can easily upload images (e.g., scanned legal documents, photos of contracts) or other supported document formats through a dedicated interface.
* **Granular Access Control**:
    * **Data Protection**: After uploading, users are empowered to **protect** their uploaded data. This involves linking the document to iExec's Data Protector mechanism, ensuring that the data remains confidential even when processed by the AI model.
    * **AI Access Management**: Users maintain full control over when and how their uploaded documents are accessed by the AI. They can explicitly **grant or revoke access** to the AI model for specific tasks, ensuring privacy and compliance.
* **AI-Powered Query & Document Processing**: Once access is granted by the user, the AI model (residing in the PrivyLex iApp backend) can perform various tasks on the uploaded documents and associated queries, such as:
    * Answering legal questions based on the document's content.
    * Summarizing key clauses or sections.
    * Identifying relevant legal entities or terms.
    * Providing contextual legal guidance.
* **Intuitive User Interface**: A clean and responsive design built with Next.js ensures a smooth user experience across devices.

---

## 🚀 Technologies Used

* **Next.js**: A powerful React framework for building server-side rendered (SSR) and static web applications, providing excellent performance and developer experience.
* **React**: For building interactive user interfaces and managing component-based architecture.
* **TypeScript**: Enhances code quality and maintainability with static type checking.
* **\[Your UI Library/Framework, e.g., Chakra UI, Material UI, Tailwind CSS]**: (Add if applicable) For consistent styling and UI components.
* **iExec SDK (Client-side integration)**: Used for interacting with the iExec network, managing data protection, and initiating iApp computations.
