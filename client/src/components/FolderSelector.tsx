import { FolderOpen, Upload } from 'lucide-react';
import { useRef } from 'react';

interface FolderSelectorProps {
  folderPath: string;
  onFolderChange: (path: string) => void;
  onFilesSelected?: (files: FileList | null) => void;
  /** Server-side folder path — local/dev only; hidden on Amplify by default */
  showServerFolderPath?: boolean;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({
  folderPath,
  onFolderChange,
  onFilesSelected,
  showServerFolderPath = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = () => {
    // Note: Browser security restrictions prevent direct folder selection
    // Users can either upload files or provide a server-side folder path
    const path = prompt(
      'Please enter the full path to the folder containing resumes (server-side path):'
    );
    if (path) {
      onFolderChange(path);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected?.(files);
      // Clear the folder path when files are uploaded
      onFolderChange('');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Resume Files
      </label>
      <div className="space-y-3">
        {/* File Upload Option */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={20} />
            Upload Resume Files (PDF, DOC, DOCX)
          </button>
        </div>

        {showServerFolderPath && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => onFolderChange(e.target.value)}
                  placeholder="Enter server-side folder path (local dev only)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleFolderSelect}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <FolderOpen size={20} />
                  Browse
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {showServerFolderPath
          ? 'Upload multiple resume files or provide a server-side folder path'
          : 'Upload multiple resume files (PDF, DOC, DOCX)'}
      </p>
    </div>
  );
};

export default FolderSelector;

