// components/footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="text-gray-600 py-4 text-center text-base">
      <div className="container mx-auto px-4 flex flex-col items-center space-y-1">
        <p>&copy; 2025 Serapihm.</p>
        <p>
          Data by{" "}
          <a
            href="https://github.com/KHwang9883/MobileModels/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 underline"
          >
            KHwang9883/MobileModels
          </a>
        </p>
        <p>
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="license noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 underline"
          >
            CC BY-NC-SA 4.0
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;